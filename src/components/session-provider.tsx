'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api, invalidateApi } from '@/lib/client'
import type { UserDTO } from '@/lib/constants'
import { useToast } from './toast'

type SessionCtx = {
  /** 当前登录用户；null = 未登录（浏览公开，操作需登录） */
  current: UserDTO | null
  logout: () => Promise<void>
}

const Ctx = createContext<SessionCtx | null>(null)

export function SessionProvider({
  initialCurrent,
  children,
}: {
  initialCurrent: UserDTO | null
  children: ReactNode
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [session, setSession] = useState(() => ({ source: initialCurrent, current: initialCurrent }))
  const current = session.source === initialCurrent ? session.current : initialCurrent

  const logout = async () => {
    await api('/api/auth', { method: 'DELETE' })
    setSession({ source: initialCurrent, current: null })
    invalidateApi(['/api/items'])
    showToast('已退出登录')
    router.replace('/login')
    router.refresh()
  }

  return <Ctx.Provider value={{ current, logout }}>{children}</Ctx.Provider>
}

export function useSession() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
