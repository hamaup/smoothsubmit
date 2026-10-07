// Guidance describes work to perform; it never claims the work was executed.
const steps: Record<string, [string, string]> = {
  "ARG-AUTH-001": [
    "Trace account creation, then add an easy-to-find in-app deletion initiation flow connected to the existing backend. Explain retained data and confirmation; logout or removing a local account is insufficient. Revoke Sign in with Apple tokens when applicable.",
    "アカウント作成の有無を追跡し、既存バックエンドの削除処理につながる、見つけやすいアプリ内の削除開始導線を確認・実装します。保持するデータと確認手順を説明してください。ログアウト・ローカルのアカウント除去は削除の証明になりません。該当時はSign in with Appleのトークン失効も確認します。",
  ],
  "ARG-AUTH-002": [
    "Identify the main-account login providers and document guideline 4.8 applicability/exceptions before changing authentication. If applicable, implement a qualifying equivalent login alternative and preserve existing account linking.",
    "メインアカウントの認証方式とGuideline 4.8の適用・例外を先に確認します。該当する場合は要件を満たす同等のログイン手段を追加し、既存のアカウント連携を維持してください。",
  ],
  "ARG-IAP-001": [
    "Identify restorable product types and the existing StoreKit/SDK purchase flow. Provide a reachable restore action using that integration, refresh entitlements and handle errors; do not introduce a second purchase stack merely to add AppStore.sync.",
    "復元対象の商品種別と既存のStoreKit・課金SDKの処理を確認します。その実装に合う購入復元導線・利用権の再読込・エラー表示を整備してください。AppStore.syncを追加するためだけに別の課金実装を導入しません。",
  ],
  "ARG-IAP-002": [
    "Follow the existing purchase result and transaction observer into entitlement updates. Handle verified success, cancellation, pending and errors, and finish transactions only where appropriate.",
    "既存の購入結果・トランザクション監視から利用権の更新まで追跡します。検証済みの成功・キャンセル・保留・エラーを処理し、適切な場面でのみトランザクションを完了させてください。",
  ],
  "ARG-IAP-003": [
    "For auto-renewable products, inspect the purchase screen for actual localized price, renewal period, product benefits, terms and privacy links. Use StoreKit/SDK product data rather than hard-coded pricing.",
    "自動更新商品では購入画面の実際のローカライズ済み価格・更新期間・提供内容・利用規約とプライバシーリンクを確認します。固定価格ではなくStoreKit・SDKの商品情報を使ってください。",
  ],
  "ARG-REVIEW-001": [
    "Walk through every gated feature from a fresh launch. Prepare reviewer access and navigation notes, including purchase access and backend prerequisites; enter credentials directly in App Store Connect, not this report.",
    "初回起動からログイン等で制限される機能までの手順を確認します。審査アクセス・購入機能への到達方法・バックエンド条件をReview Notesに準備してください。認証情報はこのレポートではなくApp Store Connectに直接入力します。",
  ],
  "ARG-PRIV-003": [
    "Locate the in-app privacy policy link and the corresponding public page. Check that described collection, sharing, retention and deletion match implementation, then confirm the App Store Connect URL separately.",
    "アプリ内のプライバシーポリシーへの導線と公開ページを確認します。収集・共有・保持・削除の説明を実装と照合し、App Store Connectの登録URLは別途確認してください。",
  ],
  "ARG-PAY-001": [
    "Trace the purchase-related destination and identify the sold product, storefronts, distribution and applicable Apple agreement/entitlement. Read current official rules before proposing a change; an ordinary web link is not proof of payment steering.",
    "購入に関係する遷移先・販売内容・配信地域・配信方式・適用されるAppleの契約やEntitlementを確認します。修正前に最新の公式規約を確認してください。一般的なWebリンクだけでは外部決済誘導の証拠になりません。",
  ],
  "ARG-PRIV-004": [
    "Trace actual personal-data payloads, recipient ownership, disclosure/consent and send order. Networking or developing with an AI tool alone does not establish third-party personal-data sharing.",
    "実際に送る個人データ・送信先の運営者・開示と同意・送信順序を追跡します。通信処理やAI開発ツールの利用だけでは、第三者への個人データ共有は判断できません。",
  ],
  "ARG-PRIV-005": [
    "Determine whether actual data use constitutes tracking under Apple's definition. If applicable, request ATT permission before tracking and preserve a usable denial path; analytics alone does not establish tracking.",
    "実際のデータ利用がAppleの定義する追跡に該当するか確認します。該当する場合は追跡前にATTの許可を取得し、拒否時の利用導線も維持してください。分析SDKだけでは追跡と断定しません。",
  ],
};
export function guidance(ruleId: string, english: boolean): string | null {
  return steps[ruleId]?.[english ? 0 : 1] || null;
}
