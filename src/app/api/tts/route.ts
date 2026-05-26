// Fish Audio TTS proxy
// 元 3d-dog-growth-mockup の generate-audio.mjs と同じ呼び出し方
// reference_id: 21f53a32825443d8a8977d473f8bac5b (puppy / 関西弁系ベテラン声)
// model: s2-pro

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const FISH_API_URL = "https://api.fish.audio/v1/tts";
const DEFAULT_REF_ID = "21f53a32825443d8a8977d473f8bac5b";
const DEFAULT_MODEL = "s2-pro";

// 演技指示マーカー (*尻尾ぶんぶん* 等) を除去
function stripStageDirections(text: string): string {
  return text
    .replace(/\*[^*]+\*/g, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  if (!process.env.FISH_API_KEY) {
    return new Response(JSON.stringify({ error: "FISH_API_KEY 未設定" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { text?: string; refId?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "リクエスト不正" }), { status: 400 });
  }
  const cleanText = stripStageDirections(body.text ?? "");
  if (!cleanText) {
    return new Response(JSON.stringify({ error: "text が空" }), { status: 400 });
  }
  if (cleanText.length > 800) {
    return new Response(JSON.stringify({ error: "テキストが長すぎ (800字以内)" }), { status: 413 });
  }

  const refId = body.refId || DEFAULT_REF_ID;
  const model = body.model || DEFAULT_MODEL;

  const fishRes = await fetch(FISH_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FISH_API_KEY}`,
      "Content-Type": "application/json",
      model,
    },
    body: JSON.stringify({
      text: cleanText,
      reference_id: refId,
      format: "mp3",
    }),
  });

  if (!fishRes.ok) {
    const errText = await fishRes.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `Fish Audio ${fishRes.status}: ${errText.slice(0, 200)}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const buf = await fishRes.arrayBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
      "Content-Length": String(buf.byteLength),
    },
  });
}
