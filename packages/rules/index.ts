import { readFileSync } from "node:fs";
import {
  checkId,
  hash,
  evidence,
  KNOWLEDGE,
  VERSION,
  type Json,
  type Check,
  type Status,
  type Severity,
} from "../contracts/index.js";
import { fileEvidence, type Scan } from "../scanner/index.js";
const load = (n: string) =>
  JSON.parse(
    readFileSync(new URL(`../../data/${n}.json`, import.meta.url), "utf8"),
  );
export const SOURCES: Json[] = load("sources");
export const REASONS: Json[] = load("reasons");
export const SDKS: Json = load("sdks");
export const RULES: Json[] = [
  [
    "ARG-PERM-001",
    "Permission keys",
    "権限キー",
    "HIGH",
    "APPLE-PURPOSE-STRINGS",
    ["permission_key"],
  ],
  [
    "ARG-PERM-002",
    "Permission purpose",
    "権限説明の用途",
    "MEDIUM",
    "APPLE-PURPOSE-STRINGS",
    ["purpose_content"],
  ],
  [
    "ARG-PRIV-001",
    "Privacy Manifest structure",
    "Privacy Manifestの構造",
    "HIGH",
    "APPLE-PRIVACY-MANIFEST",
    ["manifest_structure"],
  ],
  [
    "ARG-PRIV-002",
    "Required Reason API",
    "Required Reason API",
    "HIGH",
    "APPLE-REQUIRED-REASON-API",
    ["reason_declaration", "reason_usage"],
  ],
  [
    "ARG-SDK-001",
    "SDK privacy and signatures",
    "SDKの宣言・署名",
    "MEDIUM",
    "APPLE-SDK-REQUIREMENTS",
    ["sdk_manifest", "sdk_signature"],
  ],
  [
    "ARG-AUTH-001",
    "Account deletion",
    "アカウント削除",
    "HIGH",
    "APPLE-REVIEW-GUIDELINES",
    ["deletion_code", "deletion_runtime"],
  ],
  [
    "ARG-AUTH-002",
    "Login alternatives",
    "ログインの代替手段",
    "HIGH",
    "APPLE-REVIEW-GUIDELINES",
    ["login_eligibility", "login_code", "login_runtime"],
  ],
  [
    "ARG-IAP-001",
    "Purchase restoration",
    "購入復元",
    "MEDIUM",
    "APPLE-STOREKIT-SYNC",
    ["restore_code", "restore_runtime"],
  ],
  [
    "ARG-IAP-002",
    "Purchase entitlements",
    "購入と利用権",
    "MEDIUM",
    "APPLE-REVIEW-GUIDELINES",
    ["entitlement_code", "entitlement_runtime"],
  ],
  [
    "ARG-IAP-003",
    "Subscription display",
    "サブスクの購入前表示",
    "MEDIUM",
    "APPLE-PAID-AGREEMENT",
    ["subscription_display", "subscription_runtime"],
  ],
  [
    "ARG-REVIEW-001",
    "Review access",
    "審査アクセス",
    "MEDIUM",
    "APPLE-REVIEW-GUIDELINES",
    ["access_preparation", "access_runtime"],
  ],
  [
    "ARG-PRIV-003",
    "Privacy policy",
    "プライバシーポリシー",
    "MEDIUM",
    "APPLE-REVIEW-GUIDELINES",
    ["policy_code", "policy_runtime"],
  ],
  [
    "ARG-PAY-001",
    "External purchase links",
    "外部購入への誘導",
    "HIGH",
    "APPLE-REVIEW-GUIDELINES",
    ["payment_context", "payment_manual"],
  ],
  [
    "ARG-BUILD-001",
    "Deployment target",
    "最低対応OS",
    "HIGH",
    "APPLE-SUBMISSION-REQUIREMENTS",
    ["deployment_setting", "deployment_archive"],
  ],
  [
    "ARG-BUILD-002",
    "Submitted toolchain",
    "提出ビルドのXcode・SDK",
    "HIGH",
    "APPLE-SUBMISSION-REQUIREMENTS",
    ["toolchain_preparation", "toolchain_archive"],
  ],
  [
    "ARG-PRIV-004",
    "Third-party data sharing",
    "第三者へのデータ共有",
    "HIGH",
    "APPLE-REVIEW-GUIDELINES",
    ["sharing_code", "sharing_runtime"],
  ],
  [
    "ARG-PRIV-005",
    "Tracking and ATT",
    "追跡とATT",
    "HIGH",
    "APPLE-ATT",
    ["tracking_context", "tracking_code", "tracking_runtime"],
  ],
  [
    "ARG-REVIEW-002",
    "Metadata preparation",
    "メタデータの準備",
    "MEDIUM",
    "APPLE-APP-PRIVACY",
    ["metadata_preparation", "metadata_registered"],
  ],
  [
    "ARG-CONTRACT-001",
    "Agreements and trader declarations",
    "契約・Traderの準備",
    "MEDIUM",
    "APPLE-DPLA",
    ["contract_preparation", "contract_account"],
  ],
].map(([id, en, ja, severity, source, components]) => ({
  ruleId: id,
  title: { en, ja },
  severity,
  sourceDocumentId: source,
  components,
  ruleVersion: "1.0.0",
  logicVersion: "1.0.0",
  contentVersion: "1.0.0",
  knowledgeAsOf: KNOWLEDGE,
}));
const perms = [
  {
    category: "camera",
    key: "NSCameraUsageDescription",
    symbols: ["AVCaptureDevice"],
    call: ["AVCaptureDevice", "requestAccess", "for", "video"],
  },
  {
    category: "microphone",
    key: "NSMicrophoneUsageDescription",
    symbols: ["AVAudioSession", "AVAudioApplication"],
    call: ["AVAudioApplication", "requestRecordPermission"],
  },
  {
    category: "location",
    key: "NSLocationWhenInUseUsageDescription",
    symbols: ["requestWhenInUseAuthorization"],
    call: [],
  },
  {
    category: "location",
    key: "NSLocationAlwaysAndWhenInUseUsageDescription",
    symbols: ["requestAlwaysAuthorization"],
    call: [],
  },
  {
    category: "photos",
    key: "NSPhotoLibraryUsageDescription",
    symbols: ["PHPhotoLibrary"],
    call: ["PHPhotoLibrary", "requestAuthorization"],
  },
  {
    category: "photos",
    key: "NSPhotoLibraryAddUsageDescription",
    symbols: ["PHPhotoLibrary"],
    call: ["PHPhotoLibrary", "requestAuthorization", "for", "addOnly"],
  },
  {
    category: "contacts",
    key: "NSContactsUsageDescription",
    symbols: ["CNContactStore"],
    call: [],
  },
];
export const permissions = perms;
export function assessmentAllowed(c: Check): boolean {
  return (
    ![
      "scope",
      "unresolved",
      "permission_key",
      "manifest_structure",
      "reason_declaration",
      "sdk_signature",
      "deployment_setting",
    ].includes(c.subject.subjectKey.component) &&
    !manualMethods(c.subject.subjectKey.component) &&
    !c.subject.subjectKey.component.endsWith("_preparation")
  );
}
export function manualMethods(component: string): string[] | null {
  const map: Json = {
    deletion_runtime: ["device_test", "backend_test", "review_walkthrough"],
    login_runtime: ["device_test", "review_walkthrough"],
    restore_runtime: ["device_test", "sandbox_test"],
    entitlement_runtime: ["device_test", "sandbox_test"],
    subscription_runtime: ["device_test", "sandbox_test"],
    access_runtime: ["review_walkthrough"],
    policy_runtime: ["review_walkthrough"],
    sharing_runtime: ["device_test", "backend_test", "review_walkthrough"],
    tracking_runtime: ["device_test", "backend_test", "review_walkthrough"],
    sdk_signature: ["archive_inspection"],
    deployment_archive: ["archive_inspection"],
    toolchain_archive: ["archive_inspection"],
    metadata_registered: ["app_store_connect"],
    contract_account: ["app_store_connect"],
    payment_manual: ["policy_review"],
  };
  return map[component] || null;
}
export function evaluate(
  s: Scan,
  semanticSnapshotHash: string,
  date = new Date(),
): Check[] {
  const checks: Check[] = [],
    f = s.config.features,
    english = s.config.language === "en";
  const shadowed = new Set(
    [...s.tokens.values()].flatMap((t) =>
      t.flatMap((x, i) =>
        ["class", "struct", "enum", "typealias"].includes(x.text) && t[i + 1]
          ? [t[i + 1].text]
          : [],
      ),
    ),
  );
  const hits = (symbols: string[]) =>
    [...s.tokens.entries()].flatMap(([path, t]) =>
      t
        .filter(
          (x, i) =>
            x.condition !== "inactive" &&
            symbols.includes(x.text) &&
            !["import", "class", "struct", "enum", "typealias"].includes(
              t[i - 1]?.text,
            ),
        )
        .map((x) => ({
          path,
          ...x,
          condition: shadowed.has(x.text) ? "unknown" : x.condition,
          membership: s.files.find((f) => f.path === path)?.membership,
        })),
    );
  const ev = (hs: Json[]) =>
    hs
      .slice(0, 20)
      .map((h) =>
        fileEvidence(
          s,
          h.path,
          h.line,
          `API candidate ${h.text}; condition=${h.condition}; membership=${h.membership}`,
        ),
      );
  const search = () =>
    evidence(
      "search",
      {
        methodId: "swift-lexer-v1",
        inputSetHash: hash(s.files.filter((f) => f.role === "swift")),
        searchedPaths: [...s.tokens.keys()].sort(),
        candidateCount: 0,
        limitations: ["No whole-program call graph or SDK internals."],
      },
      "Candidate search only; absence does not prove feature absence.",
    );
  const cfgEv = (p: string, v: any) =>
    evidence(
      "config",
      { pointer: p, valueType: typeof v, normalizedValue: v },
      "User declaration; not a runtime measurement.",
    );
  function add(
    rule: Json,
    component: string,
    status: Status,
    reason: string,
    evidenceList: any[] = [],
    key: Json = {},
    provenance: Check["provenance"] = "scanner",
    limitations: string[] = [],
  ): Check {
    const subjectKey = { component, ...key };
    const source =
      SOURCES.find((x) => x.sourceDocumentId === rule.sourceDocumentId) ||
      SOURCES.find((x) => x.sourceDocumentId === "APPLE-REVIEW-GUIDELINES")!;
    const c: Check = {
      checkId: checkId(rule.ruleId, s.scope, subjectKey),
      ruleId: rule.ruleId,
      ruleVersion: rule.ruleVersion,
      subject: {
        kind: component === "scope" ? "scope" : "condition",
        subjectKey,
        targetId: s.scope.targetId,
      },
      status,
      severity: ["FAIL", "NEEDS_REVIEW"].includes(status)
        ? rule.severity
        : null,
      confidence: status === "FAIL" ? "HIGH" : "MEDIUM",
      confidenceReason: english
        ? "Confidence reflects evidence, not approval probability."
        : "確度は証拠に対する評価で、審査通過率ではありません。",
      title: rule.title[s.config.language],
      reason,
      evidence: evidenceList,
      sources: [source],
      provenance,
      verificationLevel: provenance === "user" ? "user_attestation" : "static",
      limitations,
      remediation: [],
      verificationSteps: [],
    };
    if (["FAIL", "NEEDS_REVIEW", "UNKNOWN"].includes(status)) {
      c.remediation = [
        english
          ? "Inspect the cited scope; implement the required behavior or confirm applicability."
          : "引用した範囲を確認し、必要な設定・動作を実装するか適用条件を確認してください。",
      ];
      c.verificationSteps = [
        english
          ? "Rerun this check on the same target; validate remaining runtime steps separately."
          : "同じ対象を再監査し、未確認の実動作は別途テストしてください。",
      ];
    }
    checks.push(c);
    return c;
  }
  const boolState = (value: any, hs: Json[]) =>
    value === false
      ? hs.length
        ? "NEEDS_REVIEW"
        : "NOT_APPLICABLE"
      : value === true || hs.length
        ? "NEEDS_REVIEW"
        : "UNKNOWN";
  for (const rule of RULES) {
    add(
      rule,
      "scope",
      s.partial ? "UNKNOWN" : "PASS",
      english
        ? "Input scope only; no claim of feature compliance."
        : "入力の確認範囲です。機能の適合確認ではありません。",
      [],
      {},
      "scanner",
      ["No compiled archive, network, backend, or device execution."],
    );
    const id = rule.ruleId;
    if (id === "ARG-PERM-001" || id === "ARG-PERM-002") {
      let made = 0;
      for (const p of perms) {
        if (p.category === "photos") {
          const tokens = [...s.tokens.values()].flat();
          const calls = tokens.filter((x) => x.text === "requestAuthorization");
          const addOnly = tokens.some(
            (x, i) =>
              x.text === "requestAuthorization" &&
              tokens[i + 1]?.text === "for" &&
              tokens[i + 2]?.text === "addOnly",
          );
          const readWrite = tokens.some(
            (x, i) =>
              x.text === "requestAuthorization" &&
              (tokens[i + 1]?.text !== "for" ||
                tokens[i + 2]?.text === "readWrite"),
          );
          if (
            p.key === "NSPhotoLibraryUsageDescription" &&
            addOnly &&
            !readWrite
          )
            continue;
          if (
            p.key === "NSPhotoLibraryAddUsageDescription" &&
            !addOnly &&
            s.info?.[p.key] === undefined
          )
            continue;
        }
        const hs = hits(p.symbols),
          value = s.info?.[p.key],
          declared =
            Array.isArray(f.permissions) && f.permissions.includes(p.category);
        if (!hs.length && value === undefined && !declared) continue;
        made++;
        const struct = s.infoUnknown.has("*") || s.infoUnknown.has(p.key);
        const direct =
          hs.some(
            (h) => h.condition === "active" && h.membership === "included",
          ) &&
          ((p.call.length > 0 &&
            [...s.tokens.values()].some((t) =>
              t.some((_, i) =>
                p.call.every(
                  (x, j) =>
                    t[i + j]?.text === x && t[i + j]?.condition === "active",
                ),
              ),
            )) ||
            [
              "requestWhenInUseAuthorization",
              "requestAlwaysAuthorization",
            ].includes(p.symbols[0]));
        const status: Status =
          id === "ARG-PERM-002"
            ? value
              ? "NEEDS_REVIEW"
              : "UNKNOWN"
            : struct
              ? "UNKNOWN"
              : value !== undefined && typeof value === "string" && value.trim()
                ? "PASS"
                : direct
                  ? "FAIL"
                  : "NEEDS_REVIEW";
        const es = ev(hs);
        const ie = s.infoEvidence[p.key];
        if (ie && s.buffers.has(ie.path))
          es.push(
            fileEvidence(
              s,
              ie.path,
              null,
              "Permission setting observed",
              ie.keyPath,
            ),
          );
        add(
          rule,
          id === "ARG-PERM-001" ? "permission_key" : "purpose_content",
          status,
          english
            ? `Review ${p.key} for ${p.category}; target membership and actual use matter.`
            : `${p.category}の${p.key}を確認。説明の存在と用途・実動作は別に確認します。`,
          es,
          { permissionKey: p.key },
          "scanner",
          struct ? ["Generated/final plist value not resolved."] : [],
        );
        if (id === "ARG-PERM-002")
          for (const l of s.localizations.filter((x) => x.key === p.key))
            add(
              rule,
              "purpose_content",
              l.value ? "NEEDS_REVIEW" : "UNKNOWN",
              "Localized purpose text requires context review.",
              [fileEvidence(s, l.path, null, "Localized purpose value", null)],
              { permissionKey: p.key, locale: l.locale },
            );
      }
      if (!made)
        add(
          rule,
          "unresolved",
          f.permissions !== "unknown" && f.permissions.length === 0
            ? "NOT_APPLICABLE"
            : "UNKNOWN",
          "No known permission candidate; this is not proof of absence.",
          [search()],
        );
      continue;
    }
    if (id === "ARG-PRIV-001") {
      if (!s.manifests.length)
        add(
          rule,
          "unresolved",
          "UNKNOWN",
          "Manifest not found in the selected target. Determine required APIs and SDK applicability.",
          [search()],
        );
      for (const m of s.manifests) {
        let status: Status = m.data ? "PASS" : "FAIL";
        const d = m.data;
        if (d) {
          if (typeof d !== "object" || Array.isArray(d)) status = "FAIL";
          if (
            Object.keys(d).some(
              (k) =>
                ![
                  "NSPrivacyTracking",
                  "NSPrivacyTrackingDomains",
                  "NSPrivacyCollectedDataTypes",
                  "NSPrivacyAccessedAPITypes",
                ].includes(k),
            )
          )
            status = "NEEDS_REVIEW";
          if (
            d.NSPrivacyTracking !== undefined &&
            typeof d.NSPrivacyTracking !== "boolean"
          )
            status = "FAIL";
          for (const k of [
            "NSPrivacyTrackingDomains",
            "NSPrivacyCollectedDataTypes",
            "NSPrivacyAccessedAPITypes",
          ])
            if (d[k] !== undefined && !Array.isArray(d[k])) status = "FAIL";
          if (
            Array.isArray(d.NSPrivacyTrackingDomains) &&
            d.NSPrivacyTrackingDomains.some(
              (x: any) => typeof x !== "string" || !x.trim(),
            )
          )
            status = "FAIL";
          if (
            Array.isArray(d.NSPrivacyAccessedAPITypes) &&
            d.NSPrivacyAccessedAPITypes.some(
              (x: Json) =>
                !x ||
                typeof x.NSPrivacyAccessedAPIType !== "string" ||
                !Array.isArray(x.NSPrivacyAccessedAPITypeReasons) ||
                !x.NSPrivacyAccessedAPITypeReasons.length ||
                x.NSPrivacyAccessedAPITypeReasons.some(
                  (r: any) => typeof r !== "string",
                ),
            )
          )
            status = "FAIL";
          if (
            Array.isArray(d.NSPrivacyCollectedDataTypes) &&
            d.NSPrivacyCollectedDataTypes.some(
              (x: Json) =>
                !x ||
                typeof x.NSPrivacyCollectedDataType !== "string" ||
                typeof x.NSPrivacyCollectedDataTypeLinked !== "boolean" ||
                typeof x.NSPrivacyCollectedDataTypeTracking !== "boolean" ||
                !Array.isArray(x.NSPrivacyCollectedDataTypePurposes),
            )
          )
            status = "FAIL";
        }
        if (m.membership !== "included" && status === "PASS")
          status = "UNKNOWN";
        if (
          !m.data &&
          s.diagnostics.some((x) => x.path === m.path && x.level === "error")
        )
          status = "ERROR";
        add(
          rule,
          "manifest_structure",
          status,
          "Manifest syntax/types only. Required reasons, SDK declarations and privacy truthfulness are separate.",
          m.fileHash
            ? [fileEvidence(s, m.path, null, "Privacy Manifest structure", "/")]
            : [],
          { path: m.path, bundleKey: s.scope.targetId },
        );
      }
      continue;
    }
    if (id === "ARG-PRIV-002") {
      let made = 0;
      for (const r of REASONS) {
        const hs = hits(r.symbols);
        const ds = s.manifests
          .filter(
            (m) =>
              m.membership === "included" &&
              Array.isArray(m.data?.NSPrivacyAccessedAPITypes),
          )
          .flatMap((m) =>
            m.data.NSPrivacyAccessedAPITypes.filter(
              (x: Json) => x.NSPrivacyAccessedAPIType === r.category,
            ).map((x: Json) => ({ m, x })),
          );
        if (!hs.length && !ds.length) continue;
        made++;
        const allowed = ds.some(
          ({ x }) =>
            Array.isArray(x.NSPrivacyAccessedAPITypeReasons) &&
            x.NSPrivacyAccessedAPITypeReasons.length &&
            x.NSPrivacyAccessedAPITypeReasons.every((v: string) =>
              r.allowedReasons.includes(v),
            ),
        );
        const certain =
          hs.some(
            (h) =>
              h.condition === "active" &&
              h.membership === "included" &&
              ["UserDefaults", "systemUptime", "activeInputModes"].includes(
                h.text,
              ),
          ) &&
          !s.partial &&
          (!hs.some((h) => h.text === "UserDefaults") ||
            [...s.tokens.values()].some((t) =>
              t.some(
                (x, i) =>
                  x.text === "UserDefaults" &&
                  ["standard", "suiteName"].includes(t[i + 1]?.text),
              ),
            ));
        const status: Status = allowed
          ? "PASS"
          : hs.length && certain
            ? "FAIL"
            : hs.length || ds.length
              ? "NEEDS_REVIEW"
              : "UNKNOWN";
        add(
          rule,
          "reason_declaration",
          status,
          `Check ${r.category} declarations in this app's bundle. SDKs require their own declarations.`,
          ev(hs),
          { bundleKey: s.scope.targetId, permissionKey: r.category },
        );
        add(
          rule,
          "reason_usage",
          ds.length ? "NEEDS_REVIEW" : "UNKNOWN",
          "Approved code existence does not establish truthful API use.",
          ds.map(({ m }) =>
            fileEvidence(
              s,
              m.path,
              null,
              "Declared reason requires semantic review",
              "/NSPrivacyAccessedAPITypes",
            ),
          ),
          { bundleKey: s.scope.targetId, permissionKey: r.category },
        );
      }
      if (!made)
        add(
          rule,
          "unresolved",
          "UNKNOWN",
          "No covered API candidate. Indirect or SDK usage remains unverified.",
          [search()],
        );
      continue;
    }
    if (id === "ARG-SDK-001") {
      const ds = s.dependencies.filter((d) =>
        SDKS.names.some(
          (n: string) =>
            n.toLowerCase() === d.name?.split("/")[0]?.toLowerCase() ||
            (d.name?.toLowerCase() === "firebase-ios-sdk" &&
              n.startsWith("Firebase")),
        ),
      );
      if (!ds.length)
        add(
          rule,
          "unresolved",
          "UNKNOWN",
          "No listed SDK resolved. Unlisted SDKs are not certified safe.",
          [search()],
        );
      for (const d of ds) {
        add(
          rule,
          "sdk_manifest",
          "UNKNOWN",
          "Lockfile identity does not verify SDK Manifest inclusion.",
          [],
          { dependencyId: d },
        );
        add(
          rule,
          "sdk_signature",
          "UNKNOWN",
          "Final binary signature requires archive inspection.",
          [],
          { dependencyId: d },
        );
      }
      continue;
    }
    if (id === "ARG-BUILD-001") {
      const v = s.settings.IPHONEOS_DEPLOYMENT_TARGET;
      const known = /^\d+(?:\.\d+){0,2}$/.test(v || "");
      const supported = date.toISOString().slice(0, 10) >= "2026-09-09";
      const status: Status =
        !known || !supported ? "UNKNOWN" : parseFloat(v) < 13 ? "FAIL" : "PASS";
      add(
        rule,
        "deployment_setting",
        status,
        `Deployment Target=${v ?? "unknown"}; minimum 13 applies from 2026-09-09. This is not the archive value.`,
        [],
        {},
      );
      add(
        rule,
        "deployment_archive",
        "UNKNOWN",
        "Inspect the final archive minimum OS separately.",
      );
      continue;
    }
    if (id === "ARG-BUILD-002") {
      const b = s.config.reportedBuild;
      const good =
        b &&
        parseFloat(b.xcodeVersion) >= 26 &&
        parseFloat(b.sdkVersion) >= 26 &&
        !/[^\d.]/.test(b.sdkVersion + b.xcodeVersion);
      add(
        rule,
        "toolchain_preparation",
        !b ? "UNKNOWN" : good ? "PASS" : "NEEDS_REVIEW",
        "Submitted build versions are a user declaration, not installed Xcode measurement.",
        b ? [cfgEv("/reportedBuild", b)] : [],
        {},
        b ? "user" : "scanner",
      );
      add(
        rule,
        "toolchain_archive",
        "UNKNOWN",
        "Verify actual submitted build ID and toolchain.",
      );
      continue;
    }
    if (id === "ARG-REVIEW-001") {
      const hs = hits(["signIn", "login", "LoginView"]),
        app = boolState(f.loginRequired, hs);
      const prepared = s.config.reviewAccess.prepared;
      const status: Status =
        app === "NOT_APPLICABLE"
          ? "NOT_APPLICABLE"
          : app === "UNKNOWN"
            ? "UNKNOWN"
            : prepared === true && s.config.reviewNotesPrepared === true
              ? "PASS"
              : prepared === false
                ? "NEEDS_REVIEW"
                : "UNKNOWN";
      add(
        rule,
        "access_preparation",
        status,
        "Prepare full reviewer access and Review Notes without storing credentials.",
        [cfgEv("/reviewAccess", s.config.reviewAccess)],
        {},
        "user",
      );
      add(
        rule,
        "access_runtime",
        app === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : "UNKNOWN",
        "Walk through reviewer access and backend availability.",
      );
      continue;
    }
    if (id === "ARG-REVIEW-002" || id === "ARG-CONTRACT-001") {
      const items =
        id === "ARG-REVIEW-002"
          ? ["ageRating", "socialNetworking", "appPrivacy"]
          : ["dpla", "paidAppsAgreement", "traderStatus", "traderInformation"];
      for (const item of items) {
        const v = s.config.submissionPreparation[item];
        const na =
          item === "paidAppsAgreement" &&
          f.paidApp === false &&
          Array.isArray(f.productTypes) &&
          !f.productTypes.length;
        add(
          rule,
          id === "ARG-REVIEW-002"
            ? "metadata_preparation"
            : "contract_preparation",
          na
            ? "NOT_APPLICABLE"
            : v === true
              ? "PASS"
              : v === false
                ? "NEEDS_REVIEW"
                : "UNKNOWN",
          `User-reported ${item} preparation only; registered/account state is separate.`,
          [cfgEv("/submissionPreparation/" + item, v)],
          { permissionKey: item },
          "user",
        );
      }
      if (id === "ARG-REVIEW-002" && f.kidsCategory !== false)
        add(
          rule,
          "metadata_preparation",
          f.kidsCategory === true ? "NEEDS_REVIEW" : "UNKNOWN",
          "Confirm Kids Category applicability and specialist requirements; not automatically certified.",
          [],
          { permissionKey: "kids_category" },
        );
      if (id === "ARG-REVIEW-002")
        add(
          rule,
          "metadata_preparation",
          s.config.metadataDeclarations ? "NEEDS_REVIEW" : "UNKNOWN",
          "Compare privacy answer summary against data flows and SDK behavior.",
          [],
          { permissionKey: "privacy_consistency" },
        );
      add(
        rule,
        id === "ARG-REVIEW-002" ? "metadata_registered" : "contract_account",
        "UNKNOWN",
        "App Store Connect/account state not read by this audit.",
      );
      continue;
    }
    const contexts: Json = {
      "ARG-AUTH-001": {
        flag: f.accountCreation,
        symbols: ["createUser", "signUp", "registerAccount", "deleteAccount"],
        message:
          "Trace in-app account deletion into the existing backend; logout is insufficient.",
      },
      "ARG-AUTH-002": {
        flag: Array.isArray(f.authProviders)
          ? f.authProviders.some((x: string) =>
              ["google", "facebook", "custom"].includes(x),
            )
          : "unknown",
        symbols: [
          "GIDSignIn",
          "FBSDKLoginManager",
          "ASAuthorizationAppleIDProvider",
        ],
        message:
          "Review main-account authentication, guideline 4.8 exceptions, and equivalent alternatives.",
      },
      "ARG-IAP-001": {
        flag: Array.isArray(f.productTypes)
          ? f.productTypes.some((x: string) => x !== "consumable")
          : "unknown",
        symbols: [
          "StoreKit",
          "AppStore",
          "restoreCompletedTransactions",
          "currentEntitlements",
        ],
        message:
          "Trace restore UI, restoration and entitlement updates; AppStore.sync is not the only acceptable design.",
      },
      "ARG-IAP-002": {
        flag: Array.isArray(f.productTypes)
          ? !!f.productTypes.length
          : "unknown",
        symbols: ["StoreKit", "purchase", "Transaction"],
        message:
          "Review success, cancellation, pending, verification and entitlement updates.",
      },
      "ARG-IAP-003": {
        flag: Array.isArray(f.productTypes)
          ? f.productTypes.includes("auto_renewable")
          : "unknown",
        symbols: ["subscription", "SubscriptionView"],
        message:
          "Review title, period, actual price, terms and privacy links before purchase.",
      },
      "ARG-PRIV-003": {
        flag: true,
        symbols: ["privacyPolicy", "PrivacyPolicyView"],
        message:
          "Trace the in-app privacy policy link. Public availability and registration require separate verification.",
      },
      "ARG-PAY-001": {
        flag: "unknown",
        symbols: ["openURL", "Link", "purchaseURL", "checkout"],
        message:
          "Confirm digital/physical product, storefront, device, OS, distribution, agreement and entitlement. No automatic violation.",
      },
      "ARG-PRIV-004": {
        flag:
          f.thirdPartyDataSharing === true || f.thirdPartyAI === true
            ? true
            : f.thirdPartyDataSharing === false && f.thirdPartyAI === false
              ? false
              : "unknown",
        symbols: ["URLSession", "OpenAI", "Anthropic", "upload"],
        message:
          "Trace personal data, recipients, disclosure, explicit consent and sending order.",
      },
      "ARG-PRIV-005": {
        flag: f.tracking,
        symbols: ["ATTrackingManager", "ASIdentifierManager", "IDFA"],
        message:
          "Review actual tracking definition and permission gating; analytics alone does not establish tracking.",
      },
    };
    const ctx = contexts[id];
    const hs = hits(ctx.symbols),
      st = boolState(ctx.flag, hs);
    for (const component of rule.components) {
      const runtime = !!manualMethods(component);
      add(
        rule,
        component,
        runtime ? (st === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : "UNKNOWN") : st,
        ctx.message,
        hs.length ? ev(hs) : [search()],
        {},
        st === "NOT_APPLICABLE" ? "user" : "scanner",
        runtime
          ? ["Runtime/backend behavior not executed."]
          : ["Code context requires Skill review."],
      );
    }
  }
  for (const c of checks) {
    const methods = manualMethods(c.subject.subjectKey.component);
    if (!methods) continue;
    const records = s.config.manualVerifications
      .filter(
        (m: Json) =>
          m.checkId === c.checkId &&
          hash(m.scopeKey) ===
            hash(
              (({ project, targetId, configuration, sdk, arch }) => ({
                project,
                targetId,
                configuration,
                sdk,
                arch,
              }))(s.scope),
            ) &&
          m.semanticSnapshotHash === semanticSnapshotHash &&
          methods.includes(m.method),
      )
      .sort((a: Json, b: Json) => b.observedAt.localeCompare(a.observedAt));
    if (!records.length) continue;
    const r = records[0];
    const conflict = records.some(
      (m: Json) =>
        m.observedAt === r.observedAt && m.conclusion !== r.conclusion,
    );
    c.status = conflict
      ? "NEEDS_REVIEW"
      : r.conclusion === "pass"
        ? "PASS"
        : r.conclusion === "fail"
          ? c.ruleId === "ARG-PAY-001"
            ? "NEEDS_REVIEW"
            : "FAIL"
          : "UNKNOWN";
    c.severity = ["FAIL", "NEEDS_REVIEW"].includes(c.status)
      ? RULES.find((x) => x.ruleId === c.ruleId)!.severity
      : null;
    c.provenance = "user";
    c.verificationLevel = "user_attestation";
    c.evidence.push(cfgEv("/manualVerifications", r));
    c.limitations = r.limitations;
    c.reason = "User-attested verification; not executed by SmoothSubmit.";
  }
  checks.sort((a, b) => a.checkId.localeCompare(b.checkId));
  return checks;
}
