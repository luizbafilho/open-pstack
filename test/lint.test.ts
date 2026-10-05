import { describe, expect, test } from "bun:test"
import { lint } from "../src/lint"

const forbidden = [{ id: "dot-cursor", pattern: /\.cursor\b/g }]
const files = (entries: Record<string, string>) => new Map(Object.entries(entries))

describe("lint", () => {
  test("reports a leftover forbidden term with file and line", () => {
    const out = lint({ files: files({ "a.md": "ok\nsee ~/.cursor/rules\n" }), hits: [], forbidden, allow: [] })
    expect(out).toEqual([
      { file: "a.md", line: 2, kind: "leftover", pattern: "dot-cursor", text: "see ~/.cursor/rules" },
    ])
  })

  test("an allow entry covers a leftover on that line only", () => {
    const out = lint({
      files: files({ "a.md": "worked at ~/.cursor once\n~/.cursor again\n" }),
      hits: [],
      forbidden,
      allow: [{ file: "a.md", text: "worked at ~/.cursor once" }],
    })
    expect(out.map((f) => [f.line, f.kind])).toEqual([[2, "leftover"]])
  })

  test("reports a rule that matched nothing", () => {
    const out = lint({ files: files({ "a.md": "clean\n" }), hits: [{ id: "task-tool", hits: 0 }], forbidden, allow: [] })
    expect(out).toEqual([{ file: "", line: 0, kind: "dead-rule", pattern: "task-tool", text: "" }])
  })

  test("reports an allow entry that matched nothing", () => {
    const out = lint({ files: files({ "a.md": "clean\n" }), hits: [], forbidden, allow: [{ file: "a.md", text: "gone" }] })
    expect(out).toEqual([{ file: "a.md", line: 0, kind: "dead-allow", pattern: "", text: "gone" }])
  })

  test("clean input yields no findings", () => {
    expect(lint({ files: files({ "a.md": "clean\n" }), hits: [{ id: "r", hits: 3 }], forbidden, allow: [] })).toEqual([])
  })
})
