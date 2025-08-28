import SwiftUI

struct ModelGenerationView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = ModelGenerationViewModel()
    @State private var prompt = ""
    @State private var selectedModelId: String?
    @State private var selectedAspectRatio = "3:4"
    @State private var numberOfImages = 2
    @State private var finetuneStrength: Double = 1.1
    @State private var showingImagePicker = false
    @State private var isGenerating = false
    
    let aspectRatios = ["3:4", "9:16", "1:1", "4:3", "16:9"]
    let aspectRatioLabels = [
        "3:4": "Portrait",
        "9:16": "Stories",
        "1:1": "Square",
        "4:3": "Landscape",
        "16:9": "Widescreen"
    ]
    
    var body: some View {
        ZStack {
            // Background
            LinearGradient(
                colors: [Color.black, Color(white: 0.05)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 25) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Model Generation")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                            
                            Text("Create photos with your AI model")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }
                        Spacer()
                    }
                    .padding(.horizontal)
                    
                    // Model selection
                    VStack(alignment: .leading, spacing: 15) {
                        Text("Select a Model")
                            .font(.headline)
                            .foregroundColor(.white)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 15) {
                                // Add model button
                                Button(action: {
                                    // Navigate to create model
                                }) {
                                    VStack {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: 15)
                                                .fill(Color(white: 0.1))
                                                .frame(width: 100, height: 100)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 15)
                                                        .stroke(Color.purple.opacity(0.5), lineWidth: 1)
                                                )
                                            
                                            Image(systemName: "plus")
                                                .font(.system(size: 30))
                                                .foregroundColor(.purple)
                                        }
                                        
                                        Text("Add Model")
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                    }
                                }
                                
                                // User models
                                ForEach(viewModel.models) { model in
                                    ModelCardView(
                                        model: model,
                                        isSelected: selectedModelId == model.id,
                                        onTap: {
                                            if model.status == "ready" {
                                                selectedModelId = model.id
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                    
                    // Prompt input field
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Prompt")
                            .font(.headline)
                            .foregroundColor(.white)
                        
                        TextEditor(text: $prompt)
                            .frame(height: 100)
                            .padding(10)
                            .background(Color(white: 0.1))
                            .cornerRadius(10)
                            .foregroundColor(.white)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.purple.opacity(0.3), lineWidth: 1)
                            )
                    }
                    .padding(.horizontal)
                    
                    // Generation settings
                    VStack(spacing: 20) {
                        // Aspect Ratio
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Aspect Ratio")
                                .font(.headline)
                                .foregroundColor(.white)
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 10) {
                                    ForEach(aspectRatios, id: \.self) { ratio in
                                        AspectRatioButton(
                                            ratio: ratio,
                                            label: aspectRatioLabels[ratio] ?? ratio,
                                            isSelected: selectedAspectRatio == ratio,
                                            onTap: {
                                                selectedAspectRatio = ratio
                                            }
                                        )
                                    }
                                }
                            }
                        }
                        
                        // Number of images
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Number of Images: \(numberOfImages)")
                                .font(.headline)
                                .foregroundColor(.white)
                            
                            HStack {
                                ForEach([1, 2, 4], id: \.self) { num in
                                                                            NumberButton(
                                            number: num,
                                            isSelected: numberOfImages == num,
                                            action: {
                                                numberOfImages = num
                                            }
                                        )
                                }
                                Spacer()
                            }
                        }
                        
                        // Finetune Strength
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Text("Model Influence")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                Spacer()
                                Text(String(format: "%.1f", finetuneStrength))
                                    .foregroundColor(.purple)
                                    .fontWeight(.medium)
                            }
                            
                            Slider(value: $finetuneStrength, in: 0...2, step: 0.1)
                                .accentColor(.purple)
                        }
                    }
                    .padding(.horizontal)
                    
                    // Generate button
                    Button(action: {
                        generateImages()
                    }) {
                        HStack {
                            if isGenerating {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .black))
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "sparkles")
                            }
                            Text(isGenerating ? "Generating..." : "Generate")
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            LinearGradient(
                                colors: [Color.purple, Color.pink],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(25)
                        .shadow(color: Color.purple.opacity(0.5), radius: 10, x: 0, y: 5)
                    }
                    .padding(.horizontal)
                    .disabled(isGenerating || selectedModelId == nil || prompt.isEmpty)
                    .opacity((isGenerating || selectedModelId == nil || prompt.isEmpty) ? 0.6 : 1)
                    
                    Spacer(minLength: 100)
                }
                .padding(.top)
            }
        }
        .navigationBarTitle("", displayMode: .inline)
        .onAppear {
            viewModel.loadModels(authToken: authManager.authToken)
        }
    }
    
    func generateImages() {
        guard let modelId = selectedModelId,
              !prompt.isEmpty,
              let token = authManager.authToken else { return }
        
        isGenerating = true
        
        Task {
            do {
                try await viewModel.generateImages(
                    modelId: modelId,
                    prompt: prompt,
                    aspectRatio: selectedAspectRatio,
                    numImages: numberOfImages,
                    finetuneStrength: finetuneStrength,
                    authToken: token
                )
                // Переход к галерее или показ результатов
                isGenerating = false
            } catch {
                print("Error generating images: \(error)")
                isGenerating = false
            }
        }
    }
}

// Компонент карточки модели
struct ModelCardView: View {
    let model: AIModel
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack {
                ZStack {
                    if let imageUrl = model.previewImageUrl {
                        AsyncImage(url: URL(string: imageUrl)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: 100, height: 100)
                                .clipped()
                                .cornerRadius(15)
                        } placeholder: {
                            RoundedRectangle(cornerRadius: 15)
                                .fill(Color(white: 0.1))
                                .frame(width: 100, height: 100)
                                .overlay(
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .purple))
                                )
                        }
                    } else {
                        RoundedRectangle(cornerRadius: 15)
                            .fill(Color(white: 0.1))
                            .frame(width: 100, height: 100)
                    }
                    
                    if model.status == "training" {
                        RoundedRectangle(cornerRadius: 15)
                            .fill(Color.black.opacity(0.7))
                            .frame(width: 100, height: 100)
                            .overlay(
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            )
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: 15)
                        .stroke(
                            isSelected ? Color.purple : Color.clear,
                            lineWidth: 3
                        )
                )
                
                Text(model.name)
                    .font(.caption)
                    .foregroundColor(model.status == "ready" ? .white : .gray)
                    .lineLimit(1)
            }
        }
        .disabled(model.status != "ready")
    }
}

// Компоненты перемещены в SharedComponents.swift 