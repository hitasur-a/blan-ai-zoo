// セミナー専用デモ: BLAN式「生きるマニュアル」共創BOT
// スライド10ページ目「02 技術継承の AI 化 / 生きるマニュアル」の LIVE DEMO 用
// 馬場代表設計のシステムプロンプト (prompts.ts の "living-manual") を /api/chat 経由で動かす
// Markdown 対応 (📘 マニュアル本体 / 📝 追記ログ の2ブロック構成を見やすく表示)

"use client";

import { useState, useRef, useEffect } from "react";
import { DemoHeader } from "@/components/DemoLayout";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const DEMO_KEY = "living-manual" as const;

export default function LivingManualPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    setErrorMessage(null);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoKey: DEMO_KEY, messages: newMessages }),
      });

      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + json.text,
                  };
                }
                return updated;
              });
            } else if (json.error) {
              throw new Error(json.error);
            }
          } catch (e) {
            if (e instanceof Error && e.message.startsWith("API error")) throw e;
          }
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleStart = () => sendMessage("スタート");
  const handleReset = () => {
    setMessages([]);
    setErrorMessage(null);
    setInput("");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper text-stone-900">
      <main className="relative mx-auto max-w-4xl px-6 py-10">
        <DemoHeader demoKey={DEMO_KEY} />

        {/* チャット領域 */}
        <div className="mt-8 flex h-[calc(100vh-280px)] min-h-[500px] flex-col rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden">
          {/* メッセージリスト */}
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <div className="space-y-3">
                  <h2 className="font-display text-2xl text-stone-900">
                    BLAN式 生きるマニュアルづくり ─ デモ版
                  </h2>
                  <p className="text-sm text-stone-600 leading-relaxed max-w-md">
                    ベテランの経験と、新人の気づきが交差して育つマニュアル。<br />
                    「育つ瞬間」を体験していただきます。
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStart}
                  disabled={isStreaming}
                >
                  スタート
                </Button>
                <p className="text-xs text-stone-400">
                  ボタンを押すか、入力欄に「スタート」と入れて Enter
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[90%] rounded-2xl px-5 py-3",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-amber-500 to-orange-700 text-white shadow-md"
                      : "bg-stone-50 text-stone-900 shadow-sm border border-stone-200/60 w-full"
                  )}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </p>
                  ) : msg.content ? (
                    <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                  ) : (
                    <span className="text-sm text-stone-400">
                      考えています...
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {errorMessage && (
            <div className="border-t border-red-200 bg-red-50 px-5 py-3 text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          {/* 入力欄 */}
          <div className="border-t border-stone-200/60 bg-[#faf9f6]/50 p-4 backdrop-blur-sm">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  messages.length === 0
                    ? "「スタート」と入力 (またはボタン)"
                    : "番号 (1〜6) を入力、または違和感をひと言で…"
                }
                disabled={isStreaming}
                className="flex-1 h-12 rounded-xl bg-white border border-stone-200 px-5 text-sm font-medium text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-[#fb6103] focus:ring-offset-2 focus:ring-offset-[#faf9f6] disabled:opacity-50"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!input.trim() || isStreaming}
              >
                送信
              </Button>
            </form>
            <div className="mt-2 flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isStreaming}
                className="text-xs"
              >
                会話をリセット
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
