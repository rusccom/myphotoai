import Foundation

@MainActor
class AuthViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var email: String = ""
    @Published var password: String = ""
    @Published var name: String = ""
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var currentUser: User?
    @Published var isAuthenticated: Bool = false
    
    // MARK: - Private Properties
    private let authService: AuthServiceProtocol
    
    // MARK: - Initialization
    init(authService: AuthServiceProtocol) {
        self.authService = authService
        checkAuthenticationStatus()
    }
    
    // MARK: - Public Methods
    func login() {
        guard validateLoginInput() else { return }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let user = try await authService.login(email: email, password: password)
                await MainActor.run {
                    self.currentUser = user
                    self.isAuthenticated = true
                    self.isLoading = false
                    self.clearForm()
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    func register() {
        guard validateRegisterInput() else { return }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let user = try await authService.register(email: email, password: password, name: name)
                await MainActor.run {
                    self.currentUser = user
                    self.isAuthenticated = true
                    self.isLoading = false
                    self.clearForm()
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    func logout() {
        isLoading = true
        
        Task {
            do {
                try await authService.logout()
                await MainActor.run {
                    self.currentUser = nil
                    self.isAuthenticated = false
                    self.isLoading = false
                    self.clearForm()
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    func clearError() {
        errorMessage = nil
    }
    
    // MARK: - Private Methods
    private func validateLoginInput() -> Bool {
        guard !email.isEmpty else {
            errorMessage = "Введите email"
            return false
        }
        
        guard !password.isEmpty else {
            errorMessage = "Введите пароль"
            return false
        }
        
        guard isValidEmail(email) else {
            errorMessage = "Введите корректный email"
            return false
        }
        
        return true
    }
    
    private func validateRegisterInput() -> Bool {
        guard !name.isEmpty else {
            errorMessage = "Введите имя"
            return false
        }
        
        guard !email.isEmpty else {
            errorMessage = "Введите email"
            return false
        }
        
        guard !password.isEmpty else {
            errorMessage = "Введите пароль"
            return false
        }
        
        guard isValidEmail(email) else {
            errorMessage = "Введите корректный email"
            return false
        }
        
        guard password.count >= 6 else {
            errorMessage = "Пароль должен содержать минимум 6 символов"
            return false
        }
        
        return true
    }
    
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format:"SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    private func clearForm() {
        email = ""
        password = ""
        name = ""
    }
    
    private func checkAuthenticationStatus() {
        Task {
            do {
                if let user = try await authService.getCurrentUser() {
                    await MainActor.run {
                        self.currentUser = user
                        self.isAuthenticated = true
                    }
                }
            } catch {
                // User not authenticated or token expired
                await MainActor.run {
                    self.isAuthenticated = false
                }
            }
        }
    }
}
