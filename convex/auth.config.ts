export default {
  providers: [
    {
      type: "customJwt",
      // Must match the 'aud' claim in Supabase JWT
      applicationID: "authenticated",
      // Must match the 'iss' claim in Supabase JWT
      issuer: "https://djzvdyqnbwpcwlbblrvy.supabase.co/auth/v1",
      // JWKS endpoint for verifying JWT signatures
      jwks: "https://djzvdyqnbwpcwlbblrvy.supabase.co/auth/v1/.well-known/jwks.json",
      // Supabase uses ES256 (Elliptic Curve)
      algorithm: "ES256",
    },
  ],
};

