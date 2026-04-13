# Post View Count Implementation

## Architecture

- Feed is **not reactive** — no `useQuery` subscriptions on feed posts
- Posts are fetched via one-shot `convex.query()` calls
- View count is returned as a field alongside post data in the same query response (no extra call)
- View increments are batched into a **single mutation** per feed load

## Cost Per Feed Load

| Action | Function calls |
|---|---|
| Fetch posts (e.g. 7 posts) | 1 query |
| Increment views for all 7 | 1 mutation (batched) |
| **Total** | **2** |

## Why This Is Cheap

- No subscriptions on the feed = no fan-out. When you increment view counts, zero other users get re-evaluated.
- The only scenario where a view increment triggers a re-run is if someone happens to be on a page with an active subscription reading from the `posts` table (e.g. a profile page with `posts.getByUsernamePaginated`). That's 1 re-run for that one user, not a fan-out to all feed viewers.

## Backend

### Mutation: `posts.batchIncrementViews`

```ts
// convex/posts.ts
export const batchIncrementViews = mutation({
  args: { postIds: v.array(v.id("posts")) },
  handler: async (ctx, { postIds }) => {
    await Promise.all(
      postIds.map(async (id) => {
        const post = await ctx.db.get(id);
        if (post) {
          await ctx.db.patch(id, { view_count: (post.view_count ?? 0) + 1 });
        }
      })
    );
  },
});
```

### Schema addition

```ts
// In posts table definition
view_count: v.optional(v.number()),
```

### Query: return `view_count` in existing post queries

No new query needed — just include `view_count` in the fields returned by whatever query fetches feed posts. It's already being read from the `posts` table.

## Frontend

### Hook: fire-and-forget on feed load

```ts
const batchIncrement = useMutation(api.posts.batchIncrementViews);

// After posts are fetched and rendered
useEffect(() => {
  if (posts.length > 0) {
    const ids = posts.map((p) => p.id);
    batchIncrement({ postIds: ids });
  }
}, [posts]);
```

No need to await or handle the result. The view count displayed to the current user comes from the query that already fetched the posts — the increment is for future viewers.

## Scaling Math

| Users loading feed/hour | Posts per load | Function calls/hour |
|---|---|---|
| 100 | 7 | 200 (100 queries + 100 mutations) |
| 1,000 | 7 | 2,000 |
| 10,000 | 7 | 20,000 |

At 1M free calls/month: **10,000 feed loads/hour sustained for ~50 hours/month** before hitting the limit — and that's just the view count feature in isolation.

## Optional: Separate `post_views` Table

If you later add subscriptions back to queries that read from `posts` (e.g. for live like counts), writing views directly to the `posts` table would cause re-runs. In that case, move to a separate table:

- `post_views` table: `{ postId, view_count }`
- Increment mutation writes to `post_views` only
- Feed query joins `post_views` to get the count

This isolates view writes from triggering re-evaluations on post subscriptions. Not needed now since the feed isn't reactive, but worth keeping in mind.
