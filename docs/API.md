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
```json
{ "name": "Nama Anda", "email": "you@example.com", "password": "min8char" }
```
Response `200`: `{ "user": {...}, "token": "<jwt>" }`. `409` if the email is
already registered.

### `POST /api/auth/login`
```json
{ "email": "you@example.com", "password": "..." }
```
Same response shape as register. `401` on bad credentials.

### `POST /api/auth/logout`
No body. Clears the auth cookie. Mobile clients should simply discard their
stored token.

### `GET /api/auth/me`
```json
{ "user": { "id": "...", "name": "...", "email": "...", "role": "USER", "avatarUrl": null } }
```

---

## Agents

### `GET /api/agents`
Active AI co-workers — used by the chat agent switcher and task assignment.
```json
{
  "agents": [
    {
      "id": "...", "slug": "ceo-ai", "name": "CEO AI", "roleType": "CEO",
      "title": "Chief Executive AI", "description": "...",
      "avatarIcon": "crown", "color": "#f0b429",
      "skills": ["Perencanaan strategis", "..."]
    }
  ]
}
```

---

## AI chat & orchestration

### `POST /api/ai/chat`
Send a message to one agent. **Non-streaming** — the agent may call tools
before answering, so the response is the full, final JSON (see
[AI_AGENTS.md](AI_AGENTS.md#why-chat-is-non-streaming) for why).

Request:
```json
{ "agentSlug": "finance-ai", "conversationId": "optional-existing-id", "message": "Bagaimana tren pendapatan 3 bulan terakhir?" }
```
Response `200`:
```json
{
  "conversationId": "...",
  "agent": { "id": "...", "slug": "finance-ai", "title": "Finance AI (CFO)", "roleType": "FINANCE", "color": "#34d399", "avatarIcon": "wallet" },
  "reply": {
    "content": "Pendapatan turun 16% bulan lalu...",
    "toolCalls": [{ "name": "get_business_metrics", "input": { "metricKey": "revenue" }, "result": "[...]" }]
  }
}
```
`404` if the agent doesn't exist or is inactive.

### `GET /api/ai/chat?agentSlug=<slug>`
List the current user's conversations with one agent (omit `agentSlug` for
all conversations), most recently updated first.

### `GET /api/ai/chat?conversationId=<id>`
Fetch one conversation's full message history, including `toolCalls` per
assistant message.

### `POST /api/ai/orchestrate`
"Ask the whole company": always uses the CEO agent, forced to consult at
least one specialist via `delegate_to_agent` before answering.
```json
{ "question": "Kenapa pendapatan turun dan apa yang harus kita lakukan?" }
```
Response `200`:
```json
{
  "agent": { "slug": "ceo-ai", "title": "Chief Executive AI", "...": "..." },
  "answer": "Berdasarkan masukan Finance AI dan Marketing AI...",
  "consulted": [
    { "agentSlug": "finance-ai", "result": "[finance-ai responded]: ..." },
    { "agentSlug": "marketing-ai", "result": "[marketing-ai responded]: ..." }
  ]
}
```

### `POST /api/ai/analyze`
No body. Tool-grounded structured insight for the dashboard AI Insights
panel — not persisted as a conversation.
```json
{
  "analysis": {
    "headline": "Pendapatan turun 16% bulan ini setelah 4 bulan naik.",
    "insights": ["...", "..."],
    "recommendedAction": "...",
    "watchAgentSlug": "marketing-ai"
  }
}
```

---

## Tasks

### `GET /api/tasks?status=<status>&agentSlug=<slug>`
Both filters optional.
```json
{ "tasks": [{ "id": "...", "title": "...", "description": "...", "status": "TODO", "priority": "MEDIUM", "assignedAgent": {...}, "assignedUser": null, "createdByUser": {...}, "dueDate": null, "result": null }] }
```

### `POST /api/tasks`
```json
{ "title": "...", "description": "...", "priority": "HIGH", "assignedAgentId": "optional", "assignedUserId": "optional", "dueDate": "2026-08-15" }
```

### `PATCH /api/tasks/:id`
Partial update — send only the fields you want to change (`title`,
`description`, `status`, `priority`, `assignedAgentId`, `assignedUserId`,
`dueDate`).

### `DELETE /api/tasks/:id`

### `POST /api/tasks/:id/run`
Asks the task's assigned agent to actually do the work: runs
`runAgentTurn()` against the task title/description (with the agent's usual
tools available), writes the output into `result`, and sets `status: DONE`.
`400` if the task has no assigned agent.

---

## Workflows (automation)

### `GET /api/workflows`
```json
{ "workflows": [{ "id": "...", "name": "...", "triggerType": "METRIC_THRESHOLD", "triggerConfig": {...}, "actionType": "CREATE_TASK", "actionConfig": {...}, "isActive": true, "targetAgent": {...}, "runs": [{"status":"TRIGGERED","summary":"...","createdAt":"..."}] }] }
```

### `POST /api/workflows`
```json
{
  "name": "Peringatan Penurunan Pendapatan",
  "description": "...",
  "triggerType": "METRIC_THRESHOLD",
  "triggerConfig": { "metricKey": "revenue", "comparator": "drop_percent", "value": 10 },
  "actionType": "CREATE_TASK",
  "actionConfig": { "taskTitle": "...", "taskDescription": "...", "priority": "URGENT" },
  "targetAgentId": "..."
}
```
`triggerConfig.comparator` is one of `drop_percent` | `rise_percent` |
`below` | `above`. `actionConfig` shape depends on `actionType`: `CREATE_TASK`
uses `{taskTitle, taskDescription, priority}`, `RUN_AGENT` uses `{prompt}`.

### `PATCH /api/workflows/:id` / `DELETE /api/workflows/:id`

### `POST /api/workflows/:id/run`
Evaluates the trigger and, if satisfied, executes the action. Always
returns `200` (even when skipped):
```json
{ "run": { "id": "...", "status": "TRIGGERED", "summary": "revenue (2026-07): 310 → 260 (16.1% drop). Created task \"...\"." }, "task": {...}, "agentResponse": null }
```
`status` is `SKIPPED` when the trigger condition wasn't met, with `task: null`.

---

## Knowledge base

### `GET /api/knowledge` / `POST /api/knowledge`
```json
{ "title": "...", "content": "...", "category": "finance" }
```

### `PATCH /api/knowledge/:id` / `DELETE /api/knowledge/:id`

---

## Reports & activity

### `GET /api/reports`
```json
{
  "metrics": { "revenue": [{"period":"2026-07","value":260}], "expenses": [...], "customers": [...], "tasksCompleted": [...] },
  "taskStats": { "total": 12, "byStatus": { "TODO": 4, "IN_PROGRESS": 2, "DONE": 5, "BLOCKED": 1 } },
  "agentUtilization": [{ "agentSlug": "finance-ai", "title": "...", "color": "...", "taskCount": 3, "conversationCount": 5 }]
}
```

### `GET /api/activity?limit=15`
Recent `ActivityLog` entries for the dashboard feed.

---

## Admin (requires `role: ADMIN`)

### `GET /api/admin/stats`
```json
{ "userCount": 3, "taskCount": 12, "conversationCount": 20, "activeWorkflowCount": 2, "topAgents": [{ "agent": { "title": "...", "slug": "..." }, "count": 8 }] }
```

### `GET /api/admin/agents`
Full agent list including `systemPrompt`, `tools`, `isActive`.

### `POST /api/admin/agents`
```json
{
  "slug": "legal-ai", "name": "Legal AI", "roleType": "CUSTOM", "title": "Legal AI",
  "description": "...", "systemPrompt": "...", "skills": ["..."], "tools": ["search_knowledge_base"]
}
```

### `PATCH /api/admin/agents/:id` / `DELETE /api/admin/agents/:id`

### `GET /api/admin/users`
```json
{ "users": [{ "id": "...", "name": "...", "email": "...", "role": "USER", "createdAt": "...", "subscription": {...}, "_count": { "conversations": 3, "tasksCreated": 2 } }] }
```

---

## Error format

Non-2xx responses are always:
```json
{ "error": "Human-readable message in Bahasa Indonesia" }
```
