# Jam App — Overview

## Purpose

This application is a desktop jam platform combining a social music experience with a dedicated native jamming engine. The Electron front-end provides account/room management, social features and passive listening via HLS streams. The authoritative, low-latency jamming engine runs in a separate C++ client that the Electron app spawns as a child process — all live mic capture, mixing, DSP, and performance synchronization happen inside that native client.

## High-level Goals

- Provide an easy-to-use social interface for discovering and joining jam rooms.
- Let casual listeners tune in to live jams via HLS (standard HTTP Live Streaming).
- Enable musicians to perform together with low-latency, high-quality audio using the native C++ jam client.
- Keep the Electron UI focused on session control, presence, and social features while delegating audio-critical work to the native client.

## Core Components

- Electron UI: authentication, room list, chat/social integrations, playback controls for HLS streams, launching and monitoring the native jam client.
- C++ Jam Client: the actual jam engine. Responsible for microphone access, input levels, mixing, echo-cancellation, sample timing, buffering, and low-latency transport between peers or to a jam server. Runs as a child process spawned by the Electron app.
- HLS Streams: HTTP Live Streams used primarily for passive listening (audience experience, recordings, previews). These streams are produced by the server-side streaming pipeline and consumed by the Electron UI.
- Backend Services: authentication, room presence, user profiles, social metadata, matchmaking, and any server-side logic required to produce HLS streams and manage session metadata.

## How It Works (Conceptually)

- The user signs in through the Electron UI and sees a list of available jam rooms and community content.
- For passive listening, the UI plays HLS streams directly (no native client required).
- When a user chooses to actively join a jam (play their instrument/mic), the Electron app launches the C++ jam client as a child process and passes necessary session metadata (room id, auth token, server address, and configuration). The native client handles device permissions and all audio I/O.
- The Electron UI monitors the child process and provides status, logs, and simple controls (join/leave, mute/unmute, preferred input device). The real-time audio mixing and latency-critical synchronization remain inside the native client.

## User Flows

- Browse & Discover: sign in → browse communities/rooms → view room details and current audience.
- Passive Listening: click a room's listen button → Electron plays the room's HLS stream → user hears the live mix.
- Join as Performer: click join → Electron spawns the native C++ client → native client opens mic/device and negotiates with jam server/peers → Electron updates presence and shows performer status.
- Leave Session: performer quits in UI → Electron signals the C++ client to close → native client performs graceful shutdown and returns session logs.

## Integration & IPC (High Level)

- Process Launch: Electron spawns the C++ binary with CLI args or a config file containing session metadata.
- Monitoring: Electron watches the child process lifecycle and captures stdout/stderr for user-facing logs or diagnostics.
- Control Path: simple control messages (start/stop/mute) can be implemented via command-line signals, temporary files, local sockets, or stdio; the UI only needs a small control surface — the native client owns audio state.

## Audio & Streaming Model

- HLS for Audience: HLS streams are ideal for audience members because they are broadly compatible, resilient, and easy to CDN. They are not intended for ultra-low latency interactive jamming.
- Native Client for Performance: the C++ client is designed for low-latency, real-time audio. It handles mic capture, per-track levels, monitoring mixes, and synchronization between performers.

## Security & Privacy

- Microphone Access: the native client requests/controls microphone permissions and should be clear to users about device use.
- Authentication: Electron handles user auth tokens which are passed securely to the native client for session joins; tokens should be short-lived and validated server-side.
- Data Handling: sensitive data (tokens, private room info) should never be written to insecure temp files. Use secure IPC patterns and delete transient files after use.

## UX & UI Notes (Intentional Scope)

- The Electron app focuses on discoverability, session management, social features (presence, chat, likes), and audience playback controls.
- The app surface shows performer status (connected, muted, latency), basic audio meters from the native client, and simple error messages when the native process fails.
- Detailed audio configuration and advanced monitoring are handled in the native client's interface (if it provides one) or via a minimal settings bridge in the Electron UI.

## Designer Guidance

- Front-end stack: the Electron UI is implemented with React — designers can build pixel-perfect interfaces directly using those technologies.
- Scope for designers: focus on feed, room/room-details, composer overlays, discovery, profile pages, chat/presence, and audience HLS playback UX. Keep audio-mixing controls minimal (join/leave, mute, input selection, simple meters).
- IPC & integration points: the UI can launch the native jam client via the `spawn-client` IPC channel exposed by the main process. Deep links use the `jam:` protocol and internal navigation is handled via router paths like `/jam/:id`.
- Visual placeholders: use simple status indicators for performer state (connected, muted, latency), and leave detailed per-track meters and mixing panels to the native client.
- Dev vs Prod: in development the UI is served from `http://localhost:5123`; in production it is loaded from `dist-react/index.html`. The native client binary is expected under `resources/client` (or `process.resourcesPath` when packaged).


## Social Features

- Feed: a central, scrollable feed combining recent jams, posts, highlights, and recommended content. Support for algorithmic and following-first views, inline audio previews, and promoted events.
- Jam Rooms Directory: searchable, filterable list of active and scheduled jam rooms with metadata (genre, participants, audience size, HLS preview link, tags).
- Room Pages: persistent room pages showing current performers, live audience, chat, pinned notes, and quick actions (listen HLS, request to join, open native client).
- Rich Posts: users can publish posts containing text, links, audio clips, images, or short HLS snippets; posts support likes, reposts, bookmarks, and threaded comments.
- Profiles & Followers: user profiles with bio, social links, recent activity, badges, follower/following lists, and follow/unfollow actions.
- Communities: grouped spaces (by genre, location, label) with their own feeds, moderation settings, and events/room listings.
- Messaging & Chat: direct messages between users and live chat in rooms; support for moderation tools (mute, ban, slow mode) and message reactions.
- Events & Scheduling: create and promote scheduled jams, RSVP, calendar integrations, and reminders; support for recurring shows and ticketing links.
- Notifications: desktop and in-app notifications for mentions, invites, room activity, new followers, and scheduled events.
- Discovery & Search: faceted search for rooms, users, tracks, and communities; recommendation widgets for trending jams and suggested collaborators.
- Clips & Highlights: create short clips from HLS recordings, tag performers, and share to feed or export for external sharing.
- Recording & Publishing: optional recording of jam sessions (server-side or client-side) and tools to publish edited recordings to profiles or social feeds.
- Monetization & Tips: optional tipping, subscriptions, or ticketing integrations for creators; integration points for payments.
- Moderation & Safety: reporting flow, content moderation tools, user blocks, profanity filters, and rate limiting to prevent spam.
- Presence & Roles: show user presence (audience, performer, muted) and configurable room roles (host, moderator, performer, guest).
- Analytics & Insights: basic creator-facing stats (audience size, peak listen, engagement, clip plays) to help performers understand reach.

## Deployment & Requirements (Overview)

- Supported OS: desktop platforms where the native C++ client can run (Windows/macOS/Linux). The Electron app packages and ships the native client alongside the app binary or downloads it at install time.
- Distribution: bundle the native binary with installers or use an updater to fetch platform-specific builds. Code-signing and notarization may be required for macOS and Windows.

## Troubleshooting & Diagnostics

- Child Process Logs: capture and surface native-client stdout/stderr in the Electron UI for diagnostics.
- Crash Handling: detect native client exits and offer retry, collect crash dumps, and surface helpful guidance (e.g., check audio drivers, permissions).
- Fallbacks: if native client fails, allow users to continue as passive listeners via HLS.

## Roadmap & Extensions

- Improve IPC to expose richer telemetry (per-track meters, network stats) without moving audio logic into the UI.
- Add secure pairing so native clients can be run remotely but authorized from the Electron account.
- Offer recorded session publishing and integration with social feeds.

## One-Line Summary

An Electron-hosted social jam app that uses HLS for audience listening while delegating latency-sensitive, high-fidelity jamming to a spawned C++ native client — the Electron layer handles authentication, discovery, and session control while the native client handles the real-time audio experience.
