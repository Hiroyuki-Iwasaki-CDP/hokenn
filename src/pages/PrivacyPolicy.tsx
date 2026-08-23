import LegalContact from '../components/legal/LegalContact'
import LegalSection from '../components/legal/LegalSection'
import { LEGAL_VERSION, SERVICE_NAME } from '../config/service'

export default function PrivacyPolicy() {
  return (
    <article className="space-y-8 rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-8">
      <header>
        <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Privacy Policy</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">プライバシーポリシー</h1>
        <p className="mt-3 text-sm leading-7 text-ink-secondary">
          {SERVICE_NAME}は、利用者の個人情報を適切に取り扱い、安全に管理するため、本ポリシーを定めます。
        </p>
        <p className="mt-2 text-xs text-ink-muted">制定・最終改定：{LEGAL_VERSION}</p>
      </header>

      <LegalSection title="1. 取得する情報">
        <p>本サービスは、次の情報を取得します。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>メールアドレス、表示名、アカウント識別子などの登録・認証情報</li>
          <li>LINE Loginを利用する場合のLINEユーザー識別子、認証結果および友だち関係に関する情報</li>
          <li>利用者が入力する保険会社、保険種類、保障内容、保険料、契約期間、被保険者などの契約管理情報</li>
          <li>担当代理店への共有設定、同意・解除の日時および対象</li>
          <li>アクセス日時、操作履歴、端末・ブラウザ情報、エラー情報などの利用・セキュリティログ</li>
          <li>お問い合わせ時に提供される情報</li>
        </ul>
        <p>
          保険証券画像、病歴、診療情報、口座情報、クレジットカード情報など、契約管理に不要な機密情報は入力しないでください。
        </p>
      </LegalSection>

      <LegalSection title="2. 利用目的">
        <ul className="list-disc space-y-1 pl-5">
          <li>本人確認、ログインおよびアカウント管理</li>
          <li>保険契約情報の登録、整理、比較および更新時期の確認</li>
          <li>利用者が明示的に許可した担当代理店への情報共有</li>
          <li>担当者への相談・連絡機能の提供</li>
          <li>不正利用の防止、セキュリティ確保、障害対応および監査</li>
          <li>サービスの改善、重要なお知らせおよびお問い合わせ対応</li>
          <li>法令上必要な対応</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 担当代理店への共有">
        <p>
          登録した保険情報は、利用者本人がアプリ上で明示的に共有を許可した担当代理店に限り、閲覧目的で提供します。共有を許可していない代理店や他の利用者には表示しません。
        </p>
        <p>
          利用者は設定画面から共有を解除できます。解除後は担当代理店から新たに閲覧できなくなりますが、法令対応や監査のため同意・解除の履歴を一定期間保存する場合があります。
        </p>
      </LegalSection>

      <LegalSection title="4. 第三者提供と業務委託">
        <p>
          法令に基づく場合を除き、本人の同意なく個人データを第三者へ提供しません。担当代理店への共有は、利用者が対象と内容を確認して同意した場合に行います。
        </p>
        <p>
          サービス提供に必要な範囲で、クラウド、ホスティング、認証、メッセージ配信等の事業者へ取扱いを委託することがあります。現在利用する主な外部サービスには、Supabase、VercelおよびLINEプラットフォームが含まれます。
        </p>
      </LegalSection>

      <LegalSection title="5. 安全管理">
        <p>
          アクセス権限の分離、通信の暗号化、認証情報の適切な管理、操作記録、不正アクセス対策その他の必要かつ適切な安全管理措置を講じます。利用者ごとのデータアクセスはサーバー側で確認します。
        </p>
      </LegalSection>

      <LegalSection title="6. 保存期間と削除">
        <p>
          利用目的に必要な期間、または法令・監査上必要な期間に限り情報を保存します。利用者は設定画面からアカウント削除を申請できます。削除後も、法令対応、不正利用防止または監査に必要な最小限の記録を一定期間保持する場合があります。
        </p>
      </LegalSection>

      <LegalSection title="7. 開示・訂正・利用停止等">
        <p>
          本人は、法令に従い、保有個人データの利用目的の通知、開示、訂正、追加、削除、利用停止、消去または第三者提供停止を求めることができます。本人確認のうえ、合理的な期間内に対応します。
        </p>
      </LegalSection>

      <LegalSection title="8. ポリシーの変更">
        <p>
          法令、サービス内容または情報の取扱いを変更する場合、本ポリシーを改定することがあります。重要な変更は、アプリ内その他の適切な方法でお知らせします。
        </p>
      </LegalSection>

      <LegalSection title="9. お問い合わせ">
        <LegalContact />
      </LegalSection>
    </article>
  )
}
