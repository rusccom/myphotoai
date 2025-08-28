import Foundation

// MARK: - NetworkServiceProtocol
protocol NetworkServiceProtocol {
    func request<T: Codable>(endpoint: APIEndpoint, responseType: T.Type) async throws -> T
    func uploadImage(_ imageData: Data, to endpoint: APIEndpoint) async throws -> Data
}

// MARK: - NetworkService
class NetworkService: NetworkServiceProtocol {
    // MARK: - Properties
    private let baseURL: String
    private let session: URLSession
    
    // MARK: - Initialization
    init(baseURL: String) {
        self.baseURL = baseURL
        
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = Configuration.apiTimeout
        self.session = URLSession(configuration: configuration)
    }
    
    // MARK: - Public Methods
    func request<T: Codable>(endpoint: APIEndpoint, responseType: T.Type) async throws -> T {
        let url = try buildURL(for: endpoint)
        var request = URLRequest(url: url)
        
        request.httpMethod = endpoint.method.rawValue
        request.allHTTPHeaderFields = endpoint.headers
        
        if let body = endpoint.body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }
        
        guard 200...299 ~= httpResponse.statusCode else {
            throw NetworkError.serverError(httpResponse.statusCode)
        }
        
        return try JSONDecoder().decode(T.self, from: data)
    }
    
    func uploadImage(_ imageData: Data, to endpoint: APIEndpoint) async throws -> Data {
        let url = try buildURL(for: endpoint)
        var request = URLRequest(url: url)
        
        request.httpMethod = "POST"
        request.setValue("multipart/form-data", forHTTPHeaderField: "Content-Type")
        request.httpBody = imageData
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            throw NetworkError.uploadFailed
        }
        
        return data
    }
    
    // MARK: - Private Methods
    private func buildURL(for endpoint: APIEndpoint) throws -> URL {
        guard let url = URL(string: baseURL + endpoint.path) else {
            throw NetworkError.invalidURL
        }
        return url
    }
}

// MARK: - APIEndpoint
struct APIEndpoint {
    let path: String
    let method: HTTPMethod
    let headers: [String: String]
    let body: [String: Any]?
    
    init(path: String, method: HTTPMethod = .GET, headers: [String: String] = [:], body: [String: Any]? = nil) {
        self.path = path
        self.method = method
        self.headers = headers
        self.body = body
    }
}

// MARK: - HTTPMethod
enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case DELETE = "DELETE"
}

// MARK: - NetworkError
enum NetworkError: LocalizedError {
    case invalidURL
    case invalidResponse
    case serverError(Int)
    case uploadFailed
    case noInternet
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response"
        case .serverError(let code):
            return "Server error: \(code)"
        case .uploadFailed:
            return "Upload failed"
        case .noInternet:
            return "No internet connection"
        }
    }
}
