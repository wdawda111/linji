import 'server-only'

import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { db } from './db'
import { getCurrentUser } from './session'

export const SPACE_COOKIE = 'linji_space'

async function ensureDefaultSpace() {
  const space = await db.space.upsert({
    where: { slug: 'linji-default' },
    update: { name: '邻里小区', type: '小区' },
    create: { name: '邻里小区', slug: 'linji-default', type: '小区', inviteCode: createSpaceInviteCode() },
  })
  await ensureSpaceInviteCode(space.id)
  await db.user.updateMany({
    where: { spaceId: null, role: { not: 'PLATFORM_ADMIN' } },
    data: { spaceId: space.id },
  })
  return space
}

export async function getActiveSpace() {
  const current = await getCurrentUser()
  if (current?.space) return current.space

  const store = await cookies()
  const selectedId = store.get(SPACE_COOKIE)?.value
  if (selectedId) {
    const selected = await db.space.findUnique({ where: { id: selectedId } })
    if (selected) return selected
  }

  return (await db.space.findFirst({ orderBy: { createdAt: 'asc' } })) ?? ensureDefaultSpace()
}

export function createSpaceSlug() {
  return `space-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`
}

export function createSpaceInviteCode() {
  return randomBytes(6).toString('hex').toUpperCase()
}

export async function ensureSpaceInviteCode(spaceId: string) {
  const space = await db.space.findUnique({ where: { id: spaceId }, select: { inviteCode: true } })
  if (!space) return null
  if (space.inviteCode) return space.inviteCode

  const inviteCode = createSpaceInviteCode()
  const result = await db.space.updateMany({
    where: { id: spaceId, inviteCode: null },
    data: { inviteCode },
  })
  if (result.count > 0) return inviteCode

  return (await db.space.findUnique({ where: { id: spaceId }, select: { inviteCode: true } }))?.inviteCode ?? null
}
