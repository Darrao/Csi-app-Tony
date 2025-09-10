import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import '../styles/ListeDoctorants.css';

type Doctorant = {
  _id: string;
  prenom: string;
  nom: string;
  email: string;
  ID_DOCTORANT?: string;
  importDate?: number;
  rapport?: {
    nomOriginal?: string;
    cheminStockage?: string;
    url?: string;
    [key: string]: any;
  };
  formulaire?: {
    missions?: string;
    titreThese?: string;
    conclusion?: string;
    recommendation?: string;
    recommendation_comment?: string;
    [key: string]: any;
  };
  [key: string]: any;
};

// ✔️ petit type pour “Oui/Non” par statut
type YesNo = { yes: boolean; no: boolean };
type StatusFilters = {
  sendToDoctorant: YesNo;
  doctorantValide: YesNo;
  sendToRepresentants: YesNo;
  representantValide: YesNo;
  gestionnaireDirecteurValide: YesNo;
  finalSend: YesNo;
};

const emptyStatusFilters: StatusFilters = {
  sendToDoctorant: { yes: false, no: false },
  doctorantValide: { yes: false, no: false },
  sendToRepresentants: { yes: false, no: false },
  representantValide: { yes: false, no: false },
  gestionnaireDirecteurValide: { yes: false, no: false },
  finalSend: { yes: false, no: false },
};

const ListeDoctorants: React.FC = () => {
  const [doctorants, setDoctorants] = useState<Doctorant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingProgress, setSendingProgress] = useState<number | null>(null);
  const [totalToSend, setTotalToSend] = useState(0);
  const [currentSent, setCurrentSent] = useState(0);
  const [filterStatus, setFilterStatus] = useState('Tous');
  const [filterYear, setFilterYear] = useState('Tous');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [loadingButton, setLoadingButton] = useState<string | null>(null);

  // 🆕 Filtres avancés Oui/Non
  const [statusFilters, setStatusFilters] = useState<StatusFilters>(emptyStatusFilters);

  const statusFilterDefs: { key: keyof StatusFilters; label: string }[] = [
    { key: 'sendToDoctorant', label: 'Envoyé au doctorant' },
    { key: 'doctorantValide', label: 'Validation par le doctorant' },
    { key: 'sendToRepresentants', label: 'Envoyé aux référents' },
    { key: 'representantValide', label: 'Validation par les référents' },
    { key: 'gestionnaireDirecteurValide', label: 'Envoyé au directeur de département' },
    { key: 'finalSend', label: 'Rapport final envoyé' },
    ];

  const fetchDoctorants = async () => {
    try {
      await api.get('/doctorant/refresh-statuses');
      const response = await api.get('/doctorant');
      setDoctorants(response.data);

      const years = Array.from(new Set(response.data.map((doc: any) => doc.importDate)))
        .map(Number)
        .sort((a, b) => b - a);
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
      alert("Cet utilisateur n'a pas d'email défini.");
      return;
    }
    try {
      await api.post(`/doctorant/send-link/${id}`, { email, prenom, nom });
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email :", error);
      alert("Erreur lors de l'envoi de l'email.");
    }
  };

  const handleExportPDF = async (id: string) => {
    try {
      const response = await api.get(`/doctorant/export/pdf/${id}`, { responseType: 'blob' });
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error("❌ Erreur lors de l'export du PDF :", error);
      alert("Échec de l'export du PDF.");
    }
  };

  const handleResendReferentEmails = async (id: string) => {
    const doctorant = doctorants.find((doc) => doc._id === id);
    if (!doctorant) {
      alert('⚠️ Doctorant introuvable.');
      return;
    }

    const emailsReferents = [
      doctorant.emailMembre1,
      doctorant.emailMembre2,
      doctorant.emailAdditionalMembre,
    ].filter((email): email is string => Boolean(email && email.trim() !== ''));

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
        directeurTheseEmail: doctorant.email_HDR,
      });

      if (response.data?.success === false || response.data?.error) {
        const messageErreur = response.data?.message || "Erreur inconnue lors de l'envoi.";
        throw new Error(messageErreur);
      }

      alert(`✅ Emails envoyés avec succès aux référents de ${doctorant.prenom} ${doctorant.nom} !`);
    } catch (error: any) {
      console.error(
        `❌ Erreur lors de l'envoi des emails aux référents de ${doctorant.prenom} ${doctorant.nom} :`,
        error
      );

      const backendMessage =
        error?.response?.data?.message || error?.message || 'Erreur inconnue';

      alert(
        `❌ Erreur lors de l'envoi des emails aux référents de ${doctorant.prenom} ${doctorant.nom} :\n\n${backendMessage} (check file size)`
      );
    }
  };

  const handleSendBulkEmails = async () => {
    const doctorantsToEmail = doctorants.filter((doc: any) => !doc.sendToDoctorant);
    const total = doctorantsToEmail.length;

    if (total === 0) {
      alert('Tous les doctorants ont déjà reçu un email.');
      return;
    }

    setTotalToSend(total);
    setCurrentSent(0);
    setSendingProgress(0);

    for (const doc of doctorantsToEmail) {
      const { _id, email, prenom, nom } = doc;

      if (!email) {
        console.warn(`⏩ Aucun email pour ${prenom}, envoi ignoré.`);
        continue;
      }

      try {
        await handleSendEmail(_id, email, prenom, nom);
        setCurrentSent((prev) => prev + 1);
        setSendingProgress((prev) => (prev !== null ? ((prev + 1) / total) * 100 : 100));

        const delay = 10 + Math.random() * 5;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error) {
        console.error(`Erreur d'envoi pour ${prenom} :`, error);
      }
    }

    alert('Tous les emails ont été envoyés !');
    setSendingProgress(null);
    fetchDoctorants();
  };

  const handleSendEmailsToUncontactedReferents = async () => {
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
      const { prenom, nom, email, email_HDR, emailMembre1, emailMembre2, emailAdditionalMembre } = doc;

      const referentsEmails = [emailMembre1, emailMembre2, emailAdditionalMembre].filter(
        (email): email is string => Boolean(email && email.trim() !== '')
      );

      if (referentsEmails.length === 0) {
        console.warn(`⏩ Aucun référent pour ${prenom}, envoi ignoré.`);
        continue;
      }

      try {
        await api.post('/email/send', {
          emails: referentsEmails,
          doctorantPrenom: prenom,
          doctorantNom: nom,
          doctorantEmail: email,
          directeurTheseEmail: email_HDR,
        });

        setCurrentSent((prev) => prev + 1);
        setSendingProgress((prev) =>
          prev !== null ? ((prev + 1) / total) * 100 : 100
        );

        const delay = 10 + Math.random() * 5;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error) {
        console.error(`❌ Erreur d'envoi aux référents de ${prenom} :`, error);
      }
    }

    alert('📨 Tous les emails ont été envoyés aux référents des doctorants non contactés !');
    setSendingProgress(null);
    fetchDoctorants();
  };

  const handleExportFilteredCSV = async () => {
    try {
      const response = await api.get('/doctorant/export/filtered-csv', {
        params: { filterStatus, filterYear, searchTerm },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Doctorants_Complet_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ Erreur lors de l’export CSV :', error);
      alert("Erreur lors de l'export CSV.");
    }
  };

  const handleExportFilteredXLSX = async () => {
    try {
      const response = await api.get('/doctorant/export/filtered-xlsx', {
        params: { filterStatus, filterYear, searchTerm },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Doctorants_Filtres_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ Erreur lors de l’export XLSX :', error);
      alert("Erreur lors de l'export XLSX.");
    }
  };

  const handleExportAllPDFsAsZip = async () => {
    if (filteredDoctorants.length === 0) {
      alert('Aucun doctorant correspondant aux filtres.');
      return;
    }

    setLoadingButton('zip');
    try {
      const response = await api.get('/doctorant/export/zip', {
        params: { searchTerm, filterStatus, filterYear },
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
    setLoadingButton(null);
  };

  // 🧠 helpers pour les filtres
  const matchesYesNo = (value: any, f: YesNo) => {
    // rien coché → ignore
    if (!f.yes && !f.no) return true;
    // oui + non → équivaut à “peu importe”
    if (f.yes && f.no) return true;
    if (f.yes) return !!value;
    if (f.no) return !value;
    return true;
  };

  const toggleStatusFilter = (
    key: keyof StatusFilters,
    field: keyof YesNo
  ) => {
    setStatusFilters((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: !prev[key][field] },
    }));
  };

  const resetAdvancedFilters = () => setStatusFilters(emptyStatusFilters);

  // 🔽 Filtrage (revu) : recherche + année + (menu simple) + (filtres avancés Oui/Non)
  const filteredDoctorants = doctorants.filter((doc: any) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      doc.nom.toLowerCase().includes(term) ||
      ((doc.ID_DOCTORANT || '').toLowerCase().includes(term)); // ✔️ évite crash si undefined

    const matchYear = filterYear === 'Tous' || doc.importDate === Number(filterYear);

    // Menu simple (optionnel)
    const matchSimpleStatus =
      filterStatus === 'Tous' ||
      (filterStatus === 'Non envoyé au doctorant' && !doc.sendToDoctorant) ||
      (filterStatus === 'Envoyé au doctorant' && doc.sendToDoctorant) ||
      (filterStatus === 'Doctorant validé' && doc.doctorantValide) ||
      (filterStatus === 'Non validé par le doctorant' && !doc.doctorantValide) ||
      (filterStatus === 'Envoyé aux référents' && doc.sendToRepresentants) ||
      (filterStatus === 'Non envoyé aux référents' && !doc.sendToRepresentants) ||
      (filterStatus === 'Référents validés' && doc.representantValide) ||
      (filterStatus === 'Non validé par les référents' && !doc.representantValide) ||
      (filterStatus === 'Rapport final envoyé' && doc.finalSend);

    // Filtres avancés Oui/Non (cumulatifs)
    const matchAdvanced =
      matchesYesNo(doc.sendToDoctorant, statusFilters.sendToDoctorant) &&
      matchesYesNo(doc.doctorantValide, statusFilters.doctorantValide) &&
      matchesYesNo(doc.sendToRepresentants, statusFilters.sendToRepresentants) &&
      matchesYesNo(doc.representantValide, statusFilters.representantValide) &&
      matchesYesNo(doc.gestionnaireDirecteurValide, statusFilters.gestionnaireDirecteurValide) &&
      matchesYesNo(doc.finalSend, statusFilters.finalSend);

    return matchSearch && matchYear && matchSimpleStatus && matchAdvanced;
  });

  // 🔢 STATISTIQUES
  const totalDoctorants = doctorants.length;
  const totalEnvoyesDoctorant = doctorants.filter((doc) => doc.sendToDoctorant).length;
  const totalValidDoctorant = doctorants.filter((doc) => doc.doctorantValide).length;
  const totalEnvoyesReferents = doctorants.filter((doc) => doc.sendToRepresentants).length;
  const totalValidReferents = doctorants.filter((doc) => doc.representantValide).length;
  const totalEnvoyesDirecteurDept = doctorants.filter((doc) => doc.gestionnaireDirecteurValide).length;
  const totalRapportFinal = doctorants.filter((doc) => doc.finalSend).length;

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
    if (
      !window.confirm(
        '⚠️ ATTENTION : Cette action supprimera TOUS les doctorants !\n\nVoulez-vous vraiment continuer ?'
      )
    ) {
      return;
    }
    if (
      !window.confirm(
        '🚨 DERNIÈRE CHANCE : Cette suppression est IRRÉVERSIBLE !\n\nÊtes-vous VRAIMENT sûr(e) de vouloir tout supprimer ?'
      )
    ) {
      return;
    }
    if (
      !window.confirm(
        '🔥 ULTIME CONFIRMATION : Vous allez supprimer **TOUS** les doctorants.\n\nIl sera impossible de récupérer les données après cette action.\n\nContinuer ?'
      )
    ) {
      return;
    }

    const confirmationText = prompt(
      '❌ TAPEZ "SUPPRIMER" POUR CONFIRMER ❌\n\nCette action est DÉFINITIVE !\n\nSi vous ne souhaitez pas supprimer, cliquez sur "Annuler".'
    );
    if (confirmationText !== 'SUPPRIMER') {
      alert("❎ Suppression annulée. Aucun doctorant n'a été supprimé.");
      return;
    }

    try {
      await api.delete('/doctorant');
      setDoctorants([]);
      alert('✅ Tous les doctorants ont été supprimés avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des doctorants :', error);
      alert('⚠️ Échec de la suppression. Vérifiez la connexion et réessayez.');
    }
  };

  const handleExportCSV = () => {
    if (doctorants.length === 0) {
      alert('Aucun doctorant disponible à exporter.');
      return;
    }

    const headers = [
      '_id',
      'prenom',
      'nom',
      'email',
      'ID_DOCTORANT',
      'importDate',
      'departementDoctorant',
      'datePremiereInscription',
      'anneeThese',
      'typeFinancement',
      'typeThesis',
      'missions',
      'titreThese',
      'intituleUR',
      'directeurUR',
      'nomPrenomHDR',
      'email_HDR',
      'intituleEquipe',
      'directeurEquipe',
      'directeurThese',
      'coDirecteurThese',
      'prenomMembre1',
      'nomMembre1',
      'emailMembre1',
      'univesityMembre1',
      'prenomMembre2',
      'nomMembre2',
      'emailMembre2',
      'univesityMembre2',
      'prenomAdditionalMembre',
      'nomAdditionalMembre',
      'emailAdditionalMembre',
      'universityAdditionalMembre',
      'nbHoursScientificModules',
      'nbHoursCrossDisciplinaryModules',
      'nbHoursProfessionalIntegrationModules',
      'totalNbHours',
      'posters',
      'conferencePapers',
      'publications',
      'publicCommunication',
      'dateValidation',
      'additionalInformation',
      ...Array.from({ length: 17 }).flatMap((_, i) => [`Q${i + 1}`, `Q${i + 1}_comment`]),
      'conclusion',
      'recommendation',
      'recommendation_comment',
      'sendToDoctorant',
      'doctorantValide',
      'NbSendToDoctorant',
      'sendToRepresentants',
      'representantValide',
      'NbSendToRepresentants',
      'gestionnaireDirecteurValide',
      'finalSend',
      'NbFinalSend',
      'rapport_nomOriginal',
      'rapport_cheminStockage',
      'rapport_url',
      'dateEntretien',
    ];

    const csvRows = [
      headers.join(';'),
      ...doctorants.map((doc: any) =>
        headers
          .map((header) => {
            if (header.startsWith('rapport_')) {
              const key = header.replace('rapport_', '');
              return doc.rapport?.[key] ?? '';
            }
            if (
              ['missions', 'titreThese', 'conclusion', 'recommendation', 'recommendation_comment'].includes(
                header
              ) || header.startsWith('Q')
            ) {
              return doc.formulaire?.[header] ?? '';
            }
            return doc[header] ?? '';
          })
          .join(';')
      ),
    ];

    const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);

    const a = document.createElement('a');
    a.href = csvUrl;
    a.download = `Doctorants_Complet_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(csvUrl);
  };

  const handleSendFinalReport = async (id: string) => {
    if (!window.confirm('📩 Es-tu sûre de vouloir envoyer le rapport final au doctorant et à son directeur ?'))
      return;

    const doctorant = doctorants.find((d) => d._id === id);
    if (!doctorant) {
      alert('Doctorant introuvable');
      return;
    }

    try {
      const response = await api.post(`/email/send-final`, {
        doctorantId: doctorant._id,
        doctorantEmail: doctorant.email,
        doctorantPrenom: doctorant.prenom,
        doctorantNom: doctorant.nom,
        directeurTheseEmail: doctorant.email_HDR,
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
      alert('Aucun doctorant ne correspond au filtre actuel.');
      return;
    }

    if (
      !window.confirm(
        `📩 Tu t'apprêtes à envoyer le rapport final à ${filteredDoctorants.length} doctorant(s). Continuer ?`
      )
    )
      return;

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
          directeurTheseEmail: email_HDR,
        });

        setCurrentSent((prev) => prev + 1);
        setSendingProgress((prev) =>
          prev !== null ? ((prev + 1) / filteredDoctorants.length) * 100 : 100
        );

        const delay = 10 + Math.random() * 5;
        await new Promise((resolve) => setTimeout(resolve, delay));
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

      {/* 🔍 Barre de recherche + filtres simples */}
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
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        {/* 🔽 Filtre simple (conserve l'existant) */}
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
          <option value="Rapport final envoyé">Rapport final envoyé au Doctorant et au Directeur UR</option>
        </select>
      </div>

      {/* 🆕 Filtres avancés Oui/Non (mise en page tableau) */}
<div className="advanced-filters">
  <div className="advanced-filters-header">
    <strong>Filtres avancés (Oui / Non)</strong>
    <button
      className="btn btn-reset"
      onClick={resetAdvancedFilters}
      title="Réinitialiser les filtres avancés"
    >
      ♻️ Réinitialiser
    </button>
  </div>

  <table className="advanced-filters-table" role="grid" aria-label="Filtres avancés">
    <thead>
      <tr>
        <th>Critère</th>
        <th>Oui</th>
        <th>Non</th>
      </tr>
    </thead>
    <tbody>
      {statusFilterDefs.map(({ key, label }) => (
        <tr key={key}>
          <td className="critere">{label}</td>
          <td className="cell-yes">
            <label className="yn">
              <input
                type="checkbox"
                checked={statusFilters[key].yes}
                onChange={() => toggleStatusFilter(key, 'yes')}
              />
              <span className="chip">Oui</span>
            </label>
          </td>
          <td className="cell-no">
            <label className="yn">
              <input
                type="checkbox"
                checked={statusFilters[key].no}
                onChange={() => toggleStatusFilter(key, 'no')}
              />
              <span className="chip">Non</span>
            </label>
          </td>
        </tr>
      ))}
    </tbody>
  </table>

  <p className="advanced-filters-hint">
    Astuce : pour lister “doctorants qui ont soumis <em>(validation doctorant = Oui)</em> mais dont les référents n’ont pas validé
    <em>(validation référents = Non)</em>”, coche “Validation par le doctorant → Oui” et “Validation par les référents → Non”.
  </p>
</div>

      <div className="actions-container">
        <button className="btn btn-refresh" onClick={fetchDoctorants}>🔄 Rafraîchir</button>
        <button className="btn btn-export" onClick={handleExportCSV}>📂 Exporter en CSV</button>
        <button className="btn btn-export-filtered" onClick={handleExportFilteredCSV}>📊 Exporter les doctorants filtrés en CSV</button>
        <button
          className="btn btn-export-pdf"
          onClick={handleExportAllPDFsAsZip}
          disabled={loadingButton === 'zip'}
        >
          {loadingButton === 'zip' ? '⏳ Export en cours...' : '📑 Exporter les rapports filtrés en ZIP'}
        </button>
        <button
          className="btn btn-export-filtered"
          onClick={handleExportFilteredXLSX}
          disabled={loadingButton === 'zip'}
        >
          {loadingButton === 'zip' ? '⏳ Export en cours...' : '📊 Exporter les doctorants filtrés en XLSX'}
        </button>
        <button className="btn btn-send-bulk" onClick={handleSendBulkEmails}>📩 Envoyer un mail aux doctorants non contactés</button>
        <button className="btn btn-send-bulk" onClick={handleSendEmailsToUncontactedReferents}>📩 Envoyer un mail aux référents non contactés</button>
        <button className="btn btn-send-bulk" onClick={handleSendFinalReportsToFiltered}>📩 Envoyer rapport final à tous les doctorants et directeur UR filtrés</button>
      </div>

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
            const selectedValue = e.target.value === 'Tous' ? filteredDoctorants.length : Number(e.target.value);
            setItemsPerPage(selectedValue);
            setCurrentPage(1);
          }}
        >
          <option value={15}>15</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value="Tous">Tous</option>
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
                <div className="doctorant-info">
                  <strong>
                    {doc.nom} {doc.prenom}
                  </strong>
                  <br />
                  <span style={{ fontSize: '0.9em', color: '#666' }}>ID: {doc.ID_DOCTORANT}</span>
                  <br />
                  <span style={{ color: doc.statut === 'complet' ? 'green' : 'red' }}>{doc.statut}</span>

                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div className="status">
                      <span>Envoyé au doctorant :</span>
                      <div
                        style={{
                          width: '15px',
                          height: '15px',
                          borderRadius: '50%',
                          backgroundColor: doc.sendToDoctorant ? 'green' : 'red',
                        }}
                      ></div>
                    </div>
                    <div className="status">
                      <span>Validation par le doctorant :</span>
                      <div
                        style={{
                          width: '15px',
                          height: '15px',
                          borderRadius: '50%',
                          backgroundColor: doc.doctorantValide ? 'green' : 'red',
                        }}
                      ></div>
                    </div>
                    <div className="status">
                      <span>Envoyé aux référents :</span>
                      <div
                        style={{
                          width: '15px',
                          height: '15px',
                          borderRadius: '50%',
                          backgroundColor: doc.sendToRepresentants ? 'green' : 'red',
                        }}
                      ></div>
                    </div>
                    <div className="status">
                      <span>Validation par les référents :</span>
                      <div
                        style={{
                          width: '15px',
                          height: '15px',
                          borderRadius: '50%',
                          backgroundColor: doc.representantValide ? 'green' : 'red',
                        }}
                      ></div>
                    </div>
                    <div className="status">
                      <span>Envoyé au directeur de département :</span>
                      <div
                        style={{
                          width: '15px',
                          height: '15px',
                          borderRadius: '50%',
                          backgroundColor: doc.gestionnaireDirecteurValide ? 'green' : 'red',
                        }}
                      ></div>
                    </div>
                    <div className="status">
                      <span>Rapport final envoyé au Doctorant et au Directeur UR :</span>
                      <div
                        style={{
                          width: '15px',
                          height: '15px',
                          borderRadius: '50%',
                          backgroundColor: doc.finalSend ? 'green' : 'red',
                        }}
                      ></div>
                    </div>
                    <div className="status-envois">
                      <div className="envois up">
                        <span>Nb envois au doctorant :</span> <strong>{doc.NbSendToDoctorant}</strong>
                      </div>
                      <div className="envois">
                        <span>Nb envois aux référents :</span> <strong>{doc.NbSendToRepresentants}</strong>
                      </div>
                      <div className="envois">
                        <span>Nb envois rapport final :</span> <strong>{doc.NbFinalSend || 0}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="action-buttons" style={{ marginTop: '10px' }}>
                  <div className="btn-group">
                    <button
                      className="btn btn-primary btn-doctorant"
                      onClick={() => handleSendEmail(doc._id, doc.email, doc.prenom, doc.nom)}
                    >
                      Renvoyer mail d'invitation au doctorant
                    </button>

                    <button className="btn btn-primary btn-doctorant" onClick={() => handleResendReferentEmails(doc._id)}>
                      Renvoyer mail avec rapport du doctorant aux référents
                    </button>

                    <button className="btn btn-primary btn-doctorant" onClick={() => handleExportPDF(doc._id)}>
                      Afficher PDF en fonction de l'état d'avancement du process
                    </button>

                    <Link to={`/doctorant/modifier/${doc._id}`}>
                      <button className="btn btn-primary btn-doctorant">Modifier contenu du rapport du doctorant</button>
                    </Link>
                    <button className="btn btn-secondary btn-doctorant" onClick={() => handleSendFinalReport(doc._id)}>
                      Envoyer rapport final au doctorant + directeur
                    </button>
                  </div>

                  <div className="delete-and-referents">
                    <div className="referents-names">
                      <strong>Référents :</strong>
                      {doc.prenomMembre1 || doc.nomMembre1 || doc.prenomMembre2 || doc.nomMembre2 ? (
                        <>
                          {doc.prenomMembre1 || doc.nomMembre1 ? (
                            <div className="referents-names referent-card">
                              <span>
                                #1 {doc.prenomMembre1} {doc.nomMembre1}
                              </span>
                              <span className="referents-emails">{doc.emailMembre1}</span>
                            </div>
                          ) : null}
                          {doc.prenomMembre2 || doc.nomMembre2 ? (
                            <div className="referents-names referent-card">
                              <span>
                                #2 {doc.prenomMembre2} {doc.nomMembre2}
                              </span>
                              <span className="referents-emails">{doc.emailMembre2}</span>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="referent-non-saisis">Référents non encore saisis par le doctorant</span>
                      )}
                    </div>
                    <button onClick={() => handleDelete(doc._id)} className="btn btn-danger btn-card">
                      Supprimer Doctorant
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 📌 Pagination */}
      <div className="pagination-container">
        <button className="pagination-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
          ◀
        </button>
        <span className="pagination-text">{currentPage} / {totalPages > 0 ? totalPages : 1}</span>
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