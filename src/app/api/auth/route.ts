import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  hashPassword,
  pickAvatar,
  validateRegister,
  verifyPassword,
} from '@/lib/auth'
import { getCurrentUser, toUserDTO } from '@/lib/session'
import { PROFILE_AVATARS } from '@/lib/constants'
import { SPACE_COOKIE } from '@/lib/spaces'

export const dynamic = 'force-dynamic'

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
  secure: process.env.NODE_ENV === 'production',
}

// POST /api/auth/register { username, password, name, building? } — 注册并自动登录
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    username?: string
    password?: string
    name?: string
    building?: string
    spaceId?: string
    inviteCode?: string
  }
  const username = String(body.username ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const name = String(body.name ?? '').trim()

  const check = validateRegister({ username, password, name })
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const exists = await db.user.findUnique({ where: { username } })
  if (exists) return NextResponse.json({ error: '该账号已被注册' }, { status: 400 })

  const inviteCode = String(body.inviteCode ?? '').trim().toUpperCase()
  if (!/^[A-F0-9]{12}$/.test(inviteCode))
    return NextResponse.json({ error: '请输入有效的社区邀请码' }, { status: 400 })
  const space = await db.space.findUnique({ where: { inviteCode } })
  if (!space) return NextResponse.json({ error: '邀请码不正确，请向已加入社区的成员确认' }, { status: 400 })
  if (body.spaceId && body.spaceId !== space.id)
    return NextResponse.json({ error: '邀请码与所选空间不匹配' }, { status: 400 })

  const user = await db.user.create({
    data: {
      username,
      passwordHash: hashPassword(password),
      name,
      avatar: pickAvatar(),
      building: String(body.building ?? '').trim() || '位置未填写',
      spaceId: space.id,
    },
    include: { space: true },
  })

  const res = NextResponse.json({ user: toUserDTO(user) })
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), cookieOpts)
  res.cookies.set(SPACE_COOKIE, space.id, { path: '/', sameSite: 'lax', maxAge: SESSION_MAX_AGE })
  return res
}

// PUT /api/auth/login { username, password } — 登录
export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string }
  const username = String(body.username ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  const user = await db.user.findUnique({ where: { username }, include: { space: true } })
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash))
    return NextResponse.json({ error: '账号或密码不正确' }, { status: 401 })

  const res = NextResponse.json({ user: toUserDTO(user) })
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), cookieOpts)
  if (user.spaceId) {
    res.cookies.set(SPACE_COOKIE, user.spaceId, { path: '/', sameSite: 'lax', maxAge: SESSION_MAX_AGE })
  } else {
    res.cookies.set(SPACE_COOKIE, '', { path: '/', maxAge: 0 })
  }
  return res
}

// PATCH /api/auth/profile { name, avatar, building, bio } — 修改当前用户公开资料
export async function PATCH(req: NextRequest) {
  const current = await getCurrentUser()
  if (!current) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    avatar?: string
    building?: string
    bio?: string
  }
  const name = String(body.name ?? '').trim()
  const avatar = String(body.avatar ?? '')
  const building = String(body.building ?? '').trim()
  const bio = String(body.bio ?? '').trim()

  if (!name || name.length > 12)
    return NextResponse.json({ error: '昵称需为 1-12 个字' }, { status: 400 })
  if (!PROFILE_AVATARS.includes(avatar as (typeof PROFILE_AVATARS)[number]))
    return NextResponse.json({ error: '请选择有效头像' }, { status: 400 })
  if (!building || building.length > 30)
    return NextResponse.json({ error: '所在位置需为 1-30 个字' }, { status: 400 })
  if (bio.length > 80)
    return NextResponse.json({ error: '个人简介不要超过 80 个字' }, { status: 400 })

  const user = await db.user.update({
    where: { id: current.id },
    data: { name, avatar, building, bio: bio || null },
    include: { space: true },
  })
  return NextResponse.json({ user: toUserDTO(user) })
}

// DELETE /api/auth/logout — 退出登录
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
