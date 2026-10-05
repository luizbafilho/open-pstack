import type { Allow, FileMap, Finding, Forbidden, RuleHit } from "./types"

export function lint(input: { files: FileMap; hits: RuleHit[]; forbidden: Forbidden[]; allow: Allow[] }): Finding[] {
  const findings: Finding[] = []
  const usedAllows = new Set<Allow>()

  for (const [file, content] of input.files) {
    if (typeof content !== "string") continue
    const allows = input.allow.filter((a) => a.file === file)
    content.split("\n").forEach((text, index) => {
      for (const { id, pattern } of input.forbidden) {
        pattern.lastIndex = 0
        if (!pattern.test(text)) continue
        const allowed = allows.filter((a) => text.includes(a.text))
        if (allowed.length > 0) {
          allowed.forEach((a) => usedAllows.add(a))
          continue
        }
        findings.push({ file, line: index + 1, kind: "leftover", pattern: id, text })
      }
    })
  }

  for (const { id, hits } of input.hits) {
    if (hits === 0) findings.push({ file: "", line: 0, kind: "dead-rule", pattern: id, text: "" })
  }

  for (const a of input.allow) {
    if (!usedAllows.has(a)) findings.push({ file: a.file, line: 0, kind: "dead-allow", pattern: "", text: a.text })
  }

  return findings.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.kind.localeCompare(b.kind),
  )
}

export function formatFindings(findings: Finding[]): string {
  return findings.map((f) => `- \`${f.file}:${f.line}\` ${f.kind} \`${f.pattern}\`: ${f.text}`).join("\n") + "\n"
}
