import { useState } from 'react';

export const useFileUpload = () => {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [dimensions, setDimensions] = useState({ width: null, height: null });
    const [aspectRatio, setAspectRatio] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (event, onSuccess) => {
        const selectedFile = event.target.files[0];
        setError(null);
        setDimensions({ width: null, height: null });
        setAspectRatio(null);
        setPreviewUrl(null);

        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
                const img = new Image();
                
                img.onload = () => {
                    const w = img.naturalWidth;
                    const h = img.naturalHeight;
                    setDimensions({ width: w, height: h });
                    
                    if (w && h) {
                        setAspectRatio(`${w}:${h}`);
                    }
                    
                    if (onSuccess) {
                        onSuccess({ width: w, height: h, aspectRatio: `${w}:${h}` });
                    }
                };
                
                img.onerror = () => {
                    setError('Could not read image dimensions.');
                    setDimensions({ width: null, height: null });
                };
                
                img.src = reader.result;
            };
            
            reader.onerror = () => {
                setError('Error reading file.');
                setFile(null);
            };
            
            reader.readAsDataURL(selectedFile);
        } else {
            setFile(null);
        }
        
        if (event.target) {
            event.target.value = null;
        }
    };

    const reset = () => {
        setFile(null);
        setPreviewUrl(null);
        setDimensions({ width: null, height: null });
        setAspectRatio(null);
        setError(null);
    };

    return {
        file,
        previewUrl,
        dimensions,
        aspectRatio,
        error,
        handleFileChange,
        reset,
        setError,
    };
};

export const useMultiFileUpload = (maxFiles = 10) => {
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [error, setError] = useState(null);

    const handleFilesChange = (event) => {
        const selectedFiles = Array.from(event.target.files);
        setError(null);
        
        if (selectedFiles.length === 0) {
            setFiles([]);
            setPreviews([]);
            return;
        }

        if (selectedFiles.length > maxFiles) {
            setError(`Maximum ${maxFiles} images allowed.`);
            return;
        }

        const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
        const invalidFiles = selectedFiles.filter(
            file => !allowedTypes.includes(file.type)
        );
        
        if (invalidFiles.length > 0) {
            setError(
                `Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}. ` +
                `Allowed: PNG, JPG, JPEG, WEBP`
            );
            return;
        }

        setFiles(selectedFiles);
        
        const newPreviews = [];
        let loadedCount = 0;
        
        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                newPreviews[index] = reader.result;
                loadedCount++;
                
                if (loadedCount === selectedFiles.length) {
                    setPreviews([...newPreviews]);
                }
            };
            reader.onerror = () => {
                console.error(`Error reading file: ${file.name}`);
                loadedCount++;
                if (loadedCount === selectedFiles.length) {
                    setPreviews([...newPreviews]);
                }
            };
            reader.readAsDataURL(file);
        });
        
        if (event.target) {
            event.target.value = null;
        }
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
        setError(null);
    };

    const reset = () => {
        setFiles([]);
        setPreviews([]);
        setError(null);
    };

    return {
        files,
        previews,
        error,
        handleFilesChange,
        removeFile,
        reset,
        setError,
    };
};

