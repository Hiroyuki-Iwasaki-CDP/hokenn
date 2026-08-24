import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, Eye, PackagePlus, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import type { InsuranceProduct, ProductCategory } from '../types/insurance'

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  life: '生命保険',
  medical: '医療・がん保険',
  pension: '年金保険',
  auto: '自動車保険',
  home: '火災・地震保険',
  accident: '傷害・その他の保険',
  business: '法人向け保険',
}

interface ProductDraft {
  category: ProductCategory
  insurerName: string
  productName: string
  summary: string
  officialUrl: string
  isPublished: boolean
  sortOrder: number
}

const EMPTY_DRAFT: ProductDraft = {
  category: 'life', insurerName: '', productName: '', summary: '', officialUrl: '', isPublished: false, sortOrder: 0,
}

export default function AdvisorProducts() {
  const [products, setProducts] = useState<InsuranceProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api.get<{ products: InsuranceProduct[] }>('/api/products?manage=1')
      .then((data) => setProducts(data.products))
      .catch((err) => setError(err instanceof ApiError ? err.message : '取扱商品を読み込めませんでした。'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const reset = () => {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setMessage(null)
    setError(null)
  }

  const startEdit = (product: InsuranceProduct) => {
    setEditingId(product.id)
    setDraft({
      category: product.category,
      insurerName: product.insurerName,
      productName: product.productName,
      summary: product.summary,
      officialUrl: product.officialUrl ?? '',
      isPublished: product.isPublished,
      sortOrder: product.sortOrder,
    })
    setMessage(null)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      if (editingId) {
        await api.put('/api/products', { id: editingId, ...draft })
        setMessage('取扱商品を更新しました。')
      } else {
        await api.post('/api/products', draft)
        setMessage('取扱商品を登録しました。')
      }
      setEditingId(null)
      setDraft(EMPTY_DRAFT)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '取扱商品を保存できませんでした。')
    } finally {
      setSaving(false)
    }
  }

  const removeDraft = async (product: InsuranceProduct) => {
    if (saving || product.isPublished || !window.confirm(`下書き「${product.productName}」を削除しますか？`)) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await api.del('/api/products', { id: product.id })
      setMessage('下書きを削除しました。')
      if (editingId === product.id) reset()
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '下書きを削除できませんでした。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Products</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">取扱商品管理</h1>
        <p className="mt-1 text-sm text-ink-secondary">公開した商品だけが、公式LINEの「取扱商品」に表示されます。</p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><PackagePlus size={16} />{editingId ? '商品を編集' : '商品を登録'}</h2>
          {editingId && <button type="button" onClick={reset} className="flex items-center gap-1 text-xs font-bold text-ink-muted hover:text-ink"><RotateCcw size={13} />新規登録に戻る</button>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-ink">保険分野</span><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ProductCategory })} className="w-full rounded-xl border border-line bg-plane px-3.5 py-2.5 text-sm text-ink">{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-ink">表示順</span><input type="number" min={0} max={9999} value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} className="w-full rounded-xl border border-line bg-plane px-3.5 py-2.5 text-sm text-ink" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-ink">保険会社名</span><input required maxLength={100} value={draft.insurerName} onChange={(e) => setDraft({ ...draft, insurerName: e.target.value })} placeholder="例：〇〇生命" className="w-full rounded-xl border border-line bg-plane px-3.5 py-2.5 text-sm text-ink" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-ink">商品名</span><input required maxLength={150} value={draft.productName} onChange={(e) => setDraft({ ...draft, productName: e.target.value })} placeholder="正式な商品名" className="w-full rounded-xl border border-line bg-plane px-3.5 py-2.5 text-sm text-ink" /></label>
        </div>
        <label className="block"><span className="mb-1.5 block text-sm font-semibold text-ink">短い説明</span><textarea maxLength={500} rows={3} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="保障分野や商品の特徴を事実に基づいて簡潔に入力" className="w-full rounded-xl border border-line bg-plane px-3.5 py-2.5 text-sm text-ink" /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-semibold text-ink">保険会社の公式商品URL（任意）</span><input type="url" value={draft.officialUrl} onChange={(e) => setDraft({ ...draft, officialUrl: e.target.value })} placeholder="https://..." className="w-full rounded-xl border border-line bg-plane px-3.5 py-2.5 text-sm text-ink" /></label>
        <label className="flex items-start gap-2.5 rounded-xl bg-plane px-4 py-3 text-sm text-ink-secondary"><input type="checkbox" checked={draft.isPublished} onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })} className="mt-0.5 h-4 w-4 rounded border-line text-brand-700" /><span><strong className="block text-ink">公式LINEの商品ページに公開する</strong><span className="text-xs">内容確認前はチェックを外したまま下書き保存できます。</span></span></label>
        {message && <p className="text-xs font-semibold text-brand-700">{message}</p>}
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        <button type="submit" disabled={saving || !draft.insurerName.trim() || !draft.productName.trim()} className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-50">{saving ? '保存しています…' : editingId ? '変更を保存' : '商品を登録'}</button>
      </form>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="mb-3 text-sm font-bold text-ink">登録済み商品</h2>
        {loading ? <p className="text-sm text-ink-muted">読み込み中…</p> : products.length === 0 ? <p className="text-sm text-ink-muted">まだ商品は登録されていません。</p> : (
          <ul className="divide-y divide-line">{products.map((product) => <li key={product.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-ink">{product.productName}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${product.isPublished ? 'bg-brand-50 text-brand-700' : 'bg-plane text-ink-muted'}`}>{product.isPublished ? '公開中' : '下書き'}</span></div><p className="text-xs text-ink-secondary">{product.insurerName}・{CATEGORY_LABELS[product.category]}</p></div><div className="flex shrink-0 flex-wrap gap-2"><a href={`/products?preview=${encodeURIComponent(product.id)}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink-secondary hover:bg-plane"><Eye size={13} />プレビュー</a><button type="button" onClick={() => startEdit(product)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink-secondary hover:bg-plane"><Pencil size={13} />編集</button>{!product.isPublished && <button type="button" disabled={saving} onClick={() => removeDraft(product)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={13} />削除</button>}</div></li>)}</ul>
        )}
        {products.some((product) => product.isPublished) && <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-brand-700"><CheckCircle2 size={14} />公開ページへ反映されています。</p>}
      </section>
    </div>
  )
}
