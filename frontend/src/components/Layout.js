import React from 'react';
import Navbar from './Navbar'; // Импортируем Navbar
import Footer from './Footer'; // Импортируем Footer
import styles from '../App.module.css'; // Импортируем стили App для mainContent
import { useLocation } from 'react-router-dom'; // Нужен для определения, показывать ли Footer

// Компонент Layout теперь отвечает за Navbar, Footer и основное содержимое
function Layout({ children }) {
    const location = useLocation();
    const isDashboard = location.pathname === '/dashboard';
    const showFooter = !isDashboard;
    const containerClass = isDashboard ? `${styles.appContainer} ${styles.dashboardLayout}` : styles.appContainer;

    return (
        <div className={containerClass}>
            <Navbar />
            {/* Основной контент передается как children */} 
            {children} 
            {/* Условно рендерим Footer */} 
            {showFooter && <Footer />}
        </div>
    );
}

export default Layout; 