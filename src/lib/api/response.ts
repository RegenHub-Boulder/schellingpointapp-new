import { NextResponse } from 'next/server'

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60',
}

export function apiSuccess(data: unknown, count?: number) {
  const body = count !== undefined ? { data, count } : { data }
  return NextResponse.json(body, { headers: CACHE_HEADERS })
}

export function apiError(
  status: number,
  code: string,
  message: string
) {
  return NextResponse.json(
    { error: { code, message } },
    { status }
  )
}

export function unauthorized() {
  return apiError(401, 'UNAUTHORIZED', 'Missing or invalid API key')
}

export function badRequest(message: string) {
  return apiError(400, 'BAD_REQUEST', message)
}

export function notFound(resource: string) {
  return apiError(404, 'NOT_FOUND', `${resource} not found`)
}

export function methodNotAllowed() {
  return apiError(405, 'METHOD_NOT_ALLOWED', 'Only GET requests are allowed')
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id)
}

export function parseIncludes(
  request: Request,
  validIncludes: string[]
): { includes: string[] } | { error: NextResponse } {
  const url = new URL(request.url)
  const includeParam = url.searchParams.get('include')
  if (!includeParam) return { includes: [] }

  const requested = includeParam.split(',').map(s => s.trim()).filter(Boolean)
  const invalid = requested.filter(r => !validIncludes.includes(r))

  if (invalid.length > 0) {
    return {
      error: badRequest(
        `Invalid include(s): ${invalid.join(', ')}. Valid options: ${validIncludes.join(', ')}`
      ),
    }
  }

  return { includes: requested }
}
