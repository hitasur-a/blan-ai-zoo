// B. 重要事項説明書リスクチェック - フクロウ担当 (不動産業向け)
// zoo 内に直接実装 (PDF / Claude Sonnet 4.6 ストリーミング / 重要度別 / .txt 保存)

"use client";

import { DemoHeader } from "@/components/DemoLayout";
import { RiskCheckApp } from "@/components/RiskCheckApp";

const SAMPLE_EXPLANATION = `重要事項説明書 (賃貸借契約用)

1. 取引の態様
媒介

2. 物件の表示
所在地: 福岡県久留米市東町 12-3
建物名: メゾン久留米 301 号室
床面積: 55.42m2 (壁芯)
構造: 鉄筋コンクリート造 5 階建ての 3 階部分
築年月日: 2017 年 4 月

3. 占有に関する事項
現況: 賃貸中 (令和 7 年 5 月 31 日まで)
引渡時期: 令和 7 年 6 月 1 日

4. 法令に基づく制限
都市計画法: 第一種中高層住居専用地域
建ぺい率 60%、容積率 200%
建築基準法: 接道義務 4m 道路に接面

5. 私道に関する事項
私道負担: あり (前面道路の一部、通行・掘削同意 取得済)

6. ライフライン
水道: 公営水道、排水: 公共下水
電気: 九州電力、ガス: プロパンガス

7. 代金以外の金銭の授受
敷金: 賃料 1 ヶ月分
礼金: 賃料 1 ヶ月分
仲介手数料: 賃料 1.1 ヶ月分

8. 契約解除に関する事項
契約期間中の中途解約は、1 ヶ月前までに書面通知を要する
更新料: 賃料 1 ヶ月分

9. 損害賠償・違約金に関する事項
賃貸人の都合により本契約を解除する場合、賃借人に対し賃料の 3 ヶ月分相当額を違約金として支払う

10. 原状回復に関する特約
退去時の原状回復費用は、経年劣化・通常損耗の有無に関わらず、賃借人が全額負担する

11. その他特記事項
ペット飼育不可
楽器演奏不可
`;

export default function ExplanationRiskPage() {
  return (
    <div className="min-h-screen bg-paper text-stone-900">
      <main className="mx-auto max-w-[1800px] w-full px-6 pt-4 pb-6">
        <div className="mb-4">
          <DemoHeader
            demoKey="explanation-risk"
            metrics={[
              { value: "全件", label: "重要度 [高/中/低] 階層化" },
              { value: "35項目", label: "重説標準チェック観点" },
              { value: "宅建業法", label: "35条/37条 準拠" },
            ]}
          />
        </div>
        <RiskCheckApp mode="explanation" sampleText={SAMPLE_EXPLANATION} />
      </main>
    </div>
  );
}
