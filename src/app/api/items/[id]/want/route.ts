import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/items/[id]/want — 表达"想要" / 取消（幂等切换）
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const item = await db.item.findUnique({ where: { id }, include: { publisher: { select: { spaceId: true } } } })
  if (!item) return NextResponse.json({ error: '物品不存在' }, { status: 404 })
  if (!user.spaceId || item.publisher.spaceId !== user.spaceId)
    return NextResponse.json({ error: '不能操作其他空间的物品' }, { status: 403 })
  if (item.status === 'GIVEN') return NextResponse.json({ error: '物品已送出，仅供查看' }, { status: 400 })
  if (item.publisherId === user.id)
    return NextResponse.json({ error: '这是你自己发布的物品哦' }, { status: 400 })

  const existing = await db.want.findUnique({ where: { itemId_userId: { itemId: id, userId: user.id } } })
  if (existing) {
    await db.want.delete({ where: { id: existing.id } })
  } else {
    await db.want.create({ data: { itemId: id, userId: user.id } })
  }
  const wantCount = await db.want.count({ where: { itemId: id } })
  return NextResponse.json({ wanted: !existing, wantCount })
}
