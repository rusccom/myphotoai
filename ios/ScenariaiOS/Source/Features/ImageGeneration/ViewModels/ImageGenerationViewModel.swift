import Foundation

@MainActor
class ImageGenerationViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var prompt: String = ""
    @Published var selectedModel: AIModel?
    @Published var isGenerating: Bool = false
    @Published var generatedImages: [GeneratedImage] = []
    @Published var errorMessage: String?
    @Published var generationHistory: [GeneratedImage] = []
    @Published var isLoadingHistory: Bool = false
    
    // MARK: - Private Properties
    private let imageService: ImageServiceProtocol
    
    // MARK: - Initialization
    init(imageService: ImageServiceProtocol) {
        self.imageService = imageService
        loadGenerationHistory()
    }
    
    // MARK: - Public Methods
    func generateImage() {
        guard validateInput() else { return }
        
        isGenerating = true
        errorMessage = nil
        
        Task {
            do {
                let image = try await imageService.generateImage(
                    prompt: prompt,
                    modelId: selectedModel?.id
                )
                
                await MainActor.run {
                    self.generatedImages.append(image)
                    self.generationHistory.insert(image, at: 0)
                    self.isGenerating = false
                    self.prompt = ""
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isGenerating = false
                }
            }
        }
    }
    
    func loadGenerationHistory() {
        isLoadingHistory = true
        
        Task {
            do {
                let history = try await imageService.getGenerationHistory(page: 1, limit: 50)
                await MainActor.run {
                    self.generationHistory = history
                    self.isLoadingHistory = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoadingHistory = false
                }
            }
        }
    }
    
    func deleteGeneration(_ image: GeneratedImage) {
        Task {
            do {
                try await imageService.deleteGeneration(id: image.id)
                await MainActor.run {
                    self.generatedImages.removeAll { $0.id == image.id }
                    self.generationHistory.removeAll { $0.id == image.id }
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    func clearError() {
        errorMessage = nil
    }
    
    func setSelectedModel(_ model: AIModel?) {
        selectedModel = model
    }
    
    // MARK: - Private Methods
    private func validateInput() -> Bool {
        guard !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Введите описание изображения"
            return false
        }
        
        guard prompt.count <= 1000 else {
            errorMessage = "Описание слишком длинное (максимум 1000 символов)"
            return false
        }
        
        return true
    }
}
