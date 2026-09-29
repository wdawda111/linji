'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { House, Plus, ChartLine, User, UsersThree, SignOut, ShieldCheck } from '@phosphor-icons/react'
import { useSession } from './session-provider'
import { SITE_NAME, SITE_TYPE } from '@/lib/site-config'
import { api, invalidateApi, SPACE_CHANGE_EVENT } from '@/lib/client'
import type { SpaceDTO } from '@/lib/constants'
import { GlassSelect } from '@/components/glass-select'
import { SpaceInviteCode } from '@/components/space-invite-code'

const NAV = [
  { href: '/discover', label: '发现', icon: House },
  { href: '/dashboard', label: '数据看板', icon: ChartLine },
  { href: '/my', label: '我的', icon: User },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { current } = useSession()
  const isAdminPage = pathname.startsWith('/admin/spaces')

  useEffect(() => {
    if (current?.role === 'PLATFORM_ADMIN' && !isAdminPage) {
      router.replace('/admin/spaces')
    } else if (current?.role !== 'PLATFORM_ADMIN' && isAdminPage) {
      router.replace(current ? '/discover' : '/login')
    }
  }, [current, isAdminPage, router])

  if (current?.role === 'PLATFORM_ADMIN' && !isAdminPage) {
    return <div className="grid min-h-screen place-items-center bg-[#0d0b12] text-sm text-zinc-400">正在打开空间审核…</div>
  }
  if (isAdminPage && current?.role !== 'PLATFORM_ADMIN') {
    return <div className="grid min-h-screen place-items-center bg-[#0d0b12] text-sm text-zinc-400">正在离开空间审核…</div>
  }
  return (
    <div className="min-h-screen md:flex">
      {/* 桌面侧栏（白玻璃） */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-white/[0.02] backdrop-blur-xl md:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* 移动端顶栏 */}
      <header className="sticky top-0 z-40 flex h-12 w-full items-center justify-between border-b border-white/[0.06] bg-[#0d0b12]/85 px-4 backdrop-blur-xl md:hidden">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="邻集" className="size-8" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight tracking-tight text-zinc-100">邻集</span>
            <span className="block max-w-36 truncate text-[10px] text-zinc-500">{SITE_NAME}</span>
          </span>
        </Link>
        <MobileUserChip />
      </header>

      {/* 居中内容列 */}
      <main className="min-w-0 flex-1 md:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-28 md:px-6 md:pt-8 md:pb-16">{children}</div>
      </main>

      {/* 移动端底部导航：四个入口等宽，发布按钮在正常布局流中 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-[#0d0b12]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_rgba(0,0,0,0.24)] backdrop-blur-xl md:hidden">
        <div className={`mx-auto max-w-md px-1 pt-1 ${current?.role === 'PLATFORM_ADMIN' ? 'flex justify-center' : 'grid grid-cols-4 items-end'}`}>
            {current?.role === 'PLATFORM_ADMIN' ? (
              <NavTab href="/admin/spaces" icon={ShieldCheck} label="空间审核" active={pathname.startsWith('/admin')} />
            ) : (
              <>
              <PublishTab active={pathname.startsWith('/publish')} />
              <NavTab href="/discover" icon={House} label="发现" active={pathname.startsWith('/discover') || pathname.startsWith('/items/')} />
              <NavTab href="/dashboard" icon={ChartLine} label="数据看板" active={pathname.startsWith('/dashboard')} />
              <NavTab href="/my" icon={User} label="我的" active={pathname.startsWith('/my')} />
              </>
            )}
        </div>
      </nav>
    </div>
  )
}

function SidebarContent({ pathname }: { pathname: string }) {
  const { current } = useSession()
  const itemCls = (href: string) => {
    const active = pathname.startsWith(href)
    return `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
      active ? 'bg-violet-500/15 font-medium text-violet-200' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
    }`
  }
  return (
    <>
      <Link href="/" className="inline-flex w-fit items-center gap-2.5 px-4 py-3 self-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="邻集" className="size-9" />
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-tight tracking-tight text-zinc-100">邻集</span>
          <span className="mt-0.5 block max-w-40 truncate text-[10px] text-zinc-500">{SITE_NAME}</span>
        </span>
      </Link>

      <div className="px-3 pb-3">
        <SpacePanel />
      </div>

      {current?.role !== 'PLATFORM_ADMIN' && (
        <div className="px-3">
          <Link href="/publish" className="btn-primary flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5">
            <Plus weight="bold" className="size-4" />
            发布闲置
          </Link>
        </div>
      )}

      <nav className="mt-4 space-y-0.5 px-3" aria-label="主导航">
        {current?.role === 'PLATFORM_ADMIN' ? (
          <Link href="/admin/spaces" className={itemCls('/admin')} aria-current={pathname.startsWith('/admin') ? 'page' : undefined}>
            <ShieldCheck weight={pathname.startsWith('/admin') ? 'fill' : 'regular'} className="size-[18px]" />
            空间审核
          </Link>
        ) : NAV.map((n) => (
          <Link key={n.href} href={n.href} className={itemCls(n.href)} aria-current={pathname.startsWith(n.href) ? 'page' : undefined}>
            <n.icon weight={pathname.startsWith(n.href) ? 'fill' : 'regular'} className="size-[18px]" />
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto p-3">
        <MobileUserChip align="sidebar" />
      </div>
    </>
  )
}

function SpacePanel() {
  const { current } = useSession()
  const router = useRouter()
  const [spaces, setSpaces] = useState<SpaceDTO[]>([])
  const [activeId, setActiveId] = useState(current?.space?.id ?? '')

  useEffect(() => {
    if (current?.space) return
    api<{ spaces: SpaceDTO[]; activeId: string }>('/api/spaces')
      .then((data) => {
        setSpaces(data.spaces)
        setActiveId(data.activeId)
      })
      .catch(() => undefined)
  }, [current?.space])

  const active = current?.space ?? spaces.find((space) => space.id === activeId)

  if (current?.role === 'PLATFORM_ADMIN') {
    return (
      <div className="rounded-xl bg-violet-400/[0.055] px-3 py-3 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.14)]">
        <p className="flex items-center gap-1.5 text-xs font-medium text-violet-200">
          <ShieldCheck weight="fill" className="size-4 text-violet-400" />
          平台管理
        </p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-500">管理员不属于任何空间</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white/[0.03] px-3 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
      <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
        <UsersThree weight="regular" className="size-4 text-violet-400" />
        {current ? '所属空间' : '浏览空间'}
      </p>
      {current ? (
        <div className="mt-2 rounded-lg border border-white/[0.07] bg-white/[0.035] px-3 py-2">
          <p className="truncate text-xs font-medium text-zinc-200">{active?.name ?? SITE_NAME}</p>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">{active?.type ?? SITE_TYPE} · {current.building}</p>
        </div>
      ) : spaces.length > 0 ? (
        <div className="mt-2">
          <GlassSelect
            ariaLabel="切换浏览空间"
            compact
            value={activeId}
            options={spaces.map((space) => ({
              value: space.id,
              label: space.name,
              description: space.type,
              emoji: space.type.includes('办公') ? '🏢' : space.type === '楼栋' ? '🏙️' : '🏘️',
            }))}
            onChange={async (nextId) => {
            setActiveId(nextId)
            await api('/api/spaces', { method: 'PUT', body: JSON.stringify({ spaceId: nextId }) })
            invalidateApi()
            window.dispatchEvent(new Event(SPACE_CHANGE_EVENT))
            router.push('/discover')
            }}
          />
        </div>
      ) : <p className="mt-1 text-xs text-zinc-600">正在读取空间…</p>}
      {current?.role === 'MEMBER' && <SpaceInviteCode />}
    </div>
  )
}

function MobileUserChip({ align = 'top' }: { align?: 'top' | 'sidebar' }) {
  const { current, logout } = useSession()
  const [open, setOpen] = useState(false)

  // 未登录：登录入口
  if (!current)
    return align === 'sidebar' ? (
      <Link href="/login" className="btn-primary flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5">
        登录 / 注册
      </Link>
    ) : (
      <Link href="/login" className="btn-primary px-4 py-1.5 text-sm">登录</Link>
    )

  return (
    <div className={`relative ${align === 'sidebar' ? 'w-full' : ''}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center rounded-full transition hover:bg-white/[0.05] ${
          align === 'sidebar' ? 'w-full gap-2.5 rounded-xl p-2' : 'gap-1.5 py-1 pr-2.5 pl-1'
        }`}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.08] text-base">{current.avatar}</span>
        <span className={`min-w-0 flex-1 text-left ${align === 'sidebar' ? '' : 'max-w-16'}`}>
          <span className="block truncate text-sm font-medium text-zinc-200">{current.name}</span>
          {align === 'sidebar' && (
            <span className="block truncate text-xs text-zinc-400">
              {current.role === 'PLATFORM_ADMIN' ? '平台管理员 · 不属于空间' : current.building}
            </span>
          )}
        </span>
        {align === 'sidebar' && <span className="text-[10px] text-zinc-400">▼</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className={`animate-pop-in absolute z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-4 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl ${
              align === 'sidebar' ? 'bottom-full left-0 mb-2' : 'right-0'
            }`}
          >
            <Link
              href={current.role === 'PLATFORM_ADMIN' ? '/admin/spaces' : '/my'}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="-m-2 flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/[0.06]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-violet-100 text-xl">{current.avatar}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-100">{current.name}</span>
                <span className="block truncate text-xs text-zinc-500">
                  {current.role === 'PLATFORM_ADMIN' ? '平台管理员 · 不属于空间' : current.building}
                </span>
              </span>
              <span className="text-xs text-zinc-600">{current.role === 'PLATFORM_ADMIN' ? '进入审核 ›' : '进入主页 ›'}</span>
            </Link>
            {current.bio && <p className="mt-2.5 border-t border-white/10 pt-2.5 text-xs text-zinc-500">{current.bio}</p>}
            {current.role === 'MEMBER' && <SpaceInviteCode />}
            {current.role === 'PLATFORM_ADMIN' && (
              <Link href="/admin/spaces" role="menuitem" onClick={() => setOpen(false)} className="mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium text-violet-300 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.2)] transition hover:bg-violet-400/10">
                <ShieldCheck className="size-4" /> 空间审核
              </Link>
            )}
            <button
              role="menuitem"
              onClick={async () => {
                setOpen(false)
                await logout()
              }}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium text-zinc-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] transition hover:bg-white/[0.06]"
            >
              <SignOut weight="regular" className="size-4" />
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  )
}


function NavTab({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string
  icon: typeof House
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
        active ? 'text-violet-300' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <Icon weight={active ? 'fill' : 'regular'} className="size-5" />
      {label}
    </Link>
  )
}

function PublishTab({ active }: { active: boolean }) {
  return (
    <Link
      href="/publish"
      aria-label="发布闲置"
      aria-current={active ? 'page' : undefined}
      className="flex flex-col items-center gap-1 py-1.5 text-[11px] font-semibold text-zinc-400 transition active:scale-95"
    >
      <span className={`grid size-9 place-items-center rounded-xl text-white transition ${
        active
          ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_6px_18px_-6px_rgba(192,38,211,0.75)]'
          : 'bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-[0_6px_16px_-8px_rgba(147,51,234,0.65)]'
      }`}>
        <Plus weight="bold" className="size-[18px]" />
      </span>
      <span className={active ? 'text-violet-300' : ''}>发布</span>
    </Link>
  )
}

