// BLAN AI 動物園 - 来場者の入力履歴を裏で記録するクライアント側ユーティリティ
// booth 後の顧客分析・アンケート代わり用途。
// PDF 生ファイルは保存せず、抽出済テキスト + メタデータのみ。
// 同意 UI は無し (booth デモは公開イベント前提)。

"use client";

const SESSION_KEY = "blan-session-id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export interface AnalyticsEvent {
  /** どのデモか (senpai-wanko / contract-risk / explanation-risk / property-copy / skill-growth など) */
  demoKey: string;
  /** イベント種別 (chat / generate / risk-check など) */
  kind: string;
  /** 任意のキャプチャ内容 (入力テキスト・選択肢・メタデータ) */
  payload?: Record<string, unknown>;
}

/**
 * 入力履歴を Vercel Blob 経由で裏側に記録する。
 * Fire-and-forget。失敗しても UI 側には影響させない。
 */
export function logAnalytics(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      demoKey: event.demoKey,
      kind: event.kind,
      payload: event.payload || {},
      sessionId: getSessionId(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.slice(0, 200),
      referrer: document.referrer.slice(0, 200),
    });
    // keepalive=true でページ遷移時にも送信を試みる
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // ネットワーク失敗等は黙殺、UI へ影響させない
    });
  } catch {
    // ignore
  }
}
