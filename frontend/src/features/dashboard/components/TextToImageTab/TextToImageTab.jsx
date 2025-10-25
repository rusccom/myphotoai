import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NumImagesSelect from '../../../../components/NumImagesSelect';
import UniversalSubmitButton from '../../../../components/UniversalSubmitButton';
import CustomSelect from '../../../../components/CustomSelect';
import styles from './TextToImageTab.module.css';

const ASPECT_RATIO_OPTIONS = ['3:4', '9:16', '1:1', '4:3', '16:9'];
const ASPECT_RATIO_LABELS = {
    '3:4': '3:4 Portrait (Instagram)',
    '9:16': '9:16 (Stories/Reels)',
    '1:1': '1:1 Square',
    '4:3': '4:3 Landscape',
    '16:9': '16:9 Widescreen'
};

const TextToImageTab = ({ 
    onSubmit, 
    isSubmitting, 
    error, 
    costs 
}) => {
    const [textPrompt, setTextPrompt] = useState('');
    const [textAspectRatio, setTextAspectRatio] = useState('3:4');
    const [textNumImages, setTextNumImages] = useState(2);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!textPrompt.trim()) {
            return;
        }

        onSubmit({
            prompt: textPrompt,
            aspectRatio: textAspectRatio,
            num_images: textNumImages,
        });

        setTextPrompt('');
    };

    return (
        <form onSubmit={handleSubmit} className={styles.generationForm}>
            <h3>Text to Image Generation</h3>
            <p className={styles.description}>
                Create images from text prompts without using a specific AI model.
            </p>

            <div>
                <label>Prompt:</label>
                <textarea
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder="Describe what you want to generate..."
                    required
                    disabled={isSubmitting}
                    rows={4}
                />
            </div>

            <div className={styles.selectorsGrid}>
                <CustomSelect
                    label="Aspect Ratio"
                    value={textAspectRatio}
                    onChange={setTextAspectRatio}
                    options={ASPECT_RATIO_OPTIONS.map(opt => ({
                        value: opt,
                        label: ASPECT_RATIO_LABELS[opt]
                    }))}
                    disabled={isSubmitting}
                    allowEmpty={false}
                />

                <NumImagesSelect
                    label="Number of Images"
                    value={textNumImages}
                    onChange={setTextNumImages}
                    disabled={isSubmitting}
                />
            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}

            <UniversalSubmitButton
                isSubmitting={isSubmitting}
                baseCost={costs?.text_to_image}
                quantity={textNumImages}
            />

            <div className={styles.infoBox}>
                <p>
                    💡 <strong>Tip:</strong> For better results with your face or style, 
                    use the <Link to="/create-model">Model Photo</Link> tab after creating an AI model.
                </p>
            </div>
        </form>
    );
};

export default TextToImageTab;

