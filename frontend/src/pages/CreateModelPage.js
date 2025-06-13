import React, { useState } from 'react';
import { useNavigate /*, Link */ } from 'react-router-dom'; // REMOVE Link import
import { useAuth } from '../context/AuthContext';
// import { useNotification } from '../context/NotificationContext'; // Already removed
import { createModel } from '../services/api';
import styles from './CreateModelPage.module.css'; // Используем CSS-модули

// Options for dropdowns
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const EYE_COLOR_OPTIONS = ['Blue', 'Green', 'Brown', 'Hazel', 'Gray', 'Other'];
const APPEARANCE_OPTIONS = ['European', 'Caucasian', 'Asian', 'African', 'Hispanic/Latino', 'Middle Eastern', 'Other']; // Added European and made it first

const MIN_FILES = 1;
const MAX_FILES = 30; // <--- Изменяем максимум на 30

// Опции для нового поля Mode
const MODE_OPTIONS = [
    { value: 'character', label: 'Character (Person/Animal)' },
    { value: 'product', label: 'Product' },
    { value: 'style', label: 'Artistic Style' },
    { value: 'general', label: 'General Concept' },
];

function CreateModelPage() {
    const { /* user, */ isLoading: authLoading, /* checkStatus, */ refreshModels } = useAuth(); // Get user and checkStatus for updating
    const navigate = useNavigate();

    // Form state
    const [modelName, setModelName] = useState('My Model');
    const [gender, setGender] = useState(GENDER_OPTIONS[0]);
    const [age, setAge] = useState('');
    const [eyeColor, setEyeColor] = useState(EYE_COLOR_OPTIONS[0]);
    const [appearance, setAppearance] = useState(APPEARANCE_OPTIONS[0]); // Default to 'European'
    const [photos, setPhotos] = useState([]);
    const [mode, setMode] = useState(MODE_OPTIONS[0].value);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // File selection handler
    const handleFileChange = (event) => {
        setError(null);
        if (event.target.files) {
            const fileArray = Array.from(event.target.files);
            if (fileArray.length < MIN_FILES || fileArray.length > MAX_FILES) {
                 setError(`Please upload between ${MIN_FILES} and ${MAX_FILES} photos.`);
                 setPhotos([]);
                 event.target.value = null;
                 return;
            }
            // TODO: Проверить типы файлов еще раз? (уже есть accept в input)
            setPhotos(fileArray);
        }
    };

    // Form submission handler
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        console.log('[CreateModelPage] Handle Submit Started'); // ЛОГ 1

        // --- Валидация ---
        console.log('[CreateModelPage] Validating inputs...'); // ЛОГ 2
        if (!modelName.trim()) { setError('Model Name is required.'); console.error('Validation failed: Model Name'); return; }
        if (!age || parseInt(age, 10) < 0 || parseInt(age, 10) > 150) {
             setError('Please enter a valid age between 0 and 150.');
             console.error('Validation failed: Age');
             return;
        }
        if (photos.length < MIN_FILES || photos.length > MAX_FILES) {
            setError(`Please upload between ${MIN_FILES} and ${MAX_FILES} photos.`);
            console.error('Validation failed: Photo count');
            return;
        }
        console.log('[CreateModelPage] Validation successful.'); // ЛОГ 3

        setIsLoading(true);
        console.log('[CreateModelPage] Creating FormData...'); // ЛОГ 4
        const formData = new FormData();
        formData.append('modelName', modelName.trim());
        formData.append('gender', gender);
        formData.append('age', age);
        formData.append('eyeColor', eyeColor);
        formData.append('appearance', appearance);
        formData.append('mode', mode);
        console.log('[CreateModelPage] Appending photos:', photos.length);
        photos.forEach((photo, index) => {
            formData.append('photos', photo);
            console.log(`[CreateModelPage] Appended photo ${index + 1}:`, photo.name);
        });

        console.log('[CreateModelPage] FormData created. Calling API...'); // ЛОГ 5

        try {
            // Оборачиваем вызов API для детального логгирования
            const apiCallPromise = createModel(formData);
            console.log('[CreateModelPage] API call initiated.'); // ЛОГ 6
            
            const createdModel = await apiCallPromise;
            
            console.log('[CreateModelPage] API call successful! Response:', createdModel); // ЛОГ 7 (если успешно)
            // alert(`Model "${createdModel.name}" creation process started! It might take up to 2 hours. You can track the status on your dashboard.`);
            
            console.log('[CreateModelPage] Refreshing models...'); // ЛОГ 8
            await refreshModels();
            console.log('[CreateModelPage] Navigating to dashboard...'); // ЛОГ 9
            navigate('/dashboard');

        } catch (err) {
            // Логируем ошибку, которая пришла из fetchApi
            console.error('[CreateModelPage] API call failed in handleSubmit:', err); // ЛОГ 10 (если ошибка)
            // err.message должен содержать сообщение, которое мы сформировали в fetchApi
            const errorMessage = err.message || 'An unknown error occurred while creating the model.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
            console.log('[CreateModelPage] Handle Submit Finished.'); // ЛОГ 11
        }
    };

    // If user already has a model or status is loading, don't show the form
    if (authLoading) {
         return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading user data...</div>
             </div>
        );
    }

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Create New AI Model</h2>
            <p className={styles.subtitle}>Provide details and upload {MIN_FILES}-{MAX_FILES} photos.</p>
            
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.gridContainer}>
                    <div className={`${styles.formGroup} ${styles.formGroupFullSpan}`}>
                        <label htmlFor="modelName" className={styles.label}>Model Name (for your reference):</label>
                        <input
                            type="text"
                            id="modelName"
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            required
                            disabled={isLoading}
                            className={styles.input}
                            placeholder="e.g., My Realistic Model"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="mode" className={styles.label}>Model Mode (Concept Type):</label>
                        <select
                            id="mode"
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                            disabled={isLoading}
                            className="select-custom"
                        >
                            {MODE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="gender" className={styles.label}>Subject Gender:</label>
                        <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} disabled={isLoading} className="select-custom">
                            {GENDER_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="age" className={styles.label}>Age:</label>
                        <input
                            type="number"
                            id="age"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            min="0"
                            max="150"
                            required
                            disabled={isLoading}
                            className={styles.input}
                            placeholder="e.g., 30"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="eyeColor" className={styles.label}>Eye Color:</label>
                        <select id="eyeColor" value={eyeColor} onChange={(e) => setEyeColor(e.target.value)} disabled={isLoading} className="select-custom">
                            {EYE_COLOR_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="appearance" className={styles.label}>Appearance:</label>
                        <select id="appearance" value={appearance} onChange={(e) => setAppearance(e.target.value)} disabled={isLoading} className="select-custom">
                            {APPEARANCE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                    </div>
                </div>

                <div className={styles.formGroupFull}>
                    <label htmlFor="photos" className={styles.label}>Upload Photos ({MIN_FILES} to {MAX_FILES} required):</label>
                    
                    {photos.length > 0 && (
                        <p className={styles.fileCountInfo}>
                            Selected files: {photos.length}
                        </p>
                    )}
                    
                    <div className={styles.fileInputContainer}>
                        <input
                            type="file"
                            id="photos"
                            multiple
                            accept=".png, .jpg, .jpeg, .webp"
                            onChange={handleFileChange}
                            required
                            disabled={isLoading}
                            className={styles.fileInput}
                        />
                    </div>
                </div>

                {error && <p className={styles.errorMessage}>{error}</p>}
                
                <p className={styles.creationTimeInfo}>
                    Model training can take up to 2 hours. Status will be updated on the dashboard.
                </p>
                
                <button
                    type="submit"
                    disabled={isLoading || photos.length < MIN_FILES || photos.length > MAX_FILES || !modelName.trim()}
                    className={styles.submitButton}
                >
                    {isLoading ? 'Starting Creation...' : 'Start Model Creation'}
                </button>
            </form>
        </div>
    );
}

export default CreateModelPage; 