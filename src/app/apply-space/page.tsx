'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, ShieldCheck } from '@phosphor-icons/react'
import { GlassSelect } from '@/components/glass-select'
import { api, useTitle } from '@/lib/client'
import { useToast } from '@/components/toast'

const SPACE_TYPES = [
  { value: '小区', label: '小区', description: '完整住宅社区', emoji: '🏘️' },
  { value: '楼栋', label: '楼栋', description: '单栋居民楼', emoji: '🏙️' },
  { value: '办公楼', label: '办公楼', description: '整栋办公空间', emoji: '🏢' },
  { value: '办公室', label: '办公室', description: '团队内部空间', emoji: '💼' },
]

export default function ApplySpacePage() {
  useTitle('邻集 · 申请开通空间')
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [type, setType] = useState('小区')
  const [contact, setContact] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await api('/api/spaces/applications', {
        method: 'POST',
        body: JSON.stringify({ name, type, contact, reason }),
      })
      setSubmitted(true)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '申请提交失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0d0b12] px-5 py-10 text-zinc-100">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(60%_48%_at_50%_0%,rgba(124,58,237,0.18),transparent_70%)]" />
        <div className="absolute right-[12%] bottom-20 size-44 rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-lg">
        <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-200">
          <ArrowLeft className="size-4" /> 返回登录 / 注册
        </Link>

        {submitted ? (
          <section className="card p-8 text-center shadow-[0_24px_70px_rgba(76,29,149,0.18)]">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300">
              <CheckCircle weight="fill" className="size-7" />
            </span>
            <h1 className="mt-5 text-2xl font-black">申请已提交</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">平台管理员审核通过后，空间会出现在注册页的“所属空间”列表中。</p>
            <Link href="/login" className="btn-primary mt-6 w-full py-3">返回登录页</Link>
          </section>
        ) : (
          <>
            <header className="mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-400/10 px-2.5 py-1 text-[11px] font-medium text-violet-300 ring-1 ring-violet-400/20">
                <ShieldCheck weight="fill" className="size-3.5" /> 管理员审核
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight">申请开通新空间</h1>
              <p className="mt-2 text-sm leading-6 text-zinc-500">适用于小区、楼栋和办公空间。审核通过前不会创建空间，也不会影响正常注册。</p>
            </header>

            <form onSubmit={submit} className="card space-y-5 p-6 shadow-[0_24px_70px_rgba(76,29,149,0.18)]">
              <label className="block text-sm font-medium text-zinc-300">
                空间名称
                <input className="input mt-2" placeholder="例如：春风里小区" value={name} maxLength={30} onChange={(event) => setName(event.target.value)} required />
              </label>

              <div>
                <p className="mb-2 text-sm font-medium text-zinc-300">空间类型</p>
                <GlassSelect ariaLabel="空间类型" value={type} onChange={setType} options={SPACE_TYPES} />
              </div>

              <label className="block text-sm font-medium text-zinc-300">
                联系方式
                <input className="input mt-2" placeholder="手机号或微信号" value={contact} maxLength={60} onChange={(event) => setContact(event.target.value)} required />
              </label>

              <label className="block text-sm font-medium text-zinc-300">
                申请说明
                <textarea className="input mt-2 min-h-28 resize-none" placeholder="请说明你与该社区或办公空间的关系，以及申请用途" value={reason} maxLength={200} onChange={(event) => setReason(event.target.value)} required />
                <span className="tnum mt-1.5 block text-right text-xs font-normal text-zinc-600">{reason.length}/200</span>
              </label>

              <button type="submit" className="btn-primary w-full py-3 text-base" disabled={submitting}>
                {submitting ? '正在提交…' : '提交审核申请'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
