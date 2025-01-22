import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

const ListeDoctorants: React.FC = () => {
    const [doctorants, setDoctorants] = useState([]);

    const fetchDoctorants = async () => {
        try {
            const response = await api.get('/doctorant');
            setDoctorants(response.data);
        } catch (error) {
            console.error('Erreur lors de la récupération des doctorants :', error);
        }
    };

    useEffect(() => {
        fetchDoctorants();
    }, []);

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

    const handleSendEmailToReferents = async (id: string, referents: { email1: string; email2: string }) => {
        if (!referents.email1 && !referents.email2) {
            alert('Aucun email référent défini pour cet utilisateur.');
            return;
        }

        try {
            await api.post(`/doctorant/send-representant-tokens/${id}`, {
                email1: referents.email1,
                email2: referents.email2,
            });
            alert('Emails envoyés avec succès aux référents !');
        } catch (error) {
            console.error('Erreur lors de l\'envoi des emails aux référents :', error);
            alert('Erreur lors de l\'envoi des emails aux référents.');
        }
    };

    return (
        <div>
            <h1>Liste des Doctorants</h1>
            <ul>
                {doctorants.map((doc: any) => (
                    <li key={doc._id}>
                        <strong>{doc.nom} {doc.prenom}</strong> - {doc.titreThese}
                        <button onClick={() => handleDelete(doc._id)}>Supprimer</button>
                        <Link to={`/modifier/${doc._id}`}>Modifier</Link>
                        <button onClick={() => handleSendEmail(doc._id, doc.email)}>Envoyer un email</button>
                        <button onClick={() => handleSendEmailToReferents(doc._id, { email1: doc.representant1, email2: doc.representant2 })}>
                            Envoyer aux Référents
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ListeDoctorants;