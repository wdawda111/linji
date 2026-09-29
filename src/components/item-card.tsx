'use client'

import Link from 'next/link'
import { freshnessOf, timeAgo, money } from '@/lib/constants'
import type { ItemDTO } from '@/lib/constants'
import { FreshnessBadge, ConditionChip } from './badges'
import { ItemImage } from './item-image'
import { WantButton } from './want-button'

// 闲鱼桌面版式卡片：方图 / 两行标题 / 标签行 / 价格行（右「想要」数）/ 卖家行
export function ItemCard({ item }: { item: ItemDTO }) {
  const given = item.status === 'GIVEN'
  const fresh = freshnessOf(item.createdAt)

  return (
    <Link
      href={`/items/${item.id}`}
      className={`card card-hover group block overflow-hidden ${given ? 'opacity-75' : ''}`}
    >
      {/* 方图：新鲜度角标左上 */}
      <div className="relative aspect-square overflow-hidden">
        <ItemImage
          image={item.images[0]}
          className={`h-full w-full transition-transform duration-300 group-hover:scale-[1.04] ${given ? 'grayscale-[0.6]' : ''}`}
          emojiSize="text-5xl"
        />
        <div className="absolute top-2 left-2">
          {given ? (
            <span className="rounded-full bg-zinc-900/85 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">已送出</span>
          ) : (
            <FreshnessBadge fresh={fresh} />
          )}
        </div>
      </div>

      <div className="space-y-1.5 p-2.5">
        {/* 两行标题 */}
        <p className="line-clamp-2 min-h-10 text-[13px] leading-snug font-medium text-zinc-100">{item.title}</p>

        {/* 标签行：成色 + 发布时间 */}
        <div className="flex items-center gap-1.5">
          <ConditionChip condition={item.condition} />
          <span className="tnum text-[11px] text-zinc-500">{timeAgo(item.createdAt)}</span>
        </div>

        {/* 价格行：左大字价格，右「想要」数 */}
        <p className="flex items-baseline justify-between gap-2">
          {item.tradeMode === 'PRICED' && item.price != null ? (
            <span className="tnum flex items-baseline font-bold text-amber-300">
              <span className="text-xs">¥</span>
              <span className="text-lg leading-none">{money(item.price)}</span>
            </span>
          ) : (
            <span className={`text-[15px] leading-none font-bold ${item.tradeMode === 'FREE' ? 'text-rose-400' : 'text-violet-300'}`}>
              {item.tradeMode === 'FREE' ? '免费送' : '随便给'}
            </span>
          )}
          <WantButton itemId={item.id} initialWanted={item.iWant} initialCount={item.wantCount} disabled={given} />
        </p>

        {/* 卖家行 */}
        <p className="flex items-center justify-between gap-2 pt-0.5">
          <span className="flex min-w-0 items-center gap-1 text-[11px] text-zinc-500">
            <span>{item.publisher.avatar}</span>
            <span className="truncate">{item.publisher.name}</span>
          </span>
          <span className="tnum inline-flex shrink-0 items-center gap-0.5 text-[11px] text-zinc-500">
            💬 {item.commentCount}
          </span>
        </p>
      </div>
    </Link>
  )
}

// 加载骨架（与卡片同构）
export function CardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden>
      <div className="aspect-square animate-pulse bg-white/[0.05]" />
      <div className="space-y-2 p-2.5">
        <div className="h-4 w-full animate-pulse rounded bg-white/[0.05]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-5 w-16 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.05]" />
      </div>
    </div>
  )
}
