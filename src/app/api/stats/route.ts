import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseImages } from '@/lib/constants'
import type { StatsDTO } from '@/lib/constants'
import { getActiveSpace } from '@/lib/spaces'

export const dynamic = 'force-dynamic'

// GET /api/stats — 社区活跃数据看板
export async function GET() {
  const space = await getActiveSpace()
  const inSpace = { publisher: { spaceId: space.id } }
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysStart = new Date(now)
  daysStart.setHours(0, 0, 0, 0)
  daysStart.setDate(daysStart.getDate() - 13)

  const [monthPublished, monthGiven, activeCount, givenItems, wantedItems, recentPublished, recentGiven] = await Promise.all([
    db.item.count({ where: { ...inSpace, createdAt: { gte: monthStart } } }),
    db.item.count({ where: { ...inSpace, status: 'GIVEN', givenAt: { gte: monthStart } } }),
    db.item.count({ where: { ...inSpace, status: 'ACTIVE' } }),
    // 最快被领走：发布 -> 标记已送出 的时间最短
    db.item.findMany({
      where: { ...inSpace, status: 'GIVEN', givenAt: { not: null } },
      include: { publisher: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    // 最想要：被点"想要"最多且未成交
    db.item.findMany({
      where: { ...inSpace, status: 'ACTIVE' },
      include: { publisher: true, _count: { select: { wants: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    // 近 14 天趋势：按自然日分桶（内存聚合，SQLite 无需额外 SQL）
    db.item.findMany({ where: { ...inSpace, createdAt: { gte: daysStart } }, select: { createdAt: true } }),
    db.item.findMany({ where: { ...inSpace, givenAt: { gte: daysStart } }, select: { givenAt: true } }),
  ])

  const daily: StatsDTO['daily'] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(daysStart)
    d.setDate(d.getDate() + i)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const inDay = (t: Date) => t >= d && t < next
    return {
      date: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      published: recentPublished.filter((it) => inDay(it.createdAt)).length,
      given: recentGiven.filter((it) => it.givenAt && inDay(it.givenAt)).length,
    }
  })

  const fastestGiven: StatsDTO['fastestGiven'] = givenItems
    .map((it) => ({
      id: it.id,
      title: it.title,
      images: parseImages(it.images),
      hoursToGiven: Math.max(0.1, Math.round(((it.givenAt!.getTime() - it.createdAt.getTime()) / 3600_000) * 10) / 10),
      publisher: it.publisher.name,
    }))
    .sort((a, b) => a.hoursToGiven - b.hoursToGiven)
    .slice(0, 3)

  const mostWanted: StatsDTO['mostWanted'] = wantedItems
    .filter((it) => it._count.wants > 0)
    .sort((a, b) => b._count.wants - a._count.wants)
    .slice(0, 3)
    .map((it) => ({
      id: it.id,
      title: it.title,
      images: parseImages(it.images),
      wantCount: it._count.wants,
      publisher: it.publisher.name,
    }))

  return NextResponse.json({ monthPublished, monthGiven, activeCount, daily, fastestGiven, mostWanted })
}
