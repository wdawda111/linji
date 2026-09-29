'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Heart, MapPin } from '@phosphor-icons/react'
import gsap from 'gsap'
import { freshnessOf, money } from '@/lib/constants'
import type { ItemDTO } from '@/lib/constants'
import { ItemImage } from '@/components/item-image'
import './product-depth-carousel.css'

function priceOf(item: ItemDTO) {
  if (item.tradeMode === 'FREE') return '免费送'
  if (item.tradeMode === 'ANY') return '随便给'
  return item.price == null ? '待定价' : `¥${money(item.price)}`
}

export function ProductDepthCarousel({ items }: { items: ItemDTO[] }) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const carousel = useRef<HTMLDivElement | null>(null)
  const cards = useRef<Array<HTMLAnchorElement | null>>([])
  const pointerStart = useRef<number | null>(null)
  const dragged = useRef(false)
  const lastWheelAt = useRef(0)
  const count = items.length
  const selected = count ? active % count : 0

  const move = useCallback((direction: number) => {
    if (count < 2) return
    setActive((current) => (current + direction + count) % count)
  }, [count])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    cards.current.forEach((card, index) => {
      if (!card) return
      const distance = (index - selected + count) % count
      const visible = distance < Math.min(4, count)

      gsap.to(card, {
        xPercent: -50,
        yPercent: -50,
        x: distance * 42,
        y: distance * -5,
        z: distance * -105,
        rotationY: distance === 0 ? 0 : -7 - distance * 1.5,
        rotationZ: distance === 0 ? 0 : distance * 0.6,
        scale: 1 - distance * 0.035,
        autoAlpha: visible ? Math.max(0.35, 1 - distance * 0.18) : 0,
        filter: `brightness(${Math.max(0.45, 1 - distance * 0.14)}) blur(${distance > 2 ? 1.5 : 0}px)`,
        zIndex: 20 - distance,
        pointerEvents: visible ? 'auto' : 'none',
        duration: reduceMotion ? 0 : 0.68,
        ease: 'power3.out',
        overwrite: true,
      })
    })
  }, [count, selected])

  useEffect(() => {
    if (paused || count < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => move(1), 4200)
    return () => window.clearInterval(timer)
  }, [count, move, paused])

  useEffect(() => {
    const cardNodes = cards.current.filter((card): card is HTMLAnchorElement => Boolean(card))
    return () => { gsap.killTweensOf(cardNodes) }
  }, [])

  useEffect(() => {
    const element = carousel.current
    if (!element) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (count < 2) return

      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      const now = Date.now()
      if (Math.abs(delta) < 4 || now - lastWheelAt.current < 520) return

      lastWheelAt.current = now
      move(delta > 0 ? 1 : -1)
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [count, move])

  if (!count) {
    return (
      <div className="grid min-h-80 place-items-center rounded-2xl bg-black/20 text-sm text-zinc-500">
        还没有在售物品，来发布第一件吧
      </div>
    )
  }

  return (
    <div
      ref={carousel}
      className="product-depth-carousel"
      role="region"
      aria-roledescription="轮播图"
      aria-label="空间成员正在转让的物品"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') move(-1)
        if (event.key === 'ArrowRight') move(1)
      }}
      onPointerDown={(event) => {
        pointerStart.current = event.clientX
        dragged.current = false
      }}
      onPointerUp={(event) => {
        if (pointerStart.current == null) return
        const distance = event.clientX - pointerStart.current
        pointerStart.current = null
        if (Math.abs(distance) < 35) return
        dragged.current = true
        move(distance < 0 ? 1 : -1)
        window.setTimeout(() => { dragged.current = false }, 0)
      }}
      onPointerCancel={() => { pointerStart.current = null }}
    >
      <div className="product-depth-carousel__stage">
        {items.map((item, index) => (
          <Link
            key={item.id}
            ref={(node) => { cards.current[index] = node }}
            href={`/items/${item.id}`}
            className="product-depth-carousel__card"
            aria-label={`${item.title}，${priceOf(item)}，来自${item.publisher.space?.name ?? '邻里空间'}`}
            aria-hidden={selected !== index}
            tabIndex={selected === index ? 0 : -1}
            onClick={(event) => {
              if (dragged.current) {
                event.preventDefault()
                return
              }
              if (selected !== index) {
                event.preventDefault()
                setActive(index)
              }
            }}
          >
            <ItemImage image={item.images[0]} className="absolute inset-0 size-full" emojiSize="text-8xl" />
            <div className="product-depth-carousel__scrim" />
            <div className="product-depth-carousel__content">
              <div className="product-depth-carousel__badges">
                <span className="product-depth-carousel__freshness">{freshnessOf(item.createdAt).label}</span>
                <span className="product-depth-carousel__space"><MapPin weight="fill" />{item.publisher.space?.name ?? '邻里空间'}</span>
              </div>
              <div>
                <h2>{item.title}</h2>
                <p className="product-depth-carousel__description">{item.description || '等一位需要它的人'}</p>
                <div className="product-depth-carousel__meta">
                  <div>
                    <strong>{priceOf(item)}</strong>
                    <span><MapPin weight="fill" /> {item.publisher.building}</span>
                  </div>
                  <span className="product-depth-carousel__wanted"><Heart weight="fill" /> {item.wantCount} 人想要</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

    </div>
  )
}
