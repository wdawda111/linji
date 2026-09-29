'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { api, invalidateApi, useTitle } from '@/lib/client'
import { Handshake, ChatCircleDots, PencilSimple, Trash, CaretDown } from '@phosphor-icons/react'
import { freshnessOf, timeAgo, money } from '@/lib/constants'
import type { ItemDetailDTO } from '@/lib/constants'
import { useSession } from '@/components/session-provider'
import { useToast } from '@/components/toast'
import { FreshnessBadge, ConditionChip } from '@/components/badges'
import { ItemImage } from '@/components/item-image'
import { WantButton } from '@/components/want-button'
import { CommentSection } from '@/components/comment-section'

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { current } = useSession()
  const { showToast } = useToast()
  const [item, setItem] = useState<ItemDetailDTO | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)
  const [giveOpen, setGiveOpen] = useState(false)
  const [giveTo, setGiveTo] = useState<string>('')
  const [giving, setGiving] = useState(false)
  useTitle(item ? `邻集 · ${item.title}` : '邻集 · 详情')
  // 舞台底色：从当前图提取主色并压暗（图片切换时背景跟着变，呼应参考图的适应底色）
  const [sampledStageBg, setSampledStageBg] = useState<string>('rgba(255,255,255,0.03)')
  useEffect(() => {
    const im = item?.images[imgIdx]
    if (!im || im.kind === 'emoji') return
    const img = new window.Image()
    img.src = im.url
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = c.height = 24
        const ctx = c.getContext('2d')!
        ctx.drawImage(img, 0, 0, 24, 24)
        const d = ctx.getImageData(0, 0, 24, 24).data
        let r = 0
        let g = 0
        let b = 0
        for (let i = 0; i < d.length; i += 4) {
          r += d[i]
          g += d[i + 1]
          b += d[i + 2]
        }
        const n = d.length / 4
        setSampledStageBg(`rgb(${Math.round((r / n) * 0.32)},${Math.round((g / n) * 0.32)},${Math.round((b / n) * 0.32)})`)
      } catch {
        setSampledStageBg('rgba(255,255,255,0.03)')
      }
    }
  }, [item, imgIdx])

  // 右栏文字过长时：折叠可内滚 + 展开按钮
  const [descExpanded, setDescExpanded] = useState(false)
  const [descClamped, setDescClamped] = useState(false)
  const descRef = useRef<HTMLDivElement>(null)

  // 鼠标在右栏描述区：滚轮只滚文字，不滚页面（非 passive 拦截）
  useEffect(() => {
    const el = descRef.current
    if (!el || descExpanded) return
    const handler = (e: WheelEvent) => {
      if (el.scrollHeight <= el.clientHeight) return
      e.preventDefault()
      el.scrollTop += e.deltaY
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [descExpanded, item])

  // 测量描述是否溢出
  useEffect(() => {
    if (descExpanded) return
    const raf = requestAnimationFrame(() => {
      const el = descRef.current
      if (el) setDescClamped(el.scrollHeight > el.clientHeight + 4)
    })
    return () => cancelAnimationFrame(raf)
  }, [item, descExpanded])


  const load = useCallback(async () => {
    try {
      const data = await api<{ item: ItemDetailDTO }>(`/api/items/${id}`)
      setItem(data.item)
    } catch {
      setNotFound(true)
    }
  }, [id])

  useEffect(() => {
    let active = true
    api<{ item: ItemDetailDTO }>(`/api/items/${id}`)
      .then((data) => active && setItem(data.item))
      .catch(() => active && setNotFound(true))
    return () => { active = false }
  }, [id, current?.id])

  if (notFound)
    return (
      <div className="card grid place-items-center gap-3 py-16 text-center">
        <span className="text-5xl">🌫️</span>
        <p className="font-semibold text-zinc-400">物品不存在或已被删除</p>
        <Link href="/" className="btn-primary">回到首页</Link>
      </div>
    )

  if (!item)
    return (
      <div className="card overflow-hidden">
        <div className="aspect-[2/1] animate-pulse bg-white/[0.06]" />
        <div className="space-y-3 p-5">
          <div className="h-6 w-2/3 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-20 animate-pulse rounded bg-white/[0.06]" />
        </div>
      </div>
    )

  const fresh = freshnessOf(item.createdAt)
  const given = item.status === 'GIVEN'
  const isPublisher = current?.id === item.publisher.id
  const cur = item.images[imgIdx]
  const stageBg = cur?.kind === 'emoji'
    ? `linear-gradient(135deg, hsl(${((cur.hue % 360) + 360) % 360} 30% 15%), hsl(${(((cur.hue % 360) + 360) % 360 + 45) % 360} 26% 20%))`
    : sampledStageBg

  const markGiven = async () => {
    setGiving(true)
    try {
      await api(`/api/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'given', givenToUserId: giveTo || undefined }),
      })
      setGiveOpen(false)
      showToast('已标记送出，物品进入归档', 'success')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败', 'error')
    } finally {
      setGiving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 闲鱼式左右分栏：左主图，右信息+操作 */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* 左：主图 + 缩略图 */}
        <div className="card overflow-hidden lg:flex lg:h-[640px] lg:flex-col">
          <div className="relative aspect-square lg:aspect-auto lg:flex-1 lg:min-h-0" style={{ background: stageBg }}>
            {!cur ? (
              <div className="grid h-full place-items-center">
                <span className={`text-8xl opacity-40 ${given ? 'grayscale-[0.6]' : ''}`}>📦</span>
              </div>
            ) : cur.kind === 'emoji' ? (
              <div className="grid h-full place-items-center">
                <span className={`text-8xl ${given ? 'grayscale-[0.6]' : ''}`}>{cur.emoji}</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cur.url}
                alt={item.title}
                className={`h-full w-full object-contain ${given ? 'grayscale-[0.6]' : ''}`}
              />
            )}
            {given && (
              <div className="absolute inset-0 grid place-items-center bg-black/20">
                <span className="-rotate-6 rounded-xl border-4 border-white/90 px-6 py-2 text-2xl font-black tracking-widest text-white">
                  已送出
                </span>
              </div>
            )}
          </div>
          {item.images.length > 1 && (
            <div className="flex gap-2 p-3">
              {item.images.map((im, i) => (
                <button key={i} onClick={() => setImgIdx(i)} className={`overflow-hidden rounded-lg ring-2 transition ${i === imgIdx ? 'ring-violet-400' : 'ring-white/10 opacity-60 hover:opacity-100'}`}>
                  <ItemImage image={im} className="size-14" emojiSize="text-2xl" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右：信息 + 卖家 + 操作（固定高度，文字内滚） */}
        <div className={descExpanded ? 'space-y-4' : 'space-y-4 lg:flex lg:h-[640px] lg:flex-col'}>
          <div className="card min-h-0 flex-1 flex-col space-y-4 p-5 lg:flex">
            {/* 价格行 */}
            <div className="flex items-center justify-between gap-2">
              {item.tradeMode === 'PRICED' && item.price != null ? (
                <p className="tnum flex items-baseline font-bold text-amber-300">
                  <span className="text-xl">¥</span>
                  <span className="text-3xl leading-none">{money(item.price)}</span>
                </p>
              ) : (
                <p className={`text-2xl font-bold ${item.tradeMode === 'FREE' ? 'text-rose-400' : 'text-violet-300'}`}>
                  {item.tradeMode === 'FREE' ? '免费送' : '随便给'}
                </p>
              )}
              {given ? (
                <span className="rounded-full bg-zinc-700 px-2.5 py-1 text-[11px] font-bold text-white">已送出</span>
              ) : (
                <FreshnessBadge fresh={fresh} />
              )}
            </div>

            <h1 className="text-xl font-bold text-zinc-100">{item.title}</h1>
            <p className="text-xs text-zinc-400">
              {`发布于 ${timeAgo(item.createdAt)} · ${fresh.label}`}
              {given && item.givenAt && ` · ${timeAgo(item.givenAt)}送出`}
              {given && item.givenTo && ` · 送给了 ${item.givenTo.avatar} ${item.givenTo.name}`}
            </p>

            <div className="flex items-center gap-2">
              <ConditionChip condition={item.condition} />
              <span className="text-[11px] text-zinc-500">
                {item.publisher.space?.name ?? '所属社区'} · 当面交接
              </span>
            </div>

            <div ref={descRef} className={`min-h-0 flex-1 ${descExpanded ? '' : 'overflow-y-auto no-scrollbar'}`}>
              <p className="text-sm leading-relaxed whitespace-pre-line text-zinc-400">{item.description || '（暂无描述）'}</p>
            </div>
            {(descClamped || descExpanded) && (
              <button
                className="inline-flex items-center gap-1 self-end text-xs font-medium text-violet-300 transition hover:text-violet-200"
                onClick={() => setDescExpanded((v) => !v)}
              >
                {descExpanded ? '收起' : '展开'}
                <CaretDown weight="bold" className={`size-3 transition-transform ${descExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* 卖家 + 操作 */}
          <div className="card space-y-4 p-5 lg:flex-1 lg:flex lg:flex-col">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-white/[0.08] text-xl">{item.publisher.avatar}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-200">{item.publisher.name}</p>
                <p className="truncate text-xs text-zinc-500">{item.publisher.building} · {item.publisher.bio}</p>
              </div>
            </div>

            {given ? (
              <div className="rounded-xl bg-white/[0.06] px-4 py-3 text-center text-sm text-zinc-500">
                物品已完成流转，归档保留记录，仅供查看
              </div>
            ) : isPublisher ? (
              <div className="space-y-2">
                <button className="btn-primary w-full py-3" onClick={() => { setGiveTo(''); setGiveOpen(true) }}>
                  <Handshake weight="fill" className="size-5" />
                  标记已送出
                </button>
                <div className="flex gap-2">
                  <Link href={`/publish?id=${item.id}`} className="btn-ghost flex-1 py-2.5 text-sm">
                    <PencilSimple weight="regular" className="size-4" />
                    编辑
                  </Link>
                  <button
                    className="btn-ghost flex-1 py-2.5 text-sm text-rose-300 hover:bg-rose-500/10"
                    onClick={async () => {
                      if (!window.confirm('确定删除这件闲置吗？想要和留言会一并删除，不可恢复。')) return
                      try {
                        await api(`/api/items/${item.id}`, { method: 'DELETE' })
                        invalidateApi(['/api/items'])
                        showToast('已删除', 'success')
                        router.push('/discover')
                      } catch (e) {
                        showToast(e instanceof Error ? e.message : '删除失败', 'error')
                      }
                    }}
                  >
                    <Trash weight="regular" className="size-4" />
                    删除
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <WantButton itemId={item.id} initialWanted={item.iWant} initialCount={item.wantCount} size="lg" />
                <button
                  className="btn-ghost h-12 min-w-0 flex-1 px-2 py-0 text-sm"
                  onClick={() => {
                    document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <ChatCircleDots weight="regular" className="size-5 text-zinc-400" />
                  留言问一句
                </button>
              </div>
            )}

            {/* 谁想要：名单仅发布者可见（考题要求），其他人看到人数提示 */}
            <div className="mt-auto border-t border-white/[0.06] pt-3">
              {isPublisher ? (
                item.wants.length === 0 ? (
                  <p className="py-1 text-center text-sm text-zinc-500">还没有人表达意向</p>
                ) : (
                  <>
                    <p className="mb-2 text-xs font-medium text-zinc-400">谁想要 · {item.wants.length}</p>
                    <ul className="flex flex-wrap gap-2">
                      {item.wants.map((w) => (
                        <li key={w.user.id} className="flex items-center gap-2 rounded-full bg-rose-400/10 py-1.5 pr-3.5 pl-2">
                          <span className="grid size-7 place-items-center rounded-full bg-white/[0.08] text-sm">{w.user.avatar}</span>
                          <span className="text-sm font-medium text-zinc-400">{w.user.name}</span>
                          <span className="text-[11px] text-zinc-400">{timeAgo(w.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )
              ) : (
                <p className="py-1 text-center text-sm text-zinc-500">
                  {item.wantCount > 0 ? `已有 ${item.wantCount} 位成员表达了「想要」` : '还没有人表达意向'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 留言板（通栏） */}
      <div id="comments">
        <CommentSection item={item} onChanged={load} />
      </div>

      {/* 标记已送出弹窗 */}
      {giveOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !giving && setGiveOpen(false)}>
          <div className="animate-pop-in w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-100">标记已送出</h3>
            <p className="mt-1 text-sm text-zinc-500">物品将进入归档保留记录。对方是谁？（可选）</p>
            <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">
              {item.wants.length === 0 && <p className="py-2 text-sm text-zinc-400">还没有人点过“想要”</p>}
              {item.wants.map((w) => (
                <label key={w.user.id} className={`flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition ${giveTo === w.user.id ? 'bg-violet-400/10 shadow-[inset_0_0_0_1px_#a78bfa]' : 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:bg-white/[0.06]'}`}>
                  <input type="radio" name="giveTo" className="accent-violet-500" checked={giveTo === w.user.id} onChange={() => setGiveTo(w.user.id)} />
                  <span className="text-lg">{w.user.avatar}</span>
                  <span className="text-sm font-medium text-zinc-400">{w.user.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setGiveOpen(false)} disabled={giving}>取消</button>
              <button className="btn-primary flex-1" onClick={markGiven} disabled={giving}>
                {giving ? '保存中…' : '确认送出'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
