// BLAN AI 動物園 - 診断画面 (Q1-Q5 進行 UI)
// 可逆 (戻る/やり直し)、最後に結果画面へ
// v2 トンマナ + ニューモーフィズム ボタン

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QUESTIONS } from "@/data/questions";
import type { Answer } from "@/lib/diagnosis";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function DiagnosePage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const totalQuestions = QUESTIONS.length;
  const currentQuestion = QUESTIONS[currentIndex];
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const handleChoice = (choiceId: string) => {
    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      choiceId,
    };
    const otherAnswers = answers.filter(
      (a) => a.questionId !== currentQuestion.id
    );
    const newAnswers = [...otherAnswers, newAnswer];
    setAnswers(newAnswers);

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      sessionStorage.setItem("blan-ai-zoo-answers", JSON.stringify(newAnswers));
      router.push("/diagnose/result");
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setAnswers([]);
  };

  const currentAnswer = answers.find(
    (a) => a.questionId === currentQuestion.id
  );

  return (
    <div className="min-h-screen bg-paper text-stone-900">
      <main className="mx-auto max-w-3xl px-8 py-16">
        {/* ヘッダー: プログレス */}
        <header className="mb-16">
          <div className="mb-4 flex items-center justify-between">
            <Link
              href="/"
              className="text-xs font-bold tracking-widest text-stone-500 transition-colors hover:text-[#fb6103]"
            >
              ← ポータル
            </Link>
            <Badge tone="orange" size="md">
              <span className="text-sm font-bold tracking-wider">Q{currentQuestion.number} / {totalQuestions}</span>
            </Badge>
          </div>
          {/* プログレスバー (neu-inset で凹みに、進捗は塗り) */}
          <div className="h-2 w-full rounded-full neu-inset-sm overflow-hidden">
            <div
              className="h-full rounded-full bg-[#fb6103] transition-all duration-500 shadow-[0_0_12px_rgba(251,97,3,0.4)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        {/* 設問 */}
        <section className="mb-12">
          <div className="mb-4 font-bold text-sm tracking-[0.35em] uppercase text-[#fb6103]">
            QUESTION {currentQuestion.number}
          </div>
          <h1 className="font-display text-3xl leading-relaxed text-stone-900">
            {currentQuestion.prompt}
          </h1>
        </section>

        {/* 選択肢 (ニューモーフィズム の触覚ボタン) */}
        <section className="mb-16 space-y-4">
          {currentQuestion.choices.map((choice) => {
            const isSelected = currentAnswer?.choiceId === choice.id;
            return (
              <Button
                key={choice.id}
                variant="secondary"
                active={isSelected}
                onClick={() => handleChoice(choice.id)}
                className="w-full justify-start py-6 text-left text-base font-medium leading-relaxed h-auto"
              >
                <span className="flex-1 text-left whitespace-normal">
                  {choice.label}
                </span>
              </Button>
            );
          })}
        </section>

        {/* フッター: 戻る / リセット */}
        <footer className="flex items-center justify-between border-t border-stone-200/50 pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={currentIndex === 0}
          >
            ← 前の質問へ戻る
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            最初からやり直す
          </Button>
        </footer>
      </main>
    </div>
  );
}
