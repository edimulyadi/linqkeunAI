# Mobile App (Flutter)

`apps/mobile` is a Flutter app targeting Android and iOS, built against the
same REST API as the web app (see [API.md](API.md)). Verified in this repo:
`flutter analyze` (clean), `flutter test` (passing), a debug APK build, and
an iOS simulator build.

## Project structure

```
apps/mobile/lib/
├── main.dart                       # app entry, auth-gated root routing
├── core/
│   ├── api_client.dart             # REST + streaming client, token storage
│   ├── auth_controller.dart        # ChangeNotifier auth state (Provider)
│   ├── models.dart                 # AppUser, AiTool, AiCategory, ChatMessage
│   └── theme.dart                  # brand colors / ThemeData
└── features/
    ├── auth/                       # login_screen.dart, register_screen.dart
    ├── home/                       # home_screen.dart (bottom nav), tools_list_screen.dart
    ├── tools/                      # tool_runner_screen.dart (generate), chat_tool_screen.dart
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

Streaming (`ApiClient.streamPost`) uses `http.Client().send()` to get a
`StreamedResponse` and reads it chunk-by-chunk with
`stream.transform(utf8.decoder)` — this is what powers the token-by-token
feel in both the tool runner screen and the chat screen, matching the web
app's `fetch` + `ReadableStream` reader.

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

## Adding a new AI tool to the mobile app

You don't need a mobile release for this — new tools created in
`/admin/tools` on the web app appear automatically in
`GET /api/tools`, which `ToolsListScreen` fetches at runtime. The mobile app
only needs a code change if a tool needs a `kind` the app doesn't already
handle (currently: `CHAT_ASSISTANT` → `ChatToolScreen`, everything else →
`ToolRunnerScreen`, including `LANDING_PAGE` — the runner screen doesn't yet
render an HTML preview like the web app's iframe does; that's the one
mobile-specific enhancement worth adding if landing-page generation becomes
a primary mobile use case).
