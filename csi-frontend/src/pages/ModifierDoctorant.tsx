import React, { useEffect, useState } from 'react';
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
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0]; // On prend uniquement le premier fichier

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
        } else if (fileType === "selfAssessment") {
            setSelfAssessment(null);
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

            console.log("📧 Emails des référents :", referentsEmails);
            if (referentsEmails.length > 0) {
                console.log(doctorant.email_HDR)
                await api.post('/email/send', { emails: referentsEmails, doctorantPrenom: doctorant.prenom, doctorantEmail: doctorant.email, directeurTheseEmail: doctorant.email_HDR });
                console.log('doctorant prenom' + doctorant.prenom);
                console.log("📧 Emails envoyés aux référents :", referentsEmails);
            }
            
            console.log("✅ Mise à jour réussie !");
        } catch (err) {
            console.error("❌ Erreur lors de la mise à jour :", err);
            setError("Échec de la mise à jour.");
        }
    };

    return (
        <div className="container">
            <h1>Modifier Doctorant</h1>

            {loading && <p>Chargement des données...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {message && <p style={{ color: 'green' }}>{message}</p>}

            {doctorant && (
                <form onSubmit={handleSubmit}>
                    <h2>Informations personnelles</h2>
                    <div className="flex-container">
                        <div className='flex-item'>
                            <label>First Name :</label>
                            <input type="text" name="prenom" value={doctorant.prenom || ''} onChange={handleChange} />
                        </div>

                        <div className='flex-item'>
                            <label>Family Name :</label>
                            <input type="text" name="nom" value={doctorant.nom || ''} onChange={handleChange} />
                        </div>

                        <div className='flex-item'>
                            <label>Email :</label>
                            <input type="email" name="email" value={doctorant.email || ''} onChange={handleChange} />
                        </div>

                        <div className='flex-item'>
                            <label>Date first registration :</label>
                            <input type="date" name="datePremiereInscription" value={doctorant.datePremiereInscription?.split('T')[0] || ''} onChange={handleChange} />
                        </div>

                        <div className='flex-item'>
                            <label>Unique ID :</label>
                            <input disabled type="text" name="ID_DOCTORANT" value={doctorant.ID_DOCTORANT || ''} onChange={handleChange} />
                        </div>

                        <div className='flex-item'>
                            <label>Doctoral student's department :</label>
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
                                <option value="GENE">GENE</option>
                            </select>
                        </div>
                    </div>

                    <h2>Thesis information & supervision</h2>
                    <div className="flex-container">

                    <label>Thesis Title :</label>
                    <input type="text" name="titreThese" value={doctorant.titreThese || ''} onChange={handleChange} />

                    <label>CSI Number :</label>
                    <input type="text" name="anneeThese" value={doctorant.anneeThese || ''} onChange={handleChange} />

                    <label>Funding :</label>
                    <input type="text" name="typeFinancement" value={doctorant.typeFinancement || ''} onChange={handleChange} />

                    <h2>Research Unit</h2>
                    <label>Title of the research unit :</label>
                    <input type="text" name="intituleUR" value={doctorant.intituleUR || ''} onChange={handleChange} />

                    <label>Director of the research unit :</label>
                    <input type="text" name="directeurUR" value={doctorant.directeurUR || ''} onChange={handleChange} />

                    </div>

                    <h2>Team</h2>
                    <div className="flex-container">

                    <div className='flex-item'>
                    <label>Title of the team :</label>
                    <input type="text" name="intituleEquipe" value={doctorant.intituleEquipe || ''} onChange={handleChange} />
                    </div>

                    <div className='flex-item'>
                    <label>Team leader :</label>
                    <input type="text" name="directeurEquipe" value={doctorant.directeurEquipe || ''} onChange={handleChange} />
                    </div>

                    <div className='flex-item'>
                    <label>Thesis supervisor :</label>
                    <input type="text" name="nomPrenomHDR" value={doctorant.nomPrenomHDR || ''} onChange={handleChange} />
                    <input type="email" name="email_HDR" value={doctorant.email_HDR || ''} onChange={handleChange} placeholder='email'/>
                    </div>

                    <div className='flex-item'>
                    <label>Thesis co-supervisor (optional) :</label>
                    <input type="text" name="coDirecteurThese" value={doctorant.coDirecteurThese || ''} onChange={handleChange} />
                    </div>

                    </div>

                    <h2>Member of the CSI committee</h2>
                    <div className="flex-container">

                    <label>Member #1 :</label>
                    <input type="text" name="nomMembre1" value={doctorant.nomMembre1 || ''} onChange={handleChange} />
                    <input type="email" name="emailMembre1" value={doctorant.emailMembre1 || ''} onChange={handleChange} placeholder='email'/>

                    <label>Member #2 :</label>
                    <input type="text" name="nomMembre2" value={doctorant.nomMembre2 || ''} onChange={handleChange} />
                    <input type="email" name="emailMembre2" value={doctorant.emailMembre2 || ''} onChange={handleChange} placeholder='email'/>

                    <label>Additional member :</label>
                    <input type="text" name="nomAdditionalMembre" value={doctorant.nomAdditionalMembre || ''} onChange={handleChange} />
                    <input type="email" name="emailAdditionalMembre" value={doctorant.emailAdditionalMembre || ''} onChange={handleChange} />

                    </div>

                    <h2>Scientific activities</h2>
                    <div className="flex-container">

                    <label>Missions :</label>
                    <textarea name="missions" value={doctorant.missions || ''} onChange={handleChange} />

                    <label>Publications :</label>
                    <textarea name="publications" value={doctorant.publications || ''} onChange={handleChange} />

                    <label>Conferences :</label>
                    <textarea name="conferencePapers" value={doctorant.conferencePapers || ''} onChange={handleChange} />

                    <label>Posters :</label>
                    <textarea name="posters" value={doctorant.posters || ''} onChange={handleChange} />

                    <label>Public communications :</label>
                    <textarea name="publicCommunication" value={doctorant.publicCommunication || ''} onChange={handleChange} />
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
                        <label>Your annual scientific report :</label>
                        <input type="file" accept="application/pdf" onChange={(e) => handleFileChange(e, "scientificReport")} />
                        {scientificReport && (
                            <div className="file-preview">
                                <span>{scientificReport.name}</span>
                                <button type="button" onClick={() => handleRemoveFile("scientificReport")}>🗑</button>
                            </div>
                        )}
                    </div>

                    <br />

                    {/* Auto-évaluation */}
                    <div className="file-upload">
                        <label>Self assessment of doctoral students' competency acquisition (optional) :</label>
                        <input type="file" accept="application/pdf" onChange={(e) => handleFileChange(e, "selfAssessment")} />
                        {selfAssessment && (
                            <div className="file-preview">
                                <span>{selfAssessment.name}</span>
                                <button type="button" onClick={() => handleRemoveFile("selfAssessment")}>🗑</button>
                            </div>
                        )}
                    </div>


                    <a href="https://forms.gle/8HFPSvLuaSLdg8qKA" target="_blank">You can fill a self-assessment form here</a>  
                    
                    <br />                  

                    </div>

                    {/* supprimer après, pour l'instant je garde pour les tests */}
                    <h2>Fichiers déjà enregistrés :</h2>
                    {doctorant.fichiersExternes && doctorant.fichiersExternes.length > 0 ? (
                        <ul>
                            {doctorant.fichiersExternes.map((file: any, index: number) => (
                                <li key={index}>
                                    <span>{file.nomOriginal}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>Aucun fichier enregistré.</p>
                    )}

                    <h2>Additional information</h2>
                    <div className="flex-container">
                    <label>You can transmit additional information to your committee here (optional):</label>
                    <textarea name="additionalInformation" value={doctorant.additionalInformation || ''} onChange={handleChange} />
                    </div>


                    <div className="flex-container">
                    <h3>By pressing this <strong>final</strong> validation button, you confirm that this report has been approved by your thesis supervisor.</h3>
                    <label>Warning: After clicking this button, the report will be automatically sent to the members of your committee. You and your thesis supervisor will receive a copy of the email</label>
                    <button type="submit">Submit</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ModifierDoctorant;