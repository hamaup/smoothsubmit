# SmoothSubmit 初期ルールの判定契約

対応仕様：SPEC 0.6、DESIGN 1.2\
初期ルール：19件\
資料基準日：2026年10月7日

各ルールの判定対象、静的検査・AI確認・利用者による確認の範囲を定める。Appleの条文と資料の確認日は[公式資料台帳](apple-sources.md)に従う。ここでPASSは記載された検査対象の条件を満たすことを表し、ルール全体や審査の適合証明ではない。

## 共通の対象と判定

一つのルールに複数の条件がある場合、条件ごとにsubjectを作る。subjectKeyはJSONオブジェクトで、最低限componentを持つ。ファイル固有はpath、バンドル固有はbundleKey、SDK固有はdependencyId、権限固有はpermissionKey、言語固有はlocaleを追加する。根拠のファイル行はsubjectKeyへ入れない。

依存関係はdependencyIdをmanager・name・version・bundleKeyの組にする。bundleKeyはtarget IDと組み込みバンドルの相対パスで決める。versionが変われば異なる対象となり、前回との直接比較で修正済みとは扱わない。

ルールごとにcomponent=scopeを残す。このチェックは対象と検査範囲の解決を確認する。解決した範囲はPASS、必要範囲が未確認ならUNKNOWN、処理障害ならERROR。これは機能が適合しているというPASSではない。さらに以下の実装・準備・実動作条件を作る。対象を列挙できない場合はcomponent=unresolvedを一つ残す。

| 条件 | 状態 |
| --- | --- |
| 必要機能の不存在が範囲内の根拠で確認でき、反証がない | NOT_APPLICABLE。user申告なら検証種類もuser_attestation |
| 適用または必要入力が足りず、判断材料も不足 | UNKNOWN |
| 疑わしい候補、適用の衝突、動作確認不足がある | NEEDS_REVIEW |
| 記載された必要条件をすべて確認できた | PASS。確認方法と範囲を残す |
| 同梱の静的条件への違反を確定できた | FAIL |
| 読み取り・parser・実行器の障害 | ERROR |

MVPのAIによる条件判断はPASS・NEEDS_REVIEW・NOT_APPLICABLE・UNKNOWNに限定する。基本監査の読取障害は判定とは別にERRORとして記録できる。Skillが違反だと考えても、文脈判断はNEEDS_REVIEWとして理由と修正案を表示し、確定した構造違反はCLIの検出器でFAILにする。これはAIの弱点を隠すためではなく、静的FAILと文脈上の疑いの区別を保つ製品の判定契約である。ARG-PAY-001は静的にもAIにもFAILを許さない。

## 19ルールの必要条件

以下のcomponentはsubjectKey.componentの固定値。codeはstaticまたはai_review、preparationとruntimeはuser_attestationによる結果を持てる。runtimeはsubjectの名前であり、verificationLevel=runtimeをMVPが出力するという意味ではない。

| ruleId | componentと適用 | 完了とする条件 | 確認不能時 |
| --- | --- | --- | --- |
| ARG-PERM-001 | permission_key：対象API・権限キー別 | 対象構成の必須キーに空でない説明がある。API候補のない権限キーも設定の構造は調べる | 所属・コンパイル条件・生成設定が不明ならUNKNOWNまたはNEEDS_REVIEW。キーがないだけで即FAILにしない |
| ARG-PERM-002 | purpose_content：権限キー・locale別 | Skillでデータ／リソースと用途が説明され、当該機能と一致することを確認 | 文脈がない場合はUNKNOWN。曖昧・プレースホルダー・用途不一致はNEEDS_REVIEW |
| ARG-PRIV-001 | manifest_structure：バンドル・ファイル別 | plistの辞書、既知フィールド、型、重複・必要配列の構造とカテゴリを満たす | Manifestなしの場合はNOT_APPLICABLEへ飛ばず、scopeとARG-PRIV-002・SDKの必要性を確認 |
| ARG-PRIV-002 | reason_declaration：バンドル・カテゴリ別、reason_usage：理由別 | 利用候補に必要なカテゴリと有効な理由コードがあり、Skillが理由と用途の整合を確認。構造と用途を別subjectにする | 未解決カテゴリ・間接API・実体不明はUNKNOWN／NEEDS_REVIEW。アプリの宣言でSDKの不足を消さない |
| ARG-SDK-001 | sdk_manifest：対象SDK別、sdk_signature：対象バイナリ別 | Manifest実体と所属を確認。署名はMVP自身が検証しないため、最終バンドル確認の申告を別subjectへ記録 | lockfileだけなら実体・署名はUNKNOWN。対象一覧外を「安全」と表示しない |
| ARG-AUTH-001 | deletion_code：アカウント作成時、deletion_runtime：削除処理 | codeはアプリ内開始導線と既存処理への接続。runtimeは利用者のテストで削除完了・保持されるデータの説明を確認 | ログアウト・無効化・見た目だけのボタンはNEEDS_REVIEW。サーバー不明ならruntimeはUNKNOWN |
| ARG-AUTH-002 | login_eligibility：主アカウント認証、login_code：適用時、login_runtime | eligibilityは4.8と例外・代替方式をSkillが確認。codeは対象方式の導線・能力設定。runtimeはログイン手段が利用できることを確認 | 第三者SDKの導入だけでは適用を確定しない。例外・用途が不明ならNEEDS_REVIEW |
| ARG-IAP-001 | restore_code：復元可能な購入、restore_runtime | codeは復元の導線・処理・利用権反映。runtimeは同アカウント／再導入等のSandbox確認を申告 | consumableだけと確認できた場合は対象外。製品種別不明はUNKNOWN。特定API不在だけでFAILにしない |
| ARG-IAP-002 | entitlement_code：IAP利用時、entitlement_runtime | codeは成功・キャンセル・保留・検証・更新と利用権の接続。runtimeは適用する購入シナリオのテスト完了 | 代替の実装パターンを認める。単一メソッドの有無では判断しない |
| ARG-IAP-003 | subscription_display：自動更新サブスク、subscription_runtime | タイトル、期間、価格、必要な規約・プライバシー導線が購入画面の実条件と一致することを確認 | コードに文字列があるだけではPASSにしない。実価格・表示不明ならNEEDS_REVIEW |
| ARG-REVIEW-001 | access_preparation：審査アクセス制限、access_runtime | 準備はアクセス方式とReview Notes。runtimeは利用者が審査手順でフルアクセスとバックエンド稼働を確認 | prepared=trueだけでは接続済み・登録済みを表さない。アカウントの秘密値を記録しない |
| ARG-PRIV-003 | policy_code：アプリ内導線、policy_runtime：URL・登録 | codeはアプリ内の導線と設定URL。runtimeは公開URLの到達とApp Store Connectでの設定を利用者が確認 | CLIはURLを取得しない。未確認ならruntimeはUNKNOWN |
| ARG-PAY-001 | payment_context：外部購入候補、payment_manual：条件確認 | 候補、商品、販売地域、端末、OS、配信方法、契約・Entitlementをそろえて確認事項を示す。コードだけで法的適否を完了しない | 常に追加の地域別判断を求める。手動確認の申告は表示できるが、本ルールに静的・AIのFAILを出さない |
| ARG-BUILD-001 | deployment_setting：選択構成、deployment_archive：最終成果物 | settingは現行最低条件以上の解決済み値。archiveは最終アーカイブの値を利用者が確認 | SDKの版と混ぜない。MVPはarchiveを解析しない |
| ARG-BUILD-002 | toolchain_preparation：申告、toolchain_archive：提出成果物 | 申告された版を現行要件と照合し、preparedのPASSはuser_attestationと明示。archiveは対象ビルドの確認申告 | インストール済みXcodeやSDKROOTを実績として使わない |
| ARG-PRIV-004 | sharing_code：第三者共有・AI共有、sharing_runtime | codeは個人データ、送信先、説明、同意、送信開始の順序。runtimeは利用者が拒否・同意前後の通信等を確認 | 端末内モデルとクラウド送信を区別。不明な送信データはUNKNOWN／NEEDS_REVIEW |
| ARG-PRIV-005 | tracking_context：ATT適用、tracking_code、tracking_runtime | 適用時の権限説明と追跡開始の制御、拒否・未許可での振る舞いを確認。地域・OSのUI条件は別に確認 | 分析SDKだけで追跡と断定しない。未知の共有経路はUNKNOWN |
| ARG-REVIEW-002 | metadata_preparation：年齢・SNS・プライバシー申告別、metadata_registered | 準備は機能申告と入力した回答概要の整合。登録は利用者が最新の登録内容を確認 | 準備フラグだけなら登録はUNKNOWN。Privacy Declarationの概要未入力なら整合チェックもUNKNOWN |
| ARG-CONTRACT-001 | contract_preparation：DPLA・Paid Apps・Trader項目別、contract_account | 機能と地域に応じた確認項目をそろえ、利用者が有効状態を確認した記録を持つ | 身分・契約成立を判定しない。有料販売の有無やEU配信が不明なら適用もUNKNOWN |

## 適用の証拠と反証

利用者のfalse申告とコード候補が矛盾した場合、対象外へ落とさずNEEDS_REVIEWとして質問事項を作る。探索で候補が出ないことだけでは不存在を証明しない。構成・解析範囲・依存内の動作が未確認ならscopeも不足を示す。

静的PASSは一つの条件だけを確認している場合がある。たとえばpermission_keyのPASSはpurpose_contentを解消せず、deletion_codeのPASSはdeletion_runtimeを解消しない。比較は同じcomponent同士で行う。

ルールに紐付くruntime subjectは任意の「推奨テスト」ではなく、最終動作を確認する別の対象。コードの確認を終えた状態は「コード確認済み、動作未確認」と表示する。利用者の申告で完了させても「実動作をCLIが検証済み」とは表示しない。

## ルールとAPI台帳の版

ルールを初版で19件提供することと、全Apple APIを検出することは異なる。台帳のcategory、API識別子、必要キー、理由コード、同梱バンドル、公式資料、検出器、正例・反例・未解決fixtureを版管理する。

権限の初期カテゴリはcamera、microphone、location、photos、contacts。Required Reason APIはAppleの当該資料に掲載された現行カテゴリの台帳を初版へ含める。対象SDKは公式一覧のスナップショットを同梱する。新しいAPI・理由・SDKについて未確認ならFAILへ一般化しない。

台帳の初版は実装段階1で完成させる成果物。各行に公式仕様とfixtureが対応し、資料台帳との対応と日付が検証されるまで段階2へ進まない。未掲載APIが候補抽出の範囲外であることをlimitationsへ記録し、対象カテゴリの網羅率を推測で表示しない。

## 手動確認の方法

以下の専用subjectでだけmanualVerificationsを採用する。methodが合うだけでは完了とせず、上表の必要条件を確認したという利用者のconclusionと対象snapshotの一致を必要とする。実装の意味を確定するcode subjectへ申告を投影しない。

| component | 許可するmethod |
| --- | --- |
| deletion_runtime | device_test・backend_test・review_walkthrough |
| login_runtime | device_test・review_walkthrough |
| restore_runtime・entitlement_runtime・subscription_runtime | sandbox_test・device_test |
| access_runtime | review_walkthrough |
| policy_runtime | review_walkthrough（公開URLと登録設定の両方の確認） |
| sharing_runtime・tracking_runtime | device_test・backend_test・review_walkthrough |
| sdk_signature・deployment_archive・toolchain_archive | archive_inspection |
| metadata_registered・contract_account | app_store_connect |
| payment_manual | policy_review |

preparation subjectは該当する設定の申告値をuser_attestationとして投影し、manualVerificationsでは上書きしない。reportedBuildからのtoolchain_preparationも同様。外部ページを読んだだけのpublic_url確認はpolicy_runtimeの全条件を満たさないため、独立した補足として保持し、全体のPASSにはしない。

subjectKeyが持てるキーはcomponent、path、bundleKey、dependencyId、permissionKey、localeだけ。dependencyIdはmanager（spm・pods・local）、name、versionまたはunknown、bundleKeyを持つ。未確定対象はunresolved componentへ記録し、架空のpathやdependencyIdを生成しない。scopeKeyはproject、targetId、configuration、sdk、archの固定キーで、選択workspaceはscopeへ補足保存する。
