# SmoothSubmit データ契約の詳細

対応仕様：SPEC 0.6、DESIGN 1.2\
データの初版：1.0.0\
実装状態：本書は目標MVPの定義。alpha.1ではCLI用6 Schemaとvalidatorを実装。実装範囲・検証状況は[公開版の状態](RELEASE_STATUS.md)に従う。

JSONの省略、null、unknown、ハッシュ、証拠、統合、比較の意味を定める。検査対象と完了条件は[ルール判定契約](RULE_CONTRACTS.md)に従う。

## 共通形式

- schemaVersionはSemVer。初版で読み取れるメジャーは1。同梱Schemaが対応しないフィールド・版はエラーにする。
- auditId・assessmentId・reportId・promptId・verificationIdはUUID v4。checkId・evidenceId・各sha256値は小文字の16進64桁。
- UTC日時はISO 8601のZ付き。日付は実在するYYYY-MM-DD。予定日・施行月と日時を混在させない。
- pathはルート相対、/区切り。絶対パス・..・NULを拒否する。引用の位置は1始まりの行番号またはJSON Pointer形式のkeyPath。
- 対象の実パスは大文字小文字を保持する。IDのUnicode NFC正規化で二つの実ファイルが同じキーになる場合は診断して監査を開始しない。
- バイト列のファイルハッシュは変換前の内容から計算する。構造ハッシュ用JSONはキーを辞書順に並べ、空白なし、UTF-8、文字列をNFCへ正規化する。集合として定義した配列はソートし、順序に意味がある配列は保持する。
- 人向けのtitle・reason・limitationsは空でない文字列。結果の自由文は最大8,000文字、配列は最大100要素、設定の補足は最大2,000文字。入力filesは10,000、checksは100,000、diagnosticsは10,000を上限とする専用配列で、一般配列の100要素制限とは区別する。制御文字と秘密値を出力前に処理する。
- 全オブジェクトは定義したフィールドだけを許す。省略できるフィールドは本書で明示した任意値に限り、正規化後の内部表現ではnull・unknown・空配列で表す。

## 設定の型と既定値

| キー | 形式 | 未入力時 |
| --- | --- | --- |
| schemaVersion | 1.0.0 | 必須 |
| project／workspace | どちらか一つの相対パス | 両方なしなら一意な対象を探索 |
| target | 空でない名称。重複名称があればtargetIdで指定可能 | 一意なiOSアプリのみ選ぶ |
| targetId | 任意のpbxproj target ID。targetと併記するなら一致が必要 | null |
| configuration | 空でない名称 | Release。存在しなければエラー |
| sdk | iphoneos・iphonesimulator | iphoneos |
| arch | arm64・x86_64・unknown | unknown |
| language | ja・en | ja |
| features | 下記のフィールドだけを持つオブジェクト | 各値unknown |
| policy | 下記の地域・端末・配信・日付設定 | 下記に従う |
| authProviderDetails | custom認証方式の任意の非機密説明 | null |
| reviewAccess | method、prepared、任意のnote | method=unknown、prepared=unknown、note=null |
| reviewNotesPrepared | true・false・unknown | unknown |
| privacyPolicyURL | http／httpsのURLまたはnull | null |
| reportedBuild | 下記のビルド申告またはnull | null |
| submissionPreparation | ageRating・socialNetworking・appPrivacy・dpla・paidAppsAgreement・traderStatus・traderInformationの有無フラグ | 各unknown |
| preparationDetails | 任意の項目別補足配列 | [] |
| metadataDeclarations | 任意の回答概要。下記に従う | null |
| storekitFiles | 明示した.storekit相対パスの配列 | [] |
| manualVerifications | 下記の手動確認の配列 | [] |
| exclude | pathPattern・reasonの配列 | [] |
| suppressions | 下記の抑制の配列 | [] |

featuresの有無フラグはaccountCreation、loginRequired、thirdPartyDataSharing、thirdPartyAI、tracking、paidApp、socialNetworking、kidsCategory。authProvidersはunknownまたはapple・google・facebook・email・customの重複しない配列。独自方式の名称はauthProviderDetailsに非機密の説明として記録する。productTypesはunknownまたはconsumable・non_consumable・auto_renewable・non_renewingの配列。permissionsはunknownまたはcamera・microphone・location・photos・contactsの配列。配列の[]は利用者による「該当機能なし」であり、未入力とは異なる。

policy.storefrontsはunknownまたは大文字2文字の地域コードの重複しない非空配列。コードは同梱の地域台帳で検証する。台帳にない値は設定エラー。地域別ルール未対応と地域コード不正は区別し、未対応地域の法的・決済条件はUNKNOWNとする。

policy.deviceFamiliesはunknownまたはiphone・ipadの重複しない非空配列。distributionChannelはapp_store・testflight・enterprise・ad_hoc・development・alternative・unknown。既定値はapp_storeという監査目的であり、実際の配信方法の観測結果ではない。他方式ではApp Store固有ルールの適用を分ける。plannedSubmissionDateは日付またはnull、timeZoneはIANA名または未入力でDESIGNの既定値に従う。

reviewAccess.methodはdemo_account・demo_mode・none・unknown。method=noneとprepared=trueの併記は矛盾として設定エラー。未知の方式にprepared=trueを指定することも拒否する。noteには実際のユーザー情報を記入しない。

reportedBuildはxcodeVersion、sdkVersion、buildId、verifiedAtを必須とし、platformはios・ipados、reporterは任意のラベル。版はmajor.minor.patchの数値で比較し、RC／beta等のsuffixは別値として保持する。suffixの比較から提出可能性を推定しない。preparationDetailsはitem・sourceRevision・verifiedAt・reporterを持ち、値が不明ならnull。itemはsubmissionPreparationのキーのいずれか。契約の本文や本人情報は入れない。

metadataDeclarationsはsocialNetworking（有無フラグ）、ageRatingReviewedAt（UTC日時またはnull）、privacyの概要を持つ。privacyはcategory・collected・linkedToUser・usedForTracking・purposes・thirdPartyを持つ配列。collected・linkedToUser・usedForTracking・thirdPartyは有無フラグ、purposesは目的IDの配列。カテゴリと目的は同梱のApple資料台帳から定義する。これは利用者が入力する申告概要であり、App Store Connectから取得した事実ではない。入力がなければ「回答準備済み」と「回答の整合性」を別に扱う。

storekitFilesは参考データの選択であり、本番の商品登録を表さない。未指定の.storekitをリポジトリ全体から自動適用しない。申告とファイル内の製品種別が食い違えばNEEDS_REVIEWとして両方を記録する。

## 手動確認と抑制

manualVerificationsはcheckId、scopeKey、method、conclusion、observedAt、semanticSnapshotHash、limitationsを必須とし、reporterは任意のラベル。methodはdevice_test・sandbox_test・app_store_connect・public_url・backend_test・archive_inspection・policy_review・review_walkthrough。conclusionはpass・fail・unknown。

ルールが必要とするmethodとscopeに合う記録だけを採用する。対象snapshotが変われば未確認へ戻す。同じcheckIdに複数記録があればobservedAtが最新のものを採用し、同時刻で結論が異なる場合はNEEDS_REVIEW。未来日時を拒否する。reporterを本人確認済みの署名とは扱わない。

user_attestationのfailはAIのFAILではなく、利用者が失敗を確認した記録として表示する。確定した静的FAILは申告で消さない。コードの実装確認と実動作申告は別subjectなので、runtimeのpassでcodeをPASSへ変更しない。

suppressionsはruleId、subjectKey、reason、createdAt、expiresAtを必須とする。scopeKeyは現在の監査対象に限定する。失効計算はDESIGNに従う。exclude.pathPatternはルート相対globで、*・**・?を扱う。先頭/、..、否定パターン、ルート全体の除外を拒否する。除外対象は入力一覧に存在と理由を記録するが、内容を読み込まない。

## auditとmanifest

| オブジェクト | 必須の内容 |
| --- | --- |
| audit | schemaVersion、auditId、createdAt、toolVersion、rulepackVersion、policyContext、scope、snapshot、execution、coverage、summary、checks、diagnostics |
| scope | project、workspaceまたはnull、targetId、targetName、configuration、sdk、arch、platforms、exclusions |
| snapshot | gitHeadまたはnull、gitDirtyまたはnull、files、configHash、inputManifestHash、semanticSnapshotHash |
| filesの各要素 | path、sizeBytes、sha256、role、membership。対象外・除外で未読の要素はsha256=null、reasonを持つ |
| execution | mode=static、completion=complete・partial、startedAt、finishedAt。audit自身はAI実行情報を持たない |
| coverage | totalChecks、statusCounts、executedCheckCount、executedCheckRatio、partial、excludedInputCount、unreadInputCount |
| summary | riskCounts、failCounts、needsReviewCount、unknownCount、errorCount、suppressedCount |
| manifest | schemaVersion、auditId、auditHash、inputManifestHash、semanticSnapshotHash、normalizedConfig、configOrigin、files、enumerationHash |

filesのroleはproject・settings・plist・entitlements・manifest・swift・dependency_lock・storekit・localization・config。membershipはincluded・excluded・unknown・supporting。supportingは対象設定の解決に必要なファイル。coverageの件数とsummaryはチェック結果から再計算し、入力JSONの数値を信頼しない。ゼロ分母のratioはnull。計画は19のscopeチェックを含むため、通常監査で分母ゼロを正常扱いしない。

riskCountsとfailCountsはHIGH・MEDIUM・LOWの各整数件数。riskCountsは未抑制のFAIL＋NEEDS_REVIEW、failCountsは抑制の有無にかかわらず元のFAILを数える。statusCountsも元状態を数え、suppressedCountを別表示する。抑制対象はリスク要約から除いても詳細から消さない。scopeチェックは確認範囲として件数に含めるが、利用者向けの機能確認済み一覧には表示しない。

PolicyContextはassessmentDate、assessmentCalendarDate、timeZone、plannedSubmissionDate、knowledgeAsOf、storefronts、deviceFamilies、distributionChannel、appliedRequirements、futureRequirements、unresolvedRequirementsを持つ。requirementの参照はIDと版、資料IDと改訂を持つ。予測結果は将来条件の独立した配列に保存し、現行checksとsummaryへ混ぜない。

auditHashはaudit.jsonの保存済みバイト列のSHA-256。auditへ自身のauditHashを含めない。manifestはauditHashを参照する。チェックと証拠はcheckId・evidenceIdで整列して出力し、日時とID以外の静的結果の再現性を保つ。

## 証拠と内部入力

Evidenceの共通フィールドはevidenceId、kind、observation。file型はpath、fileHash、lineStart／lineEndまたはkeyPathを持つ。config型はpointer、valueType、非機密のnormalizedValueを持つ。search型はmethodId、inputSetHash、searchedPaths、candidateCount、limitationsを持つ。存在しない箇所の引用と、検索結果ゼロの記録を混ぜない。

evidenceIdはkindと観測対象・hash・位置からcanonical JSONで算出する。checkIdは変わらなくても、ファイル内容・行が変わればevidenceIdは変わってよい。AIが新しいfile evidenceを提出できるのはInputManifest内で引用可能なファイルだけ。CLIが同じhashと位置を検証し、evidenceIdを再計算する。

FactIndexはscope、inputManifest、settings、plists、memberships、swiftCandidates、dependencies、storekitProducts、localizations、diagnosticsを持つ。settingsの要素はkey、resolvedValueまたはnull、resolution=resolved・unknown・error、origins、limitations。swiftCandidatesはdetectorId、path、位置、symbol、condition=active・inactive・unknown、membership、evidenceIdを持つ。

RuleContextはread-onlyのFactIndex、正規化設定、PolicyContext、資料・requirement台帳を持つ。ファイル読み取り関数、shell、ネットワーク、書き込み関数を渡さない。parserの障害はFactIndexのdiagnosticsを通して影響対象へ伝える。

## AI統合の判定表

同じcheckIdを一つの表示単位にし、scannerResult、assessmentResultまたはnull、attestationResultまたはnull、effectiveResult、conflictsをreportに保持する。元のauditは更新しない。

| scannerの状態 | AI結果 | 有効結果 |
| --- | --- | --- |
| FAIL | 許可された追加コメント | FAILを維持。AIは当該構造条件をPASSへ解除できない |
| ERROR | 許可された追加コメント | ERRORを維持。parser再実行なしで解消しない |
| PASS | PASS・UNKNOWN | scannerの確認範囲のPASSを維持。AIが別条件を確認できない場合は該当別subjectにUNKNOWN |
| PASS | NEEDS_REVIEW・NOT_APPLICABLEによる異論 | NEEDS_REVIEW。異論と元結果を併記 |
| NOT_APPLICABLE | 同意または未確認 | NOT_APPLICABLEを維持。新しい反証があればNEEDS_REVIEW |
| NEEDS_REVIEW・UNKNOWN | 許可された文脈確認のPASS・NOT_APPLICABLE | 必要条件と引用がそろうsubjectだけ変更。不足が残れば元状態を維持 |
| NEEDS_REVIEW・UNKNOWN | NEEDS_REVIEW・UNKNOWN | 追加の疑いがあればNEEDS_REVIEW、判断材料不足だけならUNKNOWN |

assessmentPolicy=noneのsubjectでAIが状態変更を要求した場合はASSESSMENT_INVALID。初期のnoneはscope、permission_key、manifest_structure、reason_declaration、sdk_signature、deployment_setting、および手動確認専用のsubject。purpose_content、reason_usage、認証・課金・共有・追跡・導線のcodeとcontextはcontext_review。準備の申告値はCLIが解釈し、AIは申告値を補完しない。

assessmentに同じcheckIdが二回あれば拒否する。reviews[].checkIdとresult.checkId・ruleId・subjectの対応を検証する。result.provenance=ai、verificationLevel=ai_reviewを要求する。scannerまたはuserをAIの出力として名乗れない。sourceは同梱台帳だけを引用し、severityはルールの固定値を使う。PASS・NOT_APPLICABLE・UNKNOWNのseverityはnull。

manualVerificationsの結果はCLIがuser_attestationとして投影し、methodとsubjectを検証する。使用できるのは手動確認専用subjectだけ。FAIL・NEEDS_REVIEWにはルールの重大度を付ける。ARG-PAY-001のfail申告はNEEDS_REVIEWに投影し、条件判断が不適切という利用者の報告として表示する。

AIレビューで引用の存在を確認しても、意味判断の正しさをCLIが証明したとは表示しない。入力hashと引用が有効でも、必要な検証条件が不足していればPASSとして取り込まない。

## reportとverification

reportはschemaVersion、reportId、createdAt、auditId、auditHash、assessmentRefまたはnull、mode、execution、policyContext、scope、checks、coverage、summary、diagnosticsを持つ。checksは上記の統合表示単位の配列。modeはstatic・assisted。AIモデル情報はassessmentRefと表示用executionに保持し、auditの事実に混ぜない。

verificationはschemaVersion、verificationId、createdAt、mode、baselineRef、currentRef、scopeComparison、versionComparison、policyComparison、items、summaryを持つ。参照にはauditId・auditHashと、assistedならassessmentId・assessmentHashを入れる。

itemsはcheckId、previousResultまたはnull、currentResultまたはnull、classification、direction、reasonを持つ。directionはimproved・worsened・neutral・unknown。UNKNOWN／ERRORや再確認不能から改善のdirectionを推測しない。classificationはDESIGNの6種類で、NEWとCHANGEDの問題件数を分ける。

比較できない前提が一つでもあるチェックはNOT_COMPARABLE。ルール版だけの変更はcompatibility台帳にあるときだけ比較する。ポリシーが変わっても同じ適用要件・値・条件を評価できるチェックは比較可能で、その範囲をpolicyComparisonに記録する。

## Skill単体のbasic-audit

CLI auditと独立した基本監査の型を用意する。下記で明示したnullable値は共通形式の例外。basic-auditはschemaVersion、auditId、createdAt、skillVersion、rulepackVersion、mode=basic、execution、scope、sources、inputs、checks、summary、coverage、unknownQuestions、additionalCliChecks、attestations、diagnosticsを持つ。利用できるUUID生成・時刻取得でIDと日時を得る。取得できない場合は値を作らず、機械可読artifactを保存できなかった理由付きでチャットの監査レポートを返す。Node・CLI導入は要求しない。

executionはtool、modelまたはnull、completion=complete・partial、validation=unvalidatedを持つ。completeは予定した読取・判断・報告を終えた意味で、Unknownゼロを意味しない。途中の読取障害・上限・アクセス不能があればpartialでも取得できた結果を返す。ファイル保存不能だけなら監査結果の提示は続け、保存のdiagnosticを分ける。

scopeはrootLabel（ルートの非機密表示名）、candidates、selected（candidateKeyまたはnull）を持つ。candidateはcandidateKey（一意なb-target-001等）、project、targetIdまたはnull、targetNameまたはnull、configurationまたはunknown。checksの各要素はlocalCheckId、checkId、candidateKey、ruleId、ruleVersion、subjectKey、status、severity、confidence、confidenceReason、title、reason、evidence、sources、provenance、verificationLevel、limitations、remediation、verificationStepsを持つ。checkIdはホストが正しく算出できるならCLI形式のhash、できなければnullとし、記録内で一意のlocalCheckId（b001等）で参照する。CLIのcheckIdと相互変換できたとは扱わない。会話のみの監査から修正指示を作る場合は、auditIdを捏造せず、直前の監査結果とlocalCheckIdを参照する。

基本監査のprovenance=ai、verificationLevel=ai_review。ERRORはホストの読取等の障害を記録する状態で、AIによる規約違反の判断ではない。状態はPASS・NEEDS_REVIEW・NOT_APPLICABLE・UNKNOWN・ERRORを許し、FAILをAI生成しない。明白な設定不足も基本監査ではHIGH等のNEEDS_REVIEWとして説明できる。利用者回答は別attestations配列にquestionId、answer概要、observedAtまたはnull、affectedLocalCheckIdsを保持する。秘密値や実ユーザー情報は保存せず、AIによる観測と利用者回答を混ぜない。以前のCLI用manualVerificationsはhashを照合できなければ有効な申告として引き継がない。

inputsはpath、readState=read・unread・excluded、sha256またはnull、limitations。証拠はpath、観測内容、lineStart／lineEndまたはkeyPathまたはnullを保持する。未知の行・hash・所属を埋めない。sourcesはbundledとadditionalの二つのSourceReference配列で管理し、additionalは実際に追加確認した公式資料に限る。未読の資料を確認済みとは記録しない。追加の公開資料確認は利用者のホストの通信許可に従う。CLI監査のネットワーク不要の保証と区別する。

summaryはriskCounts（未抑制NEEDS_REVIEWの重大度別件数）、statusCounts、unknownCount、errorCount、suppressedCount。計画件数と確認範囲はcoverageに記録し、数えられない分母・割合はnullにする。複数候補があればsummaryを候補別に示す。同じ問題を候補間で一つのアプリの件数として合算しない。scope確認は利用者向け機能PASSの一覧に入れない。

unknownQuestionsはquestionId、prompt、reason、affectedLocalCheckIdsを持つ。通常監査では最初のレポートを提示してから質問する。配信地域・デジタル課金・審査アクセス・Kids Category等の回答で結果が変わる場合だけ質問する。回答がなければ現在の結果を保持し、毎回同じ質問で監査を止めない。非対話・CIでは質問リストを出力して完了する。回答は新しい監査recordへ適用し、設定ファイルには明示依頼時だけ保存する。

additionalCliChecksはcount（非負整数またはnull）、itemsを持つ。itemはruleId、subjectKey、methodId、reason。CLIが提供する対象解決・構造・継承の検査で、基本監査で同じ条件を十分確認できなかったものだけを列挙し、その一意な組を数える。CLIを実行していないのにその結果を予測しない。対象を列挙できないとcount=nullとし、種類を説明する。CLIがない理由だけで基本監査をpartialにしない。

保存可能なら.smoothsubmit/runs/<auditId>/basic-audit.jsonとreport.mdへ新規保存し、既存記録を上書きしない。通常の監査で監査artifactを書くことは許すが、コード・設定・.gitignoreの変更はしない。保存不能時は同じ内容を会話へ返す。CLI report／fix／verifyはbasic-auditを受け付けず、Skillが直接扱う。

基本監査の再評価は新しい記録とverifications/<verificationId>/basic-verification.jsonを作る。verificationId、baselineRef、currentRef、mode=basic、items、summaryを持ち、参照はbasicのauditId。itemsはpreviousLocalCheckIdまたはnull、currentLocalCheckIdまたはnull、previousStatusまたはnull、currentStatusまたはnull、classification、direction、reason、limitations、verificationLevel=ai_review。確認範囲・対象・方法を比較できなければNEEDS_RECHECKまたはNOT_COMPARABLE。同じ必要条件を再確認して改善した場合もverificationLevel=ai_reviewと明示する。static／assistedとのモード跨ぎはNOT_COMPARABLE。CLIが確定したFAILを解消したという記録へ変換しない。

## セッション設定とsnapshotの照合

configOriginはkind=file・stdin・default、pathまたはnull、sourceFileHashまたはnull。`--config -`は最大1MiBのJSONだけを読み、現在のファイル設定を自動マージしない。Skillが既存設定と回答を統合して完全な設定を渡す。schemaVersion・未知キー・秘密値の禁止はファイル入力と同じ。設定ファイルを編集せず、監査artifact内のnormalizedConfigに評価前提を保存する。

report・fixはmanifestのnormalizedConfigで同じ入力探索を再実行する。configOrigin=fileでは元ファイルの存在・hash・正規化値も比較する。stdinでは保存済みのセッション設定を再利用し、元の設定ファイルがある場合はその読取hashをsupporting入力として保持・照合する。省略のdefaultでは設定ファイルの新規出現も変更として検出する。セッションの回答を忘れてUNKNOWNへ戻した結果を同じsnapshotとして統合しない。

verifyの新規監査はbaselineの対象選択を引き継ぎ、現在のファイル設定があればそれを読み直す。stdin由来の前提を再利用する場合も、利用者回答として由来を残す。利用者が新しい回答や対象を指定すれば新規設定で監査し、policy・scope・semanticの差分を表示する。assessment-templateと修正指示に実際の設定ファイルへ書く命令を自動追加しない。

## 基本監査の抑制と質問の参照

既存suppressionsはruleId・subjectKey・確定したscopeが一致し、期限を評価できる場合だけ表示へ適用する。IDや対象を対応付けられない場合は抑制を適用せず、diagnosticを返す。基本監査が新しい抑制設定を自動で作らない。要確認の質問はlocalCheckIdで参照し、同じquestionIdへの新しい回答で再評価する。質問に関連する回答とコードが衝突すれば双方を記録し、回答だけでコード条件をPASSへしない。

## CLI出力と残りの操作契約

CLIのrootは--pathまたはcwd、設定は--configまたはroot/smoothsubmit.config.json。--configのファイルパスはroot相対で、ルート外を拒否する。--outputは利用者が指定する出力ディレクトリで、既定はroot/.smoothsubmit/runs。出力先へ入力のソースをコピーしない。CLIには対話質問を実装せず、不足値は結果へ残す。明示対象がなくCLIで一意に決められないときだけ終了1。Skillはその場合も基本監査を続ける。

--format jsonのstdoutはauditならauditオブジェクト、reportならreport、verifyならverification。出力保存先・進捗はstderrに記録し、JSONへ未知のラッパーフィールドを足さない。--format textは人向け要約を返す。auditは新規runへaudit・manifest・assessment-templateと初期static reportを保存する。templateは未記入でassessmentとして統合しない。

fixは--auditと一つの--checkを必須とし、--assessmentを任意に受け付ける。assessment指定時はreportと同じ整合性検証を行う。対象checkがなければ終了1。指示書だけを新規保存し、ソースを変更しない。既定言語はauditの値、--languageで指定可能。--outputは新規成果物の出力先を指定し、既存成果物を上書きしない。

initは明示的に呼ばれたときだけroot/smoothsubmit.config.jsonを新規作成する。対象が不明なら候補を返して終了1。既存設定があれば保存を拒否して終了1。追加の.gitignore編集はしない。doctorとrules listはファイルを書かず、textまたはJSONの診断／一覧を返す。doctorの不足環境は終了4、引数不正は1。rules listは一覧の生成に成功すれば0。

## alpha.2の個別設定の再確認

permission_key・manifest_structure・reason_declaration・deployment_settingの完全なstatic条件は、同じ対象・版・前提で再確認され、以前の引用入力が読め、除外入力がなく、制限がローカルPackage・Info.plist前処理・設定参照だけの場合に限り、FAIL／NEEDS_REVIEW → PASSをRESOLVEDにできる。全体のpartial・実動作のUnknownは保持する。ファイル欠落・除外・入力上限・読取エラー・対象や方法の違いを解消扱いにしない。公開版の検証例は[実用性検証](USEFULNESS_VALIDATION.md)を参照。
