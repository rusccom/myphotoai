import SwiftUI

struct VideoGenerationView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Video Generation")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Create amazing videos from your photos")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                
                // Coming Soon Card
                VStack(spacing: 24) {
                    // Icon
                    ZStack {
                        Circle()
                            .fill(Color("AccentColor").opacity(0.1))
                            .frame(width: 120, height: 120)
                        
                        Image(systemName: "video.fill")
                            .font(.system(size: 50))
                            .foregroundColor(Color("AccentColor"))
                    }
                    
                    // Coming Soon Text
                    VStack(spacing: 12) {
                        Text("Coming Soon!")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        Text("We're working hard to bring you amazing video generation capabilities. Stay tuned!")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    
                    // Feature Preview
                    VStack(alignment: .leading, spacing: 16) {
                        Text("What to expect:")
                            .font(.headline)
                        
                        FeatureRow(icon: "sparkles", text: "Transform photos into dynamic videos")
                        FeatureRow(icon: "wand.and.stars", text: "Add motion and effects to still images")
                        FeatureRow(icon: "film", text: "Create professional-quality content")
                        FeatureRow(icon: "clock", text: "Fast processing times")
                    }
                    .padding()
                    .background(Color(UIColor.tertiarySystemBackground))
                    .cornerRadius(12)
                    
                    // Notification Button
                    Button(action: {
                        // TODO: Implement notification signup
                    }) {
                        HStack {
                            Image(systemName: "bell")
                            Text("Notify Me When Available")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color("AccentColor"))
                        .foregroundColor(.black)
                        .cornerRadius(12)
                    }
                    .padding(.top)
                }
                .padding()
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(16)
                .padding(.horizontal)
                
                // Example Videos Section (Placeholder)
                VStack(alignment: .leading, spacing: 16) {
                    Text("Example Videos")
                        .font(.headline)
                        .padding(.horizontal)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 16) {
                            ForEach(0..<3) { index in
                                VideoPlaceholder(index: index)
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.top)
            }
            .padding(.vertical)
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Supporting Views
struct FeatureRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(Color("AccentColor"))
                .frame(width: 30)
            
            Text(text)
                .font(.subheadline)
                .foregroundColor(.primary)
            
            Spacer()
        }
    }
}

struct VideoPlaceholder: View {
    let index: Int
    
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(
                    LinearGradient(
                        colors: [
                            Color("AccentColor").opacity(0.3),
                            Color("AccentColor").opacity(0.1)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 200, height: 280)
            
            VStack(spacing: 8) {
                Image(systemName: "play.circle.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.white)
                
                Text("Example \(index + 1)")
                    .font(.caption)
                    .foregroundColor(.white)
            }
        }
    }
}

struct VideoGenerationView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            VideoGenerationView()
                .environmentObject(AuthManager())
        }
    }
} 