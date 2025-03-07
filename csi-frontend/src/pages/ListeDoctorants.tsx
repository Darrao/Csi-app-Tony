import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

const ListeDoctorants: React.FC = () => {
    const [doctorants, setDoctorants] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sendingProgress, setSendingProgress] = useState<number | null>(null);
    const [totalToSend, setTotalToSend] = useState(0);
    const [currentSent, setCurrentSent] = useState(0);
    const [filterStatus, setFilterStatus] = useState('Tous')


    const fetchDoctorants = async () => {
        try {
            console.log('[FRONTEND] Rafraîchissement des statuts côté backend...');
            await api.get('/doctorant/refresh-statuses');

            console.log('[FRONTEND] Récupération de la liste des doctorants...');
            const response = await api.get('/doctorant');
            setDoctorants(response.data);
        } catch (error) {
            console.error('[FRONTEND] Erreur lors de la récupération des doctorants :', error);
        }
    };

    useEffect(() => {
        fetchDoctorants();
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm('Voulez-vous vraiment supprimer ce doctorant ?')) {
            try {
                await api.delete(`/doctorant/${id}`);
                setDoctorants(doctorants.filter((doc: any) => doc._id !== id));
                alert('Doctorant supprimé avec succès !');
            } catch (error) {
                console.error('Erreur lors de la suppression du doctorant :', error);
                alert("Échec de la suppression.");
            }
        }
    };

    const handleSendEmail = async (id: string, email: string, prenom: string) => {
        if (!email) {
            alert('Cet utilisateur n\'a pas d\'email défini.');
            return;
        }
        try {
            await api.post(`/doctorant/send-link/${id}`, { email, prenom });
            console.log('Lien envoyé avec succès !');
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email :', error);
            alert('Erreur lors de l\'envoi de l\'email.');
        }
    };

    const handleExportPDF = async (id: string) => {
        try {
            const response = await api.get(`/doctorant/export/pdf/${id}`, {
                responseType: 'blob', // ✅ Permet d'obtenir un fichier PDF
            });
    
            const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
            const pdfUrl = URL.createObjectURL(pdfBlob);
    
            window.open(pdfUrl, '_blank'); // 🔥 Ouvre le PDF dans un nouvel onglet
    
        } catch (error) {
            console.error('❌ Erreur lors de l\'export du PDF :', error);
            alert('Échec de l\'export du PDF.');
        }
    };

    const handleResendReferentEmails = async (id: string) => {
        try {
            await api.post(`/doctorant/send-representant-tokens/${id}`);
            alert('Emails renvoyés aux référents avec succès !');
        } catch (error) {
            console.error('Erreur lors de l\'envoi des emails aux référents :', error);
            alert('Erreur lors de l\'envoi des emails aux référents.');
        }
    };

    
    const handleSendBulkEmails = async () => {
        const doctorantsToEmail = doctorants.filter((doc: any) => !doc.sendToDoctorant); // 🔍 Ne prendre que ceux qui n'ont pas reçu le mail
        const total = doctorantsToEmail.length;

        if (total === 0) {
            alert('Tous les doctorants ont déjà reçu un email.');
            return;
        }

        setTotalToSend(total);
        setCurrentSent(0);
        setSendingProgress(0);

        for (const doc of doctorantsToEmail) {
            const { _id, email, prenom } = doc; // 🔄 Récupération des données comme dans `handleSendEmail()`

            if (!email) {
                console.warn(`⏩ Aucun email pour ${prenom}, envoi ignoré.`);
                continue;
            }

            try {
                await handleSendEmail(_id, email, prenom); // 🔥 Réutilisation de `handleSendEmail()`

                setCurrentSent(prev => prev + 1);
                setSendingProgress((prev) => prev !== null ? ((prev + 1) / total) * 100 : 100);

                // 🔀 Délai pseudo-aléatoire autour de 10ms ± variation minime
                const delay = 10 + Math.random() * 5; // Entre 10 et 15 ms
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error) {
                console.error(`Erreur d'envoi pour ${prenom} :`, error);
            }
        }

        alert('Tous les emails ont été envoyés !');
        setSendingProgress(null);
        fetchDoctorants(); // Rafraîchir la liste après envoi
    };



    // 🔽 **Filtrage des doctorants selon le statut sélectionné**
    const filteredDoctorants = doctorants.filter((doc: any) =>
        (doc.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.ID_DOCTORANT.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterStatus === 'Tous' ||
            (filterStatus === 'Non envoyé au doctorant' && !doc.sendToDoctorant) ||
            (filterStatus === 'Envoyé au doctorant' && doc.sendToDoctorant) ||
            (filterStatus === 'Doctorant validé' && doc.doctorantValide) ||
            (filterStatus === 'Non validé par le doctorant' && !doc.doctorantValide) ||
            (filterStatus === 'Envoyé aux référents' && doc.sendToRepresentants) ||
            (filterStatus === 'Non envoyé aux référents' && !doc.sendToRepresentants) ||
            (filterStatus === 'Référents validés' && doc.representantValide) ||
            (filterStatus === 'Non validé par les référents' && !doc.representantValide))
    );


    return (
        <div>
            <h1>Liste des Doctorants</h1>

            {/* 🔍 Barre de recherche */}
            <input
                type="text"
                placeholder="Rechercher par nom ou ID_DOCTORANT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                    padding: '8px',
                    width: '300px',
                    marginBottom: '15px',
                    borderRadius: '5px',
                    border: '1px solid #ccc'
                }}
            />

            {/* 🔽 Filtre par statut */}
            <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px' }}
            >
                <option value="Tous">Tous</option>
                <option value="Non envoyé au doctorant">Non envoyé au doctorant</option>
                <option value="Envoyé au doctorant">Envoyé au doctorant</option>
                <option value="Doctorant validé">Validation par le doctorant</option>
                <option value="Non validé par le doctorant">Non validé par le doctorant</option>
                <option value="Envoyé aux référents">Envoyé aux référents</option>
                <option value="Non envoyé aux référents">Non envoyé aux référents</option>
                <option value="Référents validés">Validation par les référents</option>
                <option value="Non validé par les référents">Non validé par les référents</option>
            </select>

            <br />

            <button onClick={fetchDoctorants}>Rafraîchir</button>
            <button onClick={() => window.location.href = "http://localhost:3000/doctorant/export/csv"}>Exporter en CSV</button>
            <button onClick={() => window.location.href = "http://localhost:3000/doctorant/export/pdf"}>Exporter tous les PDF</button>
            <button onClick={handleSendBulkEmails} style={{ backgroundColor: '#007bff', color: 'white', marginLeft: '10px' }}>
                Envoyer un mail aux doctorants auxquels le mail n'a pas encore été envoyé
            </button>

            {/* 🔔 Affichage de la progression */}
            {sendingProgress !== null && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffecb5', borderRadius: '5px' }}>
                    <strong>Envoi en cours :</strong> {currentSent}/{totalToSend}
                    <br />
                    <progress value={sendingProgress} max={100} style={{ width: '100%' }}></progress>
                </div>
            )}


            <ul>
                {filteredDoctorants.map((doc: any) => (
                    <li key={doc._id} className='doctorant' style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className='doctorant-info'>
                        <div>
                            <strong>{doc.nom} {doc.prenom}</strong>
                            <br />
                            <span style={{ fontSize: '0.9em', color: '#666' }}>ID: {doc.ID_DOCTORANT}</span>
                            <br />
                            <span style={{ color: doc.statut === 'complet' ? 'green' : 'red' }}>{doc.statut}</span>
                        </div>

                        {/* Nouveaux champs de suivi */}
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div>
                                <span>Envoyé au doctorant :</span>
                                <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: doc.sendToDoctorant ? 'green' : 'red' }}></div>
                            </div>
                            <div>
                                <span>Validation par le doctorant :</span>
                                <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: doc.doctorantValide ? 'green' : 'red' }}></div>
                            </div>
                            <div>
                                <span>Envoyé aux référents :</span>
                                <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: doc.sendToRepresentants ? 'green' : 'red' }}></div>
                            </div>
                            <div>
                                <span>Validation par les référents :</span>
                                <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: doc.representantValide ? 'green' : 'red' }}></div>
                            </div>
                            <div>
                                <span>Nb envois au doctorant :</span> <strong>{doc.NbSendToDoctorant}</strong>
                            </div>
                            <div>
                                <span>Nb envois aux référents :</span> <strong>{doc.NbSendToRepresentants}</strong>
                            </div>
                        </div>
                        </div>

                        <div className="buttons" style={{ marginTop: '10px' }}>
                            <button onClick={() => handleSendEmail(doc._id, doc.email, doc.prenom)}>Renvoyer mail d'invitation au doctorant</button>

                            <button onClick={() => handleResendReferentEmails(doc._id)} style={{ marginLeft: '10px', backgroundColor: '#f0ad4e', color: 'white' }}>
                                Renvoyer mail avec rapport du doctorant aux référents
                            </button>

                            <button onClick={() => handleExportPDF(doc._id)}>Afficher PDF en fonction de l'état d'avancement du process</button>

                            <Link to={`/doctorant/modifier/${doc._id}`} style={{ marginLeft: '10px' }}>
                                <button>Modifier contenu du rapport du doctorant</button>
                            </Link>



                            <button onClick={() => handleDelete(doc._id)} style={{ marginLeft: '10px', color: 'red' }}>
                                Supprimer Doctorant
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ListeDoctorants;