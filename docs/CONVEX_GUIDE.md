# Convex Guide (Single Source of Truth)

Last updated: 2026-02-22

This is the only Convex documentation file for this repo.
It defines strict rules, approved patterns, banned patterns, and the current Convex-first architecture.

## 1. Goals

1. Keep Convex as the source of truth for app data.
2. Use native Convex functions and native Convex pagination by default.
3. Keep realtime correctness predictable.
4. Keep function-call and query-scan cost efficient.
5. Prevent pagination bugs (duplicates, skips, stale cursor behavior).

## 2. Non-Negotiable Rules

1. Convex-backed UI data uses Convex hooks first: `useQuery`, `usePaginatedQuery`, `useMutation`.
2. Native pagination is the default:
   backend: `paginationOpts: paginationOptsValidator` + `.paginate(...)`
   frontend: `usePaginatedQuery(...)`
3. Cursor/order must use the same ordering dimension.
4. Hot query paths must be index-backed.
5. Mutations must enforce auth, validation/sanitization, and rate limit where applicable.
6. No render-phase `setState`.
7. Virtualization is render optimization only, not a data fetching strategy.

## 3. Current Approved Convex Architecture

### 3.1 Native paginated endpoints (preferred)

1. `posts.getFeedPaginated`
2. `posts.getByUsernamePaginated`
3. `comments.getByPostPaginated`
4. `comments.getRepliesPaginated`
5. `friends.listPaginated`
6. `friends.getRequestsPaginated`
7. `friends.getSentRequestsWithDataPaginated`
8. `users.searchPaginated`
9. `users.getOnline` (paginated in frontend via `usePaginatedQuery`)
10. `blocks.listPaginated`
11. `messages.getConversationsPaginated`

### 3.2 Allowed targeted exception

1. `messages.getByConversationPaginated` uses manual reverse cursor (`_creationTime`) for "load older messages" UX.
2. This exception is allowed because it models reverse chat-history loading and still uses indexed range queries.

### 3.3 Important backend constraints already adopted

1. Conversation ordering uses denormalized `conversation_participants.lastActivityAt`.
2. Conversations use index `conversation_participants.by_profile_and_last_activity`.
3. Friendship acceptance/auto-accept keeps symmetric accepted records.
4. Rate limiter coverage includes write-heavy paths (posts/comments/messages/likes/friends/profile/block/delete).
5. Conversation list preview is denormalized on `conversations`:
   `lastMessageId`, `lastMessageSenderId`, `lastMessageText`, `lastMessageAudioUrl`, `lastMessageCreatedAt`.
6. DM creation/open path uses `messages.ensureDmWithUser` only when no conversation exists yet.

### 3.4 Frontend hook to endpoint map (current)

1. Users:
   `useOnlineUsers` -> `users.getOnline` (paginated hook usage)
   `useAllUsers` -> `users.searchPaginated`
2. Friends:
   `useFriends` -> `friends.listPaginated`
   `useFriendRequests` -> `friends.getRequestsPaginated`
   `useSentFriendRequests` -> `friends.getSentRequestsWithDataPaginated`
3. Posts/Comments:
   `usePosts` / `useGlobalPosts` -> `posts.getFeedPaginated`
   `useUserPosts` -> `posts.getByUsernamePaginated`
   `useComments` -> `comments.getByPostPaginated`
4. Messages:
   `useConversations` -> `messages.getConversationsPaginated`
   `useMessages` -> `messages.getByConversationPaginated` (reactive first page + reverse cursor older pages)
   `useConversationParticipants` -> `messages.getParticipants`
   `useEnsureDmConversation` -> `messages.ensureDmWithUser`
5. Mutations use native `useMutation` hooks across friends/messages/posts/comments/profile flows.

### 3.5 Not yet Convex-backed (known)

1. Jam/room flows are still mock-data based.
2. `useCommunityPosts` is still a placeholder and not yet backed by Convex data.

## 4. Backend Standards

1. Use `requireAuth(ctx)` for authenticated mutation paths.
2. Validate and sanitize input via shared helpers before writes.
3. Use indexed lookups or index range scans in hot paths.
4. Prefer denormalized counters/timestamps for O(1) list metadata.
5. Keep relationship mutations idempotent and symmetric where required.
6. For destructive cleanup, use cursor-safe batching and avoid re-reading first pages.

## 5. Frontend Standards

1. `useQuery` for reactive single resource reads.
2. `usePaginatedQuery` for list feeds and infinite scroll.
3. `useMutation` for writes and real pending states.
4. TanStack Query is not the primary cache/fetch layer for Convex-backed data.
5. TanStack Virtual is allowed for rendering large lists only.
6. Do not hardcode loading flags like `isPending: false`.

## 5.1 Realtime Categorization Policy (Cost-First)

This is the default policy for deciding what should be realtime vs snapshot.

1. Tier A: Must be realtime (user-critical immediacy)
   `profiles.getMe`
   `messages.getByConversationPaginated` newest page
   `messages.getConversationsPaginated`
   `friends.getRequestsPaginated`
2. Tier B: Realtime only while active screen is open
   `posts.getById`
   `comments.getByPostPaginated`
   `users.getOnline`
3. Tier C: Snapshot by default (manual refresh or revisit)
   `posts.getFeedPaginated`
   `posts.getByUsernamePaginated`
   `users.searchPaginated`
   `friends.listPaginated`
   `friends.getSentRequestsWithDataPaginated`

DM policy (non-negotiable):
1. Keep newest page reactive.
2. Load older pages one-shot.
3. Do not convert DM history loading to full-list always-live subscriptions.
4. DM runtime is conversationId-first only (no partnerId-based message loading path).

Conversation preview invariant (non-negotiable):
1. `conversations.lastMessage*` fields are derived state and must match the latest visible message state.
2. Any mutation that can change "latest visible message" must patch conversation preview in the same mutation.
3. Minimum checklist for preview sync:
   send message
   delete latest message
   edit latest message
   moderation remove/hide latest message
   merge/archive/restore conversation states that change visible latest message
   system message insertion/replacement
4. No PR touching message lifecycle may merge without a preview-sync verification note.
5. `messages.ensureDmWithUser` may add one extra mutation only for first-time DM creation; existing conversations should send with one mutation (`messages.send`).

Page-level defaults:
1. Feed page: snapshot.
2. Profile posts page: snapshot.
3. Search pages: snapshot.
4. Friends list: snapshot.
5. Incoming requests: realtime.
6. DM inbox list: realtime only while inbox is visible.
7. DM thread: newest reactive + older one-shot.

Future implementation rule:
1. New endpoints start as Tier C unless there is a clear realtime requirement.
2. To promote Tier C to Tier B or Tier A, PR must state:
   user-facing reason
   expected rerun/call impact
   rollback/downgrade plan

## 6. Banned Anti-Patterns

1. `useInfiniteQuery` + `convex.query(...)` for normal Convex list pagination.
2. Manual `limit/cursor` endpoints when native Convex pagination can express the same flow.
3. Sorting by one field and cursoring by another.
4. Broad fallback scans in hot paths.
5. Declaring a rate-limit bucket but not enforcing it in related mutation handlers.
6. Render-time `setState` in components/hooks.
7. Message lifecycle mutations that update `messages` but do not keep `conversations.lastMessage*` synchronized.

## 7. PR Gate Checklist (Must Pass)

1. Architecture:
   Convex-backed data uses Convex hooks directly.
   No new TanStack-first wrapper over Convex data unless ADR exception.
2. Query design:
   Cursor/order dimensions are consistent.
   Query path is index-backed.
   Native `.paginate()` is used unless approved exception.
3. Mutation design:
   Auth check present.
   Validation/sanitization present.
   Rate-limit check present for applicable write category.
   If message lifecycle is touched, `conversations.lastMessage*` sync logic is explicitly covered.
4. Frontend behavior:
   Loading/pending reflects real runtime state.
   No render-phase `setState`.
   Virtualization does not alter data semantics.
5. Verification:
   No duplicate/skip across page boundaries.
   Invalid cursor, deleted row, and auth-failure behavior checked.
   `npm run convex:pull`, targeted lint, and build pass.

## 8. Implementation Templates

### 8.1 Native paginated query (backend)

```ts
export const listSomethingPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("table_name")
      .withIndex("by_some_index", (q) => q.eq("field", "value"))
      .order("desc")
      .paginate(args.paginationOpts);
    return result;
  },
});
```

### 8.2 Native paginated hook (frontend)

```ts
const paginated = usePaginatedQuery(api.some.listSomethingPaginated, {}, { initialNumItems: 20 });
const items = paginated.results;
const isLoading = paginated.status === "LoadingFirstPage";
const hasNextPage = paginated.status === "CanLoadMore";
const isFetchingNextPage = paginated.status === "LoadingMore";
const fetchNextPage = () => paginated.loadMore(20);
```

### 8.3 Mutation with auth + rate limit + validation

```ts
export const doWrite = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const profile = await requireAuth(ctx);
    await checkRateLimit(ctx, "someBucket", profile._id);
    const text = sanitizeText(args.text);
    validateTextLength(text, MAX_LENGTHS.SOME_FIELD, "Field");
    // write...
  },
});
```

## 9. Scoring Rubric (Target 8.5+)

1. 10/10:
   All list paths are native paginated.
   Index coverage is explicit for hot paths.
   Rate limits are enforced consistently.
   No known pagination drift edge cases.
   No Convex-related lint/type issues.
2. 8.5-9.5:
   Core paths are Convex-native and stable.
   Small legacy/manual exceptions are documented and justified.
3. Below 8.5:
   Mixed data-fetch architecture, unsafe cursor semantics, or missing mutation safeguards.

## 10. Future Additions Workflow

1. Design data contract from Convex endpoint outward (not from frontend cache pattern).
2. Add/confirm index support first.
3. Implement backend query/mutation using rules above.
4. Consume from frontend with Convex hooks.
5. Validate pagination boundary behavior and realtime rerun behavior.
6. Run Convex codegen + targeted lint + build.
7. If deviating from rules, document short ADR in PR description.
