# Apple source record — checked 2026-10-07

## Contents

- 公式資料台帳：審査・提出・開発環境／プライバシー・SDK・StoreKit／契約・規約・地域別条件
- ルールと根拠の対応
- 更新を仕様に取り込む手順
- 今回確認できなかった範囲

## 公式資料台帳

以下の確認日はすべて2026年10月7日である。「更新日未表示」は、今回読んだページの関連箇所に個別の改訂日を確認できなかったという意味であり、更新がないという意味ではない。

### 審査・提出・開発環境

| sourceDocumentId | 資料 | 改訂・告知・適用日 | 確認範囲 |
| --- | --- | --- | --- |
| APPLE-REVIEW-GUIDELINES | [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) | 最終更新2026-06-08 | 提出前確認、2.1、3.1、4.3、4.8、5.1.1、5.1.2等の関連箇所 |
| APPLE-REVIEW-UPDATE-20260608 | [審査ガイドラインとDPLAの更新告知](https://developer.apple.com/news/?id=a233fmpw) | 告知2026-06-08 | ガイドラインの変更箇所とAI・ML契約項目の追加 |
| APPLE-SUBMISSION-REQUIREMENTS | [Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/) | 項目別に施行日あり | SDK、最低対応OS、年齢質問、DSA、Required Reason API |
| APPLE-SUBMISSION-20260909 | [新OS向け提出案内](https://developer.apple.com/news/?id=k1mtkt1k) | 告知2026-09-09 | Xcode 27 RCでの提出開始、SNS機能申告、2027年4月のSDK要件 |
| APPLE-XCODE-SUPPORT | [Xcodeのシステム要件・対応表](https://developer.apple.com/xcode/system-requirements) | 更新日未表示 | Xcode、ホストmacOS、同梱SDK、Deployment Targetの対応範囲。beta／RCと正式版を区別 |
| APPLE-XCCONFIG | [Adding a build configuration file to your project](https://developer.apple.com/documentation/xcode/adding-a-build-configuration-file-to-your-project) | 更新日未表示 | 設定層、変数、inherited、条件、include。追加CLIの対応構文を決める参考 |
| APPLE-INFOPLIST-GENERATION | [Managing your app’s information property list values](https://developer.apple.com/documentation/bundleresources/managing-your-app-s-information-property-list) | 更新日未表示 | 生成YES／NO、手動plist、ユーザー定義INFOPLIST_KEY_*の制約 |
| APPLE-BUILD-SETTINGS | [Build settings reference](https://developer.apple.com/documentation/xcode/build-settings-reference) | 更新日未表示 | Info.plist Valuesと生成設定の関連箇所 |
| APPLE-ACCOUNT-DELETION | [5.1.1(v) — Offering account deletion in your app](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion) | 更新日未表示 | アプリ内で削除開始、無効化との違い、削除時の説明 |
| APPLE-PURPOSE-STRINGS | [5.1.1(ii) — Write clear purpose strings](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-purpose-strings) | 更新日未表示 | アクセスするデータと機能の用途説明 |

### プライバシー・SDK・StoreKit

| sourceDocumentId | 資料 | 改訂・適用日 | 確認範囲 |
| --- | --- | --- | --- |
| APPLE-PRIVACY-MANIFEST | [Privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files) | 更新日未表示 | PrivacyInfo.xcprivacyの形式、データ・API宣言、アプリ／SDKの区別 |
| APPLE-REQUIRED-REASON-API | [Describing use of required reason API](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api) | 未宣言の場合の受付制限は2024-05-01から | API利用を実際に反映する理由、バンドル別の宣言、SDKが他バンドルのManifestに依存しない条件 |
| APPLE-SDK-REQUIREMENTS | [Third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/) | 更新日未表示 | 現行の対象SDK一覧、再梱包SDK、Manifest、バイナリ依存の署名条件 |
| APPLE-APP-PRIVACY | [App privacy details on the App Store](https://developer.apple.com/app-store/app-privacy-details/) | 更新日未表示 | 自社・第三者のデータ収集、収集の定義、申告の例外条件、登録内容の維持 |
| APPLE-ATT | [User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/) | ATT基本条件はiOS／iPadOS 14.5以降。EU UI変更は27.2以降 | 追跡の定義、許可前の制約、IDFV、SDK責任、EU向け変更 |
| APPLE-ATT-UPDATE-20260916 | [EU向けATT更新告知](https://developer.apple.com/news/?id=idsft9ai) | 告知2026-09-16 | 対象OS・国、許可が必要な条件は維持されること |
| APPLE-STOREKIT-SYNC | [AppStore.sync()](https://developer.apple.com/documentation/storekit/appstore/sync%28%29) | API availabilityはiOS 15以降等。更新日未表示 | 復元機構、通常の自動同期、明示操作からの同期呼び出し |
| APPLE-STOREKIT-RESTORE | [Restoring purchased products](https://developer.apple.com/documentation/storekit/restoring-purchased-products) | 更新日未表示 | StoreKit 1の復元経路。StoreKit 2のsync資料と併用し、旧APIをすべての実装に要求しない |
| APPLE-FOUNDATION-MODELS-DOC | [Generating content and performing tasks with Foundation Models](https://developer.apple.com/documentation/foundationmodels/generating-content-and-performing-tasks-with-foundation-models) | 更新日未表示 | セッション・応答生成・端末内モデル利用の開発手順。契約条件は別資料で確認 |

Developer Documentationの一部は通常ページがJavaScript必須だったため、Appleが同じURLで提供するMarkdown版も読んだ。Privacy Manifest、Required Reason API、StoreKit、Foundation Modelsの資料本文を確認した。ManifestだけでPrivacy Nutrition Labelsの登録が済むわけではない。

### 契約・規約・地域別条件

| sourceDocumentId | 資料 | 公開版の改訂・適用日 | 確認範囲 |
| --- | --- | --- | --- |
| APPLE-AGREEMENTS-INDEX | [Agreements and Guidelines](https://developer.apple.com/support/terms/) | 契約別の表示日あり | 契約の役割と公式参照先。英語の承諾版と翻訳の扱い |
| APPLE-DPLA | [Apple Developer Program License Agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/) | 本文の改訂表示2026-08-18 | 公開API、プライバシー、AI・ML 3.3.11(A)、地域別Attachmentの関連箇所 |
| APPLE-DPLA-UPDATE-20260818 | [DPLA更新告知](https://developer.apple.com/news/?id=0cgo95n6) | 告知2026-08-18、EU変更は2026-10-01施行 | Attachment 14追加と施行日 |
| APPLE-PAID-AGREEMENT | [Paid Applications Agreement — Schedules 2 and 3](https://developer.apple.com/support/downloads/terms/schedules/Schedule-2-and-3-English.pdf) | PDF表示v126、2025-12-17 | 配布・販売と自動更新サブスク表示の関連箇所。Schedule 2 §3.8(b) |
| APPLE-DEVELOPER-AGREEMENT | [Apple Developer Agreement](https://developer.apple.com/support/downloads/terms/apple-developer-agreement/Apple-Developer-Agreement-20250318-English.pdf) | PDF表示LYL207、2025-03-18 | Developer向けサービス・資料の契約の位置づけ、公開版の版表示。全条項の適合監査は実施していない |
| APPLE-XCODE-SDK-AGREEMENT | [Xcode and Apple SDKs Agreement](https://www.apple.com/legal/sla/docs/xcode.pdf) | PDF末尾表示EA2002、06/08/2026 | 開発ツール・SDK使用契約の位置づけと版表示。提出SDK要件とは区別 |
| APPLE-ASC-TERMS | [App Store Connect Terms of Service](https://appstoreconnect.apple.com/WebObjects/iTunesConnect.woa/wa/termsOfService/) | 未確認 | 公式の契約一覧から参照。認証画面へ遷移したため本文・改訂日は未確認 |
| APPLE-ASC-AGREEMENT-HELP | [Sign and update agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/) | 更新日未表示 | 有料アプリ・IAPのPaid Apps Agreement、Account Holder、更新手順 |
| APPLE-JAPAN-PAYMENTS | [Payment options on the App Store in Japan](https://developer.apple.com/support/payment-options-on-the-app-store-in-japan/) | iPhone・日本ストア・iOS 26.2以降など | 決済選択肢、Entitlement、IAP表示、開示、Review Notes。27.2関連の説明はavailability・betaの区分を保持 |
| APPLE-EU-APPS | [Changes for apps in the European Union](https://developer.apple.com/support/apps-in-the-eu) | 契約改訂2026-08-18、変更施行2026-10-01 | EUの現行条件、代替決済、配信方法。料金計算の実装はMVP対象外 |
| APPLE-ASC-AGE-RATING | [Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/) | 更新日未表示 | 質問による判定、OS・地域別の年齢区分、未評価アプリの公開制限 |
| APPLE-DSA-TRADER | [Manage European Union Digital Services Act trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/) | 更新日未表示。受付・配信上の期限は提出要件一覧に記載 | Trader status申告、EU配信時の情報確認。EUで配信しない場合もstatus申告が必要な案内を確認 |
| APPLE-FOUNDATION-MODELS-AUR | [Acceptable use requirements for the Foundation Models framework](https://developer.apple.com/support/terms/acceptable-use-requirements-for-the-foundation-models-framework) | 更新日未表示 | Foundation Modelsを利用・公開する場合の禁止用途、ガードレール回避等の制限 |

Paid Applications Agreementは今回取得したPDFの版を記録した。Exhibitsや地域別Attachmentの更新日、利用者の承諾版を同じ日付と仮定しない。Developer Accountで承諾した英語版と、App Store Connectに表示される更新要求・契約状態の確認が必要である。

HIGは契約一覧から公式の[Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)を参照できる。[Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai)の本文は今回の取得経路ではJavaScript画面となり、内容を確認できなかったため、詳細な推奨事項は監査ルールに取り込んでいない。

## ルールと根拠の対応

| ルール | 主な根拠 | 判定で保持する限界 |
| --- | --- | --- |
| ARG-PERM-001 | APPLE-REVIEW-GUIDELINES 5.1.1(ii)、APPLE-PURPOSE-STRINGS、対象API・Info.plistキーの公式仕様 | 保護リソースの利用と対象構成の必須キーが確定した範囲のみFAIL |
| ARG-PERM-002 | APPLE-PURPOSE-STRINGS | 用途説明の文脈とUI接続はSkillで確認 |
| ARG-PRIV-001 | APPLE-PRIVACY-MANIFEST | 構造が正しくてもデータ収集・宣言内容の正確性は別 |
| ARG-PRIV-002 | APPLE-REQUIRED-REASON-API | 必要理由と実際の用途、バンドル所属を照合 |
| ARG-SDK-001 | APPLE-SDK-REQUIREMENTS | 対象SDK・再梱包・バイナリ依存を区別。最終署名を未検証 |
| ARG-AUTH-001 | APPLE-ACCOUNT-DELETION、APPLE-REVIEW-GUIDELINES 5.1.1(v) | サーバー削除・保持が必要な情報は静的検査だけで確認不能 |
| ARG-AUTH-002 | APPLE-REVIEW-GUIDELINES 4.8 | 主アカウント認証・例外・同等ログインの条件を確認 |
| ARG-IAP-001 | APPLE-REVIEW-GUIDELINES 3.1.1、APPLE-STOREKIT-SYNC、APPLE-STOREKIT-RESTORE | 製品種別と実装世代を区別。API名の欠落だけで違反にしない |
| ARG-IAP-002 | APPLE-REVIEW-GUIDELINES 3.1、StoreKitの対象API仕様 | 利用権・保留・検証・更新の実動作はSandbox等で追加確認 |
| ARG-REVIEW-001 | APPLE-REVIEW-GUIDELINES 2.1と提出前確認 | フルアクセス、必要な環境、稼働バックエンドを手動確認 |
| ARG-PRIV-003 | APPLE-REVIEW-GUIDELINES 5.1.1(i)、APPLE-APP-PRIVACY | アプリ内導線・公開URL・登録は確認方法ごとに分ける |
| ARG-PAY-001 | APPLE-REVIEW-GUIDELINES 3.1、APPLE-JAPAN-PAYMENTS、APPLE-EU-APPS、APPLE-DPLA | 他の地域・カテゴリーは対応する公式条件が未確認ならUNKNOWN。地域別条件を自動で一般化しない |
| ARG-BUILD-001 | APPLE-SUBMISSION-REQUIREMENTS、APPLE-XCODE-SUPPORT | 設定値と最終アーカイブの値は別 |
| ARG-BUILD-002 | APPLE-SUBMISSION-REQUIREMENTS、APPLE-SUBMISSION-20260909 | 提出バイナリを読まないMVPでは実績のstatic PASSを出さない |
| ARG-PRIV-004 | APPLE-REVIEW-GUIDELINES 5.1.2(i)、APPLE-APP-PRIVACY | クラウドAI・通常の第三者送信・端末内モデルを区別 |
| ARG-PRIV-005 | APPLE-ATT、APPLE-ATT-UPDATE-20260916、APPLE-REVIEW-GUIDELINES 5.1.2 | 分析と追跡の用途差、許可前の通信、地域・OS availability |
| ARG-REVIEW-002 | APPLE-ASC-AGE-RATING、APPLE-SUBMISSION-REQUIREMENTS、APPLE-SUBMISSION-20260909、APPLE-APP-PRIVACY | 実際のApp Store Connect回答はMVPで取得しない |
| ARG-CONTRACT-001 | APPLE-AGREEMENTS-INDEX、APPLE-ASC-AGREEMENT-HELP、APPLE-DPLA、APPLE-DSA-TRADER | 承諾・契約状態・法的身分を自動判定しない |
| ARG-IAP-003 | APPLE-PAID-AGREEMENT Schedule 2 §3.8(b)、APPLE-REVIEW-GUIDELINES 3.1.2 | 実際の価格・期間・表示タイミングとの照合が必要 |

各APIカテゴリ、理由コード、権限キーの全対応表を実装時に追加する。今回の台帳だけで全APIを検証済みとは扱わない。Foundation Models利用時はAPPLE-DPLA 3.3.11(A)とAPPLE-FOUNDATION-MODELS-AURの手動確認を追加するが、モデル出力の適合を認証するチェックは初期19ルールに含めない。

## 更新を仕様に取り込む手順

1. 公式資料の関連箇所と更新告知を読む。確認日、改訂日、告知日、施行日・対象OSを別々に残す。
2. 現行・告知済み・廃止済みを区別し、地域・端末・OS・配信方法・機能の適用条件を設定する。
3. ルール説明・検出条件への影響を整理する。判断できない点はUNKNOWNとし、誤った自動修正を案内しない。
4. 境界日・未入力・例外・間接実装のfixtureを更新し、ルール版を上げる。
5. knowledgeAsOf、各資料のverifiedAt、変更点をリリースノートに記載する。

通常の監査はオフラインで行うため、配布済みルールが後日のApple変更を自動取得したと表示しない。将来要件の施行時には再確認を必要とする。全文転載・Appleの開発ツール再配布を前提とせず、公式リンクと独自の説明・検査データを保持する。

## 今回確認できなかった範囲

- App Store Connect Terms of Serviceの認証後本文と改訂日。
- 利用者が承諾したDPLA・Paid Apps Agreement・地域別条件と、その有効状態。
- HIG Generative AIの詳細本文。
- 個別アプリのApp Store Connect登録、年齢・プライバシー回答、レビューアカウント、提出ビルド。
- Apple以外の法令本文・国別許認可・第三者サービス利用規約の網羅的な確認。

これらは公開資料の存在確認、利用者への準備案内、実際のアカウント・アプリ確認を分けて扱う。仕様書のUNKNOWNとuser_attestationの定義に従う。
