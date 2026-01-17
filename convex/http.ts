import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

/**
 * HTTP endpoint for creating a profile after authentication
 * This can be called from your frontend after a successful Better Auth signup
 * 
 * POST /api/auth/register
 * Body: { authUserId: string, username: string, displayName?: string, avatarUrl?: string }
 */
http.route({
  path: "/auth/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { authUserId, username, displayName, avatarUrl } = body;

      if (!authUserId || !username) {
        return new Response(
          JSON.stringify({ error: "authUserId and username are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const profile = await ctx.runMutation(api.profiles.createProfile, {
        authUserId,
        username,
        displayName,
        avatarUrl,
      });

      return new Response(JSON.stringify(profile), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Failed to create profile" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * Health check endpoint
 * GET /api/health
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

export default http;

