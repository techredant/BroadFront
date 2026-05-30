# Broadcast Mobile — Architecture

Production-oriented layout for the Expo app (`frontend/`).

## Source layout

```
src/
├── app/                 # Expo Router (screens only — thin route files)
│   ├── _layout.tsx      # Root: auth, splash, providers
│   ├── (auth)/          # Sign-in
│   ├── (onboarding)/    # Name + location
│   └── (drawer)/        # Main app shell
│       ├── (tabs)/      # Home, trends, compose, news, profile
│       ├── (stream)/    # Stream Chat + calls
│       ├── (live)/      # Livestreams
│       ├── (audio)/     # Audio rooms
│       ├── (market)/    # Marketplace
│       └── …
├── components/          # Shared UI (prefer feature folders)
│   ├── ui/              # Spinners, footers, placeholders
│   ├── posts/           # Feed, PostCard, comments
│   ├── home/            # Home feed header
│   ├── profile/         # Profile-specific UI
│   ├── market/          # Marketplace UI
│   └── navigation/      # Tab bar, drawer
├── context/             # Global React context providers
├── contexts/            # Stream chat channel state, sockets
├── hooks/               # Reusable hooks
├── services/            # API modules (marketplace, etc.)
├── lib/                 # api-client, theme helpers
├── utils/               # Pure helpers (stream, media, push)
├── constants/           # API URL, themes, config
└── types/               # Shared TypeScript types
```

## Conventions

- **API**: Import `apiClient` / `API_PUBLIC_URL` from `@/lib/api-client`. The default base URL lives only in `src/constants/api.ts` (and `eas.json` for builds). Screens and contexts should not hardcode production URLs.
- **Loading**: Use `AppSpinner`, `FeedListFooter`, `PostCardSkeleton` — avoid one-off `ActivityIndicator` layouts.
- **Lists**: Home feed uses `FlashList`; profile posts use `FlatList` with header — avoid `ScrollView` + `.map()` for long feeds.
- **Feed state**: `LevelContext` owns level-based feed cache, socket rooms, and pagination.

## Splash

Native splash is configured in `app.json` (`expo-splash-screen`). JS hides splash when theme + Clerk routing are ready and either cached posts exist or the first feed request finishes (`_layout.tsx` `SplashController`).

## Environment variables

Copy `.env.example` to `.env` and fill in. Everything prefixed with
`EXPO_PUBLIC_` is bundled into the client and read at runtime via
`process.env.*`.

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_STREAM_API_KEY` | Stream Chat / livestream client key. |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key. |
| `EXPO_PUBLIC_API_URL` | Hosted REST API base (Vercel). |
| `EXPO_PUBLIC_USE_LOCAL_API` / `EXPO_PUBLIC_API_URL_DEV` / `EXPO_PUBLIC_USE_USB_API` | Dev-only routing to a local Node backend so Socket.IO works. |
| `EXPO_PUBLIC_SOCKET_URL` | Optional override for the Socket.IO server (defaults to `EXPO_PUBLIC_API_URL`). |
