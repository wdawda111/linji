import { NextRequest, NextResponse } from 'next/server'
import { suggestPrice } from '@/lib/llm'
import { getCurrentUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/llm/price { title, description } — 智能定价建议
export async function POST(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as { title?: string; description?: string }
  const title = String(body.title ?? '').trim()
  if (!title) return NextResponse.json({ error: '请先填写物品名称' }, { status: 400 })
  const result = await suggestPrice(title.slice(0, 40), String(body.description ?? '').trim().slice(0, 1000))
  return NextResponse.json(result)
}
