import SwiftUI

@main
struct ScenariaiOSApp: App {
    // MARK: - Properties
    @StateObject private var appCoordinator = AppCoordinator()
    @StateObject private var dependencyContainer = DependencyContainer()
    
    // MARK: - Body
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appCoordinator)
                .environmentObject(dependencyContainer)
                .preferredColorScheme(.dark)
        }
    }
}
