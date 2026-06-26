// 福岡よかとこ BPC 2026 ピッチ実演ページ「うちのわんこ、企業秘密です」
// クリッカー (Space / → / クリック) で台本が 1 ビートずつ進む。
// - わんこの返答は既存 /api/tts (Fish Audio・関西弁ベテラン声) で発話 + 3D 口パク
// - 日報ビューア: ワード風パネルに文面をタイプ生成、編集も可能 (contentEditable)
// - 進化: iframe に postMessage('blan-set-stage') で puppy → adult
// v1: 生マイク (STT) は後回し。台本は完全制御で事故ゼロ。題材 = 製菓 (差し替え可)。

"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ベテラン関西弁声 (senpai-wanko と同じ refId / model)
const FISH_REF_ID = "21f53a32825443d8a8977d473f8bac5b";
const FISH_MODEL = "s2-pro";

type BeatAction = "nippou" | "evolve" | null;

interface Beat {
  // 馬場代表が声に出して言うセリフ (テレプロンプタ表示)
  presenter: string;
  // わんこの返答 (発話 + 吹き出し)。null ならわんこは喋らない (説明ビートなど)
  wanko: string | null;
  // このビートで起こす演出
  action?: BeatAction;
  // 画面上の場面ラベル (進行の目印)
  scene: string;
}

// ── 台本 (製菓: 久留米のかりんとう屋を想定。差し替え可) ──────────────
const SCRIPT: Beat[] = [
  {
    scene: "朝の声かけ",
    presenter: "シロ、おはよう。今日は何からやればいい？",
    wanko:
      "おはよう！今日はまず、かりんとうの生地の仕込みからやろか。釜の温度だけ先に上げとくと、後がぐっとラクやで。焦らんでええ、一個ずつな。",
  },
  {
    scene: "日報を作る",
    presenter: "今の話、そのまま日報にまとめといて。",
    wanko: "まかしとき。さっき話した内容、日報にしといたで。これでええか？直したいとこあったら、その場で書き換えてええよ。",
    action: "nippou",
  },
  {
    scene: "育てるAIの説明",
    presenter: "このシロ、生まれたては何も知りません。会社の情報を“食べさせて”育てます。",
    wanko: "最初はまっさらや。けど、御社の手順書やベテランの勘を覚えるほど、わしはどんどん賢うなる。これが“企業秘密のわんこ”や。",
  },
  {
    scene: "心のケア",
    presenter: "シロ、今日ちょっとしんどいわ…。",
    wanko:
      "無理せんでええ。今日はこれだけやれば合格や。心に余裕があったら、もう一個だけやってみよ。なかったら、ちゃんと帰ってええんやで。",
  },
  {
    scene: "わんこの成長",
    presenter: "毎日続けると、シロも育つ。新人さんの成長と一緒に。",
    wanko: "ずいぶん一緒にやってきたなぁ。…見てみ、わしもこんなに大きゅうなった。お前さんもや。",
    action: "evolve",
  },
  {
    scene: "締め",
    presenter:
      "単なる精神論じゃない。実務で会社の利益にもなる従業員ケアを、久留米から世に広めたい。",
    wanko: null,
  },
];

// 日報ビューアに流し込む文面
const NIPPOU_LINES = [
  "業務日報　2026年6月26日（金）",
  "記入者：新人スタッフ",
  "",
  "【今日やったこと】",
  "・かりんとう生地の仕込み（釜の温度を先に上げてから着手）",
  "・先輩シロの助言で段取りを変更し、手待ち時間を短縮",
  "",
  "【気づき・困ったこと】",
  "・釜の温度が安定するまで時間がかかる。明日は始業前の点火を試す",
  "",
  "【明日の予定】",
  "・仕込みの続き ／ 包装ラインの応援",
].join("\n");

export default function PitchPage() {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(-1); // -1 = 開始前
  const [wankoLine, setWankoLine] = useState<string>("");
  const [showNippou, setShowNippou] = useState(false);
  const [nippouText, setNippouText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceMapRef = useRef<WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>>(new WeakMap());
  const rafRef = useRef<number | null>(null);
  const ttsCacheRef = useRef<Map<string, Blob>>(new Map());
  const nippouTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false); // 連打で台本が飛ぶのを防ぐ

  // ── 3D わんこへ口パク振幅を送る ──────────────────────────────
  const sendLip = useCallback((amp: number) => {
    iframeRef.current?.contentWindow?.postMessage({ type: "blan-lipsync", amp }, "*");
  }, []);
  const stopLip = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    iframeRef.current?.contentWindow?.postMessage({ type: "blan-lipsync-stop" }, "*");
  }, []);

  const startLipSync = useCallback((audio: HTMLAudioElement) => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        sendLip(Math.min(1, Math.sqrt(sum / data.length) * 5));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn("[pitch lipsync]", err);
    }
  }, [sendLip]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    stopLip();
    setIsSpeaking(false);
  }, [stopLip]);

  // ── わんこを喋らせる (キャッシュ優先) ─────────────────────────
  const speak = useCallback(async (text: string) => {
    stopSpeaking();
    setIsSpeaking(true);
    try {
      let blob = ttsCacheRef.current.get(text);
      if (!blob) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, refId: FISH_REF_ID, model: FISH_MODEL }),
        });
        if (!res.ok) throw new Error(`TTS ${res.status}`);
        blob = await res.blob();
        ttsCacheRef.current.set(text, blob);
      }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => startLipSync(audio);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        stopLip();
        setIsSpeaking(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        stopLip();
        setIsSpeaking(false);
      };
      await audio.play();
    } catch (err) {
      // 音声が出なくても字幕で台本は進む (FISH_API_KEY 未設定など)
      console.warn("[pitch TTS]", err);
      setIsSpeaking(false);
    }
  }, [startLipSync, stopLip, stopSpeaking]);

  // ── 日報をタイプ生成 ──────────────────────────────────────
  const runNippou = useCallback(() => {
    setShowNippou(true);
    setNippouText("");
    if (nippouTimerRef.current) clearInterval(nippouTimerRef.current);
    let i = 0;
    nippouTimerRef.current = setInterval(() => {
      i += 2;
      setNippouText(NIPPOU_LINES.slice(0, i));
      if (i >= NIPPOU_LINES.length && nippouTimerRef.current) {
        clearInterval(nippouTimerRef.current);
        nippouTimerRef.current = null;
      }
    }, 28);
  }, []);

  // ── ビートを再生 ─────────────────────────────────────────
  const playBeat = useCallback((beat: Beat) => {
    if (beat.action === "evolve") {
      iframeRef.current?.contentWindow?.postMessage({ type: "blan-set-stage", stage: "adult" }, "*");
    }
    if (beat.action === "nippou") {
      runNippou();
    }
    setWankoLine(beat.wanko ?? "");
    if (beat.wanko) {
      void speak(beat.wanko);
    }
  }, [runNippou, speak]);

  // ── 次へ / 前へ ─────────────────────────────────────────
  const goNext = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    setTimeout(() => (busyRef.current = false), 250);
    setIndex((prev) => {
      const next = Math.min(prev + 1, SCRIPT.length - 1);
      if (next !== prev && next >= 0) playBeat(SCRIPT[next]);
      return next;
    });
  }, [playBeat]);

  const goPrev = useCallback(() => {
    stopSpeaking();
    setIndex((prev) => {
      const back = Math.max(prev - 1, 0);
      if (back !== prev) {
        // 戻ったら日報は閉じ、進化前 (puppy) に戻す
        setShowNippou(false);
        iframeRef.current?.contentWindow?.postMessage({ type: "blan-set-stage", stage: "puppy" }, "*");
        playBeat(SCRIPT[back]);
      }
      return back;
    });
  }, [playBeat, stopSpeaking]);

  const replay = useCallback(() => {
    if (index >= 0 && SCRIPT[index]?.wanko) void speak(SCRIPT[index].wanko!);
  }, [index, speak]);

  const begin = useCallback(() => {
    setStarted(true);
    // ユーザージェスチャで AudioContext を解放
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      void audioCtxRef.current.resume();
    } catch {}
    goNext();
  }, [goNext]);

  // ── キーボード / クリッカー ───────────────────────────────
  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      // 日報編集中は無効化
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || (e.target as HTMLElement)?.isContentEditable) return;
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        goNext();
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, goNext, goPrev]);

  useEffect(() => {
    return () => {
      if (nippouTimerRef.current) clearInterval(nippouTimerRef.current);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const beat = index >= 0 ? SCRIPT[index] : null;
  const isLast = index === SCRIPT.length - 1;

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-paper select-none"
      onClick={(e) => {
        // 画面クリックでも進む (ボタン・日報パネルは除外)
        if (!started) return;
        const t = e.target as HTMLElement;
        if (t.closest("[data-no-advance]")) return;
        goNext();
      }}
    >
      {/* 3D わんこ (全面) */}
      <iframe
        ref={iframeRef}
        src="/dog-mockup/index.html"
        title="わんこ"
        className="absolute inset-0 h-full w-full border-0"
      />

      {/* 上部: ブランド + 場面ラベル */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-between px-8 py-5">
        <div className="font-display text-sm tracking-[0.25em] text-stone-500">
          BLAN ／ うちのわんこ、企業秘密です
        </div>
        {beat && (
          <div className="rounded-full bg-white/80 px-4 py-1.5 font-display text-xs tracking-wider text-[#fb6103] shadow-sm backdrop-blur-sm">
            {beat.scene}
          </div>
        )}
      </div>

      {/* わんこの吹き出し */}
      {beat?.wanko && (
        <div className="pointer-events-none absolute right-8 top-24 w-[44%] max-w-xl">
          <div className="relative rounded-3xl bg-white/92 px-7 py-6 shadow-2xl backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-display text-base font-bold text-[#fb6103]">シロ</span>
              <span className="text-xs text-stone-400">先輩わんこ</span>
              {isSpeaking && (
                <span className="ml-1 inline-flex gap-0.5">
                  <span className="h-3 w-1 animate-pulse rounded-full bg-[#fb6103]" />
                  <span className="h-3 w-1 animate-pulse rounded-full bg-[#fb6103] [animation-delay:120ms]" />
                  <span className="h-3 w-1 animate-pulse rounded-full bg-[#fb6103] [animation-delay:240ms]" />
                </span>
              )}
            </div>
            <p className="font-display text-xl leading-relaxed text-stone-900 md:text-2xl">
              {wankoLine}
            </p>
          </div>
        </div>
      )}

      {/* 日報ビューア (ワード風・編集可) */}
      {showNippou && (
        <div
          data-no-advance
          className="absolute bottom-32 left-8 w-[42%] max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-stone-200">
            <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-4 py-2">
              <span className="h-3 w-3 rounded-full bg-[#fb6103]" />
              <span className="font-display text-xs tracking-wider text-stone-600">業務日報 — 自動生成 (編集できます)</span>
            </div>
            <div
              contentEditable
              suppressContentEditableWarning
              className="min-h-[220px] whitespace-pre-wrap px-6 py-5 text-sm leading-relaxed text-stone-800 outline-none"
              style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
            >
              {nippouText}
            </div>
          </div>
        </div>
      )}

      {/* 開始オーバーレイ */}
      {!started && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-paper/95 backdrop-blur-sm">
          <div className="font-display text-xs tracking-[0.4em] text-[#fb6103]">BLAN PITCH DEMO</div>
          <h1 className="mt-5 text-center font-display text-5xl leading-tight text-stone-900 md:text-6xl">
            うちのわんこ、<br />企業秘密です
          </h1>
          <p className="mt-5 max-w-md text-center text-sm leading-relaxed text-stone-600">
            AIを育てる会社が、AIに勝てる。<br />
            新人が毎日“育てる”先輩わんこの実演デモ。
          </p>
          <button
            onClick={begin}
            data-no-advance
            className="mt-10 rounded-2xl bg-[#fb6103] px-10 py-5 font-display text-lg text-white shadow-[0_15px_40px_rgba(251,97,3,0.4)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            ▶ デモを始める
          </button>
          <p className="mt-6 text-xs text-stone-400">
            進む: クリック / Space / → ・ 戻る: ←
          </p>
        </div>
      )}

      {/* 下部: テレプロンプタ (馬場代表のセリフ) + 操作 */}
      {started && (
        <div
          data-no-advance
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 border-t border-stone-200/60 bg-white/85 px-8 py-4 backdrop-blur-md"
        >
          <div className="mx-auto flex max-w-6xl items-center gap-6">
            {/* セリフ */}
            <div className="min-w-0 flex-1">
              <div className="font-display text-[10px] tracking-[0.3em] text-stone-400">あなたのセリフ ▶</div>
              <div className="mt-1 truncate font-display text-lg text-stone-800 md:text-xl">
                {beat ? `「${beat.presenter}」` : ""}
              </div>
            </div>

            {/* 進行ドット */}
            <div className="flex items-center gap-1.5">
              {SCRIPT.map((_, i) => (
                <span
                  key={i}
                  className={
                    "h-2 rounded-full transition-all " +
                    (i === index ? "w-6 bg-[#fb6103]" : i < index ? "w-2 bg-[#fb6103]/40" : "w-2 bg-stone-300")
                  }
                />
              ))}
            </div>

            {/* 操作 */}
            <div className="flex items-center gap-2">
              <button onClick={goPrev} className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100">
                ← 前へ
              </button>
              <button onClick={replay} className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100">
                もう一度
              </button>
              <button
                onClick={goNext}
                disabled={isLast}
                className="rounded-xl bg-[#fb6103] px-5 py-2.5 font-display text-sm text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-40"
              >
                {isLast ? "完了" : "次へ ▶"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
