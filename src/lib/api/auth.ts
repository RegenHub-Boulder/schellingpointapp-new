import crypto from 'crypto'

export function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) return false

  const expected = process.env.API_KEY_BONFIRESAI
  if (!expected) return false

  try {
    const keyBuffer = Buffer.from(apiKey, 'utf8')
    const expectedBuffer = Buffer.from(expected, 'utf8')
    if (keyBuffer.length !== expectedBuffer.length) return false
    return crypto.timingSafeEqual(keyBuffer, expectedBuffer)
  } catch {
    return false
  }
}
