'use client'

import Link from 'next/link'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <span className="text-5xl">🧯</span>
      <h2 className="mt-3 text-lg font-bold text-zinc-100">页面出了点小问题</h2>
      <p className="mt-1 text-sm text-zinc-500">{error.message || '未知错误，请重试'}</p>
      <div className="mt-5 flex justify-center gap-2">
        <button className="btn-primary" onClick={reset}>重试</button>
        <Link className="btn-ghost" href="/">回到首页</Link>
      </div>
    </div>
  )
}
