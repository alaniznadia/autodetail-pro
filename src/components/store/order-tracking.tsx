import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatus } from "@prisma/client";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "PENDING", label: ORDER_STATUS_LABEL.PENDING },
  { key: "PAID", label: ORDER_STATUS_LABEL.PAID },
  { key: "PREPARING", label: ORDER_STATUS_LABEL.PREPARING },
  { key: "SHIPPED", label: ORDER_STATUS_LABEL.SHIPPED },
  { key: "DELIVERED", label: ORDER_STATUS_LABEL.DELIVERED },
];

const PICKUP_STEPS: { key: OrderStatus; label: string }[] = [
  { key: "PENDING", label: ORDER_STATUS_LABEL.PENDING },
  { key: "PAID", label: ORDER_STATUS_LABEL.PAID },
  { key: "PREPARING", label: ORDER_STATUS_LABEL.PREPARING },
  { key: "PICKED_UP", label: ORDER_STATUS_LABEL.PICKED_UP },
];

export function OrderTracking({
  status,
  fulfillmentMethod,
  history,
}: {
  status: OrderStatus;
  fulfillmentMethod: "STORE_PICKUP" | "SHIPPING";
  history: Partial<Record<OrderStatus, Date>>;
}) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <div className="rounded border border-border p-4">
        <p className="text-sm text-foreground/70">
          Este pedido está <span className="text-accent">{ORDER_STATUS_LABEL[status]}</span>.
        </p>
      </div>
    );
  }

  const steps = fulfillmentMethod === "STORE_PICKUP" ? PICKUP_STEPS : STEPS;
  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <ol className="flex flex-col gap-0">
      {steps.map((step, i) => {
        const done = currentIndex >= 0 && i <= currentIndex;
        const at = history[step.key];
        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${done ? "bg-accent" : "border border-border"}`}
                aria-hidden
              />
              {i < steps.length - 1 ? (
                <span className={`w-px flex-1 ${done ? "bg-accent/40" : "bg-border"}`} aria-hidden />
              ) : null}
            </div>
            <div className="pb-6">
              <p className={`text-sm ${done ? "text-foreground" : "text-foreground/45"}`}>{step.label}</p>
              <p className="text-xs text-foreground/50">
                {at ? at.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "Pendiente"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
