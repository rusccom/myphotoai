import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    
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
                    VStack(spacing: 25) {
                        // Avatar and name
                        VStack(spacing: 15) {
                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 80))
                                .foregroundColor(.purple)
                                .shadow(color: .purple.opacity(0.5), radius: 20, x: 0, y: 10)
                            
                            if let user = authManager.user {
                                Text(user.name)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                                
                                Text(user.email)
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                        .padding(.top, 30)
                        
                        // Balance
                        VStack(spacing: 10) {
                            Text("Your Balance")
                                .font(.caption)
                                .foregroundColor(.gray)
                            
                            HStack(alignment: .firstTextBaseline, spacing: 5) {
                                Image(systemName: "bolt.fill")
                                    .font(.title)
                                    .foregroundColor(.purple)
                                
                                Text("\(authManager.user?.balance_points ?? 0)")
                                    .font(.largeTitle)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            }
                            
                            Button(action: {
                                // Navigate to add credits
                            }) {
                                Text("Add Credits")
                                    .font(.caption)
                                    .foregroundColor(.purple)
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 8)
                                    .background(Color.purple.opacity(0.2))
                                    .cornerRadius(15)
                            }
                        }
                        .padding()
                        .background(Color(white: 0.1))
                        .cornerRadius(20)
                        .padding(.horizontal)
                        
                        // Logout button
                        Button(action: {
                            authManager.logout()
                        }) {
                            HStack {
                                Image(systemName: "arrow.right.square")
                                Text("Sign Out")
                            }
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red.opacity(0.2))
                            .cornerRadius(15)
                        }
                        .padding(.horizontal)
                        
                        Spacer(minLength: 100)
                    }
                }
            }
            .navigationBarHidden(true)
        }
    }
} 