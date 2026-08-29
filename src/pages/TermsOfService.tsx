import LegalContact from '../components/legal/LegalContact'
import LegalSection from '../components/legal/LegalSection'
import { LEGAL_VERSION, SERVICE_NAME } from '../config/service'

export default function TermsOfService() {
  return (
    <article className="space-y-8 rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-8">
      <header>
        <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Terms of Service</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">利用規約</h1>
        <p className="mt-3 text-sm leading-7 text-ink-secondary">
          本規約は、{SERVICE_NAME}の利用条件を定めるものです。利用前に内容をご確認ください。
        </p>
        <p className="mt-2 text-xs text-ink-muted">制定・最終改定：{LEGAL_VERSION}</p>
      </header>

      <LegalSection title="1. 適用と同意">
        <p>
          本規約は、本サービスを利用するすべての方に適用されます。利用者は、初回設定時および利用条件の重要な改定時に、本規約およびプライバシーポリシーを確認し、同意したうえで利用します。
        </p>
      </LegalSection>

      <LegalSection title="2. サービス内容">
        <p>
          本サービスは、利用者が保険契約に関する情報を整理・確認し、利用者が招待して相互共有に同意した家族と保険概要を確認し、または利用者が選択した担当代理店へ相談するための情報管理機能を提供します。
        </p>
        <p>
          本サービス自体は、保険募集、契約締結、保険金支払いの判断、法律・税務・医療上の助言を行うものではありません。正式な契約内容は、保険証券、約款または保険会社・担当代理店へ確認してください。
        </p>
      </LegalSection>

      <LegalSection title="3. アカウント管理">
        <ul className="list-disc space-y-1 pl-5">
          <li>利用者は、本人が管理するメールアドレスまたはLINEアカウントを使用します。</li>
          <li>家族招待は、利用者が家族本人のものと確認したメールアドレスに限って送信します。</li>
          <li>認証コード、パスワードその他の認証情報を第三者へ開示してはなりません。</li>
          <li>不正利用または認証情報の漏えいが疑われる場合は、速やかに運営者へ連絡してください。</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. 登録情報">
        <p>
          利用者は、正確かつ最新の情報を登録し、必要に応じて更新するものとします。保険証券画像、病歴、口座情報、クレジットカード情報など、本サービスが入力を求めていない機密情報を登録してはなりません。
        </p>
        <p>
          被保険者など利用者以外の者に関する情報を登録または共有する場合、利用者は、その情報を取り扱うために必要な本人の理解・同意その他の適切な権限を確認するものとします。
        </p>
      </LegalSection>

      <LegalSection title="5. 家族および担当代理店への共有">
        <h3 className="font-semibold text-ink">家族連携</h3>
        <p>
          利用者が家族を招待し、招待先の本人が承認すると、両者は互いに、現在および連携中に新たに登録・更新する保険概要を読み取り専用で確認できます。共有範囲はプライバシーポリシーおよび家族招待の確認画面に表示する項目に限られ、証券番号、受取人、メモ、連絡先、添付情報等は共有されません。
        </p>
        <p>
          家族連携はどちらからでも解除できます。家族は共有された情報を編集・削除できず、家族連携は保険契約上の代理権、契約変更権、保険金請求権その他の権限を与えるものではありません。
        </p>
        <p>
          利用者は、家族連携で閲覧した情報を家族の保険管理以外の目的に利用せず、本人の同意なく他の者へ開示しないものとします。誤ったメールアドレスへ招待した場合は、速やかに招待を取り消してください。
        </p>

        <h3 className="font-semibold text-ink">担当代理店への共有</h3>
        <p>
          担当代理店は、利用者本人が明示的に共有を許可した場合に限り、許可された保険情報を閲覧できます。共有は利用者の判断で解除できます。
        </p>
        <p>
          共有許可は保険契約の申込み、更新、変更その他の取引への同意を意味しません。具体的な手続は、利用者と担当代理店または保険会社との間で別途行います。
        </p>
        <p>
          家族連携と担当代理店への共有は独立しており、一方を許可または解除しても、他方の設定は自動で変更されません。
        </p>
      </LegalSection>

      <LegalSection title="6. 禁止事項">
        <ul className="list-disc space-y-1 pl-5">
          <li>第三者へのなりすまし、虚偽情報の登録または不正アクセス</li>
          <li>他の利用者、担当代理店または運営者の権利・利益を侵害する行為</li>
          <li>家族連携で閲覧した情報を本人の同意なく第三者へ開示し、または家族の保険管理以外の目的に利用する行為</li>
          <li>サービスやシステムへ過度な負荷をかける行為</li>
          <li>法令、公序良俗または本規約に違反する行為</li>
          <li>本サービスを本来の目的以外に利用する行為</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. 提供の変更・停止">
        <p>
          保守、障害、セキュリティ上の必要、災害その他やむを得ない事情がある場合、事前通知なくサービスの全部または一部を変更・停止することがあります。重要な変更は可能な範囲で事前にお知らせします。
        </p>
      </LegalSection>

      <LegalSection title="8. 利用制限・アカウント削除">
        <p>
          本規約違反、不正利用またはセキュリティ上の危険がある場合、運営者は利用を制限または停止できるものとします。利用者は設定画面からアカウント削除を申請できます。
        </p>
      </LegalSection>

      <LegalSection title="9. 免責と責任範囲">
        <p>
          運営者は、安全かつ安定した提供に努めますが、サービスが常に中断なく、誤りなく利用できることを保証するものではありません。運営者の故意または重過失による場合を除き、利用者が本サービスの利用により被った間接的・付随的な損害について責任を負いません。消費者契約法その他の法令により制限できない責任は、この限りではありません。
        </p>
      </LegalSection>

      <LegalSection title="10. 規約の変更">
        <p>
          サービス内容または法令の変更等に応じて本規約を改定することがあります。利用者への影響が大きい変更は、適用開始日と内容を事前にお知らせします。
        </p>
      </LegalSection>

      <LegalSection title="11. 準拠法・管轄">
        <p>
          本規約は日本法に準拠します。本サービスに関する紛争については、運営者の所在地を管轄する日本の地方裁判所を第一審の専属的合意管轄裁判所とします。
        </p>
      </LegalSection>

      <LegalSection title="12. お問い合わせ">
        <LegalContact />
      </LegalSection>
    </article>
  )
}
