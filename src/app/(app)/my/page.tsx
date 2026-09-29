'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, apiSWR, invalidateApi, useTitle } from '@/lib/client'
import { PROFILE_AVATARS } from '@/lib/constants'
import type { ItemDTO, UserDTO } from '@/lib/constants'
import { useSession } from '@/components/session-provider'
import { useToast } from '@/components/toast'
import { ItemCard, CardSkeleton } from '@/components/item-card'
import { Check, PencilSimple, SignOut, X } from '@phosphor-icons/react'


function LoginGate() {
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <span className="text-4xl" aria-hidden>🔐</span>
      <h2 className="mt-3 text-lg font-bold text-zinc-100">请先登录</h2>
      <p className="mt-1 text-sm text-zinc-500">登录后才能查看我的发布与想要，浏览不需要账号</p>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/login" className="btn-primary">登录 / 注册</Link>
        <Link href="/discover" className="btn-ghost">先逛逛</Link>
      </div>
    </div>
  )
}

export default function MyPage() {
  useTitle('邻集 · 我的')
  const router = useRouter()
  const { showToast } = useToast()
  const { current, logout } = useSession()
  const [profile, setProfile] = useState(current)
  const [published, setPublished] = useState<ItemDTO[] | null>(null)
  const [wanted, setWanted] = useState<ItemDTO[] | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    if (!current?.id) return
    const mineUrl = '/api/items?mine=1&status=all'
    const wantedUrl = '/api/items?wanted=1&status=all'
    apiSWR<{ items: ItemDTO[] }>(mineUrl, (d) => setPublished(d.items)).then((d) => setPublished(d.items)).catch(() => setPublished([]))
    apiSWR<{ items: ItemDTO[] }>(wantedUrl, (d) => setWanted(d.items)).then((d) => setWanted(d.items)).catch(() => setWanted([]))
  }, [current?.id])

  useEffect(() => {
    void load()
  }, [load])

  const activeCount = published?.filter((i) => i.status === 'ACTIVE').length ?? 0
  const givenCount = published?.filter((i) => i.status === 'GIVEN').length ?? 0

  if (!current) return <LoginGate />

  return (
    <div className="space-y-5">
      {/* 身份卡 */}
      <div className="card flex items-center gap-4 p-5">
        <span className="grid size-16 place-items-center rounded-2xl bg-violet-400/10 text-4xl">{profile?.avatar ?? '👤'}</span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-zinc-100">{profile?.name ?? '未选择身份'}</p>
          <p className="truncate text-sm text-zinc-400">{profile?.building}{profile?.bio ? ` · ${profile.bio}` : ''}</p>
          <p className="mt-1 text-xs text-zinc-400">
            发布 {published?.length ?? '…'} 件 · 在售 {activeCount} · 送出 {givenCount}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-violet-300 ring-1 ring-violet-400/25 transition hover:bg-violet-400/10"
          >
            <PencilSimple className="size-4" />
            <span className="hidden sm:inline">编辑资料</span>
          </button>
          <button
            type="button"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true)
              try {
                await logout()
              } finally {
                setLoggingOut(false)
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-400 ring-1 ring-white/10 transition hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-50"
          >
            <SignOut className="size-4" />
            <span className="hidden sm:inline">{loggingOut ? '退出中…' : '退出登录'}</span>
          </button>
        </div>
      </div>

      {/* 我发布的 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">我发布的</h2>
          <Link href="/publish" className="text-sm font-semibold text-violet-300 hover:text-fuchsia-400">＋ 发布闲置</Link>
        </div>
        {published === null ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : published.length === 0 ? (
          <div className="card py-10 text-center text-sm text-zinc-400">还没发布过闲置，翻翻家里？</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {published.map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
        )}
      </section>

      {/* 我想要的 */}
      <section className="space-y-3">
        <h2 className="section-title">我想要的</h2>
        {wanted === null ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : wanted.length === 0 ? (
          <div className="card py-10 text-center text-sm text-zinc-400">还没点过“想要”，去发现页逛逛</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {wanted.map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
        )}
      </section>

      {editing && profile && (
        <ProfileEditor
          user={profile}
          onClose={() => setEditing(false)}
          onSaved={(user) => {
            setProfile(user)
            setEditing(false)
            invalidateApi(['/api/items'])
            showToast('个人资料已更新', 'success')
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function ProfileEditor({ user, onClose, onSaved }: { user: UserDTO; onClose: () => void; onSaved: (user: UserDTO) => void }) {
  const { showToast } = useToast()
  const [name, setName] = useState(user.name)
  const [avatar, setAvatar] = useState(user.avatar)
  const [building, setBuilding] = useState(user.building)
  const [bio, setBio] = useState(user.bio ?? '')
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) return showToast('请填写昵称', 'error')
    if (!building.trim()) return showToast('请填写所在位置', 'error')
    setSaving(true)
    try {
      const data = await api<{ user: UserDTO }>('/api/auth', {
        method: 'PATCH',
        body: JSON.stringify({ name, avatar, building, bio }),
      })
      onSaved(data.user)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
        className="animate-pop-in w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#15121c] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div>
            <h2 id="profile-editor-title" className="font-bold text-zinc-100">编辑个人资料</h2>
            <p className="mt-0.5 text-xs text-zinc-500">这些信息会展示给当前空间的成员</p>
          </div>
          <button type="button" aria-label="关闭" onClick={onClose} disabled={saving} className="grid size-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200">
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70dvh] space-y-5 overflow-y-auto p-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-zinc-300">选择头像</legend>
            <div className="grid grid-cols-5 gap-2">
              {PROFILE_AVATARS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`选择头像 ${option}`}
                  aria-pressed={avatar === option}
                  onClick={() => setAvatar(option)}
                  className={`relative grid aspect-square place-items-center rounded-xl text-2xl transition ${
                    avatar === option
                      ? 'bg-violet-400/15 ring-2 ring-violet-400'
                      : 'bg-white/[0.04] ring-1 ring-white/[0.08] hover:bg-white/[0.08]'
                  }`}
                >
                  {option}
                  {avatar === option && <Check weight="bold" className="absolute right-1 top-1 size-3 rounded-full bg-violet-500 p-0.5 text-white" />}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm font-medium text-zinc-300">
            昵称 <span className="text-rose-400">*</span>
            <input className="input mt-2" value={name} onChange={(event) => setName(event.target.value)} maxLength={12} required placeholder="大家怎么称呼你" />
          </label>

          <label className="block text-sm font-medium text-zinc-300">
            所在位置 <span className="text-rose-400">*</span>
            <input className="input mt-2" value={building} onChange={(event) => setBuilding(event.target.value)} maxLength={30} required placeholder="如：3 号楼 2 单元 / A 座 8 楼" />
            <span className="mt-1.5 block text-xs font-normal text-zinc-600">填写方便空间成员识别的大致位置</span>
          </label>

          <label className="block text-sm font-medium text-zinc-300">
            个人简介 <span className="font-normal text-zinc-600">（选填）</span>
            <textarea className="input mt-2 min-h-24 resize-none" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={80} placeholder="简单介绍一下自己" />
            <span className="tnum mt-1.5 block text-right text-xs font-normal text-zinc-600">{bio.length}/80</span>
          </label>
        </div>

        <div className="flex gap-2 border-t border-white/[0.07] px-5 py-4">
          <button type="button" className="btn-ghost flex-1" onClick={onClose} disabled={saving}>取消</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? '保存中…' : '保存资料'}</button>
        </div>
      </form>
    </div>
  )
}
