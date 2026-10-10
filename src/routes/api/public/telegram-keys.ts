/** Telegram bot that fills the AgentSky key pool. Only Telegram (verified by the webhook
 *  secret header) can call it; only registered admins can add, list or remove keys.
 *  The first person to send /start becomes the admin. */
import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { validateAgentSkyKey } from "@/lib/agentsky/agentsky.server";

export function telegramWebhookSecret(token: string) {
  return createHash("sha256").update(`megsy-keys:${token}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const mask = (k: string) => (k.length > 12 ? `${k.slice(0, 6)}…${k.slice(-4)}` : "••••");

const HELP = [
  "🔑 <b>مفاتيح الوكيل</b>",
  "",
  "ابعت المفتاح كرسالة عادية عشان يتضاف.",
  "/keys — عرض المفاتيح",
  "/del رقم — حذف مفتاح",
  "/on رقم — تفعيل مفتاح متوقف",
].join("\n");

export const Route = createFileRoute("/api/public/telegram-keys")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_KEYS_BOT_TOKEN;
        if (!token) return new Response("not configured", { status: 500 });
        const header = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(header, telegramWebhookSecret(token))) return new Response("Unauthorized", { status: 401 });

        const update = await request.json().catch(() => null);
        const msg = update?.message;
        const chatId = msg?.chat?.id;
        const fromId = msg?.from?.id;
        const text = String(msg?.text ?? "").trim();
        if (!chatId || !fromId || !text) return Response.json({ ok: true });

        const send = (body: string) =>
          fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: body, parse_mode: "HTML" }),
          });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const { data: admins } = await db.from("telegram_key_admins").select("telegram_user_id");
        let isAdmin = (admins ?? []).some((a: any) => Number(a.telegram_user_id) === Number(fromId));
        if (!isAdmin && (admins ?? []).length === 0 && text.startsWith("/start")) {
          await db.from("telegram_key_admins").insert({ telegram_user_id: fromId });
          isAdmin = true;
        }
        if (!isAdmin) {
          await send("غير مسموح.");
          return Response.json({ ok: true });
        }

        const list = async () => {
          const { data } = await db.from("agentsky_keys").select("id,key_value,active,last_used_at,last_error").order("created_at");
          return (data ?? []) as any[];
        };

        if (text.startsWith("/start") || text.startsWith("/help")) {
          await send(HELP);
        } else if (text.startsWith("/keys")) {
          const rows = await list();
          await send(
            rows.length
              ? rows.map((r, i) => `${i + 1}. <code>${mask(r.key_value)}</code> ${r.active ? "🟢" : "🔴"}${r.last_error && !r.active ? ` — ${r.last_error.slice(0, 60)}` : ""}`).join("\n")
              : "مفيش مفاتيح لسه.",
          );
        } else if (/^\/(del|on)\s+\d+/.test(text)) {
          const [cmd, n] = text.split(/\s+/);
          const row = (await list())[Number(n) - 1];
          if (!row) await send("الرقم ده مش موجود.");
          else if (cmd === "/del") {
            await db.from("agentsky_keys").delete().eq("id", row.id);
            await send(`اتحذف ${mask(row.key_value)} ✅`);
          } else {
            await db.from("agentsky_keys").update({ active: true, last_error: null }).eq("id", row.id);
            await send(`اتفعل ${mask(row.key_value)} ✅`);
          }
        } else if (/^\S{20,300}$/.test(text)) {
          const ok = await validateAgentSkyKey(text).catch(() => false);
          if (!ok) await send("المفتاح ده مش شغال عند المزود ❌");
          else {
            const { error } = await db.from("agentsky_keys").insert({ key_value: text, added_by_telegram: fromId });
            await send(error ? (error.code === "23505" ? "المفتاح ده متضاف قبل كده." : "حصلت مشكلة في الحفظ.") : `اتضاف ${mask(text)} ✅`);
          }
        } else {
          await send(HELP);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
