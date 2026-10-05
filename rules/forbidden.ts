import type { Forbidden } from "../src/types"

const forbidden: Forbidden[] = [
  { id: "dot-cursor", pattern: /\.cursor\b/g },
  { id: "cursor-word", pattern: /\bCursor\b/g },
  { id: "team-kit", pattern: /cursor-team-kit/g },
  { id: "subagent-type", pattern: /subagent_type/g },
  { id: "general-purpose", pattern: /generalPurpose/g },
  { id: "ask-question", pattern: /AskQuestion/g },
  { id: "task-tool", pattern: /\bTask tool\b|`Task`/g },
  { id: "mdc", pattern: /\.mdc\b/g },
  { id: "cursor-api", pattern: /api2\.cursor\.sh/g },
  { id: "cursor-slug", pattern: /(?<![\w\/.-])(claude|gpt|grok)-[\w.-]*\d[\w.-]*/g },
  { id: "dropped-make-bot-ui", pattern: /make-bot-ui/g },
  { id: "dropped-benny", pattern: /automations\/benny/g },
]

export default forbidden
