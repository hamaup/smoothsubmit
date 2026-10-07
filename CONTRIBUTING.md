# Contributing

Start with the product specification and rule contracts. Focus on an observable misclassification, missing source evidence, or a reproducible installation problem.

Use Node 22.18+ on macOS 14+. Run npm ci, npm test, npm run check:docs and npm run check:skill. Package changes also need npm pack and node scripts/pack-smoke.mjs. Keep package-lock.json committed. Format TypeScript and JavaScript with the pinned Prettier version.

A rule change needs an official source reference, knowledge date, applicable target/configuration and positive/negative/unknown cases. Do not expand a keyword into definite FAIL, use the SDK list as a dangerous-SDK blacklist, or silently convert unobserved behavior to PASS. Keep code and runtime checks separate. A missing finding after exclusions or read failures must not count as a fix.

Do not commit private app source, credentials, .env files, real reviewer accounts or audit runs. Prefer a small synthetic fixture. Keep existing audit/assessment records immutable and retain static evidence when adding AI context.

Schema changes require contract and compatibility review. The generated schemas come from scripts/schemas.py; regenerate and run the behavioral tests after changes. packages modules compile to the npm archive; the distributed CLI must not depend on unpublished workspace packages or development tools.

Before a release, check current Apple source changes, runtime dependency licenses, npm archive installation, CLI/Skill version pairing, and RELEASE_STATUS. Only mark a host/device/build test as complete when it actually ran. Publishing the npm registry package requires an authorized npm account/scope; GitHub release archives are a separate distribution route.
