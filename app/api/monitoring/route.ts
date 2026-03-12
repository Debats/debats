import { NextRequest, NextResponse } from 'next/server'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? new URL(process.env.NEXT_PUBLIC_SENTRY_DSN)
  : null
const sentryProjectId = dsn?.pathname.replace('/', '')

export async function POST(request: NextRequest) {
  if (!dsn) {
    return NextResponse.json({ error: 'Sentry not configured' }, { status: 404 })
  }

  const envelope = await request.text()
  const header = envelope.split('\n')[0]

  let envelopeDsn: URL
  try {
    envelopeDsn = new URL(JSON.parse(header).dsn)
  } catch {
    return NextResponse.json({ error: 'Invalid envelope' }, { status: 400 })
  }

  if (envelopeDsn.hostname !== dsn.hostname) {
    return NextResponse.json({ error: 'Invalid host' }, { status: 400 })
  }

  const projectId = envelopeDsn.pathname.replace('/', '')
  if (projectId !== sentryProjectId) {
    return NextResponse.json({ error: 'Invalid project' }, { status: 400 })
  }

  const upstreamUrl = `https://${dsn.hostname}/api/${sentryProjectId}/envelope/`

  const response = await fetch(upstreamUrl, {
    method: 'POST',
    body: envelope,
    headers: { 'Content-Type': 'application/x-sentry-envelope' },
  })

  return NextResponse.json({}, { status: response.status })
}
