import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'MyPhotoAI';
const DEFAULT_TITLE = 'Create an AI Digital Twin from Your Photos';
const DEFAULT_DESCRIPTION = 'Train a personal AI model and generate photorealistic images, edits, outfits, and videos with MyPhotoAI.';
const SITE_URL = 'https://myphotoai.net';
const DEFAULT_IMAGE = `${SITE_URL}/logo512.png`;

function SEO({
    title,
    description = DEFAULT_DESCRIPTION,
    path = '',
    image = DEFAULT_IMAGE,
    type = 'website',
    noindex = false,
    includeCanonical = !noindex,
    includeSocial = !noindex,
    schema = null
}) {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${DEFAULT_TITLE} | ${SITE_NAME}`;
    const canonicalUrl = typeof path === 'string' ? `${SITE_URL}${path}` : null;

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
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            {noindex && <meta name="robots" content="noindex, nofollow" />}

            {includeCanonical && canonicalUrl && (
                <link rel="canonical" href={canonicalUrl} />
            )}

            {includeSocial && canonicalUrl && <meta property="og:type" content={type} />}
            {includeSocial && canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
            {includeSocial && canonicalUrl && <meta property="og:title" content={fullTitle} />}
            {includeSocial && canonicalUrl && <meta property="og:description" content={description} />}
            {includeSocial && canonicalUrl && <meta property="og:image" content={image} />}
            {includeSocial && canonicalUrl && <meta property="og:site_name" content={SITE_NAME} />}

            {includeSocial && canonicalUrl && <meta name="twitter:card" content="summary_large_image" />}
            {includeSocial && canonicalUrl && <meta name="twitter:url" content={canonicalUrl} />}
            {includeSocial && canonicalUrl && <meta name="twitter:title" content={fullTitle} />}
            {includeSocial && canonicalUrl && <meta name="twitter:description" content={description} />}
            {includeSocial && canonicalUrl && <meta name="twitter:image" content={image} />}

            {renderSchema()}
        </Helmet>
    );
}

export const SCHEMAS = {
    organization: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'MyPhotoAI',
        url: SITE_URL,
        logo: DEFAULT_IMAGE,
        sameAs: []
    },

    softwareApplication: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'MyPhotoAI',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD'
        },
        description: DEFAULT_DESCRIPTION
    },

    createFaqSchema: (faqs) => ({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a
            }
        }))
    })
};

export default SEO;
