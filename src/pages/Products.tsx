import { useEffect, useState } from 'react'
import { BriefcaseBusiness, Car, HeartPulse, Home, Landmark, MessageCircle, Shield, Umbrella } from 'lucide-react'
import { OPERATOR_NAME } from '../config/service'
import { api } from '../lib/api'
import type { InsuranceProduct, ProductCategory } from '../types/insurance'

const OFFICIAL_LINE_URL = 'https://line.me/R/ti/p/@615aecnm'

const categories = [
  {
    key: 'pension' as const,
    title: '年金保険',
    description: '老後資金の準備や受取方法など、将来に向けた備えを確認します。',
    icon: Landmark,
  },
  {
    key: 'life' as const,
    title: '生命保険',
    description: '万一のときの死亡保障や、将来に向けた保障について相談できます。',
    icon: Shield,
  },
  {
    key: 'medical' as const,
    title: '医療・がん保険',
    description: '入院・手術・がん治療など、病気やけがへの備えを確認します。',
    icon: HeartPulse,
  },
  {
    key: 'auto' as const,
    title: '自動車保険',
    description: '自動車事故、相手方への賠償、ご自身や同乗者への補償を確認します。',
    icon: Car,
  },
  {
    key: 'home' as const,
    title: '火災・地震保険',
    description: '建物や家財の火災・自然災害・地震への備えを確認します。',
    icon: Home,
  },
  {
    key: 'accident' as const,
    title: '傷害・その他の保険',
    description: '日常生活のけがや賠償責任など、目的に応じた備えを相談できます。',
    icon: Umbrella,
  },
  {
    key: 'business' as const,
    title: '法人向け保険',
    description: '事業活動のリスクや従業員の保障について担当者が確認します。',
    icon: BriefcaseBusiness,
  },
]

const categoryByKey = new Map<ProductCategory, (typeof categories)[number]>(
  categories.map((category) => [category.key, category]),
)

export default function Products() {
  const [products, setProducts] = useState<InsuranceProduct[]>([])
  const previewId = new URLSearchParams(window.location.search).get('preview')

  useEffect(() => {
    api.get<{ products: InsuranceProduct[] }>(previewId ? '/api/products?manage=1' : '/api/products')
      .then((data) => setProducts(previewId ? data.products.filter((product) => product.id === previewId) : data.products))
      .catch(() => setProducts([]))
  }, [previewId])

  return (
    <article className="space-y-7">
      <div className="rounded-3xl bg-brand-800 px-5 py-8 text-white shadow-sm sm:px-8 sm:py-10">
        <p className="text-xs font-bold tracking-[0.18em] text-brand-100">INSURANCE GUIDE</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">保険商品を探す</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-brand-50">
          気になる分野を確認して、詳しい取扱商品や保険会社について担当者へご相談ください。
        </p>
      </div>

      {previewId && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">担当者限定プレビューです。下書きの商品は一般公開されていません。</p>}

      {products.length > 0 && (
        <section className="space-y-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-brand-700">AVAILABLE PRODUCTS</p>
            <h2 className="mt-1 text-xl font-bold text-ink">現在の取扱商品</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((product) => {
              const category = categoryByKey.get(product.category)
              const Icon = category?.icon ?? Shield
              return (
                <article key={product.id} className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Icon size={20} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-brand-700">{category?.title}</p>
                      <h3 className="mt-0.5 font-bold text-ink">{product.productName}</h3>
                      <p className="mt-0.5 text-xs text-ink-muted">{product.insurerName}</p>
                    </div>
                  </div>
                  {product.summary && <p className="mt-3 text-xs leading-6 text-ink-secondary">{product.summary}</p>}
                  {product.officialUrl && (
                    <a href={product.officialUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-bold text-brand-700 hover:underline">
                      保険会社の公式ページで確認
                    </a>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map(({ title, description, icon: Icon }) => (
          <section key={title} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon size={20} strokeWidth={2.2} />
            </span>
            <h2 className="mt-4 text-base font-bold text-ink">{title}</h2>
            <p className="mt-2 text-xs leading-6 text-ink-secondary">{description}</p>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:p-6">
        <h2 className="text-base font-bold text-brand-900">取扱商品を担当者に確認する</h2>
        <p className="mt-2 text-xs leading-6 text-brand-800">
          実際に取り扱う保険会社・商品・加入条件は、{OPERATOR_NAME}の担当者が個別にご案内します。
        </p>
        <a
          href={OFFICIAL_LINE_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#06C755] px-4 py-3 text-sm font-bold text-white hover:bg-[#05b64d]"
        >
          <MessageCircle size={18} />
          公式LINEで相談する
        </a>
      </section>

      <p className="text-[11px] leading-6 text-ink-muted">
        このページは保険分野の一般的な案内です。特定商品の推奨、保障内容または保険料を表示するものではありません。ご契約前に、担当者から交付される商品パンフレット、契約概要および注意喚起情報等をご確認ください。
      </p>
    </article>
  )
}
