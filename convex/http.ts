import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

/**
 * HTTP endpoint for creating a profile after Supabase registration
 * This can be called from your frontend after a successful Supabase signup
 * 
 * POST /api/auth/register
 * Body: { supabaseId: string, username: string, displayName?: string, avatarUrl?: string }
 */
http.route({
  path: "/auth/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { supabaseId, username, displayName, avatarUrl } = body;

      if (!supabaseId || !username) {
        return new Response(
          JSON.stringify({ error: "supabaseId and username are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const profile = await ctx.runMutation(api.profiles.createProfile, {
        supabaseId,
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

