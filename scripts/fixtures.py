from pathlib import Path
import plistlib,json
APP='''import SwiftUI
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
                DELETION_BUTTON
                Text("Synthetic local demo. No real server or purchases.")
            }.padding()
        }
    }
    private func registerAccount() {
        accountCreated = true
        UserDefaults.standard.set(true, forKey: "accountCreated")
    }
    DELETION_METHOD
}
'''
PBX='''// !$*UTF8*$!
{ archiveVersion = 1; objectVersion = 60; objects = {
 ROOT = { isa = PBXProject; mainGroup = GROUP; buildConfigurationList = PCONFIGLIST; targets = (TARGET,); };
 GROUP = { isa = PBXGroup; children = (APPGROUP, PRODUCTS,); sourceTree = "<group>"; };
 APPGROUP = { isa = PBXGroup; path = App; children = (SWIFTFILE, INFOFILE, PRIVFILE,); sourceTree = "<group>"; };
 PRODUCTS = { isa = PBXGroup; children = (PRODUCT,); name = Products; sourceTree = "<group>"; };
 PRODUCT = { isa = PBXFileReference; explicitFileType = wrapper.application; path = ReviewDemo.app; sourceTree = BUILT_PRODUCTS_DIR; };
 SWIFTFILE = { isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = App.swift; sourceTree = "<group>"; };
 INFOFILE = { isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
 PRIVFILE = { isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };
 SWIFTBUILD = { isa = PBXBuildFile; fileRef = SWIFTFILE; };
 PRIVBUILD = { isa = PBXBuildFile; fileRef = PRIVFILE; };
 SOURCES = { isa = PBXSourcesBuildPhase; files = (SWIFTBUILD,); };
 RESOURCES = { isa = PBXResourcesBuildPhase; files = (PRIVBUILD,); };
 FRAMEWORKS = { isa = PBXFrameworksBuildPhase; files = (); };
 TARGET = { isa = PBXNativeTarget; name = ReviewDemo; productName = ReviewDemo; productReference = PRODUCT; productType = "com.apple.product-type.application"; buildConfigurationList = TCONFIGLIST; buildPhases = (SOURCES, FRAMEWORKS, RESOURCES,); };
 PCONFIGLIST = { isa = XCConfigurationList; buildConfigurations = (PCONFIG,); defaultConfigurationName = Release; };
 PCONFIG = { isa = XCBuildConfiguration; name = Release; buildSettings = { SDKROOT = iphoneos; }; };
 TCONFIGLIST = { isa = XCConfigurationList; buildConfigurations = (TCONFIG,); defaultConfigurationName = Release; };
 TCONFIG = { isa = XCBuildConfiguration; name = Release; buildSettings = {
     INFOPLIST_FILE = App/Info.plist; GENERATE_INFOPLIST_FILE = NO; IPHONEOS_DEPLOYMENT_TARGET = 12.0;
     PRODUCT_BUNDLE_IDENTIFIER = dev.smoothsubmit.ReviewDemo; PRODUCT_NAME = "$(TARGET_NAME)";
     SWIFT_VERSION = 5.0; TARGETED_DEVICE_FAMILY = "1,2"; CODE_SIGN_STYLE = Automatic;
 }; };
}; rootObject = ROOT; }
'''
for name,fixed in [('ReviewDemo',False),('ReviewDemoFixed',True)]:
 root=Path('examples')/name;(root/'App').mkdir(parents=True,exist_ok=True);(root/'ReviewDemo.xcodeproj').mkdir(exist_ok=True)
 (root/'ReviewDemo.xcodeproj/project.pbxproj').write_text(PBX.replace('12.0','13.0') if fixed else PBX)
 code=APP.replace('DELETION_BUTTON','Button("Delete demo account", action: deleteAccount)' if fixed else '').replace('DELETION_METHOD','private func deleteAccount() { accountCreated = false; UserDefaults.standard.removeObject(forKey: "accountCreated") }' if fixed else '')
 (root/'App/App.swift').write_text(code)
 info={'CFBundleIdentifier':'$(PRODUCT_BUNDLE_IDENTIFIER)','CFBundleName':'$(PRODUCT_NAME)','CFBundleExecutable':'$(EXECUTABLE_NAME)','CFBundlePackageType':'APPL','CFBundleShortVersionString':'1.0','CFBundleVersion':'1','UILaunchScreen':{}}
 if fixed:info['NSCameraUsageDescription']='Allow the local demo to request camera access. No images are captured or sent.'
 (root/'App/Info.plist').write_bytes(plistlib.dumps(info))
 priv={'NSPrivacyTracking':False,'NSPrivacyTrackingDomains':[],'NSPrivacyCollectedDataTypes':[],'NSPrivacyAccessedAPITypes':[]}
 if fixed:priv['NSPrivacyAccessedAPITypes']=[{'NSPrivacyAccessedAPIType':'NSPrivacyAccessedAPICategoryUserDefaults','NSPrivacyAccessedAPITypeReasons':['CA92.1']}]
 (root/'App/PrivacyInfo.xcprivacy').write_bytes(plistlib.dumps(priv))
 config={'schemaVersion':'1.0.0','project':'ReviewDemo.xcodeproj','target':'ReviewDemo','features':{'accountCreation':True,'loginRequired':False,'authProviders':['email'],'productTypes':[],'permissions':['camera'],'thirdPartyDataSharing':False,'thirdPartyAI':False,'tracking':False,'paidApp':False,'socialNetworking':False,'kidsCategory':False},'policy':{'storefronts':['JP'],'deviceFamilies':['iphone','ipad'],'distributionChannel':'app_store'},'reviewAccess':{'method':'none','prepared':'unknown'},'reviewNotesPrepared':False}
 (root/'smoothsubmit.config.json').write_text(json.dumps(config,indent=2)+'\n')
