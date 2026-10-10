/** Desktop-only pricing layout — liquid glass, same language as checkout. Mobile uses MobilePricingScreen. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Plus, Minus, ArrowRight, ArrowLeft } from "lucide-react";
import { getDisplayPrice, type PlanCardConfig, type PlanTier } from "@/data/pricingData";
import { translateExactText, useUserLang } from "@/lib/authI18n";
import CreditPacks from "@/components/billing/CreditPacks";

type Props = {
  plans: PlanCardConfig[];
  faqs: { q: string; a: string }[];
  isYearly: boolean;
  setIsYearly: (v: boolean) => void;
  loadingTier: PlanTier | null;
  currentPlan: string | null;
  onSubscribe: (tier: PlanTier) => void;
};

const ORDER: PlanTier[] = ["starter", "pro", "elite", "business"];

export default function DesktopPricing({ plans, faqs, isYearly, setIsYearly, loadingTier, currentPlan, onSubscribe }: Props) {
  const lang = useUserLang();
  const t = (s: string) => translateExactText(s, lang);
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const curIdx = ORDER.indexOf(((currentPlan ?? "starter").toLowerCase() as PlanTier));
  const shown = plans.filter((p) => p.tier === "pro");

  return (
    <div className="megsy-pricing desktop-pricing-frame mx-auto w-full max-w-[1080px] px-12 pb-24">
      {/* Header */}
      <header className="glass-appear flex items-end justify-between gap-10 border-b border-foreground/10 pt-20 pb-12">
        <div className="max-w-xl">
          <button type="button" className="desktop-pricing-back mb-7" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 rtl-flip" />
            {t("Back")}
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/65">{t("Pricing")}</p>
          <h1 className="mt-4 text-[56px] leading-[1.02] font-semibold tracking-[-0.04em]">
            {t("One agent.")}
            <br />
            <span className="text-foreground/55">{t("Everything done.")}</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-foreground/65">
            {t("Chat, research, images, video, slides and code — with one simple plan.")}
          </p>
        </div>
        <div className="glass-pill inline-flex p-1 text-[13px] font-medium">
          {[false, true].map((y) => (
            <button
              key={String(y)}
              onClick={() => setIsYearly(y)}
              className={`rounded-full px-5 py-2 ${isYearly === y ? "bg-foreground text-background" : "text-foreground/65 hover:text-foreground"}`}
            >
              {y ? t("Yearly") : t("Monthly")}
            </button>
          ))}
        </div>
      </header>

      {/* Plans */}
      <section id="plans-grid" className="grid grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)] gap-8">
        {shown.map((p, i) => {
          const { price, strike, discountLabel, isIntro } = getDisplayPrice(p, isYearly);
          const idx = ORDER.indexOf(p.tier);
          const isCurrent = idx === curIdx;
          const featured = true;
          const features = (isYearly ? p.yearlyFeatures : p.monthlyFeatures) ?? p.features;
          return (
            <article
              key={p.tier}
              className="glass-tile glass-appear flex flex-col px-10 py-12"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[22px] font-semibold">{p.name}</h2>
                {featured && (
                  <span className="rounded-full border border-primary/45 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {t("One simple plan")}
                  </span>
                )}
              </div>
              <div className="mt-8 flex items-baseline gap-2">
                <span className="text-[64px] leading-none font-semibold tracking-[-0.05em] tabular-nums">${price}</span>
                <span className="text-[14px] text-foreground/65">/{isYearly ? t("year") : t("month")}</span>
              </div>
              <div className="mt-3 h-5 text-[13px] text-foreground/65">
                {strike > price && (
                  <>
                    <span className="line-through">${strike}</span>
                    <span className="ms-2 text-foreground">{isIntro ? t("First month") : discountLabel}</span>
                  </>
                )}
              </div>
              <p className="mt-6 text-[13px] text-foreground/65">
                {isYearly ? p.yearlyCredits : p.monthlyCredits}
              </p>
              <button
                disabled={isCurrent || loadingTier !== null}
                onClick={() => onSubscribe(p.tier)}
                className={`glass-cta mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-[14px] font-semibold transition disabled:opacity-60 ${
                  featured ? "" : "border-foreground/25"
                }`}
              >
                {loadingTier === p.tier ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCurrent ? (
                  t("Current plan")
                ) : (
                  <>
                    {t("Get")} {p.name} <ArrowRight className="h-4 w-4 rtl-flip" />
                  </>
                )}
              </button>
              <ul className="mt-10 space-y-3.5">
                {features.map((f) => (
                  <li key={f} className="flex gap-3 text-[14px] leading-snug">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
        <aside className="glass-tile glass-appear px-10 py-12" style={{ "--i": 2 } as React.CSSProperties}>
          <p className="text-[11px] font-semibold uppercase text-foreground/65">{t("Clear usage")}</p>
          <h2 className="mt-4 text-[28px] font-semibold">{t("You always know the cost.")}</h2>
          <dl className="mt-10 divide-y divide-foreground/10 border-y border-foreground/10 text-[14px]">
            {[["Chat", "Free"], ["Images & video", "Subscribers only"], ["Agent switching", "Subscribers only"], ["Included credits", "1,000 / month"]].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-4"><dt>{t(label)}</dt><dd className="font-semibold">{t(value)}</dd></div>
            ))}
          </dl>
          <p className="mt-8 text-[13px] leading-relaxed text-foreground/65">{t("Free accounts cannot generate images or videos, or switch agents. Media is created directly in chat for subscribers when the provider is available.")}</p>
        </aside>
      </section>

      <div className="mt-16 border-b border-foreground/10">
        <CreditPacks isPro={!!currentPlan && currentPlan !== "free"} />
      </div>

      {/* Free line */}
      <div className="flex items-center justify-between border-b border-foreground/10 py-8 text-[14px]">
        <span className="text-foreground/65">{t("Not ready? Chat with Megsy stays free.")}</span>
        <a href="mailto:support@megsyai.com" className="font-semibold underline underline-offset-4">
          {t("Talk to us")}
        </a>
      </div>

      {/* FAQ */}
      <section id="pricing-faq" className="grid grid-cols-[280px_1fr] gap-16 pt-20">
        <h2 className="text-[32px] leading-tight font-semibold tracking-[-0.03em]">{t("Questions")}</h2>
        <div className="border-t border-foreground/10">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} className="border-b border-foreground/10">
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-5 text-start text-[15px] font-medium"
                >
                  {f.q}
                  {open ? <Minus className="h-4 w-4 shrink-0" /> : <Plus className="h-4 w-4 shrink-0" />}
                </button>
                {open && <p className="pb-6 pe-10 text-[14px] leading-relaxed text-foreground/65">{f.a}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
