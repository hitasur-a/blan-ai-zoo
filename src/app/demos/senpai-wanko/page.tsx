// ① 暗黙知のAI化「先輩わんこ」 - ライオン担当
// 16 インチ横型タッチディスプレイ (1920x1080 想定) の 3 カラム構成
// 左: 大判 3D わんこ / 中: チャット / 右: サンプル質問 + 特徴

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Upload, FileText, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DemoHeader } from "@/components/DemoLayout";
import { cn } from "@/lib/utils";
import { getCachedTts, setCachedTts } from "@/lib/tts-cache";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ベテラン口調を声でも表現するための Fish Audio TTS
// 元 3d-dog-growth-mockup と同じ refId (puppy 関西弁系ベテラン声) を流用
const FISH_REF_ID = "21f53a32825443d8a8977d473f8bac5b";
const FISH_MODEL = "s2-pro";

function stripForSpeech(text: string): string {
  return text
    .replace(/[*_`#>~|]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[(（].+?[)）]/g, "")
    .trim();
}

const KNOWLEDGE_AREAS = [
  "製造業 現場知識",
  "建設業 安全管理",
  "不動産業 顧客対応",
  "新人育成 / OJT",
  "暗黙知の言語化",
];

const SUGGESTED_QUESTIONS = [
  "新人がよくやるミスって、何があるん?",
  "ベテランは現場で何を見とるん?",
  "うちの加工屋やけど、品質判断のコツは?",
  "明日から現場リーダーになる新人へ、一言アドバイス",
  "若手がすぐ辞めない教え方ってある?",
  "ベテランが若手に伝えるべき 3 つのこと",
];

const INITIAL_MESSAGE = "わんっ、よう来たな。先輩犬じゃ、30 年現場で働いてきたで。\n\n製造業も建設業も不動産業も、現場の暗黙知ってのは大体共通しとる。新人が聞きたくても聞けんかったこと、ベテランが言葉にしきれんかったこと、なんでも投げてくれ。\n\n…ま、最初は右のサンプル質問から押してみるのが手っ取り早いかもしれんな。";

export default function SenpaiWankoPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [cachedHit, setCachedHit] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // RAG: 会社固有ナレッジ
  const [knowledgeText, setKnowledgeText] = useState("");
  const [knowledgeFiles, setKnowledgeFiles] = useState<Array<{ name: string; chars: number }>>([]);
  const [isParsingKnowledge, setIsParsingKnowledge] = useState(false);
  const knowledgeInputRef = useRef<HTMLInputElement>(null);

  // LocalStorage から復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem("blan-senpai-knowledge");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.text) setKnowledgeText(data.text);
        if (data.files) setKnowledgeFiles(data.files);
      }
    } catch {}
  }, []);

  const saveKnowledge = (text: string, files: Array<{ name: string; chars: number }>) => {
    try {
      localStorage.setItem("blan-senpai-knowledge", JSON.stringify({ text, files }));
    } catch {}
  };

  const handleKnowledgeFile = async (file: File) => {
    setIsParsingKnowledge(true);
    try {
      const lower = file.name.toLowerCase();
      let text = "";
      if (lower.endsWith(".pdf")) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/parse-pdf", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "PDF 解析失敗");
        text = json.text || "";
      } else if (lower.endsWith(".txt") || lower.endsWith(".md") || file.type === "text/plain") {
        text = await file.text();
      } else {
        throw new Error("対応形式: .pdf / .txt / .md");
      }
      const trimmed = text.trim();
      if (!trimmed) throw new Error("テキスト抽出 0 字");
      // 既存の knowledge に追記
      const newText = knowledgeText
        ? `${knowledgeText}\n\n--- ${file.name} ---\n${trimmed}`
        : `--- ${file.name} ---\n${trimmed}`;
      const newFiles = [...knowledgeFiles, { name: file.name, chars: trimmed.length }];
      setKnowledgeText(newText);
      setKnowledgeFiles(newFiles);
      saveKnowledge(newText, newFiles);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsParsingKnowledge(false);
    }
  };

  const removeKnowledgeFile = (idx: number) => {
    // テキストを再構築 (この実装は単純に全削除 + 再追加が必要だが、最小実装で全 reset)
    // 代わりに UI 上だけクリアする選択肢を提供
    if (idx === -1) {
      setKnowledgeText("");
      setKnowledgeFiles([]);
      saveKnowledge("", []);
    } else {
      const newFiles = knowledgeFiles.filter((_, i) => i !== idx);
      // 個別削除は元テキスト塊から該当ファイルブロックを除去
      const targetName = knowledgeFiles[idx].name;
      const blocks = knowledgeText.split(/\n\n(?=--- )/);
      const filtered = blocks.filter((b) => !b.startsWith(`--- ${targetName} ---`));
      const newText = filtered.join("\n\n");
      setKnowledgeText(newText);
      setKnowledgeFiles(newFiles);
      saveKnowledge(newText, newFiles);
    }
  };
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceMapRef = useRef<WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>>(new WeakMap());
  const lipSyncRafRef = useRef<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // iframe に振幅を送る (lipsync)
  const sendLipsync = useCallback((amp: number) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage({ type: "blan-lipsync", amp }, "*");
    } catch {
      // ignore
    }
  }, []);

  const stopLipSync = useCallback(() => {
    if (lipSyncRafRef.current != null) {
      cancelAnimationFrame(lipSyncRafRef.current);
      lipSyncRafRef.current = null;
    }
    const iframe = iframeRef.current;
    try {
      iframe?.contentWindow?.postMessage({ type: "blan-lipsync-stop" }, "*");
    } catch {}
  }, []);

  const startLipSync = useCallback((audio: HTMLAudioElement) => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      let source = sourceMapRef.current.get(audio);
      if (!source) {
        source = ctx.createMediaElementSource(audio);
        sourceMapRef.current.set(audio, source);
      }
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (analyserRef.current !== analyser) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const amp = Math.min(1, Math.sqrt(sum / data.length) * 5);
        sendLipsync(amp);
        lipSyncRafRef.current = requestAnimationFrame(tick);
      };
      lipSyncRafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn("[lipsync init]", err);
    }
  }, [sendLipsync]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    stopLipSync();
    setIsSpeaking(false);
    setVoiceLoading(false);
  }, [stopLipSync]);

  const speak = useCallback(async (text: string) => {
    if (!voiceOn) return;
    const clean = stripForSpeech(text);
    if (!clean) return;
    stopSpeaking();
    setVoiceLoading(true);
    setCachedHit(false);
    try {
      // IndexedDB キャッシュヒット確認 → 50ms 程度で取得
      let blob = await getCachedTts(FISH_REF_ID, clean);
      if (blob) {
        setCachedHit(true);
      } else {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean, refId: FISH_REF_ID, model: FISH_MODEL }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `TTS API ${res.status}`);
        }
        blob = await res.blob();
        // キャッシュに保存 (非同期、エラー無視)
        void setCachedTts(FISH_REF_ID, clean, blob);
      }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onplay = () => {
        setVoiceLoading(false);
        setIsSpeaking(true);
        startLipSync(audio);
      };
      audio.onended = () => {
        URL.revokeObjectURL(url);
        stopLipSync();
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        stopLipSync();
        setIsSpeaking(false);
        setVoiceLoading(false);
        currentAudioRef.current = null;
      };
      await audio.play();
    } catch (err) {
      console.warn("[senpai-wanko TTS]", err);
      setVoiceLoading(false);
      setIsSpeaking(false);
    }
  }, [voiceOn, stopSpeaking, startLipSync, stopLipSync]);

  const send = async (text: string) => {
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
        body: JSON.stringify({
          demoKey: "senpai-wanko",
          messages: newMessages,
          knowledgeContext: knowledgeText || undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}: ${errBody.slice(0, 200)}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let ttsTriggered = false; // 最初の 1 文で TTS 早期起動
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
              assistantText += json.text;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: last.content + json.text };
                }
                return updated;
              });
              // 最初の文 (句点・！・？で終わる、15 文字以上) が完成したら即 TTS 起動
              // → Fish Audio API の 3-5 秒待ちをストリーミングと並列化
              if (voiceOn && !ttsTriggered) {
                const m = assistantText.match(/^[\s\S]{15,200}?[。！？]/);
                if (m) {
                  ttsTriggered = true;
                  speak(m[0]);
                }
              }
            } else if (json.error) throw new Error(json.error);
          } catch (e) {
            if (e instanceof Error && e.message.startsWith("API error")) throw e;
          }
        }
      }
      // ストリーム終了時点で TTS まだ起動してない場合 (短文すぎ等) フォールバック
      if (voiceOn && !ttsTriggered && assistantText) {
        speak(assistantText.slice(0, 200));
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    stopSpeaking();
    setMessages([{ role: "assistant", content: INITIAL_MESSAGE }]);
    setErrorMessage(null);
    setInput("");
  };

  const toggleVoice = () => {
    if (voiceOn) {
      stopSpeaking();
      setVoiceOn(false);
    } else {
      setVoiceOn(true);
    }
  };

  return (
    <div className="h-screen bg-paper text-stone-900 flex flex-col overflow-hidden">
      <main className="mx-auto max-w-[1800px] w-full px-6 pt-4 pb-2 flex-1 flex flex-col min-h-0">
        {/* ヘッダー (コンパクト) */}
        <div className="flex-shrink-0 mb-3">
          <DemoHeader
            demoKey="senpai-wanko"
            metrics={[
              { value: "30年", label: "現場経験" },
              { value: "業種横断", label: "暗黙知共通" },
              { value: "RAG", label: "ベテラン学習" },
            ]}
          />
        </div>

        {/* 2 カラム: 統一カード (わんこ+チャット) / サンプル質問 */}
        <section
          className="flex-1 min-h-0"
          style={{
            display: "grid",
            gridTemplateColumns: "2.5fr 1fr",
            gap: "1.25rem",
            overflow: "hidden",
          }}
        >
          {/* 1カラム目: 統一カード (わんこ + チャット 左右繋がり感、アスペクト比 500:370) */}
          <div className="flex items-stretch justify-center overflow-hidden">
          <div
            className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#eaf3ee] via-[#f5ecd9] to-[#fff5e8]"
            style={{
              aspectRatio: "500 / 370",
              maxHeight: "100%",
              maxWidth: "min(100%, calc((100vh - 200px) * 500 / 370))",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
            }}
          >
            {/* 左: 3D わんこ (iframe 埋め込み) */}
            <div className="relative h-full overflow-hidden">
              <iframe
                ref={iframeRef}
                src="/dog-mockup/index.html"
                className="absolute inset-0 w-full h-full border-0"
                title="3D わんこ ビューア"
              />

              {/* オーバーレイ */}
              <div className="pointer-events-none absolute inset-0 z-10">
                <div className="absolute top-5 left-5 right-32">
                  <Badge tone="orange" size="sm">SENPAI WANKO</Badge>
                  <h2 className="mt-3 font-display text-xl xl:text-2xl leading-tight text-stone-900 drop-shadow-sm">
                    30 年の現場経験を、
                    <br />
                    AI に学習させた先輩犬
                  </h2>
                </div>

                <div className="absolute top-5 right-5 rounded-2xl bg-white/85 backdrop-blur-sm px-4 py-2 shadow-md">
                  <div className="font-display text-[9px] tracking-widest text-stone-500">EXPERIENCE</div>
                  <div className="mt-0.5 font-display text-xl leading-none text-[#fb6103]">30 years</div>
                </div>

                <div className="absolute bottom-20 left-5 right-5 flex flex-wrap gap-2 justify-center">
                  {KNOWLEDGE_AREAS.map((area) => (
                    <span
                      key={area}
                      className="rounded-full bg-white/75 backdrop-blur-sm px-3.5 py-1.5 text-xs font-bold tracking-wider text-stone-700 shadow-sm"
                    >
                      {area}
                    </span>
                  ))}
                </div>

                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-stone-900/90 backdrop-blur-sm px-5 py-2 text-sm font-bold tracking-wider text-white shadow-lg whitespace-nowrap">
                  先輩犬 シロ
                </div>
              </div>
            </div>

            {/* 右: チャット (左カラムと境界なし、同じカード内、半透明背景で繋がり感) */}
            <div className="flex h-full flex-col bg-white/40 backdrop-blur-sm min-h-0">
              {/* ヘッダー */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-stone-200/40">
                <h3 className="font-display text-lg">先輩犬と話す</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleVoice}
                    title={voiceOn ? "音声 ON (タップでミュート)" : "音声 OFF (タップで ON)"}
                    className={cn(
                      "h-8 px-2 rounded-lg inline-flex items-center gap-1 text-xs font-bold transition-colors",
                      voiceOn ? (isSpeaking || voiceLoading ? "bg-amber-100 text-amber-800" : "text-stone-700 hover:bg-white/60") : "text-stone-400 hover:bg-white/60"
                    )}
                  >
                    {voiceOn ? <Volume2 size={14} className={isSpeaking || voiceLoading ? "animate-pulse" : ""} /> : <VolumeX size={14} />}
                    <span className="hidden xl:inline">
                      {voiceLoading ? "生成中" : cachedHit && isSpeaking ? "声 ⚡cache" : voiceOn ? "声 ON" : "声 OFF"}
                    </span>
                  </button>
                  <Button variant="ghost" size="sm" onClick={handleReset} disabled={isStreaming}>
                    リセット
                  </Button>
                </div>
              </div>

              {/* メッセージリスト */}
              <div className="flex-1 min-h-0 space-y-3 overflow-y-auto px-5 py-4">
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
                        "max-w-[88%] rounded-2xl px-4 py-3",
                        msg.role === "user"
                          ? "bg-gradient-to-br from-amber-500 to-orange-700 text-white shadow-md"
                          : "bg-white/90 backdrop-blur-sm text-stone-900 shadow-sm border border-stone-200/50"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="mb-1.5 flex items-center gap-2 text-xs">
                          <span className="font-bold text-[#fb6103]">シロ</span>
                          <span className="text-stone-400">先輩犬</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {msg.content || (
                          <span className="text-stone-400">考えとるところやで...</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {errorMessage && (
                <div className="mx-5 mb-2 rounded-lg bg-red-50 px-4 py-2 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              {/* 入力欄 */}
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="flex-shrink-0 flex gap-2 px-5 pb-4 pt-3"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="先輩犬に話しかけてみよう"
                  disabled={isStreaming}
                  className="flex-1 h-11 rounded-xl bg-[#faf9f6] neu-inset-sm px-4 text-sm font-medium text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-[#fb6103] focus:ring-offset-2 focus:ring-offset-[#faf9f6] disabled:opacity-50"
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
            </div>
          </div>
          </div>

          {/* 2カラム目: 会社ナレッジ + サンプル質問 + 特徴 */}
          <div className="flex h-full flex-col gap-3 overflow-y-auto min-h-0">
            {/* 会社固有ナレッジ (RAG: 質問時に context として AI に渡される) */}
            <Card variant="raised" padding="md" className="flex-shrink-0 border-2 border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-sm">📚 会社の知識を追加</h3>
                {knowledgeFiles.length > 0 && (
                  <Badge tone="success" size="sm">{knowledgeFiles.length} 件</Badge>
                )}
              </div>
              <p className="mb-2 text-[11px] leading-relaxed text-stone-700">
                自社のマニュアル / 業務手順書 / 過去事例の <span className="font-bold">PDF / .txt</span> を upload → 質問時にこの内容を参照して答える
              </p>
              <input
                ref={knowledgeInputRef}
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) await handleKnowledgeFile(f);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => knowledgeInputRef.current?.click()}
                disabled={isParsingKnowledge || isStreaming}
                className="w-full h-9 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Upload size={12} />
                {isParsingKnowledge ? "解析中..." : "資料を追加"}
              </button>
              {knowledgeFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {knowledgeFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] bg-stone-50 rounded px-2 py-1">
                      <FileText size={10} className="text-stone-500 flex-shrink-0" />
                      <span className="truncate flex-1 font-medium text-stone-800">{f.name}</span>
                      <span className="text-stone-500">{f.chars}字</span>
                      <button onClick={() => removeKnowledgeFile(i)} className="text-stone-400 hover:text-red-600 flex-shrink-0">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => removeKnowledgeFile(-1)} className="text-[10px] text-stone-500 hover:text-red-600 underline">
                    全部クリア
                  </button>
                </div>
              )}
              {knowledgeFiles.length > 0 && (
                <p className="mt-2 text-[10px] leading-relaxed text-emerald-700 font-bold">
                  ✓ 次の質問はこの資料を参照して回答します
                </p>
              )}
            </Card>

            <Card variant="raised" padding="md" className="flex-shrink-0">
              <h3 className="mb-2 font-display text-base">こんな質問はどう?</h3>
              <p className="mb-3 text-xs leading-relaxed text-stone-800">
                {knowledgeFiles.length > 0
                  ? `アップロードした資料 (${knowledgeFiles.length} 件) も踏まえて答えます。`
                  : "先輩犬に聞いてみたい質問のサンプル。タップで即送信。"}
              </p>
              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <Button
                    key={q}
                    variant="secondary"
                    size="sm"
                    onClick={() => send(q)}
                    disabled={isStreaming}
                    className="h-auto w-full justify-start py-3 px-3 text-left text-xs leading-relaxed whitespace-normal"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </Card>

            <Card variant="flat" padding="md" className="bg-white/60 backdrop-blur-sm flex-shrink-0">
              <div className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                先輩犬の特徴
              </div>
              <ul className="space-y-1.5 text-xs leading-relaxed text-stone-700">
                <li>・ベテランの判断基準を踏まえた回答</li>
                <li>・「知らないこと」 は素直に教えてくれる</li>
                <li>・新人目線で分かりやすく説明</li>
                <li>・経験談を交えて納得感ある回答</li>
              </ul>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
