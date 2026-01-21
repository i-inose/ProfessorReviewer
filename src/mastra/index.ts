import { Mastra } from "@mastra/core/mastra";
import { registerApiRoute } from "@mastra/core/server";
import { chatRoute } from "@mastra/ai-sdk";

import { professorReviewer } from "./agents/professor-reviewer";
import {
  professorReviewWorkflow,
  type ReviewResult,
} from "./workflows/professor-review-workflow";

/**
 * Mastra インスタンス
 *
 * 学習ポイント:
 * - agents: 登録したAgentは chatRoute や Workflow から参照可能
 * - workflows: 登録したWorkflowは API ハンドラから呼び出し可能
 * - server.apiRoutes: カスタムAPIエンドポイントを定義
 */
export const mastra = new Mastra({
  agents: { professorReviewer },
  workflows: { professorReviewWorkflow },

  server: {
    apiRoutes: [
      /**
       * POST /review - 一括レビュー生成（Workflow使用）
       *
       * リクエスト: { code: string }
       * レスポンス: { text: string, data: ReviewResult }
       *
       * 学習ポイント:
       * - Workflow は複数ステップの処理をパイプラインで実行
       * - structuredOutput で型安全なJSON出力を保証
       */
      registerApiRoute("/review", {
        method: "POST",
        handler: async (c) => {
          const body = await c.req.json<{ code: string }>();

          const mastraInstance = c.get("mastra");
          const workflow = mastraInstance.getWorkflow("professorReviewWorkflow");

          const run = await workflow.createRun();
          const result = await run.start({ inputData: { code: body.code } });

          // Workflow の outputSchema に基づいた型
          type WorkflowOutput = {
            result: { text: string; data: ReviewResult };
          };

          const output = result as WorkflowOutput;
          return c.json(output.result);
        },
      }),

      /**
       * POST /chat - ストリーミング会話（Agent直接使用）
       *
       * リクエスト: { messages: Array<{ role: string, content: string }> }
       * レスポンス: Server-Sent Events (SSE)
       *
       * 学習ポイント:
       * - chatRoute は Vercel AI SDK 互換のストリーミングAPIを自動生成
       * - Agent の instructions がそのまま適用される
       */
      chatRoute({
        path: "/chat",
        agent: "professorReviewer",
      }),
    ],
  },
});