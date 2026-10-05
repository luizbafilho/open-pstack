export type Target = "opencode"
export type FileContent = string | Uint8Array // string = UTF-8 text, Uint8Array = binary
export type FileMap = Map<string, FileContent> // key: POSIX path relative to the tree root, sorted on emit
export type Rule = {
  id: string
  match: string | RegExp // RegExp must have the g flag
  replace: string | ((m: string, ...groups: string[]) => string)
  files?: string // Bun.Glob pattern; default: every text file
}
export type RuleHit = { id: string; hits: number }
export type Forbidden = { id: string; pattern: RegExp } // g flag
export type Allow = { file: string; text: string } // exact substring on one line of that output file
export type FindingKind = "leftover" | "dead-rule" | "dead-allow"
export type Finding = { file: string; line: number; kind: FindingKind; pattern: string; text: string }
export type Upstream = { repo: string; path: string; sha: string; version: string; syncedAt: string }
