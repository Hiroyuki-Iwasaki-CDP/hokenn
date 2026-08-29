import { Link } from 'react-router-dom'
import {
  ArrowRight, BookOpen, CalendarClock, Check, CircleDollarSign, Eye, LineChart,
  ListChecks, LockKeyhole, MessageCircle, ShieldCheck, UserRoundCheck, Users, UsersRound,
} from 'lucide-react'

const features = [
  { icon: ListChecks, title: '保険をまとめて整理', text: '保険会社・商品・保険料・保障額・契約期間を、契約ごとに見やすく管理します。' },
  { icon: UsersRound, title: '家族ごとに見える化', text: '被保険者ごとの件数・保険料・保障分野を確認。家族同士の招待連携にも対応します。' },
  { icon: CircleDollarSign, title: 'ドル建ても円換算', text: 'ドルで登録した保険料を毎日更新する為替レートで円換算し、レートも一緒に表示します。' },
  { icon: CalendarClock, title: '更新・満期を確認', text: '保険期間をタイムラインで把握し、希望者には更新・満期前のLINEリマインドを届けます。' },
  { icon: UserRoundCheck, title: '担当者へ相談', text: '担当FPの連絡先、相談内容の見える化、面談日時の調整をアプリ内から進められます。' },
  { icon: ShieldCheck, title: '本人が共有を決める', text: '代理店への保険共有は初期状態でOFF。本人が許可した場合だけ閲覧専用で共有します。' },
]

const roles = [
  { eyebrow: '契約者', title: '自分と家族の備えを把握', text: '複数の保険を一か所にまとめ、いくら支払い、何に備えているかを確認できます。', icon: Eye },
  { eyebrow: '保険代理店・FP', title: '同意を得た顧客を支援', text: '担当顧客の状況や相談予定を確認し、必要な連絡とフォローを一つの画面で管理します。', icon: Users },
  { eyebrow: '家族', title: '必要な概要だけを相互共有', text: '双方の承認後、保険概要を読み取り専用で確認。証券番号・受取人・メモ等は共有しません。', icon: LockKeyhole },
]

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-5 rounded-[2.5rem] bg-brand-200/35 blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl shadow-brand-900/15">
        <img
          src="/images/hero-family.jpg"
          alt="家族でタブレットを見ながら保険を確認している様子"
          width="1600"
          height="800"
          fetchPriority="high"
          decoding="async"
          className="aspect-[4/3] w-full object-cover object-center sm:aspect-[5/4]"
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-brand-950/70 to-transparent" />
        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 sm:inset-x-5 sm:bottom-5">
          <div className="rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
            <p className="text-[10px] font-bold tracking-widest text-brand-600 uppercase">Family Insurance</p>
            <p className="mt-1 text-sm font-bold text-ink sm:text-base">家族の備えを一緒に確認</p>
          </div>
          <span className="mb-1 shrink-0 rounded-full border border-white/40 bg-brand-800/85 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur">本人が共有を管理</span>
        </div>
      </div>
      <div className="absolute -right-2 -top-3 flex items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-[10px] font-bold text-brand-800 shadow-lg sm:-right-4 sm:top-5"><ShieldCheck size={14} />招待制で安心</div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div>
      <section className="overflow-hidden bg-gradient-to-b from-brand-50 via-paper to-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-700"><ShieldCheck size={14} />招待制の保険管理サービス</p>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">家族の保険を、<br /><span className="text-brand-700">わかる形に。</span></h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-ink-secondary sm:text-lg">「わが家の保険」は、契約者が保険を整理し、家族の備えを見渡し、信頼する担当代理店へ相談するためのアプリです。</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/demo" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-700/15 hover:bg-brand-800">画面を体験する<ArrowRight size={16} /></Link>
              <Link to="/manual" className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-bold text-ink hover:bg-plane"><BookOpen size={16} />使い方を見る</Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">ご利用には保険代理店または家族からの招待が必要です。セルフ登録は受け付けていません。</p>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 text-xs font-semibold text-ink-secondary sm:grid-cols-3 sm:px-6">
          {['登録情報は利用者ごとに分離','代理店共有は本人が許可','家族共有は双方の承認後'].map((text) => <div key={text} className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Check size={13} /></span>{text}</div>)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl"><p className="text-xs font-bold tracking-widest text-brand-600 uppercase">For everyone</p><h2 className="mt-2 text-3xl font-bold text-ink">契約者・家族・担当者を、適切な権限でつなぐ</h2></div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">{roles.map(({ eyebrow,title,text,icon:Icon }) => <article key={eyebrow} className="rounded-2xl border border-line bg-white p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon size={21} /></span><p className="mt-5 text-xs font-bold text-brand-600">{eyebrow}</p><h3 className="mt-1 text-lg font-bold text-ink">{title}</h3><p className="mt-3 text-sm leading-7 text-ink-secondary">{text}</p></article>)}</div>
      </section>

      <section className="bg-plane">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="text-center"><p className="text-xs font-bold tracking-widest text-brand-600 uppercase">Features</p><h2 className="mt-2 text-3xl font-bold text-ink">保険管理に必要な機能を、一つに</h2></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(({ icon:Icon,title,text }) => <article key={title} className="rounded-2xl bg-white p-5 shadow-sm"><Icon size={20} className="text-brand-700" /><h3 className="mt-4 font-bold text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-secondary">{text}</p></article>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div><p className="text-xs font-bold tracking-widest text-brand-600 uppercase">How it works</p><h2 className="mt-2 text-3xl font-bold text-ink">招待から相談まで、迷わない流れ</h2><div className="mt-8 space-y-5">{[['01','メールの招待から本人確認'],['02','契約者が保険情報を登録'],['03','家族・保障分野・期間を確認'],['04','必要なときだけ担当者へ相談']].map(([number,text]) => <div key={number} className="flex items-center gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-xs font-bold text-white">{number}</span><p className="font-bold text-ink">{text}</p></div>)}</div></div>
          <div className="rounded-3xl bg-brand-900 p-6 text-white sm:p-8"><LockKeyhole size={26} className="text-brand-200" /><h3 className="mt-5 text-2xl font-bold">必要な人に、必要な範囲だけ</h3><ul className="mt-6 space-y-4 text-sm leading-6 text-brand-100">{['担当代理店は本人の許可がある場合だけ保険情報を閲覧','家族は双方の承認後に概要のみ閲覧し、編集・削除は不可','証券画像・病歴・口座情報などは登録対象外','LINEの認証トークンは保存せず、連携はいつでも解除可能'].map((text) => <li key={text} className="flex gap-2"><Check size={16} className="mt-1 shrink-0 text-brand-300" />{text}</li>)}</ul><Link to="/privacy" className="mt-7 inline-flex items-center gap-1 text-xs font-bold text-white underline decoration-brand-300 underline-offset-4">プライバシーポリシーを確認<ArrowRight size={13} /></Link></div>
        </div>
      </section>

      <section className="bg-brand-50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20"><LineChart size={28} className="mx-auto text-brand-700" /><h2 className="mt-4 text-3xl font-bold text-ink">まずはデモで、見える化を体験</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-ink-secondary">架空の保険データで、家族ごとの保険料、保障分野、保険期間タイムラインを確認できます。実データの登録やログインは不要です。</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/demo" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white hover:bg-brand-800">デモを見る<ArrowRight size={16} /></Link><Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-5 py-3 text-sm font-bold text-brand-800 hover:bg-brand-100"><MessageCircle size={16} />招待済みの方はログイン</Link></div></div>
      </section>
    </div>
  )
}
