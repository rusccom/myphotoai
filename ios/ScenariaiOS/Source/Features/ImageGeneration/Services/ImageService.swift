import Foundation

// MARK: - ImageServiceProtocol
protocol ImageServiceProtocol {
    func generateImage(prompt: String, modelId: String?) async throws -> GeneratedImage
    func getGenerationHistory(page: Int, limit: Int) async throws -> [GeneratedImage]
    func deleteGeneration(id: String) async throws
}

// MARK: - ImageService
class ImageService: ImageServiceProtocol {
    // MARK: - Properties
    private let networkService: NetworkServiceProtocol
    
    // MARK: - Initialization
    init(networkService: NetworkServiceProtocol) {
        self.networkService = networkService
    }
    
    // MARK: - Public Methods
    func generateImage(prompt: String, modelId: String?) async throws -> GeneratedImage {
        let endpoint = APIEndpoint(
            path: "/api/generation/start",
            method: .POST,
            body: [
                "prompt": prompt,
                "model_id": modelId as Any,
                "num_images": 1
            ]
        )
        
        let response: GeneratedImage = try await networkService.request(
            endpoint: endpoint,
            responseType: GeneratedImage.self
        )
        
        return response
    }
    
    func getGenerationHistory(page: Int = 1, limit: Int = 20) async throws -> [GeneratedImage] {
        let endpoint = APIEndpoint(
            path: "/api/generation/history?page=\(page)&limit=\(limit)",
            method: .GET
        )
        
        let response: GenerationHistoryResponse = try await networkService.request(
            endpoint: endpoint,
            responseType: GenerationHistoryResponse.self
        )
        
        return response.images
    }
    
    func deleteGeneration(id: String) async throws {
        let endpoint = APIEndpoint(
            path: "/api/generation/\(id)",
            method: .DELETE
        )
        
        let _: EmptyResponse = try await networkService.request(
            endpoint: endpoint,
            responseType: EmptyResponse.self
        )
    }
}

// MARK: - Response Models
struct GenerationHistoryResponse: Codable {
    let images: [GeneratedImage]
    let totalCount: Int
    let currentPage: Int
    let totalPages: Int
    
    enum CodingKeys: String, CodingKey {
        case images
        case totalCount = "total_count"
        case currentPage = "current_page"
        case totalPages = "total_pages"
    }
}
