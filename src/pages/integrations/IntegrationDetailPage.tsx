import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { integrations as CATALOG } from "@/lib/integrationsData";
import {
  loadIntegrationConnections,
  startIntegrationConnection,
  disconnectIntegration,
  waitForConnectionRefresh,
  type IntegrationMeta,
} from "@/lib/integrationBackend";
import { IntegrationLogo } from "@/components/chat/integrations/IntegrationRow";
import { useUserLang } from "@/lib/authI18n";

/** One app: status, linked accounts, add another account, disconnect. */
export default function IntegrationDetailPage() {
  const { app = "" } = useParams();
  const navigate = useNavigate();
  const ar = useUserLang() === "ar-eg";
  const item = CATALOG.find((i) => i.app === app);
  const [meta, setMeta] = useState<IntegrationMeta | null>(null);
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null);

  const refresh = async () => {
    if (!item) return false;
    try {
      const s = await loadIntegrationConnections([item]);
      const isOn = !!s.connectedApps[item.app];
      setOn(isOn);
      setMeta(s.appMeta[item.app] ?? null);
      return isOn;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (item) document.title = `${item.name} — Megsy`;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app]);

  if (!item) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background text-sm text-muted-foreground">
        {ar ? "التطبيق ده مش موجود" : "App not found"}
      </div>
    );
  }

  const connect = async () => {
    setBusy("connect");
    try {
      const res = await startIntegrationConnection(item);
      if ("popup" in res && res.popup) await waitForConnectionRefresh(refresh, res.popup);
      else await refresh();
      window.dispatchEvent(new CustomEvent("megsy:integrations-changed"));
      toast.success(ar ? `تم ربط ${item.name}` : `${item.name} connected`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't connect");
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    try {
      await disconnectIntegration(item);
      await refresh();
      window.dispatchEvent(new CustomEvent("megsy:integrations-changed"));
      toast.success(ar ? "تم الفصل" : "Disconnected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't disconnect");
    } finally {
      setBusy(null);
    }
  };

  const m = (meta ?? {}) as Record<string, unknown>;
  const accountName =
    (m.account_name as string) || (m.email_address as string) || (m.telegram_username as string) ||
    (m.name as string) || (m.login as string) || (ar ? "الحساب الرئيسي" : "Main account");

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto max-w-xl px-5 pb-20 pt-4">
        <button
          type="button"
          onClick={() => navigate("/integrations", { replace: true })}
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-muted"
        >
          <ArrowLeft className={`h-5 w-5 ${ar ? "rotate-180" : ""}`} />
        </button>

        {/* Hero */}
        <div className="relative mt-6 flex flex-col items-center rounded-[32px] bg-card px-6 pb-8 pt-10 text-center ring-1 ring-border/60">
          <span className="relative grid h-24 w-24 place-items-center rounded-[28px] bg-background ring-1 ring-border/60">
            <IntegrationLogo item={item} size={54} />
          </span>
          <h1 className="relative mt-5 text-[26px] font-bold tracking-tight">{item.name}</h1>
          <p className="relative mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          <span
            className={`relative mt-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              on ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-background" : "bg-muted-foreground/50"}`} />
            {loading ? "…" : on ? (ar ? "متصل" : "Connected") : ar ? "غير متصل" : "Not connected"}
          </span>
        </div>

        <section className="mt-8">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {ar ? "الحسابات" : "Accounts"}
          </h2>
          <div className="overflow-hidden rounded-[24px] bg-card ring-1 ring-border/60">
            {loading ? (
              <div className="grid h-16 place-items-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : on ? (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-foreground">
                  <UserRound className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{accountName}</span>
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  disabled={!!busy}
                  aria-label={ar ? "فصل" : "Disconnect"}
                  className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  {busy === "disconnect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <p className="px-4 py-5 text-center text-sm text-muted-foreground">
                {ar ? "مفيش حسابات مربوطة لسه" : "No accounts linked yet"}
              </p>
            )}
            <button
              type="button"
              onClick={() => void connect()}
              disabled={!!busy}
              className="flex w-full items-center gap-3 border-t border-border/60 px-4 py-3.5 text-start text-sm font-semibold transition-colors hover:bg-muted/50 disabled:opacity-50"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background">
                {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </span>
              {on ? (ar ? "إضافة حساب تاني" : "Add another account") : ar ? `ربط ${item.name}` : `Connect ${item.name}`}
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-[24px] bg-card px-5 py-4 ring-1 ring-border/60">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            {ar ? "ميغسي بيستخدمه إزاي" : "How Megsy uses it"}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {ar
              ? "لما تطلب حاجة محتاجة التطبيق ده، ميغسي بيستخدم حسابك المربوط تلقائيًا، وبيسألك قبل أي خطوة مهمة."
              : "When a request needs this app, Megsy uses your linked account automatically and asks before important steps."}
          </p>
        </section>
      </div>
    </div>
  );
}
