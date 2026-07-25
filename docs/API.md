# API Reference

Base URL: your deployment origin (e.g. `https://app.linqkeun.ai` or
`http://localhost:3000` locally). All request/response bodies are JSON
unless noted. All timestamps are ISO 8601.

## Authentication

Every endpoint except `/api/auth/register` and `/api/auth/login` requires a
valid session. Two equivalent ways to authenticate:

- **Web (browser):** the httpOnly `linqkeun_token` cookie set by
  login/register is sent automatically on same-origin requests.
- **Mobile / any external client:** send `Authorization: Bearer <token>`,
  where `<token>` is the `token` field returned by login/register.

Unauthenticated requests to a protected endpoint return `401`:
```json
{ "error": "Not authenticated" }
```
Admin-only endpoints return `403` for non-admin users:
```json
{ "error": "Admin access required" }
```

---

## Auth

### `POST /api/auth/register`
Create an account.

Request:
```json
{ "name": "Nama Anda", "email": "you@example.com", "password": "min8char" }
```
Response `200`:
```json
{ "user": { "id": "...", "name": "...", "email": "...", "role": "USER" }, "token": "<jwt>" }
```
`409` if the email is already registered.

### `POST /api/auth/login`
```json
{ "email": "you@example.com", "password": "..." }
```
Same response shape as register. `401` on bad credentials.

### `POST /api/auth/logout`
No body. Clears the auth cookie. Mobile clients should simply discard their
stored token.

### `GET /api/auth/me`
Returns the current user for the given session.
```json
{ "user": { "id": "...", "name": "...", "email": "...", "role": "USER", "avatarUrl": null } }
```

---

## Tool catalog

### `GET /api/tools`
Public (read-only) catalog, grouped by category — used to render the
dashboard / mobile home screen.
```json
{
  "categories": [
    {
      "id": "...", "title": "Karyawan AI", "subtitle": "...",
      "tools": [
        { "id": "...", "code": "1.1", "slug": "asisten-prompting", "title": "...", "icon": "wand", "description": "...", "kind": "CHAT_ASSISTANT", "priceRupiah": 0 }
      ]
    }
  ]
}
```

### `GET /api/tools/:slug`
Single tool detail (excludes `systemPrompt`, which is server-internal).
`404` if the tool doesn't exist or is inactive.

---

## AI generation

### `POST /api/ai/generate`
For `CONTENT_GENERATION`, `LANDING_PAGE`, and `IMAGE_PROMPT` tools. Streams
the model's reply as a raw `text/plain` chunked response — **not** JSON, and
**not** SSE-framed. Read the response body as a stream of text chunks.

Request:
```json
{ "toolSlug": "landing-page-15-menit", "input": "Brief produk Anda..." }
```

Response: `200` with `Content-Type: text/plain; charset=utf-8`, body
streamed as plain text. Header `X-Tool-Kind` echoes the tool's `kind`.

`400` if you call this on a `CHAT_ASSISTANT` tool — use `/api/ai/chat`
instead. `404` if the tool doesn't exist.

A `Generation` row is persisted server-side once the stream completes (not
blocking the response).

### `POST /api/ai/chat`
For `CHAT_ASSISTANT` tools. Same streaming behavior as `/generate`, plus
conversation persistence.

Request:
```json
{ "toolSlug": "layanan-pelanggan-ai", "conversationId": "optional-existing-id", "message": "Halo, stok masih ada?" }
```
Response: streamed `text/plain` body. Header `X-Conversation-Id` gives the
conversation id — pass it back on the next turn to continue the same
thread; omit it to start a new conversation.

### `GET /api/ai/chat?conversationId=<id>`
Fetch one conversation's full message history.
```json
{ "conversation": { "id": "...", "title": "...", "messages": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }] } }
```

### `GET /api/ai/chat` (no query params)
List the current user's conversations, most recently updated first.
```json
{ "conversations": [{ "id": "...", "title": "...", "updatedAt": "...", "tool": { "slug": "...", "title": "...", "icon": "..." } }] }
```

---

## Admin (requires `role: ADMIN`)

### `GET /api/admin/stats`
```json
{ "userCount": 12, "generationCount": 340, "conversationCount": 58, "topTools": [{ "tool": { "title": "...", "slug": "..." }, "count": 40 }] }
```

### `GET /api/admin/tools`
Full tool list including `systemPrompt`, `isActive`, category info.

### `POST /api/admin/tools`
Create a new tool.
```json
{
  "categoryId": "...", "code": "1.6", "slug": "tool-baru", "title": "Tool Baru",
  "icon": "bot", "description": "...", "kind": "CONTENT_GENERATION",
  "systemPrompt": "...", "priceRupiah": 0, "isActive": true, "order": 6
}
```

### `PATCH /api/admin/tools/:id`
Partial update — send only the fields you want to change.

### `DELETE /api/admin/tools/:id`
Deletes the tool (cascades its generations/conversations).

### `GET /api/admin/users`
```json
{ "users": [{ "id": "...", "name": "...", "email": "...", "role": "USER", "createdAt": "...", "subscription": { "planCode": "free", "status": "active" }, "_count": { "generations": 12, "conversations": 3 } }] }
```

---

## Error format

Non-2xx responses are always:
```json
{ "error": "Human-readable message in Bahasa Indonesia" }
```
