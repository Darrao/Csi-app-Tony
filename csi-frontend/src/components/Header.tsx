import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // ✅ Import du contexte d'auth
import { CSSProperties } from 'react';

const Header: React.FC = () => {
    const navigate = useNavigate(); 
    const { logout } = useAuth(); // ✅ Récupération de la fonction logout du contexte

    const handleLogout = () => {
        logout(); // ✅ Supprime le token et met à jour l'état global
        navigate('/login'); // ✅ Redirection vers la page de connexion
    };

    const headerStyles: CSSProperties = {
        backgroundColor: '#333030',
        padding: '1rem',
        textAlign: 'center',
    };

    const navStyles: CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 2rem',
    };

    const linkContainerStyles: CSSProperties = {
        display: 'flex',
        gap: '1.5rem',
    };

    const linkStyles: CSSProperties = {
        color: 'white',
        textDecoration: 'none',
        fontSize: '1.2rem',
    };

    const logoutButtonStyles: CSSProperties = {
        backgroundColor: '#ff4d4d',
        color: 'white',
        border: 'none',
        padding: '0.5rem 1rem',
        fontSize: '1.2rem',
        cursor: 'pointer',
        borderRadius: '5px',
    };

    return (
        <header style={headerStyles}>
            <nav style={navStyles}>
                <div style={linkContainerStyles}>
                    <Link to="/" style={linkStyles}>Importer CSV</Link>
                    <Link to="/doctorants" style={linkStyles}>Liste des Doctorants</Link>
                    <Link to="/email-config" style={linkStyles}>Configuration Email</Link>
                </div>
                <button style={logoutButtonStyles} onClick={handleLogout}>Logout</button>
            </nav>
        </header>
    );
};

export default Header;