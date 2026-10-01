import { NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

export function checkAdminApiKey(request: NextRequest): boolean {
  const key = process.env.ADMIN_API_KEY
  if (!key) return false
  const authorization = request.headers.get('authorization')
  if (!authorization) return false
  const expected = `Bearer ${key}`
  if (authorization.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))
}
