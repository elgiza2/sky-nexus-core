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
  Coins,
  Film,
  Infinity as InfinityIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import MegsyStar from "@/components/branding/MegsyStar";
import { MobileSidebarButton } from "@/components/shared/MobileSidebarButton";
import { useUserLang } from "@/lib/authI18n";
import { useUserPlan } from "@/hooks/useUserPlan";
import { getDisplayPrice, getPlan, type PlanTier } from "@/data/pricingData";


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
      icon: Coins,
      text: isYearly
        ? isAr
          ? "1000 رصيد Megsy كل شهر"
          : "1,000 Megsy Credits every month"
        : isAr
          ? "1000 رصيد Megsy مع الاشتراك"
          : "1,000 Megsy Credits with your plan",
    };

    return [head, ...base, {
      icon: Film,
      text: isAr ? "صور وفيديو Higgsfield" : "Higgsfield images & video",
    }];
  }, [isAr, isYearly]);

  const pro = getPlan("pro")!;
  const monthly = getDisplayPrice(pro, false);
  const yearly = getDisplayPrice(pro, true);

  const monthlyPrice = monthly.price;
  const yearlyPrice = yearly.price;

  const t = isAr
    ? {
        title: "قم بالترقية إلى Megsy Pro",
        monthly: "شهرياً",
        yearly: "سنوياً",
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
      price: monthlyPrice,
      strike: monthly.strike,
      unit: t.perMonth,
    },
    {
      key: "yearly",
      yearly: true,
      label: t.yearly,
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

      <main className="relative z-10 mx-auto flex w-full max-w-[400px] flex-1 flex-col px-5 pb-[96px]">
        {/* Top flexible space — centers the whole block on tall screens */}
        <div className="flex-[0.55]" />


        {/* Megsy star mark */}
        <div
          className="glass-appear flex justify-center"
          style={{ "--i": 0 } as React.CSSProperties}
        >

          <MegsyStar className={`${compact ? "h-7 w-7" : "h-8 w-8"} text-foreground`} />
        </div>

        {/* Title */}
        <h1
          className={`glass-appear text-center font-semibold leading-[1.15] tracking-[-0.028em] text-foreground ${
            compact ? "mt-2 text-[21px]" : "mt-2.5 text-[23px]"
          }`}
          style={{ "--i": 1 } as React.CSSProperties}
        >
          {t.title}
        </h1>

        {/* Feature card — single column, airy rows on one frosted panel */}
        <div
          className={`glass-tile glass-appear ${
            compact ? "mt-3 px-4 py-3.5" : "mt-4 px-5 py-5"
          }`}

          style={{ "--i": 2 } as React.CSSProperties}
        >
          <ul className={`flex flex-col ${compact ? "gap-[12px]" : "gap-[18px]"}`}>
            {features.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className={`flex items-center gap-3 ${isAr ? "flex-row-reverse text-right" : ""}`}
              >
                <Icon
                  className={`${compact ? "h-[18px] w-[18px]" : "h-[20px] w-[20px]"} shrink-0 text-muted-foreground`}
                  strokeWidth={1.5}
                />
                <span
                  className={`flex-1 leading-[1.4] ${
                    i === 0
                      ? "font-semibold text-foreground"
                      : "font-normal text-foreground/75"
                  } ${compact ? "text-[13px]" : "text-[14px]"}`}
                >
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Billing options */}
        <div
          className="glass-appear relative mt-4 grid grid-cols-2 gap-3"
          style={{ "--i": 3 } as React.CSSProperties}
        >
          {/* One tile slides under the chosen square. */}
          <span aria-hidden className="megsy-plan-flag" data-side={isYearly ? "b" : "a"} />
          {options.map((opt) => {
            const selected = isYearly === opt.yearly;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onToggleYearly(opt.yearly)}
                data-selected={selected}
                aria-pressed={selected}
                className={`megsy-plan-tile ${compact ? "p-3" : "p-4"}`}
              >
                <span className="megsy-plan-name">{opt.label}</span>
                {/* Re-keyed so the price replays its entrance on every switch. */}
                <span className="megsy-plan-price" key={String(selected)}>
                  {localPrice(opt.price) ?? `$${opt.price}`}
                </span>
                <span className="megsy-plan-unit">{opt.unit}</span>
                <span className="megsy-plan-strike">
                  {localPrice(opt.strike) ?? `$${opt.strike}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom flexible space — keeps the block centered on tall screens */}
        <div className="flex-[0.45]" />
      </main>

      {/* Upgrade action — black, pinned to the bottom of the screen. */}
      <div className="megsy-plan-bar">
        <button
          type="button"
          onClick={() =>
            alreadySubscribed
              ? navigate("/settings/billing")
              : onSubscribe("pro", { trial: false })
          }
          disabled={isLoading}
          className={`megsy-plan-cta ${compact ? "h-[46px] text-[14px]" : "h-[50px] text-[15px]"}`}
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          ) : (
            t.cta
          )}
        </button>
      </div>
    </div>

  );
}
