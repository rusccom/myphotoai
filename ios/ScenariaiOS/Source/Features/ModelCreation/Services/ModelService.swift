import Foundation

// MARK: - ModelServiceProtocol
protocol ModelServiceProtocol {
    func createModel(name: String, images: [Data]) async throws -> AIModel
    func getModels() async throws -> [AIModel]
    func getModel(id: String) async throws -> AIModel
    func deleteModel(id: String) async throws
    func updateModel(id: String, name: String) async throws -> AIModel
}

// MARK: - ModelService
class ModelService: ModelServiceProtocol {
    // MARK: - Properties
    private let networkService: NetworkServiceProtocol
    
    // MARK: - Initialization
    init(networkService: NetworkServiceProtocol) {
        self.networkService = networkService
    }
    
    // MARK: - Public Methods
    func createModel(name: String, images: [Data]) async throws -> AIModel {
        // This would typically involve multipart form data upload
        // For now, using a simplified approach
        let endpoint = APIEndpoint(
            path: "/api/models",
            method: .POST,
            body: [
                "name": name,
                "image_count": images.count
            ]
        )
        
        let response: AIModel = try await networkService.request(
            endpoint: endpoint,
            responseType: AIModel.self
        )
        
        // TODO: Upload images separately
        
        return response
    }
    
    func getModels() async throws -> [AIModel] {
        let endpoint = APIEndpoint(
            path: "/api/models",
            method: .GET
        )
        
        let response: ModelsResponse = try await networkService.request(
            endpoint: endpoint,
            responseType: ModelsResponse.self
        )
        
        return response.models
    }
    
    func getModel(id: String) async throws -> AIModel {
        let endpoint = APIEndpoint(
            path: "/api/models/\(id)",
            method: .GET
        )
        
        let response: AIModel = try await networkService.request(
            endpoint: endpoint,
            responseType: AIModel.self
        )
        
        return response
    }
    
    func deleteModel(id: String) async throws {
        let endpoint = APIEndpoint(
            path: "/api/models/\(id)",
            method: .DELETE
        )
        
        let _: EmptyResponse = try await networkService.request(
            endpoint: endpoint,
            responseType: EmptyResponse.self
        )
    }
    
    func updateModel(id: String, name: String) async throws -> AIModel {
        let endpoint = APIEndpoint(
            path: "/api/models/\(id)",
            method: .PUT,
            body: ["name": name]
        )
        
        let response: AIModel = try await networkService.request(
            endpoint: endpoint,
            responseType: AIModel.self
        )
        
        return response
    }
}

// MARK: - Response Models
struct ModelsResponse: Codable {
    let models: [AIModel]
}
