# SEO Meta Tags Worker (Cloudflare)

> **When:** After the app is feature-complete. ~1-2 hours to set up.

## How It Works

A Cloudflare Worker sits between users/bots and your hosted SPA:

- **Real users** → served the normal SPA, React handles everything client-side
- **Bots** (Google, Twitter, Discord, iMessage, etc.) → Worker fetches data from Convex, injects `<meta>` tags into the HTML response

**No changes to the React codebase.** The Worker is a separate small project.

---

## What You Need

### 1. Worker File (`worker.ts`)

```ts
// worker.ts — deployed to Cloudflare Workers
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";

    // Detect bots
    const isBot =
      /googlebot|twitterbot|facebookexternalhit|discordbot|slackbot|whatsapp|telegrambot/i.test(
        ua
      );

    if (!isBot) {
      // Real user → serve normal SPA
      return fetch(request);
    }

    // Bot → figure out what page they're requesting
    const postMatch = url.pathname.match(/^\/post\/(.+)$/);
    const profileMatch = url.pathname.match(/^\/profile\/(.+)$/);
    const communityMatch = url.pathname.match(/^\/community\/(.+)$/);

    let title = "Jam — Listen Together";
    let description = "Share music, join jam rooms, and vibe with friends.";
    let image = "https://jam.app/og-default.png";

    // Fetch from Convex for dynamic pages
    if (postMatch) {
      const postId = postMatch[1];
      const post = await fetchConvex("posts:getPublicMeta", { id: postId });
      if (post) {
        title = `${post.author} on Jam`;
        description = post.content?.slice(0, 160) || description;
        if (post.imageUrl) image = post.imageUrl;
      }
    }

    if (profileMatch) {
      const username = profileMatch[1];
      const user = await fetchConvex("users:getByUsername", { username });
      if (user) {
        title = `${user.displayName} (@${user.username}) — Jam`;
        description = user.bio || `Check out ${user.username}'s profile on Jam`;
        if (user.avatarUrl) image = user.avatarUrl;
      }
    }

    if (communityMatch) {
      const communityId = communityMatch[1];
      const community = await fetchConvex("communities:getPublicMeta", {
        id: communityId,
      });
      if (community) {
        title = `${community.name} — Jam Community`;
        description =
          community.description?.slice(0, 160) ||
          `Join ${community.name} on Jam`;
        if (community.imageUrl) image = community.imageUrl;
      }
    }

    // Fetch the real SPA HTML and inject meta tags
    const response = await fetch(request);
    let html = await response.text();

    const metaTags = `
      <meta property="og:title" content="${esc(title)}" />
      <meta property="og:description" content="${esc(description)}" />
      <meta property="og:image" content="${image}" />
      <meta property="og:url" content="${url.href}" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${esc(title)}" />
      <meta name="twitter:description" content="${esc(description)}" />
      <meta name="twitter:image" content="${image}" />
    `;

    html = html.replace("</head>", `${metaTags}</head>`);

    return new Response(html, {
      headers: { "content-type": "text/html;charset=UTF-8" },
    });
  },
};

// Helper: fetch from Convex HTTP API
async function fetchConvex(path: string, args: Record<string, string>) {
  try {
    const res = await fetch("https://YOUR_CONVEX_URL.convex.cloud/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, args }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Helper: escape HTML entities in meta content
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
```

### 2. Wrangler Config (`wrangler.toml`)

```toml
name = "jam-meta-worker"
main = "worker.ts"
compatibility_date = "2024-01-01"

[env.production]
routes = [{ pattern = "jam.app/*", zone_name = "jam.app" }]
```

### 3. Deploy

```bash
npx wrangler deploy
```

---

## Convex Backend (optional additions)

You may want to add lightweight public queries that return only meta info (no auth required):

- `posts:getPublicMeta` → returns `{ author, content, imageUrl }` for a post ID
- `users:getByUsername` → already exists, just make sure it's callable without auth
- `communities:getPublicMeta` → returns `{ name, description, imageUrl }`

These are simpler/faster than full queries since bots only need title + description + image.

---

## Optional: Body Content for Google Indexing

Google can execute JS but it's slow and unreliable. For better indexing, inject post content into the HTML body too:

```ts
// After the meta tags injection, also add visible content for Googlebot
if (isBot && postMatch && post) {
  const bodyContent = `
    <noscript>
      <article>
        <h1>${esc(post.author)} on Jam</h1>
        <p>${esc(post.content || "")}</p>
      </article>
    </noscript>
  `;
  html = html.replace("<body>", `<body>${bodyContent}`);
}
```

This way Google sees the actual text content even without running JavaScript.

---

## What This Gets You

| Platform | Result |
|----------|--------|
| Discord / Slack | Rich embed with title, description, image |
| Twitter / X | Summary card with large image |
| iMessage | Link preview with image and title |
| Google | Indexed pages with proper titles and descriptions |
| WhatsApp / Telegram | Link preview cards |

---

## File Structure

This is a **separate project**, not part of the React app:

```
jam-worker/
  worker.ts
  wrangler.toml
  package.json
```

Or you can put it in a `/worker` folder in this repo — doesn't matter as long as it deploys separately.
