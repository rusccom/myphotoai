import React, { useState, useEffect, useCallback } from 'react';
import styles from './AdminPage.module.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

// Section tabs configuration
const SECTION_TABS = [
    { id: 'model-generation', name: 'Model Photo', icon: '📸' },
    { id: 'photo-editing', name: 'Edit Photo', icon: '🎨' },
    { id: 'clothing-try-on', name: 'Try-On', icon: '👕' },
    { id: 'live-photo', name: 'Live Photo', icon: '🎬' },
    { id: 'presets', name: 'Presets', icon: '✨' }
];

function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [activeSection, setActiveSection] = useState('model-generation');
    const [sectionData, setSectionData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(null);
    const [fileCacheKeys, setFileCacheKeys] = useState({});

    // Check localStorage for saved session
    useEffect(() => {
        const savedPassword = localStorage.getItem('adminPassword');
        if (savedPassword) {
            verifyPassword(savedPassword, true);
        }
    }, []);

    const verifyPassword = async (pwd, silent = false) => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd })
            });
            if (res.ok) {
                setIsAuthenticated(true);
                localStorage.setItem('adminPassword', pwd);
                setError('');
            } else if (!silent) {
                setError('Invalid password');
            }
        } catch (err) {
            if (!silent) setError('Connection error');
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        verifyPassword(password);
    };

    const handleLogout = () => {
        localStorage.removeItem('adminPassword');
        setIsAuthenticated(false);
        setPassword('');
    };

    const getAdminPassword = () => localStorage.getItem('adminPassword') || '';

    const loadSectionData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/media/${activeSection}`, {
                headers: { 'X-Admin-Password': getAdminPassword() }
            });
            if (res.ok) {
                const data = await res.json();
                setSectionData(data);
            }
        } catch (err) {
            console.error('Failed to load section data:', err);
        }
        setLoading(false);
    }, [activeSection]);

    useEffect(() => {
        if (isAuthenticated) {
            loadSectionData();
        }
    }, [isAuthenticated, activeSection, loadSectionData]);

    const getFileKey = (subfolder, category, filename) => {
        return `${category || subfolder}-${filename}`;
    };

    const updateFileStatus = (subfolder, category, filename, exists) => {
        setSectionData(prev => {
            if (!prev) return prev;
            const key = category || subfolder;
            const updated = { ...prev, files: { ...prev.files } };
            updated.files[key] = prev.files[key].map(f =>
                f.name === filename ? { ...f, exists } : f
            );
            return updated;
        });
    };

    const handleFileUpload = async (file, targetName, subfolder, category) => {
        setUploadingFile(targetName);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('target_name', targetName);
        if (subfolder) formData.append('subfolder', subfolder);
        if (category) formData.append('category', category);

        try {
            const res = await fetch(`${API_BASE}/api/admin/media/${activeSection}/upload`, {
                method: 'POST',
                headers: { 'X-Admin-Password': getAdminPassword() },
                body: formData
            });
            if (res.ok) {
                const fileKey = getFileKey(subfolder, category, targetName);
                setFileCacheKeys(prev => ({ ...prev, [fileKey]: Date.now() }));
                updateFileStatus(subfolder, category, targetName, true);
            }
        } catch (err) {
            console.error('Upload failed:', err);
        }
        setUploadingFile(null);
    };

    const handleDelete = async (filepath, subfolder, category, filename) => {
        if (!window.confirm('Delete this file?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/admin/media/${activeSection}/${filepath}`, {
                method: 'DELETE',
                headers: { 'X-Admin-Password': getAdminPassword() }
            });
            if (res.ok) {
                updateFileStatus(subfolder, category, filename, false);
            }
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    // Login Form
    if (!isAuthenticated) {
        return (
            <div className={styles.loginContainer}>
                <div className={styles.loginCard}>
                    <h1 className={styles.loginTitle}>🔐 Admin Panel</h1>
                    <form onSubmit={handleLogin} className={styles.loginForm}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter admin password"
                            className={styles.passwordInput}
                            autoFocus
                        />
                        {error && <p className={styles.error}>{error}</p>}
                        <button type="submit" className={styles.loginButton}>
                            Enter
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Admin Panel
    return (
        <div className={styles.adminContainer}>
            <header className={styles.header}>
                <h1 className={styles.title}>🛠️ Admin Panel</h1>
                <button onClick={handleLogout} className={styles.logoutButton}>
                    Logout
                </button>
            </header>

            <nav className={styles.tabs}>
                {SECTION_TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeSection === tab.id ? styles.activeTab : ''}`}
                        onClick={() => setActiveSection(tab.id)}
                    >
                        <span className={styles.tabIcon}>{tab.icon}</span>
                        {tab.name}
                    </button>
                ))}
            </nav>

            <main className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>Loading...</div>
                ) : sectionData ? (
                    <SectionEditor
                        section={activeSection}
                        data={sectionData}
                        onUpload={handleFileUpload}
                        onDelete={handleDelete}
                        uploadingFile={uploadingFile}
                        fileCacheKeys={fileCacheKeys}
                    />
                ) : null}
            </main>
        </div>
    );
}

// Section Requirements Info Component
function SectionRequirements({ info }) {
    if (!info) return null;
    
    return (
        <div className={styles.requirementsBox}>
            <div className={styles.requirementsGrid}>
                <div className={styles.requirementItem}>
                    <span className={styles.requirementIcon}>📐</span>
                    <span className={styles.requirementLabel}>Aspect Ratio:</span>
                    <span className={styles.requirementValue}>{info.aspectRatio}</span>
                </div>
                <div className={styles.requirementItem}>
                    <span className={styles.requirementIcon}>📏</span>
                    <span className={styles.requirementLabel}>Size:</span>
                    <span className={styles.requirementValue}>{info.recommendedSize}</span>
                </div>
                <div className={styles.requirementItem}>
                    <span className={styles.requirementIcon}>📁</span>
                    <span className={styles.requirementLabel}>Formats:</span>
                    <span className={styles.requirementValue}>{info.formats}</span>
                </div>
                {info.description && (
                    <div className={styles.requirementItem}>
                        <span className={styles.requirementIcon}>ℹ️</span>
                        <span className={styles.requirementLabel}>Info:</span>
                        <span className={styles.requirementValue}>{info.description}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Section Editor Component
function SectionEditor({ section, data, onUpload, onDelete, uploadingFile, fileCacheKeys }) {
    const info = data.info;
    
    if (section === 'presets') {
        return <PresetsEditor />;
    }
    if (section === 'clothing-try-on') {
        return (
            <>
                <SectionRequirements info={info} />
                <TryOnEditor data={data} onUpload={onUpload} onDelete={onDelete} uploadingFile={uploadingFile} fileCacheKeys={fileCacheKeys} />
            </>
        );
    }
    return (
        <>
            <SectionRequirements info={info} />
            <StandardEditor section={section} data={data} onUpload={onUpload} onDelete={onDelete} uploadingFile={uploadingFile} fileCacheKeys={fileCacheKeys} />
        </>
    );
}

// Standard Section Editor (model-generation, photo-editing, live-photo)
function StandardEditor({ section, data, onUpload, onDelete, uploadingFile, fileCacheKeys }) {
    const isVideo = section === 'live-photo';

    return (
        <div className={styles.editorContainer}>
            {Object.entries(data.files || {}).map(([subfolder, files]) => (
                <div key={subfolder} className={styles.folderSection}>
                    <h3 className={styles.folderTitle}>
                        {subfolder === 'main' ? '📌 Main Image' : 
                         subfolder === 'grid' ? '🖼️ Grid Images' : 
                         subfolder === 'videos' ? '🎬 Videos' : subfolder}
                    </h3>
                    <div className={styles.filesGrid}>
                        {files.map(file => (
                            <FileCard
                                key={file.name}
                                file={file}
                                isVideo={isVideo}
                                subfolder={subfolder}
                                onUpload={onUpload}
                                onDelete={onDelete}
                                uploading={uploadingFile === file.name}
                                fileCacheKeys={fileCacheKeys}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// Try-On Editor (4 blocks × 3 images each)
function TryOnEditor({ data, onUpload, onDelete, uploadingFile, fileCacheKeys }) {
    return (
        <div className={styles.editorContainer}>
            {Object.entries(data.files || {}).map(([blockName, files]) => {
                // Extract block number: "Block 1" -> "1"
                const blockNum = blockName.replace('Block ', '');
                return (
                    <div key={blockName} className={styles.folderSection}>
                        <h3 className={styles.folderTitle}>👕 {blockName}</h3>
                        <div className={styles.filesGrid}>
                            {files.map(file => (
                                <FileCard
                                    key={file.name}
                                    file={file}
                                    isVideo={false}
                                    subfolder={blockName}
                                    deleteSubfolder={blockNum}
                                    onUpload={onUpload}
                                    onDelete={onDelete}
                                    uploading={uploadingFile === file.name}
                                    showLabel={true}
                                    fileCacheKeys={fileCacheKeys}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Presets Editor (Database-backed)
function PresetsEditor() {
    const API_BASE = process.env.REACT_APP_API_URL || '';
    const getAdminPassword = () => localStorage.getItem('adminPassword') || '';
    
    const [categories, setCategories] = useState([]);
    const [presets, setPresets] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showPresetModal, setShowPresetModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingPreset, setEditingPreset] = useState(null);

    // Load categories
    const loadCategories = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/preset/admin/categories`, {
                headers: { 'X-Admin-Password': getAdminPassword() }
            });
            if (res.ok) {
                const data = await res.json();
                setCategories(data.categories || []);
                if (!activeCategory && data.categories?.length > 0) {
                    setActiveCategory(data.categories[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    }, [API_BASE, activeCategory]);

    // Load presets
    const loadPresets = useCallback(async () => {
        if (!activeCategory) return;
        try {
            const res = await fetch(`${API_BASE}/api/preset/admin/presets?category_id=${activeCategory}`, {
                headers: { 'X-Admin-Password': getAdminPassword() }
            });
            if (res.ok) {
                const data = await res.json();
                setPresets(data.presets || []);
            }
        } catch (err) {
            console.error('Failed to load presets:', err);
        }
    }, [API_BASE, activeCategory]);

    useEffect(() => {
        loadCategories().then(() => setLoading(false));
    }, [loadCategories]);

    useEffect(() => {
        if (activeCategory) loadPresets();
    }, [activeCategory, loadPresets]);

    // Category CRUD
    const handleSaveCategory = async (categoryData) => {
        const isEdit = !!editingCategory;
        const url = isEdit 
            ? `${API_BASE}/api/preset/admin/categories/${editingCategory.id}`
            : `${API_BASE}/api/preset/admin/categories`;
        
        try {
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Password': getAdminPassword()
                },
                body: JSON.stringify(categoryData)
            });
            if (res.ok) {
                await loadCategories();
                setShowCategoryModal(false);
                setEditingCategory(null);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save category');
            }
        } catch (err) {
            console.error('Save category error:', err);
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!window.confirm('Delete this category?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/preset/admin/categories/${categoryId}`, {
                method: 'DELETE',
                headers: { 'X-Admin-Password': getAdminPassword() }
            });
            if (res.ok) {
                await loadCategories();
                if (activeCategory === categoryId) {
                    setActiveCategory(categories[0]?.id || null);
                }
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete category');
            }
        } catch (err) {
            console.error('Delete category error:', err);
        }
    };

    // Preset CRUD
    const handleSavePreset = async (formData) => {
        const isEdit = !!editingPreset;
        const url = isEdit 
            ? `${API_BASE}/api/preset/admin/presets/${editingPreset.id}`
            : `${API_BASE}/api/preset/admin/presets`;
        
        try {
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'X-Admin-Password': getAdminPassword() },
                body: formData
            });
            if (res.ok) {
                await loadPresets();
                setShowPresetModal(false);
                setEditingPreset(null);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save preset');
            }
        } catch (err) {
            console.error('Save preset error:', err);
        }
    };

    const handleDeletePreset = async (presetId) => {
        if (!window.confirm('Delete this preset?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/preset/admin/presets/${presetId}`, {
                method: 'DELETE',
                headers: { 'X-Admin-Password': getAdminPassword() }
            });
            if (res.ok) {
                await loadPresets();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete preset');
            }
        } catch (err) {
            console.error('Delete preset error:', err);
        }
    };

    if (loading) return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.editorContainer}>
            {/* Categories Section */}
            <div className={styles.folderSection}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.folderTitle}>Categories</h3>
                    <button 
                        className={styles.addButton}
                        onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}
                    >
                        + Add Category
                    </button>
                </div>
                <div className={styles.categoryTabs}>
                    {categories.map(cat => (
                        <div key={cat.id} className={styles.categoryTabWrapper}>
                            <button
                                className={`${styles.categoryTab} ${activeCategory === cat.id ? styles.activeCategoryTab : ''} ${!cat.is_active ? styles.inactiveTab : ''}`}
                                onClick={() => setActiveCategory(cat.id)}
                            >
                                {cat.name} ({cat.presets_count})
                            </button>
                            <div className={styles.categoryActions}>
                                <button 
                                    className={styles.smallBtn}
                                    onClick={() => { setEditingCategory(cat); setShowCategoryModal(true); }}
                                >
                                    Edit
                                </button>
                                <button 
                                    className={styles.smallBtnDanger}
                                    onClick={() => handleDeleteCategory(cat.id)}
                                >
                                    Del
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Presets Section */}
            {activeCategory && (
                <div className={styles.folderSection}>
                    <div className={styles.sectionHeader}>
                        <h3 className={styles.folderTitle}>Presets</h3>
                        <button 
                            className={styles.addButton}
                            onClick={() => { setEditingPreset(null); setShowPresetModal(true); }}
                        >
                            + Add Preset
                        </button>
                    </div>
                    <div className={styles.presetsGrid}>
                        {presets.map(preset => (
                            <PresetCard 
                                key={preset.id} 
                                preset={preset}
                                onEdit={() => { setEditingPreset(preset); setShowPresetModal(true); }}
                                onDelete={() => handleDeletePreset(preset.id)}
                            />
                        ))}
                        {presets.length === 0 && (
                            <p className={styles.emptyText}>No presets in this category</p>
                        )}
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <CategoryModal
                    category={editingCategory}
                    onSave={handleSaveCategory}
                    onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }}
                />
            )}

            {/* Preset Modal */}
            {showPresetModal && (
                <PresetModal
                    preset={editingPreset}
                    categoryId={activeCategory}
                    onSave={handleSavePreset}
                    onClose={() => { setShowPresetModal(false); setEditingPreset(null); }}
                />
            )}
        </div>
    );
}

// Preset Card Component
function PresetCard({ preset, onEdit, onDelete }) {
    return (
        <div className={styles.presetCard}>
            <div className={styles.presetImage}>
                {preset.signed_url ? (
                    <img src={preset.signed_url} alt={preset.name} />
                ) : (
                    <div className={styles.placeholder}>
                        <span>No image</span>
                    </div>
                )}
                {!preset.is_active && <div className={styles.inactiveBadge}>Inactive</div>}
            </div>
            <div className={styles.presetInfo}>
                <h4>{preset.name}</h4>
                <p className={styles.presetPrompt}>{preset.prompt.substring(0, 100)}...</p>
            </div>
            <div className={styles.presetActions}>
                <button className={styles.editBtn} onClick={onEdit}>Edit</button>
                <button className={styles.deleteBtn} onClick={onDelete}>Delete</button>
            </div>
        </div>
    );
}

// Category Modal Component
function CategoryModal({ category, onSave, onClose }) {
    const [name, setName] = useState(category?.name || '');
    const [slug, setSlug] = useState(category?.slug || '');
    const [description, setDescription] = useState(category?.description || '');
    const [sortOrder, setSortOrder] = useState(category?.sort_order || 0);
    const [isActive, setIsActive] = useState(category?.is_active ?? true);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name, slug, description, sort_order: sortOrder, is_active: isActive });
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <h3>{category ? 'Edit Category' : 'New Category'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label>Name *</label>
                        <input value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Slug</label>
                        <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated" />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Description</label>
                        <input value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Sort Order</label>
                        <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>
                            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                            Active
                        </label>
                    </div>
                    <div className={styles.modalActions}>
                        <button type="button" onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles.primaryBtn}>Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Preset Modal Component
function PresetModal({ preset, categoryId, onSave, onClose }) {
    const [name, setName] = useState(preset?.name || '');
    const [prompt, setPrompt] = useState(preset?.prompt || '');
    const [sortOrder, setSortOrder] = useState(preset?.sort_order || 0);
    const [isActive, setIsActive] = useState(preset?.is_active ?? true);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(preset?.signed_url || null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('category_id', categoryId);
        formData.append('name', name);
        formData.append('prompt', prompt);
        formData.append('sort_order', sortOrder);
        formData.append('is_active', isActive);
        if (imageFile) formData.append('image', imageFile);
        onSave(formData);
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <h3>{preset ? 'Edit Preset' : 'New Preset'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label>Name *</label>
                        <input value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Prompt *</label>
                        <textarea 
                            value={prompt} 
                            onChange={e => setPrompt(e.target.value)} 
                            rows={4}
                            required 
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Image</label>
                        <input type="file" accept="image/*" onChange={handleImageChange} />
                        {imagePreview && (
                            <div className={styles.imagePreview}>
                                <img src={imagePreview} alt="Preview" />
                            </div>
                        )}
                    </div>
                    <div className={styles.formGroup}>
                        <label>Sort Order</label>
                        <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label>
                            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                            Active
                        </label>
                    </div>
                    <div className={styles.modalActions}>
                        <button type="button" onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles.primaryBtn}>Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// File Card Component
function FileCard({ file, isVideo, subfolder, deleteSubfolder, category, onUpload, onDelete, uploading, showLabel, fileCacheKeys }) {
    const inputId = `file-${file.name}-${subfolder || category}`;
    const fileKey = `${category || subfolder}-${file.name}`;

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            onUpload(selectedFile, file.name, subfolder, category);
        }
    };

    // Build delete path for R2: category/filename or subfolder/filename
    const deletePath = category 
        ? `${category}/${file.name}` 
        : deleteSubfolder 
            ? `${deleteSubfolder}/${file.name}`
            : subfolder 
                ? `${subfolder}/${file.name}` 
                : file.name;

    // Add cache-busting parameter to URL (only for this specific file)
    const fileCacheKey = fileCacheKeys[fileKey] || '';
    const mediaUrl = file.url ? `${file.url}${fileCacheKey ? `?v=${fileCacheKey}` : ''}` : '';

    return (
        <div className={styles.fileCard}>
            <div className={styles.filePreview}>
                {file.exists ? (
                    isVideo ? (
                        <video src={mediaUrl} className={styles.previewMedia} muted loop />
                    ) : (
                        <img src={mediaUrl} alt={file.name} className={styles.previewMedia} />
                    )
                ) : (
                    <div className={styles.placeholder}>
                        <span>{isVideo ? '🎬' : '🖼️'}</span>
                        <span>No file</span>
                    </div>
                )}
                {uploading && (
                    <div className={styles.uploadingOverlay}>
                        <div className={styles.spinner} />
                    </div>
                )}
            </div>
            <div className={styles.fileInfo}>
                <span className={styles.fileName}>
                    {showLabel && file.label ? file.label : file.name}
                </span>
                <div className={styles.fileActions}>
                    <label htmlFor={inputId} className={styles.uploadBtn}>
                        {file.exists ? '📤 Replace' : '📤 Upload'}
                    </label>
                    <input
                        id={inputId}
                        type="file"
                        accept={isVideo ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'}
                        onChange={handleFileSelect}
                        className={styles.hiddenInput}
                    />
                    {file.exists && (
                        <button onClick={() => onDelete(deletePath, subfolder, category, file.name)} className={styles.deleteBtn}>
                            🗑️
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminPage;
