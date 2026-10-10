import type { Target } from "../src/types"

const slugs: Record<Target, Record<string, string>> = {
  opencode: {
    "claude-opus-5-5-max": "anthropic/claude-opus-5-5#max",
    "claude-opus-5-5-medium": "anthropic/claude-opus-5-5#medium",
    "gpt-5.6-sol-max": "openai/gpt-5.6-sol#max",
    "grok-4.7-xhigh-fast": "opencode/grok-4.7#xhigh",
    "grok-4.7-medium-fast": "opencode/grok-4.7#medium",
  },
  omp: {
    "claude-opus-5-5-max": "anthropic/claude-opus-5-5:max",
    "claude-opus-5-5-medium": "anthropic/claude-opus-5-5:medium",
    "gpt-5.6-sol-max": "openai-codex/gpt-5.6-sol:max",
    "grok-4.7-xhigh-fast": "opencode-zen/grok-4.7:xhigh",
    "grok-4.7-medium-fast": "opencode-zen/grok-4.7:medium",
  },
}

export default slugs
