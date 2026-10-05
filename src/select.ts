import type { FileMap } from "./types"

export function select(files: FileMap, drop: string[]): FileMap {
  const globs = drop.map((pattern) => new Bun.Glob(pattern))
  return new Map([...files].filter(([path]) => !globs.some((glob) => glob.match(path))))
}
