"use client";

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Trash2, Banknote, CreditCard, Smartphone, Building2, User, HelpCircle } from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  key: string;
  type: string;
  is_active: boolean;
  sort_order: number;
}

interface MethodCardProps {
  method: PaymentMethod;
  onToggleActive: (id: string, currentState: boolean) => void;
  onDelete: (id: string) => void;
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

export function MethodCard({ method, onToggleActive, onDelete }: MethodCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: method.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = getPaymentIcon(method.type);

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={!method.is_active ? "opacity-50" : ""}>
        <CardContent className="flex items-center gap-4 p-4">
          {/* Drag Handle */}
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>

          {/* Name */}
          <div className="flex-1">
            <p className="font-medium">{method.name}</p>
            <p className="text-sm text-muted-foreground">{method.key}</p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={method.is_active}
              onCheckedChange={() => onToggleActive(method.id, method.is_active)}
            />
            <span className="text-sm text-muted-foreground w-16">
              {method.is_active ? "Attivo" : "Inattivo"}
            </span>
          </div>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm(`Eliminare "${method.name}"?`)) {
                onDelete(method.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
