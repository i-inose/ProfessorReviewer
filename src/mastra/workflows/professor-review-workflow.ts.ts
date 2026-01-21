import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const ReviewSchema = z.object({
  title: z.string(),
  nativeQuestions: z.array(
    z.object({
      q: z.string(),
      intent: z.string(),
      tryThis: z.string(),
    }),
  ),
  quickWins: z.array(z.string()).optional(),
});

// 文字数制限・余白整形ステップ

const preprocessStep = createStep({
  id: "preprocess",
  inputSchema: z.object({
    code: z.string(),
  }),
  outputSchema: z.object({
    code: z.string(),
  }),
  execute: async ({ inputData }) => {
    const raw = inputData.code.trim();

    const maxChars = 9000;
    const clipped =
      raw.length > maxChars
        ? raw.slice(0, maxChars) + "\n// ...文字数が上限に達しました。"
        : raw;

    return { code: clipped };
  },
});

// コードレビューステップ

const generateReviewStep = createStep({
  id: "generateReview",
  inputSchema: z.object({
    code: z.string(),
  }),
  outputSchema: ReviewSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent("professorReviewer");

    const prompt =
      `次のコードを読んで、コーディング初心者がアウトプットできるように` +
      `“素朴な質問”を5〜10個作ってください。\n\n` +
      `要件:\n` +
      `- 質問は細かい点を突く（命名、境界値、例外、責務、計算量、テスト観点など）\n` +
      `- 断定しすぎず、質問中心\n` +
      `- 出力はスキーマ通りのJSON（title, naiveQuestions[], quickWins?）\n\n` +
      `--- CODE START ---\n${inputData.code}\n--- CODE END ---`;

    const response = await agent.generate(prompt, {
      structuredOutput: {
        schema: ReviewSchema,
      },
    });

    return response.object;
  },
});

// 最終整形ステップ

const formatStep = createStep({
  id: "format",
  inputSchema: ReviewSchema,
  outputSchema: z.object({
    text: z.string(),
    data: ReviewSchema,
  }),
  execute: async ({ inputData }) => {
    const prefix = "素人質問で恐縮ですが...\n\n";

    const questionsMd = inputData.nativeQuestions
      .map(
        (x, i) =>
          `**Q${i + 1}.** ${x.q}\n- 意図: ${x.intent}\n- 手を動かす: ${x.tryThis}`,
      )
      .join("\n\n");

    const quickWinsMd =
      inputData.quickWins && inputData.quickWins.length
        ? `\n\n---\n## ついでに“秒で効く”改善\n${inputData.quickWins
            .map((s) => `- ${s}`)
            .join("\n")}`
        : "";

    const text =
      `${prefix}# ${inputData.title}\n\n` +
      `## まずは質問です（教授より）\n\n` +
      `${questionsMd}${quickWinsMd}`;

    return { text, data: inputData };
  },
});

export const professorReviewWorkflow = createWorkflow({
  id: "professorReviewWorkflow",
  inputSchema: z.object({
    code: z.string(),
  }),
  outputSchema: z.object({
    text: z.string(),
    data: ReviewSchema,
  }),
})
  .then(preprocessStep)
  .then(generateReviewStep)
  .then(formatStep)
  .commit();
