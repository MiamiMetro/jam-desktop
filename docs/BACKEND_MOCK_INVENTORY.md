# Backend Mock Inventory

Full audit of frontend mocks and unused backend features.

---

## Status Overview

| Feature | Status | Notes |
|---------|--------|-------|
| Auth | **Real** | Better Auth + Convex token flow |
| Profiles/Settings | **Real** | Edit profile fields, username change, soft delete |
| Account Lifecycle | **Real** | `accountState`, `stateChangedAt`, transition validation |
| Media Uploads (avatar/banner/audio) | **Real** | Authenticated upload proxy via `POST /media/upload` |
| Friends | **Real** | Requests, accept/decline, friend list |
| DMs | **Real** | Conversations, messages, read state, privacy checks |
| Posts/Comments | **Real** | Text/audio create, likes, pagination, threaded replies, soft delete, likers list |
| Presence/Online | **Real** | Convex Presence heartbeat/session tracking |
| Communities | **Mocked** | Entire system is local hardcoded data |
| Jams/Rooms | **Mocked** | In-memory Map + mock rooms, no backend |
| Jam Room Chat | **Mocked** | Local `useState`, no backend sync |
| Blocking | **Real** | Block/unblock on profiles + PostCard; Blocked Users list in Settings |
| Comment Threads | **Real** | Instagram-style replies with @mention prefill, "View N replies" expander |
| DM Message Delete | **Real** | Hover trash on own messages, calls `messages.remove` |
| Email/Password Change | **Stub** | Disabled in settings with placeholder text |
| DM Privacy Toggle | **Real** | Dropdown in Settings, calls `profiles.updateMe({ dm_privacy })` |

---

## Section A — Frontend Mocks (data that should come from backend)

### A1. Communities — Fully Mocked

**Files:** `src/ui/hooks/useCommunities.ts`, `src/ui/components/CommunitiesTab.tsx`

**What's mocked:**
- 5 hardcoded communities with fake stats (`activeCount`, `totalMembers`, `isLive`) — `useCommunities.ts:16-68`
- `useJoinedCommunities` always returns first 3 communities as "joined" — `useCommunities.ts:131-134`
- `CATEGORIES` filter list is static array of 13 strings — `CommunitiesTab.tsx:22-26`
- `mockMembers` array with 5 fake usernames rendered as "Active Members" — `CommunitiesTab.tsx:135-152`
- Join button is a no-op with `// TODO` comment — `CommunitiesTab.tsx:110`
- All hooks simulate async with `setTimeout(..., 100)`

**Need:**
- Convex tables for communities + memberships
- Join/leave mutations
- Community-scoped posts query + create flow
- Real member list per community
- Dynamic category list (or keep static if intentional)

---

### A2. Jams/Rooms — Fully Mocked

**Files:** `src/ui/hooks/useJams.ts`, `src/ui/components/JamsTab.tsx`, `src/ui/components/RoomCard.tsx`

**What's mocked:**
- Entire rooms system is a module-level `Map` with one seed room "Chill Vibes" — `useJams.ts:32-57`
- Hardcoded usernames (`Tylobic`, `BeatMaker`, `SynthWave`) and fake user IDs — `useJams.ts:47-51`
- Fake HLS stream URL to third-party demo server — `useJams.ts:42`
- New rooms get placeholder `https://example.com/hls/{userId}/stream.m3u8` — `useJams.ts:164`
- All CRUD hooks (`useCreateRoom`, `useUpdateRoom`, etc.) operate on local Map only
- `RoomCard.tsx` renders `room.mockParticipants` avatars — `RoomCard.tsx:120-131`
- "Friends Jamming Now" maps friends to rooms via round-robin index — `JamsTab.tsx:297`

**Need:**
- Convex tables for rooms + participants
- Create/update/activate/deactivate mutations
- Real room activity/presence counts
- Real stream URL from media server integration

---

### A3. Jam Room Chat — Local State Only

**File:** `src/ui/pages/JamRoom.tsx`

**What's mocked:**
- Chat messages stored in local `useState` — `JamRoom.tsx:65-72`
- Messages disappear on refresh, invisible to other users
- Participant list falls back to `allUsers.slice(0, N)` (random real users shown as participants) — `JamRoom.tsx:90-99`
- Electron client launch args hardcoded: `--room=abc123 --token=jwt` — `JamRoom.tsx:134`

**Need:**
- Convex room-message table + queries/mutations
- Live subscriptions for room chat stream
- Real room membership/participant source
- Real room token issuance for Electron client

---

### A4. Feed Sidebar Suggested Friends — Hardcoded

**File:** `src/ui/components/FeedTab.tsx`

**What's mocked:**
- `SUGGESTED_FRIENDS` — 4 hardcoded fake usernames with empty avatars — `FeedTab.tsx:19-24`
- "Add Friend" button only updates local React state, never calls backend — `FeedTab.tsx:42-49`
- "Active Jams" cards are mock-backed via `useJams()` — resolves when jams become real

**Need:**
- Backend-driven suggested friends query (e.g. mutual friends, non-friended users)
- Wire send-request button to real `friends.sendRequest` mutation

---

### A5. Post/Comment Data Gaps — Hardcoded Fields

**File:** `src/ui/hooks/usePosts.ts`

**What's mocked:**
- Audio metadata always `title: "Audio"`, `duration: 0` — `usePosts.ts:70-75`
- `shares: 0` hardcoded on every post (no shares system) — `usePosts.ts:78`
- `community: undefined` on every post (no community link) — `usePosts.ts:79`
- `isGlobal: true` on every post — `usePosts.ts:80`
- `useCommunityPosts` is a stub returning empty `[]` — `usePosts.ts:136-144`
- Same `title: "Audio"`, `duration: 0` in `convertComment()` — `usePosts.ts:100-101`

**Need:**
- Store/fetch real audio metadata (title, duration) from backend
- Shares system or remove the field
- Community field populated once communities are real
- Real community posts query

---

### A6. Conversation User Data Gaps

**File:** `src/ui/hooks/useUsers.ts`

**What's mocked:**
- `convertConversation()` fills `otherUser` with empty defaults: `banner_url: ""`, `bio: ""`, `instruments: []`, `genres: []`, `dm_privacy: "friends"`, and `new Date().toISOString()` for timestamps — `useUsers.ts:146-153`
- `convertUser()` uses `new Date().toISOString()` as fallback for missing timestamps — `useUsers.ts:42-43`

**Need:**
- Backend should return full user profile data in conversation queries, or frontend should fetch separately
- Use `null`/`undefined` instead of fake current timestamps

---

### A7. Settings Page Stubs

**File:** `src/ui/pages/Settings.tsx`

**What's mocked:**
- Email change disabled with placeholder message — `Settings.tsx:183`
- Password change disabled with `value="********"` readonly — `Settings.tsx:193`
- DM privacy fixed to `"friends"` with no toggle — `Settings.tsx:169`

**Need:**
- Real email change flow via auth provider
- Real password change flow
- DM privacy toggle calling `profiles.updateMe`

---

### A8. Registration Placeholder

**File:** `src/ui/stores/authStore.ts`

**What's mocked:**
- `name: email` — email used as placeholder display name during signup — `authStore.ts:88`

**Need:**
- Collect real display name during onboarding, or set it in `UsernameSetupModal`

---

### A9. Audio Error Stub

**File:** `src/ui/components/ComposePost.tsx`

**What's mocked:**
- Error branch checks for `"AUDIO_NOT_IMPLEMENTED_YET"` string — `ComposePost.tsx:95-97`

**Need:**
- Confirm audio posting works end-to-end, then remove this dead branch

---

## Section B — Backend Features With No Frontend UI

### B1. Blocking System — `convex/blocks.ts` (ALL 3 functions unused)

| Function | Type | Purpose |
|----------|------|---------|
| `block` | mutation | Block a user by profile ID |
| `unblock` | mutation | Unblock a previously blocked user |
| `listPaginated` | query | Paginated list of blocked users |

**Impact:** Blocking is enforced server-side in DM send logic (`messages.ts` uses `isBlocked()`), but users have no way to actually block anyone. No block button on profiles, no "Blocked Users" settings section.

**Frontend needs:**
- Block/unblock button on user profiles and post context menus
- "Blocked Users" list in Settings page
- Visual indicator when viewing a blocked user's profile

---

### B2. Comment Replies/Threads — `convex/comments.ts` (4 of 8 functions unused)

| Function | Type | Purpose |
|----------|------|---------|
| `reply` | mutation | Reply to a comment (threaded) |
| `getRepliesPaginated` | query | Get replies to a specific comment |
| `getById` | query | Get a single comment by ID |
| `remove` | mutation | Soft-delete own comment |
| `getCountByPost` | query | Standalone comment count (redundant — count already embedded in post data) |

**Status: Fully implemented.**

- `useReplies` and `useCreateReply` hooks wired to `comments.getRepliesPaginated` / `comments.reply`
- `CommentRow` component: avatar, content, audio player, like/reply/delete actions
- "Reply" button on top-level and reply rows; reply-to-reply bubbles up to parent thread compose
- `@username` prefilled in compose when replying to a reply; header shows "Replying to @username"
- "View N replies" / "Hide replies" toggle; replies collapsed by default, fetched lazily
- Thread indented with left border; "Load more replies" pagination
- Post detail page filters to `depth === 0` only to avoid mixing replies into main list
- Comment delete: soft delete (`deletedAt`), shows `♪ this comment was removed` placeholder

---

### B3. Post Likers List — `convex/posts.ts` (1 function unused)

| Function | Type | Purpose |
|----------|------|---------|
| `getLikes` | query | Paginated list of users who liked a post |

**Impact:** Like count is shown but not clickable. No "Liked by" dialog.

**Frontend needs:**
- Clickable like count that opens a modal showing who liked the post

---

### B4. Delete Post — `convex/posts.ts` (1 function no UI)

| Function | Type | Purpose |
|----------|------|---------|
| `remove` | mutation | Delete own post (hard delete) |

**Impact:** Users cannot delete their own posts. `useDeletePost` hook exists in `usePosts.ts` but is imported nowhere.

**Backend issues:**
- `remove` has the same multiple-paginate bug as `comments.remove` had: `deletePostLikesInBatches` (paginate loop) + comment cascade paginate loop + `deleteCommentLikesInBatches` per comment — three nested paginate scans, all in one mutation. Will throw same Convex error.
- Should be converted to **soft delete** (consistent with comment approach): set `deletedAt`, clear `text` and `audioUrl`/`audioObjectKey`
- Hard-delete cascade of all comments and likes should move to a scheduled action or be dropped entirely (comments on a deleted post become unreachable anyway)

**Frontend needs:**
- Trash/kebab menu on own posts in `PostCard` and `Post` detail page
- On feed/profile: soft-deleted posts show `♪ this track was removed` placeholder (muted, no actions)
- Navigating to `/post/:id` of a soft-deleted post shows the placeholder instead of 404

---

### B5. DM Message Delete — `convex/messages.ts` (1 function unused)

| Function | Type | Purpose |
|----------|------|---------|
| `remove` | mutation | Delete a sent message (sender only) |

**Impact:** Users cannot unsend/delete their own DMs.

**Frontend needs:**
- Context menu or swipe-to-delete on sent messages

---

### B6. Superseded/Dead Backend Endpoints

These exist but have been replaced by better versions:

| Function | File | Why unused |
|----------|------|------------|
| `getSentRequests` | `convex/friends.ts` | Superseded by `getSentRequestsWithDataPaginated` (returns full user objects) |
| `listOnlineUserIds` | `convex/presence.ts` | Frontend uses `users.getOnline` / `users.getOnlineIds` instead |
| `listOnlineByUserIds` | `convex/presence.ts` | Same — frontend uses the `users.ts` wrappers |
| `getAuthUser` | `convex/auth.ts` | App uses `authClient.useSession()` + `profiles.getMe` instead |

**Action:** Consider removing these dead endpoints to reduce maintenance surface.

---

### B7. Internal/Admin Functions (not intended for frontend)

| Function | File | Purpose |
|----------|------|---------|
| `backfillObjectKeys` | `convex/mediaMaintenance.ts` | Admin migration tool, run from Convex dashboard |
| `listExpiredSessionsByStatus` | `convex/mediaCleanup.ts` | Internal cron query |
| `deleteUploadSessionsById` | `convex/mediaCleanup.ts` | Internal cron mutation |
| `runDailyCleanup` | `convex/mediaCleanup.ts` | Cron-triggered R2 + DB cleanup |

**Action:** These are fine as-is — internal functions not meant for frontend.

---

## Section C — Implementation Todos

### Quick Wins (backend exists, wire up frontend only)

- [x] **Comment soft delete** — Trash icon on own comments, calls `comments.remove` (sets `deletedAt`, clears content); backend needs `deletedAt` field in schema + soft-delete logic in `remove` + filter in `getByPostPaginated`; frontend shows `♪ this note was removed` placeholder for deleted comments that still have replies *(B2)*
- [x] **Post soft delete** — Trash/kebab on own posts in `PostCard` + `Post` detail; rewrite `posts.remove` to soft delete (`deletedAt` + clear content, drop cascade); feed/profile shows `♪ this track was removed` placeholder; `/post/:id` of deleted post shows placeholder instead of 404 *(B4)*
- [x] **DM message delete** — Hover-visible trash on own messages, calls `messages.remove` *(B5)*
- [x] **DM privacy toggle** — Dropdown in Settings (friends/everyone), calls `profiles.updateMe({ dm_privacy })` *(A7)*
- [x] **Post likers modal** — Like count is clickable, opens dialog with paginated user list from `posts.getLikes` *(B3)*
- [x] **Remove `AUDIO_NOT_IMPLEMENTED_YET` error stub** — Removed dead branch from `ComposePost.tsx` *(A9)*
- [x] **Clean up dead backend endpoints** — Removed `friends.getSentRequests`, `presence.listOnlineUserIds`, `presence.listOnlineByUserIds`, `auth.getAuthUser` *(B6)*

### Medium Effort (backend exists, needs more frontend work)

- [x] **Instagram-style comment replies** — `CommentRow` component with "View N replies" expander, inline compose, `@mention` prefill for reply-to-reply, lazy reply fetching *(B2)*
- [ ] **Block/unblock UI** — Block button on user profiles + post context menus, "Blocked Users" list in Settings, blocked state indicator *(B1)*
- [ ] **Suggested friends from backend + wire Add Friend** — New query for non-friended users, replace `SUGGESTED_FRIENDS` hardcoded array, wire button to real `friends.sendRequest` *(A4)*
- [ ] **Conversation user data** — Return full profile in conversation queries or fetch separately, remove fake timestamp fallbacks *(A6)*
- [ ] **Audio metadata** — Store/fetch real title + duration from backend, remove hardcoded `"Audio"` / `0` *(A5)*

### Large Effort (needs full backend build)

- [ ] **Communities backend** — Convex tables, join/leave mutations, community posts, member lists *(A1)*
- [ ] **Jams/Rooms backend** — Convex tables, room CRUD, participant tracking, presence *(A2)*
- [ ] **Jam Room Chat backend** — Room-scoped messages table, real-time subscriptions *(A3)*
- [ ] **Jam Room Electron args** — Real room token issuance, validated launch args *(A3)*
- [ ] **Email/password change** — Requires auth provider integration *(A7)*

---

## Section D — Already Real (Do Not Rebuild)

- Authentication/session pipeline
- Profile CRUD for display name, bio, avatar, banner, instruments, genres
- Username validation + reserved usernames (`deleted_account`, `deleted`, `admin`, `support`, `system`)
- Account state model (`active/deactivated/suspended/banned/deleted`) and guarded transitions
- Soft delete anonymization flow with username release
- Authenticated R2 upload proxy (`convex/media.ts`, `convex/http.ts`)
- Post/comment audio upload and persistence
- Posts/comments likes + pagination
- DM conversations/messages/read states + DM privacy enforcement
- Friends system (send/accept/decline/remove requests, paginated list)
- Presence heartbeat/session tracking with real online filtering
- Status bar presence updates (online/away/busy/invisible)
