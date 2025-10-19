import React from 'react';
import styles from './Features.module.css';

const features = [
    { title: 'Быстро', text: 'Готовые изображения за пару минут.' },
    { title: 'Просто', text: 'Загрузите фото, выберите стиль и готово.' },
    { title: 'Гибко', text: 'Множество стилей и настроек под ваш вкус.' }
];

function Features() {
    return (
        <section id="features" className={styles.section} aria-labelledby="features-title">
            <div className="container">
                <h2 id="features-title" className={styles.sectionTitle}>Почему это удобно</h2>
                <ul className={styles.grid}>
                    {features.map((f) => (
                        <li key={f.title} className={styles.card}>
                            <h3 className={styles.cardTitle}>{f.title}</h3>
                            <p className={styles.cardText}>{f.text}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

export default Features;


