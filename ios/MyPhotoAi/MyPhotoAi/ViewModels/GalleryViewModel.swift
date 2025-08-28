import Foundation
import SwiftUI

class GalleryViewModel: ObservableObject {
    @Published var images: [GeneratedImage] = []
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var hasMorePages = false
    @Published var error: String?
    
    private var currentPage = 1
    private let baseURL = "https://myphotoai.net/api" // Production URL
    private var pollingTimer: Timer?
    
    var readyImages: [GeneratedImage] {
        images.filter { $0.status.lowercased() == "ready" && $0.signedUrl != nil }
    }
    
    deinit {
        pollingTimer?.invalidate()
    }
    
    func loadImages(authToken: String?) {
        guard let token = authToken else { return }
        
        isLoading = true
        error = nil
        currentPage = 1
        
        Task {
            do {
                let response = try await fetchImages(page: 1, token: token)
                
                await MainActor.run {
                    self.images = response.images
                    self.hasMorePages = response.hasNext
                    self.isLoading = false
                    
                    // Запускаем опрос статуса для pending изображений
                    self.startPollingForPendingImages(token: token)
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    func loadMoreImages(authToken: String?) {
        guard let token = authToken,
              hasMorePages,
              !isLoadingMore else { return }
        
        isLoadingMore = true
        let nextPage = currentPage + 1
        
        Task {
            do {
                let response = try await fetchImages(page: nextPage, token: token)
                
                await MainActor.run {
                    self.images.append(contentsOf: response.images)
                    self.hasMorePages = response.hasNext
                    self.currentPage = nextPage
                    self.isLoadingMore = false
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isLoadingMore = false
                }
            }
        }
    }
    
    private func fetchImages(page: Int, token: String) async throws -> GenerationHistoryResponse {
        let url = URL(string: "\(baseURL)/generation/history?page=\(page)")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(GenerationHistoryResponse.self, from: data)
    }
    
    private func startPollingForPendingImages(token: String) {
        pollingTimer?.invalidate()
        
        pollingTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.checkPendingImages(token: token)
        }
    }
    
    private func checkPendingImages(token: String) {
        let pendingImages = images.filter { $0.status == "pending" || $0.status == "running" }
        
        guard !pendingImages.isEmpty else {
            pollingTimer?.invalidate()
            return
        }
        
        Task {
            for image in pendingImages {
                do {
                    let updatedImage = try await fetchImageStatus(imageId: image.id, token: token)
                    
                    await MainActor.run {
                        if let index = self.images.firstIndex(where: { $0.id == image.id }) {
                            self.images[index] = updatedImage
                        }
                    }
                } catch {
                    print("Failed to update image status: \(error)")
                }
            }
        }
    }
    
    private func fetchImageStatus(imageId: String, token: String) async throws -> GeneratedImage {
        let url = URL(string: "\(baseURL)/generation/result/\(imageId)")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(GeneratedImage.self, from: data)
    }
}

// MARK: - Response Models

struct GenerationHistoryResponse: Codable {
    let images: [GeneratedImage]
    let hasNext: Bool
    let currentPage: Int
    let totalPages: Int
} 