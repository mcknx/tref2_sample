import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const expectedPassword = process.env.ADMIN_ACCESS_PASSWORD

  if (!expectedPassword) {
    return NextResponse.json(
      { error: 'Server is missing ADMIN_ACCESS_PASSWORD' },
      { status: 500 }
    )
  }

  let password = ''

  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({})) as { password?: string }
    password = body.password || ''
  } else {
    const formData = await request.formData().catch(() => null)
    password = String(formData?.get('password') || '')
  }

  if (password !== expectedPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_session', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  })

  return response
}
