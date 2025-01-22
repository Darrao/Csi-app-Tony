import React from 'react';
import { Link } from 'react-router-dom';
import { CSSProperties } from 'react';

const Header: React.FC = () => {
    const headerStyles: CSSProperties = {
        backgroundColor: '#282c34',
        padding: '1rem',
        textAlign: 'center',
    };

    const navStyles: CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        gap: '1.5rem',
    };

    const linkStyles: CSSProperties = {
        color: '#61dafb',
        textDecoration: 'none',
        fontSize: '1.2rem',
    };

    return (
        <header style={headerStyles}>
            <nav style={navStyles}>
                <Link to="/" style={linkStyles}>Formulaire</Link>
                <Link to="/doctorants" style={linkStyles}>Liste des Doctorants</Link>
            </nav>
        </header>
    );
};

export default Header;