# Mobile App (Flutter)

`apps/mobile` is a Flutter app targeting Android and iOS, built against the
same REST API as the web app (see [API.md](API.md)).

## Project structure

```
apps/mobile/lib/
├── main.dart                       # app entry, auth-gated root routing
├── core/
│   ├── api_client.dart             # REST client, token storage
│   ├── auth_controller.dart        # ChangeNotifier auth state (Provider)
│   ├── models.dart                 # AppUser, Agent, ToolCall, ChatMessage
│   └── theme.dart                  # brand colors / ThemeData
└── features/
    ├── auth/                       # login_screen.dart, register_screen.dart
    ├── home/                       # home_screen.dart (bottom nav), agents_list_screen.dart
    ├── agents/                     # agent_chat_screen.dart
    └── profile/                    # profile_screen.dart
```

State management is deliberately minimal: a single `AuthController`
(`ChangeNotifier`) exposed via `provider`, plus local `StatefulWidget` state
per screen. No code generation, no Bloc/Riverpod — appropriate for an app
this size; revisit if the feature surface grows significantly.

## Auth on mobile

The app has no cookie jar by default, so it authenticates with a bearer
token instead of the web app's cookie:

1. Login/register calls `POST /api/auth/{login,register}` and receives
   `{ user, token }`.
2. `token` is stored in `flutter_secure_storage` (Keychain on iOS, EncryptedSharedPreferences on Android).
3. Every subsequent request adds `Authorization: Bearer <token>`
   (`ApiClient._headers()`).
4. On app launch, `AuthController.bootstrap()` calls `GET /api/auth/me`
   with the stored token; a `401` clears the token and routes to the login
   screen.

## Talking to the backend

`ApiClient` (`lib/core/api_client.dart`) resolves the API base URL from a
compile-time define:

```bash
flutter run --dart-define=API_BASE_URL=https://api.linqkeun.ai
```

Defaults to `http://localhost:3000` if omitted, with one adjustment: on the
**Android emulator** (not physical devices), `localhost` is rewritten to
`10.0.2.2`, the emulator's alias for the host machine — this only matters
for local development against `npm run dev`. iOS simulators can reach
`localhost` directly.

`AgentChatScreen` calls `POST /api/ai/chat` with a plain `ApiClient.post()`
and awaits the full JSON response (not a stream) — the backend runs a
tool-use loop before it has a final answer, so there's no meaningful
partial text to stream. See
[AI_AGENTS.md](AI_AGENTS.md#why-chat-is-non-streaming) for why. The screen
shows a "sedang berpikir..." bubble while the request is in flight, and
renders which tools the agent used (`ToolCall`) as small chips under its
reply.

## Running locally

```bash
cd apps/mobile
flutter pub get

# Android emulator, against a local `npm run dev` on the host:
flutter run --dart-define=API_BASE_URL=http://localhost:3000

# iOS simulator:
open -a Simulator   # boot a simulator first if none is running
flutter run --dart-define=API_BASE_URL=http://localhost:3000
```

## Building for release

### Android

```bash
cd apps/mobile
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.linqkeun.ai
```

Produces `build/app/outputs/bundle/release/app-release.aab` for Play Store
upload. Before your first real release:

1. Generate an upload keystore and configure signing in
   `android/app/build.gradle.kts` (or `key.properties`) — Flutter's default
   docs cover this:
   https://docs.flutter.dev/deployment/android
2. Set `applicationId` in `android/app/build.gradle.kts` (currently
   `ai.linqkeun.linqkeun_ai` from the `flutter create --org ai.linqkeun`
   scaffold) to your real bundle identifier if different.
3. Update `android/app/src/main/AndroidManifest.xml` for the app label/icon.

A debug APK (unsigned, for local testing / sideloading) is simpler:
```bash
flutter build apk --debug --dart-define=API_BASE_URL=http://localhost:3000
# → build/app/outputs/flutter-apk/app-debug.apk
```

### iOS

```bash
cd apps/mobile
flutter build ipa --release \
  --dart-define=API_BASE_URL=https://api.linqkeun.ai
```

Requires an Apple Developer account, a configured signing team in Xcode
(`open ios/Runner.xcworkspace`), and the usual App Store Connect setup —
see https://docs.flutter.dev/deployment/ios. For quick local verification
without signing:
```bash
flutter build ios --simulator --debug
```

## Adding a new AI agent to the mobile app

You don't need a mobile release for this — new agents created in
`/admin/agents` on the web app appear automatically in `GET /api/agents`,
which `AgentsListScreen` fetches at runtime. There is no agent-specific
branching in the mobile UI (every agent uses the same chat screen), so new
agents just work.

## Feature parity with web

The mobile app currently covers chat only (agent list + chat). Tasks,
Reports, and Settings (knowledge base / workflow automation) are web-only
so far — the API routes they use (`/api/tasks`, `/api/reports`,
`/api/knowledge`, `/api/workflows`) are the same ones the web dashboard
calls, so adding the equivalent mobile screens is additive, not a backend
change.
