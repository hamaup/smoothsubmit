import SwiftUI
import AVFoundation
import StoreKit

@main
struct ReviewDemoApp: App {
    @State private var accountCreated = UserDefaults.standard.bool(forKey: "accountCreated")
    var body: some Scene {
        WindowGroup {
            VStack(spacing: 20) {
                Text("SmoothSubmit Review Demo")
                Text(accountCreated ? "Local demo account" : "No demo account")
                Button("Create demo account", action: registerAccount)
                Button("Enable camera") {
                    AVCaptureDevice.requestAccess(for: .video) { _ in }
                }
                Button("Delete demo account", action: deleteAccount)
                Text("Synthetic local demo. No real server or purchases.")
            }.padding()
        }
    }
    private func registerAccount() {
        accountCreated = true
        UserDefaults.standard.set(true, forKey: "accountCreated")
    }
    private func deleteAccount() { accountCreated = false; UserDefaults.standard.removeObject(forKey: "accountCreated") }
}
