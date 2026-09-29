import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { suggestReply } from '@/lib/llm'
import { CONDITIONS } from '@/lib/constants'
import type { Condition, TradeMode } from '@/lib/constants'
import { getCurrentUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/llm/reply { itemId, question } — 针对常见提问生成回复建议
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as { itemId?: string; question?: string }
  const itemId = String(body.itemId ?? '')
  const question = String(body.question ?? '').trim()
  if (!question) return NextResponse.json({ error: '缺少提问内容' }, { status: 400 })

  const item = await db.item.findUnique({ where: { id: itemId }, include: { publisher: true } })
  if (!item) return NextResponse.json({ error: '物品不存在' }, { status: 404 })
  if (item.publisherId !== user.id)
    return NextResponse.json({ error: '只有发布者可以生成回复建议' }, { status: 403 })

  const result = await suggestReply(
    {
      title: item.title,
      description: item.description,
      tradeMode: item.tradeMode as TradeMode,
      price: item.price,
      condition: CONDITIONS[item.condition as Condition] ?? item.condition,
      building: item.publisher.building,
    },
    question.slice(0, 300),
  )
  return NextResponse.json(result)
}
