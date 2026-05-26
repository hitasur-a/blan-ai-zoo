// 共通チャット UI コンポーネント (v2 トンマナ + ニューモーフィズム)
// 各デモで再利用 (① 先輩わんこ、④ HojoLog 等)

"use client";

import { useState, useRef, useEffect } from "react";
import type { DemoKey } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatProps {
  demoKey: DemoKey;
  initialMessage?: string;
  placeholder?: string;
  accentColor?: "lion" | "cow" | "owl" | "mammoth" | "rabbit";
}

const ACCENT_BG = {
  lion: "bg-gradient-to-br from-amber-500 to-orange-700",
  cow: "bg-gradient-to-br from-stone-600 to-stone-900",
  owl: "bg-gradient-to-br from-slate-600 to-slate-900",
  mammoth: "bg-gradient-to-br from-amber-700 to-stone-900",
  rabbit: "bg-gradient-to-br from-pink-500 to-rose-700",
} as const;

export default function Chat({
  demoKey,
  initialMessage,
  placeholder = "話しかけてみよう",
  accentColor = "lion",
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessage ? [{ role: "assistant", content: initialMessage }] : []
  );
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
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
        body: JSON.stringify({ demoKey, messages: newMessages }),
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

  const handleReset = () => {
    setMessages(initialMessage ? [{ role: "assistant", content: initialMessage }] : []);
    setErrorMessage(null);
  };

  return (
    <div className="flex h-[600px] flex-col rounded-2xl neu-raised overflow-hidden">
      {/* メッセージリスト */}
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="text-center text-sm text-stone-400">
            メッセージを入力して話しかけてみてください
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-5 py-3",
                msg.role === "user"
                  ? `${ACCENT_BG[accentColor]} text-white shadow-md`
                  : "bg-white/80 backdrop-blur-sm text-stone-900 shadow-sm border border-stone-200/50"
              )}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content || (
                  <span className="text-stone-400">考えています...</span>
                )}
              </p>
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
      <div className="border-t border-stone-200/50 bg-[#faf9f6]/50 p-4 backdrop-blur-sm">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={isStreaming}
            className="flex-1 h-12 rounded-xl bg-[#faf9f6] neu-inset-sm px-5 text-sm font-medium text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-[#fb6103] focus:ring-offset-2 focus:ring-offset-[#faf9f6] disabled:opacity-50"
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
  );
}
