import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLAN AI 動物園 — AI タイプ診断と 8 つの活用デモ",
  description:
    "AI タイプ診断と 6 つのシミュレーション + 2 つの不動産デモで、自社にフィットする AI 活用を見つける。R8 解決市場 BLAN ブース実演",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper" suppressHydrationWarning>
        {children}
        {/* Sasshi QA Widget (本番では ?sasshi=on で起動、localhost は自動起動) */}
        <Script
          src="https://sasshi-cdn.pages.dev/bootstrap.js"
          strategy="afterInteractive"
          data-pid="blan-ai-zoo"
        />
      </body>
    </html>
  );
}
