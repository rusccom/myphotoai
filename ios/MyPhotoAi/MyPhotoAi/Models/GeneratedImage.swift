import Foundation

struct GeneratedImage: Identifiable, Codable {
    let id: String
    let status: String
    let signed_url: String?
    let aspect_ratio: String?
    let generation_type: String?
    let created_at: String?
    let prompt: String?
    let width: Int?
    let height: Int?
    
    var aspectRatio: String? {
        return aspect_ratio
    }
    
    var signedUrl: String? {
        return signed_url
    }
    
    var generationType: String? {
        return generation_type
    }
}

struct GenerationHistoryResponse: Codable {
    let images: [GeneratedImage]
    let has_next: Bool
    let next_page: Int?
    let total_pages: Int
    let current_page: Int
    
    var hasNext: Bool {
        return has_next
    }
    
    var nextPage: Int? {
        return next_page
    }
    
    var totalPages: Int {
        return total_pages
    }
    
    var currentPage: Int {
        return current_page
    }
} 