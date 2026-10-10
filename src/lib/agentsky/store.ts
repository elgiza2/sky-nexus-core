/** @doc Tiny shared store for the agent workspace: agents, plan tier, media models and recent sessions. */
import { useEffect, useSyncExternalStore } from "react";
import { agentApi, type AgentInfo, type MediaModelInfo, type SessionInfo } from "./client";

type State = {
  ready: boolean;
  error: string | null;
  agents: AgentInfo[];
  tier: "free" | "pro";
  models: MediaModelInfo[];
  sessions: SessionInfo[];
};

let state: State = { ready: false, error: null, agents: [], tier: "free", models: [], sessions: [] };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};

let loading: Promise<void> | null = null;
export function loadWorkspace(force = false) {
  if (loading && !force) return loading;
  loading = (async () => {
    try {
      const [b, s] = await Promise.all([agentApi.bootstrap(), agentApi.sessions()]);
      set({ ready: true, error: null, agents: b.agents, tier: b.tier, models: b.models, sessions: s.sessions });
    } catch (e: any) {
      set({ ready: true, error: e?.message || "Could not load" });
      loading = null;
    }
  })();
  return loading;
}

export async function refreshSessions() {
  try {
    const s = await agentApi.sessions();
    set({ sessions: s.sessions });
  } catch {
    /* keep last list */
  }
}

export const workspace = {
  upsertSession(s: SessionInfo) {
    set({ sessions: [s, ...state.sessions.filter((x) => x.id !== s.id)] });
  },
  removeSession(id: string) {
    set({ sessions: state.sessions.filter((x) => x.id !== id) });
  },
  addAgent(a: AgentInfo) {
    set({ agents: [...state.agents.filter((x) => x.id !== a.id), a] });
  },
  removeAgent(id: string) {
    set({ agents: state.agents.filter((x) => x.id !== id) });
  },
  agent(id?: string | null) {
    return state.agents.find((a) => a.id === id) ?? state.agents.find((a) => a.isDefault) ?? state.agents[0];
  },
};

export function useWorkspaceStore(): State {
  const s = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
    () => state,
  );
  useEffect(() => {
    void loadWorkspace();
  }, []);
  return s;
}
