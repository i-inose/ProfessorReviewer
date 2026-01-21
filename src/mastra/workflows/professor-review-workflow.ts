import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * レビュー結果のスキーマ
 */
const ReviewSchema = z.object({
  title: z.string().describe("レビューのタイトル"),
  questions: z.array(
    z.object({
      question: z.string().describe("質問文"),
      intent: z.string().describe("質問の意図"),
      hint: z.string().describe("考えるヒント"),
    })
  ),
  // AIが文字列で返す場合があるので、両方受け入れる
  quickWins: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .describe("すぐできる改善点"),
});

type ReviewResult = z.infer<typeof ReviewSchema>;

/**
 * Step 1: 前処理（文字数制限）
 *
 * 学習ポイント: Workflowのステップは純粋な関数として定義できる
 */
const preprocessStep = createStep({
  id: "preprocess",
  inputSchema: z.object({ code: z.string() }),
  outputSchema: z.object({ code: z.string() }),
  execute: async ({ inputData }) => {
    const MAX_CHARS = 8000;
    const code = inputData.code.trim();

    if (code.length <= MAX_CHARS) {
      return { code };
    }

    return {
      code: code.slice(0, MAX_CHARS) + "\n// ... (文字数制限により省略)",
    };
  },
});

/**
 * Step 2: AIによるレビュー生成
 *
 * 学習ポイント:
 * - mastra.getAgent() でWorkflow内からAgentを取得
 * - structuredOutput でJSON形式を強制
 */
const generateReviewStep = createStep({
  id: "generateReview",
  inputSchema: z.object({ code: z.string() }),
  outputSchema: ReviewSchema,
  execute: async ({ inputData, mastra }) => {
    // 注意: ここでは professorReviewer を「JSON生成器」として使う
    // Agent の instructions は無視され、このプロンプトが優先される
    const agent = mastra.getAgent("professorReviewer");

    const prompt = `
あなたは経験豊富な「鬼教授」です。提出されたコードを徹底的に分析し、
そのコード固有の問題点・改善点について厳しく質問してください。

## 重要な指示
- 必ず提出されたコードの**具体的な箇所**（変数名、関数名、行の内容など）を引用して質問すること
- 汎用的な質問（「エラーハンドリングは？」など）ではなく、このコード特有の問題を指摘すること
- コードの言語・フレームワーク・文脈を理解した上で質問すること
- 質問は6〜10個程度。コードが短い場合は少なくてよい

## 質問すべき観点（該当する場合のみ）
- このコードで実際に問題になりそうな箇所
- 命名の意図が不明な変数・関数
- エッジケースやエラー時の挙動
- 設計上の疑問点
- パフォーマンスの懸念
- セキュリティリスク
- テストの書きやすさ
- 可読性・保守性

## 口調
- 厳しいが本質を突く（「〜だろ？」「〜じゃないのか？」）
- 具体的なコードを引用して指摘する
- 人格否定はしない

## 出力形式（JSON）
{
  "title": "このコードの本質的な問題を突いたタイトル",
  "questions": [
    { "question": "具体的なコードを引用した厳しい質問", "intent": "この質問で確認したいこと", "hint": "考えるヒント" }
  ],
  "quickWins": ["今すぐ直せる具体的な改善点"]
}

---
${inputData.code}
---
`.trim();

    const response = await agent.generate(prompt, {
      structuredOutput: { schema: ReviewSchema },
    });

    return response.object;
  },
});

/**
 * Step 3: 整形（Markdown形式に変換）
 *
 * 学習ポイント: AIを使わない純粋な変換処理もステップにできる
 */
const formatStep = createStep({
  id: "format",
  inputSchema: ReviewSchema,
  outputSchema: z.object({
    text: z.string(),
    data: ReviewSchema,
  }),
  execute: async ({ inputData }) => {
    const { title, questions, quickWins } = inputData;

    // Markdown形式に整形
    const questionsText = questions
      .map(
        (q, i) =>
          `### Q${i + 1}. ${q.question}\n` +
          `- **意図**: ${q.intent}\n` +
          `- **ヒント**: ${q.hint}`
      )
      .join("\n\n");

    // quickWins が文字列の場合は配列に変換
    const quickWinsArray = Array.isArray(quickWins)
      ? quickWins
      : quickWins
        ? [quickWins]
        : [];

    const quickWinsText =
      quickWinsArray.length > 0
        ? `\n\n---\n\n## すぐできる改善\n${quickWinsArray.map((w: string) => `- ${w}`).join("\n")}`
        : "";

    const text =
      `# ${title}\n\n` +
      `素人質問で恐縮ですが...\n\n` +
      `## 質問リスト\n\n${questionsText}${quickWinsText}`;

    return { text, data: inputData };
  },
});

/**
 * 教授レビュー Workflow
 *
 * 用途: /review エンドポイントでの一括レビュー生成
 * フロー: コード → 前処理 → AI生成 → 整形 → 出力
 *
 * 学習ポイント:
 * - createWorkflow() でパイプラインを定義
 * - .then() でステップを連鎖
 * - 各ステップは inputSchema/outputSchema で型安全
 */
export const professorReviewWorkflow = createWorkflow({
  id: "professorReviewWorkflow",
  inputSchema: z.object({ code: z.string() }),
  outputSchema: z.object({
    text: z.string(),
    data: ReviewSchema,
  }),
})
  .then(preprocessStep)
  .then(generateReviewStep)
  .then(formatStep)
  .commit();

// 型エクスポート（index.ts で使用）
export type { ReviewResult };
