"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/lib/domain";
import { changeOrderStatus, changePaymentStatus } from "@/server/admin/orders";
import { useAction } from "./use-action";

export function OrderStatusForm({ orderId, options }: { orderId: string; options: Array<{ value: string; label: string }> }) {
  const t = useTranslations("admin.orders");
  const [toStatus, setToStatus] = useState(options[0]?.value ?? "");
  const [note, setNote] = useState("");
  const { pending, message, errors, run } = useAction(changeOrderStatus);
  if (!options.length) return <p className="text-sm text-ink-soft">{t("finalStatus")}</p>;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        run({ orderId, toStatus, note }, () => setNote(""));
      }}
    >
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <Field id="toStatus" label={t("newStatus")} error={errors.toStatus}>
        <Select id="toStatus" value={toStatus} onChange={(e) => setToStatus(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Field>
      {toStatus === "CANCELLED" && <p className="text-xs text-warning">{t("cancelHint")}</p>}
      <Field id="note" label={t("noteOptional")} error={errors.note}>
        <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? t("saving") : t("applyStatus")}</Button>
    </form>
  );
}

export function PaymentStatusForm({ orderId, current }: { orderId: string; current: PaymentStatus }) {
  const t = useTranslations("admin.orders");
  const tPay = useTranslations("common.paymentStatus");
  const [value, setValue] = useState<PaymentStatus>(current);
  const { pending, message, run } = useAction(changePaymentStatus);
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run({ orderId, paymentStatus: value });
      }}
    >
      <Field id="paymentStatus" label={t("paymentStatus")} className="flex-1">
        <Select id="paymentStatus" value={value} onChange={(e) => setValue(e.target.value as PaymentStatus)}>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{tPay(s)}</option>
          ))}
        </Select>
      </Field>
      <Button type="submit" variant="outline" disabled={pending || value === current}>{t("update")}</Button>
      {message && <span className="sr-only" role="status">{message.text}</span>}
    </form>
  );
}
