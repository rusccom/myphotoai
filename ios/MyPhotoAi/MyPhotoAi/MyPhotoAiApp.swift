//
//  MyPhotoAiApp.swift
//  MyPhotoAi
//
//  Created by User on 17.06.2025.
//

import SwiftUI

@main
struct MyPhotoAiApp: App {
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
    @StateObject private var authManager = AuthManager()
    
    var body: some Scene {
        WindowGroup {
            if hasSeenOnboarding {
                MainTabView()
                    .environmentObject(authManager)
                    .preferredColorScheme(.dark)
            } else {
                OnboardingView(hasSeenOnboarding: $hasSeenOnboarding)
                    .preferredColorScheme(.dark)
            }
        }
    }
}
