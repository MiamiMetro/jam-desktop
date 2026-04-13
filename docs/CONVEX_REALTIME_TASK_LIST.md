# Convex Realtime Task List

Use this as a quick execution tracker.

## Phase 1: Keep Critical Realtime

- [ ] Keep `profiles.getMe` realtime
- [ ] Keep `messages.getWithUser` first page realtime
- [ ] Keep `messages.getWithUser` older pages one-shot
- [ ] Keep `friends.getRequestsPaginated` realtime

## Phase 2: Gate Screen-Scoped Realtime

- [ ] Gate `messages.getConversationsPaginated` by active DM/Friends screen visibility
- [ ] Gate `users.getOnline` by screens that actually show online state
- [ ] Keep `posts.getById` realtime only while post detail/modal is open
- [ ] Keep `comments.getByPostPaginated` realtime only while comments panel/modal is open

## Phase 3: Convert to Snapshot Mode

- [ ] Convert `posts.getFeedPaginated` to snapshot load + manual refresh/new-posts banner
- [ ] Convert `posts.getByUsernamePaginated` to snapshot load + manual refresh
- [ ] Convert `users.searchPaginated` to debounced one-shot paged search
- [ ] Convert `friends.listPaginated` to snapshot load + optional refresh
- [ ] Convert `friends.getSentRequestsWithDataPaginated` to snapshot load

## Phase 4: UX + Correctness Hardening

- [ ] Add clear refresh affordance where live subscription is removed
- [ ] Keep optimistic UI for mutations (likes/comments/messages/friend actions)
- [ ] Verify no pagination duplicates/skips after snapshot conversion
- [ ] Verify unread indicators and DM behavior still feel realtime

## Phase 5: Cost Verification

- [ ] Record Convex function-call baseline before changes
- [ ] Record Convex function-call metrics after each phase
- [ ] Compare per-endpoint call deltas and adjust tiers if needed

## Phase 6: Release Readiness

- [ ] Run `npm run convex:pull`
- [ ] Run targeted lint for touched files
- [ ] Run `npm run build`
- [ ] Update `CONVEX_GUIDE.md` if any tier decisions changed
- [ ] Mark final approved realtime policy in PR notes

