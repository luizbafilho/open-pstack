import { describe, expect, test } from "bun:test"
import { join } from "node:path"

const dist = join(import.meta.dir, "..", "dist")
const scripts = (target: string) => join(dist, target, "skills/poteto-mode/scripts")

describe.each(["opencode", "omp"])("%s plan skeleton", (target) => {
  test("carries every Program checklist marker check-plan.mjs requires", async () => {
    const script = await Bun.file(join(scripts(target), "check-plan.mjs")).text()
    const playbook = await Bun.file(join(dist, target, "skills/poteto-mode/playbooks/multi-phase-plan.md")).text()
    const markers = JSON.parse(/const PROGRAM_MARKERS = (\[.*\]);/.exec(script)![1]!) as string[]
    const checklist = /## Program checklist\n([\s\S]*?)\n## /.exec(playbook)![1]!
    expect(markers.filter((m) => !checklist.includes(m))).toEqual([])
  })
})

// omp's shipped fixture still says "/loop 1h" while its checker requires "1h heartbeat watcher".
test("opencode ships a check-plan test that passes against its own checker", () => {
  const run = Bun.spawnSync(["bun", "test", "./check-plan.test.ts"], { cwd: scripts("opencode"), stdout: "pipe", stderr: "pipe" })
  expect({ exitCode: run.exitCode, output: run.exitCode === 0 ? "" : run.stderr.toString() }).toEqual({ exitCode: 0, output: "" })
})
