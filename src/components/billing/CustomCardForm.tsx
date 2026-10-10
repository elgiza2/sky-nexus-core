import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Check,
  ChevronLeft,
  CreditCard,
  Loader2,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
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

const METHODS: Array<{
  id: PaymentMethod;
  title: string;
  detail: string;
  badge: string;
  icon: typeof CreditCard;
  tone: string;
}> = [
  {
    id: "card",
    title: "بطاقة بنكية",
    detail: "Visa · Mastercard · Meeza · Apple Pay",
    badge: "الأسرع",
    icon: CreditCard,
    tone: "blue",
  },
  {
    id: "wallet",
    title: "محفظة إلكترونية",
    detail: "Vodafone Cash · Orange Cash وغيرها",
    badge: "شائع",
    icon: Smartphone,
    tone: "red",
  },
  {
    id: "bank_installments",
    title: "تقسيط بنكي",
    detail: "خطط تقسيط البنوك المشاركة",
    badge: "مرن",
    icon: Banknote,
    tone: "violet",
  },
  {
    id: "bnpl",
    title: "اشترِ الآن وادفع لاحقًا",
    detail: "valU · Contact · Souhoola · MOGO · Forsa",
    badge: "جديد",
    icon: Sparkles,
    tone: "amber",
  },
];

export default function CustomCardForm({ open, tier, interval, onClose }: Props) {
  const [method, setMethod] = useState<PaymentMethod | null>("card");
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
  const [pick, setPick] = useState<TileId>("mastercard");
  useMemo(() => METHODS.find((item) => item.id === method), [method]);

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
      setMethod(null);
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

  const step = result === "success" ? 3 : 2;
  const tile = TILES.find((t) => t.id === pick) ?? TILES[0];
  const continueWithPick = () => {
    setError(null);
    if (tile.kind === "card") {
      setMethod("card");
      setStage("card");
    } else {
      setMethod(tile.method);
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
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#efefef] text-[#1c1c1e]" dir="rtl">
      <div className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-5 pb-6 pt-5">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={busy}
            aria-label="رجوع"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[#1c1c1e] transition hover:bg-white disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </button>
          <h1 className="text-[17px] font-semibold tracking-[-0.02em]">
            {step === 3 ? "تم" : stage === "card" ? "بيانات البطاقة" : "الدفع"}
          </h1>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="إغلاق"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[#8a8a8e] transition hover:bg-white disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <Stepper step={step} />

        {threeDsUrl ? (
          <div className="mt-6 flex-1 space-y-4">
            <Notice text="أكمل خطوة التحقق داخل نافذة البنك لإتمام العملية بأمان." />
            <iframe
              title="تحقق البنك"
              src={threeDsUrl}
              className="h-[480px] w-full rounded-2xl border border-black/5 bg-white"
            />
          </div>
        ) : result === "success" ? (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <div className="relative">
                <span className="absolute -right-6 -top-5 h-2 w-3 rotate-12 rounded-sm bg-[#f25c1c]" />
                <span className="absolute -left-7 top-1 h-1.5 w-3 -rotate-12 rounded-sm bg-[#34c759]" />
                <span className="absolute -right-8 bottom-2 h-1.5 w-1.5 rounded-full bg-[#ffcc00]" />
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#34a853] text-white shadow-[0_10px_30px_rgba(52,168,83,.35)]">
                  <Check className="h-10 w-10" strokeWidth={3} />
                </div>
              </div>
              <h2 className="mt-7 text-[20px] font-semibold">مبروك!</h2>
              <p className="mt-2 max-w-[280px] text-[13px] leading-6 text-[#8a8a8e]">
                بنأكد العملية ونفعّل اشتراك Megsy {tier} خلال لحظات.
                {orderId && (
                  <span className="mt-1 block font-mono text-[12px] text-[#3a3a3c]">{orderId}</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-12 w-full rounded-full bg-[#f25c1c] text-[14px] font-semibold text-white transition hover:bg-[#e04f12]"
            >
              متابعة
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="mt-3 h-12 w-full rounded-full border border-black/10 bg-white text-[14px] font-medium transition hover:bg-[#fafafa]"
            >
              الرجوع للرئيسية
            </button>
          </div>
        ) : stage === "card" ? (
          <form onSubmit={submitCard} className="mt-6 flex flex-1 flex-col" autoComplete="off">
            <div className="relative overflow-hidden rounded-3xl bg-[#1c1c1e] p-5 text-white shadow-[0_20px_40px_rgba(0,0,0,.18)]">
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#f25c1c]/40 blur-2xl" />
              <div className="relative flex items-center justify-between" dir="ltr">
                <span className="text-[13px] font-semibold opacity-80">{tile.label}</span>
                <CreditCard className="h-5 w-5 opacity-70" />
              </div>
              <p className="relative mt-8 font-mono text-[19px] tracking-[0.12em]" dir="ltr">
                {formatCardNumber(number) || "•••• •••• •••• ••••"}
              </p>
              <div className="relative mt-5 flex justify-between text-[11px] uppercase opacity-75" dir="ltr">
                <span className="truncate">{name || "CARD HOLDER"}</span>
                <span>
                  {month || "MM"}/{year || "YY"}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-4 rounded-3xl bg-white p-5">
              <label className="block text-[12px] font-medium text-[#8a8a8e]">
                رقم البطاقة
                <input
                  inputMode="numeric"
                  autoComplete="cc-number"
                  dir="ltr"
                  value={formatCardNumber(number)}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="0000 0000 0000 0000"
                  className={INPUT}
                />
              </label>
              <label className="block text-[12px] font-medium text-[#8a8a8e]">
                الاسم على البطاقة
                <input
                  autoComplete="cc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="الاسم كما يظهر على البطاقة"
                  className={INPUT}
                />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <Field label="الشهر" value={month} onChange={setMonth} placeholder="MM" />
                <Field label="السنة" value={year} onChange={setYear} placeholder="YY" />
                <Field label="CVV" value={cvv} onChange={setCvv} placeholder="•••" secret />
              </div>
            </div>

            {error && <ErrorBox text={error} />}

            <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#8a8a8e]">
              <LockKeyhole className="h-3.5 w-3.5" /> دفع آمن عبر Kashier · لا نحتفظ ببيانات بطاقتك
            </p>
            <div className="flex-1" />
            <button
              type="submit"
              disabled={busy}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f25c1c] text-[14px] font-semibold text-white transition hover:bg-[#e04f12] disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> جارِ المعالجة…
                </>
              ) : (
                "ادفع الآن"
              )}
            </button>
          </form>
        ) : (
          <div className="mt-7 flex flex-1 flex-col">
            <div className="flex items-center gap-3 rounded-[18px] bg-white px-3.5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fde8dd]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-[#f25c1c] text-[11px] font-bold text-[#f25c1c]">
                  !
                </span>
              </span>
              <p className="text-[12px] leading-[18px] text-[#8e8e93]">
                اشتراك Megsy {tier} {interval === "yearly" ? "سنوي" : "شهري"}. Apple Pay و Google
                Pay بيتم الدفع بيهم فورًا.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2.5">
              {TILES.map((t) => {
                const active = t.id === pick;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={busy}
                    onClick={() => setPick(t.id)}
                    aria-pressed={active}
                    aria-label={t.label}
                    className={`flex aspect-square items-center justify-center rounded-[18px] bg-white transition active:scale-[0.97] disabled:opacity-50 ${active ? "border-[1.5px] border-[#f25c1c]" : "border-[1.5px] border-transparent"}`}
                  >
                    <TileLogo id={t.id} />
                  </button>
                );
              })}
            </div>

            {error && <ErrorBox text={error} />}

            <div className="flex-1" />
            <p className="mt-8 text-center text-[11px] leading-5 text-[#8a8a8e]">
              بالضغط على <span className="font-semibold text-[#1c1c1e]">متابعة</span> أنت توافق على
              شروط الخدمة وسياسة الخصوصية.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={continueWithPick}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f25c1c] text-[14px] font-semibold text-white transition hover:bg-[#e04f12] disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : tile.instant ? (
                `ادفع بـ ${tile.label}`
              ) : (
                "متابعة"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const INPUT =
  "mt-2 h-12 w-full rounded-xl border border-black/[0.06] bg-[#f6f6f7] px-3.5 text-[15px] text-[#1c1c1e] outline-none transition placeholder:text-[#b0b0b5] focus:border-[#f25c1c] focus:bg-white focus:ring-4 focus:ring-[#f25c1c]/10";

type TileId =
  | "mastercard"
  | "visa"
  | "meeza"
  | "apple_pay"
  | "google_pay"
  | "wallet"
  | "bank_installments"
  | "bnpl";
const TILES: Array<{
  id: TileId;
  label: string;
  caption: string;
  kind: "card" | "hosted";
  method: PaymentMethod;
  instant?: boolean;
}> = [
  { id: "mastercard", label: "Mastercard", caption: "بطاقة", kind: "card", method: "card" },
  { id: "visa", label: "Visa", caption: "بطاقة", kind: "card", method: "card" },
  { id: "meeza", label: "Meeza", caption: "بطاقة", kind: "card", method: "card" },
  { id: "apple_pay", label: "Apple Pay", caption: "Apple Pay", kind: "hosted", method: "card", instant: true },
  { id: "google_pay", label: "Google Pay", caption: "Google Pay", kind: "hosted", method: "card", instant: true },
  { id: "wallet", label: "المحفظة", caption: "محفظة", kind: "hosted", method: "wallet" },
  { id: "bank_installments", label: "التقسيط", caption: "تقسيط بنكي", kind: "hosted", method: "bank_installments" },
  { id: "bnpl", label: "valU", caption: "ادفع لاحقًا", kind: "hosted", method: "bnpl" },
];

function TileLogo({ id }: { id: TileId }) {
  switch (id) {
    case "mastercard":
      return (
        <span className="flex flex-col items-center gap-0.5" dir="ltr">
          <svg viewBox="0 0 48 30" className="h-8 w-[52px]">
            <circle cx="17" cy="15" r="14" fill="#EB001B" />
            <circle cx="31" cy="15" r="14" fill="#F79E1B" />
            <path d="M24 3.1a14 14 0 0 1 0 23.8 14 14 0 0 1 0-23.8z" fill="#FF5F00" />
          </svg>
          <span className="text-[9px] font-semibold tracking-tight text-[#1c1c1e]">mastercard</span>
        </span>
      );
    case "visa":
      return (
        <svg viewBox="0 0 64 22" className="h-6 w-[64px]" dir="ltr">
          <text x="0" y="19" fontSize="23" fontStyle="italic" fontWeight="900" fill="#1A1F71" fontFamily="Arial Black, Arial, sans-serif" letterSpacing="-0.5">VISA</text>
          <path d="M1 4 l6 0 l-1.4 3 z" fill="#F7B600" />
        </svg>
      );
    case "meeza":
      return <span className="text-[19px] font-extrabold tracking-tight text-[#0b7a3e]" dir="ltr">meeza</span>;
    case "apple_pay":
      return (
        <span className="flex items-center gap-0.5" dir="ltr">
          <svg viewBox="0 0 17 20" className="h-[22px] w-[19px]" fill="#000">
            <path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM11.5 3c.7-.9 1.2-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3.1 1.1.1 2.2-.6 2.9-1.4z" />
          </svg>
          <span className="text-[22px] font-medium tracking-[-0.03em] text-black">Pay</span>
        </span>
      );
    case "google_pay":
      return (
        <span className="flex items-center gap-1" dir="ltr">
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]">
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9H1.3v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.7V6.6H1.3a12 12 0 0 0 0 10.9z" />
            <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
          </svg>
          <span className="text-[21px] font-medium tracking-[-0.02em] text-[#5f6368]">Pay</span>
        </span>
      );
    case "wallet":
      return (
        <span className="flex flex-col items-center gap-1">
          <Smartphone className="h-7 w-7 text-[#e60000]" strokeWidth={1.8} />
          <span className="text-[10px] font-semibold text-[#1c1c1e]">Wallet</span>
        </span>
      );
    case "bank_installments":
      return (
        <span className="flex flex-col items-center gap-1">
          <Banknote className="h-7 w-7 text-[#5856d6]" strokeWidth={1.8} />
          <span className="text-[10px] font-semibold text-[#1c1c1e]">تقسيط</span>
        </span>
      );
    case "bnpl":
      return <span className="text-[22px] font-extrabold tracking-tight text-[#00a19a]" dir="ltr">valU</span>;
  }
}

function Stepper({ step }: { step: number }) {
  const labels = ["الباقة", "الدفع", "تم"];
  return (
    <div className="relative mt-6 flex justify-between px-2">
      <div className="absolute left-8 right-8 top-[11px] h-[2px] bg-black/10" />
      <div
        className="absolute right-8 top-[11px] h-[2px] bg-[#f9b896] transition-all"
        style={{ width: step === 3 ? "calc(100% - 4rem)" : "calc(50% - 2rem)" }}
      />
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < step || step === 3;
        const current = n === step && step !== 3;
        return (
          <div key={label} className="relative flex w-12 flex-col items-center gap-1.5">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${done ? "bg-[#f25c1c] text-white" : current ? "border-[3px] border-[#f25c1c] bg-white" : "border-2 border-black/15 bg-[#efefef]"}`}
            >
              {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            <span className={`text-[11px] ${done || current ? "text-[#1c1c1e]" : "text-[#8a8a8e]"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff1ea] text-[#f25c1c]">
        <LockKeyhole className="h-4 w-4" />
      </span>
      <p className="text-[12px] leading-5 text-[#8a8a8e]">{text}</p>
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-2xl border border-[#f2caca] bg-[#fff7f7] px-4 py-3 text-[12px] leading-5 text-[#b42318]"
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
    <label className="block text-[12px] font-medium text-[#8a8a8e]">
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
