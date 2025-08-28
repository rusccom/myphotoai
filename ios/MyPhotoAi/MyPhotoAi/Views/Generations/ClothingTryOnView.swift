import SwiftUI
import PhotosUI

struct ClothingTryOnView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = ClothingTryOnViewModel()
    
    // Model/Person Image
    @State private var modelImage: UIImage?
    @State private var modelPickerItem: PhotosPickerItem?
    @State private var modelImageSource: ImageSource = .none
    
    // Garment Image
    @State private var garmentImage: UIImage?
    @State private var garmentPickerItem: PhotosPickerItem?
    
    @State private var numImages = 1
    @State private var isGenerating = false
    @State private var errorMessage: String?
    @State private var showModelGalleryPicker = false
    
    enum ImageSource {
        case none, picker, gallery
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Clothing Try-On")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Upload a photo of a person and a photo of clothing to see a preview")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                
                VStack(spacing: 16) {
                    // Model (Person) Image Upload
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Model (Person) Image")
                            .font(.headline)
                        
                        PhotosPicker(selection: $modelPickerItem, matching: .images) {
                            ImageUploadArea(
                                image: modelImage,
                                placeholder: "Click to upload or drag & drop",
                                hint: "Recommended: Clear, front-facing",
                                icon: "person.fill"
                            )
                        }
                        .onChange(of: modelPickerItem) { newItem in
                            Task {
                                if let data = try? await newItem?.loadTransferable(type: Data.self),
                                   let uiImage = UIImage(data: data) {
                                    modelImage = uiImage
                                    modelImageSource = .picker
                                    errorMessage = nil
                                }
                            }
                        }
                        
                        HStack(spacing: 12) {
                            if modelImage != nil {
                                Button(action: clearModelSelection) {
                                    HStack {
                                        Image(systemName: "xmark.circle.fill")
                                        Text("Clear")
                                    }
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                }
                            }
                            
                            Button(action: { showModelGalleryPicker = true }) {
                                HStack {
                                    Image(systemName: "photo.on.rectangle")
                                    Text("Select from gallery")
                                }
                                .font(.caption)
                                .foregroundColor(Color("AccentColor"))
                            }
                        }
                    }
                    
                    // Garment Image Upload
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Garment Image")
                            .font(.headline)
                        
                        PhotosPicker(selection: $garmentPickerItem, matching: .images) {
                            ImageUploadArea(
                                image: garmentImage,
                                placeholder: "Click to upload garment",
                                hint: "E.g., t-shirt, dress, pants",
                                icon: "tshirt.fill"
                            )
                        }
                        .onChange(of: garmentPickerItem) { newItem in
                            Task {
                                if let data = try? await newItem?.loadTransferable(type: Data.self),
                                   let uiImage = UIImage(data: data) {
                                    garmentImage = uiImage
                                    errorMessage = nil
                                }
                            }
                        }
                        
                        if garmentImage != nil {
                            Button(action: clearGarmentSelection) {
                                HStack {
                                    Image(systemName: "xmark.circle.fill")
                                    Text("Clear")
                                }
                                .font(.caption)
                                .foregroundColor(.secondary)
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
                            Text("Cost: \(10 * numImages) points")
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
                    Button(action: startTryOn) {
                        HStack {
                            if isGenerating {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .black))
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "wand.and.stars")
                            }
                            Text(isGenerating ? "Processing..." : "Start Try-On")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(canStartTryOn ? Color("AccentColor") : Color.gray)
                        .foregroundColor(canStartTryOn ? .black : .gray)
                        .cornerRadius(12)
                    }
                    .disabled(!canStartTryOn)
                }
                .padding()
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(16)
                .padding(.horizontal)
                
                // Recent Try-Ons Preview
                if !viewModel.recentTryOns.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Recent Try-Ons")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(viewModel.recentTryOns.prefix(5)) { image in
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
        .sheet(isPresented: $showModelGalleryPicker) {
            GalleryImagePicker { selectedImage in
                modelImage = selectedImage
                modelImageSource = .gallery
            }
        }
        .onAppear {
            viewModel.fetchRecentTryOns()
        }
    }
    
    private var canStartTryOn: Bool {
        !isGenerating && modelImage != nil && garmentImage != nil
    }
    
    private func clearModelSelection() {
        modelImage = nil
        modelPickerItem = nil
        modelImageSource = .none
    }
    
    private func clearGarmentSelection() {
        garmentImage = nil
        garmentPickerItem = nil
    }
    
    private func startTryOn() {
        guard let modelImg = modelImage,
              let garmentImg = garmentImage else { return }
        
        errorMessage = nil
        isGenerating = true
        
        Task {
            do {
                let modelData = modelImg.jpegData(compressionQuality: 0.9) ?? Data()
                let garmentData = garmentImg.jpegData(compressionQuality: 0.9) ?? Data()
                
                let response = try await viewModel.startTryOn(
                    modelImageData: modelData,
                    garmentImageData: garmentData,
                    numImages: numImages,
                    modelImageSource: modelImageSource
                )
                
                // Update balance if provided
                if let newBalance = response["new_balance"] as? Int {
                    await MainActor.run {
                        authManager.updateBalance(newBalance)
                    }
                }
                
                // Clear selections after success
                await MainActor.run {
                    clearModelSelection()
                    clearGarmentSelection()
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
class ClothingTryOnViewModel: ObservableObject {
    @Published var recentTryOns: [GeneratedImage] = []
    private let baseURL = "https://myphotoai.net/api"
    
    func startTryOn(modelImageData: Data, garmentImageData: Data, numImages: Int, modelImageSource: ClothingTryOnView.ImageSource) async throws -> [String: Any] {
        guard let url = URL(string: "\(baseURL)/generation/try-on") else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        if let token = KeychainHelper.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // Create multipart form data
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // Add model image
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"model_image\"; filename=\"model.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(modelImageData)
        body.append("\r\n".data(using: .utf8)!)
        
        // Add garment image
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"garment_image\"; filename=\"garment.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(garmentImageData)
        body.append("\r\n".data(using: .utf8)!)
        
        // Add number of images
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"num_images\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(numImages)\r\n".data(using: .utf8)!)
        
        // Add default parameters
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"category\"\r\n\r\n".data(using: .utf8)!)
        body.append("auto\r\n".data(using: .utf8)!)
        
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"mode\"\r\n\r\n".data(using: .utf8)!)
        body.append("balanced\r\n".data(using: .utf8)!)
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
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
        
        // Fetch recent try-ons to update the preview
        await fetchRecentTryOns()
        
        return result
    }
    
    func fetchRecentTryOns() {
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
                    self.recentTryOns = response.images.filter { $0.generationType == "try_on" && $0.status == "Ready" }
                }
            } catch {
                print("Failed to fetch recent try-ons: \(error)")
            }
        }
    }
}

struct ClothingTryOnView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            ClothingTryOnView()
                .environmentObject(AuthManager())
        }
    }
} 