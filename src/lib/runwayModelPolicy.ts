export interface RunwayVideoRequestOptions {
  durationSeconds: number;
  quality?: "standard" | "hd" | "ultra";
  audio?: boolean;
}

export interface RunwayVideoPolicy {
  maxDuration: number;
  resolution?: "720p" | "2K";
  audio?: boolean;
}

const POLICIES: Record<string, RunwayVideoPolicy> = {
  "gen4.5": { maxDuration: 10 },
  "veo3.1": { maxDuration: 8, audio: false },
  seedance2_5: { maxDuration: 5, resolution: "720p" },
  seedance2_mini: { maxDuration: 10 },
  h3_max: { maxDuration: 15, resolution: "2K" },
  gemini_omni_flash: { maxDuration: 10, resolution: "720p" },
};

const normalize = (value: string) => value.toLowerCase().replace(/^runway[-_]/, "").replace(/[-\s]/g, "_");

// WaveSpeedAI limits (enforced again in the media-video edge function).
const WAVESPEED_POLICIES: Record<string, RunwayVideoPolicy> = {
  "wavespeed-minimax-h3": { maxDuration: 10 },
  "wavespeed-seedance-2.0-mini": { maxDuration: 5, resolution: "720p" },
  "wavespeed-openvideo": { maxDuration: 10, resolution: "720p" },
  "wavespeed-seedance-1.5-pro": { maxDuration: 5, resolution: "720p" },
  "wavespeed-hailuo-2.3": { maxDuration: 6 },
  "wavespeed-grok-imagine-1.5": { maxDuration: 10 },
};

export function getRunwayVideoPolicy(slug: string): RunwayVideoPolicy | null {
  if (WAVESPEED_POLICIES[slug]) return WAVESPEED_POLICIES[slug];
  const key = normalize(slug);
  const exact = POLICIES[key];
  if (exact) return exact;
  if (key.includes("gen4") && key.includes("4.5")) return POLICIES["gen4.5"];
  if (key.includes("veo") && key.includes("3.1")) return POLICIES["veo3.1"];
  if (key.includes("seedance") && key.includes("2.5")) return POLICIES.seedance2_5;
  if (key.includes("seedance") && key.includes("2.0") && key.includes("mini")) return POLICIES.seedance2_mini;
  if (key.includes("h3")) return POLICIES.h3_max;
  if (key.includes("gemini") && key.includes("omni")) return POLICIES.gemini_omni_flash;
  return null;
}

export function validateRunwayVideoRequest(
  slug: string,
  options: RunwayVideoRequestOptions,
): { ok: true; duration: number; resolution?: string; audio: boolean } | { ok: false; message: string } {
  const policy = getRunwayVideoPolicy(slug);
  const duration = Math.max(1, Math.round(options.durationSeconds || 1));
  if (!policy) return { ok: true, duration, audio: options.audio !== false };
  if (duration > policy.maxDuration) {
    return { ok: false, message: `${slug} supports up to ${policy.maxDuration} seconds.` };
  }
  if (policy.resolution && options.quality && policy.resolution === "2K" && options.quality !== "ultra") {
    return { ok: false, message: `${slug} requires 2K / Ultra quality.` };
  }
  if (policy.resolution === "720p" && options.quality === "ultra") {
    return { ok: false, message: `${slug} is limited to 720p quality.` };
  }
  return { ok: true, duration, resolution: policy.resolution, audio: policy.audio ?? options.audio !== false };
}

export const RUNWAY_IMAGE_MODEL_SLUGS = [
  "gpt_image_2_5_flare",
  "gpt_image_2_5_sunburst",
  "seedream5_pro",
  "gpt_image_2",
  "grok_imagine_image_2",
  "muse_image",
  "gemini_image3.1_flash",
  "gen4_image_turbo",
] as const;

export const RUNWAY_VIDEO_MODEL_SLUGS = Object.keys(POLICIES);
