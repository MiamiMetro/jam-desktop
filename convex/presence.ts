import { Presence } from "@convex-dev/presence";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
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
const DEFAULT_LIST_LIMIT = 512;

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

function clampListLimit(limit: number | undefined) {
  if (limit === undefined) {
    return DEFAULT_LIST_LIMIT;
  }
  return Math.max(1, Math.min(10_000, Math.floor(limit)));
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

export const listOnlineUserIds = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampListLimit(args.limit);
    const users = await presence.listRoom(ctx, GLOBAL_PRESENCE_ROOM_ID, true, limit);
    return users.map(({ userId }) => userId as Id<"profiles">);
  },
});

export const listOnlineByUserIds = query({
  args: {
    userIds: v.array(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    if (args.userIds.length === 0) {
      return [] as Id<"profiles">[];
    }

    const uniqueUserIds = new Map<string, Id<"profiles">>();
    for (const userId of args.userIds) {
      uniqueUserIds.set(String(userId), userId);
    }

    const onlineUserIds: Id<"profiles">[] = [];
    for (const [userIdString, userId] of uniqueUserIds.entries()) {
      const rooms = await presence.listUser(ctx, userIdString, true, 1);
      if (rooms.some((room) => room.roomId === GLOBAL_PRESENCE_ROOM_ID && room.online)) {
        onlineUserIds.push(userId);
      }
    }

    return onlineUserIds;
  },
});
