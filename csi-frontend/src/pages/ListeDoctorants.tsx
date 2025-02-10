import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

const ListeDoctorants: React.FC = () => {
    const [doctorants, setDoctorants] = useState([]);

    const fetchDoctorants = async () => {
        try {
            console.log('[FRONTEND] Rafraîchissement des statuts côté backend...');
            const refreshResponse = await api.get('/doctorant/refresh-statuses');
            console.log('[FRONTEND] Réponse de refresh-statuses :', refreshResponse.data);

            console.log('[FRONTEND] Récupération de la liste des doctorants...');
            const response = await api.get('/doctorant');
            console.log('[FRONTEND] Liste des doctorants récupérée :', response.data);

            setDoctorants(response.data);
        } catch (error) {
            console.error('[FRONTEND] Erreur lors de la récupération des doctorants :', error);
        }
    };

    useEffect(() => {
        fetchDoctorants();
    }, []);

    const handleRefresh = async () => {
        console.log('Rafraîchissement des données...');
        await fetchDoctorants();
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/doctorant/${id}`);
            setDoctorants(doctorants.filter((doc: any) => doc._id !== id));
        } catch (error) {
            console.error('Erreur lors de la suppression du doctorant :', error);
        }
    };

    const handleSendEmail = async (id: string, email: string) => {
        if (!email) {
            alert('Cet utilisateur n\'a pas d\'email défini.');
            return;
        }

        try {
            await api.post(`/doctorant/send-link/${id}`, { email });
            alert('Lien envoyé avec succès !');
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email :', error);
            alert('Erreur lors de l\'envoi de l\'email.');
        }
    };

    const handleSendEmailToReferents = async (id: string, referents: { representantEmail1: string; representantEmail2: string }) => {
        if (!referents.representantEmail1 && !referents.representantEmail2) {
            alert('Aucun email référent défini pour cet utilisateur.');
            return;
        }
    
        try {
            await api.post(`/doctorant/send-representant-tokens/${id}`, {
                email1: referents.representantEmail1,
                email2: referents.representantEmail2,
            });
            alert('Emails envoyés avec succès aux référents !');
    
            // Recharge les données après l'envoi
            await fetchDoctorants();
        } catch (error) {
            console.error('Erreur lors de l\'envoi des emails aux référents :', error);
            alert('Erreur lors de l\'envoi des emails aux référents.');
        }
    };

    const handleReminderEmail = async (email: string) => {
        if (!email) {
            alert("Impossible d'envoyer un rappel : pas d'email.");
            return;
        }
        
        try {
            await api.post('/doctorant/send-reminder', { email });
            alert("Rappel envoyé avec succès !");
        } catch (error) {
            console.error("Erreur lors de l'envoi du rappel :", error);
            alert("Erreur lors de l'envoi du rappel.");
        }
    };

    const handleExportPDF = async (id: string) => {
        // Création du lien de téléchargement
        const pdfUrl = `http://localhost:3000/doctorant/export/pdf/${id}`;
        window.open(pdfUrl, '_blank');
    };

    return (
        <div>
            <h1>Liste des Doctorants</h1>
            <button onClick={handleRefresh}>Rafraîchir</button>
            <button onClick={() => window.location.href = "http://localhost:3000/doctorant/export/csv"}>Exporter en CSV</button>
            <button onClick={() => window.location.href = "http://localhost:3000/doctorant/export/pdf"}>Exporter tous les PDF</button>
            <ul>
            {doctorants.map((doc: any) => (
                <li key={doc._id}>
                    <strong>{doc.nom} {doc.prenom}</strong> - {doc.titreThese}
                    <span style={{ color: doc.statut === 'complet' ? 'green' : 'red' }}>
                        {doc.statut}
                    </span>
                    <button onClick={() => handleSendEmail(doc._id, doc.email)}>Envoyer un email</button>
                    <button 
                        onClick={() => handleSendEmailToReferents(doc._id, { 
                            representantEmail1: doc.representantData?.representantEmail1, 
                            representantEmail2: doc.representantData?.representantEmail2 
                        })}
                    >
                        Envoyer aux Référents
                    </button>
                    {doc.statut === 'en attente' && (
                        <button onClick={() => handleReminderEmail(doc.email)}>Rappeler le doctorant</button>
                    )}
                    <button onClick={() => handleExportPDF(doc._id)}>Exporter PDF</button>
                </li>
            ))}
            </ul>
        </div>
    );
};

export default ListeDoctorants;