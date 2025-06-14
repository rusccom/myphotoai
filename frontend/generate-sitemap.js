const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');
const path = require('path');

// Определяем список публичных страниц
const links = [
    { url: '/', changefreq: 'daily', priority: 1.0 },
    { url: '/pricing', changefreq: 'monthly', priority: 0.8 },
    { url: '/login', changefreq: 'monthly', priority: 0.5 },
    { url: '/register', changefreq: 'monthly', priority: 0.5 },
];

// Устанавливаем базовый URL вашего сайта
const hostname = 'https://myphotoai.net';

// Путь для сохранения файла sitemap.xml
const dest = path.resolve(__dirname, 'public', 'sitemap.xml');

// Создаем поток для генерации карты сайта
const sitemapStream = new SitemapStream({ hostname });

// Преобразуем поток в Promise, чтобы дождаться его завершения
streamToPromise(sitemapStream)
    .then(sm => {
        // Записываем сгенерированную карту в файл
        const writeStream = createWriteStream(dest);
        writeStream.write(sm);
        writeStream.end();
        console.log(`Sitemap generated successfully at ${dest}`);
    })
    .catch(console.error);

// Добавляем все наши ссылки в поток
links.forEach(link => {
    sitemapStream.write(link);
});

// Завершаем поток
sitemapStream.end(); 