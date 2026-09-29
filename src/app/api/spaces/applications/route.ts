import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { createSpaceInviteCode, createSpaceSlug, ensureSpaceInviteCode } from '@/lib/spaces'

export const dynamic = 'force-dynamic'

const isAdmin = (user: Awaited<ReturnType<typeof getCurrentUser>>) => user?.role === 'PLATFORM_ADMIN'

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    type?: string
    contact?: string
    reason?: string
  }
  const name = String(body.name ?? '').trim()
  const type = String(body.type ?? '').trim()
  const contact = String(body.contact ?? '').trim()
  const reason = String(body.reason ?? '').trim()

  if (name.length < 2 || name.length > 30) return NextResponse.json({ error: '空间名称需为 2-30 个字' }, { status: 400 })
  if (!['小区', '楼栋', '办公楼', '办公室'].includes(type)) return NextResponse.json({ error: '请选择正确的空间类型' }, { status: 400 })
  if (contact.length < 3 || contact.length > 60) return NextResponse.json({ error: '请填写有效的联系方式' }, { status: 400 })
  if (reason.length < 5 || reason.length > 200) return NextResponse.json({ error: '申请说明需为 5-200 个字' }, { status: 400 })

  const existingSpace = await db.space.findFirst({ where: { name } })
  if (existingSpace) return NextResponse.json({ error: '该空间已经开通，可以直接选择加入' }, { status: 400 })
  const pending = await db.spaceApplication.findFirst({ where: { name, contact, status: 'PENDING' } })
  if (pending) return NextResponse.json({ error: '相同申请正在审核中，请勿重复提交' }, { status: 400 })

  const application = await db.spaceApplication.create({ data: { name, type, contact, reason } })
  return NextResponse.json({ id: application.id, status: application.status }, { status: 201 })
}

export async function GET() {
  const current = await getCurrentUser()
  if (!isAdmin(current)) return NextResponse.json({ error: '仅平台管理员可查看申请' }, { status: 403 })
  const [applications, spaces] = await Promise.all([
    db.spaceApplication.findMany({ orderBy: { createdAt: 'desc' } }),
    db.space.findMany({ orderBy: { name: 'asc' } }),
  ])
  const spacesWithCodes = await Promise.all(spaces.map(async (space) => ({
    id: space.id,
    name: space.name,
    type: space.type,
    inviteCode: await ensureSpaceInviteCode(space.id),
  })))
  return NextResponse.json({ applications, spaces: spacesWithCodes })
}

export async function PATCH(req: NextRequest) {
  const current = await getCurrentUser()
  if (!isAdmin(current)) return NextResponse.json({ error: '仅平台管理员可审核申请' }, { status: 403 })
  const body = (await req.json().catch(() => ({}))) as { id?: string; action?: 'approve' | 'reject' }
  if (!body.id || !['approve', 'reject'].includes(body.action ?? ''))
    return NextResponse.json({ error: '审核参数不正确' }, { status: 400 })

  const application = await db.spaceApplication.findUnique({ where: { id: body.id } })
  if (!application) return NextResponse.json({ error: '申请不存在' }, { status: 404 })
  if (application.status !== 'PENDING') return NextResponse.json({ error: '该申请已经处理' }, { status: 400 })

  if (body.action === 'approve') {
    const duplicate = await db.space.findFirst({ where: { name: application.name } })
    if (duplicate) return NextResponse.json({ error: '同名空间已经存在' }, { status: 400 })
    await db.$transaction([
      db.space.create({
        data: {
          name: application.name,
          type: application.type,
          slug: createSpaceSlug(),
          inviteCode: createSpaceInviteCode(),
        },
      }),
      db.spaceApplication.update({
        where: { id: application.id },
        data: { status: 'APPROVED', reviewedBy: current!.name, reviewedAt: new Date() },
      }),
    ])
  } else {
    await db.spaceApplication.update({
      where: { id: application.id },
      data: { status: 'REJECTED', reviewedBy: current!.name, reviewedAt: new Date() },
    })
  }

  return NextResponse.json({ ok: true })
}
