/** @doc Memory — what Megsy remembers about the user (user_knowledge): add, edit, toggle, delete, search. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Brain, Loader2, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyTurnContextChanged } from "@/lib/chat/turnContext";
import { useUserLang } from "@/lib/authI18n";

type Row = {
  id: string;
  name: string;
  use_when: string;
  content: string;
  enabled: boolean;
  created_at: string;
};

type Draft = { id?: string; name: string; use_when: string; content: string };

const T = {
  en: {
    title: "Memory",
    sub: "Things Megsy remembers and uses in your chats.",
    search: "Search memory",
    add: "Add memory",
    edit: "Edit memory",
    empty: "Nothing here yet",
    emptySub: "Add a fact or instruction and Megsy will use it when it fits.",
    name: "Title",
    namePh: "e.g. My writing style",
    when: "Use when",
    whenPh: "When should Megsy use this?",
    content: "What to remember",
    contentPh: "Write the fact or instruction",
    save: "Save",
    saving: "Saving…",
    del: "Delete",
    confirmDel: "Delete this memory?",
    required: "Fill in “Use when” and “What to remember”",
    failed: "Could not save",
    delFailed: "Could not delete",
    on: "On",
    off: "Off",
    noResults: "No matches",
    untitled: "Untitled",
  },
  ar: {
    title: "الذاكرة",
    sub: "الحاجات اللي ميغسي فاكرها وبيستخدمها في محادثاتك.",
    search: "دوّر في الذاكرة",
    add: "إضافة ذكرى",
    edit: "تعديل الذكرى",
    empty: "لسه مفيش حاجة",
    emptySub: "ضيف معلومة أو تعليمات وميغسي هيستخدمها لما تناسب.",
    name: "العنوان",
    namePh: "مثلًا: أسلوب كتابتي",
    when: "تُستخدم لما",
    whenPh: "إمتى ميغسي يستخدم دي؟",
    content: "المطلوب تفتكره",
    contentPh: "اكتب المعلومة أو التعليمات",
    save: "حفظ",
    saving: "بيحفظ…",
    del: "حذف",
    confirmDel: "تحذف الذكرى دي؟",
    required: "اكتب «تُستخدم لما» و«المطلوب تفتكره»",
    failed: "مقدرناش نحفظ",
    delFailed: "مقدرناش نحذف",
    on: "شغّالة",
    off: "متوقفة",
    noResults: "مفيش نتايج",
    untitled: "بدون عنوان",
  },
};

export default function MemoryPage() {
  const navigate = useNavigate();
  const lang = useUserLang();
  const ar = lang === "ar-eg";
  const t = ar ? T.ar : T.en;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_knowledge")
      .select("id,name,use_when,content,enabled,created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.name} ${r.use_when} ${r.content}`.toLowerCase().includes(s));
  }, [rows, q]);

  const save = async () => {
    if (!draft) return;
    if (!draft.use_when.trim() || !draft.content.trim()) {
      toast.error(t.required);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim().slice(0, 120),
        use_when: draft.use_when.trim().slice(0, 500),
        content: draft.content.trim().slice(0, 5000),
      };
      if (draft.id) {
        const { error } = await supabase.from("user_knowledge").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) throw new Error("no user");
        const { error } = await supabase.from("user_knowledge").insert({ user_id: uid, ...payload });
        if (error) throw error;
      }
      setDraft(null);
      await load();
      notifyTurnContextChanged();
    } catch {
      toast.error(t.failed);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t.confirmDel)) return;
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    setDraft(null);
    const { error } = await supabase.from("user_knowledge").delete().eq("id", id);
    if (error) {
      setRows(prev);
      toast.error(t.delFailed);
      return;
    }
    notifyTurnContextChanged();
  };

  const toggle = async (row: Row) => {
    setRows((p) => p.map((r) => (r.id === row.id ? { ...r, enabled: !r.enabled } : r)));
    const { error } = await supabase.from("user_knowledge").update({ enabled: !row.enabled }).eq("id", row.id);
    if (error) {
      setRows((p) => p.map((r) => (r.id === row.id ? { ...r, enabled: row.enabled } : r)));
      toast.error(t.failed);
      return;
    }
    notifyTurnContextChanged();
  };

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate("/settings", { replace: true })}
            className="grid h-10 w-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-muted"
          >
            <ArrowLeft className={`h-5 w-5 ${ar ? "rotate-180" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setDraft({ name: "", use_when: "", content: "" })}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-bold text-background transition-transform hover:scale-[1.03] active:scale-95"
          >
            <Plus className="h-4 w-4" /> {t.add}
          </button>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-muted">
            <Brain className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-[26px] font-bold leading-tight tracking-tight">{t.title}</h1>
            <p className="text-[13px] text-muted-foreground">{t.sub}</p>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="relative mt-6">
            <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.search}
              className="h-11 w-full rounded-full bg-muted/70 pe-4 ps-11 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="grid h-40 place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center rounded-[32px] bg-card px-6 py-14 text-center ring-1 ring-border/60">
              <span className="grid h-16 w-16 place-items-center rounded-[22px] bg-muted">
                <Sparkles className="h-7 w-7 text-muted-foreground" />
              </span>
              <p className="mt-5 text-[16px] font-bold">{t.empty}</p>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">{t.emptySub}</p>
              <button
                type="button"
                onClick={() => setDraft({ name: "", use_when: "", content: "" })}
                className="mt-6 inline-flex h-11 items-center gap-1.5 rounded-full bg-foreground px-6 text-[14px] font-bold text-background transition-transform hover:scale-[1.03] active:scale-95"
              >
                <Plus className="h-4 w-4" /> {t.add}
              </button>
            </div>
          ) : shown.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t.noResults}</p>
          ) : (
            <ul className="space-y-2.5">
              {shown.map((r) => (
                <li
                  key={r.id}
                  className={`flex items-start gap-3 rounded-[24px] bg-card p-4 ring-1 ring-border/60 transition-opacity ${r.enabled ? "" : "opacity-60"}`}
                >
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                    <Brain className="h-4.5 w-4.5" />
                  </span>
                  <button
                    type="button"
                    onClick={() => setDraft({ id: r.id, name: r.name, use_when: r.use_when, content: r.content })}
                    className="min-w-0 flex-1 text-start"
                  >
                    <p className="truncate text-[14.5px] font-semibold">{r.name || t.untitled}</p>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{r.content}</p>
                    <p className="mt-2 truncate text-[12px] text-muted-foreground/80">
                      {t.when}: {r.use_when}
                    </p>
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={r.enabled}
                    aria-label={r.enabled ? t.on : t.off}
                    onClick={() => toggle(r)}
                    className={`relative mt-1.5 h-6 w-10 shrink-0 rounded-full transition-colors ${r.enabled ? "bg-foreground" : "bg-muted"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${
                        r.enabled ? "start-[18px]" : "start-0.5"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setDraft(null)} />
          <div className="relative w-full max-w-lg rounded-t-[28px] bg-card p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] ring-1 ring-border/60 sm:rounded-[28px]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDraft(null)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-[15px] font-semibold">{draft.id ? t.edit : t.add}</h2>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="h-9 rounded-full bg-foreground px-4 text-[13px] font-bold text-background disabled:opacity-60"
              >
                {saving ? t.saving : t.save}
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <Field label={t.name}>
                <input
                  value={draft.name}
                  maxLength={120}
                  placeholder={t.namePh}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="h-11 w-full rounded-2xl bg-muted/70 px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>
              <Field label={`${t.when} *`}>
                <textarea
                  value={draft.use_when}
                  maxLength={500}
                  rows={2}
                  placeholder={t.whenPh}
                  onChange={(e) => setDraft({ ...draft, use_when: e.target.value })}
                  className="w-full resize-none rounded-2xl bg-muted/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>
              <Field label={`${t.content} *`}>
                <textarea
                  value={draft.content}
                  maxLength={5000}
                  rows={5}
                  placeholder={t.contentPh}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  className="w-full resize-none rounded-2xl bg-muted/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>
              {draft.id && (
                <button
                  type="button"
                  onClick={() => remove(draft.id!)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" /> {t.del}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
