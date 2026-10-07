# SmoothSubmit プロダクト仕様書

作成日：2026年10月7日\
仕様バージョン：0.6\
対象リリース：OSS MVP\
状態：OSS MVPの目標仕様。初期alphaの実装・検証範囲は[公開版の状態](docs/RELEASE_STATUS.md)に記録\
公式資料確認日：2026年10月7日

本製品は、iOSアプリをApp Storeへ提出する前に審査リスクを点検し、根拠の説明、修正指示の生成、修正後の再確認まで支援する。最初の製品は、Claude Code・Codex・Cursorで使うSkillを入口とし、Skill単体で基本監査を完了できる。ローカルCLIは、対象解決や構造解析などの追加検査を提供する。CLIの導入を監査開始の必須条件にしない。

利用者が得る成果は、優先順位と証拠のある監査レポート、および修正後に何が解消したかを示す比較レポートである。審査通過率の予測やAppleによる承認の保証は提供しない。

## 製品名と説明

正式名はSmoothSubmit（スムーズサブミット）。App Store提出前の点検・修正・再確認により、審査の手戻りを減らす価値を表す。名称の検討と近似名OSSの確認は[命名記録](docs/NAMING.md)に保存する。技術構成・データ構造・処理手順・実装単位は[設計書](DESIGN.md)に定義する。仕様確認の質問と決定は[確認記録](docs/CLARIFICATION.md)で管理する。

| 用途 | 表記 |
| --- | --- |
| 製品の表示名 | SmoothSubmit |
| 英語の副題 | Audit and fix your iOS app before App Store submission. |
| 日本語のタグライン | 審査の手戻りを、提出前に減らす。 |
| 製品の短い説明 | App Store提出前の監査・修正アシスタント |
| CLIコマンド | smoothsubmit |
| npm配布名の採用予定 | @smoothsubmit/cli |
| GitHubリポジトリの採用予定 | <owner>/smoothsubmit |
| Skillの入口 | Claude Code：/smoothsubmit、Codex：$smoothsubmit、Cursor：/からSkillを選択 |
| 設定ファイル | smoothsubmit.config.json |
| 監査記録の保存先 | .smoothsubmit/runs/<auditId>/ |

ルールIDのARG接頭辞は、既存の仕様・資料の対応を維持するため継続する。npmスコープ・リポジトリ・ドメインは公開時に取得可否を確認する。HTMLフォーム用OSSのsmooth-submitは既存利用があるため、同名パッケージを配布しない。

## 利用者と提供価値

主な利用者は、AIコーディングを使ってSwiftのiOSアプリを開発する1〜5人の個人開発者・小規模チームとする。審査に不慣れで、提出直前に設定や実装の不足を確認したい人を最初の対象にする。

主な利用場面は、初回提出前、ログインや課金機能の追加後、リジェクト対応後の再提出前である。明らかな設定漏れと、開発者が追加確認すべき事項を早く知り、再提出・修正・待ち時間を減らす。

製品の説明文は「提出前にApp Store審査リスクを見つけ、修正し、もう一度確認する」とする。Appleとの公式な関係を示す表現や、審査結果を断定する表現は使わない。

## MVPの範囲

| 項目 | MVPで提供する内容 |
| --- | --- |
| 入力 | ローカルにあるXcodeプロジェクトとソースコード。GitHubリポジトリは利用者がcloneしたものを扱う |
| 対象 | Swift、SwiftUI、UIKitで実装されたiOSアプリの選択済みアプリターゲット |
| 実行環境 | ローカルのAI開発ツールでSkillを実行。追加CLIはmacOS対応。Xcodeによるビルドは通常監査の前提にしない |
| 連携先 | Claude Code、Codex、Cursor。ツールごとの導入・起動確認を行う |
| 監査 | Skill単体の基本監査と、導入済みCLIによる構造・対象・設定検査。各確認方法を明示 |
| 出力 | ターミナル要約、Markdownレポート、バージョン付きJSON、修正指示 |
| 再確認 | 基本監査はSkillで再評価し、CLI監査は同じ対象を再検査。モードと証拠が異なる結果を直接の解消比較に使わない |
| 言語 | 日本語・英語。キーやルールIDは共通にする |
| ネットワーク | 通常監査はオフラインで動作。監査コードを製品のサーバーへ送信しない |

App Store Connect接続、GitHub認証・自動clone、Webダッシュボード、スクリーンショット解析、自動PR、提出自動化、Flutter・React Native・Objective-Cの本格対応は後続リリースとする。通常監査では実機操作、購入、アカウント削除、バックエンドへのアクセスも行わない。

Guideline 4.3の類似アプリ判定、医療・金融・子ども向けなどの専門領域、地域別の決済規制の適法性判断はMVPの自動合否判定に含めない。外部決済の候補を検出した場合は、販売地域・商品種別・適用条件を確認する項目として提示する。

## Apple公式資料と適用基準

確認した資料とルールへの対応は[Apple公式資料の確認記録](docs/APPLE_REFERENCES.md)に保存する。公開資料の改訂日、告知日、施行日、今回の確認日を別々に記録する。契約・審査基準・提出要件・API仕様・デザイン指針を区別し、HIGの推奨事項だけで審査違反のFAILを出さない。

2026年10月7日時点の提出要件を初期ルールパックの基準とする。

| 条件 | 適用時期 | MVPでの扱い |
| --- | --- | --- |
| Xcode 26以降、iOS／iPadOS 26 SDK以降でビルド | 2026年4月28日から | 設定の意図と提出ビルドの実績を分ける。SDKROOTがiphoneosであることや、端末に新しいXcodeがあることを提出ビルドの証明にしない |
| iOS／iPadOSの最低対応OSは13以降 | 2026年9月9日から | 選択構成のDeployment Targetを照合。使用するXcode側の対応範囲も別に確認する |
| 年齢レーティングの更新質問への回答 | 2026年1月31日の期限を経過 | 回答準備状況を確認。現在の質問・機能区分との照合を案内する |
| iOS／iPadOS 27 SDK以降でビルド | 2027年4月からとの告知 | 将来の移行案内として表示。具体的な日付は未告知として保持し、現行条件のFAILへ混ぜない |

根拠：[提出要件一覧](https://developer.apple.com/news/upcoming-requirements/)、[2026年9月9日の提出案内](https://developer.apple.com/news/?id=k1mtkt1k)、[Xcode対応表](https://developer.apple.com/xcode/system-requirements)。SDKのバージョンとアプリの最低対応OSは別の値である。最新のbeta・RCの掲載から、そのSDKでの提出が必須・許可済みと推測しない。

契約の公開版では、App Review Guidelinesの最終更新は2026年6月8日、Apple Developer Program License Agreementの改訂は2026年8月18日と確認した。EU向けのAttachment 14に関する変更は2026年10月1日から適用されている。実際に利用者が承諾した契約と更新要求は、Developer Account／App Store Connectで確認する。

第三者AIへの個人データ共有、トラッキング、外部決済は、コードの存在だけで判断しない。共有するデータ・送信先・事前同意、販売地域、OS、端末、商品種別、Entitlement、配信方法を確認する。AIコーディングで開発したという理由だけで、アプリが第三者AIへ個人データを送信しているとは扱わない。

## 製品の構成

| 層 | 役割 | 責任範囲 |
| --- | --- | --- |
| CLI | 入力の解決、ファイルの解析、ルール実行、出力・比較 | 再現できる事実の収集と検査 |
| Skill | 基本監査、関連コードの読み取り、説明、修正案、不足情報の質問、再評価 | CLIなしの基本確認と文脈判断・開発支援 |
| ルールパック | 適用条件、検査方法、根拠、修正・検証条件 | 更新可能な専門知識 |
| プロジェクト設定 | 対象、アプリの機能、対象地域、除外理由 | 利用者が提供する情報の保存 |
| レポート | 監査対象、証拠、状態、修正案、比較 | 人とAIが共有できる監査記録 |

CLIの監査はLLM APIキーなしで利用できる。Skillを使用する際のモデル実行は利用者のAI開発ツールが担当する。CLI自体はモデルAPIを呼び出さない。

静的検査で観測した事実、AIが判断した内容、利用者が申告した内容を区別する。AIが生成した結果には、利用ツールと、取得できる場合のモデル名、判断日時を記録する。モデル情報が取得できない場合はnullとし、推測で補完しない。

実装言語はTypeScriptとし、CLI・解析・ルール・出力を分離する。Node.js 22.18以上を初期の実行要件とする。配布パッケージは実行用JavaScriptを含み、利用者にTypeScriptコンパイルを要求しない。npm配布名は`@smoothsubmit/cli`、bin名は`smoothsubmit`とする。スコープの所有権は公開前に確保する。対応下限はmacOS 14とし、plistの解析にはmacOS標準のplutilを使用する。アプリのビルドやxcodebuildは通常監査で実行しない。

## 利用フロー

通常の「SmoothSubmitで確認して」は、対象認識、自動で取得できる情報の収集、監査、リスク一覧と修正案の提示まで進める。ソース変更、設定変更、App Store Connectへの書き込み、提出操作は行わない。監査レポート・修正指示の保存は出力処理とし、アプリ設定や.gitignoreの変更と区別する。

1. Skillが対象リポジトリのプロジェクト候補と読める関連ファイルを確認する。
2. Info.plist、Privacy Manifest、Entitlements、StoreKit・Auth・削除・権限関連コードを直接読んで基本監査を進める。
3. 対応版のCLIが導入済みなら追加の静的監査と統合へ進む。CLIなしでは導入要求や自動インストールをせず、基本監査を完了する。
4. 確認済み、リスク、要確認、UNKNOWN、確認範囲を表示し、修正案またはAI開発ツール向け修正指示を返す。
5. 判定を実際に変える不足情報だけをまとめて質問する。回答を待つ間も、現在の基本監査結果を利用できる。
6. 回答後は該当項目を再評価する。設定に回答を保存する場合は、設定変更を依頼されたときに限る。
7. 明示的な修正指示があれば、その対象の変更・必要なテスト・再確認まで進める。修正指示の生成だけを依頼された場合はソースを編集しない。

CLIがないときは「基本監査は完了 / CLI導入で追加○項目を確認可能」と表示する。○は、追加CLIが提供する検査のうち基本監査で未実施のものを計画から数える。アカウント情報・対象地域・実機テストなど、CLIでも分からない項目をこの件数へ加算しない。対象を列挙できず数が不明なら数値を作らず、追加できる検査の種類を表示する。MVPのCLIはビルド検証をしないため、導入による追加検査としてビルド検証を約束しない。

複数プロジェクト・ターゲットで対象が不明な場合、Skillは候補ごとに読める設定とリスクを整理して基本監査を進め、対象依存の判定はUNKNOWNへ残す。候補間で証拠を混ぜず、対象選択を後の質問へ含める。CLIは明示または一意な対象を必要とし、曖昧な場合は候補を返して終了1とする。

「監査完了」は実行できる監査を終えて結果を返したという意味で、UNKNOWNがないことや審査通過を意味しない。子ども向けか、配信地域、商品種別、審査アクセスなどの事業条件はコードから仮説を作れても、確定できなければ要確認へ残す。

## 入力とプロジェクト解決

### 対応ファイル

| 入力 | 収集・検査する内容 |
| --- | --- |
| `.xcodeproj/project.pbxproj` | アプリターゲット、構成、Deployment Target・SDKROOT、ファイル参照、リソース・ソース所属、plist・Entitlementsの指定 |
| `.xcworkspace/contents.xcworkspacedata` | 参照されるプロジェクトの候補 |
| `.xcconfig` | 静的に解決できる設定値・include・変数 |
| `Info.plist` | 権限説明などの設定値 |
| `InfoPlist.strings`・対応するString Catalog | 権限説明のローカライズ。未対応形式はUNKNOWNとして記録 |
| `.entitlements` | Sign in with Appleなどの能力設定 |
| `PrivacyInfo.xcprivacy` | plist構造、APIカテゴリ、利用理由などの宣言 |
| `.swift` | 認証、登録、削除、課金、復元、権限要求の候補と関連する実装 |
| `.storekit` | ローカルの製品種別・識別子の参考情報 |
| `Package.resolved`・`Podfile.lock` | SDK名・バージョンの一覧。依存先の自動取得は行わない |
| `smoothsubmit.config.json` | 機能の申告、対象、審査情報の準備状況 |

XML・binary plistを扱う。pbxprojは構造として解析し、文字列検索だけでターゲットを決めない。ファイルシステム同期グループにも対応する。Swift解析はコメント・文字列リテラルとコードを区別した候補抽出を行い、完全なコンパイラ解析や実行到達性の証明は行わない。

### 解決の原則

- プロジェクト・ターゲット・ビルド構成ごとに結果を分離する。構成は初期値をReleaseとし、存在しない場合は指定を要求する。
- plistが自動生成される場合、build settingsの対応値を収集する。ファイルがないことだけで欠落と判定しない。
- 設定の継承、変数展開、includeは対応範囲内で解決し、循環・外部パス・未解決変数を診断として残す。
- ソースやManifestがリポジトリ内にあることと、選択ターゲットへ含まれることを区別する。
- 条件付きコンパイルやSDKの内側の動作が解決できない場合、適用を断定しない。
- `.git`、`DerivedData`、ビルド生成物、依存キャッシュ、監査出力は通常のソース探索から除外する。SDK宣言ファイルは明示した解析対象として扱う。
- シンボリックリンクでプロジェクト外へ出る参照は自動で読まない。入力不足として対象と理由を表示する。
- 対象内の読めないファイルやサイズ上限による除外は黙って無視せず、coverageとdiagnosticsに記録する。

## 判定モデル

状態、重大度、証拠の確度を別のフィールドとして持つ。

| 状態 | 意味 |
| --- | --- |
| PASS | 定義した検査条件を満たした。対象・方法・確認範囲を併記する |
| FAIL | 適用条件と入力が確認でき、検査条件に反する事実がある |
| NEEDS_REVIEW | 疑わしい候補があるが、適用条件または実際の動作の確認が必要 |
| NOT_APPLICABLE | 当該機能が対象外と確認できた。根拠を必要とする |
| UNKNOWN | 必要な入力や実装を確認できず判断できない |
| ERROR | 解析やルールの実行に失敗した。通常の合否と区別する |

重大度はHIGH・MEDIUM・LOWとする。未解消の場合の影響を表し、NEEDS_REVIEWにも付与できる。FAILまたはNEEDS_REVIEW以外ではseverityはnullにする。

証拠の確度はHIGH・MEDIUM・LOWとし、説明を付ける。確率や審査通過率には換算しない。設定ファイルの解析結果と、キーワードが見つかったという事実は異なる強さの証拠として扱う。

「検出できなかった」を「機能が存在しない」に変換しない。認証SDKの導入だけでアカウント作成機能があると断定しない。利用者の申告だけでコードの実装済みを示すPASSにはしない。

### 総合表示

MVPの既定表示は、確認済み項目、重大度別リスク件数、要確認件数、UNKNOWN・ERROR、検査実行状況とする。冒頭に「Skill基本監査」「CLI静的監査」「CLI＋Skill確認」など実行範囲を明記する。HIGH・MEDIUM・LOWのリスク件数は未抑制のFAILとNEEDS_REVIEWを合計し、元の状態件数・FAIL内訳・抑制件数も表示する。

初期コンセプトの82 / 100のようなスコアは後続機能とする。MVPでは未検査の項目がある状態を単一の点数で隠さない。将来追加する場合も、算式・適用ルール・未確認件数を公開し、通過確率とは呼ばない。

coverageには、全チェック件数、状態別件数、実行された検査手順の割合を記録する。割合は`PASS・FAIL・NEEDS_REVIEW・NOT_APPLICABLEの件数 / 全チェック件数`とし、判断が確定した割合とは呼ばない。対象外項目にも根拠が必要である。

## 初期ルール

Appleの条件を要約した実装方針は、ルールに対応する公式資料を根拠にする。以下の重大度はSmoothSubmitの優先順位であり、Appleが定めた重大度ではない。

| ルールID | 項目と適用条件 | MVPの判定・確認方法 | 重大度の初期値 |
| --- | --- | --- | --- |
| ARG-PERM-001 | 保護されたリソースへのアクセスと権限説明 | カメラ・マイク・位置情報・写真・連絡先のAPI候補と、該当する権限キーを照合。対象構成で必須キーの欠落・空文字が確定した場合はFAIL。間接呼び出しや設定未解決は要確認・UNKNOWN | HIGH |
| ARG-PERM-002 | 権限説明の内容 | 説明が何の機能に必要かをSkillが確認。プレースホルダーや用途不明は要確認。文章の存在のみでは内容のPASSにしない | MEDIUM |
| ARG-PRIV-001 | Privacy Manifestの構造 | 存在するManifestのplist構造、値の型、対応カテゴリ・理由コードを検査。壊れたManifestはFAIL、読み取り障害はERROR。ファイルがない場合は適用条件へ進む | HIGH |
| ARG-PRIV-002 | Required Reason APIの宣言 | 検出可能なAPI利用候補と、該当バンドルの宣言を照合。アプリ自身の利用とSDKの利用を分ける。対応範囲で宣言不足を確定できた場合はFAIL、候補だけなら要確認 | HIGH |
| ARG-SDK-001 | SDKの申告・Manifest確認 | 依存一覧をAppleの対象SDK一覧と照合。対象SDKのManifest確認を要求する。取得できない依存実体や署名・最終バイナリはUNKNOWN。SDK名だけで危険・禁止と断定しない | MEDIUM |
| ARG-AUTH-001 | アカウント作成がある場合の削除導線 | 登録・自動アカウント生成の候補から、設定画面と削除処理をSkillが追う。削除ではなくログアウト・無効化のみなら要確認。バックエンドの削除完了は別途検証を要求 | HIGH |
| ARG-AUTH-002 | 第三者ログインの適用条件と代替手段 | 第三者サービスが主アカウントの認証に使われるか、4.8の例外が適用されるかを確認。Sign in with Apple等の実装・設定を調べ、条件不足は要確認 | HIGH |
| ARG-IAP-001 | 復元可能な購入がある場合の復元導線 | 製品種別、復元操作、処理とUIの接続をSkillが確認。StoreKit 1・2を考慮。ボタン名やAPI名の存在だけでPASSにしない | MEDIUM |
| ARG-IAP-002 | 購入結果と利用権の扱い | 成功・キャンセル・保留、トランザクション検証、更新の候補を確認。単一のAPIパターンを必須にせず、実機・Sandboxのテスト項目を生成 | MEDIUM |
| ARG-REVIEW-001 | ログイン等で審査アクセスが制限される場合の準備 | ローカル設定から、アクセス手段とReview Notesの準備状況を確認。未入力はUNKNOWN、不足の申告は要確認。App Store Connectへの登録済みとは断定しない | MEDIUM |
| ARG-PRIV-003 | プライバシーポリシーへの導線 | アプリ内導線と利用者が入力したURLを確認。UI接続や公開状態が未確認なら要確認。URLのネットワーク検査はMVPに含めない | MEDIUM |
| ARG-PAY-001 | 外部購入への誘導候補 | 外部リンク、購入文言、商品種別の候補を集める。販売地域・OS・端末・配信方法・契約・Entitlementを付けて要確認として提示。MVPでは自動FAILにしない | HIGH |
| ARG-BUILD-001 | 提出時の最低対応OS | 選択構成のDeployment Targetと有効な提出条件を照合。解決済みの値が13未満なら現行条件でFAIL。未解決はUNKNOWN。アーカイブの値は未確認と明示 | HIGH |
| ARG-BUILD-002 | 提出ビルドのXcode・SDK | ローカル申告のビルド版・SDK・ビルド識別子・確認日を現行条件と照合。不足の申告は要確認、未入力はUNKNOWN。MVPは提出バイナリを解析しないため実績を静的PASSにしない | HIGH |
| ARG-PRIV-004 | 個人データの第三者共有・第三者AI送信 | 送信候補、データ種別、送信先説明、事前の明示同意と通信開始の順序をSkillが確認。SDK・URLだけで送信内容を断定しない。実際の通信とバックエンドは追加確認 | HIGH |
| ARG-PRIV-005 | ATTの適用と許可前の追跡 | 広告・計測・データブローカーへの共有候補と機能申告を照合。必要な場合の権限説明・許可前後の挙動を確認。すべての分析SDKを追跡と扱わず、OS・地域で利用可能なUIを区別 | HIGH |
| ARG-REVIEW-002 | 年齢レーティング・プライバシー申告の準備 | 年齢質問への回答準備、SNS等の機能、SDKを含むデータ収集とPrivacy Nutrition Labelsの整合を確認。回答未入力はUNKNOWN、不一致候補は要確認。実際の登録内容は未検証 | MEDIUM |
| ARG-CONTRACT-001 | 契約・地域別申告の準備 | DPLAの更新確認、有料アプリ・IAPの場合のPaid Apps Agreementの有効性、Trader statusの申告準備とEU配信時の必要情報確認を案内。未入力はUNKNOWN、不足の申告は要確認。法的身分や契約の成立を自動判定しない | MEDIUM |
| ARG-IAP-003 | 自動更新サブスクの購入前表示 | 商品名・期間・価格、プライバシーポリシー・利用規約への導線をSkillが確認。実際の製品情報との一致と購入前表示を追加検証。単なる文字列の存在ではPASSにしない | MEDIUM |

権限APIとキー、Required Reason APIのカテゴリと理由、対象SDK一覧はデータとして版管理する。検出候補を追加する際は、正例・反例・間接実装・未解決入力のfixtureを必須にする。

### ルール解釈の注意点

アカウント削除では、アプリ内から削除を開始できるか、単なる無効化になっていないかを確認する。画面上のボタンだけではサーバー上の処理まで確認できない。[Appleのアカウント削除案内](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)

ログインの判定では4.8の対象・例外と、同等な代替ログイン手段の要件を確認する。「第三者ログインがあるので必ずSign in with Appleが必要」と一律には判定しない。審査アクセスでは2.1を確認する。[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

購入復元は復元対象の購入と導線を確認する。StoreKit 2では利用権の自動更新も考慮し、`AppStore.sync()`の文字列が見つからないことだけで違反とはしない。修正時に同期呼び出しを追加する場合は、ユーザーの明示操作から呼ぶ。[Appleのsyncの説明](https://developer.apple.com/documentation/storekit/appstore/sync%28%29)

Manifestの存在だけでは、API利用・理由・SDK・バンドルへの配置を確認したことにならない。アプリ自身の宣言でSDKの宣言まで補えるとは扱わない。[Required Reason API](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api)、[対象SDKの要件](https://developer.apple.com/support/third-party-SDK-requirements/)

権限説明は機能と用途を照合する。[カメラの権限キー](https://developer.apple.com/documentation/bundleresources/information-property-list/nscamerausagedescription)、[明確な権限説明の案内](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-purpose-strings)

第三者AIへの個人データ共有は5.1.2(i)の説明・明示許可の条件を確認する。Foundation Models frameworkを使うアプリには、DPLA 3.3.11(A)と専用のAcceptable Use Requirementsも確認する追加手順を提示する。クラウドAIの送信と端末内モデルを分け、MVPでモデル出力の安全性を自動認証しない。[審査ガイドライン](https://developer.apple.com/app-store/review/guidelines/)、[DPLA](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)

日本の外部決済案内は、日本ストアのiPhone・iOS 26.2以降などの適用条件を持つ。EUには別の現行条件がある。ATTのEU向けUI変更はiOS／iPadOS 27.2からの条件として扱い、許可が必要となる追跡の定義が変更されたとは解釈しない。[日本の決済案内](https://developer.apple.com/support/payment-options-on-the-app-store-in-japan/)、[EUの変更](https://developer.apple.com/support/apps-in-the-eu)、[ATTの案内](https://developer.apple.com/app-store/user-privacy-and-data-use/)

自動更新サブスクはPaid Applications AgreementのSchedule 2 §3.8(b)等の表示条件を確認する。年齢・プライバシー・契約・地域別申告の項目は、ローカルの準備確認とApp Store Connectでの登録確認を別のsubjectで保持する。[Schedules 2・3](https://developer.apple.com/support/downloads/terms/schedules/Schedule-2-and-3-English.pdf)

## レポートとデータ契約

### 指摘に必要な情報

各チェックは、安定したルールID、対象、状態、重大度、証拠の確度、判断の理由、確認範囲を持つ。FAIL・NEEDS_REVIEWには、確認または修正の方法と、解消を確認する条件を付ける。

証拠には、プロジェクト相対パス、行番号またはplistのキーパス、何を観測したかを記録する。候補がない場合は検索範囲と検出方法を記録する。存在しないコードや行番号を生成しない。

検証の種類は`static`、`ai_review`、`user_attestation`、`runtime`とする。MVPはstatic・ai_reviewを実行し、手動確認の結果はuser_attestationとして記録できる。runtimeは後続機能用に予約し、MVP自身が実行したと記録しない。

### CLI auditのJSONトップレベル

| フィールド | 内容 |
| --- | --- |
| schemaVersion | 初版は1.0.0。破壊的変更ではメジャー版を変更 |
| auditId・createdAt | 一意な監査IDとUTCのISO 8601日時。画面表示は利用者のタイムゾーン |
| toolVersion・rulepackVersion | CLIとルールパックのバージョン |
| policyContext | assessmentDate、plannedSubmissionDate、knowledgeAsOf、対象ストア・OS・端末・配信方法、適用した要件のIDと版、未確定の施行条件 |
| scope | プロジェクト、ターゲット、構成、対応プラットフォーム、除外範囲 |
| snapshot | Git HEADは取得できる場合のみ。dirty、入力ファイルのハッシュ一覧、設定ハッシュ |
| execution | CLIのauditはmode=staticと完了・部分完了。AI実行情報は別assessment、統合reportはmode=assisted。Skill単体は別basic-auditでmode=basic |
| coverage・summary | 状態別件数、実行状況、重大度別リスク件数（FAIL＋NEEDS_REVIEW）とFAIL内訳、要確認・未確認件数 |
| checks | 全適用候補の結果。PASS・対象外・未確認も含める |
| diagnostics | 入力不足、未対応形式、除外、解析障害 |

checksの各要素は`checkId`、`ruleId`、`ruleVersion`、`subject`、`status`、`severity`、`confidence`、`confidenceReason`、`title`、`reason`、`evidence`、`sources`、`provenance`、`verificationLevel`、`limitations`、`remediation`、`verificationSteps`を持つ。チェックIDはルール・対象・検査対象キーから決め、行の移動だけで変えない。

sourcesにはsourceDocumentId、公式URL、確認した節、資料の改訂日（公表されている場合）、資料確認日を入れる。取得・確認していない資料を根拠として生成しない。証拠のprovenanceは`scanner`、`ai`、`user`を区別する。設定の申告とコード上の事実が食い違った場合、両方を残し、申告だけで問題を消さない。

静的レポートは保存後にAIが書き換えない。Skillの追加判断は、元のauditIdとsnapshotを参照する別の`assessment.json`として生成する。`report`コマンドがJSON Schema・状態制約・引用箇所・入力ハッシュの一致を検証して統合レポートを作る。ハッシュ不一致の場合は統合を拒否し、再監査を要求する。

assessmentの結果は元のstatic結果を保持したまま追加する。設定欠落などの確定FAILをAIがPASSへ上書きすることはできない。候補の解釈を更新した場合は、変更前後の判断と根拠を表示する。

基本監査の型・保存できない場合の表示・追加CLI検査の件数は[詳細データ契約](docs/DATA_CONTRACTS.md)に従う。19ルールのsubject別完了条件は[ルール判定契約](docs/RULE_CONTRACTS.md)、入力形式の対応範囲は[入力対応契約](docs/INPUT_SUPPORT.md)に定義する。

### ターミナルの出力例

```text
SmoothSubmit
Target: SampleApp / Release
Scope: static + AI review

HIGH                2  (FAIL 1 / NEEDS_REVIEW 1)
MEDIUM              2  (NEEDS_REVIEW 2)
UNKNOWN             2

HIGH  Camera permission
CameraView.swift:42 にカメラAPIの利用があります。
対象構成のNSCameraUsageDescriptionが空です。
→ 利用目的を記載し、権限要求時の動作を確認してください。

HIGH  Account deletion  NEEDS REVIEW
アカウント作成の候補があります。
確認した設定画面では削除への導線を特定できませんでした。
→ 導線と削除処理を確認してください。

PASS  Privacy Manifest syntax
plistの構造は検査条件を満たしています。
API利用理由・SDK・提出バンドル全体の確認は別項目です。
```

CLIなしの出力例：

```text
SmoothSubmit Audit — Skill基本監査

基本監査は完了
確認範囲：関連ファイルの読取とAIによるコード確認

確認済み
✓ Privacy Manifestの読取範囲の構造
✓ Cameraの権限説明

要確認
? 配信対象地域
? デジタルコンテンツへの課金有無
? Review Accountの準備状況
? Kids Category対象か

HIGH     1
MEDIUM   3
UNKNOWN  4

→ リスクごとの根拠・修正案・再確認条件を表示
→ CLI導入で追加できる静的検査を計画から列挙
→ 追加で4点確認すると監査精度を上げられます
```

確認済みは記載した範囲に限り、CLIによる構造検証や提出バンドルの検証済みを表さない。CLI追加件数を算出できる場合だけ「追加○項目」と表示する。

## CLIとSkillの操作

以下は目標MVPのインターフェース仕様。初期alphaでは基本CLI・Skillを実装しており、導入手順と実際の対応範囲はREADMEと公開版の状態に従う。

| 操作 | 動作 |
| --- | --- |
| `smoothsubmit init` | プロジェクト候補を調べ、設定テンプレートを生成。既存設定を上書きしない |
| `smoothsubmit audit --project App.xcodeproj --target App --configuration Release` | 選択対象の静的監査を実行して保存 |
| `smoothsubmit report --audit <audit.json> --assessment <assessment.json>` | Skillの判断を検証して統合レポートを出力 |
| `smoothsubmit fix --audit <audit.json> --check <checkId>` | 対象指摘の修正指示を生成。ソースは編集しない |
| `smoothsubmit verify --baseline <audit.json>` | 同じ対象を静的再監査し、前回との比較を出力 |
| `smoothsubmit rules list` | ルール・適用条件・資料確認日を表示 |
| `smoothsubmit doctor` | 対応環境、設定、Skill、ルールの整合性を検査 |

auditは`--workspace`、`--sdk iphoneos|iphonesimulator`、`--arch`、`--path`、`--config`、`--output`、`--language ja|en`、`--format text|json`を受け付ける。CLI引数のproject・workspaceを両方指定した場合はエラーとする。CLIで片方を指定した場合は設定の対象選択を置き換え、最終的な対象をレポートに記録する。`--config -`はstdinから設定JSONを読み、ファイルの設定を置き換える。Skillは回答をセッション内の設定として渡せるため、smoothsubmit.config.jsonを書き換える必要はない。JSON指定時のstdoutは結果JSONだけとし、進捗と診断はstderrへ出す。

assistedの再確認は、まずverifyで新しい静的監査を作り、Skillがその結果に対するassessmentを生成する。その後、`verify --baseline <old-audit.json> --audit <new-audit.json> --baseline-assessment <old-assessment.json> --assessment <new-assessment.json>`で既存の新旧結果を比較する。`--audit`指定時は監査を再実行せず、参照するaudit・assessmentの整合性を検証する。

設定を明示的に作成した場合はJSON Schemaで検証する。Skill基本監査は設定ファイルなしで開始でき、推測した機能と利用者が確認した情報を区別する。機能申告は`true`・`false`・`unknown`を区別し、未入力をfalseとしない。保存項目は対象、accountCreation、loginRequired、authProviders、productTypes、permissions、storefronts、reviewAccess、reviewNotesPrepared、privacyPolicyURL、除外設定とする。加えてplannedSubmissionDate、distributionChannel、deviceFamilies、reportedBuild、thirdPartyDataSharing、thirdPartyAI、tracking、paidApp、socialNetworking、kidsCategory、submissionPreparation、metadataDeclarations、storekitFiles、任意のmanualVerificationsを保持する。manualVerificationsは利用者が確認した対象・方法・結果・確認日時・確認範囲を記録し、user_attestationとして扱う。機密値や実際のユーザーデータは保存しない。

reportedBuildは利用者が申告するXcode・SDKの版、ビルド識別子、確認日とし、scannerの実測値と区別する。submissionPreparationは年齢質問、SNS機能申告、プライバシー回答、DPLA更新確認、Paid Apps Agreementの状態、Trader status申告・必要情報確認の準備状況を項目別に持つ。true・false・unknownを用い、契約版・確認日・申告者の任意ラベルだけを補足にする。銀行・税務・住所・本人確認資料は保存しない。

reviewAccessは`demo_account`・`demo_mode`・`none`・`unknown`と、準備状況・必要な補足だけを保持する。実際のメールアドレス・パスワード・認証トークンを設定へ保存しない。

### 終了コード

| コード | 条件 |
| --- | --- |
| 0 | コマンドが完了し、指定した失敗条件に該当しない。審査適合を意味しない |
| 1 | 引数・設定・対象解決のエラー。監査を開始できない |
| 2 | `--fail-on high|medium|low`の閾値以上のFAILがある |
| 3 | `--require-complete`指定時に未解決のNEEDS_REVIEW・UNKNOWN、有効な抑制、またはcoverage.partialがある |
| 4 | 検査・解析・保存の障害がある |

閾値のmediumはHIGHとMEDIUM、lowは全重大度を含む。既定では`--fail-on`を無効にする。有効な抑制のある指摘は閾値判定から除くが、元の状態と件数は保持し、`--require-complete`では不完全として扱う。同時に該当する場合は4、1、2、3の順で優先する。検査障害時も保存可能なら部分レポートを残す。audit・report・verifyの終了コードは判定したレポートの範囲に対して適用し、CLIのみの成功をSkill確認の成功として扱わない。init・fix・rules・doctorは生成・診断の完了を判定する。fixは指示書生成が完了すれば、参照した監査にFAILがあっても0とする。

### Skillの操作

操作は`audit`・`fix`・`verify`・`notes`を提供する。Claude Codeは`/smoothsubmit`、Codexは`$smoothsubmit`、CursorはAgentチャットの`/`からSkillを選び、操作と対象を添えて起動する。配置先と公式資料は設計書のSkillの設計に定義する。自動トリガーはホスト側の仕様に従い、明示起動と同じ製品側の動作制約を適用する。

Skillは対象内の関連ファイルを直接読み、CLI結果があれば追加の根拠として利用する。必要な参照資料・コードを確認し、候補を説明する。未確認の事業条件を補完せず、結果に影響する情報だけを利用者へ確認する。CLIがない場合はSkill単体の基本監査を標準として完了し、CLI監査済みとは表示しない。通常の監査要求だけでnpx取得・CLI導入・設定の初期化はしない。引数を省略した明示呼び出しもauditを既定操作にする。「修正案を作って」は指示書生成、「修正して」は対象コードの変更を含む依頼として区別する。

`fix`は利用者が依頼した指摘のコード変更をAI開発ツールで進められる。対象外の機能変更や実際の購入・アカウント削除を含めない。既存の作業内容を尊重し、必要なテストと再監査へ進む。

`notes`は確認できた情報からReview Notesの下書きを生成する。機能、審査導線、課金へのアクセス、必要な環境、未確認事項を含める。審査アカウントの秘密情報はプレースホルダーにし、App Store Connectへ自動登録しない。

## 修正と再確認

修正指示は、対象のcheckId（基本監査ではlocalCheckIdでも可）・auditId、入力snapshotまたは確認範囲、証拠、変更が必要な理由、修正対象、望まれる動作、制約、テスト、再確認条件を含む。APIキーや認証情報の新規入力が必要な場合は、秘密情報を含む例を生成しない。

アカウント削除の修正では、見た目だけのボタンを追加して完了にしない。削除開始から認証・バックエンド処理まで、存在する構成に合わせた変更と確認事項を生成する。バックエンドが対象外なら、UI実装と未検証のサーバー処理を分けて報告する。

再確認の比較は次の分類を使う。

| 比較結果 | 条件 |
| --- | --- |
| RESOLVED | 前回FAIL・NEEDS_REVIEWだった同じ対象の指摘が、必要な確認条件を再実行してPASSになった |
| UNCHANGED | 指摘と状態が継続している |
| CHANGED | 指摘は継続しているが状態・重大度・適用条件が変わった。改善・悪化を区別して表示 |
| NEW | 前回なかったチェックがある。新規問題の集計はFAIL・NEEDS_REVIEWに限る |
| NEEDS_RECHECK | ファイル削除、解析範囲の縮小、入力不足などで再評価できない |
| NOT_COMPARABLE | 対象・構成・ルール版などが変わり、そのまま比較できない |

前回の指摘が出力から消えただけではRESOLVEDにしない。NOT_APPLICABLEへの変更はCHANGEDとして表示し、修正済みと混同しない。AI確認項目はCLIの再実行だけで解消扱いにせず、Skillによる再評価または種類を明示した手動確認を必要とする。NEEDS_RECHECKとNOT_COMPARABLEをCHANGEDより優先し、再評価不能を改善と表示しない。

Skill単体の基本監査はbasic結果同士を再評価し、CLI結果と同等の構造検査が行われたとは表示しない。CLIのverifyはstatic結果同士を比較し、assisted結果の解消は保留する。Skillのverifyは新しいassessmentを生成し、統合後にassisted結果同士を比較する。ルールの互換性が保証される場合だけ版をまたいで比較し、変更点を表示する。

## ルールの管理と誤検出対応

ルールは、ID、版、説明、適用条件、必要入力、対応検査、状態ごとの判定条件、重大度、sourceDocumentId、公式URL、資料確認日、修正方法、検証方法、制約を持つ。検出ロジックと説明文を別に版管理し、リリースノートで判定への影響を示す。

配布するルールパックは検証済みの宣言データと同梱コードに限る。プロジェクト内の任意スクリプトやネット上のコードを、ルールとして自動実行しない。Apple資料の全文転載や全ページの自動収集を前提とせず、必要なリンクと独自の短い説明を保持する。

初期の資料確認日は2026年10月7日とする。ルールパックのknowledgeAsOfと、各資料のverifiedAtを出力する。確認から90日を超えたルールには更新確認の必要性を表示する。90日未満でも最新性の保証とは扱わない。リリース前に提出要件・Guidelines・契約一覧・地域別案内を再確認し、資料の変更からルール改訂までの差分を記録する。

提出・地域条件は独立したrequirementレコードとして版管理する。ID、sourceDocumentId、sourceRevision、publishedAt、verifiedAt、lifecycle（active／announced／retired）、effectiveFrom、effectiveMonth、datePrecision（day／month／unknown）、effectiveOSVersion、storefronts、deviceFamilies、distributionChannels、商品・機能条件を持つ。公表されていない日付はnullにし、推測で補わない。OSのavailability条件と暦上の施行日は別に評価する。

assessmentDateをUTC日時とともに記録し、日付単位の提出条件との評価に用いたカレンダー日を明示する。plannedSubmissionDateが未入力ならassessmentDateで現行条件を評価する。将来の条件は移行案内として表示し、現在のFAILへ加算しない。将来日での予測は現行結果と分け、月単位でしか公表されていない境界月は要確認とする。施行月を過ぎたのに日付・条件が再確認できていない場合は資料更新のUNKNOWNを残す。販売地域が未入力の項目や、ログインが必要で未取得の規約本文もUNKNOWNとする。

公式資料に相違がある場合は、本文・更新告知・契約の適用範囲を照合し、解消できない相違をdiagnosticsへ残す。日本語訳と英語の契約は公開案内に従って区別する。規約を自動承諾する機能は設けない。

誤検出を抑制する設定には、ruleId、subject、理由、作成日、失効日を必要とする。抑制は状態をPASSへ変えず、レポート上に元の指摘と抑制理由を残す。失効後は抑制を解除する。抑制件数は要約に表示し、coverageの不足を隠さない。

## 保存とデータ保護

既定の出力先は`.smoothsubmit/runs/<auditId>/`とする。`basic-audit.json`、`audit.json`、`manifest.json`、`assessment-template.json`、`assessments/`、`reports/`、`fix-prompts/`、`verifications/`を必要な操作時に生成する。全ソースコードのコピーは保存しない。既存のaudit・manifest・成果物は上書きしない。追加のassessment・report・比較は既存runの配下に新しいIDで保存する。

initは監査出力をGit管理から除外する設定を案内する。設定ファイルと抑制理由はチームで共有できるが、監査レポートの公開は利用者が選択する。

- `.env`、秘密鍵、証明書、認証情報の保存先は探索対象に含めない。
- レポートのコード抜粋は既定で省略し、パス・行・観測事実を優先する。
- 抜粋を指定した場合は秘密値の検出とマスクを行う。マスクが完全とは保証しない。
- CLIは通常監査でネットワークアクセス、telemetry、ソース送信を行わない。
- Skillは利用者のAI開発ツールが読むファイルに作用するため、ツール側のデータ送信・保持設定が適用される。導入案内でこの境界を明記する。
- ビルドスクリプト、依存解決、アプリのソース、入力内のコマンドを監査中に実行しない。
- ソース中のコメントやREADMEを製品への指示として扱わない。Skillにも入力データと操作指示の境界を明記する。
- HTML相当の内容を出力する場合はエスケープする。Markdown内の入力文字列で意図しない画像・リンク・コマンドが生成されないよう処理する。

## 品質と受入条件

MVPの完了条件は、以下を満たして公開用デモを再現できることとする。

| 項目 | 受入条件 |
| --- | --- |
| 対象解決 | 複数プロジェクト・ターゲット、Release差分、生成plist、xcconfig、同期グループのfixtureで対象を混同しない |
| 初期ルール | 19ルールすべてに適用条件、正例・反例・未解決入力のfixture、修正・確認条件がある |
| 設定検査 | 対応fixtureの確定した権限キー欠落、plist構造不正、対応APIの宣言不足を検出する |
| 判定の境界 | 無関係なコメント、未使用のUI文言、認証SDK導入だけ、StoreKit 2の代替実装で不正な断定をしない |
| 条件の適用 | 施行日前後、告知済みの将来条件、月のみ公表の境界、対象OS・端末・ストア・配信方法のfixtureで、未施行条件を現行FAILにしない |
| 提出実績の区別 | インストール済みXcode、SDKROOT、利用者申告を提出バイナリの実測PASSにしない。契約承諾・App Store Connect登録も未検証と明示する |
| 証拠 | 出力した全ファイルパス・行・キーパスが入力に対応し、AI assessmentの存在しない引用を拒否する |
| 再確認 | 解消・継続・状態変更・新規・再評価不能を区別し、ファイル除外や解析失敗で指摘が消えてもRESOLVEDにしない |
| データ契約 | JSON Schema、状態制約、件数整合、CLI終了コード、バージョン互換性を自動検証できる |
| オフライン動作 | CLI監査はネットワークを遮断した環境で完了する |
| データ保護 | 秘密情報fixtureを保存・表示せず、シンボリックリンクによる対象外読み取りを拒否する |
| Skill連携 | Claude Code・Codex・CursorそれぞれでCLIなしの基本監査・修正案・不足情報の質問・再評価を完了し、通常呼び出しでコード・設定を変更しない。CLIあり／故障時と明示修正・再確認の実行記録もある |
| Skillの判断 | 登録・削除・ログイン・復元の固定シナリオで、証拠と限界を保持し、確定FAILを上書きしない |
| 再現性 | 同じ入力とルール版のstatic結果は同じ。日時・IDを除いて安定し、AI結果との差を明示する |

検査CLIの性能目標は、Apple Silicon・16GBメモリ、入力1,000ファイル・20MBのfixtureで30秒以内、最大メモリ512MB以内とする。モデル実行時間は含めない。実装時にOS・Node版・測定方法を記録し、目標値と実測値を分ける。対象上限は10,000ファイル、入力集合合計100MiB、1ファイル5MiBとし、超過時は診断と不完全なcoverageを返す。

自動テストはparser、ルール、レポート、比較、インストールの責任単位で行う。Skillは固定された実装シナリオと各対応ツールでの実行記録を使って評価する。外部決済や適用条件不明のケースを一律に違反とする結果は不合格とする。

## OSSの公開と配布

GitHubを正規の公開先とし、ソース・ルール・Skill・デモ・検査fixtureを同じリポジトリで管理する。ライセンスはApache-2.0とする。依存ライセンスと必要なNOTICEを公開前に確認する。

```text
smoothsubmit/
├── README.md
├── LICENSE
├── SPEC.md
├── DESIGN.md
├── packages/
│   ├── cli/
│   ├── contracts/
│   ├── core/
│   ├── scanner/
│   ├── rules/
│   └── report/
├── skills/smoothsubmit/
│   ├── SKILL.md
│   ├── references/
│   ├── scripts/
│   └── assets/
├── schemas/
├── tests/fixtures/
├── examples/
├── docs/APPLE_REFERENCES.md
└── .github/workflows/
```

第1段階はGitHub、npm、標準Skill配布を提供する。Skill導入は各ツール向けの配置手順を用意する。標準インストーラの導入例は検証後に`npx skills add <owner>/smoothsubmit`として案内する。npm CLIの導入・起動例は`npx @smoothsubmit/cli audit`とする。Skill単体の導入手順を先に示し、CLIを任意の追加導入として案内する。CLI未導入を監査不能や導入エラーとして表示しない。

第2段階でツール固有のプラグインを提供する。公式マーケットプレイスへの掲載は申請・対応条件を確認して進め、MVP公開条件にはしない。編集後の自動Hookは誤検出・遅延を評価してから導入する。

READMEには、対象ユーザー、出力例、導入と最初の監査、対応範囲、扱うデータ、判定状態、修正・再確認、誤検出の報告方法を載せる。Issueフォームには、ツール版、ルール版、対象構成、再現用の最小入力を求め、秘密情報やリポジトリ全体の公開を求めない。

リリースはCIでfixture・パッケージ導入・ネットワーク遮断監査を検証してから行う。Gitタグ、npmの版、ルール版、Skill版を対応表で管理する。ルールを追加・変更した場合は判定の変化と対応範囲をリリースノートに記載する。

## 公開デモと初期の利用検証

公開デモは、問題を意図的に含む小さなSwiftUIアプリと、修正後の状態を用意する。権限説明の欠落、登録機能と削除導線、購入復元の確認項目を例に、監査・修正・再確認の流れを見せる。架空のリジェクト通知や実績は生成しない。

ランディングページやREADMEの最初に監査レポートと修正前後を置き、60〜90秒の操作動画から導入へ進めるようにする。初期の発信先は、AI開発ツールの利用者とiOS個人開発者のコミュニティを中心とする。投稿・公開・送信は別の実行依頼で行う。

初期評価では、導入から最初のレポートまで到達できた割合、検出した問題が有用だった割合、誤検出の種類、修正後に再確認まで進んだ割合を確認する。これらは参加者の同意を得た利用検証で集め、CLIへ自動送信機能は入れない。GitHub Starsと導入件数だけで品質を評価しない。

## 実装の順序

1. JSON Schema、状態モデル、19ルールの判定条件・API台帳、fixtureを定義し、CLIなしで基本監査を完了するSkillを作る。
2. プロジェクト・ターゲット・構成と設定の解決、ファイル解析を実装する。
3. 設定・Manifest・SDKの静的検査と、ソース候補抽出を実装する。
4. JSON・Markdown・ターミナルの出力、終了コード、抑制設定を実装する。
5. Skill、assessmentの検証、修正指示、Review Notesを実装する。
6. 再監査、指摘比較、入力とルールの版の整合性確認を実装する。
7. 3つのAI開発ツールで確認し、配布パッケージ・README・デモを完成させる。

MVPの公開後、実際に多い入力不足と誤検出を優先して改善する。その後に、提出バンドルの解析、実機・Sandbox確認、App Store Connect情報、レビュー用Web画面、自動修正PRへ進める。

有料機能は後続の事業検証とする。候補は複数アプリの監査履歴、チームでの確認作業、継続監査、App Store Connect連携、導入支援である。MVPでは価格や課金方式を確定せず、ローカルの監査・修正指示・再確認を無料OSSとして公開する。

## 設計書との対応

仕様書は利用者に提供する振る舞いとMVPの受入条件を定める。設計書はCLIとSkillの境界、モジュールの責任、設定・監査・AI判断・比較のデータ契約、保存方式、検査処理、テストと実装順序を定める。

対象SDKの既定値はiphoneosとする。実装ではsdk・arch条件付き設定、未解決の継承、同期グループの例外を診断へ残す。単一ターゲットの監査を基本とし、複数対象のバッチ監査は後続とする。

Skillが既存の静的FAILに異論を持つ場合は、根拠を付けて追加確認を求められるが、元のFAILは変更しない。修正後の再監査で検査条件が満たされたことを確認する。

## 変更記録

- 0.6（2026年10月7日）：利用者の回答と仕様の確認結果を反映。データ・19ルールの判定・入力対応を付録へ定義。Skill単体で基本監査を完了し、CLIの導入を要求しない。監査後に判定を変える不足情報だけ質問して再評価する。通常動作は監査・修正案までとし、ソース・設定の変更は明示指示時に限定した。

- 0.5（2026年10月7日）：仕様の見直しを開始。履歴表示と新規AI統合、保存済み成果物と追加生成、部分検査の終了条件、手動確認の対象ハッシュを区別した。質問への回答と残りの曖昧さは確認記録で追跡する。

- 0.4（2026年10月7日）：SmoothSubmitを正式名に決定。CLI・Skill・設定・保存先を統一し、npm配布名を@smoothsubmit/cliとした。設計書との対応、SDK条件、保存方式と終了コードの責任範囲を明確化した。
- 0.3（2026年10月7日）：公開名をReleaseworthyへ暫定変更。価値を表す副題・タグラインを追加し、CLI・Skill・設定・保存先の名称を統一。ルールIDは継続する。
- 0.2（2026年10月7日）：Apple公式の提出要件・契約・地域別案内を確認。7ルールを追加し、計19ルールとした。現在と将来の要件、OSとSDK、ローカル準備と提出実績の区別を追加した。公式資料の対応表と確認限界はdocs/APPLE_REFERENCES.mdに記録した。
- 0.1（2026年10月7日）：SkillとローカルCLIによるOSS MVPの初版を作成した。
