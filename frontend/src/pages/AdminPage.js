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
                loadSectionData();
            }
        } catch (err) {
            console.error('Upload failed:', err);
        }
        setUploadingFile(null);
    };

    const handleDelete = async (filepath) => {
        if (!window.confirm('Delete this file?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/admin/media/${activeSection}/${filepath}`, {
                method: 'DELETE',
                headers: { 'X-Admin-Password': getAdminPassword() }
            });
            if (res.ok) loadSectionData();
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
function SectionEditor({ section, data, onUpload, onDelete, uploadingFile }) {
    const info = data.info;
    
    if (section === 'presets') {
        return (
            <>
                <SectionRequirements info={info} />
                <PresetsEditor data={data} onUpload={onUpload} onDelete={onDelete} uploadingFile={uploadingFile} />
            </>
        );
    }
    if (section === 'clothing-try-on') {
        return (
            <>
                <SectionRequirements info={info} />
                <TryOnEditor data={data} onUpload={onUpload} onDelete={onDelete} uploadingFile={uploadingFile} />
            </>
        );
    }
    return (
        <>
            <SectionRequirements info={info} />
            <StandardEditor section={section} data={data} onUpload={onUpload} onDelete={onDelete} uploadingFile={uploadingFile} />
        </>
    );
}

// Standard Section Editor (model-generation, photo-editing, live-photo)
function StandardEditor({ section, data, onUpload, onDelete, uploadingFile }) {
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
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// Try-On Editor (4 blocks × 3 images each)
function TryOnEditor({ data, onUpload, onDelete, uploadingFile }) {
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
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Presets Editor
function PresetsEditor({ data, onUpload, onDelete, uploadingFile }) {
    const [activeCategory, setActiveCategory] = useState('Portraits');

    return (
        <div className={styles.editorContainer}>
            <div className={styles.categoryTabs}>
                {Object.keys(data.files || {}).map(category => (
                    <button
                        key={category}
                        className={`${styles.categoryTab} ${activeCategory === category ? styles.activeCategoryTab : ''}`}
                        onClick={() => setActiveCategory(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>
            <div className={styles.filesGrid}>
                {(data.files?.[activeCategory] || []).map(file => (
                    <FileCard
                        key={file.name}
                        file={file}
                        isVideo={false}
                        category={activeCategory}
                        onUpload={onUpload}
                        onDelete={onDelete}
                        uploading={uploadingFile === file.name}
                    />
                ))}
            </div>
        </div>
    );
}

// File Card Component
function FileCard({ file, isVideo, subfolder, deleteSubfolder, category, onUpload, onDelete, uploading, showLabel }) {
    const inputId = `file-${file.name}-${subfolder || category}`;

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

    return (
        <div className={styles.fileCard}>
            <div className={styles.filePreview}>
                {file.exists ? (
                    isVideo ? (
                        <video src={file.url} className={styles.previewMedia} muted loop />
                    ) : (
                        <img src={file.url} alt={file.name} className={styles.previewMedia} />
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
                        <button onClick={() => onDelete(deletePath)} className={styles.deleteBtn}>
                            🗑️
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminPage;
