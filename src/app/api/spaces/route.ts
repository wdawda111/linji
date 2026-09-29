import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { getActiveSpace, SPACE_COOKIE } from '@/lib/spaces'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [spaces, active] = await Promise.all([
    db.space.findMany({ orderBy: [{ name: 'asc' }] }),
    getActiveSpace(),
  ])
  return NextResponse.json({ spaces, activeId: active.id })
}

export async function PUT(req: NextRequest) {
  const current = await getCurrentUser()
  if (current) return NextResponse.json({ error: '登录后不能切换所属空间' }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { spaceId?: string }
  const space = body.spaceId ? await db.space.findUnique({ where: { id: body.spaceId } }) : null
  if (!space) return NextResponse.json({ error: '空间不存在' }, { status: 404 })

  const response = NextResponse.json({ space })
  response.cookies.set(SPACE_COOKIE, space.id, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
  return response
}
