import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'MyPhotoAI';
const DEFAULT_TITLE = 'AI Digital Twin: Create Photorealistic Images & Videos';
const DEFAULT_DESCRIPTION = 'Turn your photos into a personalized AI model. Generate stunning, photorealistic images and videos of yourself in any style.';
const SITE_URL = 'https://myphotoai.net';
const DEFAULT_IMAGE = `${SITE_URL}/logo512.png`;

function SEO({ 
    title, 
    description = DEFAULT_DESCRIPTION, 
    path = '', 
    image = DEFAULT_IMAGE,
    type = 'website',
    noindex = false,
    schema = null
}) {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${DEFAULT_TITLE} | ${SITE_NAME}`;
    const canonicalUrl = `${SITE_URL}${path}`;

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonicalUrl} />
            
            {noindex && <meta name="robots" content="noindex, nofollow" />}
            
            {/* Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content={SITE_NAME} />
            
            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={canonicalUrl} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />
            
            {/* JSON-LD Schema */}
            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}
        </Helmet>
    );
}

// Готовые схемы для переиспользования
export const SCHEMAS = {
    organization: {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "MyPhotoAI",
        "url": SITE_URL,
        "logo": DEFAULT_IMAGE,
        "sameAs": []
    },
    
    softwareApplication: {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "MyPhotoAI",
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": DEFAULT_DESCRIPTION
    },

    createFaqSchema: (faqs) => ({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.q,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.a
            }
        }))
    })
};

export default SEO;
