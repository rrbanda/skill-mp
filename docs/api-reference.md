# Builder Agent API Reference

The builder agent exposes a REST + SSE API on port 8001.

## Endpoints

### `GET /health`

Health check.

**Response:**

```json
{"status": "ok", "service": "skill-builder-agent"}
```

### `POST /generate`

Generate a SKILL.md from a natural language description. Returns SSE stream.

**Request body:**

```json
{
  "description": "A skill that reviews Terraform configurations",
  "plugin": "devops",
  "name": "terraform-reviewer"
}
```

**SSE events:** Progress updates followed by the generated SKILL.md content.

### `POST /refine`

Refine an existing SKILL.md with feedback. Returns SSE stream.

**Request body:**

```json
{
  "content": "existing SKILL.md content",
  "feedback": "Add more detail about security checks"
}
```

### `POST /save`

Save a SKILL.md to the registry.

**Request body:**

```json
{
  "plugin": "devops",
  "name": "terraform-reviewer",
  "content": "full SKILL.md content"
}
```

### `POST /embed`

Generate and store an embedding for a skill.

### `POST /graph/build`

Trigger a full GraphRAG pipeline rebuild. Returns SSE stream with progress events.

### `POST /graph/update`

Incremental graph update for a single skill. Returns JSON result.

**Request body:**

```json
{
  "skill_id": "devops/terraform-reviewer"
}
```
