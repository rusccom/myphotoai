import Foundation
import SwiftUI

class ModelGenerationViewModel: ObservableObject {
    @Published var models: [AIModel] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let baseURL = "https://myphotoai.net/api" // Production URL
    
    func loadModels(authToken: String?) {
        guard let token = authToken else { return }
        
        isLoading = true
        error = nil
        
        Task {
            do {
                let url = URL(string: "\(baseURL)/api/models")!
                var request = URLRequest(url: url)
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                
                let (data, _) = try await URLSession.shared.data(for: request)
                let response = try JSONDecoder().decode(ModelsResponse.self, from: data)
                
                await MainActor.run {
                    self.models = response.ai_models
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    func generateImages(
        modelId: String,
        prompt: String,
        aspectRatio: String,
        numImages: Int,
        finetuneStrength: Double,
        authToken: String
    ) async throws {
        let url = URL(string: "\(baseURL)/api/generation/lora-generate")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = GenerationRequest(
            prompt: prompt,
            aiModelId: modelId,
            aspectRatio: aspectRatio,
            num_images: numImages,
            finetuneStrength: finetuneStrength
        )
        
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw GenerationError.failedToGenerate
        }
        
        let generationResponse = try JSONDecoder().decode(GenerationResponse.self, from: data)
        
        // Сохраняем ID генерации для проверки статуса
        for image in generationResponse.images {
            await checkGenerationStatus(imageId: image.id, authToken: authToken)
        }
    }
    
    private func checkGenerationStatus(imageId: String, authToken: String) async {
        // Проверка статуса генерации
        // В реальном приложении это должно быть реализовано через WebSocket или polling
    }
}

// MARK: - Models

struct AIModel: Identifiable, Codable {
    let id: String
    let name: String
    let status: String
    let previewImageUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case status
        case previewImageUrl = "signed_preview_url"
    }
}

struct ModelsResponse: Codable {
    let ai_models: [AIModel]
}

struct GenerationRequest: Codable {
    let prompt: String
    let aiModelId: String
    let aspectRatio: String
    let num_images: Int
    let finetuneStrength: Double
}

struct GenerationResponse: Codable {
    let images: [GeneratedImage]
    let new_balance: Int
}

enum GenerationError: LocalizedError {
    case failedToGenerate
    case invalidResponse
    
    var errorDescription: String? {
        switch self {
        case .failedToGenerate:
            return "Failed to start generation. Please try again."
        case .invalidResponse:
            return "Received an invalid response from the server."
        }
    }
} 