// 一度だけローカルで実行する: public/sample-pdfs/{contract,explanation}/ 配下の PDF を
// pdf-parse で事前解析し、画像 PDF は Claude Vision で抽出、manifest.json に保存。
// 実行: node scripts/prebuild-sample-pdfs.mjs

import { readFile, writeFile, readFile as readFileFs } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

// .env.local を手読みで ANTHROPIC_API_KEY を取り出し (dotenv 依存を増やさない)
const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
try {
  const envText = await readFileFs(envPath, "utf-8");
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
} catch {}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "public", "sample-pdfs");

// ラベル定義 (順序が UI のボタン表示順)
const SAMPLES = {
  contract: [
    { file: "01_sanpai.pdf", label: "産廃処理 (建設関連)", note: "業界標準の典型" },
    { file: "02_baibai.pdf", label: "不動産売買契約書", note: "今回案件 / 馬場さん用意" },
    { file: "03_kouji_ukeoi.pdf", label: "工事請負 (インフレスライド)", note: "建設業 / ⑧用" },
  ],
  explanation: [
    { file: "01_baibai.pdf", label: "不動産売買 重要事項説明書", note: "今回案件 / 馬場さん用意" },
    { file: "02_chuko_mansion.pdf", label: "中古マンション購入", note: "売買・買主目線" },
    { file: "03_tochi.pdf", label: "土地の売買・交換", note: "更地・宅地売買" },
  ],
};

async function parsePdf(buf) {
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  const fn = mod.default ?? mod;
  return await fn(buf);
}

async function extractWithClaude(buf) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const base64 = buf.toString("base64");
  const resp = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          {
            type: "text",
            text: [
              "このPDFの全テキストをそのまま書き起こしてください。",
              "要件: 解説・前置き・要約・メタコメントは出さず本文だけ。表組みはタブ区切り。段落区切りは空行。",
              "ページ境目は `---- ページ N ----`。同じ内容は2回繰り返さない。",
            ].join("\n"),
          },
        ],
      },
    ],
  });
  return resp.content.map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
}

const manifest = { contract: [], explanation: [] };

for (const mode of ["contract", "explanation"]) {
  for (const entry of SAMPLES[mode]) {
    const fullPath = join(ROOT, mode, entry.file);
    const buf = await readFile(fullPath);
    const result = await parsePdf(buf);
    let text = (result.text || "").trim();
    const pages = result.numpages || 0;
    let engine = "pdf-parse";

    // 画像 PDF (テキスト極小) は Claude Vision に fallback
    if (text.length < 200 || (pages > 0 && text.length / pages < 100)) {
      console.log(`[${mode}] ${entry.file}: pdf-parse 不足 (${text.length}字) → Claude Vision にエスカレ中...`);
      try {
        text = await extractWithClaude(buf);
        engine = "claude-vision";
      } catch (err) {
        console.error(`  ${entry.file}: Claude Vision 失敗: ${err.message}`);
      }
    }

    manifest[mode].push({
      file: entry.file,
      label: entry.label,
      note: entry.note,
      bytes: buf.length,
      pages,
      engine,
      text,
    });
    console.log(`[${mode}] ${entry.file}: ${pages}p, ${text.length}字, engine=${engine}`);
  }
}

const outPath = join(ROOT, "manifest.json");
await writeFile(outPath, JSON.stringify(manifest, null, 2), "utf-8");
console.log(`\nwrote: ${outPath}`);
