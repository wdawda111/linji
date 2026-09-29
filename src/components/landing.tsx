import Link from 'next/link'
import { ArrowRight, CheckCircle, Plus, Sparkle } from '@phosphor-icons/react/dist/ssr'
import type { ItemDTO } from '@/lib/constants'
import { ProductDepthCarousel } from '@/components/product-depth-carousel'
import { SITE_NAME } from '@/lib/site-config'

type Stats = { monthPublished: number; monthGiven: number; activeCount: number }

const STEPS = [
  { n: '01', title: '发出来', text: '拍张图，AI 帮你估价、整理描述' },
  { n: '02', title: '身边人看见', text: '按新鲜度展示，不再被群消息淹没' },
  { n: '03', title: '当面交接', text: '公开留言确认，完成后留下一笔流转记录' },
]

export function Landing({ stats, items }: { stats: Stats; items: ItemDTO[] }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0d0b12] text-zinc-100">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_60%_-5%,rgba(124,58,237,0.2),transparent_68%)]" />
        <div className="absolute -left-32 top-1/3 size-80 rounded-full bg-fuchsia-700/10 blur-3xl" />
      </div>

      <header className="relative z-30 border-b border-white/[0.07] bg-[#0d0b12]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="邻集首页">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="size-9" />
            <span>
              <span className="block text-sm font-semibold leading-tight tracking-tight">邻集</span>
              <span className="block max-w-40 truncate text-[10px] text-zinc-500">{SITE_NAME}</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex" aria-label="主导航">
            <Link href="/discover" className="transition hover:text-white">发现好物</Link>
            <Link href="/dashboard" className="transition hover:text-white">空间看板</Link>
            <Link href="/login" className="transition hover:text-white">登录</Link>
          </nav>
          <Link href="/discover" className="btn-primary px-5 py-2">进入邻集</Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8">
        <section className="grid min-h-[calc(100dvh-4rem)] items-center gap-14 py-14 lg:grid-cols-[1fr_0.92fr] lg:py-20">
          <div className="max-w-2xl">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-violet-200">
              <Sparkle weight="fill" className="size-3.5 text-fuchsia-400" />
              一处一集 · 每个地点都是独立空间
            </span>

            <h1 className="mt-7 text-[2.8rem] leading-[1.06] font-black tracking-[-0.04em] sm:text-6xl lg:text-[4.5rem]">
              别让好东西，
              <span className="gradient-text block pb-2">沉在群聊里。</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-zinc-400 sm:text-lg">
              为每个小区、楼栋或办公室单独开设的闲置小集市。不同空间数据互不相通，
              只和身边熟悉的人看见、聊两句，然后下楼交接。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/discover" className="btn-primary px-7 py-3 text-base">
                看看大家在出什么 <ArrowRight weight="bold" className="size-4" />
              </Link>
              <Link href="/publish" className="btn-ghost px-7 py-3 text-base">
                <Plus weight="bold" className="size-4" /> 发布一件闲置
              </Link>
            </div>

            <dl className="mt-10 grid max-w-xl grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-4">
              {[
                ['本月发布', stats.monthPublished],
                ['本月送出', stats.monthGiven],
                ['正在流转', stats.activeCount],
              ].map(([label, value]) => (
                <div key={label} className="px-3 first:pl-0 sm:px-6">
                  <dd className="tnum text-2xl font-bold text-white">{value}</dd>
                  <dt className="mt-1 text-xs text-zinc-500">{label}</dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 rounded-[3rem] bg-violet-600/10 blur-3xl" aria-hidden />
            <div className="relative space-y-3">
              <ProductDepthCarousel items={items} />

              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-2 shadow-xl shadow-black/20 backdrop-blur-xl">
                <p className="px-3 pt-2 pb-1 text-xs font-medium text-zinc-400">新手教程 · 三步完成一次流转</p>
                <div className="grid sm:grid-cols-3 sm:divide-x sm:divide-white/[0.08]">
                  {STEPS.map((step) => (
                    <div key={step.n} className="p-3.5">
                      <p className="tnum text-[10px] font-bold tracking-widest text-violet-400">{step.n}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-200"><CheckCircle weight="fill" className="size-4 text-violet-400" />{step.title}</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
