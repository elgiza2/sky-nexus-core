import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import "@/styles/checkout.css";
import { Button } from "@/components/ui/button";
import { BrandMark, CardPreview } from "./CardPreview";

import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/supabaseFunction";
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
  const [stage, setStage] = useState<"choose" | "card" | "wallet">("choose");
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [walletWaiting, setWalletWaiting] = useState(false);
  const pollRef = useRef<number | null>(null);
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
      else setError("Your bank didn’t confirm the payment. Try another card or a different method.");
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
      setHostedUrl(null);
      setPhone("");
      setWalletWaiting(false);
    }
    if (!open && pollRef.current) window.clearInterval(pollRef.current);
  }, [open]);
  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);
  if (!open) return null;

  const openHostedCheckout = async (selectedMethod: PaymentMethod) => {
    setBusy(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const { data, error: checkoutError } = await invokeFunction("kashier-checkout", {
        body: {
          kind: "checkout",
          tier,
          interval,
          provider: "kashier",
          method: selectedMethod,
          display: "en",
        },
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });
      if (checkoutError) throw checkoutError;
      const url = data?.url || data?.checkout_url;
      if (!url) throw new Error(data?.error || "Couldn’t open the payment page.");
      setHostedUrl(url);
      setBusy(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong while opening the payment page.");
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
      setError("Check the card details and make sure they’re complete.");
      return;
    }
    setBusy(true);
    setResult("processing");
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const { data: order, error: orderError } = await invokeFunction<DirectOrder>(
        "kashier-direct-order",
        {
          body: { tier, interval },
          headers: { Authorization: `Bearer ${session.session.access_token}` },
        },
      );
      if (orderError || !order) throw orderError || new Error("Couldn’t start the payment.");
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
          payload.messages?.en ||
            payload.messages?.ar ||
            rawResponse ||
            `The payment provider rejected the request (${response.status}).`,
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
      throw new Error(payload.messages?.en || payload.messages?.ar || "The payment was declined.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong while paying.");
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

  const submitWallet = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const mobile = phone.replace(/\D/g, "");
    if (!/^01[0125]\d{8}$/.test(mobile)) {
      setError("Enter a valid Vodafone Cash wallet number (11 digits starting with 01).");
      return;
    }
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const { data: order, error: orderError } = await invokeFunction<DirectOrder>("kashier-direct-order", {
        body: { tier, interval },
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });
      if (orderError || !order) throw orderError || new Error("Couldn’t start the payment.");
      setOrderId(order.order_id);
      const response = await fetch(order.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Kashier-Hash": order.hash },
        body: JSON.stringify({
          apiOperation: "INITIATE_R2P",
          paymentMethod: { type: "wallet" },
          order: { reference: order.order_id, amount: order.amount, currency: order.currency },
          customer: { mobilePhone: mobile, reference: session.session.user.id, email: session.session.user.email ?? "" },
          interactionSource: "ECOMMERCE",
          reconciliation: { webhookUrl: order.webhook_url },
          serverWebhook: order.webhook_url,
          merchantId: order.merchant_id,
        }),
      });
      const raw = await response.text();
      let payload: PaymentResponse & { response?: { code?: string } } = {};
      try { payload = JSON.parse(raw); } catch {}
      if (!response.ok || payload.status !== "SUCCESS") {
        throw new Error(payload.messages?.en || payload.messages?.ar || "This number isn’t linked to a wallet. Try another one.");
      }
      setWalletWaiting(true);
      setBusy(false);
      const reconcileUrl = `${order.endpoint.replace(/\/?$/, "/")}${encodeURIComponent(order.order_id)}`;
      const started = Date.now();
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        const stop = () => { if (pollRef.current) window.clearInterval(pollRef.current); pollRef.current = null; };
        if (Date.now() - started > 5 * 60_000) {
          stop();
          setWalletWaiting(false);
          setBusy(false);
          setError("The approval window expired. Please try again.");
          return;
        }
        try {
          const res = await fetch(reconcileUrl, {
            method: "PUT",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ apiOperation: "RECONCILE_WALLET", paymentMethod: { type: "wallet" }, merchantId: order.merchant_id }),
          });
          const body = (await res.json().catch(() => ({}))) as PaymentResponse;
          const st = body.response?.status || body.status;
          if (st === "SUCCESS" || body.response?.status === "CAPTURED") {
            stop();
            setWalletWaiting(false);
            setBusy(false);
            setResult("success");
          } else if (st === "FAILURE" || st === "FAILED") {
            stop();
            setWalletWaiting(false);
            setBusy(false);
            setError("The wallet declined the payment or its window expired. Please try again.");
          }
        } catch {}
      }, 4000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong while paying.");
      setBusy(false);
    }
  };

  const cancelWallet = () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
    setWalletWaiting(false);
    setBusy(false);
    setError(null);
  };

  const onHostedLoad = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const href = event.currentTarget.contentWindow?.location.href;
      if (href && href.startsWith(window.location.origin)) {
        setHostedUrl(null);
        const status = new URL(href).searchParams.get("paymentStatus");
        if (status && status !== "SUCCESS") setError("The payment didn’t complete. Please try again.");
        else setResult("success");
      }
    } catch {}
  };

  const tile = TILES.find((t) => t.id === pick) ?? TILES[0];
  const continueWithPick = () => {
    setError(null);
    if (tile.kind === "card") {
      setStage("card");
    } else if (tile.id === "vodafone") {
      setStage("wallet");
    } else {
      void openHostedCheckout(tile.method);
    }
  };
  const back = () => {
    if (hostedUrl) {
      setHostedUrl(null);
      return;
    }
    if (walletWaiting) {
      cancelWallet();
      return;
    }
    if (busy) return;
    if (stage !== "choose" && !threeDsUrl && result !== "success") {
      setStage("choose");
      setError(null);
    } else onClose();
  };

  const view = hostedUrl ? "hosted" : threeDsUrl ? "verify" : result === "success" ? "done" : stage;

  return (
    <section className="megsy-checkout fixed inset-0 z-[120] overflow-y-auto overscroll-contain" dir="ltr" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <div aria-hidden="true" className="glass-texture pointer-events-none absolute inset-0" />
      <div className="checkout-layout">
        <header className="flex items-center">
          <Button variant="ghost" type="button" onClick={back} disabled={busy && !hostedUrl} aria-label="Back" title="Back" className="megsy-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </header>

        <div key={view} className="checkout-stage">
          <h1 id="checkout-title" className="checkout-title">
            {result === "success"
              ? "Payment complete"
              : threeDsUrl
                ? "Confirm your payment"
                : hostedUrl
                  ? `Pay with ${tile.label}`
                  : stage === "card"
                    ? "Card details"
                    : stage === "wallet"
                      ? "Vodafone Cash"
                      : "Choose how to pay"}
          </h1>
          {hostedUrl && result !== "success" ? (
            <div className="mt-6 flex-1">
              <iframe title={`Pay with ${tile.label}`} src={hostedUrl} onLoad={onHostedLoad} allow="payment *" className="h-[min(640px,72dvh)] w-full rounded-2xl bg-card" />
            </div>
          ) : threeDsUrl ? (
            <div className="mt-6 flex-1 space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">Complete your bank’s verification to finish the payment.</p>
              <iframe title="Bank verification" src={threeDsUrl} className="h-[480px] w-full rounded-2xl bg-card" />
            </div>
          ) : result === "success" ? (
            <div className="flex flex-1 flex-col">
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-foreground text-background"><Check className="h-9 w-9" /></span>
                <h2 className="mt-6 text-xl font-semibold">Thank you</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">We’re confirming the payment and activating your subscription in a moment.</p>
                {orderId && <p className="mt-2 max-w-full break-all font-mono text-xs text-muted-foreground">{orderId}</p>}
              </div>
              <Button variant="ghost" type="button" className="megsy-pay-cta" onClick={onClose}>Continue</Button>
            </div>
          ) : stage === "card" ? (
            <form onSubmit={submitCard} className="mt-6 flex flex-1 flex-col" autoComplete="off">
              <CardPreview number={number} name={name} month={month} year={year} fallbackBrand="visa" />
              <div className="checkout-fields">
                <label className="checkout-field">
                  <span>Card number</span>
                  <div className="checkout-input-wrap">
                    <input inputMode="numeric" autoComplete="cc-number" dir="ltr" value={formatCardNumber(number)} onChange={(e) => setNumber(e.target.value)} placeholder="0000 0000 0000 0000" aria-required="true" />
                  </div>
                </label>
                <label className="checkout-field">
                  <span>Name on card</span>
                  <div className="checkout-input-wrap">
                    <input autoComplete="cc-name" dir="ltr" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" aria-required="true" />
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="checkout-field">
                    <span>Expiry date</span>
                    <div className="checkout-input-wrap">
                      <input inputMode="numeric" autoComplete="cc-exp" value={month ? `${month}${month.length === 2 ? " / " : ""}${year}` : ""} onChange={(e) => { const digits = e.target.value.replace(/\D/g, "").slice(0, 4); setMonth(digits.slice(0, 2)); setYear(digits.slice(2)); }} placeholder="MM / YY" aria-required="true" />
                    </div>
                  </label>
                  <label className="checkout-field">
                    <span>Security code</span>
                    <div className="checkout-input-wrap">
                      <input type="password" inputMode="numeric" autoComplete="cc-csc" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="CVV" aria-required="true" />
                    </div>
                  </label>
                </div>
              </div>
              {error && <ErrorBox text={error} />}
              <div className="min-h-8 flex-1" />
              <Button variant="ghost" type="submit" data-plain disabled={busy} className="megsy-pay-cta mt-4">
                {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</> : "Pay now"}
              </Button>
            </form>
          ) : stage === "wallet" ? (
            <form onSubmit={submitWallet} className="mt-6 flex flex-1 flex-col" autoComplete="off">
              {walletWaiting ? (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <h2 className="mt-6 text-xl font-semibold">Open your phone and approve the payment</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">We sent a payment request to <span dir="ltr">{phone}</span>.</p>
                  <ol className="glass-tile mt-6 w-full space-y-3 p-5 text-start text-sm leading-6">
                    <li>1. Open the “Ana Vodafone” app or dial <span dir="ltr" className="font-semibold">*9#</span></li>
                    <li>2. Go to “Payment requests” and approve it</li>
                    <li>3. Enter your wallet PIN — this page continues on its own</li>
                  </ol>
                  <Button variant="ghost" type="button" onClick={cancelWallet} className="megsy-pay-quiet mt-6">Change number or cancel</Button>
                </div>
              ) : (
                <div>
                  <p className="text-[15px] leading-6 text-muted-foreground">Enter the number linked to your wallet. We’ll send a payment request to approve on your phone.</p>
                  <div className="wallet-identity"><TileLogo id="vodafone" /><span>Vodafone Cash</span></div>
                  <label className="checkout-field mt-7">
                    <span>Wallet phone number</span>
                    <div className="checkout-input-wrap wallet-input">
                      <span className="wallet-prefix">+20</span>
                      <input inputMode="tel" autoComplete="tel-national" dir="ltr" aria-label="Vodafone Cash wallet number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="010 0000 0000" />
                    </div>
                  </label>
                </div>
              )}
              {error && <ErrorBox text={error} />}
              <div className="min-h-8 flex-1" />
              {!walletWaiting && (
                <Button variant="ghost" type="submit" data-plain disabled={busy} className="megsy-pay-cta mt-8">
                  {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending…</> : "Send payment request"}
                </Button>
              )}
            </form>
          ) : (
            <div className="checkout-methods">
              <div className="megsy-pay-list">
                {TILES.map((t) => {
                  const active = t.id === pick;
                  return (
                    <Button variant="ghost"
                      key={t.id}
                      type="button"
                      disabled={busy}
                      onClick={() => setPick(t.id)}
                      aria-pressed={active}
                      data-selected={active}
                      className="megsy-pay-row"
                    >
                      <span className="megsy-pay-mark checkout-logo" dir="ltr">
                        <TileLogo id={t.id} />
                      </span>
                      <span className="megsy-pay-copy"><span className="megsy-pay-name">{t.label}</span><span className="megsy-pay-detail">{t.id === "visa" ? "Credit or debit card" : t.id === "vodafone" ? "Mobile wallet" : "Digital wallet"}</span></span>
                      <ChevronRight className="megsy-pay-chevron" aria-hidden="true" />
                    </Button>
                  );
                })}
              </div>
              {error && <ErrorBox text={error} />}
              <Button variant="ghost" type="button" disabled={busy} onClick={continueWithPick} className="megsy-pay-cta mt-8">
                {busy ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</>
                ) : (
                  <>
                    <span>Continue with {tile.label}</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

type TileId = "visa" | "mastercard" | "apple_pay" | "google_pay" | "vodafone";
const TILES: Array<{
  id: TileId;
  label: string;
  kind: "card" | "hosted" | "wallet";
  method: PaymentMethod;
  instant?: boolean;
}> = [
  { id: "visa", label: "Visa / Mastercard", kind: "card", method: "card" },
  { id: "apple_pay", label: "Apple Pay", kind: "hosted", method: "card", instant: true },
  { id: "google_pay", label: "Google Pay", kind: "hosted", method: "card", instant: true },
  { id: "vodafone", label: "Vodafone Cash", kind: "wallet", method: "wallet" },
];

function TileLogo({ id }: { id: TileId }) {
  switch (id) {
    case "visa":
    case "mastercard":
      return (
        <span className="payment-card-pair" aria-hidden="true">
          <BrandMark brand="visa" />
          <BrandMark brand="mastercard" />
        </span>
      );

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
      className="mt-4 rounded-lg bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive"
    >
      {text}
    </p>
  );
}
