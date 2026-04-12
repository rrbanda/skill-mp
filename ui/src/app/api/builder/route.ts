import { NextRequest, NextResponse } from "next/server";

const BUILDER_AGENT_URL =
  process.env.BUILDER_AGENT_URL ?? "http://localhost:8001";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (!action || !["generate", "refine", "save"].includes(action)) {
    return NextResponse.json(
      { error: "action query param required: generate | refine | save" },
      { status: 400 }
    );
  }

  const body = await request.json();

  if (action === "save") {
    return proxySave(body);
  }

  return proxyStream(action, body);
}

async function proxyStream(
  action: string,
  body: Record<string, unknown>
): Promise<Response> {
  const upstream = await fetch(`${BUILDER_AGENT_URL}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text, { status: upstream.status });
  }

  if (!upstream.body) {
    return new Response("No stream body", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function proxySave(
  body: Record<string, unknown>
): Promise<NextResponse> {
  try {
    const upstream = await fetch(`${BUILDER_AGENT_URL}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to reach builder agent: ${message}` },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    description: "Skill Builder API. Use POST with ?action=generate|refine|save",
    endpoints: {
      "POST ?action=generate": {
        body: { description: "string", context_id: "string (optional)" },
        response: "SSE stream with agent_start, agent_output, tool_call, complete events",
      },
      "POST ?action=refine": {
        body: { feedback: "string", context_id: "string (required)" },
        response: "SSE stream",
      },
      "POST ?action=save": {
        body: { skill_content: "string", plugin: "string", skill_name: "string" },
        response: "JSON with path",
      },
    },
  });
}
