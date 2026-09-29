import { cookies } from 'next/headers'
import { db } from './db'
import { SESSION_COOKIE, verifySessionToken } from './auth'
import type { UserDTO } from './constants'

// 登录会话：HMAC 签名 Cookie → 当前用户。未登录返回 null（浏览公开，操作需登录）。

export async function getCurrentUser() {
  const store = await cookies()
  const userId = verifySessionToken(store.get(SESSION_COOKIE)?.value)
  if (!userId) return null
  return db.user.findUnique({ where: { id: userId }, include: { space: true } })
}

export function toUserDTO(u: {
  id: string
  name: string
  avatar: string
  building: string
  bio?: string | null
  space?: { id: string; name: string; slug: string; type: string } | null
  role?: string
}): UserDTO {
  return {
    id: u.id,
    name: u.name,
    avatar: u.avatar,
    building: u.building,
    bio: u.bio,
    space: u.space ?? null,
    role: u.role === 'PLATFORM_ADMIN' ? 'PLATFORM_ADMIN' : 'MEMBER',
  }
}
