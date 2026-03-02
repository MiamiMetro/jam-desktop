import { Presence } from "@convex-dev/presence";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { requireAuth } from "./helpers";
import { checkRateLimit } from "./rateLimiter";

export const GLOBAL_PRESENCE_ROOM_ID = "global:online";
export const DEFAULT_PRESENCE_HEARTBEAT_INTERVAL_MS = 20_000;

export const presenceStatusValidator = v.union(
  v.literal("online"),
  v.literal("away"),
  v.literal("busy")
);

const MIN_HEARTBEAT_INTERVAL_MS = 5_000;
const MAX_HEARTBEAT_INTERVAL_MS = 120_000;

const presence = new Presence(components.presence);

function clampHeartbeatInterval(interval: number | undefined) {
  if (interval === undefined) {
    return DEFAULT_PRESENCE_HEARTBEAT_INTERVAL_MS;
  }
  return Math.max(
    MIN_HEARTBEAT_INTERVAL_MS,
    Math.min(MAX_HEARTBEAT_INTERVAL_MS, Math.floor(interval))
  );
}

export const heartbeat = mutation({
  args: {
    sessionId: v.string(),
    interval: v.optional(v.number()),
    status: v.optional(presenceStatusValidator),
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    const interval = clampHeartbeatInterval(args.interval);
    const result = await presence.heartbeat(
      ctx,
      GLOBAL_PRESENCE_ROOM_ID,
      String(profile._id),
      args.sessionId,
      interval
    );
    await presence.updateRoomUser(
      ctx,
      GLOBAL_PRESENCE_ROOM_ID,
      String(profile._id),
      {
        status: args.status ?? "online",
      }
    );
    return result;
  },
});

export const disconnect = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    return await presence.disconnect(ctx, args.sessionToken);
  },
});

export const setMyStatus = mutation({
  args: {
    status: presenceStatusValidator,
  },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "presenceStatus", String(profile._id));
    await presence.updateRoomUser(
      ctx,
      GLOBAL_PRESENCE_ROOM_ID,
      String(profile._id),
      {
        status: args.status,
      }
    );
    return { status: args.status };
  },
});

