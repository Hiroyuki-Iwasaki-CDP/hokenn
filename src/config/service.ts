export const SERVICE_NAME = 'わが家の保険'
export const LEGAL_VERSION = '2026-08-29'

export const OPERATOR_NAME =
  import.meta.env.VITE_OPERATOR_NAME?.trim() || `${SERVICE_NAME} 運営事務局`

export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL?.trim() || ''
