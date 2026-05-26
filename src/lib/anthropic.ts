// Anthropic SDK ラッパー
// API キーは process.env.ANTHROPIC_API_KEY から読む (.env.local + Vercel 環境変数)

import Anthropic from "@anthropic-ai/sdk";

// シングルトンクライアント
let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set in environment variables");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

// モデルキー (用途別)
export const MODELS = {
  // 通常応答・コピー生成・PDF処理
  sonnet: "claude-sonnet-4-5-20250929" as const,
  // 簡易要約・リスクスクリーニング
  haiku: "claude-haiku-4-5-20251001" as const,
} as const;

export type ModelKey = keyof typeof MODELS;
