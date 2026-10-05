import type { FileMap, Rule, RuleHit } from "./types"

function apply(content: string, rule: Rule): { text: string; count: number } {
  if (typeof rule.match === "string") {
    const count = content.split(rule.match).length - 1
    const replace = rule.replace
    const text =
      typeof replace === "string" ? content.replaceAll(rule.match, () => replace) : content.replaceAll(rule.match, replace)
    return { text, count }
  }
  const count = content.match(rule.match)?.length ?? 0
  const text =
    typeof rule.replace === "string"
      ? content.replace(rule.match, rule.replace)
      : content.replace(rule.match, rule.replace as (m: string, ...rest: any[]) => string)
  return { text, count }
}

export function rewrite(files: FileMap, rules: Rule[]): { files: FileMap; hits: RuleHit[] } {
  const out: FileMap = new Map(files)
  const hits = rules.map((rule) => {
    const glob = rule.files ? new Bun.Glob(rule.files) : undefined
    let hits = 0
    for (const [path, content] of out) {
      if (typeof content !== "string" || (glob && !glob.match(path))) continue
      const { text, count } = apply(content, rule)
      hits += count
      out.set(path, text)
    }
    return { id: rule.id, hits }
  })
  return { files: out, hits }
}
