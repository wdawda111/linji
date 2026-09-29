import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <span className="text-5xl">🧭</span>
      <h2 className="mt-3 text-lg font-bold text-zinc-100">这里没有东西</h2>
      <p className="mt-1 text-sm text-zinc-500">页面不存在，或物品已被主人收回</p>
      <div className="mt-5 flex justify-center">
        <Link href="/" className="btn-primary">回到闲置首页</Link>
      </div>
    </div>
  )
}
