import type { Forbidden, Target } from "../src/types"

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
  { id: "cursor-url", pattern: /cursor\.com/g },
  { id: "custom-mode", pattern: /Custom Mode/g },
  { id: "run-in-background", pattern: /run_in_background/g },
  { id: "cloud-environment", pattern: /environment: "/g },
]

// Terms only one target must not ship, such as another target's tool names.
export const targetForbidden: Record<Target, Forbidden[]> = {
  opencode: [],
  omp: [
    { id: "opencode-models-file", pattern: /pstack-models/g },
    { id: "opencode-subagent-tool", pattern: /`subagent` tool/g },
    { id: "opencode-background", pattern: /`background: true`/g },
    { id: "per-call-model", pattern: /`model`: |omit (?:Task )?`model`|Set `model`|subagent `model`/g },
    { id: "readonly-flag", pattern: /`readonly`|readonly: (?:true|false)|[Rr]eadonly (?:judge|strips|mode\))/g },
  ],
}

export default forbidden
