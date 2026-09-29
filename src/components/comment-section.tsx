'use client'

import { useRef, useState } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import { api, typeText } from '@/lib/client'
import { timeAgo } from '@/lib/constants'
import type { CommentDTO, ItemDetailDTO } from '@/lib/constants'
import { useSession } from './session-provider'
import { useToast } from './toast'

const FAQ_QUESTIONS = ['还在吗？', '几成新？', '可以自提吗？', '能便宜点吗？']

// 围绕物品的公开留言问答：点击"回复"可在该楼层内追加回复；
// 发布者可用 AI 生成常见提问的回复建议（打字机效果填入输入框）
export function CommentSection({ item, onChanged }: { item: ItemDetailDTO; onChanged: () => void }) {
  const { current } = useSession()
  const { showToast } = useToast()
  const comments = item.comments
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState<string | null>(null)
  const [aiNote, setAiNote] = useState(false)
  const [typing, setTyping] = useState(false)
  // 当前回复目标：某条留言（楼层根或楼层内回复）
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isPublisher = current?.id === item.publisher.id
  const closed = item.status === 'GIVEN'

  const startReply = (c: CommentDTO) => {
    setReplyTo({ id: c.id, name: c.user.name })
    setAiNote(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const askAI = async (question: string) => {
    setAiBusy(question)
    try {
      const data = await api<{ text: string; source: 'llm' | 'mock'; provider: string }>(`/api/llm/reply`, {
        method: 'POST',
        body: JSON.stringify({ itemId: item.id, question }),
      })
      setText('')
      setAiNote(true)
      setTyping(true)
      await typeText((partial) => setText(partial), data.text)
      showToast('回复建议已生成，可编辑后发送')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '生成失败', 'error')
    } finally {
      setTyping(false)
      setAiBusy(null)
    }
  }

  const send = async () => {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    try {
      await api(`/api/items/${item.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentId: replyTo?.id }),
      })
      setText('')
      setReplyTo(null)
      setAiNote(false)
      onChanged()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '发送失败', 'error')
    } finally {
      setSending(false)
    }
  }

  const withdraw = async (comment: CommentDTO) => {
    if (withdrawingId) return
    if (!window.confirm('确定撤回这条留言吗？留言内容会移除，但楼层里的其他回复会保留。')) return
    setWithdrawingId(comment.id)
    try {
      await api(`/api/items/${item.id}/comments`, {
        method: 'DELETE',
        body: JSON.stringify({ commentId: comment.id }),
      })
      showToast('留言已撤回', 'success')
      onChanged()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '撤回失败', 'error')
    } finally {
      setWithdrawingId(null)
    }
  }

  const renderComment = (c: CommentDTO, isReply = false) => (
    <>
      <span className={`grid shrink-0 place-items-center rounded-full bg-white/[0.06] ${isReply ? 'size-7 text-sm' : 'size-8 text-base'}`}>
        {c.user.avatar}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
          <span className="font-semibold text-zinc-400">{c.user.name}</span>
          {c.user.id === item.publisher.id && (
            <span className="rounded bg-violet-400/10 px-1 py-0.5 text-[10px] font-medium text-violet-300 ring-1 ring-violet-400/25">楼主</span>
          )}
          {isReply && c.replyTo && (
            <span className="rounded bg-white/[0.06] px-1 py-0.5 text-[10px] text-zinc-500">回复 @{c.replyTo.name}</span>
          )}
          <span className="text-zinc-400">{timeAgo(c.createdAt)}</span>
        </p>
        <p className={`mt-0.5 text-sm break-words ${c.isRetracted ? 'italic text-zinc-500' : 'text-zinc-400'}`}>
          {c.isRetracted ? '这条留言已撤回' : c.content}
        </p>
        <div className="mt-1 flex items-center gap-3">
          {!closed && !c.isRetracted && (
            <button
              className="text-xs font-medium text-zinc-400 transition hover:text-violet-300"
              onClick={() => startReply(c)}
            >
              回复
            </button>
          )}
          {!c.isRetracted && current?.id === c.user.id && (
            <button
              className="text-xs font-medium text-zinc-400 transition hover:text-rose-300 disabled:opacity-50"
              onClick={() => withdraw(c)}
              disabled={withdrawingId !== null}
            >
              {withdrawingId === c.id ? '撤回中…' : '撤回'}
            </button>
          )}
        </div>
      </div>
    </>
  )

  return (
    <section className="card p-4">
      <h2 className="section-title mb-3">留言板 · {item.commentCount}</h2>

      {comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">
          {closed ? '留言板已归档' : '还没有留言，问问成色、约个时间吧'}
        </p>
      ) : (
        <ul className="space-y-4">
          {comments.map((root) => (
            <li key={root.id} className="space-y-2.5">
              <div className="flex gap-2.5">{renderComment(root)}</div>
              {(root.replies?.length ?? 0) > 0 && (
                <ul className="ml-9 space-y-2.5 border-l-2 border-violet-400/30 pl-3">
                  {root.replies!.map((r) => (
                    <li key={r.id} className="flex gap-2">
                      {renderComment(r, true)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {!closed && (
        <div className="mt-4 space-y-2 border-t border-white/[0.08] pt-3">
          {isPublisher && (
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              <span className="chip shrink-0 bg-white/[0.06] text-xs text-zinc-400"><Sparkle weight="fill" className="size-3 text-amber-500" /> 常见提问 AI 回复</span>
              {FAQ_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => askAI(q)}
                  disabled={aiBusy !== null}
                  className="chip bg-violet-400/10 text-xs text-violet-300 ring-1 ring-violet-400/25 transition hover:bg-violet-400/15 disabled:opacity-50"
                >
                  {aiBusy === q ? '生成中…' : q}
                </button>
              ))}
            </div>
          )}
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-violet-300">
              <span className="rounded-full bg-violet-400/10 px-2.5 py-1 ring-1 ring-violet-400/25">
                回复 @{replyTo.name}
              </span>
              <button className="text-zinc-400 transition hover:text-zinc-400" onClick={() => setReplyTo(null)}>
                取消
              </button>
            </div>
          )}
          {aiNote && typing && (
            <p className="flex items-center gap-1 text-xs text-violet-300"><Sparkle weight="fill" className="size-3 animate-pulse text-fuchsia-400" /> AI 正在生成建议…</p>
          )}
          {aiNote && text && !typing && (
            <p className="flex items-center gap-1 text-xs text-violet-300"><Sparkle weight="fill" className="size-3 text-fuchsia-400" /> AI 建议已填入输入框，可修改后发送</p>
          )}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="input flex-1"
              placeholder={replyTo ? `回复 @${replyTo.name}：` : isPublisher ? '回复对方…' : '问一句：还在吗？几成新？'}
              value={text}
              maxLength={300}
              onChange={(e) => {
                setText(e.target.value)
                setAiNote(false)
              }}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="btn-primary px-5" onClick={send} disabled={sending || !text.trim()}>
              发送
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
