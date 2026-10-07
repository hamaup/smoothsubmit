export const content = {
  ja: {
    lang: "ja",
    title: "SmoothSubmit — App Store提出前のAI監査",
    description:
      "iOSアプリの審査リスクを提出前に確認。Claude Code・Codex・Cursorで使えるOSS Skillと、任意の静的監査CLI。Audit → Fix → Verify。",
    skip: "本文へ",
    nav: ["使い方", "チェック範囲", "検証結果", "はじめる"],
    headline: ["つくった。その次は、", "安心して提出へ。"],
    intro: "iOSアプリの審査リスクを、提出前に。",
    lead: "コードと設定から問題を見つけ、根拠と修正案を提示。いつものAI開発ツールで、再確認まで進めます。",
    cta: "Skillではじめる",
    source: "GitHubでコードを見る",
    agents: "Claude Code / Codex / Cursor 向け",
    alpha: "公開alpha · Apache-2.0",
    demoLabel: "監査から再確認まで",
    sample:
      "操作できる説明用サンプル。実際の監査はあなたの開発ツールで実行します。",
    next: "次のステップを見る",
    reset: "監査例に戻る",
    demo: [
      {
        state: "FAIL",
        title: "Privacy Manifestの型が不正",
        body: "NSPrivacyTracking が文字列です。Booleanでの宣言が必要です。",
        code: '"NSPrivacyTracking": "false"',
        note: "根拠：PrivacyInfo.xcprivacy の宣言を確認。",
        summary: "まず監査。足りない情報は残す。",
      },
      {
        state: "FIX PROPOSAL",
        title: "変更箇所と確認方法を提示",
        body: "実際のtrackingの有無を確認し、適切なBoolean値に変更。ここではtrackingなしのサンプルです。",
        code: '"NSPrivacyTracking": false',
        note: "修正は明示的な依頼後に。通常の監査でコードや設定を変えません。",
        summary: "根拠を読んで、修正を依頼。",
      },
      {
        state: "RESOLVED",
        title: "同じ条件を再確認",
        body: "この宣言の型違反は解消。配信地域や審査用ログイン情報など、未確認の条件は引き続き残ります。",
        code: "FAIL → PASS · static check",
        note: "設定の解消と実動作の確認は別。審査通過を保証する結果ではありません。",
        summary: "直ったことまで、確かめる。",
      },
    ],
    unknown: "要確認：配信地域 / 審査用ログイン情報",
    mechanismTitle: "「提出してから知る」を、\n「提出前に気づく」へ。",
    mechanismIntro:
      "チェックリストを渡して終わりにせず、問題の根拠から修正後の確認までつなぎます。",
    steps: [
      [
        "Audit",
        "まず、読める範囲から監査。",
        "Xcodeプロジェクト、設定、関連コードを確認。不明点はUnknownとして残し、判定が変わる質問だけ後からまとめます。",
      ],
      [
        "Fix",
        "なぜ問題か、どう直すか。",
        "Appleの資料と証拠を添え、具体的な修正案や開発エージェント向け指示を生成。実際の変更は、あなたが依頼してから。",
      ],
      [
        "Verify",
        "同じ対象を、もう一度。",
        "新しい監査で前回と比較。指摘が消えただけで解消とはせず、証拠が不足した項目は再確認へ残します。",
      ],
    ],
    scopeTitle: "設定だけで終わらない。\nわからないことも、わかる。",
    scopeIntro:
      "19のルール群で、静的に確認できる条件と、AI・開発者による確認が必要な条件を分けて扱います。",
    scope: [
      [
        "Privacy & permissions",
        "Privacy Manifest、Required Reason API、権限の用途説明、SDKの申告と確認範囲。",
      ],
      [
        "Accounts & payments",
        "アカウント削除、ログイン方式、購入復元、サブスク表示、外部決済の文脈。",
      ],
      [
        "Submission & review",
        "審査用アクセス、Privacy Policy、メタデータ、対象OS、提出ツールチェーンや契約の準備。",
      ],
    ],
    boundaryTitle: "判定に、境界を。",
    boundary:
      "静的解析だけでは、実機の動作、バックエンド、提出バイナリ、App Store Connectの実状態は確認できません。未確認はUnknown。通過確率や「審査OK」の総合点は付けません。",
    rules: "公開版の対応範囲を読む",
    proofTitle: "役に立つか。\n実コードで、確かめました。",
    proofIntro:
      "公開iOSプロジェクトの固定したソーススナップショットで検証。設定不備を一時コピーに注入し、検出・修正指示・再確認まで確認しました。",
    tableHeaders: [
      "実プロジェクトのソース",
      "注入した不備",
      "検出 → 修正後の再確認",
    ],
    tableResults: "3 / 3 検出・解消を確認",
    defectLabel: "各プロジェクトで試した3種類",
    defects:
      "対象OSの設定 / Privacy Manifestの型 / Required Reason APIの理由コード",
    proofFoot:
      "合計9件の意図的な設定不備を検出。加えて57件の自動テストが通過。アプリのビルド・実機テスト・審査提出は行っておらず、実際のリジェクト率や時間削減は未測定です。",
    proofLink: "検証方法・結果・限界を読む",
    proofDate: "alpha.2 検証記録 · 2026-10-07",
    startTitle: "いつものツールに、\n提出前の視点を。",
    startIntro:
      "Skill単体で基本監査を始められます。CLI、Node.js、新しいAPIキー、SmoothSubmitのアカウントは不要です。",
    download: "Skillをダウンロード",
    release: "alpha.2 のリリースを見る",
    installLabel: "あなたのiOSプロジェクト内で",
    copy: "コピー",
    copied: "コピーしました",
    copyError: "コピーできませんでした。テキストを選択してください。",
    destination: "配置先",
    invoke: "呼び出し",
    archiveSteps:
      "ダウンロードしたSkillアーカイブを展開し、smoothsubmitフォルダ全体を次の場所にコピーします。references・assetsも一緒に配置してください。",
    existing: "既存のSkillがある場合は、差分を確認してから更新してください。",
    promptLabel: "プロジェクトの開発セッションで、ひと言。",
    prompt: "SmoothSubmitで確認して",
    discover:
      "ホストの版によりSkillの認識方法は変わります。3ツールすべてでの実際の自動認識は未検証です。",
    installDocs: "導入の詳細を見る",
    cliTitle: "より再現しやすい検査には、追加CLI。",
    cliBody:
      "Xcodeの対象や設定を解決し、JSON / Markdownで監査を保存。監査時の外部通信・LLM呼び出し・xcodebuildの実行はありません。",
    cliRequirements: "macOS 14+ / Node.js 22.18+ · npmレジストリには未公開",
    cliLink: "CLIの導入方法",
    faqTitle: "使う前に、知っておくこと。",
    faq: [
      [
        "「確認して」で何か変更される？",
        "通常の監査では、コード・アプリ設定・App Store Connectを変更したり、提出したりしません。修正案を見た後に、明示的に変更を依頼できます。",
      ],
      [
        "コードはどこに送られる？",
        "CLIはローカルで処理し、ソースを送信しません。SkillはClaude Code・Codex・Cursorなどのモデルとファイル読み取り機能を使うため、利用中ツールのデータ設定が適用されます。",
      ],
      [
        "Appleのルールには追従している？",
        "同梱した公式資料の確認日は2026-10-07です。結果には資料と確認日を添えます。地域・OS・課金方式などの条件を確認し、古い版に依存する前に資料台帳を参照してください。",
      ],
      [
        "App Store審査に必ず通る？",
        "保証はできません。設定漏れや実装の疑問点を事前に見つけるための補助ツールです。実機・バックエンド・提出情報の確認は別途必要です。",
      ],
    ],
    close: "次の提出の前に、\n一度、確認してみませんか。",
    feedback: "使ってみた結果をIssueで共有",
    footer: "Appleとは提携していない独立したOSSプロジェクトです。",
    docs: "資料台帳",
    license: "ライセンス",
    langLabel: "言語",
  },
  en: {
    lang: "en",
    title: "SmoothSubmit — Audit iOS App Store risks before you submit",
    description:
      "Find iOS submission risks, get evidence and actionable fixes, then verify. An open-source Skill for Claude Code, Codex and Cursor, with an optional local CLI.",
    skip: "Skip to content",
    nav: ["How it works", "Coverage", "Validation", "Get started"],
    headline: ["You built it.", "Now, get ready to submit."],
    intro: "Catch iOS review risks before App Store submission.",
    lead: "Find issues in your code and settings, understand the evidence, and get a fix plan. Recheck with the coding agent you already use.",
    cta: "Start with the Skill",
    source: "View source on GitHub",
    agents: "For Claude Code / Codex / Cursor",
    alpha: "Public alpha · Apache-2.0",
    demoLabel: "From audit to verification",
    sample:
      "Interactive illustrative example. Run a real audit in your coding agent.",
    next: "See the next step",
    reset: "Back to the audit",
    demo: [
      {
        state: "FAIL",
        title: "Invalid Privacy Manifest type",
        body: "NSPrivacyTracking is a string. The declaration requires a Boolean.",
        code: '"NSPrivacyTracking": "false"',
        note: "Evidence: the declaration in PrivacyInfo.xcprivacy.",
        summary: "Audit first. Keep the unknowns visible.",
      },
      {
        state: "FIX PROPOSAL",
        title: "A specific change and recheck plan",
        body: "Confirm whether the app tracks, then use the appropriate Boolean. This example declares no tracking.",
        code: '"NSPrivacyTracking": false',
        note: "Changes need an explicit request. A normal audit does not edit code or settings.",
        summary: "Read the evidence. Request the fix.",
      },
      {
        state: "RESOLVED",
        title: "Recheck the same condition",
        body: "The declaration type violation is resolved. Storefronts and reviewer login details still need confirmation.",
        code: "FAIL → PASS · static check",
        note: "A setting fix and runtime verification are separate. This does not guarantee approval.",
        summary: "Verify the fix. Keep the remaining questions.",
      },
    ],
    unknown: "Still unknown: storefronts / reviewer access",
    mechanismTitle: "Find out before\nApple has to tell you.",
    mechanismIntro:
      "Move beyond a checklist: connect the evidence to a fix plan, then check the result.",
    steps: [
      [
        "Audit",
        "Start with what the agent can read.",
        "Inspect the Xcode project, settings and related code. Keep missing facts Unknown, then ask only questions that could change the findings.",
      ],
      [
        "Fix",
        "Understand the risk. Know what to change.",
        "Get evidence, Apple references and a focused fix prompt for your coding agent. Actual changes happen after you explicitly ask.",
      ],
      [
        "Verify",
        "Check the same target again.",
        "Compare a fresh audit with the baseline. A vanished finding is not automatically resolved; missing evidence stays on the recheck list.",
      ],
    ],
    scopeTitle: "See the settings.\nSee what is still unknown.",
    scopeIntro:
      "19 rule families separate supported static checks from conditions that need agent judgment or developer verification.",
    scope: [
      [
        "Privacy & permissions",
        "Privacy Manifest, Required Reason APIs, permission purpose strings, SDK declarations and verification gaps.",
      ],
      [
        "Accounts & payments",
        "Account deletion, login alternatives, purchase restoration, subscription display and external payment context.",
      ],
      [
        "Submission & review",
        "Reviewer access, privacy policy, metadata, minimum OS, submitted toolchain and agreement preparation.",
      ],
    ],
    boundaryTitle: "Every finding has a scope.",
    boundary:
      "Static analysis cannot prove device behavior, backend flows, submitted binaries or actual App Store Connect state. Missing evidence remains Unknown. There is no approval prediction or readiness score.",
    rules: "Read the shipped coverage",
    proofTitle: "Does it help?\nWe checked real code.",
    proofIntro:
      "We tested pinned public iOS source snapshots, injecting defects into temporary copies to check detection, fix prompts and verification after repair.",
    tableHeaders: [
      "Public project source",
      "Injected defects",
      "Detection → recheck after repair",
    ],
    tableResults: "3 / 3 detected and resolved",
    defectLabel: "Three defect types per project",
    defects:
      "Minimum OS setting / Privacy Manifest type / Required Reason API reason code",
    proofFoot:
      "All 9 deliberately injected setting defects were detected. 57 automated tests also passed. These apps were not built, device-tested or submitted. Rejection-rate improvements and time savings have not been measured.",
    proofLink: "Read the methods, results and limits",
    proofDate: "alpha.2 validation record · 2026-10-07",
    startTitle: "Your coding agent.\nA submission-ready perspective.",
    startIntro:
      "Start a basic audit with the standalone Skill. No CLI, Node.js, new API key or SmoothSubmit account required.",
    download: "Download the Skill",
    release: "View the alpha.2 release",
    installLabel: "Inside your iOS project",
    copy: "Copy",
    copied: "Copied",
    copyError: "Copy failed. Select and copy the text manually.",
    destination: "Destination",
    invoke: "Invocation",
    archiveSteps:
      "Extract the downloaded Skill archive, then copy the whole smoothsubmit folder to this location, including references and assets.",
    existing:
      "If a Skill already exists there, review the differences before updating it.",
    promptLabel: "In your project’s coding session, ask:",
    prompt: "Audit this project with SmoothSubmit",
    discover:
      "Skill discovery depends on the host version. Live automatic discovery across all three tools is not yet verified.",
    installDocs: "Read the installation guide",
    cliTitle: "Add the CLI for repeatable checks.",
    cliBody:
      "Resolve Xcode targets and settings, and save JSON / Markdown audit records. Audits make no external requests, call no LLM and do not run xcodebuild.",
    cliRequirements:
      "macOS 14+ / Node.js 22.18+ · Not published to the npm registry",
    cliLink: "CLI installation guide",
    faqTitle: "Before you use it.",
    faq: [
      [
        "Does an audit change my app?",
        "A normal audit does not edit code or app settings, write to App Store Connect or submit your app. Review the proposed fixes, then explicitly request the changes you want.",
      ],
      [
        "Where does my code go?",
        "The CLI processes your source locally and does not send it. The Skill uses your coding tool’s model and file access, so that tool’s data settings apply.",
      ],
      [
        "How current are the Apple references?",
        "The bundled official sources were checked on 2026-10-07. Findings include references and their knowledge date. Requirements depend on regions, OS and product types; consult the source register before relying on an older release.",
      ],
      [
        "Will my app definitely pass review?",
        "No guarantee. SmoothSubmit helps surface configuration gaps and implementation questions before submission. Device, backend and submission-information checks are still needed.",
      ],
    ],
    close: "Before your next submission,\ngive it a check.",
    feedback: "Share your experience in an Issue",
    footer: "An independent open-source project. Not affiliated with Apple.",
    docs: "Apple source register",
    license: "License",
    langLabel: "Language",
  },
};
