import { ConvexReactClient } from "convex/react";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error("Missing VITE_CONVEX_URL environment variable");
}

export const convex = new ConvexReactClient(CONVEX_URL);

