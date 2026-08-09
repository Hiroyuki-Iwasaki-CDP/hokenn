// サーバー専用の環境変数アクセサ。
// これらの値はVercelの環境変数にのみ設定し、コード・Gitには一切含めない。
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined
}
