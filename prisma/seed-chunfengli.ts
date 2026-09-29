/* 追加：春风里小区的 4 位新邻居 + 6 件实拍图商品（不动现有数据，幂等）。 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()
const H = 3600 * 1000
const ago = (h: number) => new Date(Date.now() - h * H)
const file = (name: string) => JSON.stringify([{ kind: 'file', url: `/uploads/items/${name}.jpg` }])

async function main() {
  const space = await db.space.findUnique({ where: { slug: 'chunfengli' } })
  if (!space) throw new Error('春风里空间不存在，请先运行主种子')

  // 4 位春风里邻居（幂等：按 username 查找或创建）
  const people = [
    { username: 'chenmama', name: '陈妈咪', avatar: '👩‍🍳', building: '春风里 1 号楼', bio: '二胎妈妈，娃用品流转中' },
    { username: 'laowang', name: '老王', avatar: '🔧', building: '春风里 3 号楼', bio: '小区万能水电工' },
    { username: 'xiaoyu', name: '小雨', avatar: '🌧️', building: '春风里 5 号楼', bio: '租房青年，下月搬去隔壁区' },
    { username: 'luoshu', name: '罗叔', avatar: '🍵', building: '春风里 6 号楼', bio: '退休老师傅，喝茶养鸟' },
  ]
  const users: Record<string, { id: string }> = {}
  for (const p of people) {
    const u = await db.user.upsert({
      where: { username: p.username },
      update: {},
      create: { ...p, passwordHash: bcrypt.hashSync('123456', 10), spaceId: space.id, role: 'MEMBER' },
    })
    users[p.username] = u
  }

  // 云杉里的邻居（跨小区点想要/留言，让互动更真实）
  const daxiong = await db.user.findUnique({ where: { username: 'daxiong' } })
  const taozi = await db.user.findUnique({ where: { username: 'taozi' } })
  const lin = await db.user.findUnique({ where: { username: 'lin' } })
  const xiaoke = await db.user.findUnique({ where: { username: 'xiaoke' } })

  type NewItem = {
    key: string
    title: string
    description: string
    tradeMode: string
    price?: number
    condition: string
    images: string
    owner: { id: string }
    hoursAgo: number
    wantedBy?: Array<{ id: string }>
    comments?: Array<{ user: { id: string }; content: string; hoursAfter: number }>
  }

  const items: NewItem[] = [
    {
      key: 'chunfengli-kidbike',
      title: '儿童自行车 14 寸（带辅助轮）',
      description: '娃从 3 岁骑到 5 岁，车身结实无变形，辅助轮可拆。刚换完内外胎，骑上就能走。春风里楼下自提，可试骑。',
      tradeMode: 'PRICED', price: 110, condition: 'GOOD', images: file('kidbike'), owner: users['chenmama'], hoursAgo: 8,
      wantedBy: [daxiong!, taozi!].filter(Boolean),
      comments: [{ user: daxiong!, content: '辅助轮的螺丝都在吗？', hoursAfter: 2 }],
    },
    {
      key: 'chunfengli-keyboard',
      title: '机械键盘 87 键（粉白轴体）',
      description: '买来配平板用的，敲了不到一个月，键帽无打油。青轴手感清脆，Type-C 即插即用。搬家出，附原装线。',
      tradeMode: 'PRICED', price: 129, condition: 'LIKE_NEW', images: file('keyboard'), owner: users['xiaoyu'], hoursAgo: 26,
      wantedBy: [xiaoke!].filter(Boolean),
    },
    {
      key: 'chunfengli-kettle',
      title: '玻璃电热水壶 1.7L（蓝光）',
      description: '烧水很快，玻璃壶身无水垢，壶口大好清洗。家里换即热饮水机了，这台给需要的邻居，先到先得。',
      tradeMode: 'FREE', condition: 'LIKE_NEW', images: file('kettle'), owner: users['laowang'], hoursAgo: 50,
      wantedBy: [lin!, taozi!].filter(Boolean),
    },
    {
      key: 'chunfengli-teatable',
      title: '胡桃木圆形茶几',
      description: '实木圆几，桌面纹理很好看，球形腿很有质感。尺寸不大，小户型客厅正合适。搬新家风格不搭了，喜欢的过来看看，顺便喝杯茶。',
      tradeMode: 'ANY', condition: 'GOOD', images: file('teatable'), owner: users['luoshu'], hoursAgo: 90,
      comments: [
        { user: lin!, content: '罗叔这个配绿植绝了', hoursAfter: 6 },
        { user: users['luoshu'], content: '哈哈周末来看，给你泡新到的凤凰单丛', hoursAfter: 7 },
      ],
    },
    {
      key: 'chunfengli-printer',
      title: '迷你错题打印机（学生党）',
      description: '打印错题、便签、标签都好用，蓝牙连接 App 操作简单。耗材网上随处可买。娃升学后用不上了，九成新。',
      tradeMode: 'PRICED', price: 150, condition: 'GOOD', images: file('printer'), owner: users['chenmama'], hoursAgo: 120,
    },
    {
      key: 'chunfengli-monitor',
      title: '27 寸显示器（2K）',
      description: '自用两年，屏幕无坏点无划痕，支架升降旋转顺滑。搬家不方便带走，配 HDMI 线一起出。工作日下午都在家，可上门验屏。',
      tradeMode: 'PRICED', price: 320, condition: 'GOOD', images: file('monitor'), owner: users['xiaoyu'], hoursAgo: 30,
      wantedBy: [xiaoke!, users['chenmama']].filter(Boolean),
    },
  ]

  // 幂等：按标题查重，已有则跳过
  let added = 0
  for (const it of items) {
    const exists = await db.item.findFirst({ where: { title: it.title } })
    if (exists) continue
    const createdAt = ago(it.hoursAgo)
    const item = await db.item.create({
      data: {
        title: it.title,
        description: it.description,
        tradeMode: it.tradeMode,
        price: it.price,
        condition: it.condition,
        images: it.images,
        status: 'ACTIVE',
        publisherId: it.owner.id,
        createdAt,
      },
    })
    for (const w of it.wantedBy ?? []) await db.want.create({ data: { itemId: item.id, userId: w.id, createdAt: new Date(createdAt.getTime() + 3 * H) } })
    const created: Array<{ id: string; userId: string }> = []
    for (const c of it.comments ?? []) {
      const cm = await db.comment.create({
        data: { itemId: item.id, userId: c.user.id, content: c.content, createdAt: new Date(createdAt.getTime() + c.hoursAfter * H) },
      })
      created.push({ id: cm.id, userId: c.user.id })
    }
    added++
  }

  const total = await db.item.count()
  console.log(`春风里新增 ${added} 件，当前共 ${total} 件`)
  console.log('新邻居账号（密码 123456）: chenmama / laowang / xiaoyu / luoshu')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
