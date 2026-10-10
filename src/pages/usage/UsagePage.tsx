/** @doc Credits — gradient balance hero, daily allowance, today's use and credit history. */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clapperboard,
  FileText,
  Gift,
  Globe,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Presentation,
  RefreshCw,
  Search,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { claimDailyCredits, fetchCreditOverview, type CreditOverview } from "@/lib/creditsSystem";
import { useUserLang } from "@/lib/authI18n";
import CreditPacks from "@/components/billing/CreditPacks";

type Tx = {
  id: string;
  amount: number;
  description: string | null;
  action_type: string | null;
  created_at: string;
};

const LABELS: Record<string, [string, string]> = {
  reward: ["Reward", "مكافأة"],
  daily: ["Daily credits", "رصيد يومي"],
  video: ["Video", "فيديو"],
  edit: ["Image editing", "تعديل صورة"],
  image: ["Image", "صورة"],
  slides: ["Presentation", "عرض تقديمي"],
  research: ["Research", "بحث"],
  web: ["Website", "موقع"],
  chat: ["Chat", "محادثة"],
  task: ["Task", "مهمة"],
};

const ICONS: Record<string, typeof Zap> = {
  reward: Gift,
  daily: RefreshCw,
  video: Clapperboard,
  edit: Wand2,
  image: ImageIcon,
  slides: Presentation,
  research: Search,
  web: Globe,
  chat: MessageCircle,
  task: Zap,
};

/** Never expose upstream provider or model names in the UI. */
const kindOf = (raw: string | null, action: string | null) => {
  const s = `${raw ?? ""} ${action ?? ""}`.toLowerCase();
  if (/reward|follow|bonus/.test(s)) return "reward";
  if (/refresh|daily/.test(s)) return "daily";
  if (/video|veo|sora|kling|hailuo|seedance|ltx|minimax/.test(s)) return "video";
  if (/headshot|inpaint|remover|colorizer|sketch|retouch|image-tool/.test(s)) return "edit";
  if (/image|seedream|gpt-image|render/.test(s)) return "image";
  if (/slide|presentation/.test(s)) return "slides";
  if (/research|report/.test(s)) return "research";
  if (/page|code|web/.test(s)) return "web";
  if (/chat|message|agent|generation/.test(s)) return "chat";
  return "task";
};

export default function UsagePage() {
  const navigate = useNavigate();
  const lang = useUserLang();
  const ar = lang === "ar-eg";
  const loc = ar ? "ar-EG" : "en-US";
  const [ov, setOv] = useState<CreditOverview | null>(null);
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setSignedOut(true);
          setLoading(false);
        }
        return;
      }
      await claimDailyCredits();
      const [o, tx] = await Promise.all([
        fetchCreditOverview(),
        supabase
          .from("credit_transactions")
          .select("id, amount, description, action_type, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(80),
      ]);
      if (cancelled) return;
      setOv(o);
      setRows((tx.data as Tx[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const plan = (ov?.plan ?? "free").toLowerCase();
  const paid = plan !== "free";
  const fmt = (n: number) => Math.round(n).toLocaleString(loc);

  const refreshIn = useMemo(() => {
    if (!ov?.nextRefresh) return null;
    const mins = Math.max(0, Math.round((new Date(ov.nextRefresh).getTime() - Date.now()) / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return ar ? (h ? `${h} س ${m} د` : `${m} د`) : h ? `${h}h ${m}m` : `${m}m`;
  }, [ov?.nextRefresh, ar]);

  const usedPct = ov && ov.dailyAllowance > 0 ? Math.min(100, (ov.spentToday / ov.dailyAllowance) * 100) : 0;

  const groups = useMemo(() => {
    const map = new Map<string, Tx[]>();
    for (const r of rows) {
      const k = new Date(r.created_at).toLocaleDateString(loc, { month: "long", day: "numeric" });
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return Array.from(map.entries());
  }, [rows, loc]);

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto w-full max-w-xl px-5 pb-24 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate("/settings", { replace: true })}
            className="grid h-10 w-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-muted"
          >
            <ArrowLeft className={`h-5 w-5 ${ar ? "rotate-180" : ""}`} />
          </button>
          <span className="rounded-full bg-muted px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wider text-foreground">
            {paid ? plan : ar ? "مجاني" : "Free"}
          </span>
        </div>

        {/* Balance hero */}
        <section className="relative mt-6 rounded-[32px] bg-foreground px-6 pb-7 pt-8 text-center text-background">
          <p className="text-[13px] font-medium opacity-80">
            {ar ? "رصيدك" : "Your credits"}
          </p>
          <p className="mt-2 text-[56px] font-bold leading-none tracking-tight tabular-nums">
            {ov ? fmt(ov.credits) : "—"}
          </p>
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-background px-6 text-[14px] font-bold text-foreground transition-transform hover:scale-[1.03] active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            {paid ? (ar ? "إدارة الاشتراك" : "Manage plan") : ar ? "ترقية" : "Upgrade"}
          </button>
        </section>

        {/* Today */}
        <section className="mt-4 rounded-[28px] bg-card p-5 ring-1 ring-border/60">
          <div className="flex items-baseline justify-between">
            <p className="text-[14px] font-semibold">{ar ? "النهارده" : "Today"}</p>
            <p className="text-[13px] tabular-nums text-muted-foreground">
              {ov ? `${fmt(ov.spentToday)} / ${fmt(ov.dailyAllowance)}` : "—"}
            </p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{ width: `${Math.max(usedPct, ov && ov.spentToday > 0 ? 3 : 0)}%` }}
            />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Stat label={ar ? "مهام" : "Tasks"} value={ov ? fmt(ov.tasksToday) : "—"} />
            <Stat label={ar ? "الشهر ده" : "This month"} value={ov ? fmt(ov.spentThisMonth) : "—"} />
            <Stat label={ar ? "التجديد" : "Refresh"} value={refreshIn ?? "—"} />
          </div>
        </section>

        {/* Balance breakdown */}
        <section className="mt-4 grid grid-cols-2 gap-2 rounded-[28px] bg-card p-5 ring-1 ring-border/60 text-center sm:grid-cols-4">
          <Stat label={ar ? "يومي" : "Daily"} value={ov ? fmt(ov.dailyCredits) : "—"} />
          <Stat label={ar ? "هدايا" : "Bonus"} value={ov ? fmt(ov.bonusCredits) : "—"} />
          <Stat label={ar ? "الباقة" : "Plan"} value={ov ? fmt(ov.planCredits) : "—"} />
          <Stat label={ar ? "مشترى" : "Purchased"} value={ov ? fmt(ov.purchasedCredits) : "—"} />
        </section>

        {!signedOut && <CreditPacks isPro={paid} />}


        {/* History */}
        <h2 className="mb-3 mt-10 px-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          {ar ? "السجل" : "History"}
        </h2>
        {loading ? (
          <div className="grid h-32 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : signedOut ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {ar ? "سجّل دخولك عشان تشوف رصيدك" : "Sign in to see your credits"}
          </p>
        ) : groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{ar ? "لسه مفيش استخدام" : "No usage yet"}</p>
        ) : (
          <div className="space-y-6">
            {groups.map(([day, items]) => (
              <div key={day}>
                <p className="mb-2 px-1 text-[12.5px] font-medium text-muted-foreground">{day}</p>
                <div className="divide-y divide-border/60 overflow-hidden rounded-[24px] bg-card ring-1 ring-border/60">
                  {items.map((it) => {
                    const amount = Number(it.amount) || 0;
                    const grant = amount < 0; // grants are stored as negatives
                    const kind = kindOf(it.description, it.action_type);
                    const Icon = ICONS[kind];
                    const label = LABELS[kind][ar ? 1 : 0];
                    return (
                      <div key={it.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">{label}</span>
                          <span className="block text-[12px] text-muted-foreground">
                            {new Date(it.created_at).toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </span>
                        <span
                          className="text-[14px] font-bold tabular-nums text-foreground"
                        >
                          {grant ? "+" : "−"}
                          {fmt(Math.abs(amount))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 px-2 py-3">
      <p className="text-[15px] font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11.5px] text-muted-foreground">{label}</p>
    </div>
  );
}
