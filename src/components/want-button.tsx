'use client'

import { useState } from 'react'
import { Heart } from '@phosphor-icons/react'
import { api } from '@/lib/client'
import { useToast } from './toast'

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <Heart
    weight={filled ? 'fill' : 'regular'}
    className={`size-4 transition ${filled ? 'text-rose-500' : 'text-zinc-400'}`}
  />
)

// "想要"按钮：乐观更新，失败回滚
export function WantButton({
  itemId,
  initialWanted,
  initialCount,
  disabled = false,
  size = 'sm',
}: {
  itemId: string
  initialWanted: boolean
  initialCount: number
  disabled?: boolean
  size?: 'sm' | 'lg'
}) {
  const [wanted, setWanted] = useState(initialWanted)
  const [count, setCount] = useState(initialCount)
  const [busy, setBusy] = useState(false)
  const { showToast } = useToast()

  const toggle = async () => {
    if (busy || disabled) return
    setBusy(true)
    const prev = { wanted, count }
    setWanted(!wanted)
    setCount(count + (wanted ? -1 : 1))
    try {
      const data = await api<{ wanted: boolean; wantCount: number }>(`/api/items/${itemId}/want`, { method: 'POST' })
      setWanted(data.wanted)
      setCount(data.wantCount)
    } catch (e) {
      setWanted(prev.wanted)
      setCount(prev.count)
      showToast(e instanceof Error ? e.message : '操作失败', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (size === 'lg')
    return (
      <button
        onClick={toggle}
        disabled={disabled}
        aria-pressed={wanted}
        className={`btn-em h-12 min-w-0 flex-1 px-2 py-0 text-sm ${
          wanted
            ? 'bg-rose-400/15 text-rose-300 shadow-[inset_0_0_0_1.5px_rgba(251,113,133,0.45)] hover:bg-rose-400/25'
            : 'bg-rose-400/10 text-rose-300 shadow-[inset_0_0_0_1.5px_rgba(251,113,133,0.45)] hover:bg-rose-400/15'
        }`}
      >
        <HeartIcon filled={wanted} />
        {wanted ? '已想要' : '我想要'} · {count}
      </button>
    )

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle()
      }}
      disabled={disabled}
      aria-pressed={wanted}
      className={`tnum inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition active:scale-95 disabled:opacity-50 ${
        wanted ? 'bg-rose-400/15 text-rose-300' : 'bg-white/[0.06] text-zinc-500 hover:bg-violet-400/15 hover:text-violet-300'
      }`}
    >
      <HeartIcon filled={wanted} />
      {count > 0 ? count : '想要'}
    </button>
  )
}
