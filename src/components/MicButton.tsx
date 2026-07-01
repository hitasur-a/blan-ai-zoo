"use client";

// マイクボタン: 押して録音 → もう一度押して停止 → Fish Audio ASR で文字起こし
// 認識結果は onTranscribed(text) で親コンポーネントへ返す（自動送信はしない、
// ユーザーが認識結果を確認/修正してから送信ボタンを押せるように）

import { useRef, useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RecState = "idle" | "recording" | "transcribing";

interface MicButtonProps {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

// PCM Float32 → 16bit mono WAV blob（Fish Audio ASR は webm/opus 非対応のため WAV化）
function encodeWAV(buffers: Float32Array[], sampleRate: number): Blob {
  const totalSamples = buffers.reduce((n, b) => n + b.length, 0);
  const pcm16 = new Int16Array(totalSamples);
  let offset = 0;
  for (const buf of buffers) {
    for (let i = 0; i < buf.length; i++) {
      const v = Math.max(-1, Math.min(1, buf[i]));
      pcm16[offset++] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
  }
  const dataSize = pcm16.length * 2;
  const ab = new ArrayBuffer(44 + dataSize);
  const v = new DataView(ab);
  const w = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, dataSize, true);
  new Int16Array(ab, 44).set(pcm16);
  return new Blob([ab], { type: "audio/wav" });
}

export function MicButton({ onTranscribed, disabled, className }: MicButtonProps) {
  const [state, setState] = useState<RecState>("idle");
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const buffersRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(48000);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new AudioCtx();
      const source = ac.createMediaStreamSource(stream);
      const processor = ac.createScriptProcessor(4096, 1, 1);
      buffersRef.current = [];
      processor.onaudioprocess = (e) => {
        buffersRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(ac.destination);
      ctxRef.current = ac;
      streamRef.current = stream;
      sampleRateRef.current = ac.sampleRate;
      processorRef.current = processor;
      sourceRef.current = source;
      setState("recording");
    } catch (err) {
      console.warn("[MicButton] マイク取得失敗", err);
      setState("idle");
    }
  };

  const stop = async () => {
    const ac = ctxRef.current;
    const stream = streamRef.current;
    if (!ac || !stream) return;
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    await ac.close();
    ctxRef.current = null;
    streamRef.current = null;
    processorRef.current = null;
    sourceRef.current = null;

    setState("transcribing");
    const wav = encodeWAV(buffersRef.current, sampleRateRef.current);
    try {
      const fd = new FormData();
      fd.append("audio", wav, "recording.wav");
      fd.append("language", "ja");
      const res = await fetch("/api/asr", { method: "POST", body: fd });
      if (res.ok) {
        const data = (await res.json()) as { text?: string };
        if (data.text) onTranscribed(data.text);
      } else {
        console.warn("[MicButton] ASR API error", res.status);
      }
    } catch (err) {
      console.warn("[MicButton] ASR fetch error", err);
    }
    setState("idle");
  };

  const click = () => {
    if (state === "idle") start();
    else if (state === "recording") stop();
  };

  return (
    <button
      type="button"
      onClick={click}
      disabled={disabled || state === "transcribing"}
      aria-label={
        state === "recording"
          ? "録音停止"
          : state === "transcribing"
            ? "文字起こし中"
            : "音声入力"
      }
      className={cn(
        "flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center transition-all",
        state === "idle" &&
          "bg-[#faf9f6] neu-flat text-stone-600 hover:text-[#fb6103] active:scale-95",
        state === "recording" &&
          "bg-red-500 text-white shadow-lg animate-pulse",
        state === "transcribing" && "bg-[#faf9f6] neu-inset-sm text-stone-400",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {state === "transcribing" ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}
