import { Mastra } from "@mastra/core/mastra";
import { professorReviewer } from "./agents/professor-reviewer";
import { professorReviewWorkflow } from "./workflows/professor-review-workflow.ts";

export const mastra = new Mastra({
  agents: {
    professorReviewer,
  },
  workflows: { professorReviewWorkflow },
});
