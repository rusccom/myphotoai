import Foundation

// MARK: - AIModel
struct AIModel: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let status: ModelStatus
    let createdAt: Date
    let updatedAt: Date
    let userId: String
    let imageCount: Int
    let previewImageURL: String?
    let triggerWord: String?
    let conceptType: ConceptType?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case userId = "user_id"
        case imageCount = "image_count"
        case previewImageURL = "preview_image_url"
        case triggerWord = "trigger_word"
        case conceptType = "concept_type"
    }
}

// MARK: - ModelStatus
enum ModelStatus: String, Codable, CaseIterable {
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
            return "Обрабатывается"
        case .completed:
            return "Готова"
        case .failed:
            return "Ошибка"
        case .cancelled:
            return "Отменена"
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

// MARK: - ConceptType
enum ConceptType: String, Codable, CaseIterable {
    case person = "person"
    case style = "style"
    case object = "object"
    case animal = "animal"
    case landscape = "landscape"
    
    var displayName: String {
        switch self {
        case .person:
            return "Человек"
        case .style:
            return "Стиль"
        case .object:
            return "Объект"
        case .animal:
            return "Животное"
        case .landscape:
            return "Пейзаж"
        }
    }
    
    var description: String {
        switch self {
        case .person:
            return "Создание модели на основе фотографий человека"
        case .style:
            return "Модель для воспроизведения художественного стиля"
        case .object:
            return "Модель для генерации определенного объекта"
        case .animal:
            return "Модель для генерации животного"
        case .landscape:
            return "Модель для генерации пейзажей"
        }
    }
}
