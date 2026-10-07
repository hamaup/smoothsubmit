# SmoothSubmitの実用性検証 — 2026-10-07

## 判定

**具体的な設定不備を見つけ、修正箇所を示し、同じ条件を再確認する用途には有用性を確認できた。審査全体の判断をCLI単体に任せられる段階ではない。**

実在するOSSアプリ3件の固定コミットから取得したテキスト入力で監査を実行した。各プロジェクトの一時コピーに3種類の既知の不備を入れ、9件すべてを検出、修正指示を生成し、修正後の同じ設定条件をRESOLVEDまで確認した。元のソース・設定のハッシュは監査前後で一致した。

これは開発者の利用満足度・リジェクト率・工数削減を測った結果ではない。既知の設定不備を入れる実験と、実コードに対する限定的な確認の結果である。

## 入力と方法

| アプリ | 固定コミット | 取得テキストファイル | 対象 |
| --- | --- | ---: | --- |
| IceCubesApp | [9efcb16](https://github.com/Dimillian/IceCubesApp/tree/9efcb16e720f337a401cf61c8e300dd043368282) | 571 | IceCubesApp / Release / iphoneos |
| KeePassium | [e651df4](https://github.com/keepassium/KeePassium/tree/e651df4f89b0b8550371566ca9aa55a964d2904e) | 1,498 | KeePassium / Release / iphoneos |
| NetNewsWire | [7a2f27f](https://github.com/Ranchero-Software/NetNewsWire/tree/7a2f27f324f2e8a59eefedb4eface4732e1febcc) | 943 | NetNewsWire-iOS / Release / iphoneos |

画像・依存SDKのチェックアウト・外部にある設定ファイルは取得していない。アプリのスクリプト、Package.swift、ビルド、バックエンド、購入、削除処理は実行していない。上流アプリを不適合とも適合済みとも認定していない。

CLIの監査だけでなく、配布手順、修正指示の対象設定名、ソースの保持、同じターゲットでの再監査まで確認した。集計値と制限は[実行結果JSON](validation/real-projects.json)に記録している。

## 既知の不備を入れた実験

| 一時コピーでの変更 | 期待した検出 | 3アプリでの結果 | 修正後 |
| --- | --- | --- | --- |
| Releaseの最低OSを12.0に変更 | ARG-BUILD-001 / FAIL | 3 / 3 | 元の設定へ戻し、同じdeployment_settingがRESOLVED |
| ManifestのNSPrivacyTrackingを文字列に変更 | ARG-PRIV-001 / FAIL | 3 / 3 | 正しい型の元データへ戻し、同じmanifest_structureがRESOLVED |
| UserDefaultsの理由を未承認コードに変更 | ARG-PRIV-002 / FAIL | 3 / 3 | 元の理由宣言へ戻し、同じreason_declarationがRESOLVED |

IceCubesAppには、この実験専用のPrivacyInfo.xcprivacyを一時コピーのResourcesに追加した。既存Manifestを持つ2件では、それを一時コピー内で変更した。修正は実験側が行い、CLIのauditとfixはソースを変更しないことをハッシュで確認した。

RESOLVEDはこの個別の設定条件に限る。入力全体のpartial表示、理由コードが実際の用途に合うか、アーカイブへの含有、実機での動作は別の未確認項目として残る。引用入力の欠落・除外・読み取り失敗や方法の違いで解消を装うケースは、回帰テストで解消扱いにならないことも確認した。

## 実コードで見つかった問題と改善

| 検証時の問題 | 改善と確認 |
| --- | --- |
| 新しいXcodeのxcconfig参照方式を読めず、NetNewsWireの対象が見つからなかった | baseConfigurationReferenceAnchor / RelativePathに対応し、iOSターゲットを選択して監査完了 |
| 普通のLink/openURLが外部決済のHIGH候補になった | 一般リンクだけではリスクに昇格させず、購入に関係する候補を別途確認。違反判定の自動FAILは引き続き行わない |
| ambientの音声再生がマイク権限候補になった | 録音操作に関係する候補に絞り、実コードの音声再生を誤って録音扱いしない。明示的な録音要求の検出は維持 |
| モデルのcreationDateをファイル日時APIの候補とした | receiver/操作の手掛かりを加え、モデル日時を昇格させない。URL resource values等は候補として残す |
| ローカルPackageのコードが監査されたように見える | CLIの対象外としてpartialとLOCAL_PACKAGE_SCOPEを表示。Skillに使用製品・モジュールを追う指針を追加 |
| 前処理付きInfo.plistを不正ファイルと表示した | PREPROCESSED_PLISTと最終値のUnknownに変更。アプリのビルド処理を勝手に実行しない |
| 修正指示が抽象的だった | 設定名、ターゲット、Manifestの項目・型・理由候補、再監査と実機確認を具体化。レポート冒頭に優先項目を表示 |
| 不正な理由宣言が、別の正しい宣言に隠れる可能性があった | 含まれる未承認・空・無効な理由宣言を独立して検出 |

一般リンク・音声再生・モデル日時の3種類を実コードで確認し、既存RevenueCatのrestorePurchasesも候補として検出した。これらは4つの限定された対照確認であり、全ルールの誤検知率・適合率を推定する標本にはならない。

## CLIなしでのSkill手順の手動確認

このCodexセッションではインストール済みsmoothsubmitコマンドがなかった。Skillと参照資料を読み、ホストのファイル閲覧・検索だけで次の判断経路を確認した。これは独立評価やSkill自動選択、Claude Code / Cursorでの実動作の証明ではない。

- IceCubesAppのSupportAppView.swiftの243〜257行に、復元ボタンからRevenueCat.restorePurchasesを呼びcustomerInfoを更新する処理がある。AppStore.syncがないことを理由に別の課金実装を追加する提案は不要。戻り値のエラーが無視される点と、実際の購入復元は追加確認が必要。
- Packages/MediaUIのMediaUIView.swiftの195〜211行とPackages/StatusKitのMediaPickerPanelView.swiftの228〜241行に、写真追加・読み取りの要求がある。アプリの生成Info.plist設定には両方の用途説明がある。直接のアプリソースだけを見ると、この利用箇所の確認を省いてしまう。
- Packages/EnvのUserPreferences.swiftの87〜94行にはユーザー設定用のUserDefaults利用がある。対象コードとPrivacy Manifestの宣言を照合する修正案を提示できるが、バンドル構成と提出アーカイブを見ずに適合を断定しない。
- AccountSettingViewのローカルキャッシュ削除は、サーバーアカウント削除の証明に使わない。アプリ内でアカウントを作成するか、外部サービスの既存アカウントを利用するかで適用判断が変わる。

最初に上記の確認結果を返し、その後に、配信地域・実際の商品種別・アカウント作成の範囲・審査アクセスの準備など、判定を変える情報をまとめて確認する。秘密情報は質問しない。

## 再現

macOS 14+、Node.js 22.18+、Python 3、公開GitHubへの通信が必要。オンライン取得は検証の明示操作であり、通常の監査が通信することを意味しない。

```sh
npm ci
npm run build
SMOOTHSUBMIT_VALIDATION=$(mktemp -d)
python3 scripts/fetch-validation-projects.py "$SMOOTHSUBMIT_VALIDATION"
node scripts/validate-real-projects.mjs "$SMOOTHSUBMIT_VALIDATION" "$SMOOTHSUBMIT_VALIDATION/results.json"
npm test
```

既存入力と結果は上書きしない。上流コードはこのリポジトリへ再配布していない。実験で変更するのは別の一時コピーだけで、証跡の場所を終了時に表示する。

## まだ確認できていない価値

実際の個人開発者・チームが初回操作を迷わず完了するか、指摘のどの割合が提出前の修正につながるか、再提出や待ち時間が減るかは未測定。独立したAIホストでの完全なAudit → Fix → Verify、提出用アーカイブ、実機、App Store Connectも未検証。

次の受け入れ基準は、実際の開発者が自分のアプリで初回監査を完了でき、少なくとも1件の具体的な確認・修正を実行でき、再確認で何が解消し何が残るか理解できること。現段階で示せるのは設定不備への技術的な有用性であり、この利用者側の成果までは主張しない。
