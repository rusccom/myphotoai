import React from 'react';
import styles from './Gallery.module.css';

const images = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    src: `https://placehold.co/600x400/121212/8b5cf6?text=AI+Example+${i+1}`,
    alt: `Пример AI изображения ${i+1}`
}));

function Gallery() {
    return (
        <section id="examples" className={styles.section} aria-labelledby="gallery-title">
            <div className="container">
                <h2 id="gallery-title" className={styles.sectionTitle}>Примеры</h2>
                <div className={styles.grid}>
                    {images.map((img) => (
                        <figure key={img.id} className={styles.item}>
                            <img loading="lazy" src={img.src} alt={img.alt} />
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Gallery;


