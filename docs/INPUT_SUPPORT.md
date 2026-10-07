# SmoothSubmit 入力対応契約

対応仕様：SPEC 0.6、DESIGN 1.2\
初版の対象：Swift製iOSアプリ。以下は目標MVPの実装・fixture契約。alphaのparser対応と未実施の検証は[公開版の状態](RELEASE_STATUS.md)へ記録する。

基本監査はホストの読み取り機能で得られる範囲を確認する。以下の形式解決は追加CLIの責任。Skillが直接読んだだけで所属・継承・最終生成値を確定したことにしない。未対応形式はUNKNOWN、読取・parser障害はERRORとし、影響するcheckを診断へ関連付ける。

## 対象・所属

- workspaceはXMLのFileRef、group/container/self相対参照を扱う。外部参照・未知の参照方式は診断し、一意に対象を決められなければCLIは終了1。workspaceのschemeや環境変数を実行しない。
- pbxprojはOpenStep辞書・配列・コメント・引用・エスケープを解析する。PBXNativeTargetの製品種別がapplicationで、SUPPORTED_PLATFORMSまたはSDKROOTからiOSを確認できる対象を選ぶ。プラットフォームが不明なら候補として提示し、自動選択しない。
- 通常グループはPBXGroup、PBXFileReference、PBXBuildFile、Sources／Resources／CopyFiles／Frameworksの各build phaseを追う。sourceTreeのSOURCE_ROOTと<group>をルート内で解決する。SDKROOT・BUILT_PRODUCTS_DIRの参照は外部実体を読まず、必要箇所をunknownとする。
- PBXFileSystemSynchronizedRootGroupは対象targetのfileSystemSynchronizedGroupsとの関係、path・sourceTree、explicitFileTypes、explicitFoldersを扱う。対象外の同期グループを同じtargetの入力に混ぜない。
- PBXFileSystemSynchronizedBuildFileExceptionSetのtargetとmembershipExceptions、PBXFileSystemSynchronizedGroupBuildPhaseMembershipExceptionSetのbuildPhaseとmembershipExceptionsは相対パス単位で除外する。platformFiltersByRelativePathは対象platformと照合し、未知のfilterを確定所属へまとめない。
- 明示phaseと同期所属が衝突、例外参照が欠損、未対応属性が所属に影響する場合は当該ファイルのmembershipをunknownにする。同期の拡張子だけでManifestのコピー先を確定しない。拡張機能・依存バンドルは主アプリとは別bundleKeyで扱う。

同期形式の参照元：[Xcodeprojの同期ルート定義](https://github.com/CocoaPods/Xcodeproj/blob/master/lib/xcodeproj/project/object/file_system_synchronized_root_group.rb)、[例外集合定義](https://github.com/CocoaPods/Xcodeproj/blob/master/lib/xcodeproj/project/object/file_system_synchronized_exception_set.rb)。これは形式の参考であり、Appleの審査要件を定める資料ではない。

## xcconfigと生成Info.plist

設定はproject base xcconfig → project設定 → target base xcconfig → target設定の順で適用する。includeは記載位置で展開し、同一層の同じ条件の再代入は後の値を採る。inheritedは直前までの下位層の値を参照する。sdk／config／archの条件と*ワイルドカードを扱い、未指定条件や同じ優先順位の競合を未知のまま残す。再帰展開・includeは最大32段、循環を検出し該当値をUNKNOWNにする。必須includeが欠落すれば読取障害、任意includeの欠落は診断だけとする。

変数の既知値は選択したproject／target／configuration／sdk／archとその設定から得る。ホストの環境変数をアプリ設定へ暗黙に流用しない。変数修飾子、未対応の条件、外部includeは影響する設定だけをUNKNOWNにする。INFOPLIST_FILE、CODE_SIGN_ENTITLEMENTS、IPHONEOS_DEPLOYMENT_TARGET、SDKROOT、SUPPORTED_PLATFORMS、TARGETED_DEVICE_FAMILY、GENERATE_INFOPLIST_FILE、対応INFOPLIST_KEY_*、SWIFT_ACTIVE_COMPILATION_CONDITIONSを最低限の解決対象とする。

Appleは設定層・参照・条件を説明している。実装は対応構文をfixtureで再現し、Xcodeの全設定解決を代替したとは表示しない。[xcconfig公式資料](https://developer.apple.com/documentation/xcode/adding-a-build-configuration-file-to-your-project)

GENERATE_INFOPLIST_FILE=NOは指定plistの変数展開を行い、INFOPLIST_KEY_*を勝手に合成しない。YESは既知のInfo.plist Values設定を対応キーへ写し、指定plistがあれば併せて読む。任意のユーザー定義INFOPLIST_KEY_*は生成キーとは扱わない。両方に同じキーがあり値が異なる場合は、初版では衝突を記録して当該キーをUNKNOWNとする。一方しかない値、同じ値、解決済みの変数はその範囲で評価できる。生成フラグ不明、plist前処理、出力を書き換えるRun Scriptが影響しうる場合は最終値を確定しない。

この処理は提出バンドルを生成しない。各値にoriginとlimitationsを付ける。[Info.plist生成・手動指定の公式説明](https://developer.apple.com/documentation/bundleresources/managing-your-app-s-information-property-list)、[Build settings reference](https://developer.apple.com/documentation/xcode/build-settings-reference)

## plist・ローカライズ・Swift

| 入力 | 初版の対応 | 境界 |
| --- | --- | --- |
| plist／Entitlements／xcprivacy | XML・binaryをplutilでJSON化し、元のhashとkeyPathを維持 | JSON化できない型は未対応。重複キーを検出できない形式はその構造条件を未確認に残す |
| InfoPlist.strings | UTF-8／UTF-16の引用キー・文字列値、コメント、エスケープ、またはplist形式 | 解釈不能なencoding・重複・壊れた構文を診断。base値とlocale別値を別対象にする |
| InfoPlist.xcstrings | version=1.0、sourceLanguage、stringsの直接stringUnitとlocale値 | substitutions・variations等が用途文に影響すれば該当localeをUNKNOWN。一般のLocalizable.xcstringsを権限文と自動対応させない |
| Swift | コメント、通常／複数行／raw文字列、識別子、条件付きコンパイル、StoreKit 1・2候補 | 補間・マクロ・呼出グラフ・SDK内動作は確定しない。inactive候補は利用根拠にしない |
| Swift条件 | os(iOS)、targetEnvironment(simulator)、arch、設定から分かるcustom flag、否定／and／or | canImport・swift版・未知flagなどはunknown。文字列中のAPI名は利用候補にしない |

不明なコンパイル条件からのAPI候補だけで権限キー欠落のFAILにしない。Objective-C、Flutter、React Native、生成コードへの横断解析は初版対象外で、該当する経路をlimitationsへ残す。

## 依存・製品データ

Package.resolvedはJSONのversion=1・2・3を読み、identity／package、location／repositoryURL、stateのversion／revision／branchを正規化する。名前が確定しないものは未知の依存として残す。Podfile.lockはPODS・DEPENDENCIES・SPEC CHECKSUMS・COCOAPODSの通常構造を限定parserで読む。YAMLのタグ・aliasや未知形式を実行／展開しない。依存の取得、pod install、swift package resolveは行わない。

ローカルSDK宣言は利用者が示したルート内のパスだけを読み、キャッシュを自動探索しない。lockfile内のSDK名と実体の所属を分ける。署名、依存実装、提出バンドルのManifestは、実体がないままPASSにしない。

.storekitはstorekitFilesで選択したJSONだけを参考入力とし、製品のid・type・価格／期間の候補を取り出す。設定内の未知version・type・欠損は当該製品をUNKNOWN。App Store Connectへの実登録や本番価格とは扱わない。

## API・キー・理由台帳

権限台帳の初期範囲はcamera、microphone、location、photos、contacts。API別に必要キー・条件を記録する。位置情報のWhenInUseとAlways、写真のreadとadd、およびキーを要求しないsystem picker経路を分ける。カテゴリを見つけただけで一律にキーを要求しない。

Required Reason APIの台帳はFileTimestamp・SystemBootTime・DiskSpace・ActiveKeyboards・UserDefaultsを初期カテゴリとし、個別識別子・宣言キー・有効理由・アプリ／SDKの用途条件・公式参照を持つ。[Appleのカテゴリ・理由一覧](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype)

台帳の1行はdetectorId、category、symbols、requiredKeys、conditions、allowedReasons、bundleScope、sourceDocumentId、sourceRevision、verifiedAt、fixtureIdsを持つ。conditionsは同梱executorで解釈する有限データとし、式文字列や任意コードを実行しない。検出器にないAPIの違反を一般化しない。SDK台帳は公式対象一覧の名称・別名・確認日を保持する。

初版台帳の各行は実装段階1で公式資料と突合し、正例・反例・未知条件の期待値を固定する。段階1のゲートは、5権限カテゴリ、5理由カテゴリ、公式対象SDK全名称のレコードがあり、全行に資料とfixtureが対応すること。これは実装前の成果物の要求で、現時点でAPI全行が検証済みという主張ではない。

## 必須fixture

通常／同期グループ、target例外／phase例外／platform filter、複数target、xcconfig各層・inherited・include・条件・循環、生成YES／NO／競合・ユーザー定義キー、plist各形式、ローカライズ各対応形式、Swift文字列・コメント・条件、Package.resolved各版、Pods通常形式、選択storekitと未選択storekitを用意する。既知の対応入力をUNKNOWNへ落とすだけでは合格にしない。明示した未対応・競合ケースは、影響するcheckだけがUNKNOWNになり、独立した検査が続くことを確認する。
