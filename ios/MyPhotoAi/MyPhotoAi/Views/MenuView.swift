import SwiftUI

struct MenuView: View {
    @State private var selectedMenuItem: MenuItem?
    
    let menuItems = [
        MenuItem(
            title: "Model Generation",
            description: "Create photos with your AI model",
            icon: "person.crop.square",
            gradientColors: [Color.purple, Color.pink],
            destination: .modelGeneration,
            cost: "1 point/image"
        ),
        MenuItem(
            title: "Text to Image",
            description: "Generate images from text prompts",
            icon: "text.bubble",
            gradientColors: [Color.blue, Color.cyan],
            destination: .textToImage,
            cost: "1 point/image"
        ),
        MenuItem(
            title: "Clothing Try-On",
            description: "Virtual clothing try-on",
            icon: "tshirt",
            gradientColors: [Color.orange, Color.red],
            destination: .clothingTryOn,
            cost: "10 points/image"
        ),
        MenuItem(
            title: "Image Upscale",
            description: "Increase the resolution of your images",
            icon: "arrow.up.right.square",
            gradientColors: [Color.green, Color.mint],
            destination: .upscale,
            cost: "1 point"
        ),
        MenuItem(
            title: "Video Generation",
            description: "Animate your images",
            icon: "video.circle",
            gradientColors: [Color.indigo, Color.purple],
            destination: .video,
            cost: "Coming soon"
        )
    ]
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [Color.black, Color(white: 0.05)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Header
                        HStack {
                            VStack(alignment: .leading, spacing: 5) {
                                Text("MyPhotoAI")
                                    .font(.largeTitle)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                                
                                Text("Choose a generation type")
                                    .font(.subheadline)
                                    .foregroundColor(.gray)
                            }
                            Spacer()
                        }
                        .padding(.horizontal)
                        .padding(.top, 20)
                        
                        // Menu items
                        ForEach(menuItems) { item in
                            MenuItemView(item: item)
                                .onTapGesture {
                                    withAnimation(.spring()) {
                                        selectedMenuItem = item
                                    }
                                }
                        }
                        .padding(.horizontal)
                        
                        Spacer(minLength: 100)
                    }
                }
            }
            .navigationBarHidden(true)
            .fullScreenCover(item: $selectedMenuItem) { item in
                NavigationView {
                    destinationView(for: item.destination)
                        .navigationBarItems(
                            leading: Button(action: {
                                selectedMenuItem = nil
                            }) {
                                HStack(spacing: 5) {
                                    Image(systemName: "chevron.left")
                                    Text("Back")
                                }
                                .foregroundColor(.purple)
                            }
                        )
                }
            }
        }
    }
    
    @ViewBuilder
    func destinationView(for destination: MenuDestination) -> some View {
        switch destination {
        case .modelGeneration:
            ModelGenerationView()
        case .textToImage:
            TextToImageView()
        case .clothingTryOn:
            ClothingTryOnView()
        case .upscale:
            UpscaleView()
        case .video:
            VideoGenerationView()
        }
    }
}

struct MenuItemView: View {
    let item: MenuItem
    @State private var isPressed = false
    
    var body: some View {
        ZStack {
            // Фоновый градиент с неоновым свечением
            RoundedRectangle(cornerRadius: 20)
                .fill(
                    LinearGradient(
                        colors: [Color(white: 0.1), Color(white: 0.05)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(
                            LinearGradient(
                                colors: item.gradientColors,
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                        .opacity(0.5)
                )
                .shadow(
                    color: item.gradientColors[0].opacity(isPressed ? 0.8 : 0.3),
                    radius: isPressed ? 20 : 10,
                    x: 0,
                    y: 5
                )
            
            HStack(spacing: 20) {
                // Иконка
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: item.gradientColors,
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 60, height: 60)
                    
                    Image(systemName: item.icon)
                        .font(.system(size: 28))
                        .foregroundColor(.white)
                }
                
                // Текст
                VStack(alignment: .leading, spacing: 5) {
                    Text(item.title)
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    Text(item.description)
                        .font(.caption)
                        .foregroundColor(.gray)
                        .lineLimit(2)
                    
                    Text(item.cost)
                        .font(.caption2)
                        .foregroundColor(Color("AccentColor"))
                        .fontWeight(.medium)
                }
                
                Spacer()
                
                // Стрелка
                Image(systemName: "chevron.right")
                    .foregroundColor(.gray)
                    .font(.system(size: 14))
            }
            .padding()
        }
        .frame(height: 100)
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .onLongPressGesture(
            minimumDuration: 0,
            maximumDistance: .infinity,
            pressing: { pressing in
                withAnimation(.easeInOut(duration: 0.1)) {
                    isPressed = pressing
                }
            },
            perform: {}
        )
    }
}

struct MenuItem: Identifiable {
    let id = UUID()
    let title: String
    let description: String
    let icon: String
    let gradientColors: [Color]
    let destination: MenuDestination
    let cost: String
}

enum MenuDestination {
    case modelGeneration
    case textToImage
    case clothingTryOn
    case upscale
    case video
} 