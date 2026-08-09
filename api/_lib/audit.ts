import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 最小限の操作ログを記録する(ベストエフォート。失敗しても本来の操作は継続する)。
 * 認証コード・セッショントークン・証券番号全文・健康情報などの機密情報は絶対に記録しない。
 */
export async function writeAuditLog(
  supabase: SupabaseClient,
  ownerUserId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    owner_user_id: ownerUserId,
    action,
    resource_type: resourceType,
    resource_id: resourceId ?? null,
  })
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[audit] failed to write audit log', { action, resourceType })
  }
}
