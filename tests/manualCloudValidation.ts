import { cloudToDesktop } from '../src/shared/cloudSnapshot'

const [base, email, password] = process.argv.slice(2)

if (!base || !email || !password) {
  console.error('用法: tsx tests/manualCloudValidation.ts <baseUrl> <email> <password>')
  process.exit(1)
}

function extractSetCookies(res: Response): string {
  const setCookies = res.headers.getSetCookie?.() ?? []
  return setCookies.map((cookie) => cookie.split(';')[0]).join('; ')
}

function mergeCookies(existing: string, newer: string): string {
  const map = new Map<string, string>()
  for (const cookie of existing.split('; ').filter(Boolean)) {
    const [name, ...rest] = cookie.split('=')
    map.set(name, rest.join('='))
  }
  for (const cookie of newer.split('; ').filter(Boolean)) {
    const [name, ...rest] = cookie.split('=')
    map.set(name, rest.join('='))
  }
  return Array.from(map.entries()).map(([key, value]) => `${key}=${value}`).join('; ')
}

async function main(): Promise<void> {
  const normalizedBase = base.replace(/\/+$/, '')
  const csrfRes = await fetch(`${normalizedBase}/api/auth/csrf`, {
    headers: { Accept: 'application/json' },
  })
  const csrf = (await csrfRes.json()) as { csrfToken?: string }
  if (!csrf?.csrfToken) {
    throw new Error(`获取 CSRF token 失败: ${csrfRes.status}`)
  }

  const csrfCookies = extractSetCookies(csrfRes)
  const callbackRes = await fetch(`${normalizedBase}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookies,
    },
    body: new URLSearchParams({ email, password, csrfToken: csrf.csrfToken }).toString(),
    redirect: 'manual',
  })

  const callbackCookies = mergeCookies(csrfCookies, extractSetCookies(callbackRes))
  const sessionRes = await fetch(`${normalizedBase}/api/auth/session`, {
    headers: {
      Accept: 'application/json',
      Cookie: callbackCookies,
    },
  })
  const session = (await sessionRes.json()) as { user?: { email?: string } }
  if (!session.user?.email) {
    throw new Error('云端登录失败：邮箱或密码错误')
  }

  const cookies = mergeCookies(callbackCookies, extractSetCookies(sessionRes))
  const syncRes = await fetch(`${normalizedBase}/api/sync`, {
    headers: {
      Accept: 'application/json',
      Cookie: cookies,
    },
  })

  if (!syncRes.ok) {
    throw new Error(`读取 /api/sync 失败: ${syncRes.status} ${syncRes.statusText}`)
  }

  const payload = (await syncRes.json()) as { data?: unknown; updatedAt?: string | null }
  const desktop = payload.data ? cloudToDesktop(payload.data as never) : null

  console.log(JSON.stringify({
    sessionEmail: session.user.email,
    updatedAt: payload.updatedAt ?? null,
    hasData: !!payload.data,
    workspaceCount: desktop?.workspaces.length ?? 0,
    missionCount: desktop ? Object.keys(desktop.missions).length : 0,
    boardCount: desktop ? Object.keys(desktop.boards).length : 0,
    noteCount: desktop ? Object.keys(desktop.notes).length : 0,
  }, null, 2))
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
