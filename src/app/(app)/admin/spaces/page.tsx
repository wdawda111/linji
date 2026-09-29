'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Clock, ShieldCheck, X } from '@phosphor-icons/react'
import { api, useTitle } from '@/lib/client'
import { useToast } from '@/components/toast'

type Application = {
  id: string
  name: string
  type: string
  contact: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy: string | null
  createdAt: string
}

type SpaceInvite = { id: string; name: string; type: string; inviteCode: string | null }

export default function SpaceApplicationsPage() {
  useTitle('邻集 · 空间审核')
  const { showToast } = useToast()
  const [applications, setApplications] = useState<Application[] | null>(null)
  const [spaces, setSpaces] = useState<SpaceInvite[]>([])

  const load = useCallback(() => {
    api<{ applications: Application[]; spaces: SpaceInvite[] }>('/api/spaces/applications')
      .then((data) => {
        setApplications(data.applications)
        setSpaces(data.spaces)
      })
      .catch((error) => {
        showToast(error instanceof Error ? error.message : '申请加载失败', 'error')
        setApplications([])
      })
  }, [showToast])

  useEffect(() => { load() }, [load])

  const review = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api('/api/spaces/applications', { method: 'PATCH', body: JSON.stringify({ id, action }) })
      showToast(action === 'approve' ? '空间已开通' : '申请已拒绝', 'success')
      load()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '审核失败', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-400/10 px-2.5 py-1 text-[11px] font-medium text-violet-300 ring-1 ring-violet-400/20">
          <ShieldCheck weight="fill" className="size-3.5" /> 平台管理
        </span>
        <h1 className="mt-3 text-2xl font-black text-zinc-100">空间开通申请</h1>
        <p className="mt-1 text-sm text-zinc-500">审核通过后，新空间才会出现在注册列表中。</p>
      </header>

      <section className="card space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">已开通空间的邀请码</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">新社区尚无成员时，可先把邀请码分享给第一位业主；加入后，成员也能在侧栏复制。</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {spaces.map((space) => (
            <div key={space.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-zinc-200">{space.name} <span className="font-normal text-zinc-500">· {space.type}</span></p>
                <p className="mt-1 font-mono text-xs tracking-[0.12em] text-violet-200">{space.inviteCode ?? '生成中…'}</p>
              </div>
              <button
                type="button"
                disabled={!space.inviteCode}
                className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs"
                onClick={async () => {
                  if (!space.inviteCode) return
                  try {
                    await navigator.clipboard.writeText(space.inviteCode)
                    showToast(`${space.name}的邀请码已复制`, 'success')
                  } catch {
                    showToast('复制失败，请手动记录邀请码', 'error')
                  }
                }}
              >
                复制
              </button>
            </div>
          ))}
        </div>
      </section>

      {applications === null ? (
        <div className="card py-16 text-center text-sm text-zinc-500">正在加载申请…</div>
      ) : applications.length === 0 ? (
        <div className="card py-16 text-center text-sm text-zinc-500">暂时没有空间申请</div>
      ) : (
        <div className="space-y-3">
          {applications.map((item) => (
            <article key={item.id} className="card p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-zinc-100">{item.name}</h2>
                    <span className="chip text-[11px] text-zinc-400">{item.type}</span>
                    <span className={`text-xs ${item.status === 'PENDING' ? 'text-amber-300' : item.status === 'APPROVED' ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {item.status === 'PENDING' ? '待审核' : item.status === 'APPROVED' ? '已通过' : '已拒绝'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{item.reason}</p>
                  <p className="mt-2 text-xs text-zinc-500">联系方式：{item.contact} · {new Date(item.createdAt).toLocaleString('zh-CN')}</p>
                </div>
                {item.status === 'PENDING' && (
                  <div className="flex shrink-0 gap-2">
                    <button className="btn-ghost px-3 py-2 text-sm text-rose-300" onClick={() => review(item.id, 'reject')}><X className="size-4" />拒绝</button>
                    <button className="btn-primary px-3 py-2 text-sm" onClick={() => review(item.id, 'approve')}><Check className="size-4" />通过</button>
                  </div>
                )}
              </div>
              {item.status !== 'PENDING' && item.reviewedBy && <p className="mt-3 flex items-center gap-1 text-xs text-zinc-600"><Clock className="size-3.5" />由 {item.reviewedBy} 审核</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
