import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file が見つかりません" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "10MB を超えるファイルです" }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // pdf-parse の index.js はモジュール初期化時に ./test/data/05-versions-space.pdf を
    // open しようとして ENOENT を吐く有名なバグがある。
    // lib/pdf-parse.js を直接 import するとそのテストコードを bypass できる
    // ref: https://gitlab.com/autokent/pdf-parse/-/issues/24
    const pdfParseMod = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = (pdfParseMod.default ?? pdfParseMod) as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
    const result = await pdfParse(buffer);

    return NextResponse.json({
      text: result.text,
      pages: result.numpages,
      filename: file.name,
      bytes: file.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `PDF 解析失敗: ${message}` }, { status: 500 });
  }
}
