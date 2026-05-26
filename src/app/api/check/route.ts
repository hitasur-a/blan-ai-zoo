import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { buildSystemPrompt, buildUserPrompt, type RunOptions } from "@/lib/risk-prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

interface RequestBody extends RunOptions {
  documentText: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY 未設定" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "リクエスト JSON が不正です" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { documentText, mode, perspective, propertyType } = body;
  if (!documentText || !documentText.trim()) {
    return new Response(JSON.stringify({ error: "documentText が空です" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (mode !== "contract" && mode !== "explanation") {
    return new Response(JSON.stringify({ error: "mode は contract または explanation" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const opt: RunOptions = { mode, perspective, propertyType };
  const system = buildSystemPrompt(opt);
  const user = buildUserPrompt(opt, documentText);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        const aiStream = await client.messages.stream({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 16000,
          temperature: 0.2,
          system,
          messages: [{ role: "user", content: user }],
        });

        for await (const event of aiStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ text: event.delta.text });
          }
        }
        send({ done: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
