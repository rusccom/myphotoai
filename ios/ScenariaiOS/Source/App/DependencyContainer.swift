import Foundation

@MainActor
class DependencyContainer: ObservableObject {
    // MARK: - Core Services
    lazy var networkService: NetworkServiceProtocol = {
        return NetworkService(baseURL: Configuration.apiBaseURL)
    }()
    
    lazy var storageService: StorageServiceProtocol = {
        return StorageService()
    }()
    
    lazy var securityService: SecurityServiceProtocol = {
        return SecurityService()
    }()
    
    // MARK: - Feature Services
    lazy var authService: AuthServiceProtocol = {
        return AuthService(
            networkService: networkService,
            securityService: securityService
        )
    }()
    
    lazy var imageService: ImageServiceProtocol = {
        return ImageService(networkService: networkService)
    }()
    
    lazy var modelService: ModelServiceProtocol = {
        return ModelService(networkService: networkService)
    }()
    
    // MARK: - ViewModels Factory
    func makeAuthViewModel() -> AuthViewModel {
        return AuthViewModel(authService: authService)
    }
    
    func makeImageGenerationViewModel() -> ImageGenerationViewModel {
        return ImageGenerationViewModel(imageService: imageService)
    }
    
    func makeModelCreationViewModel() -> ModelCreationViewModel {
        return ModelCreationViewModel(modelService: modelService)
    }
}

// MARK: - Configuration
struct Configuration {
    static let apiBaseURL: String = {
        #if DEBUG
        return "http://localhost:5001"
        #else
        return "https://api.scenaria.app"
        #endif
    }()
    
    static let apiTimeout: TimeInterval = 30.0
    static let maxImageSize: Int = 1024 * 1024 * 5 // 5MB
}
