'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, invalidateApi, typeText, useTitle } from '@/lib/client'
import { Camera, Palette, Sparkle } from '@phosphor-icons/react'
import { CONDITIONS, PLACEHOLDER_EMOJIS, TRADE_MODES, money } from '@/lib/constants'
import type { Condition, ImageRef, TradeMode } from '@/lib/constants'
import { useToast } from '@/components/toast'
import { useSession } from '@/components/session-provider'
import { ItemImage } from '@/components/item-image'

type PriceAdvice = { mode: 'free' | 'priced'; min: number | null; max: number | null; reason: string }
type AIResult = { source: 'llm' | 'mock'; provider: string }

const emojiHue = (e: string) => ([...e].reduce((a, c) => a + c.codePointAt(0)!, 7) * 37) % 360


function LoginGate() {
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <span className="text-4xl" aria-hidden>🔐</span>
      <h2 className="mt-3 text-lg font-bold text-zinc-100">请先登录</h2>
      <p className="mt-1 text-sm text-zinc-500">登录后才能发布或编辑闲置，浏览不需要账号</p>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/login" className="btn-primary">登录 / 注册</Link>
        <Link href="/discover" className="btn-ghost">先逛逛</Link>
      </div>
    </div>
  )
}

export default function PublishPage() {
  useTitle('邻集 · 发布闲置')
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  const { showToast } = useToast()
  const { current } = useSession()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tradeMode, setTradeMode] = useState<TradeMode>('PRICED')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<Condition>('LIKE_NEW')
  const [images, setImages] = useState<ImageRef[]>([])
  const [emojiOpen, setEmojiOpen] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [priceBusy, setPriceBusy] = useState(false)
  const [advice, setAdvice] = useState<PriceAdvice | null>(null)
  const [polishBusy, setPolishBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(Boolean(editId))

  // 编辑模式：预填物品数据
  useEffect(() => {
    if (!editId) return
    let cancelled = false
    api<{
      item: {
        title: string
        description: string
        tradeMode: TradeMode
        price: number | null
        condition: Condition
        images: ImageRef[]
        status: string
        publisher: { id: string }
      }
    }>(`/api/items/${editId}`)
      .then(({ item }) => {
        if (cancelled) return
        if (item.status !== 'ACTIVE') {
          showToast('已送出的物品不能再编辑', 'error')
          router.replace(`/items/${editId}`)
          return
        }
        if (current && item.publisher.id !== current.id) {
          showToast('只能编辑自己发布的物品', 'error')
          router.replace(`/items/${editId}`)
          return
        }
        setTitle(item.title)
        setDescription(item.description)
        setTradeMode(item.tradeMode)
        setPrice(item.price != null ? String(item.price) : '')
        setCondition(item.condition)
        setImages(item.images)
        setLoading(false)
      })
      .catch(() => {
        showToast('物品加载失败', 'error')
        router.replace('/discover')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  const addEmoji = (emoji: string) => {
    if (images.length >= 3) return showToast('最多 3 张图', 'error')
    setImages((ims) => [...ims, { kind: 'emoji', emoji, hue: emojiHue(emoji) }])
    setEmojiOpen(false)
  }

  const onUpload = async (file: File) => {
    if (images.length >= 3) return showToast('最多 3 张图', 'error')
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
    if (!res.ok || !data.url) return showToast(data.error || '上传失败', 'error')
    setImages((ims) => [...ims, { kind: 'file', url: data.url! }])
    showToast('图片已上传', 'success')
  }

  // ✨ 智能定价建议
  const askPrice = async () => {
    if (!title.trim()) return showToast('先填写物品名称，AI 才能估价', 'error')
    setPriceBusy(true)
    try {
      const data = await api<{ advice: PriceAdvice } & AIResult>('/api/llm/price', {
        method: 'POST',
        body: JSON.stringify({ title, description }),
      })
      setAdvice(data.advice)
      if (data.advice.mode === 'free') {
        setTradeMode('FREE')
        showToast('✨ 建议免费送，已帮你切换', 'success')
      } else {
        const mid = Math.round(((data.advice.min ?? 0) + (data.advice.max ?? 0)) / 2 / 5) * 5
        if (mid > 0) setPrice(String(mid))
        showToast('估价已填入', 'success')
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : '估价失败', 'error')
    } finally {
      setPriceBusy(false)
    }
  }

  // ✨ 描述润色（打字机效果逐字填入）
  const askPolish = async () => {
    if (!title.trim()) return showToast('先填写物品名称，AI 才能润色', 'error')
    setPolishBusy(true)
    try {
      const data = await api<{ text: string } & AIResult>('/api/llm/polish', {
        method: 'POST',
        body: JSON.stringify({ title, description }),
      })
      setDescription('')
      await typeText((partial) => setDescription(partial), data.text)
      showToast('文案已润色，可继续编辑', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '润色失败', 'error')
    } finally {
      setPolishBusy(false)
    }
  }

  if (!current) return <LoginGate />

  const submit = async () => {
    if (!title.trim()) return showToast('请填写物品名称', 'error')
    if (tradeMode === 'PRICED' && !price) return showToast('标价物品请填写价格', 'error')
    setSubmitting(true)
    try {
      await api<{ id: string }>(editId ? `/api/items/${editId}` : '/api/items', {
        method: editId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          action: editId ? 'edit' : undefined,
          title,
          description,
          tradeMode,
          price: tradeMode === 'PRICED' ? Number(price) : null,
          condition,
          images,
        }),
      })
      invalidateApi(['/api/items'])
      if (editId) {
        showToast('修改已保存', 'success')
        router.push(`/items/${editId}`)
      } else {
        showToast('发布成功', 'success')
        router.push('/discover')
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : (editId ? '保存失败' : '发布失败'), 'error')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-zinc-100">{editId ? '编辑闲置' : '发布闲置'}</h1>
        <span className="text-xs text-zinc-400">当前空间可见 · 当面交接</span>
      </div>

      {/* 图片 */}
      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="section-title">图片 <span className="text-xs font-normal text-zinc-400">（可选，最多 3 张）</span></h2>
          <div className="relative flex gap-2">
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => fileRef.current?.click()}>
              <Camera weight="regular" className="size-4 text-zinc-500" />
              上传实拍
            </button>
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setEmojiOpen((o) => !o)}>
              <Palette weight="regular" className="size-4 text-zinc-500" />
              占位图
            </button>
            {emojiOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setEmojiOpen(false)} />
                <div className="animate-pop-in absolute top-10 right-0 z-50 grid w-72 grid-cols-8 gap-1 rounded-2xl border border-white/10 bg-zinc-950 p-3 shadow-2xl">
                  {PLACEHOLDER_EMOJIS.map((e) => (
                    <button key={e} className="grid size-8 place-items-center rounded-lg text-xl transition hover:bg-white/[0.08]" onClick={() => addEmoji(e)}>
                      {e}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUpload(f)
            e.target.value = ''
          }}
        />
        {images.length === 0 ? (
          <p className="rounded-xl bg-white/[0.04] py-6 text-center text-sm text-zinc-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            还没有图片 · 选一张占位图或上传实拍
          </p>
        ) : (
          <div className="flex gap-2">
            {images.map((im, i) => (
              <div key={i} className="relative">
                <ItemImage image={im} className="size-16 rounded-xl shadow-[inset_0_0_0_1px_rgba(28,25,23,0.12)]" emojiSize="text-2xl" />
                <button
                  className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-zinc-700 text-[10px] text-white shadow"
                  onClick={() => setImages((ims) => ims.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 名称 + 成色 */}
      <section className="card space-y-4 p-4">
        <div>
          <label className="section-title mb-1.5 block">物品名称 <span className="text-rose-500">*</span></label>
          <input className="input" placeholder="如：婴儿轻便伞车" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="section-title mb-1.5 block">物品成色</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CONDITIONS) as Condition[]).map((c) => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                className={`chip text-xs ${
                  condition === c ? 'bg-violet-500 text-white' : 'bg-white/[0.04] text-zinc-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-white/[0.08]'
                }`}
              >
                {CONDITIONS[c]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 交易方式 + AI 估价 */}
      <section className="card space-y-4 p-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="section-title">期望交易方式</label>
            <button className="btn-em gap-1 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.25)] hover:bg-amber-400/15" onClick={askPrice} disabled={priceBusy}>
              <Sparkle weight="fill" className={`size-3.5 text-amber-500 ${priceBusy ? 'animate-pulse' : ''}`} />
              {priceBusy ? '估价中…' : 'AI 智能定价'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(TRADE_MODES) as TradeMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setTradeMode(m)}
                className={`rounded-xl py-2.5 text-sm font-semibold transition active:scale-[0.97] ${
                  tradeMode === m
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-[0_8px_24px_-10px_rgba(147,51,234,0.6)]'
                    : 'bg-white/[0.04] text-zinc-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-white/[0.08]'
                }`}
              >
                {TRADE_MODES[m].emoji} {TRADE_MODES[m].label}
              </button>
            ))}
          </div>
        </div>

        {tradeMode === 'PRICED' && (
          <div>
            <label className="section-title mb-1.5 block">价格（元）</label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-semibold text-zinc-400">¥</span>
              <input className="input pl-8" type="number" min="0" step="0.1" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
        )}

        {advice && (
          <div className="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-900 shadow-[inset_0_0_0_1px_rgba(180,83,9,0.12)]">
            <p className="flex items-center gap-1.5 font-semibold">
              <Sparkle weight="fill" className="size-3.5 shrink-0 text-amber-500" />
              AI 建议：{advice.mode === 'free' ? '这件建议直接免费送' : `定价 ${money(advice.min ?? 0)} ~ ${money(advice.max ?? 0)} 元`}
            </p>
            <p className="mt-0.5 pl-5 text-xs text-amber-300/80">{advice.reason}</p>
          </div>
        )}
      </section>

      {/* 描述 + AI 润色 */}
      <section className="card space-y-2 p-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="section-title">物品描述</label>
            <span className="flex items-center gap-2 text-xs text-zinc-400">
              {polishBusy ? 'AI 正在书写…' : `${description.length}/1000`}
              <button className="btn-em gap-1 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.25)] hover:bg-amber-400/15" onClick={askPolish} disabled={polishBusy}>
                <Sparkle weight="fill" className={`size-3.5 text-amber-500 ${polishBusy ? 'animate-pulse' : ''}`} />
                {polishBusy ? '润色中…' : 'AI 润色'}
              </button>
            </span>
          </div>
        <textarea
          className="input min-h-28 resize-y"
          placeholder="随便写几句：用了多久、哪里有瑕疵、什么时候方便交接…懒得写就点上面的 AI 润色"
          value={description}
          maxLength={1000}
          onChange={(e) => setDescription(e.target.value)}
        />
        </div>
      </section>

      <button className="btn-primary w-full py-3.5 text-base" onClick={submit} disabled={submitting || loading}>
        {loading ? '加载中…' : submitting ? (editId ? '保存中…' : '发布中…') : editId ? '保存修改' : '发布到当前空间'}
      </button>
    </div>
  )
}
