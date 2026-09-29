/* 种子数据：5 位普通成员 + 1 位平台管理员 + 20 件物品（18 件实拍图 + 2 件 emoji 占位），
   覆盖所有新鲜度状态、交易方式、已送出归档（用于看板）、想要与留言。 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'

const db = new PrismaClient()
const H = 3600 * 1000
const ago = (h: number) => new Date(Date.now() - h * H)
const inviteCode = () => randomBytes(6).toString('hex').toUpperCase()

const file = (name: string) => JSON.stringify([{ kind: 'file', url: `/uploads/items/${name}.jpg` }])
const img = (emoji: string, hue: number) => JSON.stringify([{ kind: 'emoji', emoji, hue }])

async function main() {
  // 幂等：已有数据时跳过（--force 可强制重灌）
  if ((await db.user.count()) > 0 && !process.argv.includes('--force')) {
    console.log('Seed skipped: data already exists (use --force to reseed)')
    return
  }

  await db.comment.deleteMany()
  await db.want.deleteMany()
  await db.item.deleteMany()
  await db.user.deleteMany()
  await db.spaceApplication.deleteMany()
  await db.space.deleteMany()

  const community = await db.space.create({
    data: { name: '云杉里社区', slug: 'yunsanli', type: '小区', inviteCode: inviteCode() },
  })
  await db.space.create({
    data: { name: '春风里社区', slug: 'chunfengli', type: '小区', inviteCode: inviteCode() },
  })
  await db.space.create({
    data: { name: '启明大厦', slug: 'qiming-building', type: '办公楼', inviteCode: inviteCode() },
  })

  const [acheng, daxiong, lin, xiaoke, taozi] = await Promise.all(
    [
      { username: 'acheng', name: '阿澄', avatar: '🦊', building: '3 号楼 2 单元', bio: '刚搬来三个月，正在断舍离' },
      { username: 'daxiong', name: '大熊', avatar: '🐻', building: '5 号楼 1 单元', bio: '家有神兽，装备更新快' },
      { username: 'lin', name: '林老师', avatar: '🌻', building: '2 号楼 1 单元', bio: '爱养花，藏书多' },
      { username: 'xiaoke', name: '小柯', avatar: '🐱', building: '6 号楼 3 单元', bio: '数码爱好者，一切可修' },
      { username: 'taozi', name: '桃子', avatar: '🍑', building: '1 号楼 2 单元', bio: '厨房设备控，烘焙人' },
    ].map((u) => db.user.create({
      data: {
        ...u,
        spaceId: community.id,
        role: 'MEMBER',
        passwordHash: bcrypt.hashSync('123456', 10),
      },
    })),
  )

  await db.user.create({
    data: {
      username: 'admin',
      name: '平台管理员',
      avatar: '🛡️',
      building: '邻集运营中心',
      bio: '负责审核新空间申请',
      role: 'PLATFORM_ADMIN',
      spaceId: null,
      passwordHash: bcrypt.hashSync('123456', 10),
    },
  })

  console.log('演示账号（密码均为 123456）: admin / acheng / daxiong / lin / xiaoke / taozi')

  type SeedItem = {
    title: string
    description: string
    tradeMode: string
    price?: number
    condition: string
    images: string
    owner: { id: string }
    hoursAgo: number
    givenAfterHours?: number
    givenTo?: { id: string }
    wantedBy?: Array<{ id: string }>
    comments?: Array<{ user: { id: string }; content: string; hoursAfter: number; replyTo?: number }>
  }

  const items: SeedItem[] = [
    {
      title: '婴儿轻便伞车（好孩子）',
      description: '娃大了用不上，一键收折，后备箱轻松放。轮子顺滑，遮阳篷完好，无破损。小区楼下自提，可试推。',
      tradeMode: 'PRICED', price: 120, condition: 'GOOD', images: file('stroller'), owner: daxiong, hoursAgo: 3,
      wantedBy: [acheng, taozi],
      comments: [{ user: acheng, content: '还在吗？周末可以去看吗？', hoursAfter: 1 }],
    },
    {
      title: '美的电磁炉 2100W',
      description: '搬家前买来过渡用的，用了不到十次。按键灵敏，送一口汤锅。烘焙党入烤箱后用不上了。',
      tradeMode: 'PRICED', price: 89, condition: 'LIKE_NEW', images: file('induction'), owner: taozi, hoursAgo: 20,
      wantedBy: [acheng],
    },
    {
      title: '绘本一箱 30+ 本（0-6 岁）',
      description: '娃的绘本整理出一整箱：《猜猜我有多爱你》《肚子里有个火车站》等经典款，大部分接近全新，无涂画。希望整套送给会珍惜的娃～',
      tradeMode: 'ANY', condition: 'LIKE_NEW', images: file('books'), owner: lin, hoursAgo: 46,
      wantedBy: [daxiong, taozi, acheng],
      comments: [
        { user: daxiong, content: '还在吗？想给我家俩娃囤一批', hoursAfter: 5 },
        { user: lin, content: '在的，这周末白天都在家，可以来看看', hoursAfter: 6, replyTo: 0 },
      ],
    },
    {
      title: '绿萝大盆 + 自吸水花盆',
      description: '养了两年的老桩绿萝，藤蔓已经垂到地上了，特别好养。自吸水盆出差一周也不怕。办公室窗台也能放。',
      tradeMode: 'FREE', condition: 'GOOD', images: file('plant'), owner: lin, hoursAgo: 70,
      wantedBy: [taozi],
      comments: [
        { user: taozi, content: '能分几盆吗？想要两盆放阳台 😄', hoursAfter: 10 },
        { user: lin, content: '可以呀，周末过来看，顺便教你养护', hoursAfter: 11, replyTo: 0 },
      ],
    },
    {
      title: '捷安特 ATX 660 山地车',
      description: '骑行一年半，刚做过保养换了刹车皮，前后变速顺畅，骑上就能走。上班族通勤神器，只骑过上下班。',
      tradeMode: 'PRICED', price: 450, condition: 'GOOD', images: file('bike'), owner: xiaoke, hoursAgo: 96,
      wantedBy: [daxiong],
    },
    {
      title: '空气炸锅 5L 大容量',
      description: '九成新，内胆无划痕，炸篮可拆洗。做蛋挞、烤红薯、复炸鸡块都很好用。入烤箱之后用不上了。',
      tradeMode: 'PRICED', price: 99, condition: 'LIKE_NEW', images: file('airfryer'), owner: taozi, hoursAgo: 120,
      givenAfterHours: 6, givenTo: acheng,
    },
    {
      title: '宜家拉克边桌（两张）',
      description: '经典的拉克小边桌，一张放沙发边一张当床头桌。搬家处理，桌面有轻微使用痕迹，结构结实不晃。',
      tradeMode: 'FREE', condition: 'USED', images: file('sidetable'), owner: acheng, hoursAgo: 144,
      givenAfterHours: 26, givenTo: daxiong,
    },
    {
      title: '猫爬架 1.6 米大型',
      description: '搬家送人！剑麻柱完好，平台垫子刚洗过。猫主子已经另有新欢（纸箱子），欢迎来看实物，需要自己拆装搬运。',
      tradeMode: 'ANY', condition: 'GOOD', images: file('cattree'), owner: acheng, hoursAgo: 168,
      wantedBy: [daxiong, taozi, xiaoke, lin],
      comments: [
        { user: daxiong, content: '多高呀？家里客厅层高够吗？', hoursAfter: 3 },
        { user: acheng, content: '1 米 6，客厅放没问题，就是需要自己拆装搬运', hoursAfter: 4, replyTo: 0 },
        { user: taozi, content: '随时可以去看，我家猫肯定喜欢', hoursAfter: 8 },
      ],
    },
    {
      title: '小米台灯 Pro（国 AA 级照度）',
      description: '买给孩子写作业的，光照均匀无频闪，色温亮度无级调节。搬新书房后换了长臂款，这台几乎全新。',
      tradeMode: 'PRICED', price: 69, condition: 'LIKE_NEW', images: img('💡', 55), owner: xiaoke, hoursAgo: 192,
      givenAfterHours: 2, givenTo: taozi,
    },
    {
      title: '小米加湿器 4L',
      description: '去年冬天买的，机况良好，无水垢，静音模式下卧室睡觉完全没声音。开春了用不上，搬家前出掉。',
      tradeMode: 'PRICED', price: 45, condition: 'GOOD', images: file('humidifier'), owner: acheng, hoursAgo: 216,
      comments: [{ user: daxiong, content: '声音大吗？想放卧室用', hoursAfter: 12 }],
    },
    {
      title: '英语启蒙点读卡片（全套）',
      description: '廖彩杏书单配套点读卡，配合点读笔使用（笔另出）。卡片品相很好，无折角，收纳盒装好。免费的，希望孩子能用上。',
      tradeMode: 'FREE', condition: 'LIKE_NEW', images: img('🃏', 15), owner: daxiong, hoursAgo: 240,
      wantedBy: [acheng],
    },
    {
      title: '乐高城市组 60200 积木',
      description: '已拼好展示，无缺件，说明书和盒子都在，可拆开自提。孩子长大了，给更喜欢乐高的小朋友。',
      tradeMode: 'PRICED', price: 180, condition: 'GOOD', images: file('lego'), owner: xiaoke, hoursAgo: 288,
      givenAfterHours: 50, givenTo: daxiong,
    },
    {
      title: '全新瑜伽垫 加厚防滑',
      description: '双十一囤多了，全新未拆封，8mm 加厚，防滑纹理，送绑带和网袋。客厅跟着视频练完全够用。',
      tradeMode: 'PRICED', price: 35, condition: 'NEW', images: file('yoga'), owner: taozi, hoursAgo: 336,
      wantedBy: [lin, acheng],
    },
    {
      title: '儿童安全座椅 0-4 岁',
      description: '娃坐了两年，坐姿习惯养成后换了增高垫。外壳结实无磕碰，布套上周刚拆洗晒好，支持正反双向安装。',
      tradeMode: 'ANY', condition: 'GOOD', images: file('carseat'), owner: daxiong, hoursAgo: 360,
      givenAfterHours: 30, givenTo: lin,
    },
    // ===== 新增 6 件 =====
    {
      title: '九阳电饭煲 4L（智能预约）',
      description: '用了半年，内胆不粘涂层完好，煮饭很香。24 小时预约、多种煮米模式。换了更大容量款，这台九成新出掉。',
      tradeMode: 'PRICED', price: 95, condition: 'LIKE_NEW', images: file('ricecooker'), owner: taozi, hoursAgo: 5,
      wantedBy: [lin],
    },
    {
      title: '儿童滑板车（babycare 三轮）',
      description: '娃骑了一年，轮子顺滑不卡，把手高度三档可调，座椅可拆。摔过一次漆面小磕碰，结构完全没问题。',
      tradeMode: 'PRICED', price: 60, condition: 'GOOD', images: file('scooter'), owner: daxiong, hoursAgo: 14,
      wantedBy: [taozi],
      comments: [{ user: taozi, content: '适合几岁的娃？我家 3 岁半', hoursAfter: 4 }],
    },
    {
      title: '德龙半自动咖啡机',
      description: '搬家出，蒸汽打奶泡正常，萃取压力稳定。每天一杯，用了八个月。配件齐全：手柄、粉勺、接水盘都在。咖啡控看过来～',
      tradeMode: 'PRICED', price: 380, condition: 'GOOD', images: file('coffee'), owner: xiaoke, hoursAgo: 30,
      wantedBy: [acheng, lin],
      comments: [{ user: acheng, content: '磨豆机是分开的吗？', hoursAfter: 2 }],
    },
    {
      title: '铝框行李箱 24 寸',
      description: '出差买了两个，出一个。TSA 海关锁，万向轮很顺，拉链顺滑无卡顿。表面有轻微划痕，内部干净如新。',
      tradeMode: 'PRICED', price: 150, condition: 'GOOD', images: file('luggage'), owner: acheng, hoursAgo: 52,
    },
    {
      title: '桌游十连盒（探案+卡牌）',
      description: '闲置桌游打包出：探案本两套 + 宝可梦卡牌展示盒等，共十盒。都是正版，八九成新。适合周末组局，人齐了很好玩。',
      tradeMode: 'PRICED', price: 120, condition: 'GOOD', images: file('boardgame'), owner: xiaoke, hoursAgo: 76,
      wantedBy: [daxiong],
    },
    {
      title: '宜家蓝牙音箱（软木款）',
      description: '宜家联名款，木纹饰面颜值很高。蓝牙 5.0 连接稳定，音质中正，卧室床头刚好。搬家出了，附赠 Type-C 线。',
      tradeMode: 'PRICED', price: 55, condition: 'LIKE_NEW', images: file('speaker'), owner: lin, hoursAgo: 100,
      wantedBy: [xiaoke],
      comments: [{ user: xiaoke, content: '音质比同价位的小米怎么样？', hoursAfter: 6 }],
    },
  ]

  for (const it of items) {
    const createdAt = ago(it.hoursAgo)
    const givenAt = it.givenAfterHours != null ? new Date(createdAt.getTime() + it.givenAfterHours * H) : null
    const item = await db.item.create({
      data: {
        title: it.title,
        description: it.description,
        tradeMode: it.tradeMode,
        price: it.price,
        condition: it.condition,
        images: it.images,
        status: givenAt ? 'GIVEN' : 'ACTIVE',
        givenAt,
        givenToId: it.givenTo?.id,
        publisherId: it.owner.id,
        createdAt,
      },
    })
    for (const w of it.wantedBy ?? []) await db.want.create({ data: { itemId: item.id, userId: w.id, createdAt: new Date(createdAt.getTime() + 2 * H) } })
    const createdComments: Array<{ id: string; parentId: string | null; userId: string }> = []
    for (const c of it.comments ?? []) {
      let parentId: string | null = null
      let replyToUserId: string | null = null
      if (c.replyTo != null) {
        const target = createdComments[c.replyTo]
        parentId = target.parentId ?? target.id
        replyToUserId = target.userId
      }
      const created = await db.comment.create({
        data: {
          itemId: item.id, userId: c.user.id, content: c.content,
          createdAt: new Date(createdAt.getTime() + c.hoursAfter * H),
          parentId, replyToUserId,
        },
      })
      createdComments.push({ id: created.id, parentId, userId: c.user.id })
    }
  }

  console.log(`Seeded: 5 users, ${items.length} items (${items.filter((i) => i.givenAfterHours).length} given)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
