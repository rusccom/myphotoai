import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedTab = 3 // Start with the Menu tab
    
    var body: some View {
        ZStack {
            // Background color
            Color.black.ignoresSafeArea()
            
            TabView(selection: $selectedTab) {
                // Login/Profile
                Group {
                    if authManager.isAuthenticated {
                        ProfileView()
                    } else {
                        LoginView()
                    }
                }
                .tabItem {
                    VStack {
                        Image(systemName: authManager.isAuthenticated ? "person.crop.circle.fill" : "person.crop.circle")
                        Text(authManager.isAuthenticated ? "Profile" : "Login")
                    }
                }
                .tag(0)
                
                // Settings
                SettingsView()
                    .tabItem {
                        VStack {
                            Image(systemName: "gearshape.fill")
                            Text("Settings")
                        }
                    }
                    .tag(1)
                
                // Gallery
                GalleryView()
                    .tabItem {
                        VStack {
                            Image(systemName: "photo.stack.fill")
                            Text("Gallery")
                        }
                    }
                    .tag(2)
                
                // Menu (main screen)
                MenuView()
                    .tabItem {
                        VStack {
                            Image(systemName: "square.grid.2x2.fill")
                            Text("Menu")
                        }
                    }
                    .tag(3)
            }
            .accentColor(.purple) // Neon accent for the selected tab
            .onAppear {
                // Configure TabBar appearance
                let appearance = UITabBarAppearance()
                appearance.configureWithOpaqueBackground()
                appearance.backgroundColor = UIColor.black.withAlphaComponent(0.9)
                
                // Neon glow for selected items
                appearance.stackedLayoutAppearance.selected.iconColor = UIColor.systemPurple
                appearance.stackedLayoutAppearance.selected.titleTextAttributes = [.foregroundColor: UIColor.systemPurple]
                
                // Gray color for unselected items
                appearance.stackedLayoutAppearance.normal.iconColor = UIColor.gray
                appearance.stackedLayoutAppearance.normal.titleTextAttributes = [.foregroundColor: UIColor.gray]
                
                UITabBar.appearance().standardAppearance = appearance
                UITabBar.appearance().scrollEdgeAppearance = appearance
            }
        }
    }
} 