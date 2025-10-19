import React, { useState, useRef } from 'react';
import styles from './FileUploader.module.css';

const FileUploader = ({
    accept = 'image/*',
    multiple = false,
    maxFiles = 10,
    maxSizeMB = 10,
    onChange,
    value = null,
    disabled = false,
    label = 'Upload Files',
    showPreview = true,
    className = ''
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const validateFiles = (fileList) => {
        const fileArray = Array.from(fileList);
        
        if (!multiple && fileArray.length > 1) {
            setError('Only one file allowed');
            return null;
        }

        if (multiple && fileArray.length > maxFiles) {
            setError(`Maximum ${maxFiles} files allowed`);
            return null;
        }

        const allowedTypes = accept.split(',').map(t => t.trim());
        const invalidFiles = fileArray.filter(file => {
            if (accept === 'image/*') {
                return !file.type.startsWith('image/');
            }
            return !allowedTypes.some(type => {
                if (type.startsWith('.')) {
                    return file.name.toLowerCase().endsWith(type);
                }
                return file.type === type;
            });
        });

        if (invalidFiles.length > 0) {
            setError(`Invalid file type: ${invalidFiles.map(f => f.name).join(', ')}`);
            return null;
        }

        const oversizedFiles = fileArray.filter(
            file => file.size > maxSizeMB * 1024 * 1024
        );

        if (oversizedFiles.length > 0) {
            setError(`File too large (max ${maxSizeMB}MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
            return null;
        }

        return fileArray;
    };

    const processFiles = (fileList) => {
        const validFiles = validateFiles(fileList);
        if (!validFiles) return;

        setError(null);
        setFiles(validFiles);

        if (showPreview && accept.includes('image')) {
            generatePreviews(validFiles);
        }

        if (onChange) {
            onChange(multiple ? validFiles : validFiles[0]);
        }
    };

    const generatePreviews = (fileList) => {
        const newPreviews = [];
        let loadedCount = 0;

        fileList.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                newPreviews[index] = e.target.result;
                loadedCount++;
                if (loadedCount === fileList.length) {
                    setPreviews([...newPreviews]);
                }
            };
            reader.onerror = () => {
                loadedCount++;
                if (loadedCount === fileList.length) {
                    setPreviews([...newPreviews]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleFileInputChange = (e) => {
        if (e.target.files.length > 0) {
            processFiles(e.target.files);
        }
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    };

    const handleClick = () => {
        if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const removeFile = (index) => {
        const newFiles = files.filter((_, i) => i !== index);
        const newPreviews = previews.filter((_, i) => i !== index);
        
        setFiles(newFiles);
        setPreviews(newPreviews);
        
        if (onChange) {
            onChange(multiple ? newFiles : (newFiles[0] || null));
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div className={`${styles.uploaderContainer} ${className}`}>
            {label && <label className={styles.label}>{label}</label>}
            
            <div
                className={`
                    ${styles.dropZone}
                    ${isDragging ? styles.dragging : ''}
                    ${disabled ? styles.disabled : ''}
                    ${files.length > 0 ? styles.hasFiles : ''}
                `}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleFileInputChange}
                    disabled={disabled}
                    className={styles.fileInput}
                />

                {files.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.uploadIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                        </div>
                        <p className={styles.description}>
                            Click to upload or drag & drop
                        </p>
                    </div>
                ) : (
                    <div className={styles.filesContainer}>
                        <div className={styles.filesList}>
                            {files.map((file, index) => (
                                <div key={index} className={styles.fileItem}>
                                    {showPreview && previews[index] && (
                                        <div className={styles.previewWrapper}>
                                            <img 
                                                src={previews[index]} 
                                                alt={file.name}
                                                className={styles.preview}
                                            />
                                            {!disabled && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFile(index);
                                                    }}
                                                    className={styles.removeButton}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className={styles.errorMessage}>
                    {error}
                </div>
            )}
        </div>
    );
};

export default FileUploader;

