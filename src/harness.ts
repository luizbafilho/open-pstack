import type { FileMap } from "./types"

const upstreamFeatures = /\b(?:cloud agents?|cloud workers?|Bugbot|Cursor Automations?|update_state|SendToUser|cloud_base_branch|built-in PR tool|Cursor dashboard|Cursor restart|webhook routine)\b/i

export function addHarnessGuidance(files: FileMap, sourceFiles: FileMap): void {
  const skills = new Set<string>()
  for (const [path, content] of sourceFiles) {
    if (typeof content !== "string") continue
    const match = /^skills\/([^/]+)\/.+\.md$/.exec(path)
    if (match && upstreamFeatures.test(content)) skills.add(match[1]!)
  }

  for (const skill of skills) {
    const path = `skills/${skill}/SKILL.md`
    const content = files.get(path)
    if (typeof content !== "string" || content.includes("../../docs/harness.md")) continue
    files.set(
      path,
      content.replace(/^(# .*)$/m, '$1\n\nFor host-specific features, read the target guidance at [docs/harness.md](../../docs/harness.md).'),
    )
  }
}
