import Foundation

@MainActor
class ModelCreationViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var modelName: String = ""
    @Published var selectedImages: [Data] = []
    @Published var conceptType: ConceptType = .person
    @Published var isCreating: Bool = false
    @Published var models: [AIModel] = []
    @Published var errorMessage: String?
    @Published var isLoadingModels: Bool = false
    @Published var creationProgress: Double = 0.0
    
    // MARK: - Private Properties
    private let modelService: ModelServiceProtocol
    private let maxImages = 20
    private let minImages = 5
    
    // MARK: - Initialization
    init(modelService: ModelServiceProtocol) {
        self.modelService = modelService
        loadModels()
    }
    
    // MARK: - Public Methods
    func createModel() {
        guard validateInput() else { return }
        
        isCreating = true
        errorMessage = nil
        creationProgress = 0.0
        
        Task {
            do {
                let model = try await modelService.createModel(
                    name: modelName,
                    images: selectedImages
                )
                
                await MainActor.run {
                    self.models.insert(model, at: 0)
                    self.isCreating = false
                    self.creationProgress = 1.0
                    self.clearForm()
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isCreating = false
                    self.creationProgress = 0.0
                }
            }
        }
    }
    
    func loadModels() {
        isLoadingModels = true
        
        Task {
            do {
                let models = try await modelService.getModels()
                await MainActor.run {
                    self.models = models
                    self.isLoadingModels = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoadingModels = false
                }
            }
        }
    }
    
    func deleteModel(_ model: AIModel) {
        Task {
            do {
                try await modelService.deleteModel(id: model.id)
                await MainActor.run {
                    self.models.removeAll { $0.id == model.id }
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    func addImage(_ imageData: Data) {
        guard selectedImages.count < maxImages else {
            errorMessage = "Максимум \(maxImages) изображений"
            return
        }
        
        selectedImages.append(imageData)
    }
    
    func removeImage(at index: Int) {
        guard index < selectedImages.count else { return }
        selectedImages.remove(at: index)
    }
    
    func clearError() {
        errorMessage = nil
    }
    
    func setConceptType(_ type: ConceptType) {
        conceptType = type
    }
    
    // MARK: - Computed Properties
    var canCreateModel: Bool {
        return !modelName.isEmpty && 
               selectedImages.count >= minImages && 
               !isCreating
    }
    
    var imageCountText: String {
        return "\(selectedImages.count)/\(maxImages)"
    }
    
    // MARK: - Private Methods
    private func validateInput() -> Bool {
        guard !modelName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Введите название модели"
            return false
        }
        
        guard modelName.count <= 50 else {
            errorMessage = "Название слишком длинное (максимум 50 символов)"
            return false
        }
        
        guard selectedImages.count >= minImages else {
            errorMessage = "Выберите минимум \(minImages) изображений"
            return false
        }
        
        guard selectedImages.count <= maxImages else {
            errorMessage = "Максимум \(maxImages) изображений"
            return false
        }
        
        return true
    }
    
    private func clearForm() {
        modelName = ""
        selectedImages = []
        conceptType = .person
    }
}
