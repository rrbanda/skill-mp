import { NextRequest, NextResponse } from "next/server";

const BUILDER_AGENT_URL =
  process.env.BUILDER_AGENT_URL ?? "http://localhost:8001";
const BUILDER_API_KEY = process.env.BUILDER_API_KEY ?? "";

function upstreamHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (BUILDER_API_KEY) {
    headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;
  }
  return headers;
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "build") {
    return proxyGraphBuild();
  }
  if (action === "update") {
    const body = await request.json();
    return proxyGraphUpdate(body);
  }

  return NextResponse.json(
    { error: "action query param required: build | update" },
    { status: 400 }
  );
}

async function proxyGraphBuild(): Promise<Response> {
  const upstream = await fetch(`${BUILDER_AGENT_URL}/graph/build`, {
    method: "POST",
    headers: upstreamHeaders(),
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

async function proxyGraphUpdate(
  body: Record<string, unknown>
): Promise<NextResponse> {
  try {
    const upstream = await fetch(`${BUILDER_AGENT_URL}/graph/update`, {
      method: "POST",
      headers: upstreamHeaders(),
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: upstream.status });
    } catch {
      return NextResponse.json(
        { error: text || `Builder agent returned ${upstream.status}` },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to reach builder agent: ${message}` },
      { status: 502 }
    );
  }
}
