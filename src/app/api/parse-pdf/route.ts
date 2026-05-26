import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, MODELS } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

// 抽出品質の閾値: 下回ったら Claude API document feature にエスカレ
const MIN_TEXT_LEN = 100;
const MIN_CHARS_PER_PAGE = 800;
const MIN_JAPANESE_RATIO = 0.4;

function japaneseRatio(text: string): number {
  if (!text) return 0;
  const chars = [...text];
  if (chars.length === 0) return 0;
  let jp = 0;
  for (const ch of chars) {
    const c = ch.codePointAt(0)!;
    if (
      (c >= 0x3040 && c <= 0x309f) || // ひらがな
      (c >= 0x30a0 && c <= 0x30ff) || // カタカナ
      (c >= 0x4e00 && c <= 0x9fff) || // CJK統合漢字
      (c >= 0x3400 && c <= 0x4dbf)    // CJK拡張A
    ) {
      jp++;
    }
  }
  return jp / chars.length;
}

function shouldEscalate(text: string, pages: number): { escalate: boolean; reason: string } {
  const t = text.trim();
  if (t.length < MIN_TEXT_LEN) {
    return { escalate: true, reason: `抽出 ${t.length} 字 (ほぼ空)` };
  }
  if (pages > 0 && t.length / pages < MIN_CHARS_PER_PAGE) {
    return { escalate: true, reason: `1ページ ${Math.round(t.length / pages)} 字 (テキスト層が部分破損の可能性)` };
  }
  const jp = japaneseRatio(t);
  if (jp < MIN_JAPANESE_RATIO) {
    return { escalate: true, reason: `日本語率 ${(jp * 100).toFixed(0)}% (文字化けの可能性)` };
  }
  return { escalate: false, reason: "" };
}

async function extractWithClaude(buffer: Buffer): Promise<string> {
  const client = getAnthropicClient();
  const base64 = buffer.toString("base64");
  const resp = await client.messages.create({
    model: MODELS.haiku,
    max_tokens: 8000,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: [
              "このPDFの全テキストをそのまま書き起こしてください。",
              "",
              "要件:",
              "- 解説・前置き・要約・メタコメントは一切出力しない。本文だけを出力する",
              "- 表組みはタブ区切り (TSV) で各行を出力し、列のラベルとデータが揃うようにする",
              "- 段落区切りは空行",
              "- 見出しは原文の文字列のまま (記号 ##, ** などは付けない)",
              "- ページの境目はわかるように `---- ページ N ----` の区切り行を入れる",
              "- 同じ内容を 2 回繰り返さない",
            ].join("\n"),
          },
        ],
      },
    ],
  });
  const text = resp.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .filter((s) => s.length > 0)
    .join("\n");
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file が見つかりません" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "10MB を超えるファイルです" }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // Step 1: ローカル pdf-parse (高速・無料)
    // pdf-parse の index.js はモジュール初期化時に ./test/data/05-versions-space.pdf を
    // open しようとして ENOENT を吐く有名なバグがある。
    // lib/pdf-parse.js を直接 import するとそのテストコードを bypass できる
    let parseText = "";
    let pages = 0;
    let parseError: string | null = null;
    try {
      const pdfParseMod = await import("pdf-parse/lib/pdf-parse.js");
      const pdfParse = (pdfParseMod.default ?? pdfParseMod) as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
      const result = await pdfParse(buffer);
      parseText = result.text || "";
      pages = result.numpages || 0;
    } catch (err) {
      parseError = err instanceof Error ? err.message : String(err);
    }

    // Step 2: 抽出品質チェック → 不足なら Claude API document feature にフォールバック
    const decision = parseError
      ? { escalate: true, reason: `pdf-parse 失敗: ${parseError}` }
      : shouldEscalate(parseText, pages);

    if (!decision.escalate) {
      console.log(`[parse-pdf] pdf-parse OK (${parseText.length}字 / ${pages}p)`);
      return NextResponse.json({
        text: parseText,
        pages,
        filename: file.name,
        bytes: file.size,
        engine: "pdf-parse",
      });
    }

    console.log(`[parse-pdf] エスカレ → claude-vision: ${decision.reason}`);
    try {
      const claudeText = await extractWithClaude(buffer);
      console.log(`[parse-pdf] claude-vision OK (${claudeText.length}字 / ${pages || "?"}p)`);
      return NextResponse.json({
        text: claudeText,
        pages,
        filename: file.name,
        bytes: file.size,
        engine: "claude-vision",
        fallbackReason: decision.reason,
      });
    } catch (claudeErr) {
      const msg = claudeErr instanceof Error ? claudeErr.message : String(claudeErr);
      console.warn(`[parse-pdf] claude-vision も失敗: ${msg}`);
      // Claude も失敗 → pdf-parse の結果が空でなければそれを返す
      if (parseText.trim().length > 0) {
        return NextResponse.json({
          text: parseText,
          pages,
          filename: file.name,
          bytes: file.size,
          engine: "pdf-parse",
          fallbackError: `Claude エスカレ失敗 (${msg}) のため pdf-parse 結果を返却`,
        });
      }
      return NextResponse.json({ error: `PDF 解析失敗 (pdf-parse + Claude 両方失敗): ${msg}` }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `PDF 解析失敗: ${message}` }, { status: 500 });
  }
}
