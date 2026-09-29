// 前后端共用的常量、类型与工具（不依赖服务端模块）

export type TradeMode = 'FREE' | 'ANY' | 'PRICED'
export type Condition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'USED'
export type ItemStatus = 'ACTIVE' | 'GIVEN'

export const PROFILE_AVATARS = ['🦊', '🐻', '🌻', '🐱', '🍑', '🐼', '🐰', '🐯', '🐧', '🌿'] as const

export const TRADE_MODES: Record<TradeMode, { label: string; emoji: string }> = {
  FREE: { label: '免费送', emoji: '🎁' },
  ANY: { label: '随便给', emoji: '🫶' },
  PRICED: { label: '标价', emoji: '🏷️' },
}

export const CONDITIONS: Record<Condition, string> = {
  NEW: '全新',
  LIKE_NEW: '几乎全新',
  GOOD: '轻微使用痕迹',
  USED: '明显使用痕迹',
}

export type ImageRef =
  | { kind: 'emoji'; emoji: string; hue: number }
  | { kind: 'file'; url: string }

export function parseImages(raw: string): ImageRef[] {
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

// ===== 新鲜度：24h 内"刚上架"，72h 内"新上架"，之后"已上架 X 天" =====
export type Freshness = { key: 'JUST' | 'NEW' | 'OLD'; label: string; hours: number }

export function freshnessOf(createdAt: string | Date, now = Date.now()): Freshness {
  const t = new Date(createdAt).getTime()
  const hours = Math.max(0, (now - t) / 3600_000)
  if (hours < 24) return { key: 'JUST', label: '刚上架', hours }
  if (hours < 72) return { key: 'NEW', label: '新上架', hours }
  return { key: 'OLD', label: `已上架 ${Math.floor(hours / 24)} 天`, hours }
}

export function timeAgo(date: string | Date, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(date).getTime())
  const min = Math.floor(diff / 60_000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  return new Date(date).toLocaleDateString('zh-CN')
}

// ===== 序列化后的数据形状（API JSON 返回）=====
export type UserDTO = {
  id: string
  name: string
  avatar: string
  building: string
  bio?: string | null
  space?: { id: string; name: string; slug: string; type: string } | null
  role?: 'MEMBER' | 'PLATFORM_ADMIN'
}

export type SpaceDTO = { id: string; name: string; slug: string; type: string }

export type ItemDTO = {
  id: string
  title: string
  description: string
  tradeMode: TradeMode
  price: number | null
  condition: Condition
  images: ImageRef[]
  status: ItemStatus
  givenAt: string | null
  givenTo: { id: string; name: string; avatar: string } | null
  publisher: UserDTO
  wantCount: number
  commentCount: number
  iWant: boolean
  createdAt: string
}

export type CommentDTO = {
  id: string
  content: string
  createdAt: string
  isRetracted: boolean
  user: UserDTO
  // 楼层内回复：正在回复谁（用于展示"回复 @某人"）
  replyTo?: { id: string; name: string } | null
  // 仅顶层评论携带：该楼层下的回复列表
  replies?: CommentDTO[]
}

export type ItemDetailDTO = ItemDTO & {
  wants: Array<{ user: UserDTO; createdAt: string }>
  comments: CommentDTO[]
}

export type StatsDTO = {
  monthPublished: number
  monthGiven: number
  activeCount: number
  daily: Array<{ date: string; published: number; given: number }>
  fastestGiven: Array<{ id: string; title: string; images: ImageRef[]; hoursToGiven: number; publisher: string }>
  mostWanted: Array<{ id: string; title: string; images: ImageRef[]; wantCount: number; publisher: string }>
}

// 发布页可选的占位 emoji（配随机色相生成渐变占位图）
export const PLACEHOLDER_EMOJIS = [
  '🛋️', '🪑', '🚲', '📚', '🧸', '🍳', '🪴', '🍼', '🎮', '☕', '📱', '🎧',
  '🧺', '🛴', '💡', '🧱', '🪟', '🧁', '🚗', '🃏', '🧘', '🍟', '🐾', '💻',
]

export function money(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
