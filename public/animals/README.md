# 動物イラスト 納品先 (25 パターン)

BLAN AI 動物園 (R8解決市場 ブース) で表示する **動物 5 種 × 装飾語 5 種 = 25 パターン** のイラストを置くフォルダ

## 命名規則

```
{animal}_{decorator}.png
```

- 例: `lion_ohdoh.png` = 王道のライオン
- 例: `cow_kakeru.png` = 駆ける牛

## 動物キー (5 種)

| キー | 動物 | 業務領域 |
|---|---|---|
| `lion` | ライオン | 属人化・育成 |
| `cow` | 牛 | 反復作業 一気通貫 |
| `owl` | フクロウ | 専門家チェック |
| `mammoth` | マンモス | 情報蓄積・案件管理 |
| `rabbit` | ウサギ | 営業マーケ |

## 装飾語キー (5 種)

| キー | 装飾語 | アクセント色 (伝統色) |
|---|---|---|
| `ohdoh` | 王道の | 古代紫 #4D3B6E |
| `hatarakimono` | 働き者の | 山吹 #D89500 |
| `kenja` | 賢者の | 藍 #1B5C8F |
| `monoshiri` | 物知りな | 栗 #6B3F22 |
| `kakeru` | 駆ける | 緑青 #3FA66B |

## 必要ファイル (全 25 パターン)

### ライオン
- `lion_ohdoh.png` (王道のライオン)
- `lion_hatarakimono.png` (働き者のライオン)
- `lion_kenja.png` (賢者のライオン)
- `lion_monoshiri.png` (物知りなライオン)
- `lion_kakeru.png` (駆けるライオン)

### 牛
- `cow_ohdoh.png` (王道の牛)
- `cow_hatarakimono.png` (働き者の牛)
- `cow_kenja.png` (賢者の牛)
- `cow_monoshiri.png` (物知りな牛)
- `cow_kakeru.png` (駆ける牛)

### フクロウ
- `owl_ohdoh.png` (王道のフクロウ)
- `owl_hatarakimono.png` (働き者のフクロウ)
- `owl_kenja.png` (賢者のフクロウ)
- `owl_monoshiri.png` (物知りなフクロウ)
- `owl_kakeru.png` (駆けるフクロウ)

### マンモス
- `mammoth_ohdoh.png` (王道のマンモス)
- `mammoth_hatarakimono.png` (働き者のマンモス)
- `mammoth_kenja.png` (賢者のマンモス)
- `mammoth_monoshiri.png` (物知りなマンモス)
- `mammoth_kakeru.png` (駆けるマンモス)

### ウサギ
- `rabbit_ohdoh.png` (王道のウサギ)
- `rabbit_hatarakimono.png` (働き者のウサギ)
- `rabbit_kenja.png` (賢者のウサギ)
- `rabbit_monoshiri.png` (物知りなウサギ)
- `rabbit_kakeru.png` (駆けるウサギ)

## 仕様

- フォーマット: **PNG** (透過背景推奨)
- サイズ: **512 × 512 px 以上** の正方形
- 表示: ブースの結果画面で **約 280 × 280 px** にリサイズして表示
- スタイル: BLAN ブランドトンマナ (オレンジ #FB6103 + アイボリー #FAF9F6)

## フォールバック挙動

`{animal}_{decorator}.png` が存在しない場合、自動的に `{animal}.png` (動物単体) を試行 → それも無ければプレースホルダ表示。
納品途中でも壊れません。

## ファイル名 → コード の紐付け

`src/lib/types.ts` の `AnimalKey` × `DecoratorKey` と完全一致:

```typescript
type AnimalKey = "lion" | "cow" | "owl" | "mammoth" | "rabbit";
type DecoratorKey = "ohdoh" | "hatarakimono" | "kenja" | "monoshiri" | "kakeru";
```

PNG を置けば即反映されます (コード変更不要)。
