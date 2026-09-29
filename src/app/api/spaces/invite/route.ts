import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { ensureSpaceInviteCode } from '@/lib/spaces'

export const dynamic = 'force-dynamic'

// GET: 当前社区成员查看自己的邀请码；POST: 注册页校验邀请码并识别所属社区。
export async function GET() {
  const current = await getCurrentUser()
  if (!current || current.role !== 'MEMBER' || !current.spaceId || !current.space)
    return NextResponse.json({ error: '仅已加入社区的成员可以查看邀请码' }, { status: 403 })

  const inviteCode = await ensureSpaceInviteCode(current.spaceId)
  if (!inviteCode) return NextResponse.json({ error: '社区邀请码暂不可用' }, { status: 500 })
  return NextResponse.json({ inviteCode, space: current.space })
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { code?: string }
  const code = String(body.code ?? '').trim().toUpperCase()
  if (!/^[A-F0-9]{12}$/.test(code))
    return NextResponse.json({ error: '邀请码格式不正确' }, { status: 400 })

  const space = await db.space.findUnique({
    where: { inviteCode: code },
    select: { id: true, name: true, slug: true, type: true },
  })
  if (!space) return NextResponse.json({ error: '邀请码无效，请向已加入社区的成员确认' }, { status: 404 })
  return NextResponse.json({ space })
}
