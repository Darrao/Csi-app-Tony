import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ModifierDoctorantAdmin: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [doctorant, setDoctorant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchDoctorant = async () => {
            try {
                const response = await api.get(`/doctorant/${id}`);
                setDoctorant(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Erreur lors de la récupération du doctorant :", err);
                setError("Erreur lors du chargement des données.");
                setLoading(false);
            }
        };

        fetchDoctorant();
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setDoctorant({ ...doctorant, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setError(null);

        try {
            await api.put(`/doctorant/${id}`, doctorant);
            setMessage("Modifications enregistrées avec succès !");
        } catch (err) {
            console.error("Erreur lors de la mise à jour :", err);
            setError("Échec de la mise à jour.");
        }
    };

    return (
        <div>
            <h1>Modifier Doctorant</h1>

            {loading && <p>Chargement des données...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {message && <p style={{ color: 'green' }}>{message}</p>}

            {doctorant && (
                <form onSubmit={handleSubmit}>
                    <h2>Informations personnelles</h2>
                    <label>Prénom :</label>
                    <input type="text" name="prenom" value={doctorant.prenom || ''} onChange={handleChange} />

                    <label>Nom :</label>
                    <input type="text" name="nom" value={doctorant.nom || ''} onChange={handleChange} />

                    <label>Email :</label>
                    <input type="email" name="email" value={doctorant.email || ''} onChange={handleChange} />

                    <label>Date de première inscription :</label>
                    <input type="date" name="datePremiereInscription" value={doctorant.datePremiereInscription?.split('T')[0] || ''} onChange={handleChange} />

                    <h2>Thèse & Encadrement</h2>
                    <label>Titre de la thèse :</label>
                    <input type="text" name="titreThese" value={doctorant.titreThese || ''} onChange={handleChange} />

                    <label>Intitulé UR :</label>
                    <input type="text" name="intituleUR" value={doctorant.intituleUR || ''} onChange={handleChange} />

                    <label>Directeur UR :</label>
                    <input type="text" name="directeurUR" value={doctorant.directeurUR || ''} onChange={handleChange} />

                    <label>Directeur de Thèse :</label>
                    <input type="text" name="directeurThese" value={doctorant.directeurThese || ''} onChange={handleChange} />

                    <label>Co-Directeur de Thèse :</label>
                    <input type="text" name="coDirecteurThese" value={doctorant.coDirecteurThese || ''} onChange={handleChange} />

                    <h2>Équipe</h2>
                    <label>Intitulé Équipe :</label>
                    <input type="text" name="intituleEquipe" value={doctorant.intituleEquipe || ''} onChange={handleChange} />

                    <label>Directeur Équipe :</label>
                    <input type="text" name="directeurEquipe" value={doctorant.directeurEquipe || ''} onChange={handleChange} />

                    <h2>Membres du Comité de Suivi</h2>
                    <label>Membre 1 :</label>
                    <input type="text" name="nomMembre1" value={doctorant.nomMembre1 || ''} onChange={handleChange} />
                    <input type="email" name="emailMembre1" value={doctorant.emailMembre1 || ''} onChange={handleChange} />

                    <label>Membre 2 :</label>
                    <input type="text" name="nomMembre2" value={doctorant.nomMembre2 || ''} onChange={handleChange} />
                    <input type="email" name="emailMembre2" value={doctorant.emailMembre2 || ''} onChange={handleChange} />

                    <h2>Activités scientifiques</h2>
                    <label>Publications :</label>
                    <textarea name="publications" value={doctorant.publications || ''} onChange={handleChange} />

                    <label>Conférences :</label>
                    <textarea name="conferencePapers" value={doctorant.conferencePapers || ''} onChange={handleChange} />

                    <label>Posters :</label>
                    <textarea name="posters" value={doctorant.posters || ''} onChange={handleChange} />

                    <label>Communication publique :</label>
                    <textarea name="publicCommunication" value={doctorant.publicCommunication || ''} onChange={handleChange} />

                    <h2>Modules</h2>
                    <label>Heures Modules Scientifiques :</label>
                    <input type="number" name="nbHoursScientificModules" value={doctorant.nbHoursScientificModules || 0} onChange={handleChange} />

                    <label>Heures Modules Transversaux :</label>
                    <input type="number" name="nbHoursCrossDisciplinaryModules" value={doctorant.nbHoursCrossDisciplinaryModules || 0} onChange={handleChange} />

                    <label>Heures Modules d’Insertion :</label>
                    <input type="number" name="nbHoursProfessionalIntegrationModules" value={doctorant.nbHoursProfessionalIntegrationModules || 0} onChange={handleChange} />

                    <h2>État de validation</h2>
                    <label>Date de validation :</label>
                    <input type="date" name="dateValidation" value={doctorant.dateValidation?.split('T')[0] || ''} onChange={handleChange} />

                    <label>Statut :</label>
                    <select name="statut" value={doctorant.statut || ''} onChange={handleChange}>
                        <option value="en attente">En attente</option>
                        <option value="complet">Complet</option>
                    </select>

                    <button type="submit">Mettre à jour</button>
                    <button type="button" onClick={() => navigate('/doctorants')} style={{ marginLeft: '10px' }}>Retour</button>
                </form>
            )}
        </div>
    );
};

export default ModifierDoctorantAdmin;