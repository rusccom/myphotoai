import SwiftUI

struct OnboardingView: View {
    @Binding var hasSeenOnboarding: Bool
    @State private var currentPage = 0
    
    let onboardingData = [
        OnboardingItem(
            title: "Create AI Models",
            description: "Upload your photos and create a personal AI model in minutes.",
            imageName: "person.crop.circle.badge.plus",
            gradientColors: [Color.purple, Color.pink]
        ),
        OnboardingItem(
            title: "Generate Images",
            description: "Use text prompts or your trained models to create unique photos.",
            imageName: "photo.stack",
            gradientColors: [Color.blue, Color.cyan]
        ),
        OnboardingItem(
            title: "Virtual Try-On",
            description: "Try on any clothing with our advanced AI technology.",
            imageName: "tshirt",
            gradientColors: [Color.orange, Color.red]
        )
    ]
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color.black, Color.black.opacity(0.9)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Skip button
                HStack {
                    Spacer()
                    Button("Skip") {
                        withAnimation {
                            hasSeenOnboarding = true
                        }
                    }
                    .foregroundColor(.gray)
                    .padding()
                }
                
                // Carousel
                TabView(selection: $currentPage) {
                    ForEach(0..<onboardingData.count, id: \.self) { index in
                        OnboardingPageView(item: onboardingData[index])
                            .tag(index)
                    }
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                .animation(.easeInOut, value: currentPage)
                
                // Page indicators
                HStack(spacing: 10) {
                    ForEach(0..<onboardingData.count, id: \.self) { index in
                        Capsule()
                            .fill(currentPage == index ? Color.white : Color.gray.opacity(0.5))
                            .frame(width: currentPage == index ? 30 : 10, height: 10)
                            .animation(.easeInOut, value: currentPage)
                    }
                }
                .padding(.vertical, 20)
                
                // Continue button
                Button(action: {
                    if currentPage < onboardingData.count - 1 {
                        withAnimation {
                            currentPage += 1
                        }
                    } else {
                        withAnimation {
                            hasSeenOnboarding = true
                        }
                    }
                }) {
                    Text(currentPage < onboardingData.count - 1 ? "Next" : "Get Started")
                        .font(.headline)
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            LinearGradient(
                                colors: onboardingData[currentPage].gradientColors,
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(25)
                        .shadow(color: onboardingData[currentPage].gradientColors[0].opacity(0.5), radius: 10, x: 0, y: 5)
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 50)
            }
        }
    }
}

struct OnboardingPageView: View {
    let item: OnboardingItem
    
    var body: some View {
        VStack(spacing: 30) {
            Spacer()
            
            // Icon with gradient
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: item.gradientColors,
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 150, height: 150)
                    .shadow(color: item.gradientColors[0].opacity(0.5), radius: 20, x: 0, y: 10)
                
                Image(systemName: item.imageName)
                    .font(.system(size: 60))
                    .foregroundColor(.white)
            }
            
            VStack(spacing: 15) {
                Text(item.title)
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                
                Text(item.description)
                    .font(.body)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    .fixedSize(horizontal: false, vertical: true)
            }
            
            Spacer()
            Spacer()
        }
    }
}

struct OnboardingItem {
    let title: String
    let description: String
    let imageName: String
    let gradientColors: [Color]
} 