import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { getItemDetail, validateItemInput } from '@/lib/items'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/items/[id] — 物品详情（含想要列表与留言）
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const user = await getCurrentUser()
  // 封面会展示各空间的商品，因此公开详情也允许跨空间查看；互动接口仍校验所属空间。
  const item = await getItemDetail(id, user?.id ?? null)
  if (!item) return NextResponse.json({ error: '物品不存在' }, { status: 404 })
  return NextResponse.json({ item })
}

// PATCH /api/items/[id] — 发布者操作：{ action: 'given' } 标记送出；{ action: 'edit', ...字段 } 编辑
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  const item = await db.item.findUnique({ where: { id } })
  if (!item) return NextResponse.json({ error: '物品不存在' }, { status: 404 })
  if (item.publisherId !== user.id) return NextResponse.json({ error: '只有发布者可以操作' }, { status: 403 })
  if (item.status === 'GIVEN') return NextResponse.json({ error: '该物品已送出，不能再修改' }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

  // 标记已送出（归档保留记录）
  if (body.action === 'given') {
    let givenToId: string | null = null
    if (body.givenToUserId) {
      const intent = await db.want.findUnique({
        where: { itemId_userId: { itemId: id, userId: String(body.givenToUserId) } },
      })
      if (!intent) return NextResponse.json({ error: '接收人需要先表达“想要”' }, { status: 400 })
      givenToId = intent.userId
    }
    const updated = await db.item.update({
      where: { id },
      data: { status: 'GIVEN', givenAt: new Date(), givenToId },
    })
    return NextResponse.json({ id: updated.id, status: updated.status, givenAt: updated.givenAt })
  }

  // 编辑（复用发布校验；已送出不可编辑）
  if (body.action === 'edit' || body.action === undefined) {
    const parsed = validateItemInput(body)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const updated = await db.item.update({
      where: { id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        tradeMode: parsed.data.tradeMode,
        price: parsed.data.price,
        condition: parsed.data.condition,
        images: JSON.stringify(parsed.data.images),
      },
    })
    return NextResponse.json({ id: updated.id })
  }

  return NextResponse.json({ error: '不支持的操作' }, { status: 400 })
}

// DELETE /api/items/[id] — 发布者删除（仅限在售；已送出的归档记录不可删除）
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  const item = await db.item.findUnique({ where: { id } })
  if (!item) return NextResponse.json({ error: '物品不存在' }, { status: 404 })
  if (item.publisherId !== user.id) return NextResponse.json({ error: '只有发布者可以删除' }, { status: 403 })
  if (item.status === 'GIVEN') return NextResponse.json({ error: '已送出的归档记录不可删除' }, { status: 400 })

  // 想要/留言随外键级联删除
  await db.item.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
