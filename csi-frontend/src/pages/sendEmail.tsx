import React, { useState } from 'react';
import api from '../services/api';

const SendEmail: React.FC = () => {
    const [emails, setEmails] = useState('');

    const handleSendEmails = async () => {
        if (!emails) {
            alert('Veuillez entrer au moins un email.');
            return;
        }

        const emailList = emails.split(',').map(email => email.trim());
        try {
            await api.post('/email/send', { emails: emailList });
            console.log('Emails envoyés au backend:', emailList);
            alert('Emails envoyés avec succès !');
            setEmails('');
        } catch (error) {
            console.error('Erreur lors de l\'envoi des emails :', error);
            alert('Erreur lors de l\'envoi des emails.');
        }
    };

    return (
        <div>
            <h1>Envoyer des Emails</h1>
            <textarea
                rows={5}
                placeholder="Entrez les emails séparés par une virgule"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '16px' }}
            />
            <button onClick={handleSendEmails} style={{ marginTop: '10px', padding: '10px 20px', fontSize: '16px' }}>
                Envoyer
            </button>
        </div>
    );
};

export default SendEmail;