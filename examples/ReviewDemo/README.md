# ReviewDemo — synthetic audit input

Run the CLI from the SmoothSubmit source checkout with npm run demo, or use the standalone Skill in this folder.

The fixture intentionally omits a camera purpose string and a UserDefaults approved reason, and specifies iOS 12 as its deployment target. It creates a local demonstration account without a deletion flow. It has no real backend or purchase integration.

App.swift is SwiftUI demonstration source. The minimal pbxproj is a scanner fixture with readable identifiers, not a validated shipping Xcode project. No app build, simulator run, App Store submission or reviewer-account validation has been performed.

The fixed input is in the adjacent ReviewDemoFixed folder. To compare improvements use the same target in a temporary working copy as described in the demo walkthrough.
