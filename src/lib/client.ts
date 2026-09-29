import { useEffect } from 'react'

export const SPACE_CHANGE_EVENT = 'linji:space-changed'

// 客户端 fetch 助手：统一 JSON 头与错误信息提取
export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`)
  return data as T
}

// 轻量 stale-while-revalidate：有缓存先返回旧数据避免闪骨架，后台刷新后经 onUpdate 回调换新
const cache = new Map<string, { at: number; data: unknown }>()

export function hasCache(url: string): boolean {
  return cache.has(url)
}

export async function apiSWR<T>(url: string, onUpdate?: (data: T) => void, maxAgeMs = 8000): Promise<T> {
  const hit = cache.get(url)
  if (hit && Date.now() - hit.at < maxAgeMs) return hit.data as T
  if (hit) {
    api<T>(url)
      .then((data) => {
        cache.set(url, { at: Date.now(), data })
        onUpdate?.(data)
      })
      .catch(() => cache.delete(url))
    return hit.data as T
  }
  const data = await api<T>(url)
  cache.set(url, { at: Date.now(), data })
  return data
}

export function invalidateApi(prefixes: string[] = ['/api/']) {
  for (const k of cache.keys()) if (prefixes.some((p) => k.startsWith(p))) cache.delete(k)
}

// LLM 文案打字机：把完整文本按进度回调，营造"AI 正在写"的观感
export async function typeText(onChunk: (partial: string) => void, full: string, ticks = 40, speedMs = 18): Promise<void> {
  let i = 0
  for (let t = 0; t < ticks; t++) {
    i = Math.min(full.length, Math.round(((t + 1) / ticks) * full.length))
    onChunk(full.slice(0, i))
    if (t < ticks - 1) await new Promise((r) => setTimeout(r, speedMs))
  }
  onChunk(full)
}

// 页面标题随路由变化（客户端页面无法使用 metadata 导出）
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}
