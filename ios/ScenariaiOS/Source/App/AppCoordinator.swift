import SwiftUI
import Combine

@MainActor
class AppCoordinator: ObservableObject {
    // MARK: - Published Properties
    @Published var currentView: AppView = .onboarding
    @Published var isAuthenticated: Bool = false
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    init() {
        setupBindings()
    }
    
    // MARK: - Public Methods
    func navigateTo(_ view: AppView) {
        withAnimation(.easeInOut(duration: 0.3)) {
            currentView = view
        }
    }
    
    func authenticate() {
        isAuthenticated = true
        navigateTo(.main)
    }
    
    func logout() {
        isAuthenticated = false
        navigateTo(.authentication)
    }
    
    // MARK: - Private Methods
    private func setupBindings() {
        // Setup any necessary bindings here
    }
}

// MARK: - AppView
enum AppView {
    case onboarding
    case authentication
    case main
    case modelCreation
    case imageGeneration
    case gallery
    case profile
    case settings
}
