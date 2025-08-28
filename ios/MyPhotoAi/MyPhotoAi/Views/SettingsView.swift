import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthManager
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("darkModeEnabled") private var darkModeEnabled = true
    @State private var showingAbout = false
    
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
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Header
                        HStack {
                            Text("Settings")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding(.horizontal)
                        .padding(.top, 20)
                        
                        // Account Settings
                        VStack(spacing: 0) {
                            SettingsSectionHeader(title: "Account")
                            
                            SettingsRow(
                                icon: "person.circle",
                                title: "Profile",
                                action: {}
                            )
                            
                            SettingsRow(
                                icon: "creditcard",
                                title: "Balance & Payments",
                                action: {}
                            )
                        }
                        
                        // App Settings
                        VStack(spacing: 0) {
                            SettingsSectionHeader(title: "Application")
                            
                            SettingsToggleRow(
                                icon: "bell",
                                title: "Notifications",
                                isOn: $notificationsEnabled
                            )
                            
                            SettingsRow(
                                icon: "globe",
                                title: "Language",
                                value: "English",
                                action: {}
                            )
                        }
                        
                        // Support
                        VStack(spacing: 0) {
                            SettingsSectionHeader(title: "Support")
                            
                            SettingsRow(
                                icon: "questionmark.circle",
                                title: "Help Center",
                                action: {}
                            )
                            
                            SettingsRow(
                                icon: "envelope",
                                title: "Contact Us",
                                action: {}
                            )
                            
                            SettingsRow(
                                icon: "doc.text",
                                title: "Terms of Service",
                                action: {}
                            )
                            
                            SettingsRow(
                                icon: "hand.raised",
                                title: "Privacy Policy",
                                action: {}
                            )
                        }
                        
                        // About
                        VStack(spacing: 10) {
                            Text("MyPhotoAI")
                                .font(.headline)
                                .foregroundColor(.white)
                            
                            Text("Version 1.0.0")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        .padding(.top, 30)
                        
                        Spacer(minLength: 100)
                    }
                }
            }
            .navigationBarHidden(true)
        }
    }
}

// Section header component
struct SettingsSectionHeader: View {
    let title: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
                .textCase(.uppercase)
            Spacer()
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
    }
}

// Settings row component
struct SettingsRow: View {
    let icon: String
    let title: String
    var value: String? = nil
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(.purple)
                    .frame(width: 30)
                
                Text(title)
                    .foregroundColor(.white)
                
                Spacer()
                
                if let value = value {
                    Text(value)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(.gray.opacity(0.5))
            }
            .padding()
            .background(Color(white: 0.1))
            .overlay(
                Rectangle()
                    .fill(Color.gray.opacity(0.1))
                    .frame(height: 0.5),
                alignment: .bottom
            )
        }
    }
}

// Toggle switch component
struct SettingsToggleRow: View {
    let icon: String
    let title: String
    @Binding var isOn: Bool
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.purple)
                .frame(width: 30)
            
            Text(title)
                .foregroundColor(.white)
            
            Spacer()
            
            Toggle("", isOn: $isOn)
                .toggleStyle(SwitchToggleStyle(tint: .purple))
        }
        .padding()
        .background(Color(white: 0.1))
        .overlay(
            Rectangle()
                .fill(Color.gray.opacity(0.1))
                .frame(height: 0.5),
            alignment: .bottom
        )
    }
} 