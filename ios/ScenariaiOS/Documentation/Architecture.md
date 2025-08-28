# Архитектура ScenariaiOS

## Обзор архитектуры

ScenariaiOS построен на принципах **Clean Architecture** с использованием паттерна **MVVM** для слоя представления. Проект структурирован таким образом, чтобы обеспечить максимальную тестируемость, масштабируемость и поддерживаемость кода.

## Принципы архитектуры

### 1. Разделение ответственности (Separation of Concerns)
- Каждый слой имеет четко определенную ответственность
- Минимальное связывание между слоями
- Высокая когезия внутри модулей

### 2. Инверсия зависимостей (Dependency Inversion)
- Высокоуровневые модули не зависят от низкоуровневых
- Использование протоколов для абстракции
- Dependency Injection для управления зависимостями

### 3. Модульность (Modularity)
- Функции организованы в отдельные модули
- Каждый модуль может быть разработан и протестирован независимо
- Переиспользование кода между модулями

## Слои архитектуры

```
┌─────────────────────────────────────────────────────┐
│                 Presentation Layer                  │
│              (SwiftUI Views + ViewModels)           │
├─────────────────────────────────────────────────────┤
│                  Business Layer                     │
│              (Use Cases + Domain Models)            │
├─────────────────────────────────────────────────────┤
│                    Data Layer                       │
│              (Repositories + Data Sources)          │
├─────────────────────────────────────────────────────┤
│                     Core Layer                      │
│            (Network + Storage + Utils)              │
└─────────────────────────────────────────────────────┘
```

### Presentation Layer (Слой представления)
- **SwiftUI Views** - Декларативные UI компоненты
- **ViewModels** - Бизнес-логика для представления
- **ObservableObject** - Реактивное управление состоянием

### Business Layer (Бизнес-слой)
- **Use Cases** - Сценарии использования приложения
- **Domain Models** - Бизнес-модели данных
- **Business Rules** - Правила валидации и обработки

### Data Layer (Слой данных)
- **Repositories** - Абстракция доступа к данным
- **Data Sources** - Конкретные источники данных (API, Database, Cache)
- **DTOs** - Объекты передачи данных

### Core Layer (Ядро)
- **Network** - HTTP клиент и сетевая логика
- **Storage** - Локальное хранение (UserDefaults, Keychain, Core Data)
- **Utils** - Вспомогательные утилиты

## Структура модулей

### Feature Module Structure
Каждый функциональный модуль следует единой структуре:

```
FeatureName/
├── Views/                     # SwiftUI представления
│   ├── FeatureView.swift
│   ├── Components/
│   └── Subviews/
├── ViewModels/                # ViewModel для Views
│   └── FeatureViewModel.swift
├── Models/                    # Модели данных для модуля
│   ├── FeatureModel.swift
│   └── FeatureRequest.swift
├── Services/                  # Сервисы модуля
│   ├── FeatureService.swift
│   └── FeatureRepository.swift
└── UseCases/                  # Бизнес-логика (опционально)
    └── FeatureUseCase.swift
```

## Управление состоянием

### State Management Pattern
1. **@StateObject** - Для владения ViewModel в View
2. **@ObservedObject** - Для передачи ViewModel между Views
3. **@EnvironmentObject** - Для глобального состояния
4. **Combine** - Для реактивного программирования

### Data Flow
```
User Action → View → ViewModel → Service → Repository → Data Source
                                    ↓
               View ← ViewModel ← Response Data
```

## Dependency Injection

### Container Pattern
Используется простой DI контейнер для управления зависимостями:

```swift
class DependencyContainer {
    // Синглтоны
    lazy var networkService: NetworkServiceProtocol = NetworkService()
    lazy var storageService: StorageServiceProtocol = StorageService()
    
    // Фабрики
    func makeAuthService() -> AuthServiceProtocol {
        return AuthService(networkService: networkService)
    }
}
```

## Навигация

### Coordinator Pattern
Для управления навигацией используется паттерн Coordinator:

```swift
class AppCoordinator: ObservableObject {
    @Published var currentView: AppView = .onboarding
    
    func navigateTo(_ view: AppView) {
        currentView = view
    }
}
```

## Тестирование

### Test Pyramid
1. **Unit Tests** - Тестирование ViewModels, Services, Utils
2. **Integration Tests** - Тестирование взаимодействия между слоями
3. **UI Tests** - End-to-end тестирование пользовательских сценариев

### Mock Objects
Для тестирования используются протоколы и mock объекты:

```swift
protocol AuthServiceProtocol {
    func login(email: String, password: String) async throws -> User
}

class MockAuthService: AuthServiceProtocol {
    var shouldSucceed = true
    
    func login(email: String, password: String) async throws -> User {
        if shouldSucceed {
            return User(id: "1", email: email)
        } else {
            throw AuthError.invalidCredentials
        }
    }
}
```

## Соглашения по коду

### Naming Conventions
- **Types**: PascalCase (UserModel, AuthService)
- **Variables/Functions**: camelCase (userName, authenticateUser)
- **Constants**: UPPER_SNAKE_CASE (API_BASE_URL)
- **Protocols**: Suffix "Protocol" (NetworkServiceProtocol)

### File Organization
- Один публичный тип на файл
- Группировка связанных extension'ов
- Алфавитный порядок import'ов

### Code Style
- Максимум 120 символов в строке
- Использование guard для early return
- Предпочтение immutable структур
- Explicit typing для публичных API

## Производительность

### Оптимизации
1. **Lazy Loading** - Загрузка данных по требованию
2. **Image Caching** - Кэширование изображений с Kingfisher
3. **Background Processing** - Тяжелые операции в фоне
4. **Memory Management** - Правильное управление памятью

### Мониторинг
- Instruments для профилирования
- Memory Graph для поиска утечек
- Time Profiler для оптимизации CPU

## Безопасность

### Data Protection
1. **Keychain** - Хранение чувствительных данных
2. **Biometric Authentication** - Face ID/Touch ID
3. **SSL Pinning** - Защита от MITM атак
4. **Data Encryption** - Шифрование локальных данных

### Code Obfuscation
- Минификация релизных сборок
- Обфускация критических строк
- Удаление debug информации
