import Foundation
import SwiftUI

class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var user: User?
    @Published var authToken: String?
    
    private let baseURL = "https://myphotoai.net/api" // Production URL
    
    init() {
        // Загружаем токен из Keychain при инициализации
        if let token = KeychainHelper.shared.getToken() {
            self.authToken = token
            self.isAuthenticated = true
            // Можно добавить проверку валидности токена
        }
    }
    
    func login(email: String, password: String) async throws {
        let url = URL(string: "\(baseURL)/api/auth/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["email": email, "password": password]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AuthError.invalidCredentials
        }
        
        let loginResponse = try JSONDecoder().decode(LoginResponse.self, from: data)
        
        await MainActor.run {
            self.authToken = loginResponse.token
            self.user = loginResponse.user
            self.isAuthenticated = true
            KeychainHelper.shared.setToken(loginResponse.token)
        }
    }
    
    func register(name: String, email: String, password: String) async throws {
        let url = URL(string: "\(baseURL)/api/auth/register")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["name": name, "email": email, "password": password]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 201 else {
            throw AuthError.registrationFailed
        }
        
        let registerResponse = try JSONDecoder().decode(RegisterResponse.self, from: data)
        
        await MainActor.run {
            self.authToken = registerResponse.token
            self.user = registerResponse.user
            self.isAuthenticated = true
            KeychainHelper.shared.setToken(registerResponse.token)
        }
    }
    
    func logout() {
        self.authToken = nil
        self.user = nil
        self.isAuthenticated = false
        KeychainHelper.shared.deleteToken()
    }
    
    func updateBalance(_ newBalance: Int) {
        if var currentUser = user {
            currentUser.balance_points = newBalance
            self.user = currentUser
        }
    }
}

enum AuthError: LocalizedError {
    case invalidCredentials
    case registrationFailed
    case networkError
    
    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid email or password."
        case .registrationFailed:
            return "Registration failed. Please try again."
        case .networkError:
            return "A network error occurred. Please check your connection."
        }
    }
}

struct LoginResponse: Codable {
    let token: String
    let user: User
}

struct RegisterResponse: Codable {
    let token: String
    let user: User
    let message: String
}

struct User: Codable {
    let id: Int
    let name: String
    let email: String
    var balance_points: Int
} 