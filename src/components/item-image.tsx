'use client'

import type { ImageRef } from '@/lib/constants'

// 物品图：上传文件用 <img>，占位图用"暗色低饱和渐变 + emoji"，任意尺寸都清晰
export function ItemImage({
  image,
  className = '',
  emojiSize = 'text-5xl',
}: {
  image?: ImageRef | null
  className?: string
  emojiSize?: string
}) {
  if (!image)
    return (
      <div className={`grid place-items-center bg-white/[0.05] ${className}`}>
        <span className={`${emojiSize} opacity-40`}>📦</span>
      </div>
    )
  if (image.kind === 'file')
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image.url} alt="" loading="lazy" decoding="async" className={`object-cover ${className}`} />
    )
  const h = ((image.hue % 360) + 360) % 360
  return (
    <div
      className={`grid place-items-center ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${h} 30% 15%) 0%, hsl(${(h + 45) % 360} 28% 24%) 100%)`,
      }}
    >
      <span className={`${emojiSize} opacity-90 drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]`}>{image.emoji}</span>
    </div>
  )
}
