'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastType = 'info' | 'success' | 'error'
type Toast = { id: number; msg: string; type: ToastType }

const Ctx = createContext<{ showToast: (msg: string, type?: ToastType) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((msg: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((ts) => [...ts.slice(-2), { id, msg, type }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 2600)
  }, [])

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto max-w-sm rounded-full px-4 py-2 text-sm font-medium shadow-lg ring-1 ${
              t.type === 'error'
                ? 'bg-rose-400/100 text-white ring-rose-400/40'
                : t.type === 'success'
                  ? 'bg-white text-zinc-950 ring-white/30'
                  : 'bg-zinc-900 text-zinc-100 ring-white/10'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
