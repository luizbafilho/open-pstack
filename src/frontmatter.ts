import { parseDocument, type Document } from "yaml"
import type { FileMap } from "./types"

const fence = /^---\n([\s\S]*?\n)---\n/

export type Frontmatter = { doc: Document; body: string }

export function parseFrontmatter(text: string): Frontmatter {
  const m = fence.exec(text)
  if (!m) throw new Error("missing YAML frontmatter")
  return { doc: parseDocument(m[1] ?? ""), body: text.slice(m[0].length) }
}

export function stringifyFrontmatter({ doc, body }: Frontmatter): string {
  return `---\n${doc.toString({ lineWidth: 0 })}---\n${body}`
}

const skillFile = /^skills\/([^/]+)\/SKILL\.md$/
const removedKeys = ["icon", "color", "mode", "reminder", "paths"]

export function normalizeSkills(files: FileMap): FileMap {
  const out: FileMap = new Map(files)
  for (const [path, content] of files) {
    const id = skillFile.exec(path)?.[1]
    if (!id || typeof content !== "string") continue
    const fm = parseFrontmatter(content)
    fm.doc.set("name", id)
    for (const key of removedKeys) fm.doc.delete(key)
    out.set(path, stringifyFrontmatter(fm))
  }
  return out
}
