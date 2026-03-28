const SITE_NAME = 'MyPhotoAI';
const SITE_URL = 'https://myphotoai.net';
const DEFAULT_IMAGE = `${SITE_URL}/logo512.png`;

function noindexPage(path, title, description) {
    return { path, title, description, noindex: true };
}

const HOME_PAGE = {
    path: '/',
    title: 'AI Digital Twin Generator from Your Photos',
    description: 'Train a personal AI model from your photos and generate photorealistic portraits, edits, outfits, and live-photo videos in any style.',
    image: DEFAULT_IMAGE,
    schema: [
        {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: SITE_NAME,
            url: SITE_URL,
            logo: DEFAULT_IMAGE,
            sameAs: []
        },
        {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: SITE_NAME,
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Web',
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD'
            },
            description: 'Train a personal AI model and generate photorealistic images, edits, outfits, and videos with MyPhotoAI.'
        },
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL
        }
    ]
};

const ROUTE_PAGES = [
    noindexPage('/login', 'Sign In', 'Sign in to your MyPhotoAI account. Access your AI models, generated images, and create stunning photorealistic content.'),
    noindexPage('/register', 'Create Account - Start Free', 'Create your free MyPhotoAI account. Start generating AI photos and videos of yourself in any style. No credit card required.'),
    noindexPage('/terms-and-privacy', 'Terms of Service & Privacy Policy', 'Read MyPhotoAI Terms of Service and Privacy Policy. Learn about data protection, user rights, and usage guidelines.'),
    noindexPage('/payment/success', 'Payment Successful', 'Your MyPhotoAI payment was completed successfully.'),
    noindexPage('/payment/cancel', 'Payment Cancelled', 'The MyPhotoAI payment flow was cancelled before completion.'),
    noindexPage('/dashboard', 'Dashboard', 'Manage your AI models, generations, presets, and image history in the MyPhotoAI dashboard.'),
    noindexPage('/create-model', 'Create Model', 'Upload photos and configure a new personal AI model inside MyPhotoAI.'),
    noindexPage('/account', 'Account', 'Manage your account settings, password, and billing access in MyPhotoAI.'),
    noindexPage('/billing', 'Billing', 'Purchase points and review payment history in MyPhotoAI.'),
    noindexPage('/admin', 'Admin Panel', 'Administrative media management for MyPhotoAI.'),
    noindexPage('/pricing', 'Page Not Found', 'The requested MyPhotoAI page could not be found.')
];

const NOT_FOUND_PAGE = {
    title: 'Page Not Found',
    description: 'The requested MyPhotoAI page could not be found.',
    noindex: true
};

module.exports = {
    SITE_NAME,
    SITE_URL,
    DEFAULT_IMAGE,
    HOME_PAGE,
    ROUTE_PAGES,
    NOT_FOUND_PAGE
};
