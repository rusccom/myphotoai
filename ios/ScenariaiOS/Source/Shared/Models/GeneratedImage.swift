import Foundation

// MARK: - GeneratedImage
struct GeneratedImage: Codable, Identifiable, Equatable {
    let id: String
    let prompt: String
    let imageURL: String
    let thumbnailURL: String?
    let status: GenerationStatus
    let createdAt: Date
    let userId: String
    let modelId: String?
    let generationType: GenerationType
    let settings: GenerationSettings?
    
    enum CodingKeys: String, CodingKey {
        case id
        case prompt
        case imageURL = "image_url"
        case thumbnailURL = "thumbnail_url"
        case status
        case createdAt = "created_at"
        case userId = "user_id"
        case modelId = "model_id"
        case generationType = "generation_type"
        case settings
    }
}

// MARK: - GenerationStatus
enum GenerationStatus: String, Codable, CaseIterable {
    case pending = "pending"
    case processing = "processing"
    case completed = "completed"
    case failed = "failed"
    case cancelled = "cancelled"
    
    var displayName: String {
        switch self {
        case .pending:
            return "Ожидает"
        case .processing:
            return "Генерируется"
        case .completed:
            return "Готово"
        case .failed:
            return "Ошибка"
        case .cancelled:
            return "Отменено"
        }
    }
    
    var isProcessing: Bool {
        return self == .pending || self == .processing
    }
    
    var isCompleted: Bool {
        return self == .completed
    }
    
    var isFailed: Bool {
        return self == .failed || self == .cancelled
    }
}

// MARK: - GenerationType
enum GenerationType: String, Codable, CaseIterable {
    case textToImage = "text_to_image"
    case modelGeneration = "model_generation"
    case imageToImage = "image_to_image"
    case upscale = "upscale"
    case videoGeneration = "video_generation"
    
    var displayName: String {
        switch self {
        case .textToImage:
            return "Текст в изображение"
        case .modelGeneration:
            return "По модели"
        case .imageToImage:
            return "Изображение в изображение"
        case .upscale:
            return "Увеличение"
        case .videoGeneration:
            return "Видео"
        }
    }
}

// MARK: - GenerationSettings
struct GenerationSettings: Codable, Equatable {
    let width: Int?
    let height: Int?
    let steps: Int?
    let guidance: Double?
    let seed: Int?
    let strength: Double?
    let negativePrompt: String?
    
    enum CodingKeys: String, CodingKey {
        case width
        case height
        case steps
        case guidance
        case seed
        case strength
        case negativePrompt = "negative_prompt"
    }
}
