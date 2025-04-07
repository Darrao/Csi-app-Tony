import React, { useEffect, useState, useRef} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/FormulaireToken.css';
// ajouter container et class pour le css

const ModifierDoctorant: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [doctorant, setDoctorant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [selectedFiles1, setSelectedFiles1] = useState<FileList | null>(null);
    const [selectedFiles2, setSelectedFiles2] = useState<FileList | null>(null);
    // Stockage local des fichiers avant upload
    const [tempFiles, setTempFiles] = useState<File[]>([]);
    const [scientificReport, setScientificReport] = useState<File | null>(null);
    const [selfAssessment, setSelfAssessment] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [missingFields, setMissingFields] = useState<string[]>([]);
    const scientificReportInputRef = useRef<HTMLInputElement>(null);
    const selfAssessmentInputRef = useRef<HTMLInputElement>(null);



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

    if (loading) return <p>Chargement des données...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;
    if (!doctorant) return <p>Aucune donnée trouvée.</p>;

    const _id = doctorant?._id;
    const fichiersExternes = doctorant?.fichiersExternes || [];
    const sanitizedDoctorant = doctorant ? { ...doctorant } : {};


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
            } else if (fileType === "selfAssessment") {
                setSelfAssessment(selectedFile);
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
        } else if (fileType === "selfAssessment") {
            setSelfAssessment(null);
            if (selfAssessmentInputRef.current) {
                selfAssessmentInputRef.current.value = "";
            }
        }
    };

    const handleUpload = async (fileType: number) => {
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
    };

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

        if (missing.length > 0) {
            setMissingFields(missing); // Stocker les champs manquants sans affecter l'affichage
            return;
        }

        // ✅ Confirmation avant soumission
        const confirmation = window.confirm("Êtes-vous sûr de vouloir valider ?\nAvez-vous bien tout vérifié ?");
        if (!confirmation) return;
    
        setSubmitting(true);

        const { _id, __v, fichiersExternes, dateValidation, ...sanitizedDoctorant } = doctorant;
    
        // 🔥 Supprime les champs vides (backend peut les rejeter)
        Object.keys(sanitizedDoctorant).forEach((key) => {
            console.log("🔑 Clé :", key, " | Valeur :", sanitizedDoctorant[key]);
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

        // 📅 Ajoute automatiquement la date de validation si elle est vide
        if (!dateValidation) {
            sanitizedDoctorant.dateValidation = new Date().toISOString().split('T')[0];
        }        

        sanitizedDoctorant.doctorantValide = true; // Marque le doctorant comme validé
    
        console.log("📩 Données nettoyées envoyées :", sanitizedDoctorant); // 🔍 Vérifie les données propres
    
        try {
            let uploadedFiles: any[] = [...(doctorant.fichiersExternes || [])];

            // Étape 1 : Upload des fichiers et récupération de leurs infos
            if (scientificReport || selfAssessment) {
                const formData = new FormData();
                if (scientificReport) formData.append("fichiersExternes", scientificReport);
                if (selfAssessment) formData.append("fichiersExternes", selfAssessment);
    
                console.log("📂 Upload des fichiers :", { scientificReport, selfAssessment });
    
                const uploadResponse = await api.post(`/doctorant/upload/${id}`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
    
                console.log("✅ Fichiers uploadés :", uploadResponse.data);
                uploadedFiles = uploadResponse.data.fichiersExternes;
            }
    
            // Étape 2 : Mise à jour du doctorant avec les fichiers stockés dans fichiersExternes
            sanitizedDoctorant.fichiersExternes = uploadedFiles;

            console.log("📩 Envoi des données mises à jour :", sanitizedDoctorant);
            const response = await api.put(`/doctorant/${_id}`, sanitizedDoctorant);
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
        }finally {
            setSubmitting(false); // Désactive l'animation de chargement
        }
    };

    return (
        <div className="container">
            <h1>CSI annual report</h1>

            {loading && <p>Chargement des données...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {message && <p style={{ color: 'green' }}>{message}</p>}

            {doctorant && (
                <form onSubmit={handleSubmit}>
                    <h2>Personal information</h2>
                    <div className="flex-container">
                        <div className='flex-item'>
                            <label>First Name <span style={{ color: "red" }}>*</span></label>
                            <input type="text" name="prenom" value={doctorant.prenom || ''} onChange={handleChange} />
                        </div>

                        <div className='flex-item'>
                            <label>Family Name <span style={{ color: "red" }}>*</span></label>
                            <input type="text" name="nom" value={doctorant.nom || ''} onChange={handleChange} />
                        </div>

                        <div className='flex-item'>
                            <label>Email <span style={{ color: "red" }}>*</span></label>
                            <input type="email" name="email" value={doctorant.email || ''} onChange={handleChange} />
                        </div>

                        <div className='flex-item'>
                            <label>Date first registration <span style={{ color: "red" }}>*</span></label>
                            <input type="date" name="datePremiereInscription" value={doctorant.datePremiereInscription?.split('T')[0] || ''} onChange={handleChange} />
                        </div>

                        <div className='flex-item'>
                            <label>Unique ID <span style={{ color: "red" }}>*</span></label>
                            <input disabled type="text" name="ID_DOCTORANT" value={doctorant.ID_DOCTORANT || ''} onChange={handleChange} />
                        </div>

                        <div className='flex-item'>
                            <label>Doctoral student's department <span style={{ color: "red" }}>*</span></label>
                            <select 
                                name="departementDoctorant" 
                                value={doctorant.departementDoctorant || ''} 
                                onChange={handleChange}
                            >
                                <option value="">-- Select a Department --</option>
                                <option value="MECA">MECA</option>
                                <option value="PP">PP</option>
                                <option value="IM">IM</option>
                                <option value="IMMUNO">IMMUNO</option>
                                <option value="GENYX">GENYX</option>
                            </select>
                        </div>
                    </div>

                    <h2>Thesis information & supervision</h2>
                    <div className="flex-container">

                    <label>Thesis Title <span style={{ color: "red" }}>*</span></label>
                    <input type="text" name="titreThese" value={doctorant.titreThese || ''} onChange={handleChange} placeholder='Thesis Title' />

                    <label>CSI Number <span style={{ color: "red" }}>*</span></label>
                    <input type="text" name="anneeThese" value={doctorant.anneeThese || ''} onChange={handleChange} placeholder='Thesis year' />

                    <label>Funding <span style={{ color: "red" }}>*</span></label>
                    <input type="text" name="typeFinancement" value={doctorant.typeFinancement || ''} onChange={handleChange} placeholder='Funding' />

                    <h2>Research Unit</h2>
                    <label>Title of the research unit <span style={{ color: "red" }}>*</span></label>
                    <input type="text" name="intituleUR" value={doctorant.intituleUR || ''} onChange={handleChange} placeholder='Title of the research unit' />

                    <label>Director of the research unit <span style={{ color: "red" }}>*</span></label>
                    <input type="text" name="directeurUR" value={doctorant.directeurUR || ''} onChange={handleChange} placeholder='Family name and first name' />

                    </div>

                    <h2>Team</h2>
                    <div className="flex-container">

                    <div className='flex-item'>
                    <label>Title of the team <span style={{ color: "red" }}>*</span></label>
                    <input type="text" name="intituleEquipe" value={doctorant.intituleEquipe || ''} onChange={handleChange} placeholder='Title of the team' />
                    </div>

                    <div className='flex-item'>
                    <label>Team leader <span style={{ color: "red" }}>*</span></label>
                    <input type="text" name="directeurEquipe" value={doctorant.directeurEquipe || ''} onChange={handleChange} placeholder='Family name and first name' />
                    </div>

                    <div className='flex-item'>
                    <label>Thesis supervisor <span style={{ color: "red" }}>*</span></label>
                    <input type="text" name="nomPrenomHDR" value={doctorant.nomPrenomHDR || ''} onChange={handleChange} placeholder='Family name and first name' />
                    <input type="email" name="email_HDR" value={doctorant.email_HDR || ''} onChange={handleChange} placeholder='email'/>
                    </div>

                    <div className='flex-item'>
                    <label>Thesis co-supervisor (optional) :</label>
                    <input type="text" name="coDirecteurThese" value={doctorant.coDirecteurThese || ''} onChange={handleChange} placeholder='First name and family name' />
                    </div>

                    </div>

                    <h2>Member of the CSI committee</h2>
                    <div className="flex-container">

                    <label>Member #1 <span style={{ color: "red" }}>*</span></label>
                    <input type="text" name="nomMembre1" value={doctorant.nomMembre1 || ''} onChange={handleChange} placeholder='First name and family name' />
                    <input type="email" name="emailMembre1" value={doctorant.emailMembre1 || ''} onChange={handleChange} placeholder='Email'/>

                    <label>Member #2 <span style={{ color: "red" }}>*</span></label>
                    <input type="text" name="nomMembre2" value={doctorant.nomMembre2 || ''} onChange={handleChange} placeholder='First name and family name' />
                    <input type="email" name="emailMembre2" value={doctorant.emailMembre2 || ''} onChange={handleChange} placeholder='Email'/>

                    <label>Additional member (optionnal)</label>
                    <input type="text" name="nomAdditionalMembre" value={doctorant.nomAdditionalMembre || ''} onChange={handleChange} placeholder='First name and family name' />
                    <input type="email" name="emailAdditionalMembre" value={doctorant.emailAdditionalMembre || ''} onChange={handleChange} placeholder='Email' />

                    </div>

                    <h2>Scientific activities</h2>
                    <div className="flex-container">

                    <label>Missions <span style={{ color: "red" }}>*</span></label>
                    <textarea name="missions" value={doctorant.missions || ''} onChange={handleChange} placeholder='"None" for empty field'/>

                    <label>Publications <span style={{ color: "red" }}>*</span></label>
                    <textarea name="publications" value={doctorant.publications || ''} onChange={handleChange} placeholder='"None" for empty field' />

                    <label>Conferences <span style={{ color: "red" }}>*</span></label>
                    <textarea name="conferencePapers" value={doctorant.conferencePapers || ''} onChange={handleChange} placeholder='"None" for empty field' />

                    <label>Posters <span style={{ color: "red" }}>*</span></label>
                    <textarea name="posters" value={doctorant.posters || ''} onChange={handleChange} placeholder='"None" for empty field' />

                    <label>Public communications <span style={{ color: "red" }}>*</span></label>
                    <textarea name="publicCommunication" value={doctorant.publicCommunication || ''} onChange={handleChange} placeholder='"None" for empty field'/>
                    </div>

                    <h2>Training modules</h2>
                    <div className="flex-container">

                    <label>Scientific modules (cumulated hours) :</label>
                    <input
                        type="number"
                        name="nbHoursScientificModules"
                        value={doctorant.nbHoursScientificModules || 0}
                        onChange={handleHoursChange}
                    />

                    <label>Cross-disciplinary modules (cumulated hours) :</label>
                    <input
                        type="number"
                        name="nbHoursCrossDisciplinaryModules"
                        value={doctorant.nbHoursCrossDisciplinaryModules || 0}
                        onChange={handleHoursChange}
                    />

                    <label>Professional integration and career development modules (cumulated hours):</label>
                    <input
                        type="number"
                        name="nbHoursProfessionalIntegrationModules"
                        value={doctorant.nbHoursProfessionalIntegrationModules || 0}
                        onChange={handleHoursChange}
                    />

                    <label>Total number of hours (all modules) :</label>
                    <input
                        type="number"
                        name="totalNbHours"
                        value={doctorant.totalNbHours || 0}
                        disabled
                    />

                    </div>

                    <h2>Documents to upload</h2>
                    <div className="flex-container">

                    {/* Rapport Scientifique */}
                    <div className="file-upload">
                    
                        <label className="text-file-upload">Your annual scientific report <span style={{ color: "red" }}>*</span></label>
                        <label className="warning-message">Do not reuse last year’s CSI form. All required information is now entered directly into the online form. Please upload only your current scientific report as a separate PDF</label>
                        <span className="note-fichier ">(Max: 5 MB, format PDF)</span>
                        <br />
                        <input ref={scientificReportInputRef} type="file" accept="application/pdf" onChange={(e) => handleFileChange(e, "scientificReport")} />
                        {scientificReport && (
                            <div className="file-preview">
                                <span>{scientificReport.name}</span>
                                <button type="button" onClick={() => handleRemoveFile("scientificReport")}>🗑</button>
                            </div>
                        )}
                        {missingFields.includes("scientificReport") && (
                            <p style={{ color: "red", fontWeight: "bold" }}>⚠️ You must upload your annual scientific report.</p>
                        )}
                    </div>

                    <br />
                    <br />

                    {/* Auto-évaluation */}
                    <div className="file-upload">
                        <label>Self assessment of doctoral students' competency (optional)</label>
                        <span className='sub-text'><a href="https://forms.gle/8HFPSvLuaSLdg8qKA" target="_blank">You can fill a self-assessment form here.</a> <a>If you do so, you will receive a PDF file that you can drop here</a></span>
                        <br />
                        <input ref={selfAssessmentInputRef} type="file" accept="application/pdf" onChange={(e) => handleFileChange(e, "selfAssessment")} />
                        {selfAssessment && (
                            <div className="file-preview">
                                <span>{selfAssessment.name}</span>
                                <button type="button" onClick={() => handleRemoveFile("selfAssessment")}>🗑</button>
                            </div>
                        )}
                    </div>
                    
                    <br />                  

                    </div>

                    <h2>Additional information</h2>
                    <div className="flex-container">
                    <label>You can transmit additional information to your committee here (optional):</label>
                    <textarea name="additionalInformation" value={doctorant.additionalInformation || ''} onChange={handleChange} />
                    </div>


                    <br />
                    {/** ✅ **Message d'erreur des champs manquants ici** */}
                    {missingFields.length > 0 && (
                        <div style={{ color: 'red', fontWeight: 'bold', marginBottom: '10px' }}>
                            ⚠️ Please fill in all required fields:
                            {/* <ul>
                                {missingFields.map((field, index) => (
                                    <li key={index}>{field}</li>
                                ))}
                            </ul> */}
                        </div>
                    )}

                    <div className="flex-container">
                        <h3>By pressing this <strong>final</strong> validation button, you confirm that this report has been approved by your thesis supervisor.</h3>
                        <label>Warning: After clicking this button, the report will be automatically sent to the members of your committee. You and your thesis supervisor will receive a copy of the email</label>

                            <button 
                            type="submit" 
                            className={`submit-btn ${submitting ? 'loading' : ''}`} 
                            disabled={submitting || !scientificReport}
                        >
                            {submitting ? (
                                <>
                                    <span className="spinner"></span> ⏳ Saving your data, please wait...
                                </>
                            ) : "Submit"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ModifierDoctorant;