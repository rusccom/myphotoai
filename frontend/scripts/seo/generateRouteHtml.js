const { mkdirSync, readFileSync, writeFileSync } = require('fs');
const path = require('path');
const homeSeo = require('../../src/features/seo/config/homeSeo.json');

const BUILD_DIR = path.resolve(__dirname, '..', '..', 'build');
const INDEX_PATH = path.join(BUILD_DIR, 'index.html');
const HOME_PAGE = homeSeo.home;
const SITE_NAME = homeSeo.siteName;
const SITE_URL = homeSeo.siteUrl;
const DEFAULT_IMAGE = homeSeo.defaultImage;
const NOINDEX_ROUTES = [
    '/login',
    '/register',
    '/terms-and-privacy',
    '/payment/success',
    '/payment/cancel',
    '/dashboard',
    '/create-model',
    '/account',
    '/billing',
    '/admin',
    '/pricing'
];
const NOINDEX_PAGE = { noindex: true };

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeScript(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

function createFullTitle(title) {
    return `${title} | ${SITE_NAME}`;
}

function createAbsoluteUrl(pagePath) {
    return pagePath === '/' ? SITE_URL : `${SITE_URL}${pagePath}`;
}

function hasText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function buildSchemaTags(schemaList) {
    if (!schemaList || schemaList.length === 0) {
        return [];
    }

    return schemaList.map((item) => (
        `    <script type="application/ld+json" data-static-schema="true">${escapeScript(item)}</script>`
    ));
}

function buildNoindexLines() {
    return [
        '    <meta name="robots" content="noindex, nofollow" />',
        '    <meta name="googlebot" content="noindex, nofollow" />'
    ];
}

function buildIndexableLines(page, fullTitle) {
    const pageUrl = createAbsoluteUrl(page.path);
    return [
        '    <meta name="robots" content="index, follow" />',
        `    <link rel="canonical" href="${pageUrl}" />`,
        '    <meta property="og:type" content="website" />',
        `    <meta property="og:url" content="${pageUrl}" />`,
        `    <meta property="og:title" content="${escapeHtml(fullTitle)}" />`,
        `    <meta property="og:description" content="${escapeHtml(page.description)}" />`,
        `    <meta property="og:image" content="${page.image || DEFAULT_IMAGE}" />`,
        `    <meta property="og:site_name" content="${SITE_NAME}" />`,
        '    <meta name="twitter:card" content="summary_large_image" />',
        `    <meta name="twitter:url" content="${pageUrl}" />`,
        `    <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`,
        `    <meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
        `    <meta name="twitter:image" content="${page.image || DEFAULT_IMAGE}" />`
    ];
}

function buildStaticSeoLines(page) {
    const lines = ['    <!-- STATIC_SEO_START -->'];
    const hasTitle = hasText(page.title);
    const hasDescription = hasText(page.description);

    if (hasTitle) {
        lines.push(`    <title>${escapeHtml(createFullTitle(page.title))}</title>`);
    }

    if (hasDescription) {
        lines.push(`    <meta name="description" content="${escapeHtml(page.description)}" />`);
    }

    if (page.noindex === true) {
        lines.push(...buildNoindexLines());
    }

    if (page.noindex !== true && page.path && hasTitle && hasDescription) {
        lines.push(...buildIndexableLines(page, createFullTitle(page.title)));
    }

    lines.push(...buildSchemaTags(page.schema || []));
    lines.push('    <!-- STATIC_SEO_END -->');
    return lines.join('\n');
}

function insertBeforeHeadEnd(html, content) {
    return html.includes('</head>')
        ? html.replace('</head>', `${content}\n  </head>`)
        : `${html}\n${content}`;
}

function injectStaticSeo(html, page) {
    const staticSeo = buildStaticSeoLines(page);
    if (hasText(page.title)) {
        return html.replace(/<title>[\s\S]*?<\/title>/, staticSeo);
    }

    return insertBeforeHeadEnd(html, staticSeo);
}

function createRouteOutputPath(pagePath) {
    const segments = pagePath.split('/').filter(Boolean);
    return path.join(BUILD_DIR, ...segments, 'index.html');
}

function writeRouteFile(shellHtml, pagePath) {
    const outputPath = createRouteOutputPath(pagePath);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, injectStaticSeo(shellHtml, NOINDEX_PAGE));
}

function writeNotFoundFile(shellHtml) {
    const outputPath = path.join(BUILD_DIR, '404.html');
    writeFileSync(outputPath, injectStaticSeo(shellHtml, NOINDEX_PAGE));
}

function main() {
    const shellHtml = readFileSync(INDEX_PATH, 'utf8');
    const homeHtml = injectStaticSeo(shellHtml, HOME_PAGE);
    writeFileSync(INDEX_PATH, homeHtml);
    NOINDEX_ROUTES.forEach((pagePath) => writeRouteFile(shellHtml, pagePath));
    writeNotFoundFile(shellHtml);
    console.log(`Static SEO files generated for ${NOINDEX_ROUTES.length + 1} routes.`);
}

main();
