import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, toUserDTO } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/items/[id]/comments { content, parentId? } — 公开留言；带 parentId 时为楼层内回复
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const item = await db.item.findUnique({ where: { id }, include: { publisher: { select: { spaceId: true } } } })
  if (!item) return NextResponse.json({ error: '物品不存在' }, { status: 404 })
  if (!user.spaceId || item.publisher.spaceId !== user.spaceId)
    return NextResponse.json({ error: '不能在其他空间留言' }, { status: 403 })
  if (item.status === 'GIVEN') return NextResponse.json({ error: '物品已送出，留言板已关闭' }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { content?: string; parentId?: string }
  const content = String(body.content ?? '').trim()
  if (!content) return NextResponse.json({ error: '留言内容不能为空' }, { status: 400 })
  if (content.length > 300) return NextResponse.json({ error: '留言不要超过 300 字' }, { status: 400 })

  // 回复：定位目标留言（必须是同一物品）；回复"楼层内回复"时自动挂到楼层根
  let parentId: string | null = null
  let replyToUserId: string | null = null
  if (body.parentId) {
    const target = await db.comment.findUnique({ where: { id: String(body.parentId) } })
    if (!target || target.itemId !== id) return NextResponse.json({ error: '被回复的留言不存在' }, { status: 400 })
    if (target.retractedAt) return NextResponse.json({ error: '不能回复已撤回的留言' }, { status: 400 })
    parentId = target.parentId ?? target.id
    replyToUserId = target.userId
  }

  const comment = await db.comment.create({
    data: { itemId: id, userId: user.id, content, parentId, replyToUserId },
    include: { user: true, replyToUser: { select: { id: true, name: true } } },
  })
  return NextResponse.json({
    comment: {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      isRetracted: Boolean(comment.retractedAt),
      user: toUserDTO(comment.user),
      replyTo: comment.replyToUser ? { id: comment.replyToUser.id, name: comment.replyToUser.name } : null,
    },
  })
}

// DELETE /api/items/[id]/comments { commentId } — 本人撤回留言，保留楼层结构与其他人的回复
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { commentId?: string }
  const commentId = String(body.commentId ?? '').trim()
  if (!commentId) return NextResponse.json({ error: '缺少留言编号' }, { status: 400 })

  const comment = await db.comment.findFirst({
    where: { id: commentId, itemId: id },
    include: { item: { include: { publisher: { select: { spaceId: true } } } } },
  })
  if (!comment) return NextResponse.json({ error: '留言不存在' }, { status: 404 })
  if (!user.spaceId || comment.item.publisher.spaceId !== user.spaceId)
    return NextResponse.json({ error: '不能操作其他空间的留言' }, { status: 403 })
  if (comment.userId !== user.id) return NextResponse.json({ error: '只能撤回自己的留言' }, { status: 403 })
  if (comment.retractedAt) return NextResponse.json({ ok: true })

  await db.comment.update({
    where: { id: comment.id },
    data: { content: '', retractedAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
