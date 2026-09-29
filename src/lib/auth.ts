import { createHmac, timingSafeEqual, randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { PROFILE_AVATARS } from './constants'

// 轻量认证：bcrypt 密码哈希 + HMAC 签名会话 Cookie（httpOnly）。
// 考试演示级别：签名防篡改；生产部署应换数据库会话表或 JWT + 轮换。

const SECRET = process.env.AUTH_SECRET || 'linji-dev-secret-change-me'
export const SESSION_COOKIE = 'linji_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 天

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10)
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash)
  } catch {
    return false
  }
}

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url')
}

/** 生成 "userId.expireAt.signature" 形式的会话令牌 */
export function createSessionToken(userId: string): string {
  const exp = Date.now() + MAX_AGE * 1000
  const payload = `${userId}.${exp}`
  return `${payload}.${sign(payload)}`
}

/** 校验令牌，返回 userId 或 null */
export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, exp, sig] = parts
  const expected = sign(`${userId}.${exp}`)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  if (Number(exp) < Date.now()) return null
  return userId
}

export const SESSION_MAX_AGE = MAX_AGE

/** 注册校验与默认头像 */
export function validateRegister(input: {
  username: string
  password: string
  name: string
}): { ok: true } | { ok: false; error: string } {
  const { username, password, name } = input
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
    return { ok: false, error: '账号需 3-20 位字母、数字或下划线' }
  if (password.length < 6 || password.length > 40)
    return { ok: false, error: '密码需 6-40 位' }
  if (!name.trim() || name.trim().length > 12)
    return { ok: false, error: '昵称需 1-12 字' }
  return { ok: true }
}

export function pickAvatar(): string {
  return PROFILE_AVATARS[randomBytes(1)[0] % PROFILE_AVATARS.length]!
}
