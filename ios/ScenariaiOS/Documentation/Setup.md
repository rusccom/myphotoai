# Настройка проекта ScenariaiOS

## 🚀 Быстрый старт

### Создание Xcode проекта

1. **Откройте Xcode**
2. **Создайте новый проект:**
   - File → New → Project
   - Выберите iOS → App
   - Нажмите Next

3. **Настройте проект:**
   - Product Name: `ScenariaiOS`
   - Interface: `SwiftUI`
   - Language: `Swift`
   - Bundle Identifier: `com.scenaria.ios` (или ваш)
   - Организация: Ваше имя/компания
   - Нажмите Next

4. **Выберите папку:**
   - Перейдите в папку `ios/ScenariaiOS`
   - Создайте проект

### Настройка структуры проекта

После создания проекта нужно настроить структуру файлов:

1. **Удалите стандартные файлы:**
   - Удалите `ContentView.swift` (мы создали свой)
   - Удалите стандартный `App.swift` файл

2. **Добавьте наши файлы в проект:**
   - Перетащите папку `Source` в проект Xcode
   - Выберите "Create groups" и "Add to target"
   - Убедитесь, что все `.swift` файлы добавлены

3. **Настройте Info.plist:**
   - Используйте наш файл `Configuration/Info/Info.plist`
   - В Target Settings → Info → Custom iOS Target Properties
   - Настройте согласно нашему Info.plist

4. **Добавьте зависимости:**
   - File → Add Package Dependencies
   - Добавьте пакеты из `Package.swift`:
     - `https://github.com/Alamofire/Alamofire.git`
     - `https://github.com/onevcat/Kingfisher.git`
     - `https://github.com/kishikawakatsumi/KeychainAccess.git`

### Настройка конфигураций

1. **Добавьте xcconfig файлы:**
   - В Project Navigator создайте группу "Configuration"
   - Добавьте `Development.xcconfig` и `Production.xcconfig`
   - В Project Settings → Configurations назначьте файлы

2. **Настройте Build Settings:**
   - В Target Settings → Build Settings
   - Найдите "User-Defined" и добавьте настройки из xcconfig

### Настройка ресурсов

1. **Добавьте Assets:**
   - Замените стандартный Assets.xcassets на наш из `Resources/Assets`
   - Добавьте иконки приложения

2. **Добавьте шрифты и звуки:**
   - Добавьте содержимое папок `Resources/Fonts` и `Resources/Sounds`
   - Не забудьте добавить их в Target Membership

## 🛠️ Альтернативный способ (Swift Package)

Если не хотите создавать Xcode проект вручную, можно использовать Swift Package:

### 1. Создание с помощью Swift Package Manager

```bash
cd ios/ScenariaiOS
swift package init --type executable
```

### 2. Замените созданный Package.swift на наш

### 3. Создайте исполняемый файл для просмотра

```bash
swift run
```

## 📱 Запуск на симуляторе

1. **Выберите симулятор:**
   - iPhone 15 Pro (или новее)
   - iOS 16.0+

2. **Настройте схему сборки:**
   - Product → Scheme → Edit Scheme
   - Выберите Debug для разработки

3. **Запустите проект:**
   - Cmd+R или кнопка ▶️ в Xcode

## 🔧 Настройка API

### Локальный сервер (разработка)

1. **Запустите backend:**
```bash
cd ../../backend
python app.py
```

2. **Проверьте настройки в DependencyContainer.swift:**
```swift
static let apiBaseURL = "http://localhost:5001"
```

### Продакшн сервер

1. **Измените URL в Configuration:**
```swift
static let apiBaseURL = "https://api.scenaria.app"
```

## 🧪 Запуск тестов

### Unit Tests
```bash
cmd+u
```

### UI Tests
```bash
cmd+shift+u
```

## 🚨 Возможные проблемы

### 1. Ошибки компиляции
- Убедитесь, что все зависимости добавлены
- Проверьте Bundle Identifier
- Убедитесь, что все файлы добавлены в Target

### 2. Сетевые ошибки
- Для localhost на симуляторе добавьте в Info.plist:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

### 3. Проблемы с Keychain
- Keychain работает только на физическом устройстве или симуляторе
- Для тестирования используйте UserDefaults

## 📝 Следующие шаги

После успешного запуска:

1. **Настройте аутентификацию:**
   - Проверьте работу AuthService
   - Настройте токены в Keychain

2. **Подключите API:**
   - Убедитесь, что backend запущен
   - Проверьте все endpoints

3. **Добавьте данные:**
   - Создайте тестового пользователя
   - Загрузите тестовые модели

4. **Протестируйте функции:**
   - Авторизация
   - Создание моделей
   - Генерация изображений

## 🎯 Готовый результат

После настройки вы получите:
- ✅ Работающее iOS приложение
- ✅ Современный UI с темной темой
- ✅ Навигацию между экранами
- ✅ Интеграцию с API
- ✅ Архитектуру для дальнейшего развития

Удачи с запуском! 🚀
