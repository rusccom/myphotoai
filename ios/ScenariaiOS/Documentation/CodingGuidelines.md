# Руководство по кодированию ScenariaiOS

## Общие принципы

### Правило 5-300-20-3
- **≤ 5 параметров** у функции
- **≤ 300 строк** на файл
- **≤ 20 строк** на метод
- **≤ 3 уровня вложенности**

### Один класс/компонент — один файл
Каждый класс, структура или SwiftUI View должны находиться в отдельном файле.

## Структура файла

### Порядок элементов в файле:
1. Import statements (в алфавитном порядке)
2. Type definition
3. Properties (в порядке: static, public, internal, private)
4. Initializers
5. Public methods
6. Internal methods  
7. Private methods
8. Extensions (каждый протокол в отдельном extension)

```swift
import Foundation
import SwiftUI
import Combine

struct LoginView: View {
    // MARK: - Properties
    @StateObject private var viewModel: LoginViewModel
    @State private var email: String = ""
    @State private var password: String = ""
    
    // MARK: - Initialization
    init(viewModel: LoginViewModel) {
        self._viewModel = StateObject(wrappedValue: viewModel)
    }
    
    // MARK: - Body
    var body: some View {
        // View implementation
    }
    
    // MARK: - Private Methods
    private func validateInput() -> Bool {
        // Validation logic
    }
}

// MARK: - LoginView + Helpers
private extension LoginView {
    // Helper methods
}
```

## Соглашения по именованию

### Types (Типы)
- **PascalCase** для классов, структур, протоколов, энумов
- Описательные имена, избегать сокращений

```swift
// ✅ Хорошо
struct UserProfile { }
class NetworkManager { }
protocol AuthenticationService { }
enum APIError { }

// ❌ Плохо
struct UsrProf { }
class NetMgr { }
protocol AuthSvc { }
enum APIErr { }
```

### Variables & Functions (Переменные и функции)
- **camelCase** для переменных, функций, методов
- Глаголы для функций, существительные для переменных

```swift
// ✅ Хорошо
var userName: String
func authenticateUser() { }
func fetchUserProfile(for userID: String) { }

// ❌ Плохо
var user_name: String
func authenticate() { }  // не ясно что аутентифицируется
func fetch(userID: String) { }  // не ясно что фетчим
```

### Constants (Константы)
- **UPPER_SNAKE_CASE** для глобальных констант
- **lowerCamelCase** для локальных констант

```swift
// ✅ Глобальные константы
let API_BASE_URL = "https://api.scenaria.app"
let MAX_IMAGE_SIZE = 1024

// ✅ Локальные константы
let defaultTimeout = 30.0
let buttonCornerRadius = 8.0
```

### Protocols (Протоколы)
- Суффикс "Protocol" для протоколов сервисов
- Суффикс "Delegate" для делегатов
- Суффикс "DataSource" для источников данных

```swift
protocol NetworkServiceProtocol { }
protocol ImagePickerDelegate { }
protocol UserDataSource { }
```

## SwiftUI Guidelines

### View Structure
```swift
struct ContentView: View {
    // MARK: - Properties
    @StateObject private var viewModel: ContentViewModel
    @State private var isLoading = false
    
    // MARK: - Body
    var body: some View {
        VStack {
            headerView
            contentView
            footerView
        }
        .onAppear {
            viewModel.loadData()
        }
    }
}

// MARK: - Subviews
private extension ContentView {
    var headerView: some View {
        Text("Header")
            .font(.largeTitle)
            .foregroundColor(.primary)
    }
    
    var contentView: some View {
        ScrollView {
            LazyVStack {
                ForEach(viewModel.items) { item in
                    ItemRow(item: item)
                }
            }
        }
    }
    
    var footerView: some View {
        Button("Load More") {
            viewModel.loadMore()
        }
        .buttonStyle(PrimaryButtonStyle())
    }
}
```

### State Management
- Используйте `@State` для локального состояния View
- Используйте `@StateObject` для создания ViewModel
- Используйте `@ObservedObject` для передачи ViewModel
- Используйте `@EnvironmentObject` для глобального состояния

```swift
struct ParentView: View {
    @StateObject private var viewModel = ParentViewModel()
    
    var body: some View {
        ChildView(viewModel: viewModel.childViewModel)
    }
}

struct ChildView: View {
    @ObservedObject var viewModel: ChildViewModel
    @State private var isExpanded = false
    
    var body: some View {
        // View implementation
    }
}
```

## MVVM Pattern

### ViewModel Guidelines
```swift
@MainActor
class LoginViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var email: String = ""
    @Published var password: String = ""
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    // MARK: - Private Properties
    private let authService: AuthServiceProtocol
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    init(authService: AuthServiceProtocol) {
        self.authService = authService
    }
    
    // MARK: - Public Methods
    func login() {
        guard validateInput() else { return }
        
        isLoading = true
        
        Task {
            do {
                let user = try await authService.login(email: email, password: password)
                // Handle success
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
    
    // MARK: - Private Methods
    private func validateInput() -> Bool {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please fill all fields"
            return false
        }
        return true
    }
}
```

## Error Handling

### Error Types
```swift
enum NetworkError: LocalizedError {
    case noInternet
    case invalidURL
    case serverError(Int)
    case decodingError
    
    var errorDescription: String? {
        switch self {
        case .noInternet:
            return "No internet connection"
        case .invalidURL:
            return "Invalid URL"
        case .serverError(let code):
            return "Server error: \(code)"
        case .decodingError:
            return "Failed to decode response"
        }
    }
}
```

### Error Handling in ViewModels
```swift
func performAsyncOperation() {
    Task {
        do {
            let result = try await someAsyncOperation()
            handleSuccess(result)
        } catch let networkError as NetworkError {
            handleNetworkError(networkError)
        } catch {
            handleGenericError(error)
        }
    }
}
```

## Async/Await Guidelines

### Preferred Async Patterns
```swift
// ✅ Хорошо
func fetchUserData() async throws -> UserData {
    let response = try await networkService.request(endpoint: .user)
    return try JSONDecoder().decode(UserData.self, from: response)
}

// ✅ Вызов в ViewModel
func loadUserData() {
    Task {
        do {
            userData = try await dataService.fetchUserData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
```

## Memory Management

### Avoiding Retain Cycles
```swift
// ✅ Используйте weak self в closures
someService.performOperation { [weak self] result in
    self?.handleResult(result)
}

// ✅ Используйте unowned для guaranteed lifetime
timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [unowned self] _ in
    self.updateTime()
}
```

### Cancellables Management
```swift
class ViewModel: ObservableObject {
    private var cancellables = Set<AnyCancellable>()
    
    func subscribeToUpdates() {
        dataService.publisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] data in
                self?.handleData(data)
            }
            .store(in: &cancellables)
    }
}
```

## Testing Guidelines

### Unit Test Structure
```swift
final class LoginViewModelTests: XCTestCase {
    private var sut: LoginViewModel!
    private var mockAuthService: MockAuthService!
    
    override func setUp() {
        super.setUp()
        mockAuthService = MockAuthService()
        sut = LoginViewModel(authService: mockAuthService)
    }
    
    override func tearDown() {
        sut = nil
        mockAuthService = nil
        super.tearDown()
    }
    
    func test_login_withValidCredentials_shouldSucceed() {
        // Given
        sut.email = "test@example.com"
        sut.password = "password123"
        mockAuthService.shouldSucceed = true
        
        // When
        sut.login()
        
        // Then
        XCTAssertTrue(mockAuthService.loginCalled)
        XCTAssertNil(sut.errorMessage)
    }
}
```

## Performance Guidelines

### View Optimization
```swift
// ✅ Используйте LazyVStack для больших списков
LazyVStack {
    ForEach(items) { item in
        ItemView(item: item)
    }
}

// ✅ Используйте .id() для принудительного обновления
Text(userData.name)
    .id(userData.id)

// ✅ Минимизируйте вычисления в body
var expensiveComputedProperty: String {
    // Кэшируйте результат если возможно
    if let cached = cachedValue {
        return cached
    }
    let result = performExpensiveComputation()
    cachedValue = result
    return result
}
```

## Security Guidelines

### Sensitive Data
```swift
// ✅ Используйте Keychain для токенов
class SecurityService {
    private let keychain = Keychain(service: "com.scenaria.ios")
    
    func storeToken(_ token: String) {
        keychain["auth_token"] = token
    }
    
    func getToken() -> String? {
        return keychain["auth_token"]
    }
}

// ❌ Не храните в UserDefaults
UserDefaults.standard.set(token, forKey: "auth_token") // Небезопасно!
```

## Documentation

### Code Comments
```swift
/// Authenticates user with email and password
/// - Parameters:
///   - email: User's email address
///   - password: User's password
/// - Returns: Authenticated user object
/// - Throws: AuthenticationError if credentials are invalid
func authenticate(email: String, password: String) async throws -> User {
    // Implementation
}
```

### MARK Comments
Используйте MARK для разделения кода:

```swift
// MARK: - Properties
// MARK: - Initialization  
// MARK: - View Lifecycle
// MARK: - Public Methods
// MARK: - Private Methods
// MARK: - Actions
```
