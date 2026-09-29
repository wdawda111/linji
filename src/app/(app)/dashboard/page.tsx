'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Basket,
  CalendarBlank,
  ChartLineUp,
  Handshake,
  Heart,
  Lightning,
  Package,
} from '@phosphor-icons/react'
import { apiSWR, useTitle } from '@/lib/client'
import type { ImageRef, StatsDTO } from '@/lib/constants'
import { ItemImage } from '@/components/item-image'
import { SITE_NAME } from '@/lib/site-config'

type RankKey = 'fast' | 'wanted'
type RankItem = {
  id: string
  title: string
  images: ImageRef[]
  publisher: string
  metric: string
}

const RANK_META = {
  fast: {
    title: '最快流转',
    description: '从发布到送出的用时排行',
    icon: Lightning,
    iconClass: 'bg-amber-400/10 text-amber-300',
  },
  wanted: {
    title: '人气好物',
    description: '想要人数最多的在售物品',
    icon: Heart,
    iconClass: 'bg-rose-400/10 text-rose-300',
  },
} as const

export default function DashboardPage() {
  useTitle('邻集 · 数据看板')
  const [stats, setStats] = useState<StatsDTO | null>(null)
  const [failed, setFailed] = useState(false)
  const [rankTab, setRankTab] = useState<RankKey>('fast')

  useEffect(() => {
    apiSWR<StatsDTO>('/api/stats', (fresh) => setStats(fresh))
      .then(setStats)
      .catch(() => setFailed(true))
  }, [])

  if (failed)
    return <div className="card py-16 text-center text-sm text-zinc-500">看板加载失败，刷新试试</div>

  if (!stats) return <DashboardSkeleton />

  const metrics = [
    { icon: Package, label: '本月发布', value: stats.monthPublished, color: 'text-violet-300', bg: 'bg-violet-400/10' },
    { icon: Handshake, label: '本月送出', value: stats.monthGiven, color: 'text-cyan-300', bg: 'bg-cyan-400/10' },
    { icon: Basket, label: '正在流转', value: stats.activeCount, color: 'text-emerald-300', bg: 'bg-emerald-400/10' },
  ]

  const rankings: Record<RankKey, RankItem[]> = {
    fast: stats.fastestGiven.map((item) => ({
      ...item,
      metric: item.hoursToGiven < 1 ? '不到 1 小时' : `${item.hoursToGiven} 小时`,
    })),
    wanted: stats.mostWanted.map((item) => ({
      ...item,
      metric: `${item.wantCount} 人想要`,
    })),
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
      <header>
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-400/10 px-2.5 py-1 text-[11px] font-medium text-violet-300 ring-1 ring-violet-400/20">
            <ChartLineUp weight="bold" className="size-3.5" /> {SITE_NAME}
          </span>
          <h1 className="text-2xl font-black tracking-tight text-zinc-100 sm:text-3xl">当前空间的流转脉搏</h1>
          <p className="mt-1.5 text-sm text-zinc-500">每一次送出，都让一件好东西继续被使用</p>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(135deg,rgba(124,58,237,0.13),rgba(255,255,255,0.035)_55%)]">
        <div className="grid grid-cols-3 divide-x divide-white/[0.07]">
          {metrics.map((metric) => (
            <div key={metric.label} className="px-3 py-4 sm:flex sm:items-center sm:gap-3 sm:px-5 sm:py-5">
              <span className={`mb-3 grid size-8 place-items-center rounded-xl sm:mb-0 sm:size-10 ${metric.bg} ${metric.color}`}>
                <metric.icon weight="bold" className="size-4 sm:size-5" />
              </span>
              <div>
                <p className="tnum text-2xl font-black tracking-tight text-zinc-50 sm:text-3xl">{metric.value}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500 sm:text-xs">{metric.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <TrendChart daily={stats.daily} />

      <div className="grid grid-cols-2 rounded-xl bg-white/[0.04] p-1 md:hidden" role="tablist" aria-label="榜单切换">
        {(Object.keys(RANK_META) as RankKey[]).map((key) => {
          const meta = RANK_META[key]
          return (
            <button
              key={key}
              role="tab"
              aria-selected={rankTab === key}
              onClick={() => setRankTab(key)}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                rankTab === key ? 'bg-white/[0.1] text-zinc-100 shadow-sm' : 'text-zinc-500'
              }`}
            >
              {meta.title}
            </button>
          )
        })}
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-4">
        {(Object.keys(RANK_META) as RankKey[]).map((key) => (
          <RankingPanel
            key={key}
            kind={key}
            items={rankings[key]}
            className={rankTab === key ? 'block' : 'hidden md:block'}
          />
        ))}
      </div>
    </div>
  )
}

function TrendChart({ daily }: { daily: StatsDTO['daily'] }) {
  const n = daily.length
  const max = Math.max(3, ...daily.map((day) => Math.max(day.published, day.given)))
  const publishedTotal = daily.reduce((sum, day) => sum + day.published, 0)
  const givenTotal = daily.reduce((sum, day) => sum + day.given, 0)
  const fx = (i: number) => (n === 1 ? 50 : 2 + (i / (n - 1)) * 96)
  const fy = (value: number) => 7 + (1 - value / max) * 76
  const points = (key: 'published' | 'given') => daily.map((day, i) => `${fx(i)},${fy(day[key])}`).join(' ')
  const labelIndexes = new Set([0, 3, 6, 9, n - 1])

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-zinc-100">
            <span className="grid size-8 place-items-center rounded-lg bg-violet-400/10 text-violet-300">
              <CalendarBlank weight="bold" className="size-4" />
            </span>
            近 14 天趋势
          </h2>
          <p className="mt-2 text-xs text-zinc-500">发布 {publishedTotal} 件 · 成功送出 {givenTotal} 件</p>
        </div>
        <div className="flex shrink-0 gap-3 pt-1 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-violet-400" />发布</span>
          <span className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-cyan-400" />送出</span>
        </div>
      </div>

      <div className="relative mt-4 h-40 w-full sm:h-48" role="img" aria-label="近 14 天发布与送出折线图">
        {[8, 45, 82].map((top) => (
          <div key={top} className="absolute inset-x-0 border-t border-dashed border-white/[0.07]" style={{ top: `${top}%` }} />
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-[calc(100%-1.25rem)] w-full overflow-visible">
          <defs>
            <linearGradient id="dashboard-published-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`2,100 ${points('published')} 98,100`} fill="url(#dashboard-published-fill)" />
          <polyline points={points('published')} fill="none" stroke="#a78bfa" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={points('given')} fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        {daily.map((day, i) => (
          <div key={day.date}>
            {labelIndexes.has(i) && (
              <span
                className={`tnum absolute bottom-0 text-[10px] text-zinc-600 ${i === 0 ? '' : i === n - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
                style={{ left: `${fx(i)}%` }}
              >
                {day.date.slice(3)}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function RankingPanel({ kind, items, className }: { kind: RankKey; items: RankItem[]; className: string }) {
  const meta = RANK_META[kind]
  const Icon = meta.icon

  return (
    <section className={`overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] ${className}`}>
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
        <span className={`grid size-9 place-items-center rounded-xl ${meta.iconClass}`}>
          <Icon weight="fill" className="size-4.5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-zinc-100">{meta.title}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{meta.description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">暂时还没有数据</p>
      ) : (
        <ol className="divide-y divide-white/[0.06] px-2 sm:px-3">
          {items.map((item, index) => (
            <li key={item.id}>
              <Link href={`/items/${item.id}`} className="group grid grid-cols-[1.5rem_3rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl px-2 py-3 transition hover:bg-white/[0.045] sm:gap-3">
                <span className={`tnum text-center text-sm font-black ${index === 0 ? 'text-amber-300' : 'text-zinc-600'}`}>{index + 1}</span>
                <ItemImage image={item.images[0]} className="size-12 rounded-xl" emojiSize="text-xl" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-200 group-hover:text-violet-200">{item.title}</span>
                  <span className="mt-1 block truncate text-xs text-zinc-500">{item.publisher} 发布</span>
                </span>
                <span className="flex items-center gap-1 pl-1 text-xs font-semibold whitespace-nowrap text-zinc-400">
                  {item.metric}<ArrowUpRight className="hidden size-3 text-zinc-600 sm:block" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4" aria-busy="true">
      <div className="h-16 w-64 animate-pulse rounded-xl bg-white/[0.05]" />
      <div className="h-24 animate-pulse rounded-2xl bg-white/[0.05]" />
      <div className="h-60 animate-pulse rounded-2xl bg-white/[0.05]" />
      <div className="h-56 animate-pulse rounded-2xl bg-white/[0.05]" />
    </div>
  )
}
