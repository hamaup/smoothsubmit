# Audit → Fix → Verify walkthrough

From the SmoothSubmit source checkout, build once with npm ci and npm run build. The commands below use a temporary synthetic app; they do not modify an existing application. Keep the CLI path in a task-specific variable:

```sh
SMOOTHSUBMIT_CLI="$PWD/dist/cli/index.js"
SMOOTHSUBMIT_DEMO=$(mktemp -d)
cp -R examples/ReviewDemo/. "$SMOOTHSUBMIT_DEMO/"
node "$SMOOTHSUBMIT_CLI" audit --path "$SMOOTHSUBMIT_DEMO" --format json
```

The audit prints its auditId and checkIds in JSON, and its save location on stderr. Inspect the saved Markdown report. Use the camera permission checkId to generate instructions:

```sh
node "$SMOOTHSUBMIT_CLI" fix --path "$SMOOTHSUBMIT_DEMO" --audit /path/from/output/audit.json --check CAMERA_CHECK_ID
```

Fix generates a prompt only. The sample's three definite FAILs are the missing camera purpose, missing UserDefaults reason and iOS 12 deployment target. To simulate the approved settings changes on this temporary copy:

```sh
cp examples/ReviewDemoFixed/App/Info.plist "$SMOOTHSUBMIT_DEMO/App/Info.plist"
cp examples/ReviewDemoFixed/App/PrivacyInfo.xcprivacy "$SMOOTHSUBMIT_DEMO/App/PrivacyInfo.xcprivacy"
cp examples/ReviewDemoFixed/ReviewDemo.xcodeproj/project.pbxproj "$SMOOTHSUBMIT_DEMO/ReviewDemo.xcodeproj/project.pbxproj"
node "$SMOOTHSUBMIT_CLI" verify --path "$SMOOTHSUBMIT_DEMO" --baseline /path/from/first/output/audit.json
```

Verify should show the same three setting conditions as RESOLVED. AI/context conditions and runtime Unknowns remain separate. Copying deletion code alone would not prove backend deletion. The original run stays unchanged and the new audit/verification is saved under a new run ID.

For the agent-assisted path, start with the emitted assessment-template.json and follow the Skill's audit/records reference. Never edit the CLI audit to hide failures.
