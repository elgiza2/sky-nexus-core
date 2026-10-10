/** @doc Mobile /pricing — glass upgrade sheet, same liquid-glass language as checkout.
 *  Single plan (Megsy Pro): dotted backdrop · Megsy star · big serif title ·
 *  frosted feature card · two glass billing cards with radios · fine print ·
 *  glass CTA · legal links.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Monitor,
  Clock,
  Bot,
  Search,
  Infinity as InfinityIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import MegsyStar from "@/components/branding/MegsyStar";
import { MobileSidebarButton } from "@/components/shared/MobileSidebarButton";
import { useUserLang } from "@/lib/authI18n";
import { useUserPlan } from "@/hooks/useUserPlan";
import { getDisplayPrice, getPlan, type PlanTier } from "@/data/pricingData";

function MegsyFeatureIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <MegsyStar className={className ?? "h-5 w-5"} />;
}

function useLocalPrice() {
  return (_usd: number) => null;
}

function useCompactHeight() {
  const [compact, setCompact] = useState(
    typeof window !== "undefined" && window.innerHeight < 780,
  );
  useEffect(() => {
    const update = () => setCompact(window.innerHeight < 780);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return compact;
}

interface Props {
  isYearly: boolean;
  onToggleYearly: (yearly: boolean) => void;
  onSubscribe: (tier: PlanTier, opts?: { trial?: boolean }) => void;
  loadingTier?: PlanTier | null;
  onMenuClick?: () => void;
}

export default function MobilePricingScreen({
  isYearly,
  onToggleYearly,
  onSubscribe,
  loadingTier,
  onMenuClick,
}: Props) {
  const lang = useUserLang();
  const isAr = lang === "ar-eg";
  const compact = useCompactHeight();
  const localPrice = useLocalPrice();
  const isLoading = loadingTier === "pro";
  const navigate = useNavigate();
  // A subscriber must never be told to "upgrade" to the plan they already own.
  const { plan } = useUserPlan();
  const alreadySubscribed = plan === "pro" || plan === "max" || plan === "elite";

  // Keep the benefit rows stable so the card height (and the CTA position) never
  // shifts when the billing interval changes — only the first row's copy does.
  const features = useMemo(() => {
    const base = isAr
      ? [
          { icon: Monitor, text: "بحث وتصفح وبرمجة في نفس الشات" },
          { icon: Clock, text: "متابعة خطوات المهمة مباشرة" },
          { icon: Bot, text: "تغيير الوكيل للمشتركين" },
          { icon: Search, text: "بحث عميق موثّق بالمصادر" },
          { icon: InfinityIcon, text: "دردشة بلا حدود" },
        ]
      : [
          { icon: Monitor, text: "Search, browsing and coding in chat" },
          { icon: Clock, text: "Live task progress" },
          { icon: Bot, text: "Subscriber-only agent switching" },
          { icon: Search, text: "Deep research with citations" },
          { icon: InfinityIcon, text: "Unlimited chat" },
        ];

    const head = {
      icon: MegsyFeatureIcon,
      text: isYearly
        ? isAr
          ? "1000 رصيد Megsy كل شهر"
          : "1,000 Megsy Credits every month"
        : isAr
          ? "1000 رصيد Megsy مع الاشتراك"
          : "1,000 Megsy Credits with your plan",
    };

    return [head, ...base, {
      icon: MegsyFeatureIcon,
      text: isAr ? "صور وفيديو Higgsfield للمشتركين فقط" : "Higgsfield images & video — subscribers only",
    }];
  }, [isAr, isYearly]);

  const pro = getPlan("pro")!;
  const monthly = getDisplayPrice(pro, false);
  const yearly = getDisplayPrice(pro, true);

  const monthlyPrice = monthly.price;
  const yearlyPrice = yearly.price;
  const monthlyOff = Math.round((1 - monthlyPrice / pro.monthlyPrice) * 100);

  const t = isAr
    ? {
        title: "قم بالترقية إلى Megsy Pro",
        monthly: "شهرياً",
        yearly: "سنوياً",
        introBadge: `خصم ${monthlyOff}% على الشهر الأول`,
        yearlyBadge: "4 أشهر مجاناً",
        perMonth: "/ الشهر الأول",
        perYear: "/ سنة",
        fine: `$${monthlyPrice}.00 للشهر الأول، ثم $${pro.monthlyPrice}.00/شهر. يمكنك الإلغاء في أي وقت.`,
        cta: "قم بالترقية الآن",
        terms: "الشروط",
        privacy: "الخصوصية",
        restore: "استعادة",
      }
    : {
        title: "Upgrade to Megsy Pro",
        monthly: "Monthly",
        yearly: "Yearly",
        introBadge: `${monthlyOff}% off the first month`,
        yearlyBadge: "4 months free",
        perMonth: "/first mo",
        perYear: "/year",
        fine: `$${monthlyPrice}.00 for the first month, then $${pro.monthlyPrice}.00/month. Cancel anytime.`,
        cta: "Upgrade now",
        terms: "Terms",
        privacy: "Privacy",
        restore: "Restore",
      };

  if (alreadySubscribed) {
    const planLabel = plan === "pro" ? "Megsy Pro" : plan === "max" ? "Megsy Max" : "Megsy Elite";
    t.title = isAr ? `أنت مشترك في ${planLabel}` : `You're on ${planLabel}`;
    t.cta = isAr ? "إدارة الاشتراك" : "Manage subscription";
    t.fine = isAr
      ? "اشتراكك نشط. من إدارة الاشتراك تقدر تغيّر الخطة أو تلغيها في أي وقت."
      : "Your subscription is active. Change or cancel it anytime from subscription settings.";
  }

  const options = [
    {
      key: "monthly",
      yearly: false,
      label: t.monthly,
      badge: t.introBadge,
      price: monthlyPrice,
      strike: monthly.strike,
      unit: t.perMonth,
    },
    {
      key: "yearly",
      yearly: true,
      label: t.yearly,
      badge: t.yearlyBadge,
      price: yearlyPrice,
      strike: yearly.strike,
      unit: t.perYear,
    },
  ] as const;

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="megsy-pricing relative flex h-[100dvh] w-full flex-col overflow-hidden"
    >
      {/* Dotted backdrop texture */}
      <div aria-hidden className="glass-texture pointer-events-none absolute inset-0" />

      {/* Header — same fixed bar + button spot as the chat mobile header */}
      <header
        className="fixed inset-x-0 z-30 flex min-h-[44px] items-center px-3 py-1.5 pt-[max(env(safe-area-inset-top),0.25rem)]"
        style={{ top: "var(--promo-banner-h, 0px)" }}
      >
        <MobileSidebarButton
          onClick={() => onMenuClick?.()}
          ariaLabel="Menu"
          className="text-foreground"
        />
      </header>
      {/* Spacer so content clears the fixed header */}
      <div className="shrink-0" style={{ height: "calc(max(env(safe-area-inset-top), 0.25rem) + 44px)" }} />

      <main className="relative z-10 mx-auto flex w-full max-w-[400px] flex-1 flex-col px-5">
        {/* Top flexible space — centers the whole block on tall screens */}
        <div className="flex-[0.6]" />
        {/* Megsy star mark */}
        <div
          className={`glass-appear flex justify-center ${compact ? "mt-[2%]" : "mt-[4%]"}`}
          style={{ "--i": 0 } as React.CSSProperties}
        >
          <MegsyStar className={`${compact ? "h-7 w-7" : "h-8 w-8"} text-foreground`} />
        </div>

        {/* Title */}
        <h1
          className={`glass-appear text-center font-normal leading-[1.2] tracking-[-0.015em] text-foreground ${
            compact ? "mt-2 text-[22px]" : "mt-2.5 text-[25px]"
          }`}
          style={{ "--i": 1, fontFamily: '"Instrument Serif", Georgia, serif' } as React.CSSProperties}
        >
          {t.title}
        </h1>

        {/* Feature card — single column, airy rows on one frosted panel */}
        <div
          className={`glass-tile glass-appear ${
            compact ? "mt-3.5 px-4 py-3.5" : "mt-5 px-5 py-4"
          }`}
          style={{ "--i": 2 } as React.CSSProperties}
        >
          <ul className={`flex flex-col ${compact ? "gap-[11px]" : "gap-[14px]"}`}>
            {features.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className={`flex items-center gap-3 ${isAr ? "flex-row-reverse text-right" : ""}`}
              >
                <Icon
                  className={`${compact ? "h-[18px] w-[18px]" : "h-[20px] w-[20px]"} shrink-0 text-muted-foreground`}
                  strokeWidth={1.5}
                />
                <span
                  className={`flex-1 leading-[1.35] text-foreground ${compact ? "text-[13px]" : "text-[14px]"}`}
                >
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Breathing room between the feature card and billing options */}
        <div className="flex-[0.4] min-h-[12px] max-h-10" />

        {/* Billing options */}
        <div
          className={`glass-appear flex flex-col ${compact ? "gap-2" : "gap-2.5"}`}
          style={{ "--i": 3 } as React.CSSProperties}
        >
          {options.map((opt, index) => {
            const selected = isYearly === opt.yearly;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onToggleYearly(opt.yearly)}
                data-selected={selected}
                aria-pressed={selected}
                className={`glass-tile flex w-full items-center gap-3 px-4 text-start transition-all duration-200 ${
                  compact ? "py-2" : "py-2.5"
                } ${isAr ? "flex-row-reverse" : ""}`}
                style={{ "--i": 4 + index } as React.CSSProperties}
              >
                <span
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    selected ? "border-foreground" : "border-foreground/25"
                  }`}
                >
                  {selected && (
                    <span className="h-[8px] w-[8px] rounded-full bg-foreground" />
                  )}
                </span>
                <span className="flex flex-1 flex-col gap-[3px]">
                  <span
                    className={`flex items-center gap-2 ${isAr ? "flex-row-reverse" : ""} justify-start`}
                  >
                    <span className="text-[12.5px] font-medium text-muted-foreground">
                      {opt.label}
                    </span>
                    {opt.badge && (
                      <span className="rounded-full bg-primary/10 px-2 py-[2.5px] text-[10px] font-medium leading-none text-primary">
                        {opt.badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`flex items-baseline gap-2 tabular-nums ${isAr ? "flex-row-reverse" : ""} justify-start`}
                  >
                    {/* The local currency is the price, not a footnote: the
                        dollar amount moves to the small secondary line. */}
                    <span className={`${compact ? "text-[15px]" : "text-[16px]"} font-semibold text-foreground`}>
                      {localPrice(opt.price) ?? `$${opt.price}`}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {opt.unit}
                    </span>
                    <span className="text-[11.5px] line-through text-muted-foreground/70">
                      {localPrice(opt.strike) ?? `$${opt.strike}`}
                    </span>
                    {localPrice(opt.price) ? (
                      <span className="text-[11px] text-muted-foreground/70">
                        ${opt.price}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Fine print + CTA + legal, pinned to the very bottom */}
        <div
          className={`glass-appear shrink-0 ${compact ? "pt-2" : "pt-3"}`}
          style={{
            "--i": 6,
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
          } as React.CSSProperties}
        >
          <p
            className={`text-center leading-[1.45] text-muted-foreground ${
              compact ? "mb-2 min-h-[26px] text-[10px]" : "mb-2.5 min-h-[30px] text-[10.5px]"
            }`}
          >
            {t.fine}
          </p>
          <button
            type="button"
            onClick={() =>
              alreadySubscribed
                ? navigate("/settings/billing")
                : onSubscribe("pro", { trial: false })
            }
            disabled={isLoading}
            className={`glass-cta flex w-full items-center justify-center rounded-xl px-6 font-semibold leading-none transition active:scale-[0.99] disabled:opacity-60 ${
              compact ? "h-[46px] text-[14px]" : "h-[50px] text-[15px]"
            }`}
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
            ) : (
              t.cta
            )}
          </button>
          <nav
            className={`flex items-center justify-center gap-6 leading-none text-muted-foreground ${
              compact ? "mt-2 text-[11px]" : "mt-3 text-[11.5px]"
            }`}
            aria-label="Legal"
          >
            <Link to="/terms" className="inline-flex min-h-11 items-center px-2 transition-opacity hover:opacity-70">
              {t.terms}
            </Link>
            <Link to="/privacy" className="inline-flex min-h-11 items-center px-2 transition-opacity hover:opacity-70">
              {t.privacy}
            </Link>
            <Link to="/restore" className="inline-flex min-h-11 items-center px-2 transition-opacity hover:opacity-70">
              {t.restore}
            </Link>
          </nav>
        </div>
        {/* Bottom flexible space — keeps the block centered on tall screens */}
        <div className="flex-[0.6]" />
      </main>
    </div>
  );
}
