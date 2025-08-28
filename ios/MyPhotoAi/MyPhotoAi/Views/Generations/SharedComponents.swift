import SwiftUI
import PhotosUI

// MARK: - Shared Button Components

struct AspectRatioButton: View {
    let ratio: String
    let label: String
    let isSelected: Bool
    let color: Color
    let onTap: () -> Void
    
    // Default initializer with purple color
    init(ratio: String, label: String, isSelected: Bool, onTap: @escaping () -> Void) {
        self.ratio = ratio
        self.label = label
        self.isSelected = isSelected
        self.color = .purple
        self.onTap = onTap
    }
    
    // Initializer with custom color
    init(ratio: String, label: String, isSelected: Bool, color: Color, onTap: @escaping () -> Void) {
        self.ratio = ratio
        self.label = label
        self.isSelected = isSelected
        self.color = color
        self.onTap = onTap
    }
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? color : Color.gray.opacity(0.3), lineWidth: 2)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(isSelected ? color.opacity(0.1) : Color.clear)
                    )
                    .aspectRatio(aspectRatioValue, contentMode: .fit)
                    .frame(width: 60)
                
                Text(label)
                    .font(.caption)
                    .foregroundColor(isSelected ? color : .secondary)
            }
        }
    }
    
    private var aspectRatioValue: CGFloat {
        let components = ratio.split(separator: ":")
        guard components.count == 2,
              let width = Double(components[0]),
              let height = Double(components[1]) else {
            return 1.0
        }
        return width / height
    }
}

struct NumberButton: View {
    let number: Int
    let isSelected: Bool
    let color: Color
    let action: () -> Void
    
    // Default initializer with purple color
    init(number: Int, isSelected: Bool, action: @escaping () -> Void) {
        self.number = number
        self.isSelected = isSelected
        self.color = .purple
        self.action = action
    }
    
    // Initializer with custom color
    init(number: Int, isSelected: Bool, color: Color, action: @escaping () -> Void) {
        self.number = number
        self.isSelected = isSelected
        self.color = color
        self.action = action
    }
    
    var body: some View {
        Button(action: action) {
            Text("\(number)")
                .font(.system(size: 16, weight: .medium))
                .frame(width: 44, height: 44)
                .background(
                    Circle()
                        .fill(isSelected ? color : Color(UIColor.tertiarySystemFill))
                )
                .foregroundColor(isSelected ? .black : .primary)
        }
    }
}

// MARK: - Gallery Image Picker

struct GalleryImagePicker: View {
    let onImageSelected: (UIImage) -> Void
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = GalleryViewModel()
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    ForEach(viewModel.readyImages) { image in
                        if let urlString = image.signedUrl,
                           let url = URL(string: urlString) {
                            AsyncImage(url: url) { asyncImage in
                                asyncImage
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 110, height: 110)
                                    .clipped()
                                    .cornerRadius(8)
                                    .onTapGesture {
                                        selectImage(from: url)
                                    }
                            } placeholder: {
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color(UIColor.tertiarySystemFill))
                                    .frame(width: 110, height: 110)
                                    .overlay(
                                        ProgressView()
                                    )
                            }
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Select Image")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            viewModel.loadImages(authToken: authManager.authToken)
        }
    }
    
    private func selectImage(from url: URL) {
        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let uiImage = UIImage(data: data) {
                    await MainActor.run {
                        onImageSelected(uiImage)
                        dismiss()
                    }
                }
            } catch {
                print("Failed to load image from gallery: \(error)")
            }
        }
    }
}

// MARK: - Image Upload Area

struct ImageUploadArea: View {
    let image: UIImage?
    let placeholder: String
    let hint: String
    let icon: String
    
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(UIColor.secondarySystemBackground))
                .aspectRatio(1, contentMode: .fit)
            
            if let image = image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .clipped()
                    .cornerRadius(16)
            } else {
                VStack(spacing: 12) {
                    Image(systemName: icon)
                        .font(.system(size: 48))
                        .foregroundColor(.secondary)
                    
                    Text(placeholder)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(hint)
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
} 