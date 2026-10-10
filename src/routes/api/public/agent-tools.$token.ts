/** MCP server (streamable HTTP, JSON responses) the OpenClaw agent calls for app tools.
 *  The URL carries an HMAC-signed user id; every tool re-checks the user's plan live. */
import { createFileRoute } from "@tanstack/react-router";
import { readMcpToken, publicOrigin } from "@/lib/agentsky/agentsky.server";
import { pickModel, startRun, userTier, waitRun, runStatusToken } from "@/lib/agentsky/media.server";
import { agentProposalSchema } from "@/lib/agentsky/agentProposal";

const TOOLS = [
  {
    name: "generate_image",
    description:
      "Create or edit an image from a detailed English prompt. The image is shown to the user automatically.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Detailed visual description" },
        aspect_ratio: { type: "string", description: "1:1, 16:9, 9:16, 4:3 or 3:4" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_video",
    description:
      "Generate a short video for subscribers. The user sees a rendering card automatically. Do not poll.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Scene, motion and camera description" },
        aspect_ratio: { type: "string", description: "16:9, 9:16 or 1:1" },
        duration: { type: "number", description: "Seconds, 4-10" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "ask_user",
    description:
      "Ask the user a question with clickable options. After calling, end your turn and wait for the reply.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string" },
        options: { type: "array", items: { type: "string" } },
        allow_free_text: { type: "boolean" },
      },
      required: ["question", "options"],
    },
  },
  {
    name: "create_task",
    description: "Save a task or reminder to the user's task list.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        due_at: { type: "string", description: "ISO 8601 local date-time, optional" },
        kind: { type: "string", description: "task | alarm | goal" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_plan",
    description: "Publish or update the step plan for the current job. Status: pending | active | done.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: { title: { type: "string" }, status: { type: "string" } },
            required: ["title", "status"],
          },
        },
      },
      required: ["steps"],
    },
  },
  {
    name: "propose_agent",
    description: "Suggest a specialized agent configuration for a specific task. Read-only: does not create the agent.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Suggested name" },
        description: { type: "string", description: "Short description" },
        prompt: { type: "string", description: "System prompt / instructions" },
        color: { type: "string", enum: ["aurora", "ocean", "ember", "mint", "sun", "rose", "mono"] },
      },
      required: ["name", "description", "prompt"],
    },
  },
];

TOOLS.push({
  name: "share_file",
  description:
    "Deliver a finished file to the user as a download card. ALWAYS call this for every file you produced for the user (reports, documents, spreadsheets, code, PDFs, images) before you finish. Use content for text files or content_base64 for binary files.",
  inputSchema: {
    type: "object",
    properties: {
      filename: { type: "string", description: "File name with extension, e.g. report.pdf" },
      content: { type: "string", description: "Text content (for text files)" },
      content_base64: { type: "string", description: "Base64 content (for binary files)" },
      mime_type: { type: "string" },
    },
    required: ["filename"],
  } as any,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const result = (id: unknown, text: string, structured?: unknown) => ({
  jsonrpc: "2.0",
  id,
  result: {
    content: [{ type: "text", text }],
    ...(structured ? { structuredContent: structured } : {}),
  },
});

async function runTool(userId: string, origin: string, name: string, args: any, callId: string) {
  switch (name) {
    case "propose_agent": {
      const proposal = agentProposalSchema.parse(args);
      return { text: "The proposal and Create agent button are shown. Nothing has been created. Wait for explicit approval or changes.", payload: { type: "megsy.agent_proposal", proposal } };
    }
    case "generate_image": {
      const prompt = String(args?.prompt || "").slice(0, 5000);
      if (!prompt) return { text: "Missing prompt." };
      const tier = await userTier(userId);
      const model = pickModel("image", tier);
      const run = await startRun(
        model,
        model.build({ prompt, aspect: String(args?.aspect_ratio || "1:1") }),
        `img-${userId}-${callId}`,
      );
      const s = await waitRun(run.runId, origin, 55_000);
      const payload = {
        type: "megsy.media",
        kind: "image",
        runId: run.runId,
        token: runStatusToken(run.runId),
        status: s.status,
        urls: s.urls,
        model: model.label,
        prompt,
      };
      if (s.status === "COMPLETED") return { text: "Done — the image is now shown to the user. Do not paste links.", payload };
      if (s.status === "RUNNING") return { text: "The image is still rendering and will appear to the user on its own.", payload };
      return { text: `Image generation failed: ${s.error || "unknown error"}. Tell the user briefly.`, payload };
    }
    case "generate_video": {
      const prompt = String(args?.prompt || "").trim().slice(0, 5000);
      if (!prompt) return { text: "Missing prompt." };
      const model = pickModel("video", await userTier(userId));
      const run = await startRun(model, model.build({ prompt, aspect: String(args?.aspect_ratio || "16:9"), duration: Number(args?.duration) || 5 }), `vid-${userId}-${callId}`);
      return { text: "The video is rendering in the chat card. Do not wait or paste links.",
        payload: { type: "megsy.media", kind: "video", runId: run.runId, token: runStatusToken(run.runId), status: run.status, urls: [], model: model.label, prompt } };
    }
    case "share_file": {
      const name = String(args?.filename || "file.txt").replace(/[^\w.\- ]+/g, "_").slice(0, 120);
      const bytes = args?.content_base64
        ? Uint8Array.from(atob(String(args.content_base64)), (c) => c.charCodeAt(0))
        : new TextEncoder().encode(String(args?.content ?? ""));
      if (!bytes.length) return { text: "The file is empty; nothing was shared." };
      if (bytes.length > 25 * 1024 * 1024) return { text: "The file is larger than 25 MB; split it or compress it." };
      const mime = String(args?.mime_type || "application/octet-stream");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const path = `${userId}/${crypto.randomUUID()}/${name}`;
      const up = await supabaseAdmin.storage.from("agent-files").upload(path, bytes, { contentType: mime, upsert: false });
      if (up.error) return { text: `Could not save the file: ${up.error.message}` };
      const signed = await supabaseAdmin.storage.from("agent-files").createSignedUrl(path, 60 * 60 * 24 * 30, { download: name });
      if (signed.error || !signed.data) return { text: "Could not create a download link." };
      return {
        text: "The file is now shown to the user as a download card. Do not paste the link.",
        payload: { type: "megsy.file", name, url: signed.data.signedUrl, mime, size: bytes.length },
      };
    }
    case "ask_user":
      return { text: "The question is shown to the user. End your turn now and wait for the answer." };
    case "create_task":
      return { text: "Task added to the user's list." };
    case "update_plan":
      return { text: "Plan updated." };
    default:
      return { text: `Unknown tool ${name}` };
  }
}

export const Route = createFileRoute("/api/public/agent-tools/$token")({
  server: {
    handlers: {
      GET: async () => new Response("Method not allowed", { status: 405 }),
      POST: async ({ request, params }) => {
        const userId = readMcpToken(params.token);
        if (!userId) return json({ error: "unauthorized" }, 401);
        let msg: any;
        try {
          msg = await request.json();
        } catch {
          return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
        }
        const id = msg?.id;
        // Notifications get no body.
        if (id === undefined || id === null) return new Response(null, { status: 202 });
        switch (msg.method) {
          case "initialize":
            return json({
              jsonrpc: "2.0",
              id,
              result: {
                protocolVersion: msg.params?.protocolVersion || "2025-06-18",
                capabilities: { tools: {} },
                serverInfo: { name: "megsy", version: "1.0.0" },
              },
            });
          case "ping":
            return json({ jsonrpc: "2.0", id, result: {} });
          case "tools/list":
            return json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
          case "tools/call": {
            const name = String(msg.params?.name || "");
            try {
              const r = await runTool(userId, publicOrigin(request), name, msg.params?.arguments ?? {}, String(id));
              return json(result(id, r.payload ? `${r.text}\n<!--megsy:${JSON.stringify(r.payload)}-->` : r.text, r.payload));
            } catch (e: any) {
              return json({ jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: String(e?.message || e) }] } });
            }
          }
          default:
            return json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
        }
      },
    },
  },
});
