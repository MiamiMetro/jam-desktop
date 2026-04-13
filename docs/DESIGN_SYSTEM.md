# Jam Desktop — Design System

> Build guide for new pages. Recipes first, rules second.
> **Aesthetic:** "Dark Studio" — warm amber, deep backgrounds, performance-first glass surfaces. Spotify/Discord energy.

---

## 1. Recipes

Copy these directly. They are the exact patterns used across the app.

### Page Shell (every page starts here)

The header IS the titlebar. `page-header` makes it a drag region. `caption-safe` adds right padding on Windows to avoid caption buttons (minimize/maximize/close).

```tsx
// Single-column page (full width — needs caption-safe)
<div className="flex flex-col h-full">
  <div className="page-header caption-safe px-5 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
    <Icon className="h-4 w-4 text-muted-foreground" />
    <h2 className="text-sm font-heading font-semibold text-muted-foreground">Title</h2>
  </div>
  <div className="flex-1 overflow-y-auto p-5">
    {/* content */}
  </div>
</div>
```

```tsx
// Detail page with back button (simple — Profile, Settings, Post)
<div className="flex flex-col h-full">
  <div className="page-header caption-safe px-5 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
    <button className="no-drag cursor-pointer text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigate(-1)}>
      <ArrowLeft className="h-4 w-4" />
    </button>
    <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
  </div>
  <div className="flex-1 overflow-y-auto p-5">{/* content */}</div>
</div>
```

```tsx
// Detail page with back button (rich — JamRoom, Communities detail)
// Two-line info is OK here — header will be taller but consistent across rich pages
<div className="flex flex-col h-full">
  <div className="page-header caption-safe px-5 py-3 border-b border-border flex-shrink-0">
    <div className="flex items-center gap-2">
      <button className="no-drag cursor-pointer flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-heading font-bold truncate">{name}</h1>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  </div>
  <div className="flex-1 overflow-y-auto p-5">{/* content */}</div>
</div>
```

### Two-Column (main + sidebar)

Left header uses `page-header` only (sidebar shields it from caption buttons). Right sidebar gets a drag-region spacer at the top to push content below the titlebar zone.

```tsx
<div className="flex h-full">
  {/* Left — main content */}
  <div className="flex-1 min-w-0 flex flex-col border-r border-border">
    <div className="page-header px-5 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-heading font-semibold text-muted-foreground">Title</h2>
    </div>
    <div className="flex-1 overflow-y-auto">{/* main */}</div>
  </div>

  {/* Right — sidebar */}
  <div className="w-72 flex-shrink-0 border-l border-border flex flex-col">
    <div className="page-header caption-safe py-3 flex-shrink-0" />
    <div className="flex-1 overflow-y-auto p-4 space-y-6">{/* sidebar content */}</div>
  </div>
</div>
```

### Split Panel (list + detail)

Left panel header uses `page-header` only (right panel shields it). Right panel detail header uses `page-header caption-safe` (at window's right edge).

```tsx
<div className="flex h-full min-h-0">
  {/* Left — list panel */}
  <div className="w-[320px] min-w-[320px] surface-elevated flex flex-col h-full">
    <div className="page-header px-5 py-3 flex-shrink-0 border-b border-border">{/* header */}</div>
    <div className="flex-1 overflow-y-auto">{/* list */}</div>
  </div>

  {/* Right — detail panel (at window's right edge) */}
  <div className="flex-1 flex flex-col h-full min-h-0 min-w-0">
    <div className="page-header caption-safe px-5 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
      {/* detail header content */}
    </div>
    <div className="flex-1 overflow-y-auto">{/* detail content */}</div>
  </div>
</div>
```

### Section Header
```tsx
<h3 className="text-sm font-heading font-semibold text-muted-foreground mb-3">Title</h3>
```

### List Item (left accent border)
```tsx
<button className="w-full flex items-center gap-4 px-5 py-3.5 cursor-pointer
  hover:bg-foreground/[0.03] transition-colors border-l-2 border-l-transparent hover:border-l-primary/40">
  <Avatar size="default">...</Avatar>
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium truncate">{name}</p>
    <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
  </div>
</button>
```

### List Item (active state)
```tsx
<button className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left
  cursor-pointer border-b border-border/50 border-l-2
  ${isActive ? "bg-primary/8 border-l-primary" : "border-l-transparent hover:bg-muted/50 hover:border-l-primary/30"}`}>
  ...
</button>
```

### Glass Card (clickable)
```tsx
<div className="p-4 rounded-xl glass-solid hover:glass-strong cursor-pointer transition-all duration-200
  hover:ring-1 hover:ring-primary/20 relative overflow-hidden">
  ...
</div>
```

### Hero Card (featured, like My Room)
```tsx
<div className={`p-5 rounded-xl glass-strong relative overflow-hidden
  ${isActive ? "ring-1 ring-primary/30" : "ring-1 ring-border"}`}>
  {isActive && <div className="absolute inset-0 bg-gradient-primary-tr pointer-events-none" />}
  <div className="relative">...</div>
</div>
```

### Horizontal Avatar Scroll
```tsx
<div className="flex gap-3 overflow-x-auto pb-1">
  <button className="flex flex-col items-center gap-1.5 p-3 rounded-xl glass-solid hover:glass-strong
    transition-all duration-200 cursor-pointer min-w-[80px] hover:ring-1 hover:ring-primary/20">
    <Avatar size="default" className="ring-2 ring-green-500/30">
      ...
      <AvatarBadge className="bg-green-500" />
    </Avatar>
    <span className="text-xs font-medium truncate w-full text-center">{name}</span>
  </button>
</div>
```

### Filter Pill Bar
```tsx
<div className="flex gap-2 overflow-x-auto pb-3">
  <button className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer
    ${active ? `${color.bg} ${color.text} ring-1 ring-current/20` : "glass-solid text-muted-foreground hover:text-foreground hover:ring-1 hover:ring-primary/20"}`}>
    {label}
  </button>
</div>
```

### Actions Bar (like/comment/share)
```tsx
<div className="flex items-center gap-6 mt-3 pt-3 border-t border-border/30">
  <button className={`flex items-center gap-2 text-sm transition-all cursor-pointer active:scale-90
    ${isLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}>
    <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
    <span className="tabular-nums">{count}</span>
  </button>
  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
    <MessageCircle className="h-4 w-4" /><span className="tabular-nums">{count}</span>
  </button>
</div>
```

### Form Input
```tsx
<div className="space-y-1.5">
  <Label className="text-xs font-medium text-muted-foreground">
    Name <span className="text-muted-foreground/50">(Optional)</span>
  </Label>
  <Input className="bg-muted/50 border-transparent focus:bg-background focus:border-border" />
</div>
```

### Number Stepper (no native input[type=number])
```tsx
<div className="flex items-center gap-2">
  <button className="h-9 w-9 flex items-center justify-center rounded-md bg-muted/50 hover:bg-muted
    text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
    <Minus className="h-3.5 w-3.5" />
  </button>
  <span className="w-8 text-center text-sm font-medium tabular-nums">{value}</span>
  <button className="h-9 w-9 flex items-center justify-center rounded-md bg-muted/50 hover:bg-muted
    text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
    <Plus className="h-3.5 w-3.5" />
  </button>
</div>
```

### Tab Switcher
```tsx
<div className="flex border-b border-border flex-shrink-0">
  <button className={`px-5 py-3 text-sm font-medium transition-colors relative cursor-pointer
    ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
    {label}
    {active && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
  </button>
</div>
```

### Status Badges
```tsx
<span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Active</span>
<span className="text-xs px-2 py-0.5 rounded-full bg-muted-foreground/20 text-muted-foreground">Disabled</span>
<span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">{genre}</span>
```

### Chat Sidebar
```tsx
<div className="w-72 lg:w-80 xl:w-96 border-l border-border flex flex-col min-h-0 overflow-hidden">
  <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
    <h3 className="text-sm font-heading font-semibold text-muted-foreground">Chat</h3>
  </div>
  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">{/* messages */}</div>
  <div className="px-4 py-3 border-t border-border flex-shrink-0">
    <div className="flex gap-2">
      <Input className="flex-1 bg-muted/50 border-transparent focus:bg-background focus:border-border" />
      <Button size="sm">Send</Button>
    </div>
  </div>
</div>
```

---

## 2. Titlebar Integration Rules

The header IS the titlebar. No dead space above headers. No separate titlebar chrome.

| Class | What it does | When to use |
|-------|-------------|-------------|
| `page-header` | Drag region (`-webkit-app-region: drag`), interactive children get `no-drag` automatically | Every page/panel header |
| `caption-safe` | `padding-right: 140px` on Windows (no-op on macOS/web) | Headers at the window's **right edge** — single-column pages, right panels in split layouts, right sidebars |

**Header standards (every header must follow these):**
- **Padding:** Always `px-5 py-3` — no exceptions
- **Gap:** Always `gap-2` between items
- **Title text:** `text-sm font-semibold text-muted-foreground` — never `text-foreground`
- **Back buttons:** Plain `<button>` with `no-drag cursor-pointer text-muted-foreground hover:text-foreground transition-colors` — never use `<Button>` component (it inflates height via min-size variants)
- **Back arrow icon:** `<ArrowLeft className="h-4 w-4" />` — same size as page icons
- **Header must be fixed:** Always `flex-shrink-0` and outside the scroll container — drag region must never scroll away

**Two tiers of headers:**
1. **Simple** (Jams, Feed, Communities list, Settings, Profile, Post): Icon/back arrow + single-line muted title. All same height.
2. **Rich** (JamRoom, Communities detail, DMConversation): Back arrow + multi-line info (name, badges, member count). Taller but consistent with each other.

**Decision tree:**
1. Is this header full-width or in a right-side panel? → `page-header caption-safe`
2. Is this header in a left panel (with sidebar/panel to its right)? → `page-header` only
3. Is this a right sidebar with no header? → Add an empty spacer: `<div className="page-header caption-safe py-3 flex-shrink-0" />`
4. Don't put important buttons (CTAs, actions) in the header's right side — move them into the content area below

## 3. New Page Checklist

- [ ] Route in `App.tsx` (lazy-loaded)
- [ ] Page Shell recipe with `page-header` (+ `caption-safe` if full-width or right panel)
- [ ] No action buttons in header right side (move to content area)
- [ ] `<LoadingState>` while data loads (with page-header above it)
- [ ] `<EmptyState>` when no data (with page-header above it)
- [ ] Guest state handled (`isGuest` → auth CTA)
- [ ] Both themes tested
- [ ] Back button if detail view
- [ ] Sidebar nav item highlights on this route

---

## 4. Don'ts

- **No gradient hero banners.** Compact inline headers only.
- **No `oklch()` in components.** Use theme tokens (`bg-primary`, `text-foreground`, etc.) or utility classes from `index.css` (`glow-primary`, `shadow-inset-primary`, `bg-gradient-primary-tr`, etc.). All colors must flow from CSS variables so theme presets work.
- **No `white/X%` opacity.** Use `foreground/X%` — breaks in light mode.
- **No `hover:translate-x/y`.** Desktop apps use color/ring changes.
- **No `input[type=number]`.** Use Number Stepper recipe.
- **No `outline-none`.** Breaks keyboard accessibility.
- **No icon-only buttons** for important actions. Add text labels.
- **No ad-hoc backgrounds.** Use `glass-solid`, `glass`, `glass-subtle`, `glass-strong`, `surface-elevated`.
- **No duplicating components.** Check existing first (see Section 5).
- **No duplicating logo.** Use `<Logo>` component.
- **No EQ bars slower than 1s.** Causes perceived lag.
- **No `animate-ping` for persistent status dots.** Use `animate-pulse`.

---

## 5. Quick Reference

### Surfaces
| Class | Use |
|-------|-----|
| `glass-solid` | Default interactive container (no backdrop blur; GPU-friendly) |
| `glass` | Premium/limited blur surfaces |
| `glass-subtle` | Lighter secondary container |
| `glass-strong` | Elevated content (has inner shadow) |
| `surface-elevated` | Sidebar, modals |
| `glow-primary` | Primary CTA emphasis |
| `shadow-inset-primary` | Active nav item inner glow |
| `shadow-glow-primary-lg` | Avatar/card outer glow |
| `bg-gradient-primary-tl` | Radial glow top-left (banner overlays) |
| `bg-gradient-primary-br` | Radial glow bottom-right (banner overlays) |
| `bg-gradient-primary-tr` | Radial glow top-right (hero cards) |

### Typography
| Level | Class |
|-------|-------|
| Page header | `text-sm font-heading font-semibold text-muted-foreground` |
| Section header | `text-sm font-heading font-semibold text-muted-foreground` |
| Card title | `text-sm font-heading font-semibold` |
| Body | `text-sm` |
| Caption | `text-xs text-muted-foreground` |
| Micro | `text-[10px]` or `text-[11px]` |

Fonts: `font-sans` (Plus Jakarta Sans) body, `font-heading` (Bricolage Grotesque) headings.

### Avatars
| Size | Class | Where |
|------|-------|-------|
| Tiny | `h-5 w-5` | Room card host |
| Small | `h-8 w-8` | Messages, nav |
| Default | `h-10 w-10` | Posts, lists |
| Large | `h-24 w-24` | Profile page |

Default ring: `ring-1 ring-border`. Profile: `ring-2 ring-primary/20`. Online: `ring-2 ring-green-500/30` + `AvatarBadge className="bg-green-500"`.

### Animations
| Class | Use for |
|-------|---------|
| `animate-page-in` | Page first render |
| `animate-stagger` | Grid/list items on load |
| `animate-float` | Empty state icons only |
| `animate-glow-pulse` | Primary CTAs only |
| `animate-fade-in` | Subtle opacity entrance |
| `eq-bar-1` to `4` | Audio playing state |
| `active:scale-90` | Like/action buttons |

All interactive elements: `transition-colors duration-200`. Cards: `transition-all duration-200`.
Prefer transform/opacity-based animations (`scale`, `translate`, `opacity`) over animating `height`, `box-shadow`, or gradient background-position directly.

### Genre Colors (from `GENRE_COLORS` in CommunitiesTab)
LoFi→Indigo, Rock→Red, Electronic→Purple, Jazz→Amber, Hip Hop→Green, Indie→Teal, Classical→Rose, R&B→Pink

### Keyboard Shortcuts
`Ctrl/Cmd + 1-4` nav tabs, `Ctrl/Cmd + T` toggle theme.

---

## 6. Existing Components (don't rebuild)

`EmptyState` `LoadingState` `SearchInput` `PostCard` `ComposePost` `AudioPlayer` `RoomCard` `RoomFormDialog` `Logo` `AuthModalShell` `Timestamp` `StatusBar`

### Key details:
- **Logo:** `<Logo className="w-5 h-5" />` — theme-aware, used in sidebar + auth modals
- **AudioPlayer:** `variant="post"` or `variant="comment"`
- **SearchInput:** Debounces internally, accepts `value` + `onSearch`
- **AuthModalShell:** Shared branded header/footer for login/signup modals
- **RoomFormDialog:** Create/edit room dialog with muted inputs, number stepper, `glass-solid` toggle
- **Timestamp:** Wraps any relative time text with a dotted-underline on hover + tooltip showing exact date/time (24h). Pass `date` (Date/string/number) and display text as children.
  ```tsx
  <Timestamp date={post.timestamp} className="text-xs text-muted-foreground">
    {formatTimeAgo(post.timestamp)}
  </Timestamp>
  ```
- **useHLSPlayer:** Returns `volume`, `setVolume`, `toggleMute` — persisted to localStorage as `"jam-volume"`

---

## 7. URL State

Prefer storing view state (filters, search, active selections) in URL search params via `useSearchParams` when possible. This preserves state across navigation. Fall back to `useState` when URL storage doesn't make sense (ephemeral UI, animations, form drafts).

```tsx
const [searchParams, setSearchParams] = useSearchParams();
const activeId = searchParams.get("dm");
setSearchParams({ dm: friendId });
```

Convex IDs are safe to use in URLs — they don't grant access. Backend validates permissions on every request.

---

## 8. Data & Security

**Mock:** None currently — see `BACKEND_MOCK_INVENTORY.md`
**Real:** `useFriends()`, `usePosts()`, `useMessages()`, `useOnlineUsers()`, `useCommunities()`, `useRooms()`, `useAuthStore`
**State:** TanStack Query (server), Zustand (UI), localStorage (volume, room handle). Never duplicate server state in Zustand.
**Auth:** Double-gated — frontend modal + backend `requireAuth()` (`NOT_AUTHENTICATED` / `PROFILE_REQUIRED`)

---

## 9. Status Bar

Bottom bar (`h-8`, `surface-elevated`, `border-t border-border/40`). Auto-hides when nothing to show. Lives in `AppLayout` below `MainContent`.

**File:** `src/ui/components/navigation/StatusBar.tsx`

### Sections (left to right)

| Section | When visible | Contents |
|---------|-------------|----------|
| Jam Room | In a room & not on room page | Green pulse dot, `# name`, participants, genre badge, HLS play/pause + volume, separator, Leave button |
| Post Audio | Track loaded & inline player scrolled away | Music icon, author — title, play/pause, progress bar, time, volume, dismiss (X) |

Sections separated by `<span className="w-px h-3.5 bg-border/50" />`.

### Audio mutual exclusion

- Starting **HLS** (jam room) → pauses post audio (keeps it visible in status bar)
- Starting **post audio** → pauses HLS
- Only one audio source plays at a time; neither destroys the other

### Contexts

| Context | Manages | Volume key |
|---------|---------|-----------|
| `PlayerContext` (`usePlayer`) | HLS stream for jam room | `"jam-volume"` |
| `PostAudioContext` (`usePostAudio`) | Singleton `<Audio>` for posts/comments | `"jam-audio-volume"` |

### Future: Generic audio player

When building the **song repository** feature (user's personal audio library), extract a shared `MiniPlayer` component from the status bar. Current post audio mini-player and future repository player share identical controls (play/pause, progress, time, volume, dismiss). Until then, keep the current `PostAudioContext` as-is — don't prematurely abstract.

---

## 10. File Structure

```
src/ui/
├── components/         — UI components (auth/, social/, navigation/, ui/)
├── pages/              — Profile, Post, JamRoom
├── layouts/            — AppLayout, MainContent
├── hooks/              — useHLSPlayer, useConversationScroll, useDebouncedValue
├── stores/             — authStore, uiStore, authModalStore
├── lib/                — cn, postUtils, types
└── index.css           — Tokens, glass/glass-solid, animations, grain
```

---

*Last updated: 2026-03-03*
