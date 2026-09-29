'use client'

import { CONDITIONS, TRADE_MODES, money } from '@/lib/constants'
import type { Condition, Freshness, TradeMode } from '@/lib/constants'

// 新鲜度徽章：24h 内"刚上架"（呼吸点）、72h 内"新上架"、更久"已上架 X 天"
export function FreshnessBadge({ fresh }: { fresh: Freshness }) {
  if (fresh.key === 'JUST')
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-900/75 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-70" />
          <span className="relative inline-flex size-1.5 rounded-full bg-fuchsia-500" />
        </span>
        刚上架
      </span>
    )
  if (fresh.key === 'NEW')
    return (
      <span className="shrink-0 rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-950 shadow-sm">
        新上架
      </span>
    )
  return (
    <span className="shrink-0 rounded-full bg-zinc-900/75 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
      {fresh.label}
    </span>
  )
}

// 交易方式徽章（标价时显示价格）
export function TradeBadge({ mode, price }: { mode: TradeMode; price: number | null }) {
  if (mode === 'FREE')
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-400/15 px-2.5 py-1 text-[11px] font-bold text-rose-300">
        🎁 免费送
      </span>
    )
  if (mode === 'ANY')
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-400/15 px-2.5 py-1 text-[11px] font-bold text-violet-300">
        🫶 随便给
      </span>
    )
  return (
    <span className="tnum inline-flex shrink-0 items-baseline gap-0.5 rounded-full bg-zinc-900 px-2.5 py-1 font-bold text-white">
      <span className="text-[11px]">¥</span>
      <span className="text-sm">{price != null ? money(price) : '--'}</span>
    </span>
  )
}

export function ConditionChip({ condition }: { condition: Condition }) {
  return (
    <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-zinc-500">
      {CONDITIONS[condition]}
    </span>
  )
}

export function TradeModeLabel({ mode }: { mode: TradeMode }) {
  return (
    <span>{TRADE_MODES[mode].emoji} {TRADE_MODES[mode].label}</span>
  )
}
