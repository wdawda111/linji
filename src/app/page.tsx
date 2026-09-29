import { db } from '@/lib/db'
import { Landing } from '@/components/landing'
import { listItems } from '@/lib/items'
import { getActiveSpace } from '@/lib/spaces'
import { getCurrentUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

// 封面：真实流转统计（本月发布/成交/在售），不用任何虚构数字
export default async function LandingPage() {
  const [space, current] = await Promise.all([getActiveSpace(), getCurrentUser()])
  const inSpace = { publisher: { spaceId: space.id } }
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const [monthPublished, monthGiven, activeCount, items] = await Promise.all([
    db.item.count({ where: { ...inSpace, createdAt: { gte: monthStart } } }),
    db.item.count({ where: { ...inSpace, status: 'GIVEN', givenAt: { gte: monthStart } } }),
    db.item.count({ where: { ...inSpace, status: 'ACTIVE' } }),
    // 封面是跨空间的公共橱窗；发现页、看板等内部页面仍按当前空间隔离。
    listItems({ status: 'ACTIVE' }, current?.id ?? null),
  ])
  return <Landing stats={{ monthPublished, monthGiven, activeCount }} items={items} />
}
