import { join } from "node:path"
import allow from "../rules/allow"
import common from "../rules/common"
import drop from "../rules/drop"
import forbidden, { targetForbidden } from "../rules/forbidden"
import omp from "../rules/omp"
import opencode from "../rules/opencode"
import slugs from "../rules/slugs"
import { convertAgents, convertOmpAgents } from "./agents"
import { emit } from "./emit"
import { normalizeSkills, parseFrontmatter } from "./frontmatter"
import { formatFindings, lint } from "./lint"
import { loadTree } from "./load"
import { rewrite } from "./rewrite"
import { select } from "./select"
import type { FileMap, Finding, Rule, Target, Upstream } from "./types"

const root = join(import.meta.dir, "..")
const reportIndex = process.argv.indexOf("--report")
const reportPath = reportIndex === -1 ? undefined : process.argv[reportIndex + 1]

const upstream = (await Bun.file(join(root, "upstream", "UPSTREAM.json")).json()) as Upstream
const selected = select(await loadTree(join(root, "upstream", "pstack")), drop)

const potetoSkill = selected.get("skills/poteto-mode/SKILL.md")
if (typeof potetoSkill !== "string") throw new Error("upstream has no skills/poteto-mode/SKILL.md")
const reminder = String(parseFrontmatter(potetoSkill).doc.get("reminder"))

const skillIds = [...selected.keys()].flatMap((path) => /^skills\/([^/]+)\/SKILL\.md$/.exec(path)?.[1] ?? [])

// omp registers skills as `/skill:<id>`, never as a bare `/<id>`.
const skillCommands: Rule = {
  id: "skill-commands",
  match: new RegExp(`(?<![\\w./:-])/(${[...skillIds].sort((a, b) => b.length - a.length).join("|")})(?![\\w-])`, "g"),
  replace: "/skill:$1",
}

type TargetSpec = { rules: Rule[]; agents: (files: FileMap) => FileMap }

const targets: Record<Target, TargetSpec> = {
  opencode: { rules: [...common, ...opencode], agents: (files) => convertAgents(files, { reminder }) },
  omp: { rules: [...common, ...omp, skillCommands], agents: (files) => convertOmpAgents(files, slugs.omp) },
}

function slugRules(target: Target): Rule[] {
  return Object.entries(slugs[target])
    .sort(([a], [b]) => b.length - a.length)
    .map(([slug, id]) => ({ id: `slug:${slug}`, match: slug, replace: id }))
}

const outputs: [Target, FileMap][] = []
const findings: Finding[] = []

for (const [target, spec] of Object.entries(targets) as [Target, TargetSpec][]) {
  const rewritten = rewrite(normalizeSkills(selected), [...spec.rules, ...slugRules(target)])
  const files = spec.agents(rewritten.files)

  for (const [path, content] of await loadTree(join(root, "adapters", target))) files.set(path, content)

  const pkg = JSON.parse(files.get("package.json") as string) as Record<string, unknown>
  pkg.version = upstream.version
  pkg.pstack = { ...(pkg.pstack as object | undefined), upstreamSha: upstream.sha }
  files.set("package.json", `${JSON.stringify(pkg, null, 2)}\n`)

  for (const f of lint({ files, hits: rewritten.hits, forbidden: [...forbidden, ...targetForbidden[target]], allow })) {
    findings.push({ ...f, file: f.file ? `${target}/${f.file}` : f.file, pattern: f.file ? f.pattern : `${target}:${f.pattern}` })
  }
  outputs.push([target, files])
}

if (findings.length > 0) {
  const report = formatFindings(findings)
  process.stderr.write(report)
  if (reportPath) await Bun.write(reportPath, report)
  process.stderr.write(`${findings.length} lint finding(s); dist/ left untouched\n`)
  process.exit(1)
}

for (const [target, files] of outputs) await emit(files, join(root, "dist", target))

// omp's marketplace catalog lives at the repo root, where `omp plugin marketplace add` looks for it.
const catalog = {
  name: "open-pstack",
  owner: { name: "luizbafilho" },
  plugins: [
    {
      name: "pstack",
      description: "pstack's skills and agents for omp",
      version: upstream.version,
      source: { source: "git-subdir", url: "https://github.com/luizbafilho/open-pstack.git", path: "dist/omp", ref: "main" },
    },
  ],
}
await Bun.write(join(root, ".omp-plugin", "marketplace.json"), `${JSON.stringify(catalog, null, 2)}\n`)
