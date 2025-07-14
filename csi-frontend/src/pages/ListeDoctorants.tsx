import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import '../styles/ListeDoctorants.css';
import config from '../config';

type Doctorant = {
    _id: string;
    prenom: string;
    nom: string;
    email: string;
    ID_DOCTORANT?: string;
    importDate?: number;
    // ✅ Autres champs racine
    rapport?: {
      nomOriginal?: string;
      cheminStockage?: string;
      url?: string; // important
      [key: string]: any; // ✅ Permet l’accès dynamique
    };
    formulaire?: {
      missions?: string;
      titreThese?: string;
      conclusion?: string;
      recommendation?: string;
      recommendation_comment?: string;
      [key: string]: any; // autorise Q1, Q1_comment, etc.
    };
    [key: string]: any; // ✅ accès dynamique pour TS
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
    const [itemsPerPage, setItemsPerPage] = useState(15); // Défaut : 15 doctorants par page



    const fetchDoctorants = async () => {
        try {
            // console.log('[FRONTEND] Rafraîchissement des statuts côté backend...');
            await api.get('/doctorant/refresh-statuses');

            // console.log('[FRONTEND] Récupération de la liste des doctorants...');
            const response = await api.get('/doctorant');
            setDoctorants(response.data);
            console.log("🧪 Résultat brut (distant) :", response.data);
        
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

    const handleSendEmail = async (id: string, email: string, prenom: string, nom: string) => {
        if (!email) {
            alert('Cet utilisateur n\'a pas d\'email défini.');
            return;
        }
        try {
            await api.post(`/doctorant/send-link/${id}`, { email, prenom, nom });
            // console.log('Lien envoyé avec succès !');
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
            const response = await api.post('/email/send', {
                emails: emailsReferents,
                doctorantPrenom: doctorant.prenom,
                doctorantNom: doctorant.nom,
                doctorantEmail: doctorant.email,
                directeurTheseEmail: doctorant.email_HDR
            });
        
            // ✅ Vérifie si le backend renvoie un flag `success`
            if (response.data?.success === false || response.data?.error) {
                const messageErreur = response.data?.message || "Erreur inconnue lors de l'envoi.";
                throw new Error(messageErreur);
            }
        
            alert(`✅ Emails envoyés avec succès aux référents de ${doctorant.prenom} ${doctorant.nom} !`);
        } catch (error: any) {
            console.error(`❌ Erreur lors de l'envoi des emails aux référents de ${doctorant.prenom} ${doctorant.nom} :`, error);
        
            const backendMessage =
                error?.response?.data?.message ||
                error?.message ||
                "Erreur inconnue";
        
            alert(`❌ Erreur lors de l'envoi des emails aux référents de ${doctorant.prenom} ${doctorant.nom} :\n\n${backendMessage} (check file size)`);
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
            const { _id, email, prenom, nom } = doc; // 🔄 Récupération des données comme dans `handleSendEmail()`

            if (!email) {
                console.warn(`⏩ Aucun email pour ${prenom}, envoi ignoré.`);
                continue;
            }

            try {
                await handleSendEmail(_id, email, prenom, nom); // 🔥 Réutilisation de `handleSendEmail()`

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
            const {prenom, nom, email, email_HDR, emailMembre1, emailMembre2, emailAdditionalMembre } = doc;
    
            // 📧 Liste des emails des référents (exclut les valeurs nulles ou vides)
            const referentsEmails = [emailMembre1, emailMembre2, emailAdditionalMembre].filter(
                (email): email is string => Boolean(email && email.trim() !== "")
            );
    
            if (referentsEmails.length === 0) {
                console.warn(`⏩ Aucun référent pour ${prenom}, envoi ignoré.`);
                continue;
            }
    
            try {
                // console.log(`📩 Envoi des emails aux référents de ${prenom}...`, referentsEmails);
    
                await api.post('/email/send', {
                    emails: referentsEmails,
                    doctorantPrenom: prenom,
                    doctorantNom: nom,
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
      
        const headers = [
          "_id",
          "prenom",
          "nom",
          "email",
          "ID_DOCTORANT",
          "importDate",
          "departementDoctorant",
          "datePremiereInscription",
          "anneeThese",
          "typeFinancement",
          "typeThesis",
          "missions",
          "titreThese",
          "intituleUR",
          "directeurUR",
          "nomPrenomHDR",
          "email_HDR",
          "intituleEquipe",
          "directeurEquipe",
          "directeurThese",
          "coDirecteurThese",
          "prenomMembre1",
          "nomMembre1",
          "emailMembre1",
          "univesityMembre1",
          "prenomMembre2",
          "nomMembre2",
          "emailMembre2",
          "univesityMembre2",
          "prenomAdditionalMembre",
          "nomAdditionalMembre",
          "emailAdditionalMembre",
          "universityAdditionalMembre",
          "nbHoursScientificModules",
          "nbHoursCrossDisciplinaryModules",
          "nbHoursProfessionalIntegrationModules",
          "totalNbHours",
          "posters",
          "conferencePapers",
          "publications",
          "publicCommunication",
          "dateValidation",
          "additionalInformation",
          ...Array.from({ length: 17 }).flatMap((_, i) => [`Q${i+1}`, `Q${i+1}_comment`]),
          "conclusion",
          "recommendation",
          "recommendation_comment",
          "sendToDoctorant",
          "doctorantValide",
          "NbSendToDoctorant",
          "sendToRepresentants",
          "representantValide",
          "NbSendToRepresentants",
          "gestionnaireDirecteurValide",
          "finalSend",
          "NbFinalSend",
          "rapport_nomOriginal",
          "rapport_cheminStockage",
          "rapport_url",
          "dateEntretien"
        ];
      
        const csvRows = [
          headers.join(";"),
          ...filteredDoctorants.map(doc =>
            headers.map(header => {
              if (header.startsWith("rapport_")) {
                const key = header.replace("rapport_", "");
                return doc.rapport?.[key] ?? "";
              }
              if (
                ["missions", "titreThese", "conclusion", "recommendation", "recommendation_comment"]
                  .includes(header) ||
                header.startsWith("Q")
              ) {
                return doc.formulaire?.[header] ?? "";
              }
              return doc[header] ?? "";
            }).join(";")
          )
        ];
      
        const csvBlob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const csvUrl = URL.createObjectURL(csvBlob);
      
        const a = document.createElement("a");
        a.href = csvUrl;
        a.download = `Doctorants_Filtrés_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      
        URL.revokeObjectURL(csvUrl);
      };

      const handleExportAllPDFsAsZip = async () => {
        try {
          const response = await api.get('/doctorant/export/zip', {
            params: {
              searchTerm,
              filterStatus,
              filterYear,
            },
            responseType: 'blob',
          });
      
          const zipBlob = new Blob([response.data], { type: 'application/zip' });
          const zipUrl = URL.createObjectURL(zipBlob);
      
          const a = document.createElement('a');
          a.href = zipUrl;
          a.download = `Rapports_Doctorants_${new Date().toISOString().slice(0, 10)}.zip`;
          a.click();
      
          URL.revokeObjectURL(zipUrl);
        } catch (err) {
          console.error('❌ Erreur lors du téléchargement du ZIP :', err);
          alert('Erreur lors du téléchargement du ZIP.');
        }
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

    // 🔢 STATISTIQUES GLOBALES
    const totalDoctorants = doctorants.length;
    const totalEnvoyesDoctorant = doctorants.filter(doc => doc.sendToDoctorant).length;
    const totalValidDoctorant = doctorants.filter(doc => doc.doctorantValide).length;
    const totalEnvoyesReferents = doctorants.filter(doc => doc.sendToRepresentants).length;
    const totalValidReferents = doctorants.filter(doc => doc.representantValide).length;
    const totalEnvoyesDirecteurDept = doctorants.filter(doc => doc.gestionnaireDirecteurValide).length;
    const totalRapportFinal = doctorants.filter(doc => doc.finalSend).length;

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= Math.ceil(filteredDoctorants.length / itemsPerPage)) {
            setCurrentPage(newPage);
        }
    };

    const totalPages = Math.ceil(filteredDoctorants.length / itemsPerPage);

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

    const handleExportCSV = () => {
        if (doctorants.length === 0) {
          alert("Aucun doctorant disponible à exporter.");
          return;
        }
      
        const headers = [
          "_id",
          "prenom",
          "nom",
          "email",
          "ID_DOCTORANT",
          "importDate",
          "departementDoctorant",
          "datePremiereInscription",
          "anneeThese",
          "typeFinancement",
          "typeThesis",
          "missions",
          "titreThese",
          "intituleUR",
          "directeurUR",
          "nomPrenomHDR",
          "email_HDR",
          "intituleEquipe",
          "directeurEquipe",
          "directeurThese",
          "coDirecteurThese",
          "prenomMembre1",
          "nomMembre1",
          "emailMembre1",
          "univesityMembre1",
          "prenomMembre2",
          "nomMembre2",
          "emailMembre2",
          "univesityMembre2",
          "prenomAdditionalMembre",
          "nomAdditionalMembre",
          "emailAdditionalMembre",
          "universityAdditionalMembre",
          "nbHoursScientificModules",
          "nbHoursCrossDisciplinaryModules",
          "nbHoursProfessionalIntegrationModules",
          "totalNbHours",
          "posters",
          "conferencePapers",
          "publications",
          "publicCommunication",
          "dateValidation",
          "additionalInformation",
          ...Array.from({ length: 17 }).flatMap((_, i) => [`Q${i+1}`, `Q${i+1}_comment`]),
          "conclusion",
          "recommendation",
          "recommendation_comment",
          "sendToDoctorant",
          "doctorantValide",
          "NbSendToDoctorant",
          "sendToRepresentants",
          "representantValide",
          "NbSendToRepresentants",
          "gestionnaireDirecteurValide",
          "finalSend",
          "NbFinalSend",
          "rapport_nomOriginal",
          "rapport_cheminStockage",
          "rapport_url",
          "dateEntretien"
        ];
      
        const csvRows = [
          headers.join(";"),
          ...doctorants.map(doc =>
            headers.map(header => {
              if (header.startsWith("rapport_")) {
                const key = header.replace("rapport_", "");
                return doc.rapport?.[key] ?? "";
              }
              if (
                ["missions", "titreThese", "conclusion", "recommendation", "recommendation_comment"]
                  .includes(header) ||
                header.startsWith("Q")
              ) {
                return doc.formulaire?.[header] ?? "";
              }
              return doc[header] ?? "";
            }).join(";")
          )
        ];
      
        const csvBlob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const csvUrl = URL.createObjectURL(csvBlob);
      
        const a = document.createElement("a");
        a.href = csvUrl;
        a.download = `Doctorants_Complet_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      
        URL.revokeObjectURL(csvUrl);
      };
      
    const handleSendFinalReport = async (id: string) => {
        if (!window.confirm("📩 Es-tu sûre de vouloir envoyer le rapport final au doctorant et à son directeur ?")) return;
    
        const doctorant = doctorants.find((d) => d._id === id);
        if (!doctorant) {
            alert("Doctorant introuvable");
            return;
        }
    
        try {
            // console.log(`📧 Envoi du rapport final à ${doctorant.prenom} ${doctorant.nom}...`);
            const response = await api.post(`/email/send-final`, {
                doctorantId: doctorant._id,
                doctorantEmail: doctorant.email,
                doctorantPrenom: doctorant.prenom,
                doctorantNom: doctorant.nom,
                directeurTheseEmail: doctorant.email_HDR
            });
            alert(`✅ Rapport final envoyé avec succès à ${response.data.destinataires.join(', ')}`);
            fetchDoctorants();
        } catch (error) {
            console.error("❌ Erreur lors de l'envoi du rapport final :", error);
            alert("❌ Échec de l'envoi du rapport final.");
        }
    };

    const handleSendFinalReportsToFiltered = async () => {
        if (filteredDoctorants.length === 0) {
            alert("Aucun doctorant ne correspond au filtre actuel.");
            return;
        }
    
        if (!window.confirm(`📩 Tu t'apprêtes à envoyer le rapport final à ${filteredDoctorants.length} doctorant(s). Continuer ?`)) return;
    
        setTotalToSend(filteredDoctorants.length);
        setCurrentSent(0);
        setSendingProgress(0);
    
        for (const doctorant of filteredDoctorants) {
            const { _id, email, prenom, nom, email_HDR } = doctorant;
    
            try {
                await api.post(`/email/send-final`, {
                    doctorantId: _id,
                    doctorantEmail: email,
                    doctorantPrenom: prenom,
                    doctorantNom: nom,
                    directeurTheseEmail: email_HDR
                });
    
                setCurrentSent(prev => prev + 1);
                setSendingProgress((prev) => prev !== null ? ((prev + 1) / filteredDoctorants.length) * 100 : 100);
    
                const delay = 10 + Math.random() * 5;
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error) {
                console.error(`❌ Erreur pour ${prenom} ${nom} :`, error);
            }
        }
    
        alert('✅ Tous les rapports finaux ont été envoyés !');
        setSendingProgress(null);
        fetchDoctorants();
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
                <button className="btn btn-export" onClick={handleExportCSV}>📂 Exporter en CSV</button>
                <button className="btn btn-export-filtered" onClick={handleExportFilteredCSV}>📊 Exporter les doctorants filtrés en CSV</button>
                <button className="btn btn-export-pdf" onClick={handleExportAllPDFsAsZip}>
                    📑 Exporter les rapports filtrés en ZIP
                </button>
                <button className="btn btn-send-bulk" onClick={handleSendBulkEmails}>📩 Envoyer un mail aux doctorants non contactés</button>
                <button className="btn btn-send-bulk" onClick={handleSendEmailsToUncontactedReferents}>📩 Envoyer un mail aux référents non contactés</button>
                <button className="btn btn-send-bulk" onClick={handleSendFinalReportsToFiltered}>📩 Envoyer rapport final à tous les doctorants et directeur UR filtrés</button>
            </div>

            {/* 🔔 Affichage de la progression */}
            {sendingProgress !== null && (
                <div className="progress-container">
                    <strong>📨 Envoi en cours :</strong> {currentSent}/{totalToSend}
                    <br />
                    <div className="spinner"></div>
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
                    <option value={15}>15</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
            </div>

            {/* 📊 Bloc Statistiques Globales */}
            <div className="stats-globales-container">
            <h2>📊 Statistiques globales</h2>
            <div className="stats-table">
                <div className="stats-row">
                    <span className="stat-label">Total doctorants :</span>
                    <span className="stat-value">{totalDoctorants}</span>
                </div>
                <div className="stats-row">
                    <span className="stat-label">Envoyé au doctorant :</span>
                    <span className="stat-value">{totalEnvoyesDoctorant}</span>
                </div>
                <div className="stats-row">
                    <span className="stat-label">Validation par le doctorant :</span>
                    <span className="stat-value">{totalValidDoctorant}</span>
                </div>
                <div className="stats-row">
                    <span className="stat-label">Envoyé aux référents :</span>
                    <span className="stat-value">{totalEnvoyesReferents}</span>
                </div>
                <div className="stats-row">
                    <span className="stat-label">Validation par les référents :</span>
                    <span className="stat-value">{totalValidReferents}</span>
                </div>
                <div className="stats-row">
                    <span className="stat-label">Envoyé au directeur de département :</span>
                    <span className="stat-value">{totalEnvoyesDirecteurDept}</span>
                </div>
                <div className="stats-row">
                    <span className="stat-label">Rapport final envoyé au Doctorant et au Directeur UR :</span>
                    <span className="stat-value">{totalRapportFinal}</span>
                </div>
                </div>
            </div>

            {/* 📋 Liste des doctorants */}
            <div className="table-container">
            <ul className="doctorants-list">
                {paginatedDoctorants.map((doc: any) => {
                    return (
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
                            <div className='status'>
                                <span>Rapport final envoyé au Doctorant et au Directeur UR :</span>
                                <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: doc.finalSend ? 'green' : 'red' }}></div>
                            </div>
                            <div className='status-envois'>
                                <div className='envois up'>
                                    <span>Nb envois au doctorant :</span> <strong>{doc.NbSendToDoctorant}</strong>
                                </div>
                                <div className='envois'>
                                    <span>Nb envois aux référents :</span> <strong>{doc.NbSendToRepresentants}</strong>
                                </div>
                                <div className='envois'>
                                    <span>Nb envois rapport final :</span> <strong>{doc.NbFinalSend || 0}</strong>
                                </div>
                            </div>
                        </div>
                        </div>

                        <div className="action-buttons" style={{ marginTop: '10px' }}>
                            <div className="btn-group">
                                <button className="btn btn-primary btn-doctorant" onClick={() => handleSendEmail(doc._id, doc.email, doc.prenom, doc.nom)}>Renvoyer mail d'invitation au doctorant</button>

                                <button className="btn btn-primary btn-doctorant" onClick={() => handleResendReferentEmails(doc._id)}>
                                    Renvoyer mail avec rapport du doctorant aux référents
                                </button>

                                <button className="btn btn-primary btn-doctorant" onClick={() => handleExportPDF(doc._id)}>Afficher PDF en fonction de l'état d'avancement du process</button>

                                <Link to={`/doctorant/modifier/${doc._id}`}>
                                    <button className="btn btn-primary btn-doctorant">Modifier contenu du rapport du doctorant</button>
                                </Link>
                                <button
                                    className="btn btn-secondary btn-doctorant"
                                    onClick={() => handleSendFinalReport(doc._id)}
                                >
                                    Envoyer rapport final au doctorant + directeur
                                </button>
                            </div>


                            <div className='delete-and-referents'>
                            <div className='referents-names'>
                                <strong>Référents :</strong>
                                {doc.prenomMembre1 || doc.nomMembre1 || doc.prenomMembre2 || doc.nomMembre2 ? (
                                    <>
                                        {doc.prenomMembre1 || doc.nomMembre1 ? (
                                            <div className='referents-names referent-card'>
                                                <span>#1 {doc.prenomMembre1} {doc.nomMembre1}</span>
                                                <span className='referents-emails'>{doc.emailMembre1}</span>
                                            </div>
                                        ) : null}
                                        {doc.prenomMembre2 || doc.nomMembre2 ? (
                                            <div className='referents-names referent-card'>
                                                <span>#2 {doc.prenomMembre2} {doc.nomMembre2}</span>
                                                <span className='referents-emails'>{doc.emailMembre2}</span>
                                        </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <span className='referent-non-saisis'>Référents non encore saisis par le doctorant</span>
                                )}
                            </div>
                                <button onClick={() => handleDelete(doc._id)} className="btn btn-danger btn-card">
                                    Supprimer Doctorant
                                </button>
                            </div>
                        </div>
                    </li>
                )})}
            </ul>
            </div>
            {/* 📌 Pagination */}
            <div className="pagination-container">
                <button className="pagination-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                    ◀
                </button>
                <span className="pagination-text">
                    {currentPage} / {totalPages > 0 ? totalPages : 1}
                </span>
                <button className="pagination-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
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