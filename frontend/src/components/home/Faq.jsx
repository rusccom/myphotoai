import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ScrollReveal from './animations/ScrollReveal';
import GradientText from './animations/GradientText';
import styles from './Faq.module.css';

const faqs = [
    {
        q: 'How many photos are needed to create an AI model?',
        a: 'We recommend uploading 10 to 30 high-quality photos from different angles. The more variety, the better the result.'
    },
    {
        q: 'How long does it take to train an AI model?',
        a: 'Model training takes 1 to 2 hours. You will receive a notification when the model is ready to use.'
    },
    {
        q: 'Can I use the generated images commercially?',
        a: 'Yes, with the Premium plan you get a commercial license. On the Free and Plus plans, images are for personal use only.'
    },
    {
        q: 'What generation styles are available?',
        a: 'Over 10 styles are available: from photorealistic portraits to artistic and fashion shoots. You can also combine styles.'
    },
    {
        q: 'Is my data secure?',
        a: 'Yes, all your photos and models are stored in encrypted form. You can delete all data at any time from your account settings.'
    },
    {
        q: 'How do payments work?',
        a: 'You purchase points in advance and spend them on generation and training. If your balance is too low, actions are paused until you top up.'
    }
];

// FAQ Schema for Google Rich Results
const faqSchema = {
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
};

function Faq() {
    const [openIndex, setOpenIndex] = useState(null);

    const toggleFaq = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section id="faq" className={styles.section}>
            <Helmet>
                <script type="application/ld+json">
                    {JSON.stringify(faqSchema)}
                </script>
            </Helmet>
            <div className="container">
                <ScrollReveal animation="fadeUp">
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            Frequently Asked <GradientText animated={true}>Questions</GradientText>
                        </h2>
                        <p className={styles.sectionSubtitle}>
                            Answers to popular questions about the service
                        </p>
                    </div>
                </ScrollReveal>

                <div className={styles.faqList}>
                    {faqs.map((faq, index) => (
                        <ScrollReveal key={index} animation="fadeUp" delay={index * 100}>
                            <div className={`${styles.faqItem} ${openIndex === index ? styles.open : ''}`}>
                                <button
                                    className={styles.question}
                                    onClick={() => toggleFaq(index)}
                                    aria-expanded={openIndex === index}
                                >
                                    <span className={styles.questionText}>{faq.q}</span>
                                    <svg 
                                        className={styles.chevron}
                                        width="24" 
                                        height="24" 
                                        viewBox="0 0 24 24" 
                                        fill="currentColor"
                                    >
                                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                                    </svg>
                                </button>
                                
                                <div className={styles.answerWrapper}>
                                    <div className={styles.answer}>
                                        {faq.a}
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Faq;
