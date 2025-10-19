## Описание разметки (HTML) и стилей (CSS) для главной страницы

Этот документ описывает, как воссоздать главную страницу по макету `templateHome.png`: семантическую HTML-структуру, правила именования классов, сетку, отступы, адаптивность и ключевые компоненты. Текст рассчитан на использование в текущем проекте (React + CSS Modules), но при необходимости может быть применён и к чистому HTML/CSS.

### Цели
- **Семантика**: понятные теги `header`, `main`, `section`, `footer`.
- **Модульность**: блоки легко переиспользуются в React-компонентах.
- **Адаптивность**: корректная работа на мобильных, планшетах и десктопах.
- **Доступность**: aria-атрибуты, фокусируемость, правильные заголовки.

---

## Семантический скелет страницы

```html
<header class="header" role="banner">
  <nav class="header__nav" aria-label="Основная навигация">
    <a class="header__logo" href="/" aria-label="На главную">MyPhotoAI</a>
    <button class="header__menuButton" aria-expanded="false" aria-controls="primary-menu">Меню</button>
    <ul id="primary-menu" class="header__menu">
      <li><a href="#features">Возможности</a></li>
      <li><a href="#examples">Примеры</a></li>
      <li><a href="#pricing">Цены</a></li>
      <li><a href="#faq">FAQ</a></li>
    </ul>
    <div class="header__actions">
      <a class="button button--ghost" href="/login">Войти</a>
      <a class="button button--primary" href="/register">Начать</a>
    </div>
  </nav>
 </header>

<main id="main" class="main" tabindex="-1">
  <section class="hero" aria-labelledby="hero-title">
    <div class="container hero__container">
      <div class="hero__content">
        <h1 id="hero-title" class="hero__title">Создавайте AI-фото за минуты</h1>
        <p class="hero__subtitle">Загрузите фото — получите стильные результаты без навыков дизайна.</p>
        <div class="hero__cta">
          <a class="button button--primary" href="/create">Создать модель</a>
          <a class="button button--secondary" href="#examples">Смотреть примеры</a>
        </div>
      </div>
      <div class="hero__visual" role="img" aria-label="Превью результата AI">
        <!-- Картинка/коллаж/слайдер -->
      </div>
    </div>
  </section>

  <section id="features" class="section features" aria-labelledby="features-title">
    <div class="container">
      <h2 id="features-title" class="section__title">Почему это удобно</h2>
      <ul class="features__grid">
        <li class="featureCard">
          <div class="featureCard__icon" aria-hidden="true"></div>
          <h3 class="featureCard__title">Быстро</h3>
          <p class="featureCard__text">Готовые изображения за пару минут.</p>
        </li>
        <li class="featureCard">...</li>
        <li class="featureCard">...</li>
      </ul>
    </div>
  </section>

  <section id="how" class="section steps" aria-labelledby="steps-title">
    <div class="container">
      <h2 id="steps-title" class="section__title">Как это работает</h2>
      <ol class="steps__list">
        <li class="step">Загрузите фото</li>
        <li class="step">Выберите стиль</li>
        <li class="step">Получите результат</li>
      </ol>
    </div>
  </section>

  <section id="examples" class="section gallery" aria-labelledby="gallery-title">
    <div class="container">
      <h2 id="gallery-title" class="section__title">Примеры</h2>
      <div class="gallery__grid">
        <!-- Карточки/изображения -->
      </div>
    </div>
  </section>

  <section id="pricing" class="section pricing" aria-labelledby="pricing-title">
    <div class="container">
      <h2 id="pricing-title" class="section__title">Тарифы</h2>
      <div class="pricing__cards">
        <!-- Карточки тарифов -->
      </div>
    </div>
  </section>

  <section id="faq" class="section faq" aria-labelledby="faq-title">
    <div class="container">
      <h2 id="faq-title" class="section__title">Частые вопросы</h2>
      <div class="faq__list">
        <!-- Аккордеон/список вопросов -->
      </div>
    </div>
  </section>
 </main>

<footer class="footer" role="contentinfo">
  <div class="container footer__container">
    <div class="footer__brand">MyPhotoAI</div>
    <nav class="footer__nav" aria-label="Ссылки футера">
      <a href="/privacy">Политика</a>
      <a href="/terms">Условия</a>
      <a href="/contact">Контакты</a>
    </nav>
    <div class="footer__copy">© 2025</div>
  </div>
 </footer>
```

---

## CSS-архитектура и соглашения

- **Методология**: БЭМ-подобные классы (`block`, `block__element`, `block--modifier`). В CSS Modules это удобно группировать по файлам.
- **Переменные**: используем CSS-переменные, чтобы централизованно управлять темами и отступами.
- **Контейнер**: ограничивает ширину контента, выравнивает по центру.
- **Сетка**: CSS Grid/Flex для карточек и секций.
- **Типографика**: явная иерархия заголовков, единая шкала размеров.
- **Отступы**: консистентная шкала spacing.
- **Медиа-запросы**: ключевые брейкпоинты под мобильные/планшеты/десктоп.

### Базовые токены и утилиты

```css
:root {
  --color-bg: #0b0f1a;
  --color-surface: #121827;
  --color-text: #e5e7eb;
  --color-muted: #9ca3af;
  --color-primary: #6d28d9;
  --color-primary-contrast: #ffffff;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  --shadow-sm: 0 1px 2px rgba(0,0,0,.12);
  --shadow-md: 0 4px 16px rgba(0,0,0,.25);
  --shadow-lg: 0 12px 32px rgba(0,0,0,.35);

  --container-max: 1120px;
  --container-pad: 16px;

  --font-sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}

html { box-sizing: border-box; }
*, *::before, *::after { box-sizing: inherit; }
body {
  margin: 0;
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
}

.container {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
}

.section { padding-block: var(--space-16); }
.section__title { margin: 0 0 var(--space-8); font-size: 32px; }

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: 12px 20px;
  border-radius: var(--radius-md);
  text-decoration: none;
  font-weight: 600;
  transition: transform .06s ease, box-shadow .2s ease;
}
.button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.button--primary {
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  box-shadow: var(--shadow-md);
}
.button--secondary { background: var(--color-surface); color: var(--color-text); }
.button--ghost { background: transparent; color: var(--color-text); border: 1px solid rgba(255,255,255,.15); }
.button:hover { transform: translateY(-1px); }
```

### Header/Nav

```css
.header { position: sticky; top: 0; background: rgba(11,15,26,.8); backdrop-filter: blur(8px); z-index: 50; }
.header__nav { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-4) 0; }
.header__logo { font-weight: 800; color: var(--color-text); text-decoration: none; }
.header__menu { display: none; list-style: none; gap: var(--space-6); padding: 0; margin: 0; }
.header__actions { display: none; gap: var(--space-3); }
.header__menuButton { display: inline-flex; }

@media (min-width: 768px) {
  .header__menu { display: flex; }
  .header__actions { display: inline-flex; }
  .header__menuButton { display: none; }
}
```

### Hero

```css
.hero { padding-block: 96px; background: radial-gradient(1200px 600px at 50% -10%, rgba(109,40,217,.25), transparent); }
.hero__container { display: grid; grid-template-columns: 1fr; gap: var(--space-8); align-items: center; }
.hero__title { font-size: clamp(32px, 6vw, 56px); margin: 0 0 var(--space-4); line-height: 1.05; }
.hero__subtitle { margin: 0 0 var(--space-6); color: var(--color-muted); font-size: 18px; }
.hero__cta { display: flex; flex-wrap: wrap; gap: var(--space-3); }
.hero__visual { min-height: 280px; background: var(--color-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); }

@media (min-width: 960px) {
  .hero__container { grid-template-columns: 1.1fr 0.9fr; }
}
```

### Сетка «Возможности», «Галерея», «Тарифы»

```css
.features__grid, .gallery__grid, .pricing__cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
}

@media (min-width: 640px) {
  .features__grid, .gallery__grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 960px) {
  .features__grid { grid-template-columns: repeat(3, 1fr); }
  .gallery__grid { grid-template-columns: repeat(3, 1fr); }
  .pricing__cards { grid-template-columns: repeat(3, 1fr); }
}

.featureCard, .priceCard, .gallery__item {
  background: var(--color-surface);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--space-6);
}
.featureCard__title { margin: 0 0 var(--space-2); font-size: 18px; }
.featureCard__text { margin: 0; color: var(--color-muted); }
```

### Шаги (How it works)

```css
.steps__list { display: grid; grid-template-columns: 1fr; gap: var(--space-6); counter-reset: step; }
.step { position: relative; padding-left: 48px; min-height: 40px; }
.step::before {
  counter-increment: step;
  content: counter(step);
  position: absolute; left: 0; top: 0;
  width: 36px; height: 36px; border-radius: 999px;
  background: var(--color-primary); color: var(--color-primary-contrast);
  display: inline-flex; align-items: center; justify-content: center; font-weight: 700;
}

@media (min-width: 768px) { .steps__list { grid-template-columns: repeat(3, 1fr); } }
```

### Футер

```css
.footer { border-top: 1px solid rgba(255,255,255,.08); padding-block: var(--space-8); background: #0a0e18; }
.footer__container { display: grid; gap: var(--space-6); grid-template-columns: 1fr; align-items: center; }
.footer__nav { display: flex; flex-wrap: wrap; gap: var(--space-4); }
@media (min-width: 768px) { .footer__container { grid-template-columns: 1fr auto auto; } }
```

---

## Адаптивность и брейкпоинты

- **Мобильный first**: базовые стили для ширины < 640px.
- **Брейкпоинты**: 640px (sm), 768px (md), 960px (lg), 1200px (xl).
- **Сетка**: увеличивать число колонок на `sm/md/lg`.
- **Типографика**: использовать `clamp()` для заголовков.
- **Навигация**: на мобиле бургер-кнопка, на десктопе горизонтальное меню.

---

## Доступность (a11y)

- Правильная иерархия заголовков: один `h1` на страницу, далее `h2/h3`.
- Управляемый фокус для меню и модалок, `:focus-visible` стили.
- `aria-label`/`aria-controls`/`aria-expanded` для кнопок раскрытия.
- Контраст текста не ниже 4.5:1, крупного — 3:1.
- Изображения с `alt`; декоративные — `aria-hidden="true"`.

---

## Производительность

- Изображения: `loading="lazy"`, современные форматы (WebP/AVIF), корректные `width/height`.
- Критический CSS: минимизировать блокирующие стили, остальное — отложенно.
- Шрифты: `font-display: swap`, системные стеки где возможно.

---

## Встраивание в текущий проект (React)

- Файлы уже существуют: `src/pages/HomePage.js`, `src/pages/HomePage.module.css`.
- Рекомендуется декомпозировать на компоненты c CSS Modules:
  - `components/Navbar.js` — использовать для `header`.
  - `components/Footer.js` — использовать для `footer`.
  - Создать компоненты: `Hero.jsx`, `Features.jsx`, `Steps.jsx`, `Gallery.jsx`, `Pricing.jsx`, `Faq.jsx` и их `.module.css`.
- Именование классов в CSS Modules можно оставлять как в примерах (БЭМ), они будут локальными.

---

## Быстрый старт: пример файловой структуры

```
src/
  pages/
    HomePage.js
    HomePage.module.css
  components/
    Hero.jsx
    Hero.module.css
    Features.jsx
    Features.module.css
    Steps.jsx
    Steps.module.css
    Gallery.jsx
    Gallery.module.css
    Pricing.jsx
    Pricing.module.css
    Faq.jsx
    Faq.module.css
```

---

## Подсказки по стилю

- **Не более 3 уровней вложенности селекторов**; избегать каскада глубже.
- **Короткие компоненты**: один компонент — одна задача, файл до 300 строк.
- **Осмысленные имена**: `hero__title`, `featureCard__title`, `priceCard__cta` и т.п.
- **Консистентные отступы**: используйте переменные `--space-*`.

---

## Пример: минимальный CSS для HomePage.module.css

```css
@import url("/fonts.css"); /* если используются кастомные шрифты */

.page { display: block; }
.srOnly { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); border: 0; padding: 0; }

/* Импортируйте или продублируйте базовые токены и блоки из секций выше */
```

---

## Чек-лист соответствия макету `templateHome.png`

- Заголовок `h1` совпадает по размеру и межстрочному интервалу.
- Кнопки CTA заметны, имеют состояние наведения и фокуса.
- Сетки «Возможности/Галерея/Тарифы» корректно перестраиваются на `sm/md/lg`.
- Футер содержит навигацию и копирайт, сетка не ломается на мобильных.
- Контраст и размеры кликабельных элементов соответствуют рекомендациям a11y.

---

Если потребуется, можно расширить документ разделами для анимаций, темизации (light/dark), локализации и доп. компонентов.


