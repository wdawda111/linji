'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, useTitle } from '@/lib/client'
import { useToast } from '@/components/toast'
import { SITE_NAME } from '@/lib/site-config'
import type { SpaceDTO, UserDTO } from '@/lib/constants'
import { GlassSelect } from '@/components/glass-select'

export default function LoginPage() {
  useTitle('邻集 · 登录')
  const router = useRouter()
  const { showToast } = useToast()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [busy, setBusy] = useState(false)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [building, setBuilding] = useState('')
  const [spaces, setSpaces] = useState<SpaceDTO[]>([])
  const [spaceChoice, setSpaceChoice] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteSpace, setInviteSpace] = useState<SpaceDTO | null>(null)
  const [checkingInvite, setCheckingInvite] = useState(false)
  const inviteRequest = useRef(0)

  useEffect(() => {
    api<{ spaces: SpaceDTO[]; activeId: string }>('/api/spaces')
      .then((data) => {
        setSpaces(data.spaces)
        setSpaceChoice((current) => current || data.activeId || data.spaces[0]?.id || '')
      })
      .catch(() => setSpaces([]))
  }, [])

  const submit = async () => {
    if (busy) return
    setBusy(true)
    try {
      let destination = '/discover'
      if (tab === 'login') {
        const data = await api<{ user: UserDTO }>('/api/auth', {
          method: 'PUT',
          body: JSON.stringify({ username, password }),
        })
        showToast(`欢迎回来，${data.user.name}`, 'success')
        if (data.user.role === 'PLATFORM_ADMIN') destination = '/admin/spaces'
      } else {
        await api('/api/auth', {
          method: 'POST',
          body: JSON.stringify({
            username,
            password,
            name,
            building,
            spaceId: spaceChoice,
            inviteCode: inviteCode.trim().toUpperCase(),
          }),
        })
        showToast('注册成功，已自动登录', 'success')
      }
      router.push(destination)
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败', 'error')
      setBusy(false)
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0d0b12] text-zinc-100">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_-10%,rgba(168,85,247,0.12),transparent_65%)]" />
        <div className="absolute top-24 left-[10%] size-40 animate-float rounded-full bg-violet-600/15 blur-2xl" />
        <div className="absolute bottom-24 right-[12%] size-32 animate-float rounded-full bg-fuchsia-600/15 blur-2xl [animation-delay:1.4s]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6 py-10">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="邻集" className="size-12" />
          <span className="text-xl font-semibold tracking-tight">邻集</span>
        </Link>

        <div className="mb-4 text-center">
          <p className="text-sm font-medium text-zinc-200">{SITE_NAME}</p>
          <p className="mt-1 text-xs text-zinc-500">一个网站，多个独立空间 · 数据互不相通</p>
        </div>

        <div className="card p-6 shadow-[0_24px_60px_-12px_rgba(76,29,149,0.2)]">
          {/* 登录/注册切换 */}
          <div className="mb-5 flex rounded-full bg-white/[0.05] p-0.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] text-sm font-medium">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`flex-1 rounded-full py-2 transition ${
                  tab === t ? 'bg-white/[0.12] text-zinc-100' : 'text-zinc-500'
                }`}
              >
                {t === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <form
            className="space-y-3.5"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-zinc-300">账号</label>
              <input
                id="username"
                className="input"
                placeholder={tab === 'register' ? '3-20 位字母、数字或下划线' : '账号'}
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-300">密码</label>
              <input
                id="password"
                className="input"
                type="password"
                placeholder={tab === 'register' ? '至少 6 位' : '密码'}
                value={password}
                autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {tab === 'register' && (
              <>
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-300">昵称</label>
                  <input
                    id="name"
                    className="input"
                    placeholder="大家怎么称呼你"
                    value={name}
                    maxLength={12}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-zinc-300">所属社区</span>
                    <Link
                      href="/apply-space"
                      className="text-xs font-medium text-violet-300 transition hover:text-violet-200"
                    >
                      申请开通新空间
                    </Link>
                  </div>
                  <GlassSelect
                    ariaLabel="所属社区"
                    value={spaceChoice}
                    onChange={setSpaceChoice}
                    options={spaces.map((space) => ({
                      value: space.id,
                      label: space.name,
                      description: space.type,
                      emoji: space.type.includes('办公') ? '🏢' : space.type === '楼栋' ? '🏙️' : '🏘️',
                    }))}
                  />
                </div>
                <div>
                  <label htmlFor="inviteCode" className="mb-1.5 block text-sm font-medium text-zinc-300">社区邀请码</label>
                  <input
                    id="inviteCode"
                    className="input caret-violet-300"
                    placeholder="输入邻居分享的 12 位邀请码"
                    value={inviteCode}
                    maxLength={12}
                    autoComplete="off"
                    onChange={(event) => {
                      const code = event.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase()
                      setInviteCode(code)
                      setInviteSpace(null)
                      const request = ++inviteRequest.current
                      if (code.length !== 12) {
                        setCheckingInvite(false)
                        return
                      }
                      setCheckingInvite(true)
                      api<{ space: SpaceDTO }>('/api/spaces/invite', {
                        method: 'POST',
                        body: JSON.stringify({ code }),
                      })
                        .then((data) => {
                          if (request === inviteRequest.current) setInviteSpace(data.space)
                        })
                        .catch(() => {
                          if (request === inviteRequest.current) setInviteSpace(null)
                        })
                        .finally(() => {
                          if (request === inviteRequest.current) setCheckingInvite(false)
                        })
                    }}
                  />
                  <p className="mt-1.5 min-h-4 text-xs text-zinc-500" aria-live="polite">
                    {checkingInvite
                      ? '正在验证邀请码…'
                      : inviteSpace
                        ? inviteSpace.id === spaceChoice
                          ? `验证成功，将加入：${inviteSpace.name}`
                          : `这个邀请码属于${inviteSpace.name}，请选择该社区`
                        : inviteCode.length === 12
                          ? '邀请码无效，请检查后重试'
                          : '请向已加入社区的成员索取邀请码'}
                  </p>
                </div>
                <div>
                  <label htmlFor="building" className="mb-1.5 block text-sm font-medium text-zinc-300">所在位置（选填）</label>
                  <input
                    id="building"
                    className="input"
                    placeholder="如：3 号楼 2 单元 / A 座 8 楼"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                  />
                </div>
              </>
            )}
            <button type="submit" className="btn-primary w-full py-2.5 text-base" disabled={busy || (tab === 'register' && (!inviteSpace || inviteSpace.id !== spaceChoice || checkingInvite))}>
              {busy ? '请稍候…' : tab === 'login' ? '登录' : '注册并登录'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          <Link href="/discover" className="transition hover:text-violet-300">先随便逛逛 →</Link>
        </p>
      </div>
    </div>
  )
}
