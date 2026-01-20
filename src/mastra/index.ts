import { Mastra } from "@mastra/core/mastra";
import { professorReviewer } from "./agents/professor-reviewer";

export const mastra = new Mastra({
  agents: {
    professorReviewer,
  },
});
