"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Save, Send, Banknote, CreditCard, Smartphone, Building2, User, HelpCircle, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const supabase = createClient(
  "https://jwchmdivuwgfjrwvgtia.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3Y2htZGl2dXdnZmpyd3ZndGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MTA4NjMsImV4cCI6MjA3MjA4Njg2M30.e_pN2KPqn9ZtNC32vwYNhjK7xzmIgpqOweqEmUIoPbA"
);

const closureFormSchema = z.object({
  closure_date: z.string().min(1, "Data richiesta"),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      payment_method_id: z.string(),
      amount: z.number().min(0, "Importo deve essere >= 0"),
      notes: z.string().optional(),
    })
  ),
});

type ClosureFormValues = z.infer<typeof closureFormSchema>;

interface PaymentMethod {
  id: string;
  name: string;
  key: string;
  type: string;
  sort_order: number;
}

const PAYMENT_ICONS = {
  cash: Banknote,
  card: CreditCard,
  digital: Smartphone,
  bank_transfer: Building2,
  customer_credit: User,
  other: HelpCircle,
};

function getPaymentIcon(type: string) {
  return PAYMENT_ICONS[type as keyof typeof PAYMENT_ICONS] || HelpCircle;
}

export function CashClosureForm({ locationId, orgId }: { locationId: string; orgId: string }) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();

  const form = useForm<ClosureFormValues>({
    resolver: zodResolver(closureFormSchema),
    defaultValues: {
      closure_date: new Date().toISOString().split("T")[0],
      notes: "",
      items: [],
    },
  });

  // Load payment methods
  useEffect(() => {
    const loadPaymentMethods = async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id, name, key, type, sort_order")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        toast.error("Impossibile caricare i metodi di pagamento");
        return;
      }

      setPaymentMethods(data || []);
      
      // Initialize form items with all payment methods
      form.setValue(
        "items",
        (data || []).map((pm: PaymentMethod) => ({
          payment_method_id: pm.id,
          amount: 0,
          notes: "",
        }))
      );
    };

    loadPaymentMethods();
  }, [orgId, locationId, form]);

  // Calculate total
  const items = form.watch("items");
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const onSubmit = async (values: ClosureFormValues, sendEmail: boolean = false) => {
    setIsLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Utente non autenticato");

      // Check if closure already exists for this date
      const { data: existing } = await supabase
        .from("cash_closures")
        .select("id")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .eq("closure_date", values.closure_date)
        .single();

      let closureId: string;

      if (existing) {
        // Update existing closure
        const { error: updateError } = await supabase
          .from("cash_closures")
          .update({
            total_amount: total,
            notes: values.notes,
            status: sendEmail ? "confirmed" : "draft",
            confirmed_at: sendEmail ? new Date().toISOString() : null,
            confirmed_by: sendEmail ? userData.user.id : null,
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;

        // Delete old items
        await supabase.from("closure_items").delete().eq("closure_id", existing.id);

        closureId = existing.id;
      } else {
        // Create new closure
        const { data: newClosure, error: insertError } = await supabase
          .from("cash_closures")
          .insert({
            org_id: orgId,
            location_id: locationId,
            closure_date: values.closure_date,
            total_amount: total,
            notes: values.notes,
            status: sendEmail ? "confirmed" : "draft",
            created_by: userData.user.id,
            confirmed_at: sendEmail ? new Date().toISOString() : null,
            confirmed_by: sendEmail ? userData.user.id : null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        closureId = newClosure.id;
      }

      // Insert closure items (only non-zero amounts)
      const itemsToInsert = values.items
        .filter((item) => Number(item.amount) > 0)
        .map((item) => ({
          closure_id: closureId,
          payment_method_id: item.payment_method_id,
          amount: Number(item.amount),
          notes: item.notes,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from("closure_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Send email if requested
      if (sendEmail) {
        setIsSending(true);
        const { error: emailError } = await supabase.functions.invoke("send-closure-report", {
          body: { closure_id: closureId },
        });

        if (emailError) {
          toast.error("Errore nell'invio email, ma la chiusura è stata salvata correttamente");
        } else {
          toast.success("Report inviato con successo via email");
        }
        setIsSending(false);
      } else {
        toast.success("Bozza salvata correttamente");
      }

      router.push("/admin/finance/closures");
    } catch (error) {
      console.error("Error saving closure:", error);
      toast.error(error instanceof Error ? error.message : "Errore nel salvataggio");
    } finally {
      setIsLoading(false);
      setIsSending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit(values, false))}>
        {paymentMethods.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Settings className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nessun Metodo di Pagamento Configurato</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Prima di creare una chiusura di cassa, è necessario configurare almeno un metodo di pagamento.
              </p>
              <Link href="/admin/finance/settings/payment-methods">
                <Button>
                  <Settings className="mr-2 h-4 w-4" />
                  Configura Metodi di Pagamento
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Payment Methods */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dettagli Chiusura</CardTitle>
                  <CardDescription>
                    Registra gli incassi per ogni metodo di pagamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Date Field */}
                  <FormField
                    control={form.control}
                    name="closure_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Chiusura</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Payment Methods Grid */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Metodi di Pagamento</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {paymentMethods.map((pm, index) => {
                        const Icon = getPaymentIcon(pm.type);
                        return (
                          <FormField
                            key={pm.id}
                            control={form.control}
                            name={`items.${index}.amount`}
                            render={({ field }) => (
                              <Card className="border-2">
                                <CardContent className="p-4 space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                                      <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <FormLabel className="font-semibold">{pm.name}</FormLabel>
                                  </div>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        className="text-lg font-semibold pl-8 h-12"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                      />
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                                        €
                                      </span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </CardContent>
                              </Card>
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note (opzionale)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Aggiungi note o osservazioni sulla chiusura..."
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Le note verranno incluse nel report email
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">
                <Card className="border-2 border-primary">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-center">Riepilogo Totale</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center space-y-2">
                      <div className="text-5xl font-bold text-primary">
                        €{total.toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Totale Incassato
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Dettaglio per Metodo</h4>
                      {items.map((item, index) => {
                        const pm = paymentMethods[index];
                        const amount = Number(item.amount) || 0;
                        if (amount === 0) return null;
                        const Icon = getPaymentIcon(pm.type);
                        return (
                          <div key={pm.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{pm.name}</span>
                            </div>
                            <span className="font-semibold">€{amount.toFixed(2)}</span>
                          </div>
                        );
                      })}
                      {items.every(item => Number(item.amount) === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nessun importo inserito
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-4">
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={isLoading || isSending}
                        className="w-full"
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Salva Bozza
                      </Button>
                      <Button
                        type="button"
                        onClick={form.handleSubmit((values) => onSubmit(values, true))}
                        disabled={isLoading || isSending}
                        className="w-full"
                      >
                        {isSending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Conferma e Invia Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
