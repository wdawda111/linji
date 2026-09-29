import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { listItems, validateItemInput } from '@/lib/items'
import { getActiveSpace } from '@/lib/spaces'

export const dynamic = 'force-dynamic'

// GET /api/items?q=&mode=&status=&mine=1&wanted=1 — 检索/筛选物品列表
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const user = await getCurrentUser()
  const space = await getActiveSpace()
  const privateFilter = sp.get('mine') === '1' || sp.get('wanted') === '1'
  if (privateFilter && !user)
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  const items = await listItems(
    {
      q: sp.get('q') ?? undefined,
      mode: sp.get('mode') ?? undefined,
      status: sp.get('status') ?? undefined,
      mine: sp.get('mine') === '1',
      wanted: sp.get('wanted') === '1',
    },
    user?.id ?? null,
    space.id,
  )
  return NextResponse.json({ items })
}

// POST /api/items — 发布闲置物品
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  if (!user.spaceId) return NextResponse.json({ error: '请先加入一个空间' }, { status: 400 })
  const body = await req.json().catch(() => null)
  const parsed = validateItemInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const item = await db.item.create({
    data: { ...parsed.data, images: JSON.stringify(parsed.data.images), publisherId: user.id },
  })
  return NextResponse.json({ id: item.id }, { status: 201 })
}
