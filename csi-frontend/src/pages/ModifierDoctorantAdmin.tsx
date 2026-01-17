import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FaFilePdf, FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaUserShield, FaGraduationCap, FaUniversity, FaClipboardList, FaBullhorn, FaQuestionCircle, FaChartLine } from 'react-icons/fa';

// Fix for React 18 type mismatch with react-icons
// Fix for React 18 type mismatch with react-icons
const IconFilePdf = FaFilePdf as any;
const IconArrowLeft = FaArrowLeft as any;
const IconCheckCircle = FaCheckCircle as any;
const IconExclamationTriangle = FaExclamationTriangle as any;
const IconUserShield = FaUserShield as any;
const IconGraduationCap = FaGraduationCap as any;
const IconUniversity = FaUniversity as any;
const IconClipboardList = FaClipboardList as any;
const IconBullhorn = FaBullhorn as any;
const IconQuestionCircle = FaQuestionCircle as any;
const IconChartLine = FaChartLine as any;

const ModifierDoctorantAdmin: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [doctorant, setDoctorant] = useState<any>(null);
    const [doctorantQuestions, setDoctorantQuestions] = useState<any[]>([]);
    // const [referentQuestions, setReferentQuestions] = useState<any[]>([]); // Unused
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false); // ⚠️ Unsaved Changes Tracker
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                if (!token) {
                    setError("Accès refusé. Vous devez être connecté en tant qu'administrateur.");
                    setLoading(false);
                    return;
                }

                const docResponse = await api.get(`/doctorant/admin/${id}`, {
                    headers: { Authorization: token }
                });

                const [qDocResponse] = await Promise.all([
                    api.get('/questions?target=doctorant'),
                    api.get('/questions?target=referent')
                ]);

                setDoctorant(docResponse.data);
                setDoctorantQuestions(qDocResponse.data);
                // setReferentQuestions(qRefResponse.data);
                setLoading(false);
            } catch (err: any) {
                console.error("Erreur lors de la récupération des données :", err);
                if (err.response && err.response.status === 401) {
                    setError("Session expirée ou non autorisée. Veuillez vous reconnecter.");
                } else {
                    setError("Impossible de charger le doctorant (ID invalide ou erreur serveur).");
                }
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setDoctorant({ ...doctorant, [name]: value });
        setIsDirty(true);
    };

    /* const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDoctorant({ ...doctorant, [name]: Number(value) });
        setIsDirty(true);
    }; */

    const handleResponseChange = (questionId: string, field: 'value' | 'comment', newValue: string) => {
        const updatedResponses = [...(doctorant.responses || [])];
        const index = updatedResponses.findIndex((r: any) => r.questionId === questionId);

        if (index >= 0) {
            updatedResponses[index] = { ...updatedResponses[index], [field]: newValue };
        } else {
            updatedResponses.push({
                questionId,
                value: field === 'value' ? newValue : '',
                comment: field === 'comment' ? newValue : ''
            });
        }

        setDoctorant({ ...doctorant, responses: updatedResponses });
        setIsDirty(true);
    };

    const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const updatedDoctorant = { ...doctorant, [name]: Number(value) || 0 };

        updatedDoctorant.totalNbHours =
            (updatedDoctorant.nbHoursScientificModules || 0) +
            (updatedDoctorant.nbHoursCrossDisciplinaryModules || 0) +
            (updatedDoctorant.nbHoursProfessionalIntegrationModules || 0);

        setDoctorant(updatedDoctorant);
        setIsDirty(true);
    };

    const toggleStatus = async (field: string) => {
        const currentValue = doctorant[field];
        if (!window.confirm(`Voulez-vous basculer "${field}" de ${currentValue ? 'OUI' : 'NON'} à ${!currentValue ? 'OUI' : 'NON'} ?`)) return;

        try {
            const newValue = !doctorant[field];
            await api.put(`/doctorant/${doctorant._id}`, { [field]: newValue });
            setDoctorant({ ...doctorant, [field]: newValue });
        } catch (err) {
            console.error(err);
            alert("❌ Erreur lors de la mise à jour du statut.");
        }
    };

    const handleRegeneratePDF = async () => {
        if (!window.confirm("⚠️ Régénérer le PDF écrasera l'ancien avec les données actuelles. Continuer ?")) return;
        try {
            await api.post(`/doctorant/regenerate-pdf/${doctorant._id}`);
            alert("✅ PDF régénéré avec succès !");
            const response = await api.get(`/doctorant/admin/${id}`, {
                headers: { Authorization: localStorage.getItem('adminToken') }
            });
            setDoctorant(response.data);
        } catch (err) {
            console.error(err);
            alert("❌ Erreur lors de la régénération du PDF.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setError(null);

        if (!window.confirm("Enregistrer les modifications ?")) return;

        setSubmitting(true);

        const { _id: _unusedId, __v: _unusedV, fichiersExternes: _unusedFiles, dateValidation: _unusedDate, ...sanitizedDoctorant } = doctorant;

        // Clean empty fields
        Object.keys(sanitizedDoctorant).forEach((key) => {
            if (sanitizedDoctorant[key] === "" || sanitizedDoctorant[key] === null) {
                if (typeof sanitizedDoctorant[key] === 'string' && sanitizedDoctorant[key] === "") {
                    delete sanitizedDoctorant[key];
                }
            }
        });

        try {
            await api.put(`/doctorant/${doctorant._id}`, sanitizedDoctorant);
            setMessage("✅ Doctorant mis à jour avec succès !");
            setIsDirty(false);
            window.scrollTo(0, 0);
        } catch (err) {
            console.error("❌ Erreur save :", err);
            setError("Échec de la sauvegarde.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}><h3>Chargement des données...</h3></div>;
    if (error) return (
        <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
            <h3 style={{ color: '#d9534f' }}><IconExclamationTriangle /> Erreur</h3>
            <p>{error}</p>
            <button onClick={() => navigate('/login')} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>Retour connexion</button>
        </div>
    );
    if (!doctorant) return <div className="container"><p>Introuvable.</p></div>;

    // --- STYLES ---

    const sectionStyle = {
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        marginBottom: '30px',
        border: '1px solid #e1e4e8'
    };

    const sectionHeaderStyle = {
        marginTop: 0,
        marginBottom: '25px',
        color: '#1a202c',
        borderBottom: '2px solid #edf2f7',
        paddingBottom: '15px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '1.25em',
        fontWeight: '600'
    };

    const inputGroupStyle = {
        marginBottom: '15px'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '500',
        color: '#4a5568',
        fontSize: '0.9em'
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '6px',
        border: '1px solid #cbd5e0',
        fontSize: '0.95em',
        transition: 'border-color 0.2s',
        outline: 'none',
        backgroundColor: '#f8fafc'
    };

    const subHeaderStyle = {
        color: '#2d3748',
        fontSize: '1.1em',
        fontWeight: '600',
        marginTop: '25px',
        marginBottom: '15px',
        paddingBottom: '8px',
        borderBottom: '1px solid #e2e8f0'
    };

    // --- RENDER HELPERS ---

    // Helper to get response value safely
    const getResponse = (qId: string) => doctorant.responses?.find((r: any) => r.questionId === qId) || {};

    const renderQuestions = (questions: any[], sectionTitle: string, icon: any) => {
        const filtered = questions.filter((q: any) => !q.systemId).sort((a: any, b: any) => a.order - b.order);
        if (filtered.length === 0) return null;

        return (
            <div style={sectionStyle}>
                <h2 style={sectionHeaderStyle}>{icon} {sectionTitle}</h2>
                {filtered.map((q: any) => {
                    const resp = getResponse(q._id);
                    const isScale = q.type === 'scale_1_5' || q.type === 'rating_comment';
                    // We check if it is "visually empty" just to add a hint, but we render inputs regardless
                    const hasValue = resp.value !== undefined && resp.value !== null && resp.value !== '';

                    return (
                        <div key={q._id} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '5px', border: '1px solid #eee' }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#2d3748' }}>
                                {q.content}
                            </label>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <span style={{ fontSize: '0.85em', color: '#718096', marginBottom: '5px', display: 'block' }}>Réponse :</span>
                                    {isScale ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            {!hasValue && <span style={{ fontSize: '0.8em', color: '#e53e3e', fontWeight: 'bold' }}>⚠️ Non répondu (Modifier pour définir)</span>}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="5"
                                                    step="1"
                                                    value={Number(resp.value) || 1} // Default visual to 1 if empty, but shows "Non répondu" above
                                                    onChange={(e) => handleResponseChange(q._id, 'value', e.target.value)}
                                                    style={{ flex: 1, cursor: 'pointer' }}
                                                />
                                                <span style={{ fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>
                                                    {resp.value || '-'}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={resp.value || ''}
                                            onChange={(e) => handleResponseChange(q._id, 'value', e.target.value)}
                                            style={inputStyle}
                                            placeholder={hasValue ? "" : "Non répondu - Saisir une réponse..."}
                                        />
                                    )}
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.85em', color: '#718096', marginBottom: '5px', display: 'block' }}>Commentaire :</span>
                                    <input
                                        type="text"
                                        value={resp.comment || ''}
                                        onChange={(e) => handleResponseChange(q._id, 'comment', e.target.value)}
                                        style={inputStyle}
                                        placeholder="Commentaire optionnel"
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '100px', backgroundColor: '#f8f9fa', position: 'relative', fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>

            {/* FLOATING UNSAVED CHANGES WARNING */}
            {isDirty && (
                <div style={{
                    position: 'fixed',
                    bottom: '30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#1a202c',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '50px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    fontWeight: '600',
                    border: '1px solid #2d3748'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconExclamationTriangle style={{ color: '#ecc94b', fontSize: '1.2em' }} />
                        <span style={{ fontSize: '0.95em' }}>Modifications non enregistrées</span>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        style={{
                            backgroundColor: '#ecc94b',
                            color: '#1a202c',
                            border: 'none',
                            padding: '8px 20px',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '0.9em',
                            transition: 'transform 0.1s',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}
                    >
                        {submitting ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', paddingTop: '30px' }}>
                <button onClick={() => navigate('/doctorants')} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', color: '#4a5568', fontWeight: '500' }}>
                    <IconArrowLeft /> Retour
                </button>
                <h1 style={{ margin: 0, color: '#1a202c', fontSize: '1.8em', fontWeight: '700' }}>Administration : {doctorant.prenom} {doctorant.nom}</h1>
            </div>

            {message && <div style={{ padding: '15px', backgroundColor: '#c6f6d5', color: '#276749', borderRadius: '8px', marginBottom: '20px', border: '1px solid #9ae6b4', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500' }}><IconCheckCircle /> {message}</div>}

            {/* ACTIONS ADMINISTRATIVES */}
            <div style={{ ...sectionStyle, backgroundColor: '#ebf8ff', borderColor: '#bee3f8' }}>
                <h2 style={{ ...sectionHeaderStyle, color: '#2c5282', borderBottomColor: '#bee3f8' }}><IconUserShield /> Actions Administratives</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '25px' }}>
                    <div style={inputGroupStyle}>
                        <label style={{ ...labelStyle, color: '#2b6cb0' }}>Commentaire de suivi (Interne) :</label>
                        <textarea
                            name="suiviComment"
                            value={doctorant.suiviComment || ''}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Note réservée aux administrateurs..."
                            style={{ ...inputStyle, borderColor: '#90cdf4', backgroundColor: '#fff' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <label style={{ ...labelStyle, color: '#2b6cb0' }}>Documents :</label>
                        <button type="button" onClick={handleRegeneratePDF} style={{ backgroundColor: '#3182ce', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(49, 130, 206, 0.3)' }}>
                            <IconFilePdf /> Régénérer le Rapport PDF
                        </button>
                        {doctorant.rapport?.url && (
                            <a href={doctorant.rapport.url} target="_blank" rel="noreferrer" style={{ textAlign: 'center', color: '#3182ce', textDecoration: 'none', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                <IconFilePdf /> Voir le PDF actuel
                            </a>
                        )}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                    {[
                        { key: 'sendToDoctorant', label: 'Envoyé au Doc.' },
                        { key: 'doctorantValide', label: 'Validé par Doc.' },
                        { key: 'sendToRepresentants', label: 'Envoyé aux Réf.' },
                        { key: 'representantValide', label: 'Validé par Réf.' },
                        { key: 'finalSend', label: 'Envoi Final' }
                    ].map(status => (
                        <div key={status.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', background: '#fff', border: '1px solid', borderColor: doctorant[status.key] ? '#c6f6d5' : '#fed7d7', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <span style={{ fontSize: '0.85em', color: '#718096', marginBottom: '8px', fontWeight: '500' }}>{status.label}</span>
                            <strong style={{ color: doctorant[status.key] ? '#2f855a' : '#c53030', fontSize: '1.2em', marginBottom: '8px' }}>
                                {doctorant[status.key] ? 'OUI' : 'NON'}
                            </strong>
                            <button type="button" onClick={() => toggleStatus(status.key)} style={{ fontSize: '0.8em', cursor: 'pointer', background: '#f7fafc', border: '1px solid #cbd5e0', padding: '4px 10px', borderRadius: '4px', color: '#4a5568' }}>Changer</button>
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* IDENTITÉ */}
                <div style={sectionStyle}>
                    <h2 style={sectionHeaderStyle}><IconGraduationCap /> Identité & Inscription</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        <div style={inputGroupStyle}><label style={labelStyle}>Prénom</label><input type="text" name="prenom" value={doctorant.prenom || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Nom</label><input type="text" name="nom" value={doctorant.nom || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Email</label><input type="email" name="email" value={doctorant.email || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>ID Doctorant</label><input type="text" name="ID_DOCTORANT" value={doctorant.ID_DOCTORANT || ''} onChange={handleChange} style={inputStyle} /></div>

                        <div style={inputGroupStyle}><label style={labelStyle}>Date 1ère Inscription</label><input type="date" name="datePremiereInscription" value={doctorant.datePremiereInscription?.split('T')[0] || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Date Entretien</label><input type="date" name="dateEntretien" value={doctorant.dateEntretien?.split('T')[0] || ''} onChange={handleChange} style={inputStyle} /></div>

                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Département</label>
                            <select name="departementDoctorant" value={doctorant.departementDoctorant || ''} onChange={handleChange} style={inputStyle}>
                                <option value="">-- Sélectionner --</option>
                                <option value="MECA">MECA</option>
                                <option value="PP">PP</option>
                                <option value="IM">IM</option>
                                <option value="IMMUNO">IMMUNO</option>
                                <option value="GENYX">GENYX</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* THÈSE */}
                <div style={sectionStyle}>
                    <h2 style={sectionHeaderStyle}><IconUniversity /> Thèse & Encadrement</h2>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Titre de la Thèse</label>
                        <textarea name="titreThese" value={doctorant.titreThese || ''} onChange={handleChange} rows={2} style={inputStyle} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '15px' }}>
                        <div style={inputGroupStyle}><label style={labelStyle}>Année Thèse</label><input type="text" name="anneeThese" value={doctorant.anneeThese || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Type Financement</label><input type="text" name="typeFinancement" value={doctorant.typeFinancement || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>ORCID</label><input type="text" name="orcid" value={doctorant.orcid || ''} placeholder="0000-0000-0000-0000" onChange={handleChange} style={inputStyle} /></div>
                    </div>

                    <h4 style={subHeaderStyle}>Laboratoire & Équipe</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        <div style={inputGroupStyle}><label style={labelStyle}>Intitulé UR</label><input type="text" name="intituleUR" value={doctorant.intituleUR || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Directeur UR</label><input type="text" name="directeurUR" value={doctorant.directeurUR || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Intitulé Équipe</label><input type="text" name="intituleEquipe" value={doctorant.intituleEquipe || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Directeur Équipe</label><input type="text" name="directeurEquipe" value={doctorant.directeurEquipe || ''} onChange={handleChange} style={inputStyle} /></div>
                    </div>

                    <h4 style={subHeaderStyle}>Encadrement</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        <div style={inputGroupStyle}><label style={labelStyle}>Directeur Thèse (HDR)</label><input type="text" name="nomPrenomHDR" value={doctorant.nomPrenomHDR || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Email HDR</label><input type="email" name="email_HDR" value={doctorant.email_HDR || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Co-Directeur</label><input type="text" name="coDirecteurThese" value={doctorant.coDirecteurThese || ''} onChange={handleChange} style={inputStyle} /></div>
                    </div>
                </div>

                {/* COMITÉ CSI */}
                <div style={sectionStyle}>
                    <h2 style={sectionHeaderStyle}><IconClipboardList /> Comité CSI</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                        <div style={inputGroupStyle}><label style={labelStyle}>Membre 1 (Nom)</label><input type="text" name="nomMembre1" value={doctorant.nomMembre1 || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Membre 1 (Email)</label><input type="email" name="emailMembre1" value={doctorant.emailMembre1 || ''} onChange={handleChange} style={inputStyle} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                        <div style={inputGroupStyle}><label style={labelStyle}>Membre 2 (Nom)</label><input type="text" name="nomMembre2" value={doctorant.nomMembre2 || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Membre 2 (Email)</label><input type="email" name="emailMembre2" value={doctorant.emailMembre2 || ''} onChange={handleChange} style={inputStyle} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={inputGroupStyle}><label style={labelStyle}>Membre Add. (Nom)</label><input type="text" name="nomAdditionalMembre" value={doctorant.nomAdditionalMembre || ''} onChange={handleChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Membre Add. (Email)</label><input type="email" name="emailAdditionalMembre" value={doctorant.emailAdditionalMembre || ''} onChange={handleChange} style={inputStyle} /></div>
                    </div>
                </div>

                {/* FORMULAIRE ÉTUDIANT */}
                {renderQuestions(doctorantQuestions, "Auto-évaluation de l'étudiant", <IconQuestionCircle />)}

                {/* ACTIVITÉS & FORMATIONS */}
                <div style={sectionStyle}>
                    <h2 style={sectionHeaderStyle}><IconBullhorn /> Activités scientifiques & Formations</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                        <div style={inputGroupStyle}><label style={labelStyle}>Missions</label><textarea name="missions" value={doctorant.missions || ''} onChange={handleChange} rows={4} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Publications</label><textarea name="publications" value={doctorant.publications || ''} onChange={handleChange} rows={4} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Conférences</label><textarea name="conferencePapers" value={doctorant.conferencePapers || ''} onChange={handleChange} rows={4} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Posters</label><textarea name="posters" value={doctorant.posters || ''} onChange={handleChange} rows={4} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Comm. Publique</label><textarea name="publicCommunication" value={doctorant.publicCommunication || ''} onChange={handleChange} rows={4} style={inputStyle} /></div>
                    </div>

                    <h4 style={subHeaderStyle}>Heures de Formation</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                        <div style={inputGroupStyle}><label style={labelStyle}>Scientifique</label><input type="number" name="nbHoursScientificModules" value={doctorant.nbHoursScientificModules || 0} onChange={handleHoursChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Transverses</label><input type="number" name="nbHoursCrossDisciplinaryModules" value={doctorant.nbHoursCrossDisciplinaryModules || 0} onChange={handleHoursChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>Insertion Pro.</label><input type="number" name="nbHoursProfessionalIntegrationModules" value={doctorant.nbHoursProfessionalIntegrationModules || 0} onChange={handleHoursChange} style={inputStyle} /></div>
                        <div style={inputGroupStyle}><label style={labelStyle}>TOTAL</label><input type="number" value={doctorant.totalNbHours || 0} disabled style={{ ...inputStyle, backgroundColor: '#e2e8f0', fontWeight: 'bold' }} /></div>
                    </div>
                </div>

                {/* CONCLUSION & RECOMMANDATION (STRICTLY MATCHING FormulaireToken.tsx) */}
                <div style={{ ...sectionStyle, borderLeft: '5px solid #3182ce' }}>
                    <h2 style={{ ...sectionHeaderStyle, color: '#2b6cb0' }}><IconChartLine /> Conclusion & Recommendations</h2>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>General Conclusion</label>
                        <textarea
                            name="conclusion"
                            value={doctorant.conclusion || ''}
                            onChange={handleChange}
                            rows={4}
                            style={{ ...inputStyle, minHeight: '120px' }}
                            placeholder="Summarize the interview..."
                        />
                    </div>

                    <div style={{ ...inputGroupStyle, marginTop: '25px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                        <label style={{ ...labelStyle, marginBottom: '15px', color: '#1a202c', fontSize: '1em' }}>Committee Recommendation</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { val: "approve", label: "The committee approves the re-registration" },
                                { val: "disapprove", label: "The committee disapproves of the re-registration" },
                                { val: "exemption", label: "The committee supports the request for an exemption for an additional registration" },
                                { val: "unfavourable", label: "The committee issues an unfavourable opinion on the request for a derogation for additional registration" },
                                { val: "new_meeting", label: "The committee advises scheduling a new meeting with the CSI" }
                            ].map(opt => (
                                <label key={opt.val} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.95em', color: '#2d3748' }}>
                                    <input
                                        type="radio"
                                        name="recommendation"
                                        value={opt.val}
                                        checked={doctorant.recommendation === opt.val}
                                        onChange={handleChange}
                                        style={{ marginRight: '12px', transform: 'scale(1.2)', accentColor: '#3182ce' }}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ ...inputGroupStyle, marginTop: '25px' }}>
                        <label style={labelStyle}>Specific Comments on Recommendation</label>
                        <textarea
                            name="recommendation_comment"
                            value={doctorant.recommendation_comment || ''}
                            onChange={handleChange}
                            rows={2}
                            style={inputStyle}
                            placeholder="Any specific reasons or advice..."
                        />
                    </div>
                </div>

            </form>
        </div>
    );
};

export default ModifierDoctorantAdmin;