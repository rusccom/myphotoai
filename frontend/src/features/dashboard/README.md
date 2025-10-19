# Dashboard Feature Module

## 📁 Структура

```
dashboard/
├── hooks/                    # Кастомные хуки
│   ├── useImageHistory.js    # Управление историей изображений
│   └── useFileUpload.js      # Обработка загрузки файлов
│
├── components/               # Компоненты модуля
│   ├── PhotoGallery/         # Галерея изображений
│   │   ├── PhotoGallery.jsx
│   │   ├── ImageCard.jsx
│   │   └── PhotoGallery.module.css
│   │
│   └── ModelPhotoTab/        # Вкладка генерации с моделью
│       ├── ModelPhotoTab.jsx
│       └── ModelPhotoTab.module.css
│
└── README.md                 # Этот файл
```

---

## 🎯 Цель рефакторинга

Разбить монолитный `DashboardPage.js` (1801 строка) на модульные компоненты согласно правилу **5-300-20-3**:
- ≤5 параметров у функции
- ≤300 строк на файл
- ≤20 строк на метод
- ≤3 уровня вложенности

---

## 🔧 Хуки

### `useImageHistory`

**Назначение:** Управление историей генераций с автоматическим polling.

**Возвращаемые значения:**
- `allImages` - объединенный массив pending + completed, отсортированный по дате
- `pendingGenerations` - массив изображений в процессе генерации
- `completedHistory` - массив завершенных изображений
- `isHistoryLoading` - флаг загрузки первой страницы
- `hasMoreHistory` - есть ли еще страницы для загрузки
- `isHistoryLoadingMore` - флаг загрузки дополнительных страниц
- `error` - ошибка загрузки
- `setPendingGenerations` - setter для pending
- `setCompletedHistory` - setter для completed
- `loadHistory()` - перезагрузка истории (первая страница)
- `loadMoreHistory()` - загрузка следующей страницы

**Особенности:**
- Автоматический polling pending генераций каждые 5 секунд
- При изменении статуса изображения из pending → ready/failed, оно перемещается в completedHistory
- Автоматическая загрузка при монтировании
- Объединение и сортировка по created_at (новые первыми)

**Пример использования:**
```jsx
import { useImageHistory } from '../hooks/useImageHistory';

function MyComponent() {
  const {
    allImages,
    isHistoryLoading,
    hasMoreHistory,
    loadMoreHistory,
    setPendingGenerations
  } = useImageHistory();

  // Добавить новую генерацию в pending
  const handleStartGeneration = async () => {
    const response = await startGeneration();
    setPendingGenerations(prev => [...response.images, ...prev]);
  };

  return (
    <div>
      {allImages.map(img => <ImageCard key={img.id} img={img} />)}
      {hasMoreHistory && <button onClick={loadMoreHistory}>Load More</button>}
    </div>
  );
}
```

---

### `useFileUpload`

**Назначение:** Обработка загрузки одного файла с извлечением метаданных.

**Возвращаемые значения:**
- `file` - объект File
- `previewUrl` - Data URL для превью
- `dimensions` - `{ width, height }`
- `aspectRatio` - строка вида "1920:1080"
- `error` - ошибка чтения файла
- `handleFileChange(event, onSuccess)` - обработчик onChange для input
- `reset()` - сброс состояния
- `setError(message)` - установка ошибки

**Пример использования:**
```jsx
import { useFileUpload } from '../hooks/useFileUpload';

function UploadForm() {
  const { 
    file, 
    previewUrl, 
    dimensions, 
    aspectRatio, 
    error, 
    handleFileChange, 
    reset 
  } = useFileUpload();

  const onSuccess = ({ width, height, aspectRatio }) => {
    console.log(`Image loaded: ${width}x${height}, AR: ${aspectRatio}`);
  };

  return (
    <div>
      <input 
        type="file" 
        accept="image/*"
        onChange={(e) => handleFileChange(e, onSuccess)} 
      />
      {previewUrl && <img src={previewUrl} alt="Preview" />}
      {error && <p className="error">{error}</p>}
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

---

### `useMultiFileUpload`

**Назначение:** Обработка загрузки нескольких файлов (до 10 штук).

**Параметры:**
- `maxFiles` - максимальное количество файлов (по умолчанию 10)

**Возвращаемые значения:**
- `files` - массив объектов File
- `previews` - массив Data URLs для превью
- `error` - ошибка валидации
- `handleFilesChange(event)` - обработчик onChange
- `removeFile(index)` - удаление файла по индексу
- `reset()` - сброс состояния
- `setError(message)` - установка ошибки

**Пример использования:**
```jsx
import { useMultiFileUpload } from '../hooks/useFileUpload';

function MultiUploadForm() {
  const { 
    files, 
    previews, 
    error, 
    handleFilesChange, 
    removeFile 
  } = useMultiFileUpload(10);

  return (
    <div>
      <input 
        type="file" 
        multiple
        accept="image/*"
        onChange={handleFilesChange} 
      />
      {error && <p className="error">{error}</p>}
      <div className="previews">
        {previews.map((url, index) => (
          <div key={index}>
            <img src={url} alt={`Preview ${index}`} />
            <button onClick={() => removeFile(index)}>Remove</button>
          </div>
        ))}
      </div>
      <p>Selected: {files.length} files</p>
    </div>
  );
}
```

---

## 🧩 Компоненты

### `PhotoGallery`

**Назначение:** Отображение галереи изображений с действиями.

**Props:**
- `allImages` - массив изображений для отображения
- `isHistoryLoading` - флаг загрузки
- `hasMoreHistory` - есть ли еще страницы
- `isHistoryLoadingMore` - флаг загрузки доп. страниц
- `onLoadMore()` - callback для "Load More"
- `onImageAction(actionType, image, event)` - callback для действий (Try On, Upscale, Video)
- `onOpenModal(imageUrl)` - callback для открытия модального окна

**Внутренние возможности:**
- Download изображения
- Share через Web Share API (с fallback на clipboard)
- Меню действий для каждого изображения
- Состояния: Pending (с таймером), Ready, Failed
- Badges для типа генерации (Model Gen, Text Gen, Upscaled, Try-On)

**Пример использования:**
```jsx
import PhotoGallery from '../components/PhotoGallery/PhotoGallery';
import { useImageHistory } from '../hooks/useImageHistory';

function Dashboard() {
  const {
    allImages,
    isHistoryLoading,
    hasMoreHistory,
    isHistoryLoadingMore,
    loadMoreHistory
  } = useImageHistory();

  const handleImageAction = (actionType, image, event) => {
    if (actionType === 'Upscale') {
      // Navigate to upscale tab with this image
    } else if (actionType === 'Try On') {
      // Navigate to try-on tab
    }
  };

  const handleOpenModal = (imageUrl) => {
    setModalImageUrl(imageUrl);
  };

  return (
    <PhotoGallery
      allImages={allImages}
      isHistoryLoading={isHistoryLoading}
      hasMoreHistory={hasMoreHistory}
      isHistoryLoadingMore={isHistoryLoadingMore}
      onLoadMore={loadMoreHistory}
      onImageAction={handleImageAction}
      onOpenModal={handleOpenModal}
    />
  );
}
```

---

### `ImageCard`

**Назначение:** Отображение одной карточки изображения.

**Props:**
- `img` - объект изображения (GeneratedImage from backend)
- `onOpenModal(imageUrl)` - callback для открытия в модальном окне
- `onAction(actionType, img, event)` - callback для действий
- `actionsMenuOpenForId` - ID изображения с открытым меню
- `setActionsMenuOpenForId(id)` - setter для открытия меню
- `onDownload(imageUrl, imageName, event)` - callback для скачивания
- `onShare(imageUrl, imageName, event)` - callback для шаринга

**Состояния изображения:**
- `Pending` / `Running` - показывается плейсхолдер с таймером
- `Ready` - показывается изображение с действиями
- `Failed` - показывается плейсхолдер с сообщением об ошибке

**Действия:**
1. **Try On** - отправить изображение на примерку одежды
2. **Video** - создать видео (в разработке)
3. **Upscale** - увеличить разрешение
4. **Share** - поделиться через Web Share API
5. **Download** - скачать изображение

---

### `ModelPhotoTab`

**Назначение:** Форма генерации изображений с AI моделью.

**Props:**
- `models` - массив AI моделей пользователя
- `selectedModelId` - ID выбранной модели
- `setSelectedModelId(id)` - setter для выбора модели
- `onSubmit(params)` - callback при отправке формы
- `isSubmitting` - флаг отправки
- `error` - сообщение об ошибке (может быть JSX)
- `costs` - объект с ценами на действия

**Параметры генерации:**
- `prompt` - текстовое описание (обязательно)
- `style` - стиль (Photorealistic, Fashion Magazine, и т.д.)
- `cameraAngle` - ракурс камеры
- `emotion` - эмоция
- `light` - освещение
- `aspectRatio` - соотношение сторон (3:4, 9:16, 1:1, 4:3, 16:9)
- `finetuneStrength` - сила finetune (0-2, slider)
- `num_images` - количество изображений (1-4)

**Валидация:**
- Проверка наличия prompt
- Проверка наличия выбранной модели
- Проверка статуса модели (должна быть ready)

**Особые состояния:**
- Если нет готовых моделей → показывается предложение создать модель
- Если модель не выбрана → показывается подсказка выбрать модель

**Пример использования:**
```jsx
import ModelPhotoTab from '../components/ModelPhotoTab/ModelPhotoTab';
import { startLoraImageGeneration } from '../services/api';

function Dashboard() {
  const { models } = useAuth();
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [costs, setCosts] = useState(null);

  const handleSubmit = async (params) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await startLoraImageGeneration(params);
      // Add to pending generations
      setPendingGenerations(prev => [...response.images, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModelPhotoTab
      models={models}
      selectedModelId={selectedModelId}
      setSelectedModelId={setSelectedModelId}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      error={error}
      costs={costs}
    />
  );
}
```

---

## 📦 Оставшиеся компоненты для создания

Для полного рефакторинга DashboardPage требуется:

1. **NanoBananaTab** (~250 строк)
   - Загрузка до 10 изображений
   - Параметры: prompt, num_images, output_format, sync_mode
   - Интеграция с `useMultiFileUpload`

2. **TextToImageTab** (~150 строк)
   - Базовая text-to-image генерация без модели
   - Параметры: prompt, aspectRatio, num_images

3. **ClothingTryOnTab** (~200 строк)
   - Загрузка изображения модели и одежды
   - Возможность выбора из галереи
   - Интеграция с `useFileUpload`

4. **UpscaleTab** (~180 строк)
   - Загрузка изображения или выбор из галереи
   - Выбор upscale factor (2x, 3x, 4x)
   - Валидация размера (макс. 32MP после апскейла)

5. **LivePhotoTab** (~100 строк)
   - В разработке

6. **ModelManagement** (~200 строк)
   - Список моделей пользователя
   - Выбор активной модели
   - Отображение статуса (training, ready, failed)
   - Предпросмотр модели
   - Кнопка создания новой модели

---

## 🎨 Стили

Все компоненты используют CSS Modules для изоляции стилей.

**Общие переменные CSS:**
- `--primary` - основной цвет (purple)
- `--accent` - акцентный цвет (pink)
- `--light-dark` - темный фон
- `--gray` - серый текст
- `--light` - светлый текст
- `--error` - цвет ошибки
- `--gradient-primary` - градиент primary → accent
- `--radius-sm`, `--radius-md`, `--radius-lg` - радиусы скругления
- `--shadow-sm`, `--shadow-md` - тени

---

## ✅ Соответствие правилам

### Правило 5-300-20-3 ✓

**useImageHistory.js**: 168 строк ✓
- Функции ≤20 строк ✓
- Вложенность ≤3 уровня ✓

**useFileUpload.js**: 149 строк ✓
- 2 экспортируемые функции
- Параметры ≤5 ✓

**PhotoGallery.jsx**: 118 строк ✓
- Функции handleDownloadImage, handleShareImage ≤20 строк ✓

**ImageCard.jsx**: 211 строк ✓
- Простой рендер компонент, вложенность ≤3 ✓

**ModelPhotoTab.jsx**: 193 строки ✓
- Функция handleSubmit: 15 строк ✓
- Все параметры ≤5 ✓

---

## 🚀 Дальнейшие улучшения

1. **Оптимизация производительности:**
   - React.memo для PhotoGallery и ImageCard
   - Виртуализация списка изображений (react-window)
   - Intersection Observer для lazy loading

2. **Code Splitting:**
   - React.lazy для вкладок
   - Динамический импорт компонентов

3. **Тестирование:**
   - Unit-тесты для хуков
   - Component тесты для UI

4. **Типизация:**
   - Миграция на TypeScript
   - Prop types валидация

---

_Создано: 16.10.2025_

