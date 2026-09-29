'use client'

import { useEffect, useState } from 'react'
import { CopySimple } from '@phosphor-icons/react'
import { api } from '@/lib/client'
import { useSession } from '@/components/session-provider'
import { useToast } from '@/components/toast'

export function SpaceInviteCode() {
  const { current } = useSession()
  const { showToast } = useToast()
  const [code, setCode] = useState('')

  useEffect(() => {
    if (current?.role !== 'MEMBER') return
    let active = true
    api<{ inviteCode: string }>('/api/spaces/invite')
      .then((data) => active && setCode(data.inviteCode))
      .catch(() => undefined)
    return () => { active = false }
  }, [current?.id, current?.role])

  if (current?.role !== 'MEMBER' || !code) return null

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-violet-400/15 bg-violet-400/[0.05] px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-zinc-500">社区邀请码</p>
        <p className="truncate font-mono text-xs font-semibold tracking-[0.12em] text-violet-200">{code}</p>
      </div>
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-violet-200 transition hover:bg-violet-400/10"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code)
            showToast('邀请码已复制，发给邻居即可注册', 'success')
          } catch {
            showToast('复制失败，请手动记录邀请码', 'error')
          }
        }}
      >
        <CopySimple weight="regular" className="size-3.5" />
        复制
      </button>
    </div>
  )
}
