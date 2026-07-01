// Fish Audio ASR proxy
// ブラウザからマイク録音した WAV を受け取り、Fish Audio ASR (transcribe-1) に転送
// key はサーバー側で保持、ブラウザには露出しない

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const FISH_ASR_URL = "https://api.fish.audio/v1/asr";

export async function POST(req: NextRequest) {
  if (!process.env.FISH_API_KEY) {
    return new Response(JSON.stringify({ error: "FISH_API_KEY 未設定" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: "リクエスト不正 (multipart/form-data 想定)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const audio = form.get("audio");
  const language = (form.get("language") as string) || "ja";

  if (!(audio instanceof Blob)) {
    return new Response(JSON.stringify({ error: "audio が不正" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 上限: 25MB (通常 30 秒の WAV mono 16bit 48kHz ≒ 2.8MB)
  if (audio.size > 25 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: "音声が大きすぎ (25MB以内)" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = new FormData();
  upstream.append("audio", audio, "recording.wav");
  upstream.append("language", language);

  const fishRes = await fetch(FISH_ASR_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.FISH_API_KEY}` },
    body: upstream,
  });

  if (!fishRes.ok) {
    const errText = await fishRes.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `Fish Audio ASR ${fishRes.status}: ${errText.slice(0, 200)}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const text = await fishRes.text();
  return new Response(text, {
    headers: { "Content-Type": "application/json" },
  });
}
