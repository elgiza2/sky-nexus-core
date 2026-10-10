import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { integrations as CATALOG } from "@/lib/integrationsData";
import { loadIntegrationConnections } from "@/lib/integrationBackend";
import { IntegrationLogo } from "@/components/chat/integrations/IntegrationRow";
import { useUserLang } from "@/lib/authI18n";

/** Apps — a quiet home-screen grid. Tapping an app opens its own manage page. */
export default function IntegrationsPage() {
  const navigate = useNavigate();
  const ar = useUserLang() === "ar-eg";
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "Apps — Megsy";
    loadIntegrationConnections(CATALOG)
      .then((s) => setConnected(s.connectedApps || {}))
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? CATALOG.filter((i) => i.name.toLowerCase().includes(q)) : CATALOG;
  }, [query]);
  const mine = filtered.filter((i) => connected[i.app]);
  const rest = filtered.filter((i) => !connected[i.app]);

  const Grid = ({ items }: { items: typeof CATALOG }) => (
    <div className="grid grid-cols-4 gap-x-3 gap-y-6 sm:grid-cols-6 md:grid-cols-8">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => navigate(`/integrations/${encodeURIComponent(item.app)}`)}
          className="group flex min-w-0 flex-col items-center gap-2 outline-none"
        >
          <span
            className={`grid h-[60px] w-[60px] place-items-center rounded-[18px] bg-card ring-1 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-ring ${
              connected[item.app] ? "ring-foreground/40" : "ring-border/60"
            }`}
          >
            <IntegrationLogo item={item} size={34} />
          </span>
          <span className="w-full truncate text-center text-[11.5px] text-foreground/75">{item.name}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-4">
        <button
          type="button"
          onClick={() => navigate("/chat", { replace: true })}
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full text-foreground/80 hover:bg-muted"
        >
          <ArrowLeft className={`h-5 w-5 ${ar ? "rotate-180" : ""}`} />
        </button>
        <h1 className="mt-6 text-[28px] font-semibold tracking-tight">{ar ? "التطبيقات" : "Apps"}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {ar ? "اربط تطبيقاتك وميغسي هيستخدمها وقت ما يحتاج." : "Connect your apps and Megsy uses them when needed."}
        </p>
        <div className="relative mt-6">
          <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ar ? "ابحث" : "Search"}
            className="h-11 w-full rounded-full bg-muted/70 ps-11 pe-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        {mine.length > 0 && (
          <section className="mt-9">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {ar ? "متصل" : "Connected"}
            </h2>
            <Grid items={mine} />
          </section>
        )}
        <section className="mt-9">
          {mine.length > 0 && (
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {ar ? "كل التطبيقات" : "All apps"}
            </h2>
          )}
          <Grid items={rest} />
        </section>
        {filtered.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">{ar ? "لا نتائج" : "No results"}</p>
        )}
      </div>
    </div>
  );
}
