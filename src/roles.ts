import roles, { type Role } from "../rules/roles"

export type Seat = { role: Role; agent: string; key: string; default: string }

// One seat per default: a single-model role has one, a panel has one per entry.
export function seats(role: Role): Seat[] {
  const prefix = role.base === "poteto" ? "poteto-agent" : "pstack"
  return role.defaults.map((slug, i) => {
    const suffix = role.defaults.length > 1 ? `${role.id}-${i + 1}` : role.id
    return { role, agent: `${prefix}-${suffix}`, key: `pstack-${suffix}`, default: slug }
  })
}

export function roleByLine(line: string): Role {
  const role = roles.find((r) => r.line === line)
  if (!role) throw new Error(`no role for upstream line "${line}"`)
  return role
}

export const allSeats: Seat[] = roles.flatMap(seats)
