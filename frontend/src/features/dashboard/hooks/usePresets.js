import { useState, useEffect, useCallback } from 'react';
import { getPresetCategories, getPresets } from '../../../services/api';

export const usePresets = () => {
    const [categories, setCategories] = useState([]);
    const [presets, setPresets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadPresets = useCallback(async () => {
        setIsLoading(true);
        try {
            const [catData, presetsData] = await Promise.all([
                getPresetCategories(),
                getPresets()
            ]);
            setCategories(catData.categories || []);
            setPresets(presetsData.presets || []);
        } catch (error) {
            console.error('Failed to load presets:', error);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadPresets();
    }, [loadPresets]);

    return { categories, presets, isLoading, refreshPresets: loadPresets };
};
