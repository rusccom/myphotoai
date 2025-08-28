import Foundation
import Security

// MARK: - SecurityServiceProtocol
protocol SecurityServiceProtocol {
    func storeToken(_ token: String, forKey key: String) throws
    func retrieveToken(forKey key: String) throws -> String?
    func deleteToken(forKey key: String) throws
    func enableBiometricAuthentication() -> Bool
}

// MARK: - SecurityService
class SecurityService: SecurityServiceProtocol {
    // MARK: - Private Properties
    private let serviceName = "com.scenaria.ios"
    
    // MARK: - Public Methods
    func storeToken(_ token: String, forKey key: String) throws {
        let data = token.data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        // Delete existing item
        SecItemDelete(query as CFDictionary)
        
        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)
        
        guard status == errSecSuccess else {
            throw SecurityError.storeFailed
        }
    }
    
    func retrieveToken(forKey key: String) throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        
        guard status == errSecSuccess,
              let data = item as? Data,
              let token = String(data: data, encoding: .utf8) else {
            if status == errSecItemNotFound {
                return nil
            }
            throw SecurityError.retrieveFailed
        }
        
        return token
    }
    
    func deleteToken(forKey key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw SecurityError.deleteFailed
        }
    }
    
    func enableBiometricAuthentication() -> Bool {
        // Placeholder for biometric authentication
        // Will be implemented with LocalAuthentication framework
        return false
    }
}

// MARK: - SecurityError
enum SecurityError: LocalizedError {
    case storeFailed
    case retrieveFailed
    case deleteFailed
    case biometricNotAvailable
    
    var errorDescription: String? {
        switch self {
        case .storeFailed:
            return "Failed to store token"
        case .retrieveFailed:
            return "Failed to retrieve token"
        case .deleteFailed:
            return "Failed to delete token"
        case .biometricNotAvailable:
            return "Biometric authentication not available"
        }
    }
}

// MARK: - Security Keys
extension SecurityService {
    enum Keys {
        static let authToken = "auth_token"
        static let refreshToken = "refresh_token"
        static let apiKey = "api_key"
    }
}
