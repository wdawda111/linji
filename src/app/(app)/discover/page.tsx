'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { apiSWR, SPACE_CHANGE_EVENT, useTitle } from '@/lib/client'
import { TRADE_MODES } from '@/lib/constants'
import type { ItemDTO, TradeMode } from '@/lib/constants'
import { useSession } from '@/components/session-provider'
import { ItemCard, CardSkeleton } from '@/components/item-card'
import { SITE_NAME } from '@/lib/site-config'

const MODES: Array<{ key: 'all' | TradeMode; label: string }> = [
  { key: 'all', label: '全部' },
  ...Object.entries(TRADE_MODES).map(([key, v]) => ({ key: key as TradeMode, label: v.label })),
]

export default function DiscoverPage() {
  useTitle('邻集 · 发现')
  const { current } = useSession()
  const [items, setItems] = useState<ItemDTO[] | null>(null)
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<'all' | TradeMode>('all')
  const [status, setStatus] = useState<'ACTIVE' | 'GIVEN'>('ACTIVE')
  const [spaceVersion, setSpaceVersion] = useState(0)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const refreshSpaceItems = () => {
      setItems(null)
      setSpaceVersion((version) => version + 1)
    }
    window.addEventListener(SPACE_CHANGE_EVENT, refreshSpaceItems)
    return () => window.removeEventListener(SPACE_CHANGE_EVENT, refreshSpaceItems)
  }, [])

  const urlFor = (p: { q: string; mode: string; status: string }) => {
    const sp = new URLSearchParams({ mode: p.mode, status: p.status })
    if (p.q.trim()) sp.set('q', p.q.trim())
    return `/api/items?${sp}`
  }

  useEffect(() => {
    let active = true
    const url = urlFor({ q, mode, status })
    apiSWR<{ items: ItemDTO[] }>(url, (fresh) => active && setItems(fresh.items))
      .then((data) => active && setItems(data.items))
      .catch(() => active && setItems([]))
    // 登录状态变化后 iWant 会变化，重新拉取
    return () => { active = false }
  }, [q, mode, status, current?.id, spaceVersion])

  const onSearch = (v: string) => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => setQ(v), 250)
  }

  return (
    <div className="space-y-5">
      {/* 页头 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">发现好物</h1>
          <p className="mt-0.5 text-sm text-zinc-400">{SITE_NAME}内可见 · 当面交接</p>
        </div>
        <span className="tnum text-xs text-zinc-400">
          {items === null ? '' : `${items.length} 件${status === 'ACTIVE' ? '在流转' : '已送出'}`}
        </span>
      </div>

      {/* Composer 式搜索 */}
      <div className="relative">
        <MagnifyingGlass weight="regular" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          className="input rounded-full py-3 pl-10"
          placeholder="搜索你想要的闲置好物"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* 在售/归档 + 交易方式筛选 */}
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex shrink-0 rounded-full bg-white/[0.05] p-0.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] text-xs font-medium">
          {(['ACTIVE', 'GIVEN'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={`rounded-full px-3 py-1.5 transition ${
                status === s ? 'bg-white/[0.14] text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {s === 'ACTIVE' ? '在售中' : '已送出'}
            </button>
          ))}
        </div>
        <span className="h-5 w-px shrink-0 bg-white/10" />
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            aria-pressed={mode === m.key}
            className={`chip !px-3 !py-1.5 text-xs ${
              mode === m.key
                ? 'bg-white text-zinc-950'
                : 'bg-white/[0.04] text-zinc-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-white/[0.08]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* 信息流：按新鲜度排序（越新越靠前） */}
      {items === null ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card grid place-items-center gap-2 py-16 text-center">
          <span className="text-4xl" aria-hidden>🍃</span>
          <div>
            <p className="font-medium text-zinc-200">{q ? '没找到相关闲置' : '这里还很干净'}</p>
            <p className="mt-1 text-sm text-zinc-400">{q ? '换个关键词试试？' : '把家里闲置的宝贝发上来吧'}</p>
          </div>
          <Link href="/publish" className="btn-primary mt-1">发布闲置</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {items.map((it) => (
            <ItemCard key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  )
}
