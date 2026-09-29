import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { getCurrentUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }
const MAX_SIZE = 5 * 1024 * 1024

// POST /api/upload (multipart: file) — 实拍图片上传，存到 public/uploads
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: '缺少文件' }, { status: 400 })
  const ext = ALLOWED[file.type as keyof typeof ALLOWED]
  if (!ext) return NextResponse.json({ error: '仅支持 JPG / PNG / WebP / GIF' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: '图片不能超过 5MB' }, { status: 400 })

  const dir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  const name = `${randomUUID()}${ext}`
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()))
  return NextResponse.json({ url: `/uploads/${name}` })
}
