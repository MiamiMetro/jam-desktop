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
 * Body: { username: string, displayName?: string, avatarUrl?: string }
 */
http.route({
  path: "/auth/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const userId = await ctx.auth.getUserIdentity();
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const body = await request.json();
      const { username, displayName, avatarUrl } = body;

      if (!username) {
        return new Response(
          JSON.stringify({ error: "Username is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const profile = await ctx.runMutation(api.profiles.createProfile, {
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

