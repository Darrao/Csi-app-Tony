import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import '../styles/ListeDoctorants.css';
import { FaUserFriends, FaPaperPlane, FaCheckCircle, FaEnvelopeOpenText, FaHandshake, FaBuilding, FaRocket, FaSpinner } from 'react-icons/fa';

// Workaround for React 18/19 type mismatch with react-icons
const IconUserFriends = FaUserFriends as any;
const IconPaperPlane = FaPaperPlane as any;
const IconCheckCircle = FaCheckCircle as any;
const IconEnvelopeOpenText = FaEnvelopeOpenText as any;
const IconHandshake = FaHandshake as any;
const IconBuilding = FaBuilding as any;
const IconRocket = FaRocket as any;
const IconSpinner = FaSpinner as any;

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
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const toggleLoading = (id: string, action: string, isLoading: boolean) => {
    setLoadingMap((prev) => ({ ...prev, [`${id}-${action}`]: isLoading }));
  };

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
      const configRes = await api.get('/email-config');
      
      const activeYear = configRes.data?.[0]?.activeCampaignYear;
      
      setDoctorants(response.data);

      const years = Array.from(new Set(response.data.map((doc: any) => doc.importDate)))
        .map(Number)
        .sort((a, b) => b - a);

      if (activeYear && !years.includes(Number(activeYear))) {
        years.unshift(Number(activeYear));
      }

      setAvailableYears(years);

      if (activeYear) {
        setFilterYear(prev => prev === 'Tous' ? activeYear : prev);
      }
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
    toggleLoading(id, 'invite-doc', true);
    try {
      const response = await api.post(`/doctorant/send-link/${id}`, { email, prenom, nom });

      if (response.data?.error) {
        throw new Error(response.data.message || "Erreur inconnue");
      }

      alert(response.data.message || 'Email envoyé avec succès !');
    } catch (error: any) {
      console.error("Erreur lors de l'envoi de l'email :", error);
      const backendMessage = error?.response?.data?.message || error?.message || "Erreur lors de l'envoi de l'email.";
      alert(backendMessage);
    } finally {
      toggleLoading(id, 'invite-doc', false);
    }
  };

  const handleExportPDF = async (id: string) => {
    toggleLoading(id, 'pdf', true);
    try {
      const response = await api.get(`/doctorant/export/pdf/${id}`, { responseType: 'blob' });
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error("❌ Erreur lors de l'export du PDF :", error);
      alert("Échec de l'export du PDF.");
    } finally {
      toggleLoading(id, 'pdf', false);
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

    toggleLoading(id, 'invite-ref', true);
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
    } finally {
      toggleLoading(id, 'invite-ref', false);
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

  // 👉 échappe le XML pour l'export .xls
  const xmlEscape = (s: string) =>
    s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  // 👉 récupère la valeur par colonne (comme dans ton CSV)
  const valueForHeader = (doc: any, h: string) => {
    if (h.startsWith('rapport_')) {
      const key = h.replace('rapport_', '');
      return doc.rapport?.[key] ?? '';
    }

    if (
      ['missions', 'titreThese', 'conclusion', 'recommendation', 'recommendation_comment'].includes(h) ||
      h.startsWith('Q')
    ) {
      // données désormais stockées à la racine du document (et fallback éventuel sur formulaire pour anciens enregistrements)
      return doc[h] ?? doc.formulaire?.[h] ?? '';
    }

    // Dates (Date, DateString, ISO)
    if (h.toLowerCase().includes('date')) {
      return formatDate(doc[h]) ?? '';
    }

    return doc[h] ?? '';
  };

  // Est-ce qu'au moins 1 filtre est actif ?
  /*
  const areWeFiltering = () =>
    searchTerm.trim() !== '' ||
    filterYear !== 'Tous' ||
    filterStatus !== 'Tous' ||
    Object.values(statusFilters).some(f => f.yes !== f.no);
  */

  // ✅ UNIQUEMENT les filtres avancés Oui/Non
  const hasActiveAdvancedFilters = () =>
    Object.values(statusFilters).some(f => f.yes !== f.no);

  // Construit les params "classiques"
  const buildExportParams = () => {
    const params: Record<string, any> = {
      filterStatus,
      filterYear,
      searchTerm,
      statusFilters: JSON.stringify(statusFilters),
    };
    Object.entries(statusFilters).forEach(([k, v]) => {
      if (v.yes || v.no) {
        params[`${k}Yes`] = v.yes ? 1 : 0;
        params[`${k}No`] = v.no ? 1 : 0;
      }
    });
    return params;
  };

  // Sérialise en URLSearchParams en répétant ids[] pour le GET
  /*
  const toUrlParams = (obj: Record<string, any>) => {
    const p = new URLSearchParams();
    Object.entries(obj).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach(val => p.append(`${k}[]`, String(val)));
      } else if (v !== undefined && v !== null) {
        p.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    });
    return p;
  };
  */

  // Téléchargement d'un blob
  const saveBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Affichage des erreurs blob du backend (utile quand il renvoie du JSON d'erreur)
  /*
  const showBlobError = async (err: any, fallbackMsg: string) => {
    try {
      const blob = err?.response?.data;
      if (blob && blob instanceof Blob) {
        const text = await blob.text();
        console.error('Backend error payload:', text);
        alert(text || fallbackMsg);
        return;
      }
    } catch { }
    console.error(err);
    alert(fallbackMsg);
  };
  */

  const handleExportFilteredCSV = async () => {
    try {
      // ✅ si filtres avancés actifs → export client immédiat sur filteredDoctorants
      if (hasActiveAdvancedFilters()) {
        const headers = [
          '_id', 'prenom', 'nom', 'email', 'ID_DOCTORANT', 'importDate', 'departementDoctorant',
          'datePremiereInscription', 'anneeThese', 'typeFinancement', 'typeThesis',
          'missions', 'titreThese', 'intituleUR', 'directeurUR', 'nomPrenomHDR', 'email_HDR',
          'intituleEquipe', 'directeurEquipe', 'directeurThese', 'coDirecteurThese',
          'prenomMembre1', 'nomMembre1', 'emailMembre1', 'univesityMembre1',
          'prenomMembre2', 'nomMembre2', 'emailMembre2', 'univesityMembre2',
          'prenomAdditionalMembre', 'nomAdditionalMembre', 'emailAdditionalMembre', 'universityAdditionalMembre',
          'nbHoursScientificModules', 'nbHoursCrossDisciplinaryModules', 'nbHoursProfessionalIntegrationModules',
          'totalNbHours', 'posters', 'conferencePapers', 'publications', 'publicCommunication',
          'dateValidation', 'additionalInformation',
          ...Array.from({ length: 17 }).flatMap((_, i) => [`Q${i + 1}`, `Q${i + 1}_comment`]),
          'conclusion', 'recommendation', 'recommendation_comment',
          'sendToDoctorant', 'doctorantValide', 'NbSendToDoctorant', 'sendToRepresentants', 'representantValide', 'NbSendToRepresentants',
          'gestionnaireDirecteurValide', 'finalSend', 'NbFinalSend',
          'rapport_nomOriginal', 'rapport_cheminStockage', 'rapport_url', 'dateEntretien'
        ];

        const rows = [
          headers.join(';'),
          ...filteredDoctorants.map((doc: any) =>
            headers.map((h) => {
              if (h.startsWith('rapport_')) {
                const key = h.replace('rapport_', '');
                return (doc.rapport?.[key] ?? '').toString().replace(/\n/g, ' ');
              }

              if (
                ['missions', 'titreThese', 'conclusion', 'recommendation', 'recommendation_comment'].includes(h) ||
                h.startsWith('Q')
              ) {
                const val = doc[h] ?? doc.formulaire?.[h] ?? '';
                return val.toString().replace(/\n/g, ' ');
              }

              let val = doc[h] ?? doc.formulaire?.[h] ?? '';

              if (h.toLowerCase().includes('date')) {
                val = formatDate(val);
              }

              return val.toString().replace(/\n/g, ' ');
            }).join(';')
          ),
        ];

        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Doctorants_Filtres_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // 🔁 sinon (aucun filtre avancé) → on garde ton export backend
      const response = await api.get('/doctorant/export/filtered-csv', {
        params: buildExportParams(),
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Doctorants_Filtres_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ Erreur lors de l’export CSV :', error);
      alert("Erreur lors de l'export CSV.");
    }
  };

  const handleExportFilteredXLSX = async () => {
    const headers = [
      '_id', 'prenom', 'nom', 'email', 'ID_DOCTORANT', 'importDate', 'departementDoctorant',
      'datePremiereInscription', 'anneeThese', 'typeFinancement', 'typeThesis',
      'missions', 'titreThese', 'intituleUR', 'directeurUR', 'nomPrenomHDR', 'email_HDR',
      'intituleEquipe', 'directeurEquipe', 'directeurThese', 'coDirecteurThese',
      'prenomMembre1', 'nomMembre1', 'emailMembre1', 'univesityMembre1',
      'prenomMembre2', 'nomMembre2', 'emailMembre2', 'univesityMembre2',
      'prenomAdditionalMembre', 'nomAdditionalMembre', 'emailAdditionalMembre', 'universityAdditionalMembre',
      'nbHoursScientificModules', 'nbHoursCrossDisciplinaryModules', 'nbHoursProfessionalIntegrationModules',
      'totalNbHours', 'posters', 'conferencePapers', 'publications', 'publicCommunication',
      'dateValidation', 'additionalInformation',
      ...Array.from({ length: 17 }).flatMap((_, i) => [`Q${i + 1}`, `Q${i + 1}_comment`]),
      'conclusion', 'recommendation', 'recommendation_comment',
      'sendToDoctorant', 'doctorantValide', 'NbSendToDoctorant', 'sendToRepresentants', 'representantValide', 'NbSendToRepresentants',
      'gestionnaireDirecteurValide', 'finalSend', 'NbFinalSend',
      'rapport_nomOriginal', 'rapport_cheminStockage', 'rapport_url', 'dateEntretien'
    ];

    // ligne d'entête
    const headerRow = `<Row>` + headers.map(h => `<Cell><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`).join('') + `</Row>`;

    // lignes de données (uniquement les filtrés)
    const dataRows = filteredDoctorants.map((doc: any) => {
      const cells = headers.map(h => {
        const raw = String(valueForHeader(doc, h) ?? '').replace(/\r?\n/g, ' ');
        return `<Cell><Data ss:Type="String">${xmlEscape(raw)}</Data></Cell>`;
      }).join('');
      return `<Row>${cells}</Row>`;
    }).join('');

    // Excel 2003 XML
    const xml =
      `<?xml version="1.0"?>
  <?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Worksheet ss:Name="Doctorants">
      <Table>
        ${headerRow}
        ${dataRows}
      </Table>
    </Worksheet>
  </Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const filename = `Doctorants_Filtres_${new Date().toISOString().slice(0, 10)}.xls`;
    saveBlob(blob, filename);
  };

  // --- ZIP utils (pur navigateur, sans lib) ---
  const te = new TextEncoder();

  // Table CRC32
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  // ✅ CRC32 correct (IEEE) : décalage de 8 bits à chaque octet
  const crc32 = (u8: Uint8Array) => {
    let c = 0xFFFFFFFF >>> 0;
    for (let i = 0; i < u8.length; i++) {
      c = (c >>> 8) ^ crcTable[(c ^ u8[i]) & 0xFF];
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  };

  // DOS time/date
  const toDOSDateTime = (d = new Date()) => {
    const time =
      ((d.getHours() & 0x1f) << 11) |
      ((d.getMinutes() & 0x3f) << 5) |
      ((Math.floor(d.getSeconds() / 2)) & 0x1f);
    const date =
      ((((d.getFullYear() - 1980) & 0x7f) << 9) |
        (((d.getMonth() + 1) & 0xf) << 5) |   // petite parenthèse en plus
        (d.getDate() & 0x1f));
    return { time, date };
  };

  const u16 = (n: number) => new Uint8Array([n & 0xFF, (n >> 8) & 0xFF]);
  const u32 = (n: number) => new Uint8Array([n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF]);

  // Fabrique un ZIP (méthode 0 = store)
  async function makeZip(files: { name: string; data: Uint8Array; mtime?: Date }[]) {
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    for (const f of files) {
      const nameBytes = te.encode(f.name.replace(/\\/g, '/'));
      const c32 = crc32(f.data);
      const size = f.data.length >>> 0;
      const { time, date } = toDOSDateTime(f.mtime ?? new Date());

      // Local file header
      const lh = new Uint8Array(30 + nameBytes.length);
      let p = 0;
      lh.set(u32(0x04034b50), p); p += 4;          // signature
      lh.set(u16(20), p); p += 2;                  // version needed (2.0)
      lh.set(u16(0), p); p += 2;                   // flags
      lh.set(u16(0), p); p += 2;                   // method = store
      lh.set(u16(time), p); p += 2;
      lh.set(u16(date), p); p += 2;
      lh.set(u32(c32), p); p += 4;                 // crc32
      lh.set(u32(size), p); p += 4;                // comp size
      lh.set(u32(size), p); p += 4;                // uncomp size
      lh.set(u16(nameBytes.length), p); p += 2;    // name len
      lh.set(u16(0), p); p += 2;                   // extra len
      lh.set(nameBytes, p);

      localParts.push(lh, f.data);

      // Central directory header
      const ch = new Uint8Array(46 + nameBytes.length);
      p = 0;
      ch.set(u32(0x02014b50), p); p += 4;          // signature
      ch.set(u16(0x0314), p); p += 2;              // version made by (Unix + v2.0) — toléré par macOS
      ch.set(u16(20), p); p += 2;                  // version needed
      ch.set(u16(0), p); p += 2;                   // flags
      ch.set(u16(0), p); p += 2;                   // method
      ch.set(u16(time), p); p += 2;
      ch.set(u16(date), p); p += 2;
      ch.set(u32(c32), p); p += 4;
      ch.set(u32(size), p); p += 4;
      ch.set(u32(size), p); p += 4;
      ch.set(u16(nameBytes.length), p); p += 2;
      ch.set(u16(0), p); p += 2;                   // extra len
      ch.set(u16(0), p); p += 2;                   // comment len
      ch.set(u16(0), p); p += 2;                   // disk start
      ch.set(u16(0), p); p += 2;                   // internal attrs
      ch.set(u32(0), p); p += 4;                   // external attrs
      ch.set(u32(offset), p); p += 4;              // local header offset
      ch.set(nameBytes, p);
      centralParts.push(ch);

      offset += lh.length + f.data.length;
    }

    const centralSize = centralParts.reduce((n, u) => n + u.length, 0);
    const centralOffset = offset;

    // EOCD
    const eocd = new Uint8Array(22);
    let q = 0;
    eocd.set(u32(0x06054b50), q); q += 4;
    eocd.set(u16(0), q); q += 2;
    eocd.set(u16(0), q); q += 2;
    eocd.set(u16(files.length), q); q += 2;
    eocd.set(u16(files.length), q); q += 2;
    eocd.set(u32(centralSize), q); q += 4;
    eocd.set(u32(centralOffset), q); q += 4;
    eocd.set(u16(0), q);

    return new Blob([...localParts, ...centralParts, eocd], { type: 'application/zip' });
  }

  // Utilise exactement les doctorants filtrés, crée une arborescence <Année>/<NOM_Prenom>/Rapport_*.pdf dans un ZIP
  const handleExportAllPDFsAsZip = async () => {
    if (!filteredDoctorants.length) {
      alert('Aucun doctorant correspondant aux filtres.');
      return;
    }

    setLoadingButton('zip');
    try {
      const safe = (s: string) =>
        (s || '')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[\\/:"*?<>|]+/g, '_')
          .replace(/\s+/g, '_')
          .slice(0, 120);

      const files: { name: string; data: Uint8Array }[] = [];

      for (const d of filteredDoctorants) {
        const year = d.importDate ? String(d.importDate) : 'Sans_annee';
        const idPart = safe(d.ID_DOCTORANT || d._id || 'Sans_ID');
        const person = `${safe(d.nom)}_${safe(d.prenom)}`;

        // dossier = <Année>/<ID_DOCTORANT>__<NOM_PRENOM>/
        const folder = `${year}/${idPart}`;

        // fichier = Rapport_<NOM_PRENOM>.pdf  (tu peux mettre l'ID aussi si tu veux)
        const path = `${folder}/Rapport_${person}.pdf`;

        const res = await api.get(`/doctorant/export/pdf/${d._id}`, { responseType: 'blob' });
        const buf = new Uint8Array(await res.data.arrayBuffer());
        files.push({ name: path, data: buf });

        // petit délai pour rester courtois avec le backend
        await new Promise(r => setTimeout(r, 200 + Math.random() * 150));
      }

      const zip = await makeZip(files);
      const filename = `Rapports_Doctorants_${new Date().toISOString().slice(0, 10)}.zip`;
      saveBlob(zip, filename);
    } catch (err) {
      console.error('ZIP client error', err);
      alert('❌ Erreur lors de la création du ZIP (client).');
    } finally {
      setLoadingButton(null);
    }
  };

  /*
  const handleDownloadFilteredPDFsOneByOne = async () => {
    if (!filteredDoctorants.length) {
      alert('Aucun doctorant correspondant aux filtres.');
      return;
    }

    setLoadingButton('zip'); // on réutilise l'état pour spinner
    try {
      // Détecte l'API File System Access (Chrome/Edge)
      const hasFS = typeof (window as any).showDirectoryPicker === 'function';
      let rootDir: any = null;

      if (hasFS) {
        try {
          // Ouvre un sélecteur de dossier où écrire tous les sous-dossiers/fichiers
          rootDir = await (window as any).showDirectoryPicker({
            id: 'rapports-doctorants',
            mode: 'readwrite',
            startIn: 'downloads',
          });
        } catch {
          // utilisateur a annulé → on repassera en fallback (téléchargements classiques)
          rootDir = null;
        }
      }

      const safe = (s: string) =>
        (s || '')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // supprime accents
          .replace(/[\\/:"*?<>|]+/g, '_')                   // caractères interdits
          .replace(/\s+/g, '_')                             // espaces → _
          .slice(0, 120);                                   // protège noms trop longs

      // Chemin de dossier pour chaque doc : <annee>/<NOM_PRENOM>
      const getFolderParts = (d: any) => {
        const year = d.importDate ? String(d.importDate) : 'Sans_annee';
        const person = `${safe(d.nom)}_${safe(d.prenom)}`;
        return [year, person];
      };

      // Helpers FS Access
      const ensureSubDir = async (dirHandle: any, name: string) =>
        await dirHandle.getDirectoryHandle(name, { create: true });

      for (const d of filteredDoctorants) {
        try {
          const res = await api.get(`/doctorant/export/pdf/${d._id}`, { responseType: 'blob' });
          const pdfBlob = new Blob([res.data], { type: 'application/pdf' });
          const baseName = `Rapport_${safe(d.nom)}_${safe(d.prenom)}.pdf`;
          const folderParts = getFolderParts(d);

          if (rootDir) {
            // Écrit le fichier physiquement dans <racine>/<annee>/<NOM_PRENOM>/<fichier>
            let dir = rootDir;
            for (const part of folderParts) {
              dir = await ensureSubDir(dir, part);
            }
            const fileHandle = await dir.getFileHandle(baseName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(pdfBlob);
            await writable.close();
          } else {
            // Fallback multi-téléchargements : encode le “chemin” dans le nom du fichier
            const prefix = folderParts.join('__') + '__';
            saveBlob(pdfBlob, `${prefix}${baseName}`);
          }

          // petit délai pour éviter de saturer (200–400ms)
          await new Promise((r) => setTimeout(r, 250 + Math.random() * 150));
        } catch (e) {
          console.error(`PDF raté pour ${d.prenom} ${d.nom}`, e);
        }
      }

      if (rootDir) {
        alert('✅ Tous les PDFs ont été enregistrés dans le dossier choisi (avec sous-dossiers).');
      }
    } finally {
      setLoadingButton(null);
    }
  };
  */

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
  const doctorantsByYear = doctorants.filter(doc => filterYear === 'Tous' || doc.importDate === Number(filterYear));
  const totalDoctorants = doctorantsByYear.length;
  const totalEnvoyesDoctorant = doctorantsByYear.filter((doc) => doc.sendToDoctorant).length;
  const totalValidDoctorant = doctorantsByYear.filter((doc) => doc.doctorantValide).length;
  const totalEnvoyesReferents = doctorantsByYear.filter((doc) => doc.sendToRepresentants).length;
  const totalValidReferents = doctorantsByYear.filter((doc) => doc.representantValide).length;
  const totalEnvoyesDirecteurDept = doctorantsByYear.filter((doc) => doc.gestionnaireDirecteurValide).length;
  const totalRapportFinal = doctorantsByYear.filter((doc) => doc.finalSend).length;

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
              ['missions', 'titreThese', 'conclusion', 'recommendation', 'recommendation_comment'].includes(header) ||
              header.startsWith('Q')
            ) {
              return doc[header] ?? doc.formulaire?.[header] ?? '';
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

    toggleLoading(id, 'final', true);
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
    } finally {
      toggleLoading(id, 'final', false);
    }
  };

  const formatDate = (v: any) => {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  };

  const handleSendDepartmentEmail = async (id: string, department: string, email: string, prenom: string, nom: string) => {
    if (!department) {
      alert("Ce doctorant n'a pas de département défini.");
      return;
    }
    toggleLoading(id, 'invite-dir', true);
    try {
      const response = await api.post('/email/send-department', {
        doctorantId: id,
        doctorantEmail: email,
        doctorantPrenom: prenom,
        doctorantNom: nom,
        department: department
      });
      alert(response.data.message || `Email envoyé au directeur du département ${department}`);
      fetchDoctorants();
    } catch (error: any) {
      console.error("Erreur envoi directeur dept:", error);
      alert(error.response?.data?.message || "Erreur lors de l'envoi au directeur de département.");
    } finally {
      toggleLoading(id, 'invite-dir', false);
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
      <h1 className="liste-doctorants-title">
        Liste des Doctorants <span style={{ fontSize: '0.6em', color: '#666' }}>({filteredDoctorants.length} / {totalDoctorants})</span>
      </h1>

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
          // modify temporally
          // onClick={handleDownloadFilteredPDFsOneByOne}
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
      {/* 📊 Bloc Statistiques Globales : Clickable Dashboard */}
      {/* 📊 Bloc Statistiques Globales : Clickable Dashboard */}
      <div className="stats-globales-container">
        <h2>📊 Tableau de Bord</h2>
        <div className="stats-grid">
          <div
            className="stats-card clickable"
            onClick={() => { setFilterStatus('Tous'); setFilterYear('Tous'); setStatusFilters(emptyStatusFilters); setSearchTerm(''); }}
            title="Réinitialiser tous les filtres"
          >
            <div className="stat-icon"><IconUserFriends /></div>
            <div className="stat-value">{totalDoctorants}</div>
            <div className="stat-label">Total Doctorants</div>
          </div>

          <div
            className="stats-card clickable"
            onClick={() => { setFilterStatus('Envoyé au doctorant'); }}
          >
            <div className="stat-icon"><IconPaperPlane /></div>
            <div className="stat-value">{totalEnvoyesDoctorant}</div>
            <div className="stat-label">Invités (Doc)</div>
          </div>

          <div
            className="stats-card clickable"
            onClick={() => { setFilterStatus('Doctorant validé'); }}
          >
            <div className="stat-icon" style={{ background: '#dcfce7', color: '#166534' }}><IconCheckCircle /></div>
            <div className="stat-value">{totalValidDoctorant}</div>
            <div className="stat-label">Validés (Doc)</div>
          </div>

          <div
            className="stats-card clickable"
            onClick={() => { setFilterStatus('Envoyé aux référents'); }}
          >
            <div className="stat-icon"><IconEnvelopeOpenText /></div>
            <div className="stat-value">{totalEnvoyesReferents}</div>
            <div className="stat-label">Invités (Réf)</div>
          </div>

          <div
            className="stats-card clickable"
            onClick={() => { setFilterStatus('Référents validés'); }}
          >
            <div className="stat-icon" style={{ background: '#dcfce7', color: '#166534' }}><IconHandshake /></div>
            <div className="stat-value">{totalValidReferents}</div>
            <div className="stat-label">Validés (Réf)</div>
          </div>

          <div
            className="stats-card clickable"
            onClick={() => { setFilterStatus('Envoyé au directeur de département'); }}
          >
            <div className="stat-icon"><IconBuilding /></div>
            <div className="stat-value">{totalEnvoyesDirecteurDept}</div>
            <div className="stat-label">Directeur Dpt.</div>
          </div>

          <div
            className="stats-card clickable"
            onClick={() => { setFilterStatus('Rapport final envoyé'); }}
          >
            <div className="stat-icon" style={{ background: '#ede9fe', color: '#5b21b6' }}><IconRocket /></div>
            <div className="stat-value">{totalRapportFinal}</div>
            <div className="stat-label">Rapports Finaux</div>
          </div>
        </div>
      </div>

      {/* 📋 Liste des doctorants */}
      <div className="table-container">
        <ul className="doctorants-list">
          {paginatedDoctorants.map((doc: any) => {
            return (
              <li key={doc._id} className="doctorant-card">
                {/* 1. HEADER: Name, ID, Dept, Global Status */}
                <div className="card-header">
                  <div className="header-main">
                    <h3 className="doctorant-name">
                      {doc.nom} {doc.prenom}
                    </h3>
                    <div className="doctorant-id-badge">ID: {doc.ID_DOCTORANT}</div>
                    <span className="dept-badge">DIRECT::{doc.departementDoctorant || "Non défini"}</span>
                  </div>
                  <div className="header-status">
                    <span className={`status-badge ${doc.statut === 'complet' ? 'status-complete' : 'status-pending'}`}>
                      {doc.statut}
                    </span>
                  </div>
                </div>

                {/* 2. BODY: Email, Director, Referents */}
                <div className="card-body">
                  <div className="info-grid">
                    {/* Column 1: Contact & Director */}
                    <div className="info-column">
                      <div className="info-item">
                        <span className="info-label">Doctorant Email</span>
                        <a href={`mailto:${doc.email}`} className="info-value email-link">{doc.email}</a>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Directeur de Thèse</span>
                        <span className="info-value font-bold">{doc.nomPrenomHDR || 'N/A'}</span>
                        {doc.email_HDR && (
                          <a href={`mailto:${doc.email_HDR}`} className="email-link-small">
                            &lt;{doc.email_HDR}&gt;
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Column 2: Referents */}
                    <div className="info-column full-width-mobile">
                      <span className="info-label">Référents</span>
                      <div className="referents-list">
                        {(doc.prenomMembre1 || doc.nomMembre1) && (
                          <div className="referent-chip">
                            <strong>#1 {doc.prenomMembre1} {doc.nomMembre1}</strong>
                            <br />
                            <a href={`mailto:${doc.emailMembre1}`} className="text-muted small">{doc.emailMembre1}</a>
                          </div>
                        )}
                        {(doc.prenomMembre2 || doc.nomMembre2) && (
                          <div className="referent-chip">
                            <strong>#2 {doc.prenomMembre2} {doc.nomMembre2}</strong>
                            <br />
                            <a href={`mailto:${doc.emailMembre2}`} className="text-muted small">{doc.emailMembre2}</a>
                          </div>
                        )}
                        {(!doc.prenomMembre1 && !doc.nomMembre1 && !doc.prenomMembre2 && !doc.nomMembre2) && (
                          <div className="referent-empty">
                            <span className="text-warning">⚠️ Référents non encore saisis par le doctorant</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2.5 STATS: Explicit Counters (Requested by User) */}
                <div className="card-stats">
                  <div className="stat-item">
                    <span>📨 Envois Doctorant :</span>
                    <span className="stat-value">{doc.NbSendToDoctorant || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span>📨 Envois Référents :</span>
                    <span className="stat-value">{doc.NbSendToRepresentants || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span>📨 Envois Final :</span>
                    <span className="stat-value">{doc.NbFinalSend || 0}</span>
                  </div>
                </div>

                {/* 3. STEPPER: 6 Steps with Red/Green logic */}
                <div className="card-stepper">
                  {/* Step 1: Sent to Doc */}
                  <div className={`step-item ${doc.sendToDoctorant ? 'completed' : 'pending'}`}>
                    <div className="step-circle">1</div>
                    <span className="step-label">Envoyé Doc.</span>
                  </div>
                  <div className="step-line"></div>

                  {/* Step 2: Validated by Doc */}
                  <div className={`step-item ${doc.doctorantValide ? 'completed' : 'pending'}`}>
                    <div className="step-circle">2</div>
                    <span className="step-label">Validation Doc.</span>
                  </div>
                  <div className="step-line"></div>

                  {/* Step 3: Sent to Refs */}
                  <div className={`step-item ${doc.sendToRepresentants ? 'completed' : 'pending'}`}>
                    <div className="step-circle">3</div>
                    <span className="step-label">Envoyé Réf.</span>
                  </div>
                  <div className="step-line"></div>

                  {/* Step 4: Validated by Refs */}
                  <div className={`step-item ${doc.representantValide ? 'completed' : 'pending'}`}>
                    <div className="step-circle">4</div>
                    <span className="step-label">Validation Réf.</span>
                  </div>
                  <div className="step-line"></div>

                  {/* Step 5: Sent to Director Dept */}
                  <div className={`step-item ${doc.gestionnaireDirecteurValide ? 'completed' : 'pending'}`}>
                    <div className="step-circle">5</div>
                    <span className="step-label">Directeur Dpt.</span>
                  </div>
                  <div className="step-line"></div>

                  {/* Step 6: Final Report */}
                  <div className={`step-item ${doc.finalSend ? 'completed' : 'pending'}`}>
                    <div className="step-circle">6</div>
                    <span className="step-label">Rapport Final</span>
                  </div>
                </div>

                {/* 4. ACTIONS: All buttons with Descriptive Labels */}
                <div className="card-actions">
                  <div className="primary-actions">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleSendEmail(doc._id, doc.email, doc.prenom, doc.nom)}
                      title="Renvoyer mail d'invitation au doctorant"
                      disabled={loadingMap[`${doc._id}-invite-doc`]}
                    >
                      {loadingMap[`${doc._id}-invite-doc`] ? <IconSpinner className="icon-spin" /> : '📩'} Invit. Doc
                    </button>

                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleResendReferentEmails(doc._id)}
                      title="Renvoyer mail avec rapport du doctorant aux référents"
                      disabled={loadingMap[`${doc._id}-invite-ref`]}
                    >
                      {loadingMap[`${doc._id}-invite-ref`] ? <IconSpinner className="icon-spin" /> : '📩'} Invit. Réf
                    </button>

                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleExportPDF(doc._id)}
                      title="Afficher PDF en fonction de l'avancement"
                      disabled={loadingMap[`${doc._id}-pdf`]}
                    >
                      {loadingMap[`${doc._id}-pdf`] ? <IconSpinner className="icon-spin" /> : '📄'} Voir PDF
                    </button>

                    <Link to={`/doctorant/modifier/${doc._id}`} className="btn-link">
                      <button className="btn btn-secondary btn-sm" title="Modifier contenu du rapport">
                        ✏️ Modifier
                      </button>
                    </Link>

                    <button
                      className="btn btn-outline-dark btn-sm"
                      onClick={() => handleSendDepartmentEmail(doc._id, doc.departementDoctorant, doc.email, doc.prenom, doc.nom)}
                      title="Envoyer mail au directeur de département"
                      disabled={loadingMap[`${doc._id}-invite-dir`]}
                      style={{ borderColor: '#666', color: '#666' }}
                    >
                      {loadingMap[`${doc._id}-invite-dir`] ? <IconSpinner className="icon-spin" /> : '🏛️'} Invit. Dir
                    </button>

                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleSendFinalReport(doc._id)}
                      title="Envoyer rapport final au doctorant + directeur"
                      disabled={loadingMap[`${doc._id}-final`]}
                    >
                      {loadingMap[`${doc._id}-final`] ? <IconSpinner className="icon-spin" /> : '🚀'} Envoi Final
                    </button>
                  </div>

                  <div className="danger-actions">
                    <button onClick={() => handleDelete(doc._id)} className="btn btn-danger btn-sm">
                      🗑️ Supprimer
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
    </div >
  );
};

// End of component
export default ListeDoctorants;