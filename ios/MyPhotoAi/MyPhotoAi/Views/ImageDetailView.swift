import SwiftUI
import Photos

struct ImageDetailView: View {
    let image: GeneratedImage
    @Environment(\.dismiss) var dismiss
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    @State private var showShareSheet = false
    @State private var showSaveSuccess = false
    @State private var showSaveError = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background
                Color.black.ignoresSafeArea()
                
                // Image
                if let imageUrl = image.signedUrl,
                   let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let img):
                            img
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .scaleEffect(scale)
                                .offset(offset)
                                .gesture(
                                    MagnificationGesture()
                                        .onChanged { value in
                                            let delta = value / lastScale
                                            lastScale = value
                                            scale = min(max(scale * delta, 1), 4)
                                        }
                                        .onEnded { _ in
                                            lastScale = 1.0
                                            if scale < 1.1 {
                                                withAnimation(.spring()) {
                                                    scale = 1.0
                                                    offset = .zero
                                                }
                                            }
                                        }
                                )
                                .simultaneousGesture(
                                    DragGesture()
                                        .onChanged { value in
                                            if scale > 1 {
                                                offset = CGSize(
                                                    width: lastOffset.width + value.translation.width,
                                                    height: lastOffset.height + value.translation.height
                                                )
                                            }
                                        }
                                        .onEnded { _ in
                                            lastOffset = offset
                                            if scale <= 1 {
                                                withAnimation(.spring()) {
                                                    offset = .zero
                                                    lastOffset = .zero
                                                }
                                            }
                                        }
                                )
                                .onTapGesture(count: 2) {
                                    withAnimation(.spring()) {
                                        if scale > 1 {
                                            scale = 1
                                            offset = .zero
                                            lastOffset = .zero
                                        } else {
                                            scale = 2
                                        }
                                    }
                                }
                        case .failure(_):
                            VStack {
                                Image(systemName: "exclamationmark.triangle")
                                    .font(.system(size: 50))
                                    .foregroundColor(.red)
                                Text("Failed to load image")
                                    .foregroundColor(.white)
                            }
                        case .empty:
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .purple))
                                .scaleEffect(1.5)
                        @unknown default:
                            EmptyView()
                        }
                    }
                }
                
                // Save success indicator
                if showSaveSuccess {
                    VStack {
                        Spacer()
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text("Saved to Photos")
                                .foregroundColor(.white)
                        }
                        .padding()
                        .background(Color.black.opacity(0.8))
                        .cornerRadius(20)
                        .padding(.bottom, 50)
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .zIndex(1)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(.purple)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 20) {
                        // Save button
                        Button(action: saveImage) {
                            Image(systemName: "arrow.down.circle")
                                .foregroundColor(.purple)
                        }
                        
                        // Share button
                        Button(action: {
                            showShareSheet = true
                        }) {
                            Image(systemName: "square.and.arrow.up")
                                .foregroundColor(.purple)
                        }
                    }
                }
            }
            .alert("Error", isPresented: $showSaveError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
            .sheet(isPresented: $showShareSheet) {
                if let imageUrl = image.signedUrl,
                   let url = URL(string: imageUrl) {
                    ShareSheet(url: url)
                }
            }
        }
    }
    
    func saveImage() {
        guard let imageUrl = image.signedUrl,
              let url = URL(string: imageUrl) else { return }
        
        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                guard let uiImage = UIImage(data: data) else {
                    throw ImageSaveError.invalidImage
                }
                
                // Request authorization and save
                let status = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
                
                guard status == .authorized else {
                    throw ImageSaveError.noPermission
                }
                
                try await PHPhotoLibrary.shared().performChanges {
                    PHAssetChangeRequest.creationRequestForAsset(from: uiImage)
                }
                
                await MainActor.run {
                    showSaveSuccess = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        withAnimation {
                            showSaveSuccess = false
                        }
                    }
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showSaveError = true
                }
            }
        }
    }
}

enum ImageSaveError: LocalizedError {
    case invalidImage
    case noPermission
    
    var errorDescription: String? {
        switch self {
        case .invalidImage:
            return "Failed to process the image."
        case .noPermission:
            return "Photo library access is not permitted. Please enable it in Settings."
        }
    }
}

// Share sheet component
struct ShareSheet: UIViewControllerRepresentable {
    let url: URL
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(
            activityItems: [url],
            applicationActivities: nil
        )
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
} 