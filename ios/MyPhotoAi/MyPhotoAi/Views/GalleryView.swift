import SwiftUI

struct GalleryView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = GalleryViewModel()
    @State private var selectedImage: GeneratedImage?
    @State private var showingImageDetail = false
    @State private var selectedFilter = "all" // all, model, text, tryon, upscale, video
    
    let columns = [
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10)
    ]
    
    var filteredImages: [GeneratedImage] {
        switch selectedFilter {
        case "model":
            return viewModel.images.filter { $0.generationType == "model_photo" }
        case "text":
            return viewModel.images.filter { $0.generationType == "text_to_image" }
        case "tryon":
            return viewModel.images.filter { $0.generationType == "try_on" }
        case "upscale":
            return viewModel.images.filter { $0.generationType == "upscale" }
        case "video":
            return viewModel.images.filter { $0.generationType == "video" }
        default:
            return viewModel.images
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background
                LinearGradient(
                    colors: [Color.black, Color(white: 0.05)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Header and filters
                    VStack(spacing: 15) {
                        HStack {
                            Text("Gallery")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                            
                            Spacer()
                            
                            // Image counter
                            Text("\(viewModel.images.count)")
                                .font(.caption)
                                .foregroundColor(.gray)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color(white: 0.1))
                                .cornerRadius(15)
                        }
                        
                        // Filters
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                FilterChip(title: "All", tag: "all", selectedFilter: $selectedFilter)
                                FilterChip(title: "Models", tag: "model", selectedFilter: $selectedFilter)
                                FilterChip(title: "Text", tag: "text", selectedFilter: $selectedFilter)
                                FilterChip(title: "Try-On", tag: "tryon", selectedFilter: $selectedFilter)
                                FilterChip(title: "Upscale", tag: "upscale", selectedFilter: $selectedFilter)
                                FilterChip(title: "Video", tag: "video", selectedFilter: $selectedFilter)
                            }
                        }
                    }
                    .padding()
                    
                    // Image grid
                    if viewModel.isLoading && viewModel.images.isEmpty {
                        Spacer()
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .purple))
                            .scaleEffect(1.5)
                        Spacer()
                    } else if viewModel.images.isEmpty {
                        Spacer()
                        VStack(spacing: 20) {
                            Image(systemName: "photo.stack")
                                .font(.system(size: 60))
                                .foregroundColor(.gray)
                            
                            Text("No Images Yet")
                                .font(.headline)
                                .foregroundColor(.gray)
                            
                            Text("Your generated images will appear here.")
                                .font(.caption)
                                .foregroundColor(.gray.opacity(0.7))
                                .multilineTextAlignment(.center)
                        }
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVGrid(columns: columns, spacing: 10) {
                                ForEach(filteredImages) { image in
                                    GalleryImageCard(image: image)
                                        .onTapGesture {
                                            selectedImage = image
                                            showingImageDetail = true
                                        }
                                }
                            }
                            .padding()
                            
                            if viewModel.hasMorePages && !viewModel.isLoadingMore {
                                Button("Load More") {
                                    viewModel.loadMoreImages(authToken: authManager.authToken)
                                }
                                .foregroundColor(.purple)
                                .padding()
                            }
                            
                            if viewModel.isLoadingMore {
                                ProgressView()
                                    .padding()
                            }
                        }
                    }
                }
            }
            .navigationBarHidden(true)
            .onAppear {
                if viewModel.images.isEmpty {
                    viewModel.loadImages(authToken: authManager.authToken)
                }
            }
            .sheet(item: $selectedImage) { image in
                ImageDetailView(image: image)
            }
        }
    }
}

// Filter component
struct FilterChip: View {
    let title: String
    let tag: String
    @Binding var selectedFilter: String
    
    var isSelected: Bool {
        selectedFilter == tag
    }
    
    var body: some View {
        Button(action: {
            withAnimation(.spring()) {
                selectedFilter = tag
            }
        }) {
            Text(title)
                .font(.caption)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? .black : .white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    isSelected ?
                    AnyView(
                        LinearGradient(
                            colors: [Color.purple, Color.pink],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    ) :
                    AnyView(Color(white: 0.1))
                )
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(isSelected ? Color.clear : Color.purple.opacity(0.3), lineWidth: 1)
                )
        }
    }
}

// Image card in the gallery
struct GalleryImageCard: View {
    let image: GeneratedImage
    @State private var isImageLoading = true
    
    var aspectRatio: Double {
        guard let ratio = image.aspectRatio else { return 1.0 }
        let parts = ratio.split(separator: ":").compactMap { Double($0) }
        guard parts.count == 2, parts[1] != 0 else { return 1.0 }
        return parts[0] / parts[1]
    }
    
    var body: some View {
        ZStack {
            if image.status == "pending" || image.status == "running" {
                // Placeholder for a generating image
                RoundedRectangle(cornerRadius: 15)
                    .fill(Color(white: 0.1))
                    .aspectRatio(aspectRatio, contentMode: .fit)
                    .overlay(
                        VStack(spacing: 10) {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .purple))
                            
                            Text(image.status == "pending" ? "In Queue..." : "Generating...")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    )
            } else if let imageUrl = image.signedUrl {
                // Generated image
                AsyncImage(url: URL(string: imageUrl)) { phase in
                    switch phase {
                    case .success(let img):
                        img
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(minHeight: 150)
                            .clipped()
                            .cornerRadius(15)
                            .onAppear { isImageLoading = false }
                    case .failure(_):
                        RoundedRectangle(cornerRadius: 15)
                            .fill(Color(white: 0.1))
                            .aspectRatio(aspectRatio, contentMode: .fit)
                            .overlay(
                                Image(systemName: "exclamationmark.triangle")
                                    .foregroundColor(.red)
                            )
                    case .empty:
                        RoundedRectangle(cornerRadius: 15)
                            .fill(Color(white: 0.1))
                            .aspectRatio(aspectRatio, contentMode: .fit)
                            .overlay(
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .purple))
                            )
                    @unknown default:
                        EmptyView()
                    }
                }
            }
            
            // Generation type badge
            if image.status == "ready", let type = image.generationType {
                VStack {
                    HStack {
                        Spacer()
                        GenerationTypeBadge(type: type)
                            .padding(8)
                    }
                    Spacer()
                }
            }
        }
        .shadow(color: Color.purple.opacity(0.2), radius: 5, x: 0, y: 3)
    }
}

// Generation type badge
struct GenerationTypeBadge: View {
    let type: String
    
    var icon: String {
        switch type {
        case "model_photo":
            return "person.crop.square"
        case "text_to_image":
            return "text.bubble"
        case "try_on":
            return "tshirt"
        case "upscale":
            return "arrow.up.right.square"
        case "video":
            return "video.circle"
        default:
            return "sparkles"
        }
    }
    
    var color: Color {
        switch type {
        case "model_photo":
            return .purple
        case "text_to_image":
            return .blue
        case "try_on":
            return .orange
        case "upscale":
            return .green
        case "video":
            return .indigo
        default:
            return .gray
        }
    }
    
    var body: some View {
        Image(systemName: icon)
            .font(.caption)
            .foregroundColor(.white)
            .padding(6)
            .background(color)
            .clipShape(Circle())
    }
} 