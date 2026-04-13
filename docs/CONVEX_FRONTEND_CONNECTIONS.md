# Convex Frontend Connections Inventory

Last updated: 2026-02-22

This file lists all Convex connections used by the frontend and their runtime type.

## Connection Types

1. `Live Subscription`:
   Uses `useQuery(...)`. Reactively reruns when relevant Convex data changes.
2. `Live Paginated Subscription`:
   Uses `usePaginatedQuery(...)`. Loaded pages are reactive; `loadMore(...)` extends pages.
3. `One-Shot Query`:
   Uses `useConvex().query(...)`. Fetches once (no live subscription).
4. `Mutation`:
   Uses `useMutation(...)`. Write operation; not a subscription.
5. `Transport/Auth Wiring`:
   App-level Convex client/provider/auth-state integration.

## A) Live Subscriptions (`useQuery`)

1. `api.profiles.getMe`
   - Type: `Live Subscription`
   - Used in: `src/ui/hooks/useEnsureProfile.ts:35`
   - Purpose: keep current profile existence/data in sync after auth.
2. `api.posts.getById`
   - Type: `Live Subscription`
   - Used in: `src/ui/hooks/usePosts.ts:162`
   - Purpose: reactive single post view.
3. `api.profiles.getByUsername`
   - Type: `Live Subscription`
   - Used in: `src/ui/hooks/useUsers.ts:130`
   - Purpose: reactive profile lookup by username.
4. `api.messages.getWithUser` (first page)
   - Type: `Live Subscription`
   - Used in: `src/ui/hooks/useUsers.ts:218`
   - Purpose: newest DM page stays live (new messages/read indicators).

## B) Live Paginated Subscriptions (`usePaginatedQuery`)

1. `api.posts.getFeedPaginated`
   - Type: `Live Paginated Subscription`
   - Used in: `src/ui/hooks/usePosts.ts:119` (`usePosts`)
   - Used in: `src/ui/hooks/usePosts.ts:146` (`useGlobalPosts`)
2. `api.comments.getByPostPaginated`
   - Type: `Live Paginated Subscription`
   - Used in: `src/ui/hooks/usePosts.ts:173` (`useComments`)
3. `api.posts.getByUsernamePaginated`
   - Type: `Live Paginated Subscription`
   - Used in: `src/ui/hooks/usePosts.ts:319` (`useUserPosts`)
4. `api.friends.listPaginated`
   - Type: `Live Paginated Subscription`
   - Used in: `src/ui/hooks/useFriends.ts:49` (`useFriends`)
5. `api.friends.getRequestsPaginated`
   - Type: `Live Paginated Subscription`
   - Used in: `src/ui/hooks/useFriends.ts:80` (`useFriendRequests`)
6. `api.friends.getSentRequestsWithDataPaginated`
   - Type: `Live Paginated Subscription`
   - Used in: `src/ui/hooks/useFriends.ts:224` (`useSentFriendRequests`)
7. `api.users.getOnline`
   - Type: `Live Paginated Subscription`
   - Used in: `src/ui/hooks/useUsers.ts:118` (`useOnlineUsers`)
8. `api.users.searchPaginated`
   - Type: `Live Paginated Subscription`
   - Used in: `src/ui/hooks/useUsers.ts:139` (`useAllUsers`)
9. `api.messages.getConversationsPaginated`
   - Type: `Live Paginated Subscription`
   - Used in: `src/ui/hooks/useUsers.ts:161` (`useConversations`)

## C) One-Shot Queries (`useConvex().query`)

1. `api.messages.getWithUser` (older pages)
   - Type: `One-Shot Query`
   - Used in: `src/ui/hooks/useUsers.ts:241`
   - Purpose: fetch older DM pages on demand ("load more older"), intentionally non-reactive.
   - Note: this is the approved DM exception pattern (live newest page + one-shot older pages).

## D) Mutations (`useMutation`)

1. Profiles:
   - `api.profiles.createProfile`
   - Used in: `src/ui/components/auth/UsernameSetupModal.tsx:25`
2. Friends:
   - `api.friends.sendRequest` at `src/ui/hooks/useFriends.ts:99`
   - `api.friends.acceptRequest` at `src/ui/hooks/useFriends.ts:123`
   - `api.friends.remove` at `src/ui/hooks/useFriends.ts:147`, `src/ui/hooks/useFriends.ts:171`, `src/ui/hooks/useFriends.ts:195`
3. Posts/Comments:
   - `api.comments.create` at `src/ui/hooks/usePosts.ts:190`
   - `api.posts.create` at `src/ui/hooks/usePosts.ts:220`
   - `api.posts.remove` at `src/ui/hooks/usePosts.ts:245`
   - `api.posts.toggleLike` at `src/ui/hooks/usePosts.ts:269`
   - `api.comments.toggleLike` at `src/ui/hooks/usePosts.ts:294`
4. Messages:
   - `api.messages.send` at `src/ui/hooks/useUsers.ts:303`
   - `api.messages.markAsRead` at `src/ui/hooks/useUsers.ts:340`

## E) Transport/Auth Wiring

1. Convex client creation:
   - `new ConvexReactClient(...)` at `src/ui/main.tsx:14`
2. App provider:
   - `<ConvexBetterAuthProvider ...>` at `src/ui/main.tsx:61`
3. Auth state sync hook:
   - `useConvexAuth()` call at `src/ui/main.tsx:27`
   - Hook implementation in `src/ui/hooks/useConvexAuth.ts:21`

## F) Type Inference Links (for endpoint contracts)

1. `api.profiles.getMe` -> `User` base inference:
   - `src/ui/lib/api/types.ts:9`
2. `api.posts.getById` / `api.posts.getFeedPaginated`:
   - `src/ui/lib/api/types.ts:13`, `src/ui/lib/api/types.ts:17`
3. `api.comments.getByPostPaginated`:
   - `src/ui/lib/api/types.ts:21`
4. `api.messages.getWithUser` / `api.messages.getConversationsPaginated`:
   - `src/ui/lib/api/types.ts:25`, `src/ui/lib/api/types.ts:29`

## G) Quick Summary

1. Live subscriptions (`useQuery`): 4
2. Live paginated subscriptions (`usePaginatedQuery`): 9
3. One-shot Convex queries (`useConvex().query`): 1
4. Mutations (`useMutation`): 13 call sites
5. Transport/auth Convex wiring: active in `main.tsx`
