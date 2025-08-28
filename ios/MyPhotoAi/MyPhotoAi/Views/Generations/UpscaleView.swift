import SwiftUI
import PhotosUI

struct UpscaleView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = UpscaleViewModel()
    @State private var selectedImage: UIImage?
    @State private var selectedItem: PhotosPickerItem?
    @State private var upscaleFactor: Int = 2
    @State private var isUpscaling = false
    @State private var errorMessage: String?
    @State private var showImagePicker = false
    @State private var imageSource: ImageSource = .none
    
    enum ImageSource {
        case none, picker, gallery
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Image Upscaling")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Increase the resolution of your images using AI")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                
                VStack(spacing: 16) {
                    // Image Selection Area
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Image for Upscale")
                            .font(.headline)
                        
                        // Image Upload Area
                        PhotosPicker(selection: $selectedItem, matching: .images) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color(UIColor.secondarySystemBackground))
                                    .aspectRatio(1, contentMode: .fit)
                                
                                if let selectedImage = selectedImage {
                                    Image(uiImage: selectedImage)
                                        .resizable()
                                        .scaledToFill()
                                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                                        .clipped()
                                        .cornerRadius(16)
                                } else {
                                    VStack(spacing: 12) {
                                        Image(systemName: "arrow.up.doc.on.clipboard")
                                            .font(.system(size: 48))
                                            .foregroundColor(.secondary)
                                        
                                        Text("Click to upload")
                                            .font(.headline)
                                            .foregroundColor(.primary)
                                        
                                        Text("Image for upscaling")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(style: StrokeStyle(lineWidth: 2, dash: [8]))
                                    .foregroundColor(.secondary.opacity(0.3))
                            )
                        }
                        .onChange(of: selectedItem) { newItem in
                            Task {
                                if let data = try? await newItem?.loadTransferable(type: Data.self),
                                   let uiImage = UIImage(data: data) {
                                    selectedImage = uiImage
                                    imageSource = .picker
                                    errorMessage = nil
                                    
                                    // Validate image size
                                    validateImageSize(uiImage)
                                }
                            }
                        }
                        
                        // Clear button
                        if selectedImage != nil {
                            Button(action: clearSelection) {
                                HStack {
                                    Image(systemName: "xmark.circle.fill")
                                    Text("Clear Selection")
                                }
                                .font(.caption)
                                .foregroundColor(.secondary)
                            }
                            .padding(.top, 4)
                        }
                    }
                    
                    // Or select from gallery
                    Button(action: selectFromGallery) {
                        HStack {
                            Image(systemName: "photo.on.rectangle")
                            Text("Or select from your gallery")
                        }
                        .font(.subheadline)
                        .foregroundColor(Color("AccentColor"))
                    }
                    
                    // Upscale Factor Selector
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Upscale Factor")
                            .font(.headline)
                        
                        HStack(spacing: 12) {
                            ForEach([2, 4], id: \.self) { factor in
                                Button(action: { upscaleFactor = factor }) {
                                    Text("\(factor)x")
                                        .font(.system(size: 16, weight: .medium))
                                        .frame(width: 60, height: 44)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(upscaleFactor == factor ? Color("AccentColor") : Color(UIColor.tertiarySystemFill))
                                        )
                                        .foregroundColor(upscaleFactor == factor ? .black : .primary)
                                }
                                .disabled(isUpscaling)
                            }
                        }
                    }
                    
                    // Image Info
                    if let image = selectedImage {
                        HStack {
                            Image(systemName: "info.circle")
                                .foregroundColor(.secondary)
                            Text("Original: \(Int(image.size.width))×\(Int(image.size.height)) → Upscaled: \(Int(image.size.width) * upscaleFactor)×\(Int(image.size.height) * upscaleFactor)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal, 4)
                    }
                    
                    // Cost Display
                    if let balance = authManager.user?.balance_points {
                        HStack {
                            Image(systemName: "info.circle")
                                .foregroundColor(.secondary)
                            Text("Cost: 1 point")
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
                    
                    // Upscale Button
                    Button(action: upscaleImage) {
                        HStack {
                            if isUpscaling {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .black))
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "arrow.up.square")
                            }
                            Text(isUpscaling ? "Upscaling..." : "Start Upscale")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(isUpscaling || selectedImage == nil ? Color.gray : Color("AccentColor"))
                        .foregroundColor(isUpscaling || selectedImage == nil ? .gray : .black)
                        .cornerRadius(12)
                    }
                    .disabled(isUpscaling || selectedImage == nil)
                }
                .padding()
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(16)
                .padding(.horizontal)
                
                // Recent Upscales Preview
                if !viewModel.recentUpscales.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Recent Upscales")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(viewModel.recentUpscales.prefix(5)) { image in
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
        .sheet(isPresented: $showImagePicker) {
            GalleryImagePicker { selectedImage in
                self.selectedImage = selectedImage
                self.imageSource = .gallery
            }
        }
        .onAppear {
            viewModel.fetchRecentUpscales()
        }
    }
    
    private func validateImageSize(_ image: UIImage) {
        let maxDimension: CGFloat = 4096
        if image.size.width > maxDimension || image.size.height > maxDimension {
            errorMessage = "Image is too large. Maximum dimension is \(Int(maxDimension))px"
            selectedImage = nil
        }
    }
    
    private func clearSelection() {
        selectedImage = nil
        selectedItem = nil
        imageSource = .none
        errorMessage = nil
    }
    
    private func selectFromGallery() {
        showImagePicker = true
    }
    
    private func upscaleImage() {
        guard let image = selectedImage else { return }
        
        errorMessage = nil
        isUpscaling = true
        
        Task {
            do {
                let imageData = image.jpegData(compressionQuality: 0.9) ?? Data()
                let response = try await viewModel.upscaleImage(
                    imageData: imageData,
                    upscaleFactor: upscaleFactor,
                    imageSource: imageSource
                )
                
                // Update balance if provided
                if let newBalance = response["new_balance"] as? Int {
                    await MainActor.run {
                        authManager.updateBalance(newBalance)
                    }
                }
                
                // Clear selection after success
                await MainActor.run {
                    clearSelection()
                }
                
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                }
            }
            
            await MainActor.run {
                isUpscaling = false
            }
        }
    }
}

// MARK: - Gallery Image Picker (moved to SharedComponents.swift)

// MARK: - View Model
class UpscaleViewModel: ObservableObject {
    @Published var recentUpscales: [GeneratedImage] = []
    private let baseURL = "https://myphotoai.net/api"
    
    func upscaleImage(imageData: Data, upscaleFactor: Int, imageSource: UpscaleView.ImageSource) async throws -> [String: Any] {
        guard let url = URL(string: "\(baseURL)/generation/upscale") else {
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
        
        // Add upscale factor
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"upscale_factor\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(upscaleFactor)\r\n".data(using: .utf8)!)
        
        // Add image
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"image.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        
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
        
        // Fetch recent upscales to update the preview
        await fetchRecentUpscales()
        
        return result
    }
    
    func fetchRecentUpscales() {
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
                    self.recentUpscales = response.images.filter { $0.generationType == "upscale" && $0.status == "Ready" }
                }
            } catch {
                print("Failed to fetch recent upscales: \(error)")
            }
        }
    }
}

struct UpscaleView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            UpscaleView()
                .environmentObject(AuthManager())
        }
    }
} 