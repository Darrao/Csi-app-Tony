import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import '../styles/ListeDoctorants.css';

type Doctorant = {
    _id: string;
    nom: string;
    prenom: string;
    email: string;
    email_HDR: string;
    emailMembre1?: string;
    emailMembre2?: string;
    emailAdditionalMembre?: string;
};

const ListeDoctorants: React.FC = () => {
    const [doctorants, setDoctorants] = useState<Doctorant[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sendingProgress, setSendingProgress] = useState<number | null>(null);
    const [totalToSend, setTotalToSend] = useState(0);
    const [currentSent, setCurrentSent] = useState(0);
    const [filterStatus, setFilterStatus] = useState('Tous')
    const [filterYear, setFilterYear] = useState('Tous'); // 🆕 Filtre par année
    const [availableYears, setAvailableYears] = useState<number[]>([]); // 🆕 Liste des années
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(1); // Défaut : 15 doctorants par page



    const fetchDoctorants = async () => {
        try {
            console.log('[FRONTEND] Rafraîchissement des statuts côté backend...');
            await api.get('/doctorant/refresh-statuses');

            console.log('[FRONTEND] Récupération de la liste des doctorants...');
            const response = await api.get('/doctorant');
            setDoctorants(response.data);
        
            // 🔄 Mise à jour des années disponibles
            const years = Array.from(new Set(response.data.map((doc: any) => doc.importDate)))
            .map(Number) // Convertir en nombres
            .sort((a, b) => b - a); // Trier du plus récent au plus ancien
            setAvailableYears(years);

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
        // 🔍 Recherche du doctorant concerné
        const doctorant = doctorants.find((doc) => doc._id === id);
        
        if (!doctorant) {
            alert("⚠️ Doctorant introuvable.");
            return;
        }
    
        // 📧 Vérification et récupération des emails des référents
        const emailsReferents = [
            doctorant.emailMembre1,
            doctorant.emailMembre2,
            doctorant.emailAdditionalMembre
        ].filter((email): email is string => Boolean(email && email.trim() !== "")); // Supprime les valeurs nulles/vides
    
        if (emailsReferents.length === 0) {
            alert(`❌ Aucun référent renseigné pour ${doctorant.prenom} ${doctorant.nom}.`);
            return;
        }
    
        try {
            console.log(`📩 Envoi des emails aux référents de ${doctorant.prenom} ${doctorant.nom}...`, emailsReferents);
    
            await api.post('/email/send', {
                emails: emailsReferents,
                doctorantPrenom: doctorant.prenom,
                doctorantEmail: doctorant.email,
                directeurTheseEmail: doctorant.email_HDR
            });
    
            alert(`✅ Emails envoyés avec succès aux référents de ${doctorant.prenom} ${doctorant.nom} !`);
        } catch (error) {
            console.error(`❌ Erreur lors de l'envoi des emails aux référents de ${doctorant.prenom} ${doctorant.nom} :`, error);
            alert("⚠️ Échec de l'envoi des emails aux référents.");
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

    const handleSendEmailsToUncontactedReferents = async () => {
        // 📌 Filtrer les doctorants dont les référents n'ont pas encore été contactés
        const doctorantsWithoutReferentEmails = doctorants.filter((doc: any) => !doc.sendToRepresentants);
        const total = doctorantsWithoutReferentEmails.length;
    
        if (total === 0) {
            alert('✅ Tous les référents ont déjà été contactés.');
            return;
        }
    
        setTotalToSend(total);
        setCurrentSent(0);
        setSendingProgress(0);
    
        for (const doc of doctorantsWithoutReferentEmails) {
            const { _id, prenom, email, email_HDR, emailMembre1, emailMembre2, emailAdditionalMembre } = doc;
    
            // 📧 Liste des emails des référents (exclut les valeurs nulles ou vides)
            const referentsEmails = [emailMembre1, emailMembre2, emailAdditionalMembre].filter(
                (email): email is string => Boolean(email && email.trim() !== "")
            );
    
            if (referentsEmails.length === 0) {
                console.warn(`⏩ Aucun référent pour ${prenom}, envoi ignoré.`);
                continue;
            }
    
            try {
                console.log(`📩 Envoi des emails aux référents de ${prenom}...`, referentsEmails);
    
                await api.post('/email/send', {
                    emails: referentsEmails,
                    doctorantPrenom: prenom,
                    doctorantEmail: email,
                    directeurTheseEmail: email_HDR
                });
    
                setCurrentSent((prev) => prev + 1);
                setSendingProgress((prev) => prev !== null ? ((prev + 1) / total) * 100 : 100);
    
                // 🔀 Délai pseudo-aléatoire entre 10 et 15 ms
                const delay = 10 + Math.random() * 5;
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error) {
                console.error(`❌ Erreur d'envoi aux référents de ${prenom} :`, error);
            }
        }
    
        alert('📨 Tous les emails ont été envoyés aux référents des doctorants non contactés !');
        setSendingProgress(null);
        fetchDoctorants(); // 🔄 Rafraîchir la liste après envoi
    };

    const handleExportFilteredCSV = () => {
        if (filteredDoctorants.length === 0) {
            alert("Aucun doctorant correspondant aux filtres sélectionnés.");
            return;
        }
    
        // Définition des colonnes pour l'export
        const headers = [
            "Nom", "Prénom", "Email", "ID_DOCTORANT", "Année d'importation",
            "Envoyé au doctorant", "Validation par le doctorant",
            "Envoyé aux référents", "Validation par les référents"
        ];
    
        // Création des lignes du CSV
        const csvRows = [
            headers.join(";"), // Première ligne : les entêtes
            ...filteredDoctorants.map((doc: any) => [
                doc.nom, doc.prenom, doc.email, doc.ID_DOCTORANT, doc.importDate,
                doc.sendToDoctorant ? "Oui" : "Non",
                doc.doctorantValide ? "Oui" : "Non",
                doc.sendToRepresentants ? "Oui" : "Non",
                doc.representantValide ? "Oui" : "Non"
            ].join(";"))
        ];
    
        // Conversion en blob pour le téléchargement
        const csvBlob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const csvUrl = URL.createObjectURL(csvBlob);
    
        // Création d'un lien de téléchargement temporaire
        const a = document.createElement("a");
        a.href = csvUrl;
        a.download = `Doctorants_Filtrés_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    
        // Nettoyage de l'URL Blob
        URL.revokeObjectURL(csvUrl);
    };


    // 🔽 **Filtrage des doctorants selon le statut, l'année et le département**
    const filteredDoctorants = doctorants.filter((doc: any) =>
        (doc.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.ID_DOCTORANT.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterYear === 'Tous' || doc.importDate === Number(filterYear)) &&
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

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= Math.ceil(filteredDoctorants.length / itemsPerPage)) {
            setCurrentPage(newPage);
        }
    };

    const paginatedDoctorants = filteredDoctorants.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleDeleteAll = async () => {
        if (!window.confirm('⚠️ ATTENTION : Cette action supprimera TOUS les doctorants !\n\nVoulez-vous vraiment continuer ?')) {
            return;
        }
    
        if (!window.confirm('🚨 DERNIÈRE CHANCE : Cette suppression est IRRÉVERSIBLE !\n\nÊtes-vous VRAIMENT sûr(e) de vouloir tout supprimer ?')) {
            return;
        }
    
        if (!window.confirm('🔥 ULTIME CONFIRMATION : Vous allez supprimer **TOUS** les doctorants.\n\nIl sera impossible de récupérer les données après cette action.\n\nContinuer ?')) {
            return;
        }
    
        const confirmationText = prompt('❌ TAPEZ "SUPPRIMER" POUR CONFIRMER ❌\n\nCette action est DÉFINITIVE !\n\nSi vous ne souhaitez pas supprimer, cliquez sur "Annuler".');
        if (confirmationText !== "SUPPRIMER") {
            alert("❎ Suppression annulée. Aucun doctorant n'a été supprimé.");
            return;
        }
    
        try {
            await api.delete('/doctorant'); // Requête DELETE vers l'API
            setDoctorants([]); // Vider la liste côté frontend
            alert('✅ Tous les doctorants ont été supprimés avec succès !');
        } catch (error) {
            console.error('❌ Erreur lors de la suppression des doctorants :', error);
            alert("⚠️ Échec de la suppression. Vérifiez la connexion et réessayez.");
        }
    };


    return (
        <div className="liste-doctorants-container">
            <h1 className="liste-doctorants-title">Liste des Doctorants</h1>

            {/* 🔍 Barre de recherche */}
            <div className="search-container">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Rechercher par nom ou ID_DOCTORANT..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* 🔽 Filtre par année */}
                <select
                    className="filter-select"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px' }}
                >
                    <option value="Tous">Toutes les années</option>
                    {availableYears.map((year) => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
                {/* 🔽 Filtre par statut */}
                <select
                    className="filter-select"
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
            </div>

            <div className="actions-container">
                <button className="btn btn-refresh" onClick={fetchDoctorants}>🔄 Rafraîchir</button>
                <button className="btn btn-export" onClick={() => window.location.href = "http://localhost:3000/doctorant/export/csv"}>📂 Exporter en CSV</button>
                <button className="btn btn-export-filtered" onClick={handleExportFilteredCSV}>📊 Exporter les doctorants filtrés en CSV</button>
                <button className="btn btn-export-pdf" onClick={() => window.location.href = "http://localhost:3000/doctorant/export/pdf"}>📑 Exporter tous les PDF</button>
                <button className="btn btn-send-bulk" onClick={handleSendBulkEmails}>📩 Envoyer un mail aux doctorants non contactés</button>
                <button className="btn btn-send-bulk" onClick={handleSendEmailsToUncontactedReferents}>📩 Envoyer un mail aux référents non contactés</button>
            </div>

            {/* 🔔 Affichage de la progression */}
            {sendingProgress !== null && (
                <div className="progress-container">
                    <strong>📨 Envoi en cours :</strong> {currentSent}/{totalToSend}
                    <br />
                    <progress className="progress-bar" value={sendingProgress} max={100}></progress>
                </div>
            )}


            {/* 🔢 Paramètres d'affichage */}
            <div className="pagination-settings">
                <label>Afficher : </label>
                <select
                    className="select-items-per-page"
                    value={itemsPerPage}
                    onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                    }}
                >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={5}>5</option>
                </select>
            </div>


            {/* 📋 Liste des doctorants */}
            <div className="table-container">
            <ul className="doctorants-list">
                {paginatedDoctorants.map((doc: any) => (
                    <li key={doc._id} className="doctorant-item">
                        <div className='doctorant-info'>
                            <strong>{doc.nom} {doc.prenom}</strong>
                            <br />
                            <span style={{ fontSize: '0.9em', color: '#666' }}>ID: {doc.ID_DOCTORANT}</span>
                            <br />
                            <span style={{ color: doc.statut === 'complet' ? 'green' : 'red' }}>{doc.statut}</span>
                        {/* Nouveaux champs de suivi */}
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div className='status'>
                                <span>Envoyé au doctorant :</span>
                                <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: doc.sendToDoctorant ? 'green' : 'red' }}></div>
                            </div>
                            <div className='status'>
                                <span>Validation par le doctorant :</span>
                                <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: doc.doctorantValide ? 'green' : 'red' }}></div>
                            </div>
                            <div className='status'>
                                <span>Envoyé aux référents :</span>
                                <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: doc.sendToRepresentants ? 'green' : 'red' }}></div>
                            </div>
                            <div className='status'>
                                <span>Validation par les référents :</span>
                                <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: doc.representantValide ? 'green' : 'red' }}></div>
                            </div>
                            <div className='status'>
                                <span>Envoyé au directeur de département :</span>
                                <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: doc.gestionnaireDirecteurValide ? 'green' : 'red' }}></div>
                            </div>
                            <div className='status-envois'>
                                <div className='envois up'>
                                    <span>Nb envois au doctorant :</span> <strong>{doc.NbSendToDoctorant}</strong>
                                </div>
                                <div className='envois'>
                                    <span>Nb envois aux référents :</span> <strong>{doc.NbSendToRepresentants}</strong>
                                </div>
                            </div>
                        </div>
                        </div>

                        <div className="action-buttons" style={{ marginTop: '10px' }}>
                            <div className="btn-group">
                                <button className="btn btn-primary btn-doctorant" onClick={() => handleSendEmail(doc._id, doc.email, doc.prenom)}>Renvoyer mail d'invitation au doctorant</button>

                                <button className="btn btn-primary btn-doctorant" onClick={() => handleResendReferentEmails(doc._id)}>
                                    Renvoyer mail avec rapport du doctorant aux référents
                                </button>

                                <button className="btn btn-primary btn-doctorant" onClick={() => handleExportPDF(doc._id)}>Afficher PDF en fonction de l'état d'avancement du process</button>

                                <Link to={`/doctorant/modifier/${doc._id}`}>
                                    <button className="btn btn-primary btn-doctorant">Modifier contenu du rapport du doctorant</button>
                                </Link>
                            </div>



                            <button onClick={() => handleDelete(doc._id)} className="btn btn-danger">
                                Supprimer Doctorant
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
            </div>
            {/* 📌 Pagination */}
            <div className="pagination-container">
                <button className="pagination-btn" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                    ◀
                </button>
                <span className="pagination-text">{currentPage} / {Math.ceil(filteredDoctorants.length / itemsPerPage)}</span>
                <button className="pagination-btn" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === Math.ceil(filteredDoctorants.length / itemsPerPage)}>
                    ▶
                </button>
            </div>
            <div>
                <button onClick={handleDeleteAll} className="btn btn-danger btn-delete-all">
                    Supprimer tous les doctorants
                </button>
            </div>
        </div>
    );
};

export default ListeDoctorants;