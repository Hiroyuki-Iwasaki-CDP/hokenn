#!/usr/bin/env node
// 顧客ごとのデータ分離・認可を、実際に動いているAPIに対して直接検証するスクリプト。
// ローカル/ステージング専用。本番の顧客データには一切触れない、テスト専用メールアドレスのみを使う。
//
// 使い方:
//   1. `.env.local` に SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ALLOWED_ORIGIN を設定
//   2. `vercel dev` (または対象環境)を起動し、BASE_URL でアクセスできる状態にする
//   3. `node --env-file=.env.local scripts/security-check.mjs` (BASE_URLは環境変数で上書き可能)
//
// SUPABASE_SERVICE_ROLE_KEY はテスト用ユーザーの作成・OTPコードの直接発行・後片付けの削除にのみ使う。
// このスクリプト自体はVercelにはデプロイしない(package.jsonのscriptsからローカル実行する用途)。

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = requireEnv('SUPABASE_URL')
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const ORIGIN = process.env.ALLOWED_ORIGIN ?? BASE_URL

const RUN_ID = Date.now().toString(36)
const EMAIL_A = `security-check-a-${RUN_ID}@example.com`
const EMAIL_B = `security-check-b-${RUN_ID}@example.com`
const EMAIL_ADVISOR = `security-check-advisor-${RUN_ID}@example.com`
const EMAIL_RATE = `security-check-rate-${RUN_ID}@example.com`

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

let passCount = 0
let failCount = 0
const createdUserIds = []

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`環境変数 ${name} が設定されていません。`)
    process.exit(1)
  }
  return v
}

function assert(condition, message) {
  if (condition) {
    passCount += 1
    console.log(`  ✅ ${message}`)
  } else {
    failCount += 1
    console.error(`  ❌ ${message}`)
  }
}

async function createTestUserAndCookie(email) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (createError) throw new Error(`test user creation failed for ${email}: ${createError.message}`)
  createdUserIds.push(created.user.id)

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError) throw new Error(`generateLink failed for ${email}: ${linkError.message}`)
  const code = linkData.properties.email_otp

  const res = await fetch(`${BASE_URL}/api/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ email, code }),
  })
  if (!res.ok) throw new Error(`verify-code failed for ${email}: ${res.status}`)

  const cookies = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0])
  return cookies.join('; ')
}

function authedFetch(cookie, path, init = {}) {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      ...(cookie ? { Cookie: cookie } : {}),
      ...init.headers,
    },
  })
}

async function createPolicy(cookie, name) {
  const res = await authedFetch(cookie, '/api/policies', {
    method: 'POST',
    body: JSON.stringify({
      insuredPersonName: name,
      category: 'medical',
      insuranceCompany: 'テスト生命',
      productName: 'テスト用医療保険',
      policyNumber: null,
      premiumAmount: 1000,
      premiumFrequency: 'monthly',
      coverageSummary: null,
      contractDate: null,
      renewalDate: null,
      status: 'active',
      memo: null,
    }),
  })
  if (!res.ok) throw new Error(`policy creation failed: ${res.status}`)
  const body = await res.json()
  return body.policy.id
}

async function main() {
  console.log(`対象: ${BASE_URL} (Origin: ${ORIGIN})\n`)

  console.log('準備: テスト用アカウントA・Bを作成しログイン…')
  const cookieA = await createTestUserAndCookie(EMAIL_A)
  const cookieB = await createTestUserAndCookie(EMAIL_B)
  const cookieAdvisor = await createTestUserAndCookie(EMAIL_ADVISOR)
  const policyIdA = await createPolicy(cookieA, 'テストA本人')
  const policyIdB = await createPolicy(cookieB, 'テストB本人')
  console.log('準備完了。\n')

  console.log('1. 未ログイン状態でAPIを呼べない')
  {
    const res = await authedFetch(null, '/api/policies')
    assert(res.status === 401, 'Cookie無しでの一覧取得は401')
  }

  console.log('2. 顧客Aが顧客Bの保険を一覧・詳細で閲覧できない')
  {
    const listRes = await authedFetch(cookieA, '/api/policies')
    const listBody = await listRes.json()
    assert(
      listBody.policies.some((p) => p.id === policyIdA),
      '顧客Aの一覧には自分の契約が含まれる',
    )
    assert(
      !listBody.policies.some((p) => p.id === policyIdB),
      '顧客Aの一覧に顧客Bの契約が含まれない',
    )
    const detailRes = await authedFetch(cookieA, `/api/policies/${policyIdB}`)
    assert(detailRes.status === 404, '顧客Aが顧客Bの契約IDを直接指定すると404')
  }

  console.log('3. 顧客Aが顧客Bの契約を更新・削除できない')
  {
    const updateRes = await authedFetch(cookieA, `/api/policies/${policyIdB}`, {
      method: 'PUT',
      body: JSON.stringify({
        insuredPersonName: '改ざん',
        category: 'medical',
        insuranceCompany: '改ざん',
        productName: '改ざん',
        policyNumber: null,
        premiumAmount: 0,
        premiumFrequency: 'monthly',
        coverageSummary: null,
        contractDate: null,
        renewalDate: null,
        status: 'active',
        memo: null,
      }),
    })
    assert(updateRes.status === 404, '顧客Aが顧客Bの契約を更新しようとすると404')

    const deleteRes = await authedFetch(cookieA, `/api/policies/${policyIdB}`, { method: 'DELETE' })
    assert(deleteRes.status === 404, '顧客Aが顧客Bの契約を削除しようとすると404')

    const stillThereRes = await authedFetch(cookieB, `/api/policies/${policyIdB}`)
    assert(stillThereRes.status === 200, '顧客Bの契約は影響を受けず残っている')
  }

  console.log('3.5 担当者の未設定連絡先はnullのまま返る(未設定ボタンを表示しないための前提条件)')
  {
    const putRes = await authedFetch(cookieA, '/api/advisor', {
      method: 'PUT',
      body: JSON.stringify({
        advisorName: 'テスト担当者',
        agencyName: null,
        title: null,
        phone: '0120-000-000',
        email: null,
        officialLineUrl: null,
        contactHours: null,
        isAcceptingInquiries: true,
      }),
    })
    assert(putRes.ok, '担当者情報の一部項目のみの保存は成功する')

    const getRes = await authedFetch(cookieA, '/api/advisor')
    const { advisor } = await getRes.json()
    assert(advisor.phone === '0120-000-000', '設定した電話番号はそのまま返る')
    assert(advisor.email === null, '未設定のメールはnullのまま返る(フロントは非表示にする)')
    assert(advisor.officialLineUrl === null, '未設定の公式LINEはnullのまま返る(フロントは非表示にする)')
  }

  console.log('3.6 契約者の明示的な共有許可・解除と、担当者の閲覧専用権限')
  {
    const advisorUserId = createdUserIds[2]
    const customerUserId = createdUserIds[0]
    const { error: roleError } = await admin.from('users').update({ role: 'advisor' }).eq('id', advisorUserId)
    if (roleError) throw new Error(`advisor role setup failed: ${roleError.message}`)
    const { error: linkError } = await admin.from('users').update({ advisor_id: advisorUserId }).eq('id', customerUserId)
    if (linkError) throw new Error(`advisor link setup failed: ${linkError.message}`)

    const beforeGrant = await authedFetch(cookieAdvisor, `/api/advisor/clients/${customerUserId}/policies`)
    assert(beforeGrant.status === 403, '共有許可前は担当者でも顧客の保険を閲覧できない')

    const grant = await authedFetch(cookieA, '/api/policy-sharing', {
      method: 'PUT',
      body: JSON.stringify({ enabled: true, confirmation: true }),
    })
    assert(grant.ok, '契約者本人は現在の担当者へ全件共有を許可できる')

    const shared = await authedFetch(cookieAdvisor, `/api/advisor/clients/${customerUserId}/policies`)
    const sharedBody = await shared.json()
    assert(shared.ok && sharedBody.policies.some((p) => p.id === policyIdA), '共有後は担当者が顧客の保険を閲覧できる')
    assert(!sharedBody.policies.some((p) => p.id === policyIdB), '共有後も他の顧客の保険は混入しない')

    const advisorUpdate = await authedFetch(cookieAdvisor, `/api/policies/${policyIdA}`, {
      method: 'PUT',
      body: JSON.stringify({
        insuredPersonName: '改ざん',
        category: 'medical',
        insuranceCompany: '改ざん',
        productName: '改ざん',
        premiumAmount: 0,
        premiumFrequency: 'monthly',
        status: 'active',
      }),
    })
    assert(advisorUpdate.status === 404, '共有中でも担当者は顧客の保険を更新できない')

    const revoke = await authedFetch(cookieA, '/api/policy-sharing', {
      method: 'PUT',
      body: JSON.stringify({ enabled: false }),
    })
    assert(revoke.ok, '契約者本人は共有を解除できる')

    const afterRevoke = await authedFetch(cookieAdvisor, `/api/advisor/clients/${customerUserId}/policies`)
    assert(afterRevoke.status === 403, '共有解除後は担当者が直ちに閲覧できなくなる')
  }

  console.log('4. 認証コードは再利用できない')
  {
    const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL_A })
    const code = linkData.properties.email_otp
    const first = await fetch(`${BASE_URL}/api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ email: EMAIL_A, code }),
    })
    assert(first.ok, '1回目の認証コード利用は成功する')
    const second = await fetch(`${BASE_URL}/api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ email: EMAIL_A, code }),
    })
    assert(!second.ok, '同じ認証コードの2回目の利用は失敗する')
  }

  console.log('5. ログアウト後は保護APIへアクセスできない')
  {
    const logoutRes = await authedFetch(cookieA, '/api/auth/logout', { method: 'POST' })
    assert(logoutRes.ok, 'ログアウトAPIは成功する')
    const afterLogout = await authedFetch(cookieA, '/api/policies')
    assert(afterLogout.status === 401, 'ログアウト後は同じCookieでも401になる')
  }

  console.log('6. 認証コードの連続試行・送信が制限される(数秒かかります)')
  {
    let verifyLocked = false
    for (let i = 0; i < 6; i += 1) {
      const res = await fetch(`${BASE_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        body: JSON.stringify({ email: EMAIL_RATE, code: '000000' }),
      })
      if (res.status === 429) verifyLocked = true
    }
    assert(verifyLocked, '誤った認証コードを繰り返すとレート制限(429)がかかる')

    let requestLocked = false
    for (let i = 0; i < 5; i += 1) {
      const res = await fetch(`${BASE_URL}/api/auth/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        body: JSON.stringify({ email: EMAIL_RATE }),
      })
      if (res.status === 429) requestLocked = true
    }
    assert(requestLocked, '認証コードの連続送信要求もレート制限(429)がかかる')
  }

  console.log(
    '\n注記: 認証コードの「有効期限切れ」は、実際の有効期限(通常10分)まで待つ必要があるため本' +
      'スクリプトには含めていない。otp_expiryを一時的に短くしての手動確認では、期限切れコードが' +
      '正しく拒否される(400)ことを確認済み。',
  )

  console.log('\n後片付け: テスト用アカウントを削除しています…')
  for (const id of createdUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }

  console.log(`\n結果: ${passCount} 件成功 / ${failCount} 件失敗`)
  if (failCount > 0) process.exit(1)
}

main().catch((err) => {
  console.error('テスト実行中にエラーが発生しました:', err)
  process.exit(1)
})
