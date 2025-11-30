import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Navbar.module.css'; // Импортируем CSS модуль

// NEW: Dashboard button definitions
const dashboardButtons = [
    { key: 'editPhoto', label: 'Edit Photo', path: '/dashboard#editPhoto' },
    { key: 'modelPhoto', label: 'Model Photo', path: '/dashboard#modelPhoto' },
    { key: 'descriptionGeneration', label: 'Text to Image', path: '/dashboard#descriptionGeneration' },
    { key: 'clothingTryOn', label: 'Clothing Try-On', path: '/dashboard#clothingTryOn' },
    { key: 'upscale', label: 'Upscale', path: '/dashboard#upscale' },
    { key: 'livePhoto', label: 'Live Photo', path: '/dashboard#livePhoto' },
];

function Navbar() {
    const { isAuthenticated, isLoading, user, logout } = useAuth();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const profileRef = useRef(null);
    
    // Функция для определения активной ссылки
    const isActive = (path) => {
        return location.pathname === path ? styles.active : '';
    };

    // Функция для переключения мобильного меню
    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    // Функция для закрытия мобильного меню (используется при клике на ссылку)
    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    // Закрытие дропдауна при клике вне его области
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setProfileDropdownOpen(false);
            }
        }
        // Добавляем слушатель
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            // Убираем слушатель при размонтировании
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [profileRef]);

    // NEW: Effect to close mobile menu on window resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) { // Match the CSS breakpoint
                setMobileMenuOpen(false);
            }
        };

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Call handler right away so state is correct on initial load
        handleResize();

        // Remove event listener on cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []); // Empty array ensures effect is only run on mount and unmount

    // Функция для переключения дропдауна профиля
    const toggleProfileDropdown = () => {
        setProfileDropdownOpen(!profileDropdownOpen);
    };

    // Пока идет начальная загрузка статуса, можно ничего не показывать или показать заглушку
    if (isLoading) {
        return (
            <nav className={styles.navbar}>
                <div className={styles.navSection}>
                    <Link to="/" className={styles.logo}>
                        <span className={`${styles.logoText} ${styles.colorfulLogoText}`} data-text="MyPhotoAI">MyPhotoAI</span>
                    </Link>
                </div>
                <div className={styles.navSection}>
                    <span>Loading...</span>
                </div>
            </nav>
        );
    }

    return (
        <nav className={styles.navbar}>
            {/* Левая секция с логотипом */}
            <div className={styles.navSection}>
                <Link 
                    to={isAuthenticated ? "/dashboard" : "/"} 
                    className={styles.logo} 
                    onClick={closeMobileMenu}
                >
                    <span className={`${styles.logoText} ${styles.colorfulLogoText}`} data-text="MyPhotoAI">MyPhotoAI</span>
                </Link>
            </div>

            {/* --- Контейнер для правых контролов на мобильном --- */}
            <div className={styles.mobileControls}> 
                {/* --- Отображение баланса для МОБИЛЬНЫХ --- */} 
                {isAuthenticated && (
                    <div className={styles.mobileBalanceDisplay}>
                        <Link to="/billing" className={styles.balanceLink}>
                            <div className={styles.balanceDisplayContent}>
                                <svg className={styles.balanceIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" fill="#FFD700" stroke="#E6B800"/>
                                    <path d="M12 6l1.5 4.5H18l-3.75 3 1.5 4.5L12 15l-3.75 3 1.5-4.5L6 10.5h4.5L12 6z" fill="#FFFFFF" stroke="#E6B800"/>
                                </svg>
                                <span className={styles.balanceAmount}>{user?.balance_points ?? 0}</span>
                            </div>
                        </Link>
                    </div>
                )}
                {/* --- Конец мобильного баланса --- */}

                {/* Кнопка меню для мобильных устройств */} 
                <button 
                    className={styles.mobileMenuButton} 
                    onClick={toggleMobileMenu}
                    aria-label="Toggle menu"
                >
                    <div className={`${styles.hamburger} ${mobileMenuOpen ? styles.open : ''}`}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </button>
            </div>
            {/* --- Конец контейнера для правых контролов --- */}
            
            {/* Навигационные ссылки и аутентификация (обернуты для мобильного меню) */}
            <div className={`${styles.navContent} ${mobileMenuOpen ? styles.open : ''}`}>
                {/* Навигационные ссылки */}
                <div className={styles.navLinks}>
                    {/* Ссылки для НЕаутентифицированных пользователей */} 
                    {!isAuthenticated && (
                        <>
                            <Link to="/" className={`${styles.navLink} ${isActive('/')}`} onClick={closeMobileMenu}>Home</Link>
                            <Link to="/pricing" className={`${styles.navLink} ${isActive('/pricing')}`} onClick={closeMobileMenu}>Pricing</Link>
                        </>
                    )}
                    {/* Ссылки для АУТЕНТИФИЦИРОВАННЫХ пользователей */} 
                    {/* Старые ссылки здесь убраны, так как они были пустыми */}
                    {/* --- NEW: Dashboard Buttons for Mobile Menu --- */} 
                    {isAuthenticated && mobileMenuOpen && (
                        <div className={styles.mobileDashboardLinks}>
                            {dashboardButtons.map(button => (
                                <Link 
                                    key={button.key}
                                    to={button.path}
                                    className={styles.mobileDashboardLink} // Use a new class for styling
                                    onClick={closeMobileMenu} // Close menu on click
                                >
                                    {button.label}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Правая секция (аутентификация) */}
                <div className={styles.authSection} ref={profileRef}>
                    {isAuthenticated ? (
                        <div className={styles.profileContainer}>
                            {/* --- Отображение баланса для ДЕСКТОПА --- */}
                            <div className={styles.desktopBalanceDisplay}> {/* Контейнер для десктопного баланса */} 
                                <Link to="/billing" className={styles.balanceLink}>
                                    <div className={styles.balanceDisplayContent}> {/* Внутренний контент баланса */} 
                                        <svg className={styles.balanceIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" fill="#FFD700" stroke="#E6B800"/>
                                            <path d="M12 6l1.5 4.5H18l-3.75 3 1.5 4.5L12 15l-3.75 3 1.5-4.5L6 10.5h4.5L12 6z" fill="#FFFFFF" stroke="#E6B800"/>
                                        </svg>
                                        <span className={styles.balanceAmount}>{user?.balance_points ?? 0}</span>
                                    </div>
                                </Link>
                            </div>
                             {/* --- Конец десктопного баланса --- */}
                            <button onClick={toggleProfileDropdown} className={styles.profileButton}>
                                Welcome, {user?.email}
                                <span className={`${styles.dropdownArrow} ${profileDropdownOpen ? styles.open : ''}`}>▼</span>
                            </button>
                            {/* Условие изменено: показываем если (открыто мобильное меню) ИЛИ (открыт дропдаун на десктопе) */}
                            {profileDropdownOpen && (
                                <div className={styles.profileDropdown}>
                                    <div className={styles.dropdownItem}>Email: {user?.email}</div>
                                    <div className={styles.dropdownItem}>Subscription: {user?.subscriptionPlan || 'Free Plan'}</div>
                                    <Link 
                                        to="/account"
                                        className={styles.dropdownLink}
                                        onClick={() => { closeMobileMenu(); setProfileDropdownOpen(false); }}
                                    >
                                        My Account & Subscription
                                    </Link>
                                    <button 
                                        onClick={() => { logout(); closeMobileMenu(); setProfileDropdownOpen(false); }} 
                                        className={styles.dropdownLogoutButton}
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={styles.authButtons}>
                            <Link to="/login" className={styles.signInButton} onClick={closeMobileMenu}>Sign In</Link>
                            <Link to="/register" className={styles.signUpButton} onClick={closeMobileMenu}>Sign Up</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar; 