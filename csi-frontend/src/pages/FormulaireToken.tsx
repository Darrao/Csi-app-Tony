import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import '../styles/FormulaireToken.css';
import { useNavigate } from 'react-router-dom';

const FormulaireToken: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [email, setEmail] = useState<string | null>(null);
    const [doctorant, setDoctorant] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const navigate = useNavigate();
    const [formSubmitted, setFormSubmitted] = useState<boolean>(false); // ✅ Ajout de l'état pour suivre la soumission


    useEffect(() => {
        const validateToken = async () => {
            try {
                console.log("🔄 Validation du token en cours avec :", token);
                const response = await api.post('/email/validate-token', { token });
    
                console.log("✅ Réponse de l'API :", response.data);
                if (response.data) {
                    setEmail(response.data.email);
                    setDoctorant(response.data.doctorant);
    
                    console.log("📌 Doctorant stocké :", response.data.doctorant);
                    console.log("📌 Email stocké :", response.data.email);
    
                    if (response.data.doctorant?.representantValide) {
                        navigate('/merci');
                    }
    
                    setLoading(false);
                } else {
                    console.warn("⚠️ Token invalide ou expiré :", response.data);
                    setLoading(false);
                }
            } catch (error: any) {
                console.error("❌ Erreur lors de la validation du token :", {
                    message: error.message,
                    code: error.code,
                    config: error.config,
                    response: error.response,
                    url: error.config?.url,
                    dataSent: error.config?.data,
                });
    
                alert('Erreur lors de la validation du lien.');
                setLoading(false);
            }
        };
    
        if (token) {
            validateToken();
        } else {
            console.warn("⚠️ Aucun token présent dans l'URL");
        }
    }, [token]);

    console.log("🕵️‍♂️ État final", { loading, doctorant });

    if (loading) {
        return <p>Chargement...</p>;
    }

    
    const initialValues = {
        dateEntretien: '',
        Q1: '', Q1_comment: '',
        Q2: '', Q2_comment: '',
        Q3: '', Q3_comment: '',
        Q4: '', Q4_comment: '',
        Q5: '', Q5_comment: '',
        Q6: '', Q6_comment: '',
        Q7: '', Q7_comment: '',
        Q8: '', Q8_comment: '',
        Q9: '', Q9_comment: '',
        Q10: '', Q10_comment: '',
        Q11: '', Q11_comment: '',
        Q12: '', Q12_comment: '',
        Q13: '', Q13_comment: '',
        Q14: '', Q14_comment: '',
        Q15: '', Q15_comment: '',
        Q16: '', Q16_comment: '',
        Q17: '', Q17_comment: '',
        conclusion: '',
        recommendation: '',
        recommendation_comment: '',
    };

    const validationSchema = Yup.object({
        dateEntretien: Yup.date()
        .required('La date de l’entretien est obligatoire'),
        conclusion: Yup.string().required('La conclusion est obligatoire'),
        recommendation: Yup.string().required('Veuillez choisir une recommandation'),
        recommendation_comment: Yup.string().required('Veuillez ajouter un commentaire'),
      
        // 🔥 Validation ajoutée pour toutes les questions Q1 à Q17
        ...Array.from({ length: 17 }, (_, i) => i + 1).reduce((schema, questionNum) => {
          schema[`Q${questionNum}`] = Yup.string().required(`La réponse à la question ${questionNum} est obligatoire`);
          schema[`Q${questionNum}_comment`] = Yup.string().required(`Le commentaire de la question ${questionNum} est obligatoire`);
          return schema;
        }, {} as Record<string, Yup.StringSchema<string>>)
      });

    const onSubmit = async (values: any) => {
        setFormSubmitted(true); // ✅ Marque le formulaire comme soumis

        const confirmation = window.confirm("⚠️ Only one member of the committee must submit this form!\n\nPlease make sure this hasn't been done yet before proceeding.");
        if (!confirmation) return;

        // Ici je dois envoyer un mail a l’adresse que tony m’a envoyé (regarder excel qu’il m’a envoyé)

        console.log("🚀 Soumission du formulaire en cours...", values);
        setSubmitting(true);
        try {
            if (!doctorant) {
                alert("❌ Erreur : Les données du doctorant sont absentes !");
                setSubmitting(false);
                return;
            }
    
            // 🔥 Nettoyage des propriétés non attendues
            const cleanedValues = { ...values };
            delete cleanedValues.recommendationComment; // Supprime toute autre variante
    
            const normalizeData = (doctorant: any, values: any) => {
                return {
                    ...values,
                    email: doctorant.email || "",
                    prenom: doctorant.prenom || "",
                    nom: doctorant.nom || "",
                    datePremiereInscription: doctorant.datePremiereInscription || null,
                    anneeThese: doctorant.anneeThese || "",
                    typeThesis: doctorant.typeThesis || "",
                    titreThese: doctorant.titreThese || "",
                    intituleUR: doctorant.intituleUR || "",
                    directeurUR: doctorant.directeurUR || "",
                    intituleEquipe: doctorant.intituleEquipe || "",
                    directeurEquipe: doctorant.directeurEquipe || "",
                    directeurThese: doctorant.directeurThese || "",
                    prenomMembre1: doctorant.prenomMembre1 || "",
                    nomMembre1: doctorant.nomMembre1 || "",
                    emailMembre1: doctorant.emailMembre1 || "",
                    univesityMembre1: doctorant.univesityMembre1 || "",
                    prenomMembre2: doctorant.prenomMembre2 || "",
                    nomMembre2: doctorant.nomMembre2 || "",
                    emailMembre2: doctorant.emailMembre2 || "",
                    univesityMembre2: doctorant.univesityMembre2 || "",
                    universityAdditionalMembre: doctorant.universityAdditionalMembre || "",
                    report: doctorant.report || "",
                    nbHoursScientificModules: doctorant.nbHoursScientificModules ?? 0,
                    nbHoursCrossDisciplinaryModules: doctorant.nbHoursCrossDisciplinaryModules ?? 0,
                    nbHoursProfessionalIntegrationModules: doctorant.nbHoursProfessionalIntegrationModules ?? 0,
                    totalNbHours: doctorant.totalNbHours ?? 0,
                    // listScientificModules: doctorant.listScientificModules || '',
                    // listCrossDisciplinaryModules: doctorant.listCrossDisciplinaryModules || '',
                    // listProfessionalIntegrationModules: doctorant.listProfessionalIntegrationModules || '',
                    dateValidation: doctorant.dateValidation || null,
                    representantValide: true,
                    rapport: {
                        nomOriginal: `Rapport_${doctorant.nom}_${doctorant.prenom}.pdf`,
                        cheminStockage: `uploads/doctorants/${doctorant.ID_DOCTORANT}/rapport/Rapport_${doctorant.nom}_${doctorant.prenom}.pdf`
                    }
                };
            };
    
            console.log("🔍 Doctorant avant envoi :", doctorant);
            const payload = normalizeData(doctorant, cleanedValues);
            console.log("📤 Données envoyées à l'API :", payload);
    
            if (doctorant._id) {

                // envoyer mail donc fonction qui envoi le mail avec Choix figé pour Doctoral student's department pour qu'on puisse savoir a qui envoyer le mainModule, ca il faut le gerer dans le backend
                console.log(doctorant._id);

                const response = await api.put(`/doctorant/${doctorant._id}`, payload);
                console.log("✅ Mise à jour réussie :", response.data);
                
                // ✉️ Envoi de l'email en fonction du département
                const emailResponse = await api.post('/email/send-department', {
                    doctorantId: doctorant._id,
                    doctorantEmail: doctorant.email,
                    doctorantPrenom: doctorant.prenom,
                    doctorantNom: doctorant.nom,
                    department: doctorant.departementDoctorant,
                });
                console.log("✅ Email envoyé au directeur et gestionnaire");

                // ✉️ Envoi de l'email aux référents
                await api.post('/email/send-referent-confirmation', {
                    doctorantId: doctorant._id,
                    doctorantEmail: doctorant.email,
                    doctorantPrenom: doctorant.prenom,
                    doctorantNom: doctorant.nom,
                });
                console.log("✅ Email de confirmation envoyé aux référents");    


                alert('Mise à jour effectuée avec succès !');
                // ✅ Redirection après soumission
                navigate('/merci');
            }
        } catch (error: any) {
            console.error('❌ Erreur lors de la soumission du formulaire :', error);
    
            if (error.response) {
                console.error("📥 Réponse de l'API :", error.response.data);
                alert(`Erreur lors de la soumission. ${error.response.data.message}`);
            }
        } finally {
            setSubmitting(false); // Désactive l'état de soumission, même en cas d'erreur
        }
    };

    return (
        <div className="container">
            <h1>CSI form</h1>

            {/* ils recoivent dans la boite mail le pdf des informations du doctorant avec les pdfs qu'il a upload juste avant  */}

            {doctorant ? (
                console.log("📌 Doctorant dans le return :", doctorant),
                <div>
                    <h2>Doctoral student</h2>
                    <p><strong>Family name :</strong> {doctorant.nom || "Non renseigné"}</p>
                    <p><strong>First name :</strong> {doctorant.prenom || "Non renseigné"}</p>
                    <p><strong>Email :</strong> {doctorant.email || "Non renseigné"}</p>
                    <p><strong>Title Thesis :</strong> {doctorant.titreThese || "Non renseigné"}</p>
                    <p><strong>PhD supervisor :</strong> {doctorant.nomPrenomHDR || "Non renseigné"}</p>
                    <p><strong>Thesis year :</strong> {doctorant.anneeThese || "Non renseigné"}</p>

                </div>
            ) : (
                <p>⚠️ Impossible de récupérer les informations du doctorant.</p>
            )}
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={onSubmit}
            >
                {({ errors, isValid }) => (
                <Form>
                    <h2>Date of interview <span style={{ color: "red" }}>*</span></h2>
                    <Field type="date" name="dateEntretien" className="comment-box" />
                    <ErrorMessage name="dateEntretien" component="div" className="error-message" />
                    <h2>Advances in research</h2>
                    <div className="grid-container">
                        {Array.from({ length: 3 }, (_, i) => (
                            <div className="grid-row" key={`Q${i + 1}`}>
                                <label className="question">
                                    {[
                                        "Has the research question been clearly and adequately defined?",
                                        "Does the doctoral student have a comprehensive understanding of the research process and the tasks to be completed prior to the defense?",
                                        "Is the research progressing as expected? If not, would an extension of the thesis preparation period allow for a successful defense?"
                                    ][i]}
                                </label>
                                <div className='select-container'>
                                <Field as="select" name={`Q${i + 1}`} className="comment-select">
                                    <option value="">Choisir</option>
                                    <option value="-">-</option>
                                    <option value="±">±</option>
                                    <option value="+">+</option>
                                    <option value="NotAddressed">Not addressed</option>
                                </Field>
                                <span style={{ color: "red" }}>*</span>
                                </div>

                                <Field as="textarea" name={`Q${i + 1}_comment`} placeholder="Commentaire" className="comment-box" />
                                <div>
                                    <ErrorMessage name={`Q${i + 1}`} component="div" className="warning-message" />
                                    <ErrorMessage name={`Q${i + 1}_comment`} component="div" className="warning-message" />
                                </div>
                            </div>
                            
                        ))}
                    </div>

                    <h2>Training conditions</h2>
                    <div className="grid-container">
                        {Array.from({ length: 8 }, (_, i) => (
                            <div className="grid-row" key={`Q${i + 4}`}>
                                <label className="question">
                                    {[
                                        "Have all the scientific, material, and financial requirements necessary for the doctoral project been fulfilled?",
                                        "If the doctoral student is preparing his/her thesis within a collaborative framework, are the conditions satisfactory?",
                                        "How effectively are the thesis director or co-directors managing the supervision?",
                                        "Is the communication between the doctoral students and supervisors satisfactory?",
                                        "Is the doctoral student well-integrated into the research team or unit? Does he/she feel isolated?",
                                        "How motivated and determined is the doctoral student to progress with his/her work?",
                                        "Are there any signs of demotivation or discouragement?",
                                        "Is the doctoral student at risk of psychosocial stress?"
                                    ][i]}
                                </label>

                                <div className='select-container'>
                                <Field as="select" name={`Q${i + 4}`} className="comment-select">
                                    <option value="">Choisir</option>
                                    <option value="-">-</option>
                                    <option value="±">±</option>
                                    <option value="+">+</option>
                                    <option value="NotAddressed">Not addressed</option>
                                </Field>
                                <span style={{ color: "red" }}>*</span>
                                </div>

                                <Field as="textarea" name={`Q${i + 4}_comment`} placeholder="Commentaire" className="comment-box" />
                                <div>
                                <ErrorMessage name={`Q${i + 4}`} component="div" className="warning-message" />
                                <ErrorMessage name={`Q${i + 4}_comment`} component="div" className="warning-message" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <h2>Skill development and future preparation</h2>
                    <div className="grid-container">
                        {Array.from({ length: 6 }, (_, i) => (
                            <div className="grid-row" key={`Q${i + 12}`}>
                                <label className="question">
                                    {[
                                        "Written output (progress report, bibliography re-view, article, conference abstract)?",
                                        "Has the doctoral student been educated on research ethics and scientific integrity, in terms of both conducting experiments and handling issues related to publication, authorship, and copyright of scientific works?",
                                        "Are the doctoral student’s presentation skills up to par? Consider factors such as clarity, ability to synthesize information, quality of supporting materials, oral fluency, and teaching skills.",
                                        "Do the doctoral student has opportunities to broaden his.her scientific culture in his.her field of research and international perspective (seminars, thematic schools, congresses, ED forum)?",
                                        "How is the training portfolio progressing?",
                                        "How is the preparation for the doctoral student’s future career progressing?",
                                    ][i]}
                                </label>

                                <div className='select-container'>
                                <Field as="select" name={`Q${i + 12}`} className="comment-select">
                                    <option value="">Choisir</option>
                                    <option value="-">-</option>
                                    <option value="±">±</option>
                                    <option value="+">+</option>
                                    <option value="NotAddressed">Not addressed</option>
                                </Field>
                                <span style={{ color: "red" }}>*</span>
                                </div>

                                <Field as="textarea" name={`Q${i + 12}_comment`} placeholder="Commentaire" className="comment-box" />
                                <div>
                                <ErrorMessage name={`Q${i + 12}`} component="div" className="warning-message" />
                                <ErrorMessage name={`Q${i + 12}_comment`} component="div" className="warning-message" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <h2>Conclusion <span style={{ color: "red" }}>*</span></h2>
                    <Field as="textarea" name="conclusion" className="conclusion-box" />
                    <ErrorMessage name="conclusion" component="div" />

                    <h2>Recommandations <span style={{ color: "red" }}>*</span></h2>
                    <div className="recommendation-container">
                        {["approve", "disapprove", "exemption", "unfavourable", "new_meeting"].map((value, i) => (
                            <label key={value}>
                                <Field type="radio" name="recommendation" value={value} />
                                {["The committee approves the re-registration", "The committee disapproves of the re-registration", "The committee supports the request for an exemption for an additional registration", "The committee issues an unfavourable opinion on the request for a derogation for additional registration", "The committee advises scheduling a new meeting with the CSI"][i]}
                            </label>
                        ))}
                    </div>
                    <ErrorMessage name="recommendation" component="div" />

                    <h2>Comment on the recommandation <span style={{ color: "red" }}>*</span></h2>
                    <Field as="textarea" name="recommendation_comment" className="comment-box" />
                    <ErrorMessage name="recommendation_comment" component="div" />

                    <p style={{ color: 'red', fontWeight: 'bold', marginBottom: '10px' }}>
                        ⚠️ <u>Only one member of the committee must submit this form!</u>
                    </p>

                    {submitting ? (
                        <p className="loading-message">⏳ Submission in progress, please wait...</p>
                    ) : (
                        <button type="submit" disabled={!isValid || submitting}>
                            {submitting ? "Submitting..." : "Submit"}
                        </button>
                    )}
                    {/* ✅ Affichage des erreurs uniquement après soumission */}
                    {formSubmitted && Object.keys(errors).length > 0 && (
                        <pre>🛑 Erreurs de validation : {JSON.stringify(errors, null, 2)}</pre>
                    )}

                </Form>
                )}
            </Formik>
        </div>
    );
};

export default FormulaireToken;

