'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'

export type GlassSelectOption = {
  value: string
  label: string
  description?: string
  emoji?: string
}

export function GlassSelect({
  value,
  options,
  onChange,
  ariaLabel,
  compact = false,
}: {
  value: string
  options: GlassSelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border text-left transition duration-200 ${
          compact ? 'px-2.5 py-2' : 'px-3.5 py-2.5'
        } ${
          open
            ? 'border-violet-400/60 bg-violet-400/[0.09] shadow-[0_0_0_3px_rgba(139,92,246,0.13),0_12px_32px_rgba(0,0,0,0.22)]'
            : 'border-white/10 bg-white/[0.04] hover:border-violet-400/35 hover:bg-white/[0.065]'
        }`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span className={`grid shrink-0 place-items-center rounded-lg bg-violet-400/10 ${compact ? 'size-7 text-sm' : 'size-8 text-base'}`} aria-hidden>
          {selected?.emoji ?? '✦'}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium text-zinc-100 ${compact ? 'text-xs' : 'text-sm'}`}>{selected?.label ?? '请选择'}</span>
          {!compact && selected?.description && <span className="mt-0.5 block truncate text-[11px] text-zinc-500">{selected.description}</span>}
        </span>
        <CaretDown weight="bold" className={`size-4 shrink-0 text-zinc-500 transition duration-200 group-hover:text-violet-300 ${open ? 'rotate-180 text-violet-300' : ''}`} />
        <span className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400/0 to-transparent transition group-hover:via-violet-400/45" />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="animate-pop-in absolute z-[70] mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#17131f]/95 p-1.5 shadow-[0_22px_60px_rgba(0,0,0,0.55),0_0_35px_rgba(124,58,237,0.12)] backdrop-blur-2xl"
        >
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {options.map((option) => {
              const active = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`group/option flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    active
                      ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 text-white shadow-[inset_0_0_0_1px_rgba(167,139,250,0.18)]'
                      : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-base transition ${active ? 'bg-violet-400/15' : 'bg-white/[0.04] group-hover/option:bg-white/[0.08]'}`} aria-hidden>
                    {option.emoji ?? '✦'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{option.label}</span>
                    {option.description && <span className="mt-0.5 block truncate text-[11px] text-zinc-500">{option.description}</span>}
                  </span>
                  {active && <Check weight="bold" className="size-4 shrink-0 text-violet-300" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
