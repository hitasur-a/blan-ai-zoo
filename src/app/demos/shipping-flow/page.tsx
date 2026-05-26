// ⑤ 出荷業務の AI 一気通貫 - ウシ担当
// AI の判断ログ (judgments[]) をストリーミングで 1 件ずつ表示し、完了後に添え状プレビュー + CSV プレビューを展開する設計
// AI は構造化 JSON を返し、アプリ側で公式 CSV 組立 + PDF 添え状を組み上げる

"use client";

import { useMemo, useRef, useState } from "react";
import { DEMOS } from "@/data/demos";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DemoHeader } from "@/components/DemoLayout";
import { Card } from "@/components/ui/Card";

type Carrier = "yamato" | "sagawa" | "yubin";
type Tone = "formal" | "casual";
type JudgmentType = "merge" | "complete" | "flag" | "normalize" | "noop";

interface NormalizedRow {
  id: string;
  name: string;
  name_kana?: string;
  honorific?: string;
  postal_code?: string;
  prefecture?: string;
  city?: string;
  building?: string;
  phone?: string;
  quantity?: number;
  source_indices?: number[];
  row_flags?: string[];
}

interface Judgment {
  type: JudgmentType;
  row_refs?: number[];
  row_text_preview?: string[];
  confidence?: "high" | "medium" | "low";
  narrative?: string;
  result_label?: string;
}

interface LetterEntry {
  row_id: string;
  customer: string;
  body: string;
}

interface AiResult {
  input_rows?: number;
  judgments?: Judgment[];
  normalized_rows?: NormalizedRow[];
  letters?: LetterEntry[];
  global_flags?: string[];
}

// 判断バリエーション (merge / complete / flag / normalize / noop) が混ざるよう設計したサンプル
// - 行1+行2: merge 高 (フリガナ違い + 表記揺れ)
// - 行3: normalize (敬称分離)、行3+行4: merge 中 + complete (郵便番号を行3から行4へ補完)
// - 行5: complete (市町村のみ → 都道府県「熊本県」を補完)
// - 行6: flag (電話桁数不正 + 住所不完全)
const SAMPLE_DATA = `田中 太郎,福岡県久留米市東町12-3 メゾン久留米301号,090-1234-5678,3
タナカ太郎,久留米市東町12の3 メゾン久留米301,09012345678,
山田花子様,〒830-0033 福岡県久留米市天神町5-15,0942-12-3456,2
山田 花子,久留米市天神町5-15,,1
佐藤 健一郎,熊本市中央区水前寺3-8-12,096-123-4567,5
中村 三郎,福岡市博多区博多駅前,090-12,1`;

// 公式 CSV 仕様 (各業者ドキュメント実調査 2026-05-26)
// - ヤマト B2 クラウド: 97 列 (出典: contents.raku-uru.jp B2 形式)
// - 佐川 e-飛伝III: 43 列 (出典: manual.aiship.jp e飛伝Ⅲ形式)
// - 日本郵便ゆうパックプリントR: 99 列 (出典: manual.future-shop.jp PostCSV)
// アプリ側は名前・住所・電話・個数など主要フィールドのみ自動マッピング、それ以外は空欄
const CARRIER_FORMATS: Record<Carrier, { name: string; columns: string[]; spec: string; mapper: (r: NormalizedRow, idx: number) => string[]; mappedCount: number }> = {
  yamato: {
    name: "ヤマト運輸 B2 クラウド",
    spec: "発送伝票 (97 列・公式仕様準拠)",
    columns: [
      "お客様管理番号", "送り状種別", "クール区分", "伝票番号", "出荷予定日",
      "お届け予定（指定）日", "配達時間帯", "お届け先コード", "お届け先電話番号", "お届け先電話番号枝番",
      "お届け先郵便番号", "お届け先住所", "お届け先住所（アパートマンション名）", "お届け先会社・部門名１", "お届け先会社・部門名２",
      "お届け先名", "お届け先名略称カナ", "敬称", "ご依頼主コード", "ご依頼主電話番号",
      "ご依頼主電話番号枝番", "ご依頼主郵便番号", "ご依頼主住所", "ご依頼主住所（アパートマンション名）", "ご依頼主名",
      "ご依頼主略称カナ", "品名コード１", "品名１", "品名コード２", "品名２",
      "荷扱い１", "荷扱い２", "記事", "コレクト代金引換額（税込）", "コレクト内消費税額等",
      "営業所止置き", "営業所コード", "発行枚数", "個数口枠の印字", "ご請求顧客コード",
      "ご請求先分類コード", "運賃管理番号", "クロネコwebコレクト データ登録", "クロネコwebコレクト 加盟店番号", "クロネコwebコレクト 申込受付番号１",
      "クロネコwebコレクト 申込受付番号２", "クロネコwebコレクト 申込受付番号３", "お届け予定ｅメール利用区分", "お届け予定ｅメールe-mailアドレス", "入力機種",
      "お届け予定eメールメッセージ", "お届け完了eメール利用区分", "お届け完了ｅメールe-mailアドレス", "お届け完了eメールメッセージ", "クロネコ収納代行利用区分",
      "予備", "収納代行請求金額(税込)", "収納代行内消費税額等", "収納代行請求先郵便番号", "収納代行請求先住所",
      "収納代行請求先住所（アパートマンション名）", "収納代行請求先会社・部門名１", "収納代行請求先会社・部門名２", "収納代行請求先名(漢字)", "収納代行請求先名(カナ)",
      "収納代行問合せ先名(漢字)", "収納代行問合せ先郵便番号", "収納代行問合せ先住所", "収納代行問合せ先住所（アパートマンション名）", "収納代行問合せ先電話番号",
      "収納代行管理番号", "収納代行品名", "収納代行備考", "複数口くくりキー", "検索キータイトル１",
      "検索キー１", "検索キータイトル２", "検索キー２", "検索キータイトル3", "検索キー3",
      "検索キータイトル４", "検索キー４", "検索キータイトル5", "検索キー5", "予備2",
      "予備3", "投函予定メール利用区分", "投函予定メールe-mailアドレス", "投函予定メールメッセージ", "投函完了メール（お届け先宛）利用区分",
      "投函完了メール（お届け先宛）e-mailアドレス", "投函完了メール（お届け先宛）メールメッセージ", "投函完了メール（ご依頼主宛）利用区分", "投函完了メール（ご依頼主宛）e-mailアドレス", "投函完了メール（ご依頼主宛）メールメッセージ",
      "連携管理番号", "通知メールアドレス",
    ],
    mappedCount: 11,
    mapper: (r, idx) => {
      const cols = new Array(97).fill("");
      cols[0] = String(idx + 1).padStart(4, "0");
      cols[1] = "0";
      cols[2] = "0";
      cols[8] = r.phone || "";
      cols[10] = r.postal_code || "";
      cols[11] = `${r.prefecture || ""}${r.city || ""}`.trim();
      cols[12] = r.building || "";
      cols[15] = r.name || "";
      cols[16] = r.name_kana || "";
      cols[17] = r.honorific || "様";
      cols[37] = "1";
      cols[46] = "0";
      cols[50] = "0";
      return cols;
    },
  },
  sagawa: {
    name: "佐川急便 e-飛伝III",
    spec: "送り状データ (43 列・公式仕様準拠)",
    columns: [
      "住所登録コード", "お届け先電話番号", "お届け先郵便番号", "お届け先住所1", "お届け先住所2",
      "お届け先住所3", "お届け先名称1", "お届け先名称2", "お客様管理番号", "お客様コード",
      "部署・担当者", "荷送人電話番号", "ご依頼主電話番号", "ご依頼主郵便番号", "ご依頼主住所1",
      "ご依頼主住所2", "ご依頼主名称1", "ご依頼主名称2", "荷姿コード", "品名1",
      "品名2", "品名3", "品名4", "品名5", "出荷個数",
      "スピード指定", "便種（商品）", "配達日", "配達指定時間帯", "配達指定時間（時分）",
      "代引金額", "消費税", "決済種別", "保険金額", "保険金額印字",
      "指定シール１", "指定シール２", "指定シール３", "営業店止め", "ＳＲＣ区分",
      "営業店コード", "元着区分", "お問い合せ送り状No.",
    ],
    mappedCount: 11,
    mapper: (r, idx) => {
      const cols = new Array(43).fill("");
      cols[0] = String(idx + 1).padStart(6, "0");
      cols[1] = r.phone || "";
      cols[2] = r.postal_code || "";
      cols[3] = `${r.prefecture || ""}${r.city || ""}`.trim();
      cols[4] = r.building || "";
      cols[6] = r.name || "";
      cols[8] = String(idx + 1).padStart(6, "0");
      cols[24] = String(r.quantity ?? 1);
      cols[26] = "";
      cols[41] = "1";
      return cols;
    },
  },
  yubin: {
    name: "日本郵便 ゆうパックプリントR",
    spec: "発送予定データ (99 列・公式仕様準拠)",
    columns: [
      "お客様が登録されたデータ", "発送予定日", "発送予定時間区分", "出荷期限日", "到着期限日",
      "郵便種別", "保冷種別", "元／着払／代引", "書留／セキュリティ／特定記録種別", "配達時間帯指定郵便種別",
      "送り状種別", "お届け先検索キー", "お届け先郵便番号", "お届け先住所", "お届け先住所２",
      "お届け先住所３", "お届け先名称", "お届け先名称２", "お届け先敬称区分", "お届け先電話番号",
      "お届け先メールアドレス１", "お届け先局留め区分", "お届け先局留め郵便局名", "お届け先局留めメール使用区分", "お届け先局留め郵便番号",
      "お届け先配達予告メール使用区分", "お届け先再配達予告メール使用区分", "ご依頼主検索キー", "ご依頼主集荷先と同一区分", "ご依頼主郵便番号",
      "ご依頼主住所", "ご依頼主住所２", "ご依頼主住所３", "ご依頼主名称", "ご依頼主名称２",
      "ご依頼主敬称", "ご依頼主電話番号", "ご依頼主メールアドレス１", "ご依頼主荷送人指図区分", "ご依頼主お届け通知メール使用区分",
      "ご依頼主お届け通知はがき使用区分", "集荷先検索キー", "集荷先連携可否区分", "集荷先会社コード", "集荷先依頼先店所コード",
      "集荷先郵便番号", "集荷先住所", "集荷先住所２", "集荷先住所３", "集荷先名称",
      "集荷先名称２", "集荷先敬称", "集荷先電話番号", "受注番号", "こわれもの区分",
      "なまもの区分", "ビン類区分", "逆さま厳禁区分", "下積み厳禁区分", "商品サイズ／厚さ区分",
      "重量合計（ｇ）", "25kg超重量物区分", "書留損害要償額", "速達／配達日指定種別", "配達希望日",
      "配達時間帯区分", "差出方法区分", "ゆうパック複数個割引", "ゆうパック同一割引", "セット商品コード",
      "セット品名ラベル印字区分", "複数個口数", "記事名１", "記事名２", "フリー項目０１",
      "フリー項目０２", "フリー項目０３", "フリー項目０４", "フリー項目０５", "フリー項目０６",
      "フリー項目０７", "フリー項目０８", "フリー項目０９", "フリー項目１０", "空港利用区分",
      "空港送達日数局／支店コード", "航空会社名", "利用便名", "レジャー区分", "プレー・搭乗日",
      "プレー・搭乗時間", "クラブ本数", "復路集貨日", "出荷先ログインユーザ名称画面指定", "集荷希望区分",
      "集荷日付", "集荷時間帯区分", "支店連携区分", "代引金額", "代引消費税金額",
      "送り状発行年月日", "商品番号", "品名", "個数",
    ],
    mappedCount: 9,
    mapper: (r, idx) => {
      const cols = new Array(99).fill("");
      cols[0] = String(idx + 1).padStart(6, "0");
      cols[5] = "";
      cols[7] = "1";
      cols[12] = r.postal_code || "";
      cols[13] = `${r.prefecture || ""}${r.city || ""}`.trim();
      cols[14] = r.building || "";
      cols[16] = r.name || "";
      cols[19] = r.phone || "";
      cols[70] = String(r.quantity ?? 1);
      return cols;
    },
  },
};

// 判断タイプの色 / ラベル
const JUDGMENT_META: Record<JudgmentType, { label: string; badge: string; ring: string; bar: string }> = {
  merge:     { label: "同一人物",   badge: "bg-emerald-100 text-emerald-800", ring: "border-emerald-200", bar: "bg-emerald-500" },
  complete:  { label: "補完",       badge: "bg-blue-100 text-blue-800",       ring: "border-blue-200",    bar: "bg-blue-500" },
  normalize: { label: "整形",       badge: "bg-violet-100 text-violet-800",   ring: "border-violet-200",  bar: "bg-violet-500" },
  flag:      { label: "要確認",     badge: "bg-amber-100 text-amber-800",     ring: "border-amber-200",   bar: "bg-amber-500" },
  noop:      { label: "そのまま",   badge: "bg-stone-100 text-stone-700",     ring: "border-stone-200",   bar: "bg-stone-300" },
};

// 全体 JSON フェンス抽出 (完結時のみ成功)
function extractJsonFromText(text: string): AiResult | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1].trim() : text.trim();
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

// ストリーミング中、完結した judgment オブジェクトだけ抜き出す
// judgments 配列の中で先頭から { ... } のトップレベル波括弧が閉じたものを 1 件として収集
function extractCompletedJudgments(accumulated: string): Judgment[] {
  const fence = accumulated.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/);
  const body = fence ? fence[1] : accumulated;
  const keyIdx = body.indexOf('"judgments"');
  if (keyIdx < 0) return [];
  const bracketIdx = body.indexOf("[", keyIdx);
  if (bracketIdx < 0) return [];

  const results: Judgment[] = [];
  let depth = 0;
  let objStart = -1;
  let inString = false;
  let escape = false;
  for (let i = bracketIdx + 1; i < body.length; i++) {
    const ch = body[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart >= 0) {
        const slice = body.slice(objStart, i + 1);
        try {
          const obj = JSON.parse(slice) as Judgment;
          if (obj && typeof obj === "object" && typeof obj.type === "string") {
            results.push(obj);
          }
        } catch {
          // skip malformed
        }
        objStart = -1;
      }
    } else if (ch === "]" && depth === 0) {
      break;
    }
  }
  return results;
}

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function buildCsv(carrier: Carrier, rows: NormalizedRow[]): string {
  const spec = CARRIER_FORMATS[carrier];
  const header = spec.columns.map(csvEscape).join(",");
  const dataLines = rows.map((r, idx) => spec.mapper(r, idx).map(csvEscape).join(","));
  return [header, ...dataLines].join("\r\n");
}

export default function ShippingFlowPage() {
  const demo = DEMOS["shipping-flow"];
  // サンプル名簿は着地時にプリロード (= 入力。出力ではない)
  const [customerList, setCustomerList] = useState(SAMPLE_DATA);
  const [carrier, setCarrier] = useState<Carrier>("yamato");
  const [tone, setTone] = useState<Tone>("formal");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [streamedJudgments, setStreamedJudgments] = useState<Judgment[]>([]);
  const [rawText, setRawText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; bytes: number; rows: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedLetter, setCopiedLetter] = useState<number | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [activeLetterIdx, setActiveLetterIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setErrorMessage(null);
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("ファイルは 5MB 以内");
      return;
    }
    const lower = file.name.toLowerCase();
    const isCsvLike = lower.endsWith(".csv") || lower.endsWith(".txt") || lower.endsWith(".tsv");
    const isExcel = lower.endsWith(".xlsx") || lower.endsWith(".xls");
    if (!isCsvLike && !isExcel) {
      setErrorMessage("対応形式: .xlsx / .xls / .csv / .tsv / .txt");
      return;
    }
    try {
      let text = "";
      if (isExcel) {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(sheet);
      } else {
        text = await file.text();
      }
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      const rows = text.split("\n").filter((l) => l.trim().length > 0).length;
      setCustomerList(text);
      setFileInfo({ name: file.name, bytes: file.size, rows });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "ファイル読み込み失敗");
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleProcess = async () => {
    if (!customerList.trim() || isGenerating) return;
    setIsGenerating(true);
    setAiResult(null);
    setStreamedJudgments([]);
    setRawText("");
    setErrorMessage(null);
    setActiveLetterIdx(0);

    const carrierSpec = CARRIER_FORMATS[carrier];
    const carrierLabel = carrierSpec.name;
    const toneLabel = tone === "formal" ? "フォーマル (法人取引向け)" : "カジュアル (個人客向け)";

    const userMessage = `# 顧客名簿 (バラバラ・正規化前)
\`\`\`
${customerList}
\`\`\`

# 配送業者
carrier = ${carrier} (${carrierLabel} / ${carrierSpec.spec})

# 添え状トーン
${toneLabel}

# 指示
上記名簿を、入力行の登場順に 1 件ずつ判断 (judgments) しながら JSON で返してください。
judgments の出力順は入力行の順を守ってください (UI が 1 件ずつストリーム表示するため)。
添え状本文は上記トーンで 120-180 字。CSV 組立はアプリ側がやるので不要。JSON のみ返してください。`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoKey: "shipping-flow", messages: [{ role: "user", content: userMessage }] }),
      });
      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}: ${errBody.slice(0, 200)}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice("data: ".length).trim();
          if (!payload) continue;
          try {
            const json = JSON.parse(payload);
            if (json.text) {
              accumulated += json.text;
              setRawText(accumulated);
              // 完結済 judgments を抜き出して state 更新 (新規分のみカードが増える)
              const partials = extractCompletedJudgments(accumulated);
              setStreamedJudgments((prev) => (partials.length > prev.length ? partials : prev));
              // 全体 JSON が完結したら aiResult も更新 (normalized_rows / letters / global_flags)
              const parsed = extractJsonFromText(accumulated);
              if (parsed) setAiResult(parsed);
            } else if (json.error) throw new Error(json.error);
          } catch (e) {
            if (e instanceof Error && e.message.startsWith("API error")) throw e;
          }
        }
      }
      const finalParsed = extractJsonFromText(accumulated);
      if (finalParsed) {
        setAiResult(finalParsed);
        if (finalParsed.judgments?.length) setStreamedJudgments(finalParsed.judgments);
      } else {
        throw new Error("AI 出力を JSON として解釈できませんでした");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!aiResult?.normalized_rows?.length) return;
    const csv = buildCsv(carrier, aiResult.normalized_rows);
    const carrierKey = { yamato: "yamato_b2", sagawa: "sagawa_ehiden3", yubin: "yupack" }[carrier];
    const date = new Date().toISOString().slice(0, 10);
    const bom = "﻿";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${carrierKey}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportLettersPdf = async () => {
    if (!aiResult?.letters?.length || pdfBusy) return;
    setPdfBusy(true);
    try {
      const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const html2canvas = html2canvasMod.default;
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const PAGE_W = 210;
      const PAGE_H = 297;
      const MARGIN = 15;
      const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

      for (let i = 0; i < aiResult.letters.length; i++) {
        const l = aiResult.letters[i];
        const row = aiResult.normalized_rows?.find((r) => r.id === l.row_id);
        const container = document.createElement("div");
        container.style.width = `${PAGE_W - MARGIN * 2}mm`;
        container.style.padding = "0";
        container.style.fontFamily = '"Noto Sans JP", "Yu Gothic", sans-serif';
        container.style.fontSize = "12pt";
        container.style.lineHeight = "1.8";
        container.style.color = "#0f172a";
        container.style.background = "#ffffff";
        container.innerHTML = `
          <div style="text-align:right; font-size:11pt; color:#475569; margin-bottom:24mm;">${today}</div>
          <div style="font-size:14pt; font-weight:700; margin-bottom:4mm;">
            ${row?.postal_code ? `〒${row.postal_code}<br/>` : ""}
            ${row?.prefecture ?? ""}${row?.city ?? ""}${row?.building ? " " + row.building : ""}
          </div>
          <div style="font-size:18pt; font-weight:700; margin-bottom:18mm;">
            ${l.customer} <span style="font-size:14pt; font-weight:500;">${row?.honorific || "様"}</span>
          </div>
          <div style="margin-bottom:32mm; white-space:pre-wrap;">${(l.body || "").replace(/</g, "&lt;")}</div>
          <div style="text-align:right; font-size:11pt; color:#475569; line-height:1.6;">
            BLAN 株式会社<br/>
            福岡県久留米市 ○○ ${row?.quantity ? `(同梱数: ${row.quantity})` : ""}
          </div>
        `;
        container.style.position = "fixed";
        container.style.left = "-9999px";
        container.style.top = "0";
        document.body.appendChild(container);
        const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
        document.body.removeChild(container);
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const imgH = (canvas.height * (PAGE_W - MARGIN * 2)) / canvas.width;
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", MARGIN, MARGIN, PAGE_W - MARGIN * 2, Math.min(imgH, PAGE_H - MARGIN * 2));
      }
      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`shipping_attached_letters_${date}.pdf`);
    } catch (err) {
      setErrorMessage(`PDF 生成失敗: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPdfBusy(false);
    }
  };

  const copyLetter = async (idx: number, body: string) => {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedLetter(idx);
      setTimeout(() => setCopiedLetter(null), 1500);
    } catch {
      // ignore
    }
  };

  // 完了後フッターの要約
  const stats = useMemo(() => {
    const inputCount = aiResult?.input_rows ?? customerList.split("\n").filter((l) => l.trim()).length;
    const out = aiResult?.normalized_rows?.length ?? 0;
    const merges = streamedJudgments.filter((j) => j.type === "merge").length;
    const completions = streamedJudgments.filter((j) => j.type === "complete").length;
    const flags = streamedJudgments.filter((j) => j.type === "flag").length + (aiResult?.global_flags?.length ?? 0);
    const letters = aiResult?.letters?.length ?? 0;
    return { inputCount, out, merges, completions, flags, letters };
  }, [aiResult, streamedJudgments, customerList]);

  const csvPreview = useMemo(() => {
    if (!aiResult?.normalized_rows?.length) return null;
    const spec = CARRIER_FORMATS[carrier];
    return {
      header: spec.columns,
      rows: aiResult.normalized_rows.map((r, idx) => spec.mapper(r, idx)),
    };
  }, [aiResult, carrier]);

  const activeLetter = aiResult?.letters?.[activeLetterIdx];
  const activeRow = activeLetter ? aiResult?.normalized_rows?.find((r) => r.id === activeLetter.row_id) : null;
  const todayStr = useMemo(() => new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" }), []);

  return (
    <div className="min-h-screen bg-paper text-stone-900">
      <main className="mx-auto max-w-[1800px] w-full px-6 pt-4 pb-12">
        <div className="mb-3">
          <DemoHeader demoKey="shipping-flow" metrics={[
            { value: "月10h", label: "削減実績" },
            { value: "3業者", label: "公式 CSV 厳守" },
            { value: "判断", label: "AI が根拠付き" },
          ]} />
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 2.5fr) minmax(0, 1fr)", gap: "1.25rem" }}>
          <div className="flex flex-col gap-4 min-w-0">
            {/* 上段: 入力 | 判断ログ */}
            <div className="rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-stone-50 via-white to-stone-100" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {/* 左: 入力 */}
              <div className="flex flex-col bg-white/60 backdrop-blur-sm border-r border-stone-200/40 min-w-0">
                <div className="px-5 py-4 border-b border-stone-200/40">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base">顧客名簿 (バラバラ OK)</h3>
                    <Badge tone="info" size="sm">サンプル名簿 (編集可)</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">配送業者</span>
                      <select value={carrier} onChange={(e) => setCarrier(e.target.value as Carrier)} disabled={isGenerating} className="w-full h-10 rounded-xl bg-[#faf9f6] neu-inset-sm px-3 text-xs font-medium text-stone-800 outline-none focus:ring-2 focus:ring-[#fb6103] focus:ring-offset-2 focus:ring-offset-[#faf9f6] disabled:opacity-50">
                        <option value="yamato">ヤマト B2 クラウド</option>
                        <option value="sagawa">佐川 e-飛伝 III</option>
                        <option value="yubin">日本郵便ゆうパック</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">添え状トーン</span>
                      <select value={tone} onChange={(e) => setTone(e.target.value as Tone)} disabled={isGenerating} className="w-full h-10 rounded-xl bg-[#faf9f6] neu-inset-sm px-3 text-xs font-medium text-stone-800 outline-none focus:ring-2 focus:ring-[#fb6103] focus:ring-offset-2 focus:ring-offset-[#faf9f6] disabled:opacity-50">
                        <option value="formal">フォーマル</option>
                        <option value="casual">カジュアル</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div
                  className="flex-1 px-5 py-3 space-y-2"
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                >
                  <div className={`rounded-lg border-2 border-dashed transition-colors p-2 text-[11px] ${isDragging ? "border-[#fb6103] bg-orange-50" : "border-stone-200 bg-white/60"}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-stone-700 font-medium">📊 .xlsx / .csv / .tsv をドロップ or</span>
                      <button onClick={() => fileInputRef.current?.click()} disabled={isGenerating} className="text-[#fb6103] font-bold hover:underline">クリック選択</button>
                    </div>
                    {fileInfo && (
                      <div className="mt-1 text-[10px] text-stone-700 flex items-center gap-1.5">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">読込済</span>
                        <span className="truncate">{fileInfo.name}</span>
                        <span className="text-stone-500">{fileInfo.rows} 行</span>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" className="hidden" onChange={onPick} />
                  <Textarea value={customerList} onChange={(e) => setCustomerList(e.target.value)} rows={9} placeholder="名前, 住所, 電話番号, 個数 (順不同 OK)" disabled={isGenerating} className="font-mono text-xs min-h-[180px]" />
                </div>
                <div className="px-5 pb-4 pt-2 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setCustomerList(SAMPLE_DATA); setFileInfo(null); }} disabled={isGenerating}>サンプルに戻す</Button>
                  <Button variant="primary" size="md" onClick={handleProcess} disabled={!customerList.trim() || isGenerating} className="flex-1">
                    {isGenerating ? "AI が判断中..." : "AI に判断してもらう"}
                  </Button>
                </div>
              </div>

              {/* 右: 判断ログ */}
              <div className="flex flex-col bg-white/40 backdrop-blur-sm min-w-0">
                <div className="px-5 py-3 border-b border-stone-200/40 flex items-center justify-between flex-wrap gap-1">
                  <h3 className="font-display text-base">AI 判断ログ</h3>
                  <div className="flex gap-1.5">
                    {isGenerating && <Badge tone="orange" size="sm">判断中</Badge>}
                    {!isGenerating && aiResult && <Badge tone="success" size="sm">完了</Badge>}
                    {streamedJudgments.length > 0 && <Badge tone="info" size="sm">{streamedJudgments.length} 件</Badge>}
                  </div>
                </div>
                {isGenerating && streamedJudgments.length === 0 && (
                  <div className="px-5 py-2 bg-orange-50/80">
                    <div className="flex items-center gap-2 text-xs text-orange-700">
                      <div className="h-1.5 flex-1 bg-orange-200 rounded-full overflow-hidden"><div className="h-full bg-[#fb6103] animate-pulse" style={{ width: "40%" }} /></div>
                      <span className="font-bold">入力行を読み込み中...</span>
                    </div>
                  </div>
                )}
                <div className="flex-1 px-4 py-3 space-y-2">
                  {errorMessage && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">{errorMessage}</div>
                  )}
                  {!isGenerating && streamedJudgments.length === 0 && !errorMessage && (
                    <div className="rounded-xl border border-stone-200 bg-white/60 p-6 text-center text-xs text-stone-500 leading-relaxed">
                      <div className="text-3xl mb-2">⌛</div>
                      左の名簿を AI が 1 行ずつ見て、<br />
                      <strong className="text-stone-800">同一人物か · 補完できるか · 要確認か</strong> を判断します。<br />
                      ここに判断が 1 件ずつ流れます。
                    </div>
                  )}
                  {streamedJudgments.map((j, i) => {
                    const meta = JUDGMENT_META[j.type] ?? JUDGMENT_META.noop;
                    return (
                      <div key={i} className={`rounded-lg border-2 bg-white px-3 py-2 ${meta.ring} relative`}>
                        <div className={`absolute top-0 left-0 h-full w-1 ${meta.bar} rounded-l`} />
                        <div className="flex items-center gap-1.5 mb-1 pl-1">
                          <span className="text-[9px] font-mono text-stone-400">#{String(i + 1).padStart(2, "0")}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${meta.badge}`}>{meta.label}</span>
                          {j.confidence && (
                            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold text-stone-700">
                              {j.confidence === "high" ? "高" : j.confidence === "medium" ? "中" : "低"}信頼
                            </span>
                          )}
                          {j.row_refs && j.row_refs.length > 0 && (
                            <span className="text-[10px] text-stone-500">
                              行 {j.row_refs.map((r) => r + 1).join(", ")}
                            </span>
                          )}
                        </div>
                        {j.narrative && (
                          <div className="pl-1 text-[11px] leading-relaxed text-stone-800">{j.narrative}</div>
                        )}
                        {j.result_label && (
                          <div className="pl-1 mt-1 text-[10px] font-bold text-stone-700">↳ {j.result_label}</div>
                        )}
                      </div>
                    );
                  })}
                  {isGenerating && streamedJudgments.length > 0 && (
                    <div className="rounded-lg border-2 border-dashed border-stone-200 bg-white/40 px-3 py-2">
                      <div className="flex items-center gap-2 text-[11px] text-stone-500">
                        <div className="flex gap-0.5">
                          <span className="w-1 h-1 bg-stone-400 rounded-full animate-pulse" />
                          <span className="w-1 h-1 bg-stone-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                          <span className="w-1 h-1 bg-stone-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                        </div>
                        <span>次の判断を考えています...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 完了後フッター summary */}
                {aiResult && !isGenerating && (
                  <div className="grid grid-cols-5 gap-1.5 px-3 py-2 bg-white/70 border-t border-stone-200/40">
                    <div className="text-center">
                      <div className="text-[9px] text-stone-500">元行数</div>
                      <div className="text-base font-black text-stone-800">{stats.inputCount}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-stone-500">統合後</div>
                      <div className="text-base font-black text-[#fb6103]">{stats.out}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-stone-500">名寄せ</div>
                      <div className="text-base font-black text-emerald-700">{stats.merges}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-stone-500">補完</div>
                      <div className="text-base font-black text-blue-700">{stats.completions}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-stone-500">要確認</div>
                      <div className={`text-base font-black ${stats.flags > 0 ? "text-amber-700" : "text-stone-400"}`}>{stats.flags}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 下段: 出力プレビュー (添え状 | CSV) — aiResult ある時のみ */}
            {aiResult && (
              <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                {/* 添え状プレビュー */}
                {aiResult.letters && aiResult.letters.length > 0 && (
                  <div className="rounded-2xl overflow-hidden shadow-lg bg-white border border-stone-200">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-200">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-stone-800">📨 添え状プレビュー</div>
                        <span className="text-[10px] text-stone-500">({aiResult.letters.length} 通)</span>
                      </div>
                      <Button variant="secondary" size="sm" onClick={handleExportLettersPdf} disabled={pdfBusy}>
                        {pdfBusy ? "PDF 生成中..." : "PDF DL"}
                      </Button>
                    </div>
                    {/* 顧客切替タブ */}
                    {aiResult.letters.length > 1 && (
                      <div className="flex flex-wrap gap-1 px-3 py-2 bg-white border-b border-stone-100">
                        {aiResult.letters.map((l, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveLetterIdx(i)}
                            className={`text-[10px] px-2 py-1 rounded font-bold ${activeLetterIdx === i ? "bg-[#fb6103] text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
                          >
                            {l.customer}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* A4 風プレビュー (PDF 出力時のレイアウト相当) */}
                    {activeLetter && (
                      <div className="px-4 py-4 bg-stone-100">
                        <div className="bg-white shadow-md mx-auto" style={{ aspectRatio: "210 / 297", maxWidth: "100%", padding: "8% 8% 8% 8%", fontFamily: '"Noto Sans JP", "Yu Gothic", sans-serif', color: "#0f172a" }}>
                          <div className="text-right text-[10px] text-stone-500 mb-6">{todayStr}</div>
                          <div className="text-[11px] font-bold mb-2 leading-relaxed">
                            {activeRow?.postal_code && <>〒{activeRow.postal_code}<br /></>}
                            {activeRow?.prefecture}{activeRow?.city}{activeRow?.building && ` ${activeRow.building}`}
                          </div>
                          <div className="text-[15px] font-bold mb-6">
                            {activeLetter.customer} <span className="text-[11px] font-medium">{activeRow?.honorific || "様"}</span>
                          </div>
                          <div className="text-[10px] leading-relaxed whitespace-pre-wrap mb-8">{activeLetter.body}</div>
                          <div className="text-right text-[9px] text-stone-500 leading-relaxed">
                            BLAN 株式会社<br />
                            福岡県久留米市 ○○ {activeRow?.quantity ? `(同梱数: ${activeRow.quantity})` : ""}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[9px] text-stone-500">A4 縦・PDF 出力プレビュー</span>
                          <button onClick={() => copyLetter(activeLetterIdx, activeLetter.body)} className="text-[10px] font-bold text-[#fb6103] hover:underline">
                            {copiedLetter === activeLetterIdx ? "✓ コピー済" : "本文コピー"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CSV プレビュー */}
                {csvPreview && (
                  <div className="rounded-2xl overflow-hidden shadow-lg bg-white border border-stone-200">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-200">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-xs font-bold text-stone-800">📤 配送 CSV プレビュー</div>
                        <span className="text-[10px] text-stone-500">
                          {csvPreview.rows.length} 行 × {csvPreview.header.length} 列 ({CARRIER_FORMATS[carrier].mappedCount} 列自動マッピング)
                        </span>
                      </div>
                      <Button variant="secondary" size="sm" onClick={handleDownloadCsv}>.csv DL</Button>
                    </div>
                    <div className="px-3 py-2 bg-amber-50/40 border-b border-amber-100 text-[10px] text-amber-800">
                      ⚠ {CARRIER_FORMATS[carrier].name} 公式 {csvPreview.header.length} 列のうち {CARRIER_FORMATS[carrier].mappedCount} 列を AI 出力から自動マッピング、残りは空欄 (実運用は出荷主側で固定値補完)
                    </div>
                    <div className="overflow-x-auto" style={{ maxHeight: "420px" }}>
                      <table className="text-[9px] w-full">
                        <thead className="bg-stone-100 sticky top-0">
                          <tr>
                            {csvPreview.header.map((h, i) => (
                              <th key={i} className="px-1.5 py-1 text-left font-bold text-stone-700 whitespace-nowrap border-r border-stone-200">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.rows.map((row, ri) => (
                            <tr key={ri} className="border-t border-stone-100">
                              {row.map((cell, ci) => (
                                <td key={ci} className={`px-1.5 py-1 whitespace-nowrap border-r border-stone-100 ${cell ? "text-stone-800" : "bg-amber-50/60 text-amber-700"}`} title={!cell ? "空欄 (要補完)" : cell}>
                                  {cell || "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* グローバル要確認 */}
            {aiResult?.global_flags && aiResult.global_flags.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3">
                <div className="text-xs font-bold text-amber-900 mb-1">⚠ 全体の要確認</div>
                <ul className="space-y-0.5 text-[11px] text-amber-900">
                  {aiResult.global_flags.map((f, i) => <li key={i}>・ {f}</li>)}
                </ul>
              </div>
            )}

            {/* AI 全文 (debug 折り畳み) */}
            {aiResult && rawText && (
              <details className="rounded-lg bg-stone-50 px-3 py-2 text-[10px]">
                <summary className="cursor-pointer font-bold text-stone-600">AI 出力 (JSON, debug)</summary>
                <pre className="mt-1 overflow-auto max-h-40 text-[9px] font-mono text-stone-600 whitespace-pre">{rawText.slice(0, 8000)}</pre>
              </details>
            )}
          </div>

          {/* 右サイドバー */}
          <div className="flex flex-col gap-3 min-w-0">
            <Card variant="raised" padding="md">
              <h3 className="mb-2 font-display text-sm">AI が下す判断 5 種</h3>
              <ul className="space-y-2">
                {(["merge", "complete", "normalize", "flag", "noop"] as JudgmentType[]).map((t) => {
                  const meta = JUDGMENT_META[t];
                  const desc: Record<JudgmentType, string> = {
                    merge: "同一人物の重複統合 (フリガナ違い・表記揺れを根拠付きで)",
                    complete: "欠落補完 (郵便番号・都道府県を別行や市町村名から)",
                    normalize: "整形 (敬称分離・ハイフン整形などの単独行修正)",
                    flag: "要確認 (電話桁数違反・住所不完全)",
                    noop: "そのまま通過 (整っている行)",
                  };
                  return (
                    <li key={t} className="flex gap-2 items-start">
                      <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold ${meta.badge}`}>{meta.label}</span>
                      <span className="text-[11px] leading-relaxed text-stone-700 flex-1">{desc[t]}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm">
              <h3 className="mb-2 font-display text-sm">公式 CSV 仕様 (3 業者)</h3>
              <ul className="space-y-1.5">
                {Object.entries(CARRIER_FORMATS).map(([key, c]) => (
                  <li key={key} className={"text-[11px] leading-relaxed " + (key === carrier ? "border-l-2 border-[#fb6103] pl-2" : "pl-2 opacity-70")}>
                    <div className="font-bold text-stone-900">{c.name}</div>
                    <div className="text-stone-700">{c.spec} · {c.columns.length} 列 ({c.mappedCount} 列マッピング)</div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm">
              <div className="text-[11px] font-bold uppercase tracking-widest text-stone-700 mb-1">このデモの仕組み</div>
              <p className="text-[11px] leading-relaxed text-stone-800">{demo.description}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-stone-700">
                AI = 1 行ずつ判断 (judgments) + 添え状本文。判断は <strong>narrative (根拠)</strong> と <strong>result_label (結果)</strong> をセットで出力。CSV の公式列順マッピングはアプリ側コードが厳密に。
              </p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
