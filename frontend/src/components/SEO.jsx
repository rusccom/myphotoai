import React from 'react';
import { Helmet } from 'react-helmet-async';
import homeSeo from '../features/seo/config/homeSeo.json';

const SITE_NAME = homeSeo.siteName;
const SITE_URL = homeSeo.siteUrl;
const DEFAULT_IMAGE = homeSeo.defaultImage;

function hasText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function SEO({
    title,
    description,
    path = '',
    image = DEFAULT_IMAGE,
    type = 'website',
    noindex = false,
    schema = null
}) {
    const fullTitle = hasText(title) ? `${title} | ${SITE_NAME}` : noindex ? SITE_NAME : null;
    const hasDescription = hasText(description);
    const canRenderIndexableMeta = !noindex && hasText(title) && hasDescription;
    const canonicalUrl = canRenderIndexableMeta && typeof path === 'string'
        ? `${SITE_URL}${path}`
        : null;

    const renderSchema = () => {
        if (!schema) {
            return null;
        }

        if (Array.isArray(schema)) {
            return schema.map((item, index) => (
                <script key={`schema-${index}`} type="application/ld+json">
                    {JSON.stringify(item)}
                </script>
            ));
        }

        return (
            <script type="application/ld+json">
                {JSON.stringify(schema)}
            </script>
        );
    };

    return (
        <Helmet>
            {fullTitle && <title>{fullTitle}</title>}
            {hasDescription && <meta name="description" content={description} />}
            {noindex && <meta name="robots" content="noindex, nofollow" />}
            {noindex && <meta name="googlebot" content="noindex, nofollow" />}

            {canonicalUrl && (
                <link rel="canonical" href={canonicalUrl} />
            )}

            {canonicalUrl && <meta property="og:type" content={type} />}
            {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
            {canonicalUrl && <meta property="og:title" content={fullTitle} />}
            {canonicalUrl && <meta property="og:description" content={description} />}
            {canonicalUrl && <meta property="og:image" content={image} />}
            {canonicalUrl && <meta property="og:site_name" content={SITE_NAME} />}

            {canonicalUrl && <meta name="twitter:card" content="summary_large_image" />}
            {canonicalUrl && <meta name="twitter:url" content={canonicalUrl} />}
            {canonicalUrl && <meta name="twitter:title" content={fullTitle} />}
            {canonicalUrl && <meta name="twitter:description" content={description} />}
            {canonicalUrl && <meta name="twitter:image" content={image} />}

            {renderSchema()}
        </Helmet>
    );
}

export default SEO;
