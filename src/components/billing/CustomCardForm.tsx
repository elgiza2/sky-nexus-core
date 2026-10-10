import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/styles/checkout.css";
import { BrandMark, CardPreview } from "./CardPreview";


import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/supabaseFunction";
import { openCheckoutUrl } from "@/lib/openCheckout";
import type { PlanTier } from "@/data/pricingData";

type Props = { open: boolean; tier: PlanTier; interval: "monthly" | "yearly"; onClose: () => void };
type PaymentMethod = "card" | "wallet" | "bank_installments" | "bnpl";
type DirectOrder = {
  order_id: string;
  merchant_id: string;
  amount: number;
  currency: string;
  hash: string;
  endpoint: string;
  webhook_url: string;
  merchant_redirect?: string;
};
type PaymentResponse = {
  status?: string;
  response?: { status?: string; result?: string; authentication?: { redirectUrl?: string } };
  messages?: { en?: string; ar?: string };
};

function sanitizeCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 19);
}
function formatCardNumber(value: string) {
  return sanitizeCardNumber(value)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}
function sameOrigin(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "checkout.kashier.io" || parsed.hostname.endsWith(".kashier.io"))
    );
  } catch {
    return false;
  }
}

export default function CustomCardForm({ open, tier, interval, onClose }: Props) {
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threeDsUrl, setThreeDsUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [result, setResult] = useState<"idle" | "processing" | "success">("idle");
  const [stage, setStage] = useState<"choose" | "card">("choose");
  const [pick, setPick] = useState<TileId>("visa");

  useEffect(() => {
    if (!open) return;
    const listener = (event: MessageEvent) => {
      if (!sameOrigin(event.origin)) return;
      const data = event.data as { message?: string; params?: { status?: string } } | null;
      if (data?.message !== "merchantStoreRedirect") return;
      setThreeDsUrl(null);
      setBusy(false);
      if (data.params?.status === "SUCCESS") setResult("success");
      else setError("لم يتم تأكيد العملية من البنك. جرّب بطاقة أخرى أو اختر وسيلة دفع مختلفة.");
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [open]);
  useEffect(() => {
    if (!open) {
      setNumber("");
      setName("");
      setMonth("");
      setYear("");
      setCvv("");
      setBusy(false);
      setError(null);
      setThreeDsUrl(null);
      setOrderId(null);
      setResult("idle");
      setStage("choose");
    }
  }, [open]);
  if (!open) return null;

  const openHostedCheckout = async (selectedMethod: PaymentMethod) => {
    setBusy(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) throw new Error("انتهت جلسة الدخول. سجّل دخولك تاني.");
      const { data, error: checkoutError } = await invokeFunction("kashier-checkout", {
        body: {
          kind: "checkout",
          tier,
          interval,
          provider: "kashier",
          method: selectedMethod,
          display: "ar",
        },
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });
      if (checkoutError) throw checkoutError;
      const url = data?.url || data?.checkout_url;
      if (!url) throw new Error(data?.error || "تعذر فتح صفحة الدفع.");
      openCheckoutUrl(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حصلت مشكلة أثناء فتح الدفع.");
      setBusy(false);
    }
  };

  const submitCard = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const cardNumber = sanitizeCardNumber(number);
    if (
      cardNumber.length < 12 ||
      !name.trim() ||
      !/^\d{2}$/.test(month) ||
      !/^\d{2}$/.test(year) ||
      !/^\d{3,4}$/.test(cvv)
    ) {
      setError("راجع بيانات البطاقة وتأكد إنها كاملة.");
      return;
    }
    setBusy(true);
    setResult("processing");
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) throw new Error("انتهت جلسة الدخول. سجّل دخولك تاني.");
      const { data: order, error: orderError } = await invokeFunction<DirectOrder>(
        "kashier-direct-order",
        {
          body: { tier, interval },
          headers: { Authorization: `Bearer ${session.session.access_token}` },
        },
      );
      if (orderError || !order) throw orderError || new Error("تعذر بدء عملية الدفع.");
      setOrderId(order.order_id);
      const redirect = `${window.location.origin}/billing/success?provider=kashier&order=${encodeURIComponent(order.order_id)}`;
      const response = await fetch(order.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Kashier-Hash": order.hash },
        body: JSON.stringify({
          apiOperation: "PAY",
          paymentMethod: {
            type: "CARD",
            card: {
              expiry: { month, year },
              number: cardNumber,
              nameOnCard: name.trim(),
              securityCode: cvv,
              enable3DS: true,
            },
          },
          order: {
            reference: order.order_id,
            amount: String(order.amount),
            currency: order.currency,
            description: `${tier} ${interval}`,
          },
          merchantRedirect: encodeURI(order.merchant_redirect ?? redirect),
          serverWebhook: order.webhook_url,
          interactionSource: "ECOMMERCE",
          reconciliation: {
            webhookUrl: order.webhook_url,
            merchantRedirect: redirect,
            redirect: false,
          },
          customer: { reference: session.session.user.id, email: session.session.user.email ?? "" },
          merchantId: order.merchant_id,
          newPaymentUI: true,
        }),
      });
      const rawResponse = await response.text();
      let payload: PaymentResponse = {};
      try {
        payload = JSON.parse(rawResponse) as PaymentResponse;
      } catch {}
      if (!response.ok)
        throw new Error(
          payload.messages?.ar ||
            payload.messages?.en ||
            rawResponse ||
            `رفض مزود الدفع الطلب (${response.status}).`,
        );
      const auth = payload.response?.authentication;
      if (auth?.redirectUrl && sameOrigin(auth.redirectUrl)) {
        setThreeDsUrl(auth.redirectUrl);
        return;
      }
      if (
        payload.status === "SUCCESS" &&
        (payload.response?.result === "SUCCESS" || payload.response?.status === "CAPTURED")
      ) {
        setResult("success");
        return;
      }
      throw new Error(payload.messages?.ar || payload.messages?.en || "تم رفض العملية.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حصلت مشكلة أثناء الدفع.");
      setBusy(false);
      setResult("idle");
    } finally {
      setNumber("");
      setName("");
      setMonth("");
      setYear("");
      setCvv("");
    }
  };

  const tile = TILES.find((t) => t.id === pick) ?? TILES[0];
  const continueWithPick = () => {
    setError(null);
    if (tile.kind === "card") {
      setStage("card");
    } else {
      void openHostedCheckout(tile.method);
    }
  };
  const back = () => {
    if (busy) return;
    if (stage === "card" && !threeDsUrl && result !== "success") {
      setStage("choose");
      setError(null);
    } else onClose();
  };

  return (
    <section className="megsy-checkout fixed inset-0 z-[120] overflow-y-auto overscroll-contain" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <div aria-hidden="true" className="glass-texture pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[520px] flex-col px-6 pb-7 pt-[max(20px,env(safe-area-inset-top))] sm:px-8 sm:pt-8">
        <header className="flex items-center">
          <Button variant="ghost" size="icon" type="button" onClick={back} disabled={busy} aria-label="رجوع" title="رجوع" className="h-11 w-11 rounded-full border-0 bg-transparent p-0 hover:bg-transparent active:bg-transparent"><ArrowLeft className="rotate-180" /></Button>
        </header>

        <div className="glass-appear mt-10 flex flex-1 flex-col sm:mt-12">
          <h1 id="checkout-title" className="text-[28px] font-normal leading-tight">{result === "success" ? "تم الدفع" : threeDsUrl ? "تأكيد الدفع" : stage === "card" ? "بيانات البطاقة" : "اختار طريقة الدفع"}</h1>
          {threeDsUrl ? (
            <div className="mt-6 flex-1 space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">أكمل التحقق من البنك لإتمام الدفع.</p>
              <iframe title="تحقق البنك" src={threeDsUrl} className="h-[480px] w-full rounded-lg border border-border bg-card" />
            </div>
          ) : result === "success" ? (
            <div className="flex flex-1 flex-col">
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-foreground text-background"><Check className="h-9 w-9" /></span>
                <h2 className="mt-6 text-xl font-semibold">شكرًا لك</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">بنأكد العملية ونفعّل اشتراكك خلال لحظات.</p>
                {orderId && <p className="mt-2 max-w-full break-all font-mono text-xs text-muted-foreground">{orderId}</p>}
              </div>
              <Button variant="ghost" className="glass-cta h-14 w-full rounded-full text-base" onClick={onClose}>متابعة</Button>
            </div>
          ) : stage === "card" ? (
            <form onSubmit={submitCard} className="mt-6 flex flex-1 flex-col" autoComplete="off">
              <CardPreview number={number} name={name} month={month} year={year} fallbackBrand={pick === "mastercard" ? "mastercard" : "visa"} />
              <div className="mt-8 space-y-5">

                <label className="block text-sm font-medium">رقم البطاقة<input inputMode="numeric" autoComplete="cc-number" dir="ltr" value={formatCardNumber(number)} onChange={(e) => setNumber(e.target.value)} placeholder="0000 0000 0000 0000" className={INPUT} /></label>
                <label className="block text-sm font-medium">الاسم على البطاقة<input dir="ltr" autoComplete="cc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم كما يظهر على البطاقة" className={`${INPUT} text-start`} /></label>
                <div className="grid grid-cols-3 gap-3"><Field label="الشهر" value={month} onChange={setMonth} placeholder="MM" /><Field label="السنة" value={year} onChange={setYear} placeholder="YY" /><Field label="CVV" value={cvv} onChange={setCvv} placeholder="•••" secret /></div>
              </div>
              {error && <ErrorBox text={error} />}
              <div className="min-h-8 flex-1" />
              <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" /> دفع آمن عبر Kashier</p>
              <Button variant="ghost" data-plain type="submit" disabled={busy} className="glass-cta mt-4 h-14 w-full rounded-full text-base">{busy ? <><Loader2 className="animate-spin" /> جارِ المعالجة…</> : "ادفع الآن"}</Button>
            </form>
          ) : (
            <div className="mt-7 flex flex-1 flex-col">
              <div className="grid grid-cols-2 gap-3">
                {TILES.map((t, index) => {
                  const active = t.id === pick;
                  return <Button key={t.id} variant="ghost" type="button" disabled={busy} onClick={() => setPick(t.id)} aria-pressed={active} aria-label={t.label} data-selected={active} style={{ "--i": index } as React.CSSProperties} className={`glass-tile glass-appear h-[142px] flex-col items-start justify-between p-5 text-start ${t.id === "vodafone" ? "col-span-2 h-[100px] flex-row items-center" : ""}`}>
                    <span className={`checkout-logo flex h-10 w-[68px] shrink-0 items-center justify-center transition-opacity ${active ? "" : "opacity-50"}`} dir="ltr"><TileLogo id={t.id} /></span>
                    <span className={`text-base font-medium transition-colors ${active ? "text-foreground" : "text-foreground/55"} ${t.id === "vodafone" ? "me-auto" : ""}`} dir={t.id === "vodafone" ? "rtl" : "ltr"}>{t.label}</span>

                  </Button>;
                })}
              </div>
              {error && <ErrorBox text={error} />}
              <div className="min-h-8 flex-1" />
              <Button variant="ghost" data-plain type="button" disabled={busy} onClick={continueWithPick} className="glass-cta mt-8 h-14 w-full gap-3 rounded-full px-5 text-base">{busy ? <><Loader2 className="animate-spin" /> جارِ المعالجة…</> : <><span className="checkout-mark flex h-5 w-12 shrink-0 items-center justify-center whitespace-nowrap" dir="ltr"><TileLogo id={pick} /></span><span className="whitespace-nowrap">تابع الدفع بـ {tile.label}</span></>}</Button>

            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const INPUT = "glass-input mt-2 h-14 w-full rounded-lg px-4 text-base outline-none transition placeholder:text-muted-foreground";

type TileId = "visa" | "mastercard" | "apple_pay" | "google_pay" | "vodafone";
const TILES: Array<{
  id: TileId;
  label: string;
  kind: "card" | "hosted";
  method: PaymentMethod;
  instant?: boolean;
}> = [
  { id: "visa", label: "Visa", kind: "card", method: "card" },
  { id: "mastercard", label: "Mastercard", kind: "card", method: "card" },
  { id: "apple_pay", label: "Apple Pay", kind: "hosted", method: "card", instant: true },
  { id: "google_pay", label: "Google Pay", kind: "hosted", method: "card", instant: true },
  { id: "vodafone", label: "فودافون كاش", kind: "hosted", method: "wallet" },
];

function TileLogo({ id }: { id: TileId }) {
  switch (id) {
    case "visa":
      return <BrandMark brand="visa" />;
    case "mastercard":
      return <BrandMark brand="mastercard" />;

    case "apple_pay":
      return (
        <svg viewBox="0 0 17 20" className="h-[17px] w-[15px]" fill="currentColor">
          <path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM11.5 3c.7-.9 1.2-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3.1 1.1.1 2.2-.6 2.9-1.4z" />
        </svg>
      );
    case "google_pay":
      return (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
          <path className="payment-blue" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
          <path className="payment-green" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9H1.3v3.1A12 12 0 0 0 12 24z" />
          <path className="payment-gold" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.7V6.6H1.3a12 12 0 0 0 0 10.9z" />
          <path className="payment-red" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
        </svg>
      );
    case "vodafone":
      return (
        <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]">
          <circle cx="12" cy="12" r="12" className="payment-red" />
          <path className="payment-white" d="M12.6 5.2c2.3-.6 4.4.2 5 .6-1.8.1-3.5 1.4-3.5 3.6 2 .5 3.4 2 3.4 4.2 0 2.700-2.300 4.900-5.200 4.900-3.300 0-5.700-2.700-5.700-6 0-3.600 2.500-6.500 6-7.300z" />
        </svg>
      );
  }
}

function ErrorBox({ text }: { text: string }) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive"
    >
      {text}
    </p>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secret = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  secret?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        inputMode="numeric"
        dir="ltr"
        type={secret ? "password" : "text"}
        maxLength={secret ? 4 : 2}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, secret ? 4 : 2))}
        placeholder={placeholder}
        className={`${INPUT} text-center`}
      />
    </label>
  );
}
