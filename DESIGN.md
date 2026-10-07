# SmoothSubmit 技術設計書

作成日：2026年10月7日\
設計バージョン：1.2\
対応仕様：SPEC 0.6\
対象：OSS MVP\
状態：目標MVPの設計。初期alphaのコード・CLI・Schema・Skillを実装。実際の対応・検証範囲は[公開版の状態](docs/RELEASE_STATUS.md)に従う。

SmoothSubmitは、Skillがローカルの関連ファイルを直接確認して基本監査を完了する。導入済みCLIは、Xcodeプロジェクトから再現可能な追加の静的検査結果を作る。修正後に同じ対象を再検査し、どの条件が解消したかを比較する。本書はこの処理を実装するモジュール、データ契約、保存方式、判定の境界を定義する。

利用者向けの動作と受入条件は[プロダクト仕様書](SPEC.md)、Appleの要件と資料確認日は[公式資料台帳](docs/APPLE_REFERENCES.md)に従う。仕様確認の質問と決定は[確認記録](docs/CLARIFICATION.md)で追跡する。審査基準の説明を本書で重複管理しない。

## 設計上の決定

| 項目 | 決定 |
| --- | --- |
| 提供方式 | Skillを入口とし、CLIなしで基本監査を完了する。追加CLIも同じOSSリポジトリで配布。製品サーバーは設けない |
| 実行環境 | Skill基本監査はホストのファイル読み取り機能で実行し、Node.jsを必須にしない。追加CLIはmacOS 14以上、Node.js 22.18以上。TypeScriptから生成したJavaScriptを配布 |
| npmとCLI | 採用予定パッケージ@smoothsubmit/cli、bin名smoothsubmit。スコープの確保は公開前に実施 |
| モデル実行 | Claude Code・Codex・Cursor側で実行。CLIはLLM APIを呼ばない |
| 検査データ | 静的監査、AI判断、利用者申告を区別し、静的監査を保存後に書き換えない |
| 解析方式 | pbxprojは構造解析、plistはplutil、Swiftは字句解析と限定したパターン検出 |
| 永続化 | プロジェクト内のJSON・Markdown。データベースは導入しない |
| データ検証 | JSON Schema Draft 2020-12と追加の意味検証。初版データ版1.0.0 |
| 結果表示 | 件数、証拠、未確認事項を表示。通過確率や総合点をMVPに入れない |
| ライセンス | Apache-2.0。公開前に依存ライセンスとNOTICEを確認 |

インストール時のパッケージ取得と、監査時のネットワーク不要は区別する。オフライン監査の検証はCLIとルールを導入済みの環境で行う。

## 全体構成

```text
「SmoothSubmitで確認して」
            │
Skill：対象候補を認識 → 関連ファイルを直接確認
            │
            ├─ CLIなし／利用不可 → 基本監査 basic-audit.json
            │
            └─ 対応CLIあり → Scanner → Rule Engine
                                      │
                             audit.json + manifest.json
                                      │
                             Skill assessment → 統合report
            │
            └──────── リスク・修正案・未確認事項を提示
                                      │
                      判定が変わる不足情報だけ質問
                                      │
                              回答に応じて再評価
                                      │
                    明示的な修正依頼 → 修正・必要なテスト
                                      │
                        新しい監査 → 前回との比較
```

CLIは入力を読み、監査記録と指示書を生成する。ソース変更は利用者が修正を依頼したAI開発ツールが担当する。修正が終わると新しいrunを作る。以前の結果に「直った」と追記して監査を済ませない。

## リポジトリとモジュール

以下は実装時に作成する構成。現時点で実装済みのディレクトリ一覧ではない。

```text
smoothsubmit/
├── SPEC.md
├── DESIGN.md
├── README.md
├── LICENSE
├── package.json
├── package-lock.json
├── packages/
│   ├── contracts/       型・Schema・意味検証
│   ├── core/            処理の組み立て・保存・比較
│   ├── scanner/         ファイル解析・対象解決・証拠収集
│   ├── rules/           検出器・ルール定義・requirement・資料台帳
│   ├── report/          統合・JSON・Markdown・ターミナル出力
│   └── cli/             引数・入出力・終了コード
├── skills/smoothsubmit/
│   ├── SKILL.md
│   ├── references/      対象別の確認手順とassessment記入規則
│   ├── scripts/         固定されたCLI呼び出し補助
│   └── assets/          修正指示・Review Notesのテンプレート
├── schemas/             公開JSON Schema
├── tests/fixtures/       合成したXcodeプロジェクトと期待結果
├── examples/            問題を含むアプリ・修正後アプリ・出力例
├── docs/
│   ├── APPLE_REFERENCES.md
│   ├── NAMING.md
│   ├── CLARIFICATION.md
│   ├── DATA_CONTRACTS.md
│   ├── RULE_CONTRACTS.md
│   └── INPUT_SUPPORT.md
└── .github/workflows/
```

| モジュール | 入力 | 出力と責任 |
| --- | --- | --- |
| contracts | JSON・内部オブジェクト | 型、Schema、状態制約、安定した識別子の定義 |
| scanner | ルート、対象指定、検査設定 | ProjectModel、FactIndex、入力ハッシュ、診断。審査判定はしない |
| rules | FactIndex、申告、PolicyContext | チェック計画、静的結果、AIに渡す確認項目 |
| core | コマンドの要求、上記サービス | audit・report・fix・verifyの処理とファイル保存 |
| report | 静的結果、有効なassessment | 証拠を保持した統合結果と表示。集計はここで一元化 |
| cli | argv、stdin、環境 | コマンド選択、stdout・stderr、終了コード |
| Skill | 関連ファイル、任意のCLI結果、利用者回答 | 基本監査、AI判断、修正案、明示依頼時の修正、Review Notes下書き |

依存方向はcli → core → scanner／rules／report → contractsとする。scannerからrulesを参照せず、ルールがファイル探索・ネットワークアクセス・コマンド実行を直接行わない。ルールへの入力は収集済みの事実に限定する。

開発はnpm workspacesで管理する。公開するCLIは内部モジュールを含むdistを同梱し、未公開のworkspaceパッケージに依存しない。外部runtime依存はAjvとajv-formats、pbxproj・Swift・lockfile解析は同梱parserとする。開発依存はTypeScriptと対応Node 22の型定義を用い、初回実装時の安定版をlockfileで固定する。ビルドはTypeScriptで相対参照のJSツリーを出力し、内部モジュールをCLIの配布物へ含める。版の更新は依存更新PRで検証し、監査時に解決し直さない。

## 設定と入力の解決

### 設定例

```json
{
  "schemaVersion": "1.0.0",
  "project": "SampleApp.xcodeproj",
  "target": "SampleApp",
  "configuration": "Release",
  "sdk": "iphoneos",
  "language": "ja",
  "features": {
    "accountCreation": "unknown",
    "loginRequired": "unknown",
    "authProviders": "unknown",
    "productTypes": "unknown",
    "permissions": "unknown",
    "thirdPartyDataSharing": "unknown",
    "thirdPartyAI": "unknown",
    "tracking": "unknown"
  },
  "policy": {
    "storefronts": "unknown",
    "deviceFamilies": "unknown",
    "distributionChannel": "app_store",
    "plannedSubmissionDate": null
  },
  "reviewAccess": {
    "method": "unknown",
    "prepared": "unknown"
  },
  "reviewNotesPrepared": "unknown",
  "privacyPolicyURL": null,
  "reportedBuild": null,
  "submissionPreparation": {
    "ageRating": "unknown",
    "socialNetworking": "unknown",
    "appPrivacy": "unknown",
    "dpla": "unknown",
    "paidAppsAgreement": "unknown",
    "traderStatus": "unknown",
    "traderInformation": "unknown"
  },
  "exclude": [],
  "suppressions": []
}
```

`unknown`とfalseは区別する。値を省略した機能はunknownへ正規化し、未入力を「機能なし」にしない。unknownは配列の要素と混在させない。完全なキー一覧・enum・省略時の値は[詳細データ契約](docs/DATA_CONTRACTS.md)で定義する。以下は主要フィールドの要約であり、追加の任意キーを許す意味ではない。

| フィールド | 型と制約 |
| --- | --- |
| project／workspace | ルート相対パス。選択方式は一方のみ。workspace指定時も最終的には一つのアプリターゲットを選ぶ |
| target／configuration | 空でない文字列。構成の既定値Releaseがなければ選択を要求 |
| sdk／arch | sdkはiphoneosまたはiphonesimulator、既定値iphoneos。archはarm64・x86_64・unknown、既定値unknown。未指定のarch条件は未解決として扱う |
| featuresの有無フラグ | true・false・unknown |
| authProviders | unknown、またはapple・google・facebook・email・customの文字列配列。空配列は利用者による「なし」の申告 |
| productTypes | unknown、またはconsumable・non_consumable・auto_renewable・non_renewingの配列 |
| permissions | unknown、またはcamera・microphone・location・photos・contactsの配列 |
| storefronts | unknown、または同梱地域台帳にある大文字2文字コードの非空配列 |
| deviceFamilies／distributionChannel | 詳細データ契約の有限enumに従う。端末はunknownが既定。配信方法の既定app_storeは監査目的であり観測事実ではない |
| plannedSubmissionDate | YYYY-MM-DDまたはnull。入力する日付は利用者の予定でありAppleの施行日ではない |
| reviewAccess | methodはdemo_account・demo_mode・none・unknown、preparedは有無フラグ、補足は任意の文字列 |
| reportedBuild | null、またはxcodeVersion・sdkVersion・buildId・verifiedAt・任意の申告者ラベル |
| submissionPreparation | 上記の準備項目ごとの有無フラグ。契約版・確認日・申告者ラベルは任意の補足レコード |
| manualVerifications | 任意の配列。checkId、対象scope、method、conclusion、observedAt、確認したsnapshotハッシュ、limitations、任意の申告者ラベルを保持。conclusionはpass・fail・unknown |
| exclude | pathPatternとreasonを持つ配列。検査範囲の縮小として表示 |
| suppressions | ruleId・subjectKey・reason・createdAt・expiresAtを持つ配列。ワイルドカードの一括抑制はMVP対象外 |

reviewAccessにはパスワード・トークン・審査用メールアドレスを保存しない。privacyPolicyURLのhttp／https以外のスキームは拒否する。Schemaは未知のフィールドを拒否し、誤字を黙って無視しない。

指定値の優先順位はCLI引数 → 設定ファイル → 既定値。CLIでprojectとworkspaceを同時に指定した場合は拒否し、片方を指定した場合は設定にあるもう一方を含む対象選択を置き換える。アプリの機能についてscannerの観測と利用者申告が衝突した場合、この優先順位で事実を消さず、双方を証拠として残す。

設定ファイルを書き換えずに利用者の回答を渡す場合、Skillは検証済みの設定と回答をセッション内で統合し、auditの`--config -`へstdinで渡す。取得元は申告として記録し、推測を申告へ変換しない。完全な正規化設定と設定入力元をmanifestへ保存し、再評価時もその前提を再利用できるようにする。詳細はデータ契約に従う。

### プロジェクト解析

1. ルートをrealpathで確定し、除外規則と読み取り予算を設定する。
2. xcodeprojとworkspaceを列挙し、明示指定がなければ一意な候補だけを選ぶ。
3. workspaceの参照を解決し、対象プロジェクトのpbxprojをOpenStep形式の辞書・配列として解析する。
4. native targetの製品種別からiOSアプリの候補を抽出する。拡張機能・テストターゲットをアプリに混ぜない。
5. 構成、build settings、ソース・リソース所属、依存ターゲットをProjectModelへまとめる。
6. 選択ターゲットに所属する入力と、その設定解決に必要な参照をInputManifestへ登録する。

pbxprojの字句解析はコメント、引用文字列、エスケープ、識別子、辞書、配列を扱い、値と元の位置を保持する。未知のobject typeは保存し、所属や設定に関係する未対応オブジェクトがあれば診断する。同期グループは、ルート、対象のfileSystemSynchronizedGroups、例外集合と所属除外を解決する。通常グループのsources／resourcesのbuild phaseと併せて扱う。

配置だけで所属を確定しない。リポジトリ内にManifestが存在しても、リソースとして組み込まれるか不明なら所属はunknown。SPMやPodsのSDK実体がない場合は、lockfileで名称を確認できてもManifest・署名の実体確認はunknownとする。

### Build settingsとxcconfig

対応形式・生成plist・同期グループの処理は[入力対応契約](docs/INPUT_SUPPORT.md)で定義する。

設定の層は製品が必要とする既定値 → projectのbase xcconfig → projectの設定 → targetのbase xcconfig → targetの設定 →明示した検査条件として解決する。一般的なXcode既定値を独自に網羅しているとは扱わない。各値には設定元・変数展開の経路・未解決理由を持たせる。

対応するxcconfig構文は代入、include、任意include、行継続、コメント、$(VAR)／${VAR}、$(inherited)、sdk／config／arch条件とする。条件評価に必要な値が不明なら、候補値を確定値へまとめない。循環参照、外部include、未対応の演算・変数修飾子は診断する。

生成Info.plistは既知のInfo.plist Values設定だけを取り込み、生成YES／NO、変数展開、既存plistとの一致・競合を入力対応契約の条件で検査する。未知のユーザー定義キーを生成値とみなさない。最終アーカイブを再現したとは扱わず、未知の生成処理や設定があれば該当キーの検査をUNKNOWNにする。

### plistとSwift

plist adapterはXML・binaryの入力を読み、固定された`/usr/bin/plutil -convert json -o - -- <input>`をshellなしで呼ぶ。入力元は検査済みの一時スナップショットとし、元ファイルを書き換えない。JSONへ変換できない型、壊れた構造、読み取り障害を区別する。InfoPlist.stringsとString Catalogは専用adapterで対応する表現を抽出し、未対応のバリエーションは診断する。

Swift lexerはコメント、通常・複数行・raw文字列、識別子、区切り、条件付きコンパイルを区別する。文字列内のコードらしい文字をAPI利用に数えない。文字列補間・マクロ・動的ディスパッチ・SDK内部の実装が解決できない範囲は候補またはunknownとする。

収集する候補は権限アクセス、認証・登録・削除、購入・復元・利用権、データ共有、外部購入リンク、プライバシー導線、サブスク表示。候補はAPI識別子、ファイル位置、ターゲット所属、コンパイル条件の確度、近傍の関連記号を持つ。完全な呼び出しグラフや実行到達性は作らない。

## 検査エンジン

### チェック計画

19ルールごとに、target全体または権限キー・Manifestバンドル・SDKなどの検査対象を列挙し、安定したsubjectKeyを作る。入力不足でもtarget全体のチェックを残す。必要な検査対象が列挙不能なら、ルール全体にUNKNOWNを出し、検査結果を空配列にしない。

```typescript
type Status = "PASS" | "FAIL" | "NEEDS_REVIEW"
  | "NOT_APPLICABLE" | "UNKNOWN" | "ERROR";
type Severity = "HIGH" | "MEDIUM" | "LOW";
type VerificationLevel = "static" | "ai_review" | "user_attestation" | "runtime";
type Applicability = "yes" | "no" | "unknown";

interface RuleDefinition {
  ruleId: string;
  ruleVersion: string;
  logicVersion: string;
  contentVersion: string;
  executorId: string;
  defaultSeverity: Severity;
  requiredFacts: string[];
  sourceDocumentIds: string[];
  assessmentPolicy: "none" | "context_review";
  applicability(context: RuleContext): Applicability;
  evaluate(context: RuleContext, subject: Subject): CheckResult;
}
```

上記は内部のインターフェース概要。配布する宣言JSONには関数を含めず、executorIdを同梱の検出器に結び付ける。設定ファイルからexecutorを差し込めない。

SubjectKeyはcomponentと対象を識別するキーを持つJSONオブジェクト。詳細はルール判定契約に従う。scopeKeyも構造化したオブジェクトで、文字列の連結キーにしない。

### 判定手順

1. 入力や検出器に障害がある場合、影響する検査をERRORまたはUNKNOWNにする。
2. 対象外と判断する根拠がそろう場合のみNOT_APPLICABLEにする。
3. 適用が不明で、疑わしいコード候補がある場合はNEEDS_REVIEW、候補を評価できない場合はUNKNOWNにする。
4. 適用と必要入力が確定した範囲でのみPASSまたはFAILを出す。
5. UI接続、実装の意味、実動作が必要なら、AI確認項目と追加の手動確認を残す。

例えば、カメラAPIらしい語が見つかり、キーがない場合でも、所属や条件が不明ならFAILにしない。対応範囲の利用・対象構成・必須キー欠落が確定した場合にFAILを出す。削除ボタンやAppStore.syncの文字列の有無だけで導線の実装完了を決めない。

### 初期ルールの処理分担

| ルール | CLIが集める主な事実 | 文脈・追加確認 |
| --- | --- | --- |
| ARG-PERM-001 | 権限API候補、キー、所属、構成 | 間接呼び出しと条件不明を保留 |
| ARG-PERM-002 | 説明文、ローカライズ | Skillが機能との関係を確認 |
| ARG-PRIV-001 | Manifestの構造、型、所属 | 宣言内容の真実性は別の検査 |
| ARG-PRIV-002 | 対応API候補、カテゴリ・理由 | 実際の用途、バンドル別の適用 |
| ARG-SDK-001 | 依存名・版、対象SDK台帳 | SDK実体、署名、最終バンドル |
| ARG-AUTH-001 | 登録・削除候補 | SkillでUIと処理を追跡、サーバー動作は手動 |
| ARG-AUTH-002 | 認証候補、Entitlements | 主アカウント認証、例外、代替手段 |
| ARG-IAP-001 | 製品種別、復元候補 | Skillで復元操作と利用権を確認 |
| ARG-IAP-002 | 購入結果、更新・検証候補 | SkillとSandboxでの確認項目 |
| ARG-IAP-003 | 価格・期間・規約等の表示候補 | 実際の条件と表示の照合 |
| ARG-REVIEW-001 | reviewAccess等の申告 | App Store Connect登録と動作は手動 |
| ARG-PRIV-003 | URL・導線候補 | UI接続、公開状態、登録内容 |
| ARG-PAY-001 | 外部リンク・購入候補 | 地域・端末・契約等の確認。自動FAIL禁止 |
| ARG-BUILD-001 | Deployment Target | 最終アーカイブの値は手動 |
| ARG-BUILD-002 | ビルド情報の申告 | 提出バイナリの実測と区別 |
| ARG-PRIV-004 | 送信先・個人データ候補 | Skillで説明・同意・送信順序を確認 |
| ARG-PRIV-005 | ATT・追跡候補 | 用途、許可前通信、OS・地域 |
| ARG-REVIEW-002 | 年齢・プライバシー回答の準備 | 実際の登録との一致 |
| ARG-CONTRACT-001 | 契約・Trader準備の申告 | アカウントの有効状態、契約承諾 |

### PolicyContext

ルール判定では固定した資料台帳とrequirementレコードを参照する。requirementはSPECのID・版・日付精度・地域・OS・配信方法などを保持する。

評価日はUTC日時と、評価に用いるカレンダー日・タイムゾーンを保存する。現行結果はassessmentDateで評価し、plannedSubmissionDateがあれば独立した予測結果を添える。未来の条件で現行結果をFAILへ変えない。

月のみ公表された施行条件は境界月をNEEDS_REVIEW、施行月を過ぎても再確認できない場合は資料更新のUNKNOWNとする。暦上の施行日とOS availabilityを別に評価し、必要な地域や商品種別が不明なら適用を確定しない。

## データ契約

全ドキュメントにschemaVersionを持たせる。Schemaは型と形式を検査し、coreとreportが引用整合、状態制約、集計、版の互換性を検査する。

[Ajvの公式資料](https://ajv.js.org/json-schema.html)に従い、Draft 2020-12用のvalidatorを使用する。Schemaの取得はローカル同梱だけに限定し、検証時に外部URLからSchemaをロードしない。coercion・既存値の削除・暗黙のデータ書き換えは使わない。

### audit.json

トップレベルはSPECで定めたschemaVersion、auditId、createdAt、toolVersion、rulepackVersion、policyContext、scope、snapshot、execution、coverage、summary、checks、diagnostics。

scopeにはproject相対パス、targetのIDと名称、configuration、sdk、arch、platforms、対象外範囲を保持する。target IDが変わった場合、同名だけで同じ対象と判断しない。

snapshotはGit HEAD／dirtyの取得結果、入力のpath・size・sha256、正規化設定ハッシュ、inputManifestHash、semanticSnapshotHashを持つ。inputManifestHashは全入力と正規化設定の整合性検証用。semanticSnapshotHashは手動確認の対象同一性用で、manualVerifications・suppressions・language・表示設定を除いた検査設定と、アプリの対象入力から算出する。設定ファイル自体の生バイトはsemanticSnapshotHashへ入れない。Git情報を取得できなくても、ファイルハッシュで監査は実行できる。

### チェックの構造

```typescript
interface CheckResult {
  checkId: string;
  ruleId: string;
  ruleVersion: string;
  subject: { kind: string; subjectKey: SubjectKey; targetId: string };
  status: Status;
  severity: Severity | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  confidenceReason: string;
  title: string;
  reason: string;
  evidence: Evidence[];
  sources: SourceReference[];
  provenance: "scanner" | "ai" | "user";
  verificationLevel: VerificationLevel;
  limitations: string[];
  remediation: string[];
  verificationSteps: string[];
}
```

Evidenceはfile・config・searchの判別付き構造とし、各要素にevidenceIdを持たせる。fileはpath、fileHash、lineStart／lineEndまたはkeyPath、観測内容を持つ。configはJSON Pointerと申告値、searchは方法・対象ファイル集合のハッシュ・検出数・探索の制約を持つ。「該当実装がない」という証拠を架空の行番号で表現しない。

SourceReferenceはsourceDocumentId、url、section、sourceRevision、verifiedAtを持つ。資料はルールの同梱台帳から解決し、AIが任意に新しいApple資料の確認済み引用を追加できない。

checkIdは`{ruleId, scopeKey, subjectKey}`という構造のcanonical JSONをSHA-256にし、全桁を使用する。文字列を区切りなしで連結しない。scopeKeyにはproject、target ID、configuration、sdk、archを含む。ハッシュ用JSONはキーを辞書順で固定し、UTF-8、パス区切りは/、文字列はUnicode NFCで正規化する。行番号、日時、状態、言語、説明文、ruleVersionはIDへ含めない。対象ファイルが移動した場合は同じ指摘と推測せず、NEWとNEEDS_RECHECKとして扱える。

FAILとNEEDS_REVIEWだけにseverityを付け、その他はnull。confidenceは証拠の確度であり、通過確率ではない。runtimeは予約値で、MVPが生成する検査では使用を拒否する。

### assessment.json

```typescript
interface AssessmentDocument {
  schemaVersion: "1.0.0";
  assessmentId: string;
  auditId: string;
  auditHash: string;
  inputManifestHash: string;
  createdAt: string;
  execution: {
    tool: "claude_code" | "codex" | "cursor" | "other";
    model: string | null;
  };
  reviews: Array<{
    checkId: string;
    result: CheckResult;
    reviewedEvidenceIds: string[];
    outstandingVerificationSteps: string[];
  }>;
}
```

auditはassessment-template.jsonを同梱する。Skillはこのテンプレートをコピーし、新しいassessmentIdで結果を保存する。テンプレート自体は書き換えない。既存のcheckIdを指定し、新しい疑いがあれば関連する既存ルールへ記録する。入力が足りなければ再監査を要求する。新規ルールの動的追加はしない。

reportはSchema検証の後、auditId・auditHash・入力ハッシュ、checkId、許可されたルールの判断、引用ファイルと行／キーパスの存在を検証する。新しいassessmentを統合する場合は、監査対象のファイル一覧とハッシュを再収集し、追加・削除・設定変更も確認する。assessmentなしの静的report再表示は入力が変わっていても許し、表示対象を過去snapshotと明示する。保存済みのreportを読む場合も入力との一致を要求せず、現在の監査結果とは呼ばない。

引用の整合が検証できても、AIの解釈が正しいと証明されたわけではない。表示にはai_reviewを残す。ソース・設定が変わった場合はSTALE_SNAPSHOTとして統合を拒否し、最新のauditを作る。

### 統合と集計

subjectごとの完了条件と許可する確認段階は[ルール判定契約](docs/RULE_CONTRACTS.md)、データと統合の優先順位は[詳細データ契約](docs/DATA_CONTRACTS.md)に従う。

静的結果とAI判断を一対で保持する。静的FAILとERRORはAIで解除できない。AIの異論は追加確認として併記する。context_reviewを許すルールについてのみ、NEEDS_REVIEW／UNKNOWNをAI判断で補足できる。静的PASSとAIの疑いが食い違う場合は、チェック全体をNEEDS_REVIEWとして表示し、理由を残す。

AI確認でPASSになっても、その確認範囲に限定し、バックエンドや実機に残る項目を消さない。実動作は別subjectに残し、候補があればNEEDS_REVIEW、確認材料がなければUNKNOWNとする。codeのPASSをruntimeのPASSとして扱わない。利用者の実動作確認はuser_attestationとして別に記録する。

user_attestationは設定のmanualVerificationsをconfig evidenceで参照する。ルールが要求する方法・対象・snapshotに一致する場合のみ、申告された確認範囲の結果として表示する。AIが利用者の操作を推測して申告を生成しない。確認時のsnapshotが変わった場合は再確認を要求する。manualVerifications自身を含む設定全体のハッシュを参照して循環しないよう、確認対象にはsemanticSnapshotHashを使う。manualVerificationsの更新はinputManifestHashを変更するため、新規auditが必要になるが、対象ソース・機能設定が同じなら以前の手動確認を新規auditへ引き継げる。

同じcheckIdのscanner結果とassessmentを別々のチェックとして二重集計しない。静的集計と統合集計を分け、検査件数の分母はチェック計画から決める。Skillの結果はその計画の検査対象を増減させない。

coverageの割合はSPECの実行状況の定義を使い、未解決・要確認・抑制の件数を同時に表示する。割合を「判断済み」や「審査適合率」と呼ばない。

## コマンドの処理

| コマンド | 処理と出力 |
| --- | --- |
| init | 一意な対象の探索、設定テンプレート、Git除外の案内。既存設定は上書きしない |
| audit | 対象解決 → snapshot収集 → 静的ルール → JSON検証 → run保存 → 初期レポート |
| report | 既存auditと任意assessmentを検証 → 統合 → 新しいreportIdで保存 |
| fix | checkを選択 → 入力の変更を確認 → 修正対象とテストを含む指示書生成。ソース編集はしない |
| verify | baselineのscopeで新規audit → 比較 → verification保存 |
| rules list | ルールID、適用条件、版、knowledgeAsOf、資料確認日を表示 |
| doctor | Node、macOS、plutil、設定、ルール整合、指定したSkill配置の診断。モデルへの接続はしない |

reportとverifyも`--fail-on high|medium|low`、`--require-complete`、`--language`、`--format text|json`を受け付ける。verifyはまず新しいauditを作る。Skillがそのauditのassessmentを生成した後、`--audit <new-audit.json> --baseline-assessment <old-assessment.json> --assessment <new-assessment.json>`を付けて再実行し、既存の新旧結果をassistedとして比較する。`--audit`指定時は静的監査を再実行しない。新しいauditだけでAI判断の解消を決めない。

fixは入力に変更があればSTALE_SNAPSHOTを返す。baselineを参照するverifyは、入力が変わっていることを前提に新しいsnapshotを作るため、この理由で拒否しない。

同じ項目をCLIと設定で異なる対象に指定した場合、最終指定を表示する。scopeの変わるverifyは結果を保存してNOT_COMPARABLEを返す。baselineは過去の入力との現在一致を要求しない。既存の新側auditを--auditで渡した場合は、その入力と現在の一致を要求する。入力変更があれば新側も再監査する。JSONモードではstdoutを一つのJSONオブジェクトに限定し、警告や進捗はstderrへ出す。

終了コードはSPECの0〜4を使う。終了コード4となる障害でも、保存可能なら部分レポートを残す。対象未確定・引数不正は1で監査を開始しない。未来要件の予測結果は現行のfail-onに含めない。

## Skillの設計

SKILL.mdは対象、入口、CLIの使い方、判断の境界、4操作への分岐を記載する。長いルール説明はreferencesへ分け、監査対象に必要な資料だけを読み込む。

1. audit：対象候補と関連ファイルを直接読み、基本監査を進める。CLIの存在・版を確認できる場合だけdoctorと追加監査を実行する。未導入ならインストールせず基本監査を完了する。
2. fix：選択されたcheckの修正指示を生成し、依頼されたソース修正を進める。必要なテストを実行する。
3. verify：前回がbasicならSkillで再評価する。CLI結果なら新しい静的監査とAI再確認を行い、前回との比較を表示する。
4. notes：審査導線と未確認事項からReview Notes下書きを生成する。秘密値はプレースホルダーにする。

Skillの既定操作はaudit。基本監査でcheckIdが未算出ならlocalCheckIdを用いる。修正指示にはauditId、checkIdまたはlocalCheckId、証拠、対象、期待する動作、制約、テスト、再監査条件を入れる。汎用の「Apple審査に通るように直して」だけを渡さない。

Claude Code・Codex・Cursorには共通Skill本体を配置する。以下は2026年10月7日の公式資料に基づくローカル導入契約。共通のnameはsmoothsubmit、descriptionは対象と4操作を説明する。標準Skillの必須メタデータ以外のツール固有設定は必須にしない。

| ツール | プロジェクト内の配置先 | 明示的な呼び出し |
| --- | --- | --- |
| Claude Code | .claude/skills/smoothsubmit/SKILL.md | /smoothsubmit audit、fix、verify、notes |
| Codex | .agents/skills/smoothsubmit/SKILL.md | $smoothsubmit に操作と対象を添える。CLI・IDEでは/skillsの選択も利用できる |
| Cursor | .cursor/skills/smoothsubmit/SKILL.md | Agentチャットで/からsmoothsubmitを選び、操作と対象を添える |

根拠：[Claude Code](https://code.claude.com/docs/en/skills)、[CodexのSkill](https://learn.chatgpt.com/docs/build-skills)、[Cursor](https://cursor.com/docs/skills)。設計上の受入条件は、各配置で発見・明示起動・CLIなしの基本監査・CLI追加検査・結果保存・明示依頼による修正・再確認を一つずつ実行記録に残すこと。公式仕様の確認と実際の導入試験は別の検証である。

コピー対象にはreferences・scripts・assetsを含め、同じSkillを複数の配置へ重複導入しない。既存の配置がある場合は導入手順が差分を示し、既存ファイルを黙って上書きしない。Skill実行はモデル名を自動取得できるとは仮定せず、取得できないときはnullにする。

CLIがない場合はSkill基本監査としてbasic-audit.jsonを生成し、CLI検証済みのaudit.jsonを生成したことにしない。モデルサービスのデータ送信・保存条件は利用者の開発ツールに従う。

## 保存と整合性

```text
.smoothsubmit/runs/<auditId>/
├── audit.json
├── manifest.json
├── assessment-template.json
├── assessments/<assessmentId>/assessment.json
├── reports/<reportId>/report.json
├── reports/<reportId>/report.md
├── fix-prompts/<promptId>.md
└── verifications/<verificationId>/verification.json
```

UUIDをIDに用い、監査・assessment・report・指示書・比較はそれぞれ新しいIDで保存する。audit.jsonとmanifest.jsonは一度だけ保存し、既存ファイルへの書き込みを拒否する。assessmentやreportの生成でも既存成果物を上書きしない。

manifest.jsonは入力一覧とハッシュ、auditのハッシュ、データ版を保持する。通常操作の整合性確認用であり、署名された証明書や改ざん防止を提供するものではない。

書き込みは同じ出力ルート内の一時ディレクトリで生成・検証した後、新規のrunディレクトリへrenameする。出力ファイルのモードは0600、ディレクトリは0700を基本とする。IDの衝突時は再採番し、既存audit・manifestは変更しない。assessment・report・fix・verifyの追加は、既存run内に新しいIDの成果物を保存して行う。ユーザー指定の出力先にも同じ原則を適用する。追加成果物はassessments・reports・verificationsの各親ディレクトリ内で一時生成し、未使用IDの子ディレクトリへrenameする。単一ファイルの指示書も新規ファイルとして原子的に保存する。同じIDが存在したら上書きせず再採番する。

読み取り途中の変更を避けるため、各ファイルは一度読み、ハッシュと解析を同じバイト列から作る。plutilにはそのバイト列を保存した一時ファイルを渡す。一時コピーは解析完了後に削除し、runへ全ソースを保存しない。監査の終わりに探索対象を再確認し、内容・一覧が変わった場合はINPUT_CHANGED_DURING_AUDITとして部分完了にする。

Git HEAD／dirtyは任意の補足とし、取得する場合は固定されたgitコマンドをshellなしで実行する。hookやalias、リポジトリのビルド処理を起動しない。Git情報の取得失敗だけで検査結果を失わせない。

## 再確認と比較

比較の単位はcheckIdと、互換性が確認されたruleVersion。scope、ルールの意味、policyContextの適用条件が異なる場合は比較の前提を表示する。

| 比較状態 | 実装条件 |
| --- | --- |
| NOT_COMPARABLE | scopeまたは非互換のルール版が変化。ポリシー変更で同じ条件を評価できない |
| NEEDS_RECHECK | 前回の指摘が列挙されない、解析不能、対象外読み取り、探索縮小、AI再確認がない |
| RESOLVED | 前回FAIL／NEEDS_REVIEWだった同じcheckが、必要な確認手順を再実行してPASS |
| CHANGED | 同じcheckの状態・重大度・適用条件が変化。NOT_APPLICABLEへの移行もここに分類 |
| UNCHANGED | 問題の状態と主要な判定が継続 |
| NEW | 同じscope内で今回初めて現れたcheck。新規問題の件数はFAIL／NEEDS_REVIEWのみ |

比較不能 → 再確認必要 → 状態比較の順に評価する。前回がUNKNOWN／ERRORで今回PASSになった場合はCHANGEDとし、問題の修正実績としてRESOLVEDへ数えない。

同じルールの意味が変わった場合は、rulepack内のcompatibilityレコードに旧版と新版の比較可否を明記する。レコードがない版跨ぎはNOT_COMPARABLE。資料確認日だけの更新と検出条件の変更を分ける。

verification.jsonはbaselineのaudit／assessment／reportの参照、新しい参照、scope比較、版比較、checkごとの差分、状態別件数、手動確認の残りを持つ。staticとassistedの比較は別のverificationとして保存する。

## エラーと診断

診断はcode、level、stage、対象パスまたは設定キー、message、影響するruleId、対処方法を持つ。人向けの文章は翻訳してもcodeを変えない。

| code例 | 処理 |
| --- | --- |
| AMBIGUOUS_TARGET | 候補を表示して終了1。推測で監査しない |
| CONFIG_INVALID | JSON Pointerと修正方法を表示して終了1 |
| UNRESOLVED_BUILD_SETTING | 影響するチェックをUNKNOWN、他の検査は継続 |
| EXTERNAL_REFERENCE | 対象外パスを読まず、必要な入力を案内 |
| INPUT_LIMIT_EXCEEDED | 影響する範囲をUNKNOWN、実行は部分完了 |
| PARSE_ERROR | 読めない構造に依存するチェックをERROR。壊れたManifest自体を検出できた場合は当該構造検査をFAIL |
| INPUT_CHANGED_DURING_AUDIT | snapshot不安定として部分完了、再監査を案内 |
| ASSESSMENT_INVALID | 不正箇所を表示して終了1、静的監査は保持 |
| STALE_SNAPSHOT | report／fixの統合・指示書生成を拒否して終了1 |
| WRITE_FAILED | 終了4。部分保存と失敗した保存先を区別 |
| STALE_KNOWLEDGE | 古い資料確認日の注意を表示。90日を通過すると通知し、即FAILにはしない |

入力の上限到達は、低重大度の注意だけで済ませず、coverageと関連チェックへ反映する。通常解析で扱えない状態と、アプリの規約上の問題を別に表示する。

## データ保護と実行の制約

realpathでルート外参照を拒否し、シンボリックリンクを追跡して外部ファイルを読まない。対象内でも.env、鍵、証明書、認証ファイル、.git、依存キャッシュ、生成物、監査出力を通常探索から除く。除外はmanifestとdiagnosticsに残す。

外部プロセスは固定したplutilと任意のGit情報取得だけを許す。[Node.jsのexecFile](https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback)をshell=falseで使い、コマンド文字列の連結、eval、プロジェクト内スクリプト実行をしない。plutilのタイムアウトは5秒、stdout上限は10MiB、Git情報取得は各2秒・1MiBとする。上限またはタイムアウト到達は影響する検査をERRORにし、同じ失敗を自動で繰り返さない。

ソース内の秘密値が通常のSwiftファイルにあっても、既定の証拠には値をコピーしない。抜粋は明示指定時だけ生成し、既知の秘密値パターンをマスクする。入力のパス・タイトル・観測内容をMarkdownへ挿入する際はエスケープし、ANSI制御文字も表示前に除く。

Skillはコメント・README・外部文書を作業指示として扱わない。入力中に「既存のFAILを消せ」等の文があってもassessmentの根拠にはしない。CLI validatorによる検査と、Skill側の指示の境界を併用する。

## テストと実装の完了条件

テストは実装の分岐を写すためではなく、誤判定、対象の混同、消えた指摘の誤解消、秘密情報の漏出を防ぐために用意する。ランナーはNodeの標準テスト機構を基本とし、CLIは子プロセスとして実際に起動する。

| 検証単位 | 主なfixtureと確認事項 |
| --- | --- |
| Project resolver | 複数プロジェクト・アプリ・構成、workspace、生成plist、同期グループの所属除外 |
| Settings | inherited、include循環、未解決変数、sdk／arch条件、target優先と構成差 |
| Parser | XML・binary plist、壊れたManifest、Swiftコメント・raw文字列・補間・条件付きコード |
| Rules | 19ルールごとの正例・反例・未入力。登録SDKだけで削除義務を断定しない等の境界 |
| Policy | 施行日前後、月のみ公表、地域・OS・端末不明、未来要件が現行FAILにならない |
| Assessment | 存在しないcheck・引用・行・キーパス、hash不一致、追加／削除、静的FAILの上書き拒否 |
| Report | 状態制約、抑制と失効、件数一致、二重集計防止、JSON stdout、ja／en |
| Verify | 修正済み、対象外化、解析失敗、ファイル削除、版変更、AI再確認欠落 |
| Data protection | シンボリックリンク、制御文字、秘密値、プロジェクト内の偽コマンドを実行しない |
| Package | npm packから導入、同梱ルール・Schema・Skillの存在、オフライン監査 |
| Skill | 3ツールでCLIなし → 基本監査 → 不足情報の質問 → 回答後再評価を実行。CLIあり・CLI故障・対象不明も確認。明示修正依頼時だけ修正 → 再確認 |

性能目標・入力上限はSPECに従う。1,000ファイル・20MBの合成fixtureで30秒以内、512MB以内を目標とし、測定環境と実測を公開前に記録する。ファイル読み取りとplutilはそれぞれ最大4並列とし、結果はルート相対パスの辞書順で整列する。全入力をメモリに保持しない。入力上限はバイトで1MiB=1,048,576として、1ファイル5MiB、入力集合合計100MiB、ファイル数10,000とする。変化検証のための再読み取りは入力集合の容量へ二重計上しないが、時間・メモリ計測には含める。再現性検証ではID・日時等を除く静的結果を比較する。

## 実装順序と検証点

| 段階 | 実装するもの | 次へ進む条件 |
| --- | --- | --- |
| 1 | contracts、Schema、19ルールのチェック計画・API台帳、fixture、基本監査Skill | CLIなしで監査・提案・質問まで成立。状態制約と正例・反例・未入力の期待結果が定義済み |
| 2 | resolver、pbxproj、settings、plist、Swift候補 | 対象・構成・所属を混同しない。生成plistと同期グループの境界が確認できる |
| 3 | 静的ルール、policy、保存、CLI audit | オフラインで監査し、根拠付きJSONを保存できる |
| 4 | report、抑制、終了コード、fix指示書 | 表示と集計が一致し、ソースを書き換えない |
| 5 | Skill、assessment検証、Review Notes | 3ツールで追加判断を保存し、引用と静的結果を保護できる |
| 6 | verify、互換性、性能・配布 | 指摘の消失を解消扱いにせず、packからの導入とデモが再現できる |

実装の最初に検証する不確実性は、pbxprojの同期グループ、xcconfigの解決、生成plistの構成差、3ツールのSkill導入方式。対応できない入力をUNKNOWNへ落とすだけで、SPECが必須とするfixtureの受入条件を満たしたことにはしない。

初期ルールはARG接頭辞を保持する。公開版のCLI・Skill・ルールパックは版の対応表を持ち、CLIが非互換なSchemaやルールを見つけた場合は実行を拒否する。公開前にApple要件と依存ライセンスを再確認する。

## 将来拡張

提出バンドル解析、実機・Sandbox確認、App Store Connect、スクリーンショット、チーム履歴、自動修正PRはMVPの後に追加する。EvidenceとverificationLevelの拡張点を利用し、静的確認のPASSを実動作のPASSへ読み替えない。

App Store ConnectやGitHub連携を追加する段階で認証、権限、秘密値保存、送信データ、失敗時の再試行を別途設計する。MVPの設定ファイルに将来の認証トークン欄を先に用意しない。

## 見直しで確定した境界

### 入力不足と処理障害

ERRORは読み取り失敗、parser・検出器の障害、外部プロセスの失敗に限定する。UNKNOWNは未提供の設定、未対応形式、未知のビルド条件、上限・除外により必要な入力がない場合。壊れたPrivacy Manifestを正常に読み取り、構造違反を検出できた場合は、その構造検査がFAILで、Manifest内容に依存する他のチェックはUNKNOWNにする。parser実装自体の例外ならERRORにする。

coverage.partialは必要な入力の除外、上限到達、監査中の変更、未対応の必須入力により検査範囲が欠けた場合にtrue。診断はaffectedCheckIdsを持ち、独立したチェックのPASSをすべてUNKNOWNへ変えない。--require-completeはcoverage.partialも失敗条件とし、ERRORは指定なしでも終了4。

### 日付と失効

policy.timeZoneはIANAタイムゾーン名で、既定値は実行環境のタイムゾーン。取得できない場合はUTC。監査開始時に一度決めて保存し、比較時には双方の値を表示する。Appleが日単位で公表した条件はその評価用カレンダー日で照合し、時刻が公表されていない場合にUTCの厳密な施行時刻を捏造しない。

suppressionsのcreatedAtはUTC日時、expiresAtはUTC日時または評価タイムゾーンのYYYY-MM-DD。日付だけならその日の終わりまで有効で、翌日00:00に失効する。判定時刻が失効時刻以上なら無効。作成より前の失効日時、空理由、未知のruleIdは設定エラー。設定の同じsubjectKeyに複数の有効抑制があれば設定エラーとする。

### 比較結果の全状態

前回・今回のすべてのcheckIdを集合として比較する。同一scope・互換版で、今回にだけあるPASS／NOT_APPLICABLE／UNKNOWN／ERRORはNEWとして記録するが、新規問題の件数はFAIL／NEEDS_REVIEWだけを数える。前回にだけあるcheckはNEEDS_RECHECK。今回UNKNOWN／ERRORになった前回の指摘もNEEDS_RECHECK。前回PASSからFAILへ移った同じcheckはCHANGEDで悪化と表示し、NEWとして二重に数えない。

元のstatusが同じでも重大度・適用条件・必要な検証段階・抑制の有効性が変わればCHANGED。パス・行番号・説明文・証拠の位置だけの変更はUNCHANGEDで位置差分を添える。前回FAIL／NEEDS_REVIEWからPASSへの遷移でも、必要な入力が欠けていたり必要な検証段階が再実行されていなければNEEDS_RECHECK。

### 表示と言語

既定言語はja。設定とCLIでenを選べる。状態・ID・JSONキー・固定enumは翻訳しない。CLIと同梱テンプレートの文章はja／enを用意し、AIの説明文には選択言語を指定する。英語の出典名は原題を保持する。TTYでは色を使えるが、NO_COLORまたは非TTYでは色を出さない。

### 公開名と更新

表示名SmoothSubmitとbin名smoothsubmitは固定する。@smoothsubmitの所有権を確保できない場合もブランド名は変更せず、公開管理者が所有するスコープのcliパッケージへ配布先を変更し、READMEの導入コマンドとリリース情報だけを更新する。実際の所有者は公開作業で確定する値であり、内部ロジックへ埋め込まない。

MVPはCLI・ルール・資料台帳を同じnpm配布物に含め、独立したルールダウンロードや自動アップデートを実装しない。更新は利用者によるCLIの版更新で行う。Skillは対応するCLIの厳密な版をリリース情報に持ち、CLI利用時に同梱ルール・Schemaの対応をdoctorで検証する。CLIなしではSkill版と参照資料版を基本監査へ記録する。非互換・故障時も基本監査を完了し、追加検査できなかった理由を残す。

## Skill基本監査の処理

基本監査の厳密なフィールド・nullable値・保存できない場合・再評価の契約は[詳細データ契約](docs/DATA_CONTRACTS.md)に従う。CLIの保存ツリーとは別にbasic-audit.jsonを新規保存する。

基本監査はCLIの失敗時だけの代替ではなく、CLIなしで成立する標準モード。Skillは読めるファイル・確認済みの参照資料を列挙し、19ルールに対応する対象を確認する。高度なpbxproj解析、設定継承、所属の確定、機械的なSchema検証ができなかった箇所はそのままUNKNOWNまたはNEEDS_REVIEWへ残す。

基本監査の確認結果はbasic-audit.jsonへ保存できる。mode=basic、provenance=ai、verificationLevel=ai_reviewとし、使用したツールとモデル名またはnullを残す。CLI同等のdeterminism・hash検証・Schema検証を行ったと記録しない。使える読み取り手段で正確な行・hashを取得できなければnullとし、観測した範囲を記録する。

基本監査のscopeには候補一覧と選択済み対象またはnullを持つ。対象が選べないときは候補別の設定確認を返し、アプリ全体のPASSを作らない。基本監査のPASSは、読んだ設定や導線の確認範囲へ限定する。Privacy Manifestのファイルを読んだだけで構造・理由・所属をまとめてPASSにしない。

基本監査はsources・checks・summary・unknownQuestions・additionalCliChecksを持つ。additionalCliChecksはCLIの検査計画と対応付け、基本監査で未実施かつCLIで実行可能なcomponentだけを数える。同じ検査対象を二重計上しない。対象未確定ならcount=nullとし、追加できる検査の種類を返す。

質問は、結果の適用・重大度・修正方法が変わるものだけをreasonとaffectedCheckIds付きで作る。既知情報を聞き直さず、複数の項目が同じ回答で解ける場合は一つにまとめる。回答前のUNKNOWNは監査結果に残す。回答はセッション内で再評価へ使い、設定へ保存する変更は依頼された場合に限る。

基本監査の再評価は新しいbasicの記録を作り、前回の関連コードを読み直す。実装・適用条件・証拠が比較できる場合だけ改善を表示し、機械的な検証を経た解消と区別する。basicからstatic／assistedへ移行した場合、モード間の比較はNOT_COMPARABLEとし、旧疑いに対応する新チェックの関連付けを表示できる。

修正要求がなければコード・アプリ設定・smoothsubmit.config.json・.gitignoreを編集しない。既存のCLIが使えなくても導入のために監査を止めない。ビルド・購入・削除・提出は通常監査の処理へ追加しない。
