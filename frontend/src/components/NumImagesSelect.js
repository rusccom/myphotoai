import React from 'react';
import CustomSelect from './CustomSelect';

const NUM_IMAGE_OPTIONS = [1, 2, 4, 8];

function NumImagesSelect({ id, label, value, onChange, disabled, max }) {
    // Filter options based on max if provided
    const availableOptions = max 
        ? NUM_IMAGE_OPTIONS.filter(num => num <= max)
        : NUM_IMAGE_OPTIONS;

    // CustomSelect returns string, convert to number
    const handleChange = (newValue) => {
        const numValue = parseInt(newValue, 10);
        onChange(numValue);
    };

    return (
        <CustomSelect
            label={label}
            value={String(value)}
            onChange={handleChange}
            options={availableOptions.map(num => String(num))}
            disabled={disabled}
            allowEmpty={false}
        />
    );
}

export default NumImagesSelect; 