// LLM 服务层：统一走 OpenAI 兼容接口（默认 Z.ai GLM），
// 未配置 Key 或调用失败时自动降级为内置 Mock，保证演示永不中断。
// 前端通过 source/provider 区分真实模型与本地降级；兼容 GLM、DeepSeek 等 OpenAI 风格接口。

const BASE_URL = (process.env.LLM_BASE_URL || 'https://api.z.ai/api/paas/v4').replace(/\/+$/, '')
const API_KEY = process.env.LLM_API_KEY || ''
const MODEL = process.env.LLM_MODEL || 'glm-4.5-flash'

function inferProvider() {
  if (process.env.LLM_PROVIDER_NAME?.trim()) return process.env.LLM_PROVIDER_NAME.trim()
  const hint = `${BASE_URL} ${MODEL}`.toLowerCase()
  if (hint.includes('deepseek')) return 'DeepSeek'
  if (hint.includes('z.ai') || hint.includes('bigmodel') || hint.includes('glm')) return 'GLM'
  if (hint.includes('openai')) return 'OpenAI'
  return '兼容模型'
}

const PROVIDER = inferProvider()
type LLMSource = { source: 'llm' | 'mock'; provider: string }

export function llmEnabled() {
  return API_KEY.trim().length > 0
}

type ChatMessage = { role: 'system' | 'user'; content: string }

async function chat(messages: ChatMessage[], json = false): Promise<string> {
  if (!llmEnabled()) throw new Error('LLM_NOT_CONFIGURED')
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('LLM empty response')
  return content
}

function extractJson(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('no json in LLM response')
  return JSON.parse(m[0])
}

// ===== 1. 智能定价建议 =====
export type PriceAdvice = {
  mode: 'free' | 'priced'
  min: number | null
  max: number | null
  reason: string
}

const PRICE_SYSTEM = `你是小区、楼栋或办公室内部的闲置物品估价助手。物品只在熟人空间内当面流转，无需快递，价格应明显低于全新品和二手电商平台。
只输出 JSON：{"mode":"free"|"priced","min":number|null,"max":number|null,"reason":"不超过40字的中文建议"}
- 价值很低、搬运麻烦或几乎人人可用的物品（如旧书、普通绿植），给出 mode:"free"（建议免费送），min/max 为 null。
- 其余给出建议价格区间（人民币，整数），reason 里简述理由。`

export async function suggestPrice(title: string, description: string): Promise<{ advice: PriceAdvice } & LLMSource> {
  try {
    const raw = await chat(
      [
        { role: 'system', content: PRICE_SYSTEM },
        { role: 'user', content: `物品名称：${title}\n物品描述：${description || '（无）'}` },
      ],
      true,
    )
    const j = extractJson(raw) as Partial<PriceAdvice>
    if (j.mode !== 'free' && j.mode !== 'priced') throw new Error('bad mode')
    const advice: PriceAdvice = {
      mode: j.mode,
      min: typeof j.min === 'number' ? Math.max(0, Math.round(j.min)) : null,
      max: typeof j.max === 'number' ? Math.max(0, Math.round(j.max)) : null,
      reason: String(j.reason || '').slice(0, 60) || '基于成色与本地行情的估算',
    }
    return { advice, source: 'llm', provider: PROVIDER }
  } catch {
    return { advice: mockPrice(title), source: 'mock', provider: '内置模拟' }
  }
}

type MockAdvice = { mode: 'free' | 'priced'; min: number | null; max: number | null; reason: string }

function mockPrice(title: string): MockAdvice {
  const t = title.toLowerCase()
  const freeCat = (words: string[], why: string): MockAdvice | null =>
    words.some((w) => t.includes(w)) ? { mode: 'free', min: null, max: null, reason: why } : null
  const cat = (words: string[], min: number, max: number, why: string): MockAdvice | null =>
    words.some((w) => t.includes(w)) ? { mode: 'priced', min, max, reason: why } : null
  const hit: MockAdvice =
    freeCat(['绘本', '书', '绿萝', '绿植', '花', '卡片'], '这类物品流转价值不高，建议直接免费送给需要的人') ||
    cat(['婴儿', '推车', '安全座椅', '儿童', '宝宝', '爬架', '座椅'], 60, 180, '母婴装备更新快，熟人自提，建议原价 2-3 折') ||
    cat(['手机', '电脑', '笔记本', '平板', '相机', '耳机', '乐高', '车'], 120, 500, '大件保值相对好，建议原价 3-4 折') ||
    cat(['电磁炉', '炸锅', '加湿器', '台灯', '电饭', '微波', '风扇'], 40, 100, '小家电二手流通快，建议原价 2-3 折') ||
    cat(['桌', '椅', '架', '柜', '床垫', '沙发'], 20, 80, '家具搬运靠自提，定价不宜高') ||
    { mode: 'priced', min: 30, max: 120, reason: '参考同类闲置成交价与成色的保守估算' }
  if (hit.mode === 'free') return hit
  const mid = Math.round(((hit.min ?? 0) + (hit.max ?? 0)) / 2 / 5) * 5
  return { mode: 'priced', min: hit.min, max: hit.max, reason: hit.reason + `，可从 ${mid} 元起挂` }
}

// ===== 2. 物品描述优化 =====
export async function polishDescription(title: string, description: string): Promise<{ text: string } & LLMSource> {
  try {
    const text = await chat([
      {
        role: 'system',
        content:
          '你是小区、楼栋或办公室内部的闲置转让文案助手。把用户粗糙的描述改写成一条有温度、信息清楚的转让文案：保留所有事实（成色、瑕疵、配件），不夸大不编造；120 字以内；分 1-2 段；语气亲切自然，像发在熟人群里；结尾提一句"当前空间内当面交接"。直接输出文案本身，不要任何前缀和引号。',
      },
      { role: 'user', content: `物品：${title}\n我的描述：${description || '（很简单，帮我写完整一点）'}` },
    ])
    return { text: text.trim().slice(0, 300), source: 'llm', provider: PROVIDER }
  } catch {
    return { text: mockPolish(title, description), source: 'mock', provider: '内置模拟' }
  }
}

function mockPolish(title: string, description: string) {
  const facts = (description || '').trim()
  return facts
    ? `【${title}】\n\n${facts}\n\n📍 当前空间内当面交接，感兴趣可以留言沟通。`
    : `【${title}】闲置转让\n\n具体成色、配件和使用情况欢迎留言询问。\n\n📍 当前空间内当面交接，感兴趣可以留言沟通。`
}

// ===== 3. 交易 FAQ 自动回复建议 =====
export async function suggestReply(
  item: { title: string; description: string; tradeMode: string; price: number | null; condition: string; building: string },
  question: string,
): Promise<{ text: string } & LLMSource> {
  try {
    const text = await chat([
      {
        role: 'system',
        content:
          '你是熟人空间内闲置转让的发布者助手。根据物品信息和其他成员的提问，以发布者口吻写一句中文回复：友好、具体、不超过 40 字，可直接发送。只输出回复内容本身。',
      },
      {
        role: 'user',
        content: `物品信息：${JSON.stringify(item)}\n成员提问：${question}`,
      },
    ])
    return { text: text.trim().replace(/^["「『]|["」』]$/g, '').slice(0, 80), source: 'llm', provider: PROVIDER }
  } catch {
    return { text: mockReply(item, question), source: 'mock', provider: '内置模拟' }
  }
}

function mockReply(item: { tradeMode: string; price: number | null; condition: string; building: string }, question: string) {
  const q = question.toLowerCase()
  if (/还在|有了吗|卖出|售出/.test(q)) return '在的在的，还没送出，随时可以来看～'
  if (/几成新|成色|新旧|瑕疵|磨损/.test(q)) {
    const map: Record<string, string> = {
      NEW: '全新未拆封，直接用！',
      LIKE_NEW: '几乎全新，买来用得很少，细节看图～',
      GOOD: '用过一段时间，有轻微使用痕迹，功能完好。',
      USED: '有明显使用痕迹，但一切都正常，介意慎拍。',
    }
    return map[item.condition] || '成色看图，功能都正常～'
  }
  if (/自提|怎么拿|哪里拿|怎么交|快递|发货|邮/.test(q)) return `不出邮哦，就在${item.building}，楼下当面交接最方便～`
  if (/刀|便宜|少点|优惠|价格/.test(q)) {
    if (item.tradeMode === 'FREE') return '免费的，不用砍啦，来拿就行 😄'
    if (item.tradeMode === 'ANY') return '看着给就行，主要是想让它找到新主人～'
    return `价格已经很实在啦，诚心想要的话 ${item.price} 就拿走 🤝`
  }
  if (/什么时候|时间|周末|晚上|今天/.test(q)) return '晚上 7 点后和周末白天都方便，你定时间～'
  return '感谢关注！有其他问题欢迎留言，看到都会回复～'
}
