import { join } from "node:path"
import allow from "../rules/allow"
import common from "../rules/common"
import drop from "../rules/drop"
import forbidden from "../rules/forbidden"
import opencode from "../rules/opencode"
import slugs from "../rules/slugs"
import { convertAgents } from "./agents"
import { emit } from "./emit"
import { normalizeSkills, parseFrontmatter } from "./frontmatter"
import { formatFindings, lint } from "./lint"
import { loadTree } from "./load"
import { rewrite } from "./rewrite"
import { select } from "./select"
import type { Rule, Upstream } from "./types"

const root = join(import.meta.dir, "..")
const reportIndex = process.argv.indexOf("--report")
const reportPath = reportIndex === -1 ? undefined : process.argv[reportIndex + 1]

const upstream = (await Bun.file(join(root, "upstream", "UPSTREAM.json")).json()) as Upstream
const selected = select(await loadTree(join(root, "upstream", "pstack")), drop)

const potetoSkill = selected.get("skills/poteto-mode/SKILL.md")
if (typeof potetoSkill !== "string") throw new Error("upstream has no skills/poteto-mode/SKILL.md")
const reminder = String(parseFrontmatter(potetoSkill).doc.get("reminder"))

const slugRules: Rule[] = Object.entries(slugs.opencode)
  .sort(([a], [b]) => b.length - a.length)
  .map(([slug, id]) => ({ id: `slug:${slug}`, match: slug, replace: id }))

const rewritten = rewrite(normalizeSkills(selected), [...common, ...opencode, ...slugRules])
const files = convertAgents(rewritten.files, { reminder })

for (const [path, content] of await loadTree(join(root, "adapters", "opencode"))) files.set(path, content)

const pkg = JSON.parse(files.get("package.json") as string) as Record<string, unknown>
pkg.version = upstream.version
pkg.pstack = { ...(pkg.pstack as object | undefined), upstreamSha: upstream.sha }
files.set("package.json", `${JSON.stringify(pkg, null, 2)}\n`)

const findings = lint({ files, hits: rewritten.hits, forbidden, allow })
if (findings.length > 0) {
  const report = formatFindings(findings)
  process.stderr.write(report)
  if (reportPath) await Bun.write(reportPath, report)
  process.stderr.write(`${findings.length} lint finding(s); dist/ left untouched\n`)
  process.exit(1)
}

await emit(files, join(root, "dist", "opencode"))
