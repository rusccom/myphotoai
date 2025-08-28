import SwiftUI

struct TextToImageView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = TextToImageViewModel()
    @State private var prompt = ""
    @State private var aspectRatio = "3:4"
    @State private var numImages = 2
    @State private var isGenerating = false
    @State private var errorMessage: String?
    @FocusState private var isPromptFocused: Bool
    
    private let aspectRatios = [
        ("3:4", "Portrait"),
        ("9:16", "Phone"),
        ("1:1", "Square"),
        ("4:3", "Landscape"),
        ("16:9", "Widescreen")
    ]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Text to Image")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Generate images directly from text descriptions using the base model")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                
                VStack(spacing: 16) {
                    // Prompt Input
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Prompt")
                            .font(.headline)
                        
                        TextField("Describe the image you want...", text: $prompt, axis: .vertical)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .lineLimit(4...8)
                            .focused($isPromptFocused)
                            .disabled(isGenerating)
                    }
                    
                    // Aspect Ratio Selector
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Aspect Ratio")
                            .font(.headline)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(aspectRatios, id: \.0) { ratio, label in
                                    AspectRatioButton(
                                        ratio: ratio,
                                        label: label,
                                        isSelected: aspectRatio == ratio,
                                        color: Color("AccentColor"),
                                        onTap: { aspectRatio = ratio }
                                    )
                                    .disabled(isGenerating)
                                }
                            }
                        }
                    }
                    
                    // Number of Images Selector
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Number of Images")
                            .font(.headline)
                        
                        HStack(spacing: 12) {
                            ForEach(1...4, id: \.self) { num in
                                NumberButton(
                                    number: num,
                                    isSelected: numImages == num,
                                    color: Color("AccentColor"),
                                    action: { numImages = num }
                                )
                                .disabled(isGenerating)
                            }
                        }
                    }
                    
                    // Cost Display
                    if let balance = authManager.user?.balance_points {
                        HStack {
                            Image(systemName: "info.circle")
                                .foregroundColor(.secondary)
                            Text("Cost: \(numImages) \(numImages == 1 ? "point" : "points")")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("Balance: \(balance) points")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal, 4)
                    }
                    
                    // Error Message
                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal, 4)
                    }
                    
                    // Generate Button
                    Button(action: generateImages) {
                        HStack {
                            if isGenerating {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .black))
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "sparkles")
                            }
                            Text(isGenerating ? "Generating..." : "Start Generation")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(isGenerating || prompt.isEmpty ? Color.gray : Color("AccentColor"))
                        .foregroundColor(isGenerating || prompt.isEmpty ? .gray : .black)
                        .cornerRadius(12)
                    }
                    .disabled(isGenerating || prompt.isEmpty)
                }
                .padding()
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(16)
                .padding(.horizontal)
                
                // Recent Generations Preview
                if !viewModel.recentGenerations.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Recent Generations")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(viewModel.recentGenerations.prefix(5)) { image in
                                    if let url = URL(string: image.signedUrl ?? "") {
                                        AsyncImage(url: url) { image in
                                            image
                                                .resizable()
                                                .aspectRatio(contentMode: .fill)
                                                .frame(width: 120, height: 120)
                                                .clipped()
                                                .cornerRadius(12)
                                        } placeholder: {
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(Color(UIColor.tertiarySystemFill))
                                                .frame(width: 120, height: 120)
                                                .overlay(
                                                    ProgressView()
                                                )
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                }
            }
            .padding(.vertical)
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.fetchRecentGenerations()
        }
        .onTapGesture {
            isPromptFocused = false
        }
    }
    
    private func generateImages() {
        isPromptFocused = false
        errorMessage = nil
        isGenerating = true
        
        Task {
            do {
                let parameters: [String: Any] = [
                    "prompt": prompt,
                    "aspectRatio": aspectRatio,
                    "num_images": numImages
                ]
                
                let response = try await viewModel.generateImages(parameters: parameters)
                
                // Update balance if provided
                if let newBalance = response["new_balance"] as? Int {
                    await MainActor.run {
                        authManager.updateBalance(newBalance)
                    }
                }
                
                // Navigate to gallery or show success
                await MainActor.run {
                    prompt = "" // Clear prompt after success
                }
                
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                }
            }
            
            await MainActor.run {
                isGenerating = false
            }
        }
    }
}

// MARK: - Supporting Views (moved to SharedComponents.swift)

// MARK: - View Model
class TextToImageViewModel: ObservableObject {
    @Published var recentGenerations: [GeneratedImage] = []
    private let baseURL = "https://myphotoai.net/api"
    
    func generateImages(parameters: [String: Any]) async throws -> [String: Any] {
        guard let url = URL(string: "\(baseURL)/generation/start") else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = KeychainHelper.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        request.httpBody = try JSONSerialization.data(withJSONObject: parameters)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        if httpResponse.statusCode == 402 {
            throw NSError(domain: "", code: 402, userInfo: [NSLocalizedDescriptionKey: "Insufficient balance. Please add points to continue."])
        }
        
        guard httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
            if let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let error = errorData["error"] as? String {
                throw NSError(domain: "", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: error])
            }
            throw URLError(.badServerResponse)
        }
        
        guard let result = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw URLError(.cannotParseResponse)
        }
        
        // Fetch recent generations to update the preview
        await fetchRecentGenerations()
        
        return result
    }
    
    func fetchRecentGenerations() {
        Task {
            do {
                guard let url = URL(string: "\(baseURL)/generation/history?per_page=10") else { return }
                
                var request = URLRequest(url: url)
                if let token = KeychainHelper.shared.getToken() {
                    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }
                
                let (data, _) = try await URLSession.shared.data(for: request)
                let response = try JSONDecoder().decode(GenerationHistoryResponse.self, from: data)
                
                await MainActor.run {
                    self.recentGenerations = response.images.filter { $0.generationType == "text_to_image" && $0.status == "Ready" }
                }
            } catch {
                print("Failed to fetch recent generations: \(error)")
            }
        }
    }
}

struct TextToImageView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            TextToImageView()
                .environmentObject(AuthManager())
        }
    }
} 