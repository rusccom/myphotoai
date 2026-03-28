const { mkdirSync, readFileSync, writeFileSync } = require('fs');
const path = require('path');
const {
    DEFAULT_IMAGE,
    HOME_PAGE,
    NOT_FOUND_PAGE,
    ROUTE_PAGES,
    SITE_NAME,
    SITE_URL
} = require('./staticSeoPages');

const BUILD_DIR = path.resolve(__dirname, '..', '..', 'build');
const INDEX_PATH = path.join(BUILD_DIR, 'index.html');
const BOOTSTRAP_START = '<!-- STATIC_SEO_BOOTSTRAP_START -->';
const BOOTSTRAP_END = '<!-- STATIC_SEO_BOOTSTRAP_END -->';
const BOOTSTRAP_LINES = [
    '  <script>',
    '    window.__STATIC_SEO__ = __STATIC_SEO_CONFIG__;',
    '    (function () {',
    '      var config = window.__STATIC_SEO__;',
    '      var normalizedPath = window.location.pathname.replace(/\\/+$/, "") || "/";',
    '      var routeMap = config.routes.reduce(function (map, page) { map[page.path] = page; return map; }, { "/": config.home });',
    '      var page = routeMap[normalizedPath] || (normalizedPath === "/" ? config.home : config.notFound);',
    '      var fullTitle = page.title + " | MyPhotoAI";',
    '      var pageUrl = normalizedPath === "/" ? "https://myphotoai.net" : "https://myphotoai.net" + normalizedPath;',
    '      function ensureTag(selector, tagName, attrs) {',
    '        var node = document.head.querySelector(selector) || document.createElement(tagName);',
    '        Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });',
    '        if (!node.parentNode) document.head.appendChild(node);',
    '      }',
    '      function removeTag(selector) { var node = document.head.querySelector(selector); if (node) node.remove(); }',
    '      document.title = fullTitle;',
    '      ensureTag(\'meta[name="description"]\', "meta", { name: "description", content: page.description });',
    '      ensureTag(\'meta[name="robots"]\', "meta", { name: "robots", content: page.noindex ? "noindex, nofollow" : "index, follow" });',
    '      ensureTag(\'meta[name="googlebot"]\', "meta", { name: "googlebot", content: page.noindex ? "noindex, nofollow" : "index, follow" });',
    '      if (page.noindex) {',
    '        removeTag(\'link[rel="canonical"]\');',
    '        [\'og:type\', \'og:url\', \'og:title\', \'og:description\', \'og:image\', \'og:site_name\', \'twitter:card\', \'twitter:url\', \'twitter:title\', \'twitter:description\', \'twitter:image\'].forEach(function (property) {',
    '          removeTag(\'meta[property="\' + property + \'"]\');',
    '          removeTag(\'meta[name="\' + property + \'"]\');',
    '        });',
    '      } else {',
    '        ensureTag(\'link[rel="canonical"]\', "link", { rel: "canonical", href: pageUrl });',
    '        ensureTag(\'meta[property="og:type"]\', "meta", { property: "og:type", content: "website" });',
    '        ensureTag(\'meta[property="og:url"]\', "meta", { property: "og:url", content: pageUrl });',
    '        ensureTag(\'meta[property="og:title"]\', "meta", { property: "og:title", content: fullTitle });',
    '        ensureTag(\'meta[property="og:description"]\', "meta", { property: "og:description", content: page.description });',
    '        ensureTag(\'meta[property="og:image"]\', "meta", { property: "og:image", content: page.image || "__DEFAULT_IMAGE__" });',
    '        ensureTag(\'meta[property="og:site_name"]\', "meta", { property: "og:site_name", content: "MyPhotoAI" });',
    '        ensureTag(\'meta[name="twitter:card"]\', "meta", { name: "twitter:card", content: "summary_large_image" });',
    '        ensureTag(\'meta[name="twitter:url"]\', "meta", { name: "twitter:url", content: pageUrl });',
    '        ensureTag(\'meta[name="twitter:title"]\', "meta", { name: "twitter:title", content: fullTitle });',
    '        ensureTag(\'meta[name="twitter:description"]\', "meta", { name: "twitter:description", content: page.description });',
    '        ensureTag(\'meta[name="twitter:image"]\', "meta", { name: "twitter:image", content: page.image || "__DEFAULT_IMAGE__" });',
    '      }',
    '      Array.from(document.head.querySelectorAll(\'script[data-static-schema="true"]\')).forEach(function (node) { node.remove(); });',
    '      (page.schema || []).forEach(function (item) {',
    '        var node = document.createElement("script");',
    '        node.type = "application/ld+json";',
    '        node.setAttribute("data-static-schema", "true");',
    '        node.text = JSON.stringify(item).replace(/</g, "\\\\u003c");',
    '        document.head.appendChild(node);',
    '      });',
    '    })();',
    '  </script>'
];

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
    const fullTitle = createFullTitle(page.title);
    const lines = [
        '    <!-- STATIC_SEO_START -->',
        `    <title>${escapeHtml(fullTitle)}</title>`,
        `    <meta name="description" content="${escapeHtml(page.description)}" />`
    ];

    if (page.noindex) {
        lines.push(...buildNoindexLines());
    }

    if (!page.noindex && page.path) {
        lines.push(...buildIndexableLines(page, fullTitle));
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

function buildBootstrapBlock() {
    const config = { home: HOME_PAGE, routes: ROUTE_PAGES, notFound: NOT_FOUND_PAGE };
    const configJson = escapeScript(config);
    return [
        `  ${BOOTSTRAP_START}`,
        ...BOOTSTRAP_LINES,
        `  ${BOOTSTRAP_END}`
    ].join('\n')
        .replace('__STATIC_SEO_CONFIG__', configJson)
        .replaceAll('__DEFAULT_IMAGE__', DEFAULT_IMAGE);
}

function injectBootstrapScript(html) {
    const bootstrap = buildBootstrapBlock();
    const existing = new RegExp(`${BOOTSTRAP_START}[\\s\\S]*${BOOTSTRAP_END}`);
    return existing.test(html) ? html.replace(existing, bootstrap) : insertBeforeHeadEnd(html, bootstrap);
}

function injectStaticSeo(html, page) {
    const staticSeo = buildStaticSeoLines(page);
    return html.replace(/<title>[\s\S]*?<\/title>/, staticSeo);
}

function createRouteOutputPath(pagePath) {
    const segments = pagePath.split('/').filter(Boolean);
    return path.join(BUILD_DIR, ...segments, 'index.html');
}

function writeRouteFile(shellHtml, page) {
    const outputPath = createRouteOutputPath(page.path);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, injectStaticSeo(shellHtml, page));
}

function writeNotFoundFile(shellHtml) {
    const outputPath = path.join(BUILD_DIR, '404.html');
    writeFileSync(outputPath, injectStaticSeo(shellHtml, NOT_FOUND_PAGE));
}

function main() {
    const shellHtml = injectBootstrapScript(readFileSync(INDEX_PATH, 'utf8'));
    writeFileSync(INDEX_PATH, shellHtml);
    ROUTE_PAGES.forEach((page) => writeRouteFile(shellHtml, page));
    writeNotFoundFile(shellHtml);
    console.log(`Static SEO files generated for ${ROUTE_PAGES.length + 1} routes.`);
}

main();
