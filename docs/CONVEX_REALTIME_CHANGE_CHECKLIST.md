# Convex Realtime Change Checklist (Execution Plan)

Last updated: 2026-02-22

Purpose: reduce Convex function calls while keeping only necessary realtime behavior.
Scope: frontend data-read connections only. Mutations are out of scope.

## 1) Target Policy

1. Tier A (`must be realtime`):
   `profiles.getMe`, `messages.getWithUser` newest page, `friends.getRequestsPaginated`
2. Tier B (`realtime only while active screen is open`):
   `messages.getConversationsPaginated`, `posts.getById`, `comments.getByPostPaginated`, `users.getOnline`
3. Tier C (`snapshot by default`):
   `posts.getFeedPaginated`, `posts.getByUsernamePaginated`, `users.searchPaginated`, `friends.listPaginated`, `friends.getSentRequestsWithDataPaginated`

## 2) Endpoint-by-Endpoint Checklist

Use this table as the strict migration checklist.

| Endpoint | Current Mode | Target Mode | Checklist | Done |
|---|---|---|---|---|
| `profiles.getMe` | Live `useQuery` | Keep live | Keep as-is; ensure used only for auth/profile readiness state | [ ] |
| `messages.getWithUser` newest page | Live `useQuery` | Keep live | Keep first page reactive in active DM thread only | [ ] |
| `messages.getWithUser` older pages | One-shot `convex.query` | Keep one-shot | Keep reverse-cursor one-shot loading; do not convert to full live list | [ ] |
| `friends.getRequestsPaginated` | Live `usePaginatedQuery` | Keep live | Keep realtime for incoming request badge/panel | [ ] |
| `messages.getConversationsPaginated` | Live `usePaginatedQuery` | Tier B | Subscribe only when Friends/DM inbox is visible; skip/unmount otherwise | [ ] |
| `posts.getById` | Live `useQuery` | Tier B | Keep live only while post detail/modal is open | [ ] |
| `comments.getByPostPaginated` | Live `usePaginatedQuery` | Tier B | Keep live only while comments panel/modal is open | [ ] |
| `users.getOnline` | Live `usePaginatedQuery` | Tier B | Subscribe only where online dots are visible and needed | [ ] |
| `posts.getFeedPaginated` | Live `usePaginatedQuery` | Tier C | Convert to snapshot load; add manual refresh or "new posts" pull control | [ ] |
| `posts.getByUsernamePaginated` | Live `usePaginatedQuery` | Tier C | Convert profile posts to snapshot load on page open + manual refresh | [ ] |
| `users.searchPaginated` | Live `usePaginatedQuery` | Tier C | Convert to debounced one-shot search pagination | [ ] |
| `friends.listPaginated` | Live `usePaginatedQuery` | Tier C | Convert to snapshot friends list load + optional manual refresh | [ ] |
| `friends.getSentRequestsWithDataPaginated` | Live `usePaginatedQuery` | Tier C | Convert to snapshot sent requests load | [ ] |

## 3) Screen-Level Execution Order

1. Friends/DM screen:
   Gate `messages.getConversationsPaginated` and `users.getOnline` by view visibility.
2. Feed screen:
   Convert `posts.getFeedPaginated` to snapshot.
3. Profile posts:
   Convert `posts.getByUsernamePaginated` to snapshot.
4. User search:
   Convert `users.searchPaginated` to snapshot one-shot pagination.
5. Friends list/sent requests:
   Convert `friends.listPaginated` and `friends.getSentRequestsWithDataPaginated` to snapshot.
6. Keep DM thread model unchanged:
   newest live + older one-shot.

## 4) Implementation Rules (When You Start Coding)

1. Default new reads to Tier C (snapshot) unless realtime is explicitly justified.
2. For Tier B queries, subscription must be gated by route/tab visibility.
3. Unmount inactive panels to ensure subscriptions close.
4. Keep `initialNumItems` small on endpoints that remain live.
5. Keep optimistic UI on mutations so snapshot views still feel fast.

## 5) Verification Checklist

1. Function-call reduction:
   compare Convex dashboard call counts before/after per endpoint.
2. UX checks:
   unread badges, DM delivery/read behavior, friend request badges still realtime.
3. Correctness checks:
   no pagination skips/duplicates after snapshot conversion.
4. Build/quality checks:
   `npm run convex:pull`, targeted lint, `npm run build`.

## 6) Guardrails for Future Features

1. Any move from Tier C to Tier B/A must include:
   user-visible reason, expected call impact, rollback plan.
2. Any move from Tier B/A to Tier C must include:
   replacement UX (refresh button, "new data" banner, or refetch trigger).
3. DM thread exception remains approved:
   do not replace reverse-cursor older-page loading with full live history subscription.
