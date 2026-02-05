const { SitemapStream, streamToPromise } = require('sitemap');
const { writeFileSync } = require('fs');
const path = require('path');

// Все публичные страницы для индексации Google
const links = [
    { url: '/', changefreq: 'daily', priority: 1.0 },
    { url: '/login', changefreq: 'monthly', priority: 0.4 },
    { url: '/register', changefreq: 'monthly', priority: 0.5 },
    { url: '/terms-and-privacy', changefreq: 'monthly', priority: 0.3 },
];

const hostname = 'https://myphotoai.net';
const dest = path.resolve(__dirname, 'public', 'sitemap.xml');

async function generateSitemap() {
    try {
        const sitemapStream = new SitemapStream({ hostname });
        
        links.forEach(link => sitemapStream.write(link));
        sitemapStream.end();
        
        const sitemap = await streamToPromise(sitemapStream);
        writeFileSync(dest, sitemap.toString());
        console.log(`✅ Sitemap generated: ${dest}`);
        console.log(`   Pages: ${links.length}`);
    } catch (error) {
        console.error('❌ Sitemap generation failed:', error);
        process.exit(1);
    }
}

generateSitemap(); 