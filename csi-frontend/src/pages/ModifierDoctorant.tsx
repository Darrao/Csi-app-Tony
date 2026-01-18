import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/FormulaireToken.css';
import { SystemBlockRenderer } from '../components/form-blocks/SystemBlockRenderer';
// ajouter container et class pour le css

const ModifierDoctorant: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [doctorant, setDoctorant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    // const [selectedFiles1, setSelectedFiles1] = useState<FileList | null>(null);
    // const [selectedFiles2, setSelectedFiles2] = useState<FileList | null>(null);
    // Stockage local des fichiers avant upload
    // const [tempFiles, setTempFiles] = useState<File[]>([]);
    const [scientificReport, setScientificReport] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [missingFields, setMissingFields] = useState<string[]>([]);
    const scientificReportInputRef = useRef<HTMLInputElement>(null);

    // Dynamic Questions State
    const [questions, setQuestions] = useState<any[]>([]);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const res = await api.get('/questions?target=doctorant');
                // Sort
                const sorted = res.data.sort((a: any, b: any) => a.order - b.order);
                setQuestions(sorted);
            } catch (err) {
                console.error("Error fetching questions:", err);
            }
        };
        fetchQuestions();
    }, []);

    const handleResponseChange = (questionId: string, field: 'value' | 'comment', newValue: string) => {
        setDoctorant((prev: any) => {
            const responses = prev.responses ? [...prev.responses] : [];
            const existingIndex = responses.findIndex((r: any) => r.questionId === questionId);

            if (existingIndex >= 0) {
                const updatedResponse = { ...responses[existingIndex], [field]: newValue };
                responses[existingIndex] = updatedResponse;
            } else {
                responses.push({
                    questionId,
                    value: field === 'value' ? newValue : '',
                    comment: field === 'comment' ? newValue : ''
                });
            }
            return { ...prev, responses };
        });
    };

    const getResponseValue = (questionId: string, field: 'value' | 'comment') => {
        if (!doctorant?.responses) return '';
        const response = doctorant.responses.find((r: any) => r.questionId === questionId);
        return response ? response[field] : '';
    };




    useEffect(() => {
        const fetchDoctorant = async () => {
            try {
                const response = await api.get(`/doctorant/${id}`);
                setDoctorant(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Erreur lors de la récupération du doctorant :", err);
                setError("Vous avez déjà rempli votre formulaire !");
                setLoading(false);
            }
        };

        fetchDoctorant();
    }, [id]);

    // Auto-scroll to error
    useEffect(() => {
        if (missingFields.length > 0) {
            // Find first element with class 'input-error'
            // We need to wait slightly for render? Usually useEffect runs after render.
            // Using a small timeout to ensure DOM update
            const timer = setTimeout(() => {
                const firstError = document.querySelector('.input-error');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    (firstError as HTMLElement).focus?.();
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [missingFields]);

    if (loading) return <p>Chargement des données...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;
    if (!doctorant) return <p>Aucune donnée trouvée.</p>;

    // const _id = doctorant?._id;
    // const fichiersExternes = doctorant?.fichiersExternes || [];
    // const sanitizedDoctorant = doctorant ? { ...doctorant } : {};


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setDoctorant({ ...doctorant, [name]: value });
    };

    // Ajout des fichiers dans le state (sans les envoyer encore)
    const MAX_FILE_SIZE_MB = 5;
    const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];

            if (selectedFile.size > MAX_FILE_SIZE) {
                alert(`❌ Le fichier sélectionné dépasse la taille maximale autorisée de ${MAX_FILE_SIZE_MB} Mo.`);
                // On réinitialise le champ fichier
                e.target.value = '';
                return;
            }

            if (fileType === "scientificReport") {
                setScientificReport(selectedFile);
            }
        }
    };

    // Suppression des fichiers dans le frontend uniquement
    const handleRemoveFile = (fileType: string) => {
        if (fileType === "scientificReport") {
            setScientificReport(null);
            if (scientificReportInputRef.current) {
                scientificReportInputRef.current.value = "";
            }
        }
    };

    /* const handleUpload = async (fileType: number) => {
        const files = fileType === 1 ? selectedFiles1 : selectedFiles2;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append("fichiersExternes", files[i]);
        }

        try {
            await api.post(`/doctorant/upload/${id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            alert("Fichiers uploadés !");
            window.location.reload(); // Recharge la page pour afficher les nouveaux fichiers
        } catch (err) {
            console.error("Erreur upload :", err);
            setError("Erreur lors de l'upload des fichiers.");
        }
    }; */

    const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const updatedDoctorant = { ...doctorant, [name]: Number(value) || 0 };

        // Recalcule le nombre total d'heures automatiquement
        updatedDoctorant.totalNbHours =
            (updatedDoctorant.nbHoursScientificModules || 0) +
            (updatedDoctorant.nbHoursCrossDisciplinaryModules || 0) +
            (updatedDoctorant.nbHoursProfessionalIntegrationModules || 0);

        setDoctorant(updatedDoctorant);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setError(null);

        // Vérification des champs obligatoires
        const requiredFields = [
            "prenom", "nom", "email", "datePremiereInscription", "ID_DOCTORANT",
            "departementDoctorant", "titreThese", "anneeThese", "typeFinancement",
            "intituleUR", "directeurUR", "intituleEquipe", "directeurEquipe",
            "nomPrenomHDR", "email_HDR", "nomMembre1", "emailMembre1",
            "nomMembre2", "emailMembre2"
        ];

        const missing = requiredFields.filter(field => !doctorant[field] || doctorant[field].trim() === "");

        // 🔴 Vérifier si le rapport scientifique est bien présent
        if (!scientificReport) {
            missing.push("scientificReport");
        }

        // 🔴 Vérifier les questions dynamiques obligatoires

        const missingQuestions: string[] = [];
        const missingQuestionIds: string[] = [];
        questions.forEach(q => {
            if (q.required) {
                const val = getResponseValue(q._id, 'value');
                if (!val || val.trim() === '') {
                    missingQuestions.push(q.content);
                    missingQuestionIds.push(q._id);
                }
            }
        });

        if (missing.length > 0 || missingQuestions.length > 0) {
            const allMissing = [...missing, ...missingQuestionIds];
            setMissingFields(allMissing); // Stocker les IDs des champs manquants
            // Removed alert
            return;
        }

        // ✅ Confirmation avant soumission
        const confirmation = window.confirm("Êtes-vous sûr de vouloir valider ?\nAvez-vous bien tout vérifié ?");
        if (!confirmation) return;

        setSubmitting(true);

        const { _id: _unusedId, __v: _unusedV, fichiersExternes: _unusedFiles, dateValidation: _unusedDate, ...sanitizedDoctorant } = doctorant;

        // 🔥 Supprime les champs vides (backend peut les rejeter)
        Object.keys(sanitizedDoctorant).forEach((key) => {
            // console.log("🔑 Clé :", key, " | Valeur :", sanitizedDoctorant[key]);
            if (sanitizedDoctorant[key] === "" || sanitizedDoctorant[key] === null) {
                delete sanitizedDoctorant[key];
            }
        });

        // 📅 Ajoute automatiquement la date de validation si elle est vide
        if (!doctorant.dateValidation) {
            const today = new Date().toISOString().split('T')[0];
            sanitizedDoctorant.dateValidation = today;
            setDoctorant({ ...doctorant, dateValidation: today }); // Met à jour l'affichage
        }



        sanitizedDoctorant.doctorantValide = true; // Marque le doctorant comme validé

        console.log("📩 Données nettoyées envoyées :", sanitizedDoctorant); // 🔍 Vérifie les données propres

        try {
            let uploadedFiles: any[] = [...(doctorant.fichiersExternes || [])];

            // Étape 1 : Upload des fichiers et récupération de leurs infos
            if (scientificReport) {
                const formData = new FormData();
                if (scientificReport) formData.append("fichiersExternes", scientificReport);

                console.log("📂 Upload des fichiers :", { scientificReport });

                const uploadResponse = await api.post(`/doctorant/upload/${id}`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                console.log("✅ Fichiers uploadés :", uploadResponse.data);
                uploadedFiles = uploadResponse.data.fichiersExternes;
            }

            // Étape 2 : Mise à jour du doctorant avec les fichiers stockés dans fichiersExternes
            sanitizedDoctorant.fichiersExternes = uploadedFiles;

            console.log("📩 Envoi des données mises à jour :", sanitizedDoctorant);
            const response = await api.put(`/doctorant/${doctorant._id}`, sanitizedDoctorant);
            console.log("✅ Réponse API :", response.data);
            setMessage("Modifications enregistrées avec succès !");

            // 📩 Envoi d'un email aux référents s'ils existent
            const referentsEmails = [
                doctorant.emailMembre1,
                doctorant.emailMembre2,
                doctorant.emailAdditionalMembre
            ].filter(Boolean);

            // console.log("📧 Emails des référents :", referentsEmails);
            if (referentsEmails.length > 0) {
                console.log(doctorant.email_HDR)
                await api.post('/email/send', { emails: referentsEmails, doctorantPrenom: doctorant.prenom, doctorantNom: doctorant.nom, doctorantEmail: doctorant.email, directeurTheseEmail: doctorant.email_HDR });
                console.log('doctorant prenom' + doctorant.prenom);
                console.log("📧 Emails envoyés aux référents :", referentsEmails);
            }

            console.log("✅ Mise à jour réussie !");
            setTimeout(() => navigate("/merci"), 2000); // ⏳ Attend 2 sec avant la redirection
        } catch (err) {
            console.error("❌ Erreur lors de la mise à jour :", err);
            setError("Échec de la mise à jour.");
        } finally {
            setSubmitting(false); // Désactive l'animation de chargement
        }
    };



    // Helper to group questions
    const groupQuestionsBySection = (qs: any[]) => {
        const groups: { section: string, questions: any[] }[] = [];
        let currentGroup: { section: string, questions: any[] } | null = null;

        qs.forEach(q => {
            if (!currentGroup || currentGroup.section !== q.section) {
                if (currentGroup) groups.push(currentGroup);
                currentGroup = { section: q.section, questions: [] };
            }
            currentGroup.questions.push(q);
        });
        if (currentGroup) groups.push(currentGroup);
        return groups;
    };

    // Special Renderer for Documents (Local because it uses local state)
    const DocumentsUploadBlock = () => (
        <>
            {/* Rapport Scientifique */}
            <div className={`question-block ${missingFields.includes("scientificReport") ? 'input-error-block' : ''}`} style={{ marginBottom: '20px' }}>
                <label className="question-text">Your annual scientific report <span className="red">*</span></label>
                <p className="warning-message" style={{ color: '#856404', backgroundColor: '#fff3cd', padding: '10px', borderRadius: '5px', border: '1px solid #ffeeba', fontSize: '0.9em' }}>
                    ⚠️ Do not reuse last year’s CSI form. All required information is now entered directly into the online form. Please upload only your current scientific report as a separate PDF.
                </p>
                <span style={{ fontSize: '0.8em', color: '#666' }}>(Max: 5 MB, format PDF)</span>

                {/* Existing File Display */}
                {doctorant?.fichiersExternes && doctorant.fichiersExternes.length > 0 && !scientificReport && (
                    <div className="file-preview" style={{ marginTop: '10px', marginBottom: '10px', padding: '8px', background: '#e9ecef', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px', width: 'fit-content' }}>
                        <span style={{ fontWeight: 'bold' }}>📄 Current File:</span>
                        {/* We assume the first file is the report or we iterate. For now, take the last one or just lists them? usually only 1 */}
                        {doctorant.fichiersExternes.map((file: any, index: number) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>{file.originalname || file.name}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        // Construct URL - assuming backend serves uploads or we use a specific endpoint
                                        // If path is relative, prepend backend URL. 
                                        // If we don't know mechanism, we might try to use the same logic as admin?
                                        // Admin uses `doctorant.rapport.url`. 
                                        // For custom files, maybe just open the path if it's public? 
                                        // Warn: 'fichiersExternes' might just be the DB object.
                                        // Let's assume there is a route or we can use the path. 
                                        // Replicating ListeDoctorants logic: window.open(url)
                                        // But what IS the url? 
                                        // If file.path exists.
                                        const url = file.url || (file.path ? `http://localhost:3000/${file.path}` : null); // Hacky fallback
                                        if (url) window.open(url, '_blank');
                                        else alert("File URL not found");
                                    }}
                                    style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.9em'
                                    }}
                                >
                                    View PDF
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <br />
                <input
                    className={missingFields.includes("scientificReport") ? 'input-error' : ''}
                    ref={scientificReportInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileChange(e, "scientificReport")}
                    style={{ marginTop: '10px' }}
                />

                {scientificReport && (
                    <div className="file-preview" style={{ marginTop: '10px', padding: '5px', background: '#e9ecef', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 'fit-content' }}>
                        <span style={{ marginRight: '10px' }}>📄 {scientificReport.name}</span>
                        <button type="button" onClick={() => handleRemoveFile("scientificReport")} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'red' }}>🗑</button>
                    </div>
                )}
                {missingFields.includes("scientificReport") && (
                    <p style={{ color: "red", fontWeight: "bold", marginTop: '5px' }}>⚠️ You must upload your annual scientific report.</p>
                )}
            </div>

            {/* Auto-évaluation REMOVED */}

        </>
    );

    const renderDynamicQuestion = (q: any) => {
        const isMissing = missingFields.includes(q._id);
        return (
            <div key={q._id} className={`question-block ${isMissing ? 'input-error-block' : ''}`} style={{ gridColumn: '1 / -1', marginBottom: '20px', padding: '15px', border: isMissing ? '2px solid #dc3545' : '1px solid #eee', borderRadius: '8px', backgroundColor: isMissing ? '#fff8f8' : 'white' }}>
                <label className="question-text" style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', color: isMissing ? '#dc3545' : 'inherit' }}>
                    {q.content}
                    {q.required && <span className="red"> *</span>}
                </label>

                {q.helpText && (
                    <p style={{ fontSize: '0.85em', color: '#666', marginTop: '-5px', marginBottom: '10px' }}>
                        ℹ️ {q.helpText}
                    </p>
                )}

                <div className="input-group">
                    {q.type === 'plus_minus_comment' ? (
                        <select
                            className={`select-input ${isMissing ? 'input-error' : ''}`}
                            value={getResponseValue(q._id, 'value')}
                            onChange={(e) => handleResponseChange(q._id, 'value', e.target.value)}
                        >
                            <option value="">{q.placeholder || "Choose an option..."}</option>
                            <option value="+">+ (Strong/Yes)</option>
                            <option value="-">- (Weak/No)</option>
                            <option value="±">± (Moderate/Mixed)</option>
                            <option value="NotAddressed">Not Addressed</option>
                        </select>
                    ) : q.type === 'scale_1_5' || q.type === 'rating_comment' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontSize: '0.9em', color: '#666' }}>Low (1)</span>
                            <div style={{ flex: 1 }}>
                                <input
                                    className={isMissing ? 'input-error' : ''}
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="1"
                                    value={getResponseValue(q._id, 'value') || 3}
                                    onChange={(e) => handleResponseChange(q._id, 'value', e.target.value)}
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                </div>
                            </div>
                            <span style={{ fontSize: '0.9em', color: '#666' }}>High (5)</span>
                            <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>{getResponseValue(q._id, 'value') || '?'}</span>
                        </div>
                    ) : q.type === 'select' ? (
                        <select
                            className={`select-input ${isMissing ? 'input-error' : ''}`}
                            value={getResponseValue(q._id, 'value')}
                            onChange={(e) => handleResponseChange(q._id, 'value', e.target.value)}
                        >
                            <option value="">{q.placeholder || "Choose..."}</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    ) : (
                        <input
                            type="text"
                            className={`select-input ${isMissing ? 'input-error' : ''}`}
                            placeholder={q.placeholder || "Your answer..."}
                            value={getResponseValue(q._id, 'value')}
                            onChange={(e) => handleResponseChange(q._id, 'value', e.target.value)}
                        />
                    )}
                </div>

                <div className="input-group" style={{ marginTop: '10px' }}>
                    <textarea
                        className="comment-box"
                        placeholder="Additional comments (optional)..."
                        value={getResponseValue(q._id, 'comment')}
                        onChange={(e) => handleResponseChange(q._id, 'comment', e.target.value)}
                        style={{ height: '60px', minHeight: '60px' }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="form-token-container">
            <style>{`
                .input-error {
                    border: 2px solid #dc3545 !important;
                    background-color: #fff8f8;
                }
                .input-error-block {
                    border-color: #dc3545 !important;
                    background-color: #fff8f8 !important;
                }
            `}</style>
            <div className="form-header">
                <h1>CSI Annual Report</h1>
                <p>Edit your doctoral student information</p>
            </div>

            {loading && <p>Chargement des données...</p>}
            {error && <p className="error-msg">{error}</p>}
            {message && <p style={{ color: 'green', textAlign: 'center' }}>{message}</p>}

            {doctorant && (
                <form onSubmit={handleSubmit}>

                    {/* Dynamic Rendering Loop */}
                    {groupQuestionsBySection(questions).map((group, idx) => (
                        <div key={idx} className="form-section">
                            {group.section !== 'CHAPTER' && <h2>{group.section}</h2>}

                            {/* If section uses grid layout (usually yes), unless it's only one big item? Keep grid. */}
                            <div className="info-grid">
                                {group.questions.map(q => {
                                    if (q.systemId) {
                                        // Special case for Documents which needs local state
                                        if (q.systemId === 'documents_upload') {
                                            return <div key={q._id} style={{ gridColumn: '1 / -1' }}><DocumentsUploadBlock /></div>;
                                        }
                                        // Render standard System Block
                                        // We need to inject validation props or wrap it?
                                        // SystemBlockRenderer needs to support 'error' highlighting?
                                        // Since it renders many inputs, we should pass 'missingFields' down if possible, or just wrap it in a red border if ANY inside is missing?
                                        // Checking which fields in the block are missing:
                                        // Simplification: Check if any missing field belongs to this block?
                                        // We have a list of required fields in handleSubmit:
                                        // "prenom", "nom", "email", "datePremiereInscription", "ID_DOCTORANT", "departementDoctorant" -> identity
                                        // "titreThese", "anneeThese", "typeFinancement" -> thesis_info
                                        // "intituleUR", "directeurUR" -> research_unit
                                        // "intituleEquipe", "directeurEquipe", "nomPrenomHDR", "email_HDR" -> team_info
                                        // "nomMembre1", "emailMembre1", "nomMembre2", "emailMembre2" -> csi_members

                                        const blockFieldsMap: { [key: string]: string[] } = {
                                            'identity': ["prenom", "nom", "email", "datePremiereInscription", "ID_DOCTORANT", "departementDoctorant"],
                                            'thesis_info': ["titreThese", "anneeThese", "typeFinancement"],
                                            'research_unit': ["intituleUR", "directeurUR"],
                                            'team_info': ["intituleEquipe", "directeurEquipe", "nomPrenomHDR", "email_HDR"],
                                            'csi_members': ["nomMembre1", "emailMembre1", "nomMembre2", "emailMembre2"]
                                        };
                                        const fieldsToCheck = blockFieldsMap[q.systemId] || [];
                                        const hasError = fieldsToCheck.some(f => missingFields.includes(f));

                                        return (
                                            <div key={q._id} className={hasError ? 'input-error' : ''} style={{ gridColumn: '1 / -1', border: hasError ? '2px solid #dc3545' : 'none', padding: hasError ? '10px' : '0', borderRadius: '8px' }}>
                                                {hasError && <p style={{ color: '#dc3545', fontWeight: 'bold', marginBottom: '5px' }}>⚠️ Missing information in this section</p>}
                                                <SystemBlockRenderer
                                                    systemId={q.systemId}
                                                    data={doctorant}
                                                    onChange={handleChange}
                                                    handleHoursChange={handleHoursChange} // Pass specific handler for hours
                                                />
                                            </div>
                                        );
                                    } else if (q.type === 'chapter_title') {
                                        return (
                                            <div key={q._id} style={{ gridColumn: '1 / -1', marginTop: '20px', marginBottom: '20px', textAlign: 'center', borderBottom: '2px solid #0056b3', paddingBottom: '10px' }}>
                                                <h2 style={{ color: '#0056b3', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.8em', margin: 0 }}>{q.content}</h2>
                                            </div>
                                        );
                                    } else {
                                        // Standard Question
                                        return renderDynamicQuestion(q);
                                    }
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Fallback if no questions (legacy/loading safety) */}
                    {questions.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                            <p>No questions configured. Please contact administrator.</p>
                            {/* Optional: Render hardcoded if truly empty? No, Admin should force init. */}
                        </div>
                    )}


                    {/* MISSING FIELDS ERROR */}
                    {missingFields.length > 0 && (
                        <div className="missing-fields" style={{ margin: '20px 0', padding: '15px', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', borderRadius: '5px', textAlign: 'center' }}>
                            <strong>⚠️ Please fill in all required fields to submit.</strong>
                        </div>
                    )}

                    <div className="form-section" style={{ textAlign: 'center', backgroundColor: '#f8f9fa', border: 'none' }}>
                        <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Final Validation</h3>
                        <p style={{ marginBottom: '20px', color: '#666' }}>
                            By pressing this button, you confirm that this report has been approved by your thesis supervisor.<br />
                            The report will be automatically sent to your committee members.
                        </p>

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={submitting}
                            style={{ width: '100%', maxWidth: '400px' }}
                        >
                            {submitting ? (
                                <>
                                    <span className="spinner"></span>
                                    Saving...
                                </>
                            ) : (
                                "Submit Report"
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ModifierDoctorant;