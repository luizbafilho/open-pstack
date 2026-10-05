import { Document } from "yaml"
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter"
import type { FileMap } from "./types"

function agentFile(fields: Record<string, unknown>, body: string): string {
  return stringifyFrontmatter({ doc: new Document(fields), body })
}

function upstreamAgent(files: FileMap, path: string): { description: string; body: string } {
  const content = files.get(path)
  if (typeof content !== "string") throw new Error(`missing upstream agent ${path}`)
  const { doc, body } = parseFrontmatter(content)
  return { description: String(doc.get("description")), body }
}

export function convertAgents(files: FileMap, potetoMode: { reminder: string }): FileMap {
  const poteto = upstreamAgent(files, "agents/poteto-agent.md")
  const sicko = upstreamAgent(files, "agents/comment-sicko.md")

  const out: FileMap = new Map(files)
  out.delete("agents/poteto-agent.md")
  out.delete("agents/comment-sicko.md")

  out.set("agents/poteto-agent.md", agentFile({ description: poteto.description, mode: "subagent" }, poteto.body))
  out.set("agents/comment-sicko.md", agentFile({ description: sicko.description, mode: "subagent" }, sicko.body))
  out.set(
    "agents/poteto.md",
    agentFile(
      { description: "pstack's poteto-mode as an always-on agent", mode: "primary" },
      "Load the `poteto-mode` skill with the skill tool at the start of the session, and apply it on every turn per this reminder:\n\n" +
        `${potetoMode.reminder}\n`,
    ),
  )
  return out
}
