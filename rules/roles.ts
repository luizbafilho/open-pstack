// pstack's model roles, as named in setup-pstack's role lines. The omp target
// turns each role into a task agent whose model comes from modelRoles.
export type Role = {
  id: string // agent and modelRoles key suffix
  line: string // upstream role line
  base: "poteto" | "worker" // poteto-agent body, or the generic worker prompt
  readonly: boolean
  defaults: string[] // upstream default slug; one per seat for a panel
}

const claude = "claude-opus-5-5-max"
const gpt = "gpt-5.6-sol-max"
const grok = "grok-4.7-xhigh-fast"
const panel = [claude, gpt, grok]

const roles: Role[] = [
  { id: "feature", line: "feature, refactoring", base: "poteto", readonly: false, defaults: [grok] },
  { id: "bug-fix", line: "bug-fix", base: "poteto", readonly: false, defaults: [grok] },
  { id: "perf-issue", line: "perf-issue", base: "poteto", readonly: false, defaults: [grok] },
  { id: "hillclimb", line: "hillclimb", base: "poteto", readonly: false, defaults: [grok] },
  { id: "judgment", line: "judgment and prose", base: "poteto", readonly: false, defaults: [claude] },
  { id: "hardest", line: "hardest tasks", base: "poteto", readonly: false, defaults: [claude] },
  { id: "how-explorer", line: "how explorer", base: "worker", readonly: true, defaults: [grok] },
  { id: "how-explainer", line: "how explainer", base: "worker", readonly: true, defaults: [claude] },
  { id: "why-investigator", line: "why investigators", base: "worker", readonly: false, defaults: [grok] },
  { id: "why-synthesizer", line: "why synthesizer", base: "worker", readonly: false, defaults: [claude] },
  { id: "reflect-tooling", line: "reflect tooling", base: "worker", readonly: false, defaults: [gpt] },
  {
    id: "reflect-judgment",
    line: "reflect judgment, divergent, synthesizer",
    base: "worker",
    readonly: false,
    defaults: [claude],
  },
  { id: "arena-runner", line: "arena runners", base: "worker", readonly: false, defaults: panel },
  { id: "arena-judge", line: "arena cross-judge pool", base: "worker", readonly: true, defaults: panel },
  { id: "swarm-worker", line: "swarm workers", base: "worker", readonly: false, defaults: [grok] },
  { id: "architect-runner", line: "architect runners", base: "worker", readonly: false, defaults: panel },
  { id: "interrogate-reviewer", line: "interrogate reviewers", base: "worker", readonly: true, defaults: panel },
]

export default roles
