import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  AlertCircle, ArrowRight, BookOpen, CheckCircle2, CircleHelp, Download, FilePlus2, KeyRound,
  LifeBuoy, LineChart, Link2, LockKeyhole, Mail, MessageCircle, Settings, ShieldCheck, UserPlus,
  UserRound, Users, UserRoundCog, type LucideIcon,
} from 'lucide-react'
import { SUPPORT_EMAIL } from '../config/service'

function StepList({ steps }: { steps: Array<{ title: string; text: string }> }) {
  return <ol className="space-y-4">{steps.map((step,index) => <li key={step.title} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">{index + 1}</span><div><p className="text-sm font-bold text-ink">{step.title}</p><p className="mt-1 text-sm leading-6 text-ink-secondary">{step.text}</p></div></li>)}</ol>
}

function ManualSection({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: ReactNode }) {
  return <section id={id} className="scroll-mt-32 rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-8"><p className="text-xs font-bold tracking-widest text-brand-600 uppercase">{eyebrow}</p><h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{title}</h2><div className="mt-7 space-y-8">{children}</div></section>
}

function Topic({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return <div><h3 className="flex items-center gap-2 text-base font-bold text-ink"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon size={16} /></span>{title}</h3><div className="mt-3 pl-0 sm:pl-10">{children}</div></div>
}

const customerSteps = [
  { title: '招待メールを開く', text: '保険代理店または家族から届いたメールの案内ボタンを押します。招待リンクは転送せず、招待された本人が使用してください。' },
  { title: '招待内容を確認する', text: '代理店からの登録招待、担当者変更、家族招待のいずれかが表示されます。共有範囲を確認してから承認します。' },
  { title: '初期設定を完了する', text: '表示名、管理したい対象、利用規約・プライバシーポリシーへの同意を設定します。' },
  { title: '保険を登録する', text: '「保険を登録」から被保険者、保険分野、保険会社、商品名、保険料、契約期間などを入力します。' },
  { title: 'ホームで全体を確認する', text: '家族ごとの月額換算保険料、保障分野、更新・満期、保険期間タイムラインを確認します。' },
]

const advisorSteps = [
  { title: '担当者招待メールからログイン', text: '運営者から届いた招待を開き、招待されたメールアドレスへ6桁の認証コードを送ってログインします。' },
  { title: '担当者情報を設定', text: '担当者名、所属代理店、肩書き、公開する連絡先、公式LINE URL、相談受付状況を設定します。未入力項目は契約者に表示されません。' },
  { title: '顧客を招待', text: '担当者ダッシュボードの「顧客を招待する」にメールアドレスを入力します。相手がメールから承認するまで担当設定は確定しません。' },
  { title: '顧客の利用状況を確認', text: '顧客一覧で初期設定、LINE連携、保険共有の状態を確認します。共有されていない保険は閲覧できません。' },
  { title: '相談と面談を管理', text: '相談内容と希望日時を確認し、日時確定・変更・完了・取消を行います。必要に応じてLINE通知の失敗も確認します。' },
]

export default function Manual() {
  return (
    <div className="bg-plane">
      <section className="border-b border-line bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white"><BookOpen size={23} /></span>
          <p className="mt-6 text-xs font-bold tracking-widest text-brand-600 uppercase">User Guide</p>
          <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">わが家の保険 使い方マニュアル</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-secondary sm:text-base">初めて使う契約者、顧客を支援する代理店・FP、担当者アカウントを管理する運営者向けの手順をまとめています。</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[{href:'#customer',icon:UserRound,label:'契約者向け',text:'登録・家族・LINE・相談'},{href:'#advisor',icon:Users,label:'代理店・FP向け',text:'顧客招待・共有・対応'},{href:'#operator',icon:UserRoundCog,label:'運営者向け',text:'担当者アカウント管理'}].map(({href,icon:Icon,label,text}) => <a key={href} href={href} className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-white p-4 hover:border-brand-300 hover:bg-brand-50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon size={19} /></span><span className="min-w-0"><strong className="block break-words text-sm text-ink">{label}</strong><span className="break-words text-xs text-ink-muted">{text}</span></span><ArrowRight size={14} className="ml-auto shrink-0 text-brand-600" /></a>)}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3"><AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-700" /><div><h2 className="text-sm font-bold text-amber-900">登録しない情報</h2><p className="mt-1 text-xs leading-6 text-amber-800">保険証券画像、病歴・診療情報、口座・クレジットカード情報、マイナンバーなどは登録しないでください。添付機能は書類名のメモで、ファイル本体は保存しません。</p></div></div>
        </section>

        <ManualSection id="customer" eyebrow="Customer" title="契約者向けマニュアル">
          <Topic icon={Mail} title="利用開始まで"><StepList steps={customerSteps} /></Topic>

          <Topic icon={FilePlus2} title="保険の登録・編集">
            <div className="space-y-3 text-sm leading-7 text-ink-secondary">
              <p>サイドメニューまたは画面下の「登録」を押し、入力画面を進めます。必須項目は被保険者、保険分野、保険会社、商品名、保険料、通貨、支払頻度、契約状態です。</p>
              <ul className="list-disc space-y-1 pl-5"><li>ドル建て保険は通貨を「USD」にし、保険証券に記載されたドル金額を入力します。</li><li>更新日は更新型の契約で、実際に更新予定がある場合だけ入力します。</li><li>子どもなど家族の保険は、被保険者名を家族ごとに統一すると集計しやすくなります。</li><li>登録後は詳細画面から編集・削除できます。削除した契約は一覧に表示されません。</li></ul>
            </div>
          </Topic>

          <Topic icon={LineChart} title="ホーム・保険一覧の見方">
            <div className="grid gap-3 sm:grid-cols-2">
              {[['毎月の保険料','月払はそのまま、年払は12分の1、一時払は月額集計から除外して表示します。ドル建ては表示中の為替レートで円換算します。'],['保障分野','医療・死亡・がん・年金・火災など、登録済みの分野を家族全体または被保険者ごとに確認できます。'],['保険期間','契約開始から更新・満期までを表示します。終身保険は保障継続中として表示します。'],['並び替え・絞り込み','保険一覧で対象者、分野、会社、状態を絞り込み、更新日・契約日・保険料・商品名で並べ替えられます。']].map(([title,text]) => <div key={title} className="rounded-xl bg-plane p-4"><p className="text-sm font-bold text-ink">{title}</p><p className="mt-1 text-xs leading-6 text-ink-secondary">{text}</p></div>)}
            </div>
          </Topic>

          <Topic icon={Users} title="家族を招待・連携する">
            <StepList steps={[
              { title: '設定から「家族を招待・連携」を開く', text: '家族連携画面で、招待する家族本人のメールアドレスを入力します。' },
              { title: '相互共有の内容を確認して送信', text: '相手が承認すると、現在と今後登録する保険概要をお互いに読み取り専用で確認できます。' },
              { title: '家族がメールから承認', text: '新規利用者は初期設定、既存利用者は必要に応じて再同意を完了します。' },
              { title: '家族連携画面で確認', text: '家族別の保険概要と月額換算合計を確認できます。どちらからでも連携解除できます。' },
            ]} />
            <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-xs leading-6 text-brand-900"><strong>家族へ表示されない情報：</strong>証券番号、契約者名、受取人、自由記述の保障内容、特約、解約返戻金メモ、担当者名・連絡先、添付情報、利用者メモ。家族は編集・削除できません。</div>
          </Topic>

          <Topic icon={ShieldCheck} title="担当代理店への保険共有">
            <div className="space-y-3 text-sm leading-7 text-ink-secondary"><p>代理店から招待され担当者と紐づいても、保険情報の共有は自動で始まりません。設定画面の「保険情報の共有」で内容を確認し、本人が許可した場合だけ担当者が閲覧できます。</p><p>代理店共有は登録情報全体が対象です。不要になったら同じ画面から解除できます。家族連携とは独立しているため、一方の設定はもう一方へ影響しません。</p></div>
          </Topic>

          <Topic icon={Link2} title="LINE連携とリマインド">
            <StepList steps={[
              { title: '先にメールでログイン', text: '初回利用は、招待されたメールアドレスでログインと初期設定を完了します。' },
              { title: '設定からLINE連携', text: '「公式LINEを追加して連携する」を押し、本人のLINEアカウントで許可して公式LINEを友だち追加します。友だち追加済みの場合だけ連携が完了します。' },
              { title: '必要な通知だけON', text: '更新・満期30日前、確定相談前日のリマインドを個別に選べます。初期状態はOFFです。' },
              { title: '公式LINEから開く', text: '連携後はリッチメニューの「保険を確認」から本人確認してアプリを開けます。連携はいつでも解除できます。' },
            ]} />
          </Topic>

          <Topic icon={MessageCircle} title="担当者へ相談・日時調整">
            <p className="text-sm leading-7 text-ink-secondary">「見える化・相談」で保険の状況を確認し、相談テーマと希望日時を送信します。担当者が日時を確定すると画面へ反映され、LINE通知をONにしている場合はLINEにも届きます。確定後はカレンダー用ファイルを開けます。</p>
          </Topic>

          <Topic icon={Download} title="データ保存・退会">
            <div className="space-y-3 text-sm leading-7 text-ink-secondary"><p>設定画面から登録中の保険情報をCSVで端末へ保存できます。証券番号やメモを含むため、保存後のファイルは安全に管理してください。</p><p>退会すると認証アカウントと登録データが削除され、元に戻せません。必要なCSVを先に保存してから操作してください。</p></div>
          </Topic>
        </ManualSection>

        <ManualSection id="advisor" eyebrow="Advisor / FP" title="代理店・FP向けマニュアル">
          <Topic icon={KeyRound} title="利用開始と基本設定"><StepList steps={advisorSteps} /></Topic>

          <Topic icon={UserPlus} title="顧客招待の注意点">
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-ink-secondary"><li>新規顧客には登録用の招待メール、既存顧客には担当変更または登録確認のメールが届きます。</li><li>担当変更は契約者本人が承認するまで実行されません。承認後、旧担当者への共有と未完了相談は解除・取消されます。</li><li>承認待ちの招待は期限と種類を確認でき、不要な招待は取り消せます。</li><li>招待メールが届かない場合は、メールアドレス、迷惑メール、受信拒否、時間を空けた再送を確認します。</li></ul>
          </Topic>

          <Topic icon={LockKeyhole} title="顧客情報の閲覧範囲">
            <div className="rounded-xl border border-line bg-plane p-4 text-sm leading-7 text-ink-secondary"><p>顧客一覧では、自分が担当する顧客の氏名・メール・利用開始・LINE連携・共有状態だけを確認できます。保険情報は顧客が「全保険情報の共有」を許可した場合だけ閲覧でき、編集・削除は常にできません。共有解除後は直ちに閲覧できなくなります。</p></div>
          </Topic>

          <Topic icon={MessageCircle} title="相談・面談・LINE通知">
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-ink-secondary"><li>顧客の希望日時を確認し、候補の確定・変更・取消・相談完了を行います。</li><li>公式LINEを友だち追加して担当者LINEを連携すると、新規相談などの通知を受け取れます。友だち追加済みの場合だけ連携が完了します。</li><li>顧客へのLINE通知が未連携・送信失敗の場合、要確認一覧から状態を確認し、必要に応じて再送します。</li><li>通知だけに頼らず、ダッシュボードの未対応件数と相談一覧も確認してください。</li></ul>
          </Topic>

          <Topic icon={Settings} title="取扱商品の登録">
            <p className="text-sm leading-7 text-ink-secondary">「取扱商品」から保険分野、保険会社、商品名、概要、公式URL、公開状態を設定します。下書きは顧客向け商品ページに表示されません。内容とリンクを確認してから公開してください。</p>
          </Topic>
        </ManualSection>

        <ManualSection id="operator" eyebrow="Operator" title="運営者向けマニュアル">
          <Topic icon={UserRoundCog} title="担当者アカウントを管理する">
            <StepList steps={[
              { title: '運営者アカウントでログイン', text: '運営権限を持つ担当者だけが「担当者管理」を開けます。' },
              { title: '担当者をメール招待', text: '本人のメールアドレスを入力します。顧客として登録済みのメールは担当者に変更できません。' },
              { title: '本人が初期設定', text: '担当者は招待メールからログインし、表示名・規約同意・担当者プロフィールを設定します。' },
              { title: '利用停止・再開', text: '退職・一時停止時は担当者管理から利用停止できます。運営者自身と運営権限を持つ担当者は停止できません。' },
            ]} />
          </Topic>
          <Topic icon={ShieldCheck} title="運用上の注意">
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-ink-secondary"><li>担当者の運営権限付与は画面から行わず、必要性を確認して管理してください。</li><li>利用停止前に担当顧客・未完了相談・連絡方法を確認し、引き継ぎを行ってください。</li><li>Supabase、Vercel、LINE、メール配信サービスの秘密鍵をメールやチャットで共有しないでください。</li><li>障害時はVercelログ、Supabase状態、メール配送、LINE通知失敗一覧を順に確認します。</li></ul>
          </Topic>
        </ManualSection>

        <ManualSection id="faq" eyebrow="Help" title="よくある質問">
          <div className="divide-y divide-line rounded-2xl border border-line px-4 sm:px-6">
            {[
              ['招待メールが届きません','メールアドレスの入力、迷惑メール、受信拒否を確認してください。連続送信には制限があるため、30秒以上待って再送します。'],
              ['招待メールなのに6桁コードが表示されます','招待メールの案内ボタンから登録を開始します。通常ログイン時だけ、メール本文の6桁コードをログイン画面へ入力します。'],
              ['家族や担当者の保険が見えません','家族は招待先の承認、担当者は顧客本人の全件共有許可が必要です。別のアカウントでログインしていないかも確認してください。'],
              ['LINEからアプリを開けません','先に招待メールで利用開始し、設定画面で本人のLINEを連携してください。連携していないLINEからはログインできません。'],
              ['為替レートが更新されていません','為替提供元の最新営業日レートを毎日取得します。休日は前営業日のレートが表示されることがあります。'],
              ['正式な契約内容と違って見えます','アプリは入力内容を整理して表示するものです。正式な内容は保険証券・約款・保険会社または担当代理店へ確認してください。'],
            ].map(([question,answer]) => <div key={question} className="py-5"><p className="flex items-start gap-2 text-sm font-bold text-ink"><CircleHelp size={16} className="mt-0.5 shrink-0 text-brand-700" />{question}</p><p className="mt-2 pl-6 text-sm leading-6 text-ink-secondary">{answer}</p></div>)}
          </div>
        </ManualSection>

        <section className="rounded-3xl bg-brand-900 p-6 text-white sm:p-8">
          <LifeBuoy size={22} className="text-brand-200" /><h2 className="mt-4 text-xl font-bold">解決しないとき</h2><p className="mt-2 text-sm leading-7 text-brand-100">担当代理店または運営窓口へ、利用している画面・発生した時刻・表示されたメッセージをお知らせください。認証コード、保険証券、病歴、口座情報は送らないでください。</p>
          <div className="mt-5 flex flex-wrap gap-3">{SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand-800"><Mail size={15} />メールで問い合わせ</a>}<Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10">ログイン画面へ<ArrowRight size={15} /></Link></div>
        </section>

        <p className="flex items-center justify-center gap-2 text-center text-xs text-ink-muted"><CheckCircle2 size={14} />このマニュアルは2026年8月29日時点の画面と機能に基づいています。</p>
      </div>
    </div>
  )
}
