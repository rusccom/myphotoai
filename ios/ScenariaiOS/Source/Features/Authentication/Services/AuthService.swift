import Foundation

// MARK: - AuthServiceProtocol
protocol AuthServiceProtocol {
    func login(email: String, password: String) async throws -> User
    func register(email: String, password: String, name: String) async throws -> User
    func logout() async throws
    func refreshToken() async throws -> String
    func getCurrentUser() async throws -> User?
}

// MARK: - AuthService
class AuthService: AuthServiceProtocol {
    // MARK: - Properties
    private let networkService: NetworkServiceProtocol
    private let securityService: SecurityServiceProtocol
    
    // MARK: - Initialization
    init(networkService: NetworkServiceProtocol, securityService: SecurityServiceProtocol) {
        self.networkService = networkService
        self.securityService = securityService
    }
    
    // MARK: - Public Methods
    func login(email: String, password: String) async throws -> User {
        let endpoint = APIEndpoint(
            path: "/api/auth/login",
            method: .POST,
            body: [
                "email": email,
                "password": password
            ]
        )
        
        let response: LoginResponse = try await networkService.request(
            endpoint: endpoint,
            responseType: LoginResponse.self
        )
        
        // Store token securely
        try securityService.storeToken(response.token, forKey: SecurityService.Keys.authToken)
        
        return response.user
    }
    
    func register(email: String, password: String, name: String) async throws -> User {
        let endpoint = APIEndpoint(
            path: "/api/auth/register",
            method: .POST,
            body: [
                "email": email,
                "password": password,
                "name": name
            ]
        )
        
        let response: LoginResponse = try await networkService.request(
            endpoint: endpoint,
            responseType: LoginResponse.self
        )
        
        // Store token securely
        try securityService.storeToken(response.token, forKey: SecurityService.Keys.authToken)
        
        return response.user
    }
    
    func logout() async throws {
        // Clear stored tokens
        try securityService.deleteToken(forKey: SecurityService.Keys.authToken)
        try securityService.deleteToken(forKey: SecurityService.Keys.refreshToken)
        
        // Optionally call logout endpoint
        let endpoint = APIEndpoint(path: "/api/auth/logout", method: .POST)
        let _: EmptyResponse = try await networkService.request(
            endpoint: endpoint,
            responseType: EmptyResponse.self
        )
    }
    
    func refreshToken() async throws -> String {
        guard let refreshToken = try securityService.retrieveToken(forKey: SecurityService.Keys.refreshToken) else {
            throw AuthError.noRefreshToken
        }
        
        let endpoint = APIEndpoint(
            path: "/api/auth/refresh",
            method: .POST,
            body: ["refresh_token": refreshToken]
        )
        
        let response: TokenResponse = try await networkService.request(
            endpoint: endpoint,
            responseType: TokenResponse.self
        )
        
        // Store new token
        try securityService.storeToken(response.token, forKey: SecurityService.Keys.authToken)
        
        return response.token
    }
    
    func getCurrentUser() async throws -> User? {
        guard let token = try securityService.retrieveToken(forKey: SecurityService.Keys.authToken) else {
            return nil
        }
        
        let endpoint = APIEndpoint(
            path: "/api/auth/me",
            method: .GET,
            headers: ["Authorization": "Bearer \(token)"]
        )
        
        let user: User = try await networkService.request(
            endpoint: endpoint,
            responseType: User.self
        )
        
        return user
    }
}

// MARK: - Response Models
struct LoginResponse: Codable {
    let token: String
    let user: User
}

struct TokenResponse: Codable {
    let token: String
}

struct EmptyResponse: Codable {}

// MARK: - AuthError
enum AuthError: LocalizedError {
    case invalidCredentials
    case noRefreshToken
    case tokenExpired
    case userNotFound
    
    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid email or password"
        case .noRefreshToken:
            return "No refresh token available"
        case .tokenExpired:
            return "Authentication token expired"
        case .userNotFound:
            return "User not found"
        }
    }
}
