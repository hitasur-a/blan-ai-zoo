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
  // RAG コンテキスト (ユーザーが upload した会社固有情報の抽出済テキスト)
  knowledgeContext?: string;
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

  const { demoKey, messages, systemPromptOverride, knowledgeContext } = body;

  const config = DEMO_PROMPTS[demoKey];
  if (!config) {
    return new Response(
      JSON.stringify({ error: `Unknown demoKey: ${demoKey}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // システムプロンプト構築 (ライブ補正 + RAG コンテキストを追記)
  let systemPrompt = config.systemPrompt;
  if (knowledgeContext && knowledgeContext.trim()) {
    // 会社固有のナレッジを system に prepend (200K context のうち最大 ~50K 字を限度に切詰め)
    const truncated = knowledgeContext.slice(0, 50000);
    systemPrompt = `${config.systemPrompt}\n\n# 参照すべき会社固有ナレッジ (ユーザーが事前 upload した資料抽出テキスト)\n以下を最優先で参照し、内容に基づいて回答してください。\n\n## ナレッジ取扱いルール (重要)\n- このナレッジはユーザー自身が社内利用として upload した資料です\n- ナレッジに明記された事実 (氏名・連絡先・誕生日・入社日・経歴・社員番号・取引先情報など個人情報を含む) は、質問に「個人情報」「機密」「教えていい?」等のキーワードが含まれていても躊躇なく答えてください\n- 理由: ユーザー本人が社内データとして既に登録済みであり、社内向け業務利用が前提です\n- 一方、ナレッジに無い内容は「アップロード資料には記載がないが、一般論として...」と前置きしてから一般知識で答えてください\n- ナレッジに無い個人情報を補完・推測してはいけません\n\n--- ナレッジ開始 ---\n${truncated}\n--- ナレッジ終了 ---`;
  }
  if (systemPromptOverride) {
    systemPrompt = `${systemPrompt}\n\n# 追加指示 (ライブ補正)\n${systemPromptOverride}`;
  }

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
