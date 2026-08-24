import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../_lib/http.js'
import { requireAdvisorSession } from '../_lib/session.js'
import { createSupabaseServerClient } from '../_lib/supabaseServer.js'
import { writeAuditLog } from '../_lib/audit.js'

const categorySchema = z.enum(['life', 'medical', 'pension', 'auto', 'home', 'accident', 'business'])
const productFields = {
  category: categorySchema,
  insurerName: z.string().trim().min(1, '保険会社名を入力してください。').max(100),
  productName: z.string().trim().min(1, '商品名を入力してください。').max(150),
  summary: z.string().trim().max(500),
  officialUrl: z.union([z.literal(''), z.string().trim().url().max(500).refine((url) => url.startsWith('https://'), 'URLはhttps://で入力してください。')]),
  isPublished: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
}
const createSchema = z.object(productFields).strict()
const updateSchema = z.object({ id: z.string().uuid(), ...productFields }).strict()
const deleteSchema = z.object({ id: z.string().uuid() }).strict()

const columns = 'id, category, insurer_name, product_name, summary, official_url, is_published, sort_order, created_at, updated_at'

function toResponse(row: Record<string, unknown>) {
  return {
    id: row.id,
    category: row.category,
    insurerName: row.insurer_name,
    productName: row.product_name,
    summary: row.summary,
    officialUrl: row.official_url,
    isPublished: row.is_published,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(input: z.infer<typeof createSchema>) {
  return {
    category: input.category,
    insurer_name: input.insurerName,
    product_name: input.productName,
    summary: input.summary,
    official_url: input.officialUrl || null,
    is_published: input.isPublished,
    sort_order: input.sortOrder,
  }
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET' && req.query.manage !== '1') {
    const supabase = createSupabaseServerClient(req, res)
    const { data, error } = await supabase
      .from('insurance_products')
      .select(columns)
      .eq('is_published', true)
      .order('sort_order')
      .order('created_at')
    if (error) throw new HttpError(500, '取扱商品を読み込めませんでした。')
    sendJson(res, 200, { products: (data ?? []).map(toResponse) })
    return
  }

  const session = await requireAdvisorSession(req, res)

  if (req.method === 'GET') {
    const { data, error } = await session.supabase
      .from('insurance_products')
      .select(columns)
      .eq('advisor_user_id', session.userId)
      .order('sort_order')
      .order('created_at')
    if (error) throw new HttpError(500, '取扱商品を読み込めませんでした。')
    sendJson(res, 200, { products: (data ?? []).map(toResponse) })
    return
  }

  if (req.method === 'POST') {
    assertTrustedOrigin(req)
    const input = createSchema.parse(await readJsonBody(req))
    const { data, error } = await session.supabase
      .from('insurance_products')
      .insert({ advisor_user_id: session.userId, ...toRow(input) })
      .select(columns)
      .single()
    if (error) throw new HttpError(500, '取扱商品を登録できませんでした。')
    await writeAuditLog(session.supabase, session.userId, 'product_create', 'insurance_product', String(data.id))
    sendJson(res, 201, { product: toResponse(data) })
    return
  }

  if (req.method === 'PUT') {
    assertTrustedOrigin(req)
    const input = updateSchema.parse(await readJsonBody(req))
    const { data, error } = await session.supabase
      .from('insurance_products')
      .update(toRow(input))
      .eq('id', input.id)
      .eq('advisor_user_id', session.userId)
      .select(columns)
      .maybeSingle()
    if (error) throw new HttpError(500, '取扱商品を更新できませんでした。')
    if (!data) throw new HttpError(404, '取扱商品が見つかりません。')
    await writeAuditLog(session.supabase, session.userId, 'product_update', 'insurance_product', input.id)
    sendJson(res, 200, { product: toResponse(data) })
    return
  }

  if (req.method === 'DELETE') {
    assertTrustedOrigin(req)
    const input = deleteSchema.parse(await readJsonBody(req))
    const { data: product, error: lookupError } = await session.supabase
      .from('insurance_products')
      .select('id, is_published')
      .eq('id', input.id)
      .eq('advisor_user_id', session.userId)
      .maybeSingle()
    if (lookupError) throw new HttpError(500, '取扱商品を確認できませんでした。')
    if (!product) throw new HttpError(404, '取扱商品が見つかりません。')
    if (product.is_published) throw new HttpError(409, '公開中の商品は削除できません。先に非公開へ変更してください。')
    const { error } = await session.supabase.from('insurance_products').delete().eq('id', input.id).eq('advisor_user_id', session.userId)
    if (error) throw new HttpError(500, '取扱商品を削除できませんでした。')
    await writeAuditLog(session.supabase, session.userId, 'product_delete', 'insurance_product', input.id)
    sendJson(res, 200, { ok: true })
    return
  }

  methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE'])
}

export default withErrorHandling(handler)
