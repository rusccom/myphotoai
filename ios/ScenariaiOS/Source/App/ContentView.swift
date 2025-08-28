import SwiftUI

struct ContentView: View {
    // MARK: - Properties
    @EnvironmentObject private var coordinator: AppCoordinator
    
    // MARK: - Body
    var body: some View {
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.black,
                        Color.purple.opacity(0.3)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                VStack(spacing: 30) {
                    // Logo section
                    logoSection
                    
                    // Welcome text
                    welcomeSection
                    
                    // Features
                    featuresSection
                    
                    Spacer()
                    
                    // Action buttons
                    actionButtons
                }
                .padding(.horizontal, 24)
                .padding(.top, 50)
            }
        }
        .navigationBarHidden(true)
    }
}

// MARK: - Subviews
private extension ContentView {
    var logoSection: some View {
        VStack(spacing: 16) {
            // App icon placeholder
            RoundedRectangle(cornerRadius: 20)
                .fill(
                    LinearGradient(
                        colors: [.purple, .blue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 100, height: 100)
                .overlay(
                    Image(systemName: "brain.head.profile")
                        .font(.system(size: 40))
                        .foregroundColor(.white)
                )
            
            Text("ScenariaiOS")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.white)
        }
    }
    
    var welcomeSection: some View {
        VStack(spacing: 12) {
            Text("Добро пожаловать в будущее")
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
            
            Text("Создавайте персональные AI модели и генерируйте уникальные изображения")
                .font(.body)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 16)
        }
    }
    
    var featuresSection: some View {
        VStack(spacing: 16) {
            FeatureRow(
                icon: "person.crop.circle",
                title: "AI Модели",
                description: "Создание персональных моделей"
            )
            
            FeatureRow(
                icon: "photo.on.rectangle",
                title: "Генерация",
                description: "Создание уникальных изображений"
            )
            
            FeatureRow(
                icon: "square.grid.3x3",
                title: "Галерея",
                description: "Управление вашими творениями"
            )
        }
    }
    
    var actionButtons: some View {
        VStack(spacing: 16) {
            Button(action: {
                // Navigate to main app
            }) {
                HStack {
                    Text("Начать работу")
                        .fontWeight(.semibold)
                    
                    Image(systemName: "arrow.right")
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity, minHeight: 50)
                .background(
                    LinearGradient(
                        colors: [.purple, .blue],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(12)
            }
            
            Button(action: {
                // Show info
            }) {
                Text("Узнать больше")
                    .fontWeight(.medium)
                    .foregroundColor(.purple)
                    .frame(maxWidth: .infinity, minHeight: 50)
                    .background(Color.purple.opacity(0.1))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.purple.opacity(0.3), lineWidth: 1)
                    )
            }
        }
        .padding(.bottom, 30)
    }
}

// MARK: - FeatureRow
struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(.purple)
                .frame(width: 40, height: 40)
                .background(Color.purple.opacity(0.1))
                .cornerRadius(10)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.white)
                
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }
            
            Spacer()
        }
        .padding(.horizontal, 16)
    }
}

// MARK: - Preview
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(AppCoordinator())
            .environmentObject(DependencyContainer())
    }
}
