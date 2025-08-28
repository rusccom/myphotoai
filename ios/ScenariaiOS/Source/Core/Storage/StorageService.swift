import Foundation

// MARK: - StorageServiceProtocol
protocol StorageServiceProtocol {
    func save<T: Codable>(_ object: T, forKey key: String) throws
    func load<T: Codable>(_ type: T.Type, forKey key: String) throws -> T?
    func delete(forKey key: String)
    func exists(forKey key: String) -> Bool
}

// MARK: - StorageService
class StorageService: StorageServiceProtocol {
    // MARK: - Private Properties
    private let userDefaults = UserDefaults.standard
    
    // MARK: - Public Methods
    func save<T: Codable>(_ object: T, forKey key: String) throws {
        let data = try JSONEncoder().encode(object)
        userDefaults.set(data, forKey: key)
    }
    
    func load<T: Codable>(_ type: T.Type, forKey key: String) throws -> T? {
        guard let data = userDefaults.data(forKey: key) else {
            return nil
        }
        return try JSONDecoder().decode(type, from: data)
    }
    
    func delete(forKey key: String) {
        userDefaults.removeObject(forKey: key)
    }
    
    func exists(forKey key: String) -> Bool {
        return userDefaults.object(forKey: key) != nil
    }
}

// MARK: - Storage Keys
extension StorageService {
    enum Keys {
        static let userProfile = "user_profile"
        static let appSettings = "app_settings"
        static let modelCache = "model_cache"
        static let imageCache = "image_cache"
    }
}
