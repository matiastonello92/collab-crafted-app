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
import { Loader2, Save, Send, Euro } from "lucide-react";
import { useRouter } from "next/navigation";

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
  sort_order: number;
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
        .select("id, name, key, sort_order")
        .eq("org_id", orgId)
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
  }, [orgId, form, toast]);

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
      <form onSubmit={form.handleSubmit((values) => onSubmit(values, false))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Nuova Chiusura di Cassa</CardTitle>
            <CardDescription>
              Registra gli incassi per metodo di pagamento
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

            {/* Payment Methods */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Incassi per Metodo di Pagamento
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {paymentMethods.map((pm, index) => (
                  <FormField
                    key={pm.id}
                    control={form.control}
                    name={`items.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{pm.name}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              €
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="rounded-lg bg-primary/10 p-6 border-2 border-primary">
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold">TOTALE</span>
                <span className="text-3xl font-bold text-primary">
                  € {total.toFixed(2)}
                </span>
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
                      placeholder="Aggiungi note o osservazioni..."
                      className="resize-none"
                      rows={3}
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
          <CardFooter className="flex gap-3 justify-end">
            <Button
              type="submit"
              variant="outline"
              disabled={isLoading || isSending}
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
            >
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Conferma e Invia Email
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
