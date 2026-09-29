import { db } from './db'
import { toUserDTO } from './session'
import { parseImages, CONDITIONS, TRADE_MODES } from './constants'
import type { CommentDTO, Condition, ItemDTO, ItemDetailDTO, ImageRef, TradeMode, UserDTO } from './constants'
import type { Item, Space, User, Prisma } from '@prisma/client'

// 列表/详情共用的查询与序列化，保证 API 返回形状稳定

type ItemWithRels = Item & {
  publisher: User & { space: Space | null }
  givenTo: User | null
  _count: { wants: number; comments: number }
  wants: Array<{ id: string }>
}

export function serializeItem(item: ItemWithRels): ItemDTO {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    tradeMode: item.tradeMode as TradeMode,
    price: item.price,
    condition: item.condition as Condition,
    images: parseImages(item.images),
    status: item.status as ItemDTO['status'],
    givenAt: item.givenAt?.toISOString() ?? null,
    givenTo: item.givenTo ? { id: item.givenTo.id, name: item.givenTo.name, avatar: item.givenTo.avatar } : null,
    publisher: toUserDTO(item.publisher),
    wantCount: item._count.wants,
    commentCount: item._count.comments,
    iWant: item.wants.length > 0,
    createdAt: item.createdAt.toISOString(),
  }
}

const itemInclude = {
  publisher: { include: { space: true } },
  givenTo: true,
  _count: { select: { wants: true, comments: { where: { retractedAt: null } } } },
} satisfies Prisma.ItemInclude

export type ListParams = {
  q?: string
  mode?: string // all | FREE | ANY | PRICED
  status?: string // ACTIVE | GIVEN | all
  mine?: boolean
  wanted?: boolean
}

export async function listItems(params: ListParams, currentUserId: string | null, spaceId?: string): Promise<ItemDTO[]> {
  const where: Prisma.ItemWhereInput = spaceId ? { publisher: { spaceId } } : {}
  if (params.status && params.status !== 'all') where.status = params.status
  if (params.mode && params.mode !== 'all' && params.mode in TRADE_MODES) where.tradeMode = params.mode
  if (params.q?.trim()) {
    const q = params.q.trim()
    where.OR = [{ title: { contains: q } }, { description: { contains: q } }]
  }
  if (params.mine && currentUserId) where.publisherId = currentUserId
  if (params.wanted && currentUserId) where.wants = { some: { userId: currentUserId } }

  // 无身份时用一个不可能命中的 userId，iWant 恒为 false
  const uid = currentUserId ?? '__anonymous__'
  const items = await db.item.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { ...itemInclude, wants: { where: { userId: uid }, select: { id: true } } },
  })
  return items.map(serializeItem)
}

export async function getItemDetail(id: string, currentUserId: string | null, spaceId?: string): Promise<ItemDetailDTO | null> {
  const item = await db.item.findFirst({
    where: spaceId ? { id, publisher: { spaceId } } : { id },
    include: {
      ...itemInclude,
      wants: { include: { user: true }, orderBy: { createdAt: 'desc' } },
      comments: {
        include: { user: true, replyToUser: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!item) return null

  const uid = currentUserId ?? '__anonymous__'
  const base = serializeItem({
    ...item,
    wants: item.wants.filter((w) => w.userId === uid).map((w) => ({ id: w.id })),
  })

  // 组装楼层：顶层留言按时间正序，回复挂在对应楼层内
  const toDTO = (c: (typeof item.comments)[number]): CommentDTO => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    isRetracted: Boolean(c.retractedAt),
    user: toUserDTO(c.user),
    replyTo: c.replyToUser ? { id: c.replyToUser.id, name: c.replyToUser.name } : null,
  })
  const repliesByRoot = new Map<string, CommentDTO[]>()
  for (const c of item.comments) {
    if (c.parentId && !c.retractedAt) {
      const list = repliesByRoot.get(c.parentId) ?? []
      list.push(toDTO(c))
      repliesByRoot.set(c.parentId, list)
    }
  }
  const comments = item.comments
    .filter((c) => !c.parentId)
    .flatMap((c) => {
      const replies = repliesByRoot.get(c.id) ?? []
      // 没有未撤回回复的留言直接隐藏；有回复的楼层保留占位，避免回复失去上下文。
      if (c.retractedAt && replies.length === 0) return []
      return [{ ...toDTO(c), replies }]
    })

  // 「谁想要」名单仅发布者可见（考题要求）；其他人只看到人数
  const isPublisher = currentUserId === item.publisherId
  return {
    ...base,
    wants: isPublisher
      ? item.wants.map((w) => ({ user: toUserDTO(w.user), createdAt: w.createdAt.toISOString() }))
      : [],
    comments,
  }
}

// ===== 发布校验 =====
export type ItemInput = {
  title: string
  description: string
  tradeMode: TradeMode
  price: number | null
  condition: Condition
  images: ImageRef[]
}

export function validateItemInput(body: unknown): { ok: true; data: ItemInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>
  const title = String(b.title ?? '').trim()
  if (!title) return { ok: false, error: '请填写物品名称' }
  if (title.length > 40) return { ok: false, error: '物品名称不要超过 40 字' }
  const description = String(b.description ?? '').trim()
  if (description.length > 1000) return { ok: false, error: '描述不要超过 1000 字' }
  const tradeMode = String(b.tradeMode ?? '')
  if (!(tradeMode in TRADE_MODES)) return { ok: false, error: '交易方式不合法' }
  let price: number | null = null
  if (tradeMode === 'PRICED') {
    price = Number(b.price)
    if (!Number.isFinite(price) || price < 0) return { ok: false, error: '请填写有效的价格' }
    price = Math.round(price * 10) / 10
  }
  const condition = String(b.condition ?? '')
  if (!(condition in CONDITIONS)) return { ok: false, error: '请选择物品成色' }
  const images: unknown[] = Array.isArray(b.images) ? b.images.slice(0, 3) : []
  const validImages: ImageRef[] = []
  for (const im of images) {
    const o = (im ?? {}) as Record<string, unknown>
    if (o.kind === 'emoji' && typeof o.emoji === 'string' && typeof o.hue === 'number')
      validImages.push({ kind: 'emoji', emoji: o.emoji, hue: o.hue })
    else if (o.kind === 'file' && typeof o.url === 'string' && o.url.startsWith('/uploads/'))
      validImages.push({ kind: 'file', url: o.url })
  }
  return {
    ok: true,
    data: { title, description, tradeMode: tradeMode as TradeMode, price, condition: condition as Condition, images: validImages },
  }
}

export type { Item, UserDTO }
