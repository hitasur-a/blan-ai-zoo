// LLM プロキシ API route (Anthropic Claude)
// クライアントから { demoKey, messages } を受けて、ストリーミングで返す
// 各デモのシステムプロンプト + モデル選定は src/lib/prompts.ts で管理

import { NextRequest } from "next/server";
import { getAnthropicClient, MODELS } from "@/lib/anthropic";
import { DEMO_PROMPTS } from "@/lib/prompts";
import type { DemoKey } from "@/lib/types";

export const runtime = "nodejs"; // Anthropic SDK は nodejs ランタイム必要

interface ChatRequestBody {
  demoKey: DemoKey;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  // 管理画面からのライブ補正 (将来) で追加システムプロンプト
  systemPromptOverride?: string;
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { demoKey, messages, systemPromptOverride } = body;

  const config = DEMO_PROMPTS[demoKey];
  if (!config) {
    return new Response(
      JSON.stringify({ error: `Unknown demoKey: ${demoKey}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // システムプロンプト構築 (ライブ補正があれば追記)
  const systemPrompt = systemPromptOverride
    ? `${config.systemPrompt}\n\n# 追加指示 (ライブ補正)\n${systemPromptOverride}`
    : config.systemPrompt;

  // モデル選定
  const model = MODELS[config.model];

  try {
    const client = getAnthropicClient();

    // ストリーミング応答
    const stream = await client.messages.stream({
      model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    // SSE 形式で返す
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
