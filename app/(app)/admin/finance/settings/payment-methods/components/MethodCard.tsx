"use client";

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Banknote, CreditCard, Smartphone, Building2, User, HelpCircle, Lock } from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  key: string;
  type: string;
  category: string;
  is_base_method: boolean;
  is_active: boolean;
  sort_order: number;
}

interface MethodCardProps {
  method: PaymentMethod;
  onToggleActive: (id: string, currentState: boolean) => void;
  onDelete: (id: string, isBaseMethod: boolean) => void;
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
      <Card className={`p-4 ${method.is_active ? 'border-2' : 'border opacity-60'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* Drag Handle */}
            <button
              className="cursor-grab active:cursor-grabbing touch-none"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* Icon and Info */}
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{method.name}</span>
                  {method.is_base_method && (
                    <span className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                      <Lock className="h-3 w-3" />
                      Base
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{method.key}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {method.is_active ? "Attivo" : "Inattivo"}
              </span>
              <Switch
                checked={method.is_active}
                onCheckedChange={() => onToggleActive(method.id, method.is_active)}
              />
            </div>
            
            {!method.is_base_method && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(method.id, method.is_base_method)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
