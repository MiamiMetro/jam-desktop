// Auth configuration using Convex environment variables
// Set these via: npx convex env set SUPABASE_JWT_ISSUER "https://your-project.supabase.co/auth/v1"
//                npx convex env set SUPABASE_JWKS_URL "https://your-project.supabase.co/auth/v1/.well-known/jwks.json"
export default {
  providers: [
    {
      type: "customJwt",
      // Must match the 'aud' claim in Supabase JWT
      applicationID: "authenticated",
      // Must match the 'iss' claim in Supabase JWT (from environment)
      issuer: process.env.SUPABASE_JWT_ISSUER,
      // JWKS endpoint for verifying JWT signatures (from environment)
      jwks: process.env.SUPABASE_JWKS_URL,
      // Supabase uses ES256 (Elliptic Curve)
      algorithm: "ES256",
    },
  ],
};

