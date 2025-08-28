import Foundation

// MARK: - User
struct User: Codable, Identifiable, Equatable {
    let id: String
    let email: String
    let name: String
    let avatarURL: String?
    let createdAt: Date
    let subscription: UserSubscription?
    let credits: Int
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case name
        case avatarURL = "avatar_url"
        case createdAt = "created_at"
        case subscription
        case credits
    }
}

// MARK: - UserSubscription
struct UserSubscription: Codable, Equatable {
    let id: String
    let type: SubscriptionType
    let status: SubscriptionStatus
    let startDate: Date
    let endDate: Date?
    let autoRenew: Bool
    
    enum CodingKeys: String, CodingKey {
        case id
        case type
        case status
        case startDate = "start_date"
        case endDate = "end_date"
        case autoRenew = "auto_renew"
    }
}

// MARK: - SubscriptionType
enum SubscriptionType: String, Codable, CaseIterable {
    case free = "free"
    case basic = "basic"
    case premium = "premium"
    case pro = "pro"
    
    var displayName: String {
        switch self {
        case .free:
            return "Бесплатный"
        case .basic:
            return "Базовый"
        case .premium:
            return "Премиум"
        case .pro:
            return "Профессиональный"
        }
    }
    
    var creditsPerMonth: Int {
        switch self {
        case .free:
            return 10
        case .basic:
            return 100
        case .premium:
            return 500
        case .pro:
            return 2000
        }
    }
}

// MARK: - SubscriptionStatus
enum SubscriptionStatus: String, Codable {
    case active = "active"
    case inactive = "inactive"
    case cancelled = "cancelled"
    case expired = "expired"
    case pending = "pending"
    
    var displayName: String {
        switch self {
        case .active:
            return "Активная"
        case .inactive:
            return "Неактивная"
        case .cancelled:
            return "Отменена"
        case .expired:
            return "Истекла"
        case .pending:
            return "Ожидает"
        }
    }
}
