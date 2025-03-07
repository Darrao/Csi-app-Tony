import React, { useState } from 'react';
import api from '../services/api';

const ImportCSVAndSendEmail: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [emails, setEmails] = useState('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setFile(event.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            alert('Veuillez sélectionner un fichier CSV.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/doctorant/import-csv', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert('Importation réussie !');
            console.log('Résultat:', response.data);
        } catch (error) {
            console.error('Erreur lors de l’importation du CSV :', error);
            alert('Échec de l’importation.');
        }
    };

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
            console.error("Erreur lors de l'envoi des emails :", error);
            alert("Erreur lors de l'envoi des emails.");
        }
    };

    return (
        <div>
            <h1>Importer un fichier CSV et Envoyer des Emails</h1>
            
            {/* Section d'importation CSV */}
            <div style={{ marginBottom: '20px' }}>
                <h2>Importer un fichier CSV</h2>
                <input type="file" accept=".csv" onChange={handleFileChange} />
                <button onClick={handleUpload} style={{ marginTop: '10px', padding: '10px 20px', fontSize: '16px' }}>
                    Importer
                </button>
            </div>
        </div>
    );
};

export default ImportCSVAndSendEmail;
