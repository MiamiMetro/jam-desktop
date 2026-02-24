# jam-desktop

```bash
npm i
```

```bash
npm run dev
```

```bash
npx convex env set BETTER_AUTH_SECRET "<generate-a-32-byte-secret>"
npx convex env set SITE_URL "http://localhost:5173"
```

```bash
# Cloudflare R2 (public media bucket)
npx convex env set R2_ACCOUNT_ID "<your-cloudflare-account-id>"
npx convex env set R2_ACCESS_KEY_ID "<your-r2-access-key-id>"
npx convex env set R2_SECRET_ACCESS_KEY "<your-r2-secret-access-key>"
npx convex env set R2_BUCKET_PUBLIC "jam-media-public"
npx convex env set R2_PUBLIC_BASE_URL "https://media.yourdomain.com"
```

```env
# from `npx convex dev`
VITE_CONVEX_URL="https://your-deployment.convex.cloud"
VITE_CONVEX_SITE_URL="https://your-deployment.convex.site"
VITE_SITE_URL="http://localhost:5173"
```
