import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'

// 应用组布局：封面（/）独立成页，组内页面共享侧栏壳
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
