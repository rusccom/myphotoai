#!/bin/bash

# Script to help create Xcode project structure
# Run this script from the ScenariaiOS directory

echo "🚀 Setting up ScenariaiOS Xcode project structure..."

# Create basic Xcode project structure
mkdir -p "ScenariaiOS.xcodeproj"
mkdir -p "ScenariaiOS"

# Copy source files to standard iOS project structure
echo "📁 Setting up source files..."

# Create app delegate and scene delegate if needed
cat > "ScenariaiOS/AppDelegate.swift" << 'EOF'
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    // MARK: UISceneSession Lifecycle
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIApplication.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }
}
EOF

cat > "ScenariaiOS/SceneDelegate.swift" << 'EOF'
import UIKit
import SwiftUI

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        let contentView = ContentView()
            .environmentObject(AppCoordinator())
            .environmentObject(DependencyContainer())

        if let windowScene = scene as? UIWindowScene {
            let window = UIWindow(windowScene: windowScene)
            window.rootViewController = UIHostingController(rootView: contentView)
            self.window = window
            window.makeKeyAndVisible()
        }
    }
}
EOF

# Copy our custom files
echo "📋 Copying custom files..."
cp -r "Source/"* "ScenariaiOS/"

# Copy resources
echo "🎨 Setting up resources..."
cp -r "Resources/Assets" "ScenariaiOS/"
cp "Configuration/Info/Info.plist" "ScenariaiOS/"

echo "✅ Project structure created!"
echo ""
echo "Next steps:"
echo "1. Open Xcode"
echo "2. File → New → Project → iOS → App"
echo "3. Use existing folder: $(pwd)"
echo "4. Add Swift Package Dependencies from Package.swift"
echo "5. Configure xcconfig files in project settings"
echo ""
echo "Happy coding! 🎉"
