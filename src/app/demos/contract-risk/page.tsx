// ② 契約書リスクチェック - フクロウ担当
// zoo 内に直接実装 (PDF / Claude Sonnet 4.6 ストリーミング / 重要度別 / .txt 保存)

"use client";

import { DemoHeader } from "@/components/DemoLayout";
import { RiskCheckApp } from "@/components/RiskCheckApp";

const SAMPLE_CONTRACT = `業務委託契約書

第1条 (目的)
甲は乙に対し、別途定める仕様書に基づくウェブサイト制作業務 (以下「本件業務」という) を委託し、乙はこれを受託する。

第2条 (委託料の支払)
1. 本件業務の対価は、金 ¥1,200,000 (税別) とする。
2. 乙は甲に対し、本契約締結日から 7 日以内に契約金額の全額を支払うものとする。
3. 支払方法は、甲が指定する銀行口座への振込とし、振込手数料は乙の負担とする。

第3条 (検収)
甲は、納品物の受領後 3 日以内に検収を行い、不具合がある場合は乙に通知するものとする。
当該期間内に通知がない場合は、検収完了とみなす。

第4条 (損害賠償)
本契約に関連して乙に損害が生じた場合、甲はその全額を賠償する責任を負うものとする。
甲の損害賠償責任には上限を設けない。

第5条 (知的財産権)
本件業務の遂行過程で生じた一切の知的財産権 (著作権、著作者人格権、特許権等を含む) は、
納品時に甲に譲渡されるものとし、乙は著作者人格権を行使しないものとする。

第6条 (秘密保持)
本契約の内容及び本件業務に関連して知り得た一切の情報は、甲乙双方の事前の書面による
承諾なく第三者に開示してはならない。本義務は本契約終了後も期限の定めなく存続する。

第7条 (契約解除)
甲は、乙に対し書面による通知の上、何らの理由なくいつでも本契約を解除することができる。
この場合、乙は既に履行した業務の対価を請求することはできない。

第8条 (管轄)
本契約に関する紛争は、東京地方裁判所を専属的合意管轄裁判所とする。
`;

export default function ContractRiskPage() {
  return (
    <div className="min-h-screen bg-paper text-stone-900">
      <main className="mx-auto max-w-[1800px] w-full px-6 pt-4 pb-6">
        <div className="mb-4">
          <DemoHeader
            demoKey="contract-risk"
            metrics={[
              { value: "全件", label: "重要度 [高/中/低] 階層化" },
              { value: "根拠条文", label: "民法/下請法/労基法 等を必須引用" },
              { value: "PDF対応", label: "ドラッグ&ドロップ" },
            ]}
          />
        </div>
        <RiskCheckApp mode="contract" sampleText={SAMPLE_CONTRACT} />
      </main>
    </div>
  );
}
