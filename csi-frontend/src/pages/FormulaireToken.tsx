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
    const [formSubmitted, setFormSubmitted] = useState<boolean>(false);

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

                    console.log('redirect-check', {
                        id: response.data?.doctorant?._id,
                        rep: response.data?.doctorant?.representantValide,
                        type: typeof response.data?.doctorant?.representantValide
                    });

                    if (response.data.doctorant?.representantValide) {
                        console.log(response.data.doctorant.representantValide);
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
    }, [token, navigate]);

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
        referentValidation: '',
        referentRating: '', // Initialized as string to avoid 0 pre-selection
        referentComment: '',
    };

    const validationSchema = Yup.object({
        dateEntretien: Yup.date()
            .required('La date de l’entretien est obligatoire'),
        conclusion: Yup.string().required('La conclusion est obligatoire'),
        recommendation: Yup.string().required('Veuillez choisir une recommandation'),
        recommendation_comment: Yup.string().required('Veuillez ajouter un commentaire'),
        ...Array.from({ length: 17 }, (_, i) => i + 1).reduce((schema, questionNum) => {
            schema[`Q${questionNum}`] = Yup.string().required(`La réponse à la question ${questionNum} est obligatoire`);
            schema[`Q${questionNum}_comment`] = Yup.string().required(`Le commentaire de la question ${questionNum} est obligatoire`);
            return schema;
        }, {} as Record<string, Yup.StringSchema<string>>),
        referentValidation: Yup.string().required("Veuillez valider ou non l'auto-évaluation"),
        referentRating: Yup.number().when('referentValidation', {
            is: 'false',
            then: (schema) => schema.required("Veuillez attribuer une note").min(1).max(5),
            otherwise: (schema) => schema.notRequired(),
        }),
        referentComment: Yup.string().when('referentValidation', {
            is: 'false',
            then: (schema) => schema.required("Veuillez expliquer votre désaccord"),
            otherwise: (schema) => schema.notRequired(),
        }),
    });

    const onSubmit = async (values: any) => {
        const confirmation = window.confirm(
            "⚠️ Only one member of the committee must submit this form!\n\nPlease make sure this hasn't been done yet before proceeding."
        );
        if (!confirmation) return;

        console.log("🚀 Soumission du formulaire en cours...", values);
        setSubmitting(true);
        try {
            if (!doctorant) {
                alert("❌ Erreur : Les données du doctorant sont absentes !");
                setSubmitting(false);
                return;
            }

            const cleanedValues = { ...values };
            delete cleanedValues.recommendationComment;

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
                    dateValidation: doctorant.dateValidation || null,
                    representantValide: true,
                    rapport: {
                        nomOriginal: `Rapport_${doctorant.nom}_${doctorant.prenom}.pdf`,
                        cheminStockage: `uploads/doctorants/${doctorant.ID_DOCTORANT}/rapport/Rapport_${doctorant.nom}_${doctorant.prenom}.pdf`
                    },
                    referentValidation: values.referentValidation === 'true',
                    referentRating: values.referentValidation === 'false' ? Number(values.referentRating) : undefined,
                    referentComment: values.referentValidation === 'false' ? values.referentComment : undefined,
                };
            };

            console.log("🔍 Doctorant avant envoi :", doctorant);
            const payload = normalizeData(doctorant, cleanedValues);
            console.log("📤 Données envoyées à l'API :", payload);

            if (doctorant._id) {
                console.log(doctorant._id);

                const response = await api.put(`/doctorant/${doctorant._id}`, payload);
                console.log("✅ Mise à jour réussie :", response.data);

                await api.post('/email/send-department', {
                    doctorantId: doctorant._id,
                    doctorantEmail: doctorant.email,
                    doctorantPrenom: doctorant.prenom,
                    doctorantNom: doctorant.nom,
                    department: doctorant.departementDoctorant,
                });
                console.log("✅ Email envoyé au directeur et gestionnaire");

                await api.post('/email/send-referent-confirmation', {
                    doctorantId: doctorant._id,
                    doctorantEmail: doctorant.email,
                    doctorantPrenom: doctorant.prenom,
                    doctorantNom: doctorant.nom,
                });
                console.log("✅ Email de confirmation envoyé aux référents");

                alert('Mise à jour effectuée avec succès !');
                navigate('/merci');
            }
        } catch (error: any) {
            console.error('❌ Erreur lors de la soumission du formulaire :', error);

            if (error.response) {
                console.error("📥 Réponse de l'API :", error.response.data);
                alert(`Erreur lors de la soumission. ${error.response.data.message}`);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container">
            <h1>CSI form</h1>

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
                {({ errors, values }) => {
                    const errorEntries = Object.entries(errors as Record<string, any>);

                    return (
                        <Form>
                            {/* SELF EVALUATION SECTION */}
                            <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                                <h2>Student Self-Evaluation</h2>
                                <p style={{ fontSize: '1.1em', marginBottom: '15px' }}>
                                    The student rated their progress as: <strong>{doctorant.selfEvaluation ? `${doctorant.selfEvaluation}/5` : "Not provided"}</strong>
                                </p>

                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Do you agree with this evaluation? <span style={{ color: "red" }}>*</span></label>
                                <div role="group" style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                                    <label>
                                        <Field type="radio" name="referentValidation" value="true" /> Yes
                                    </label>
                                    <label>
                                        <Field type="radio" name="referentValidation" value="false" /> No
                                    </label>
                                </div>
                                <ErrorMessage name="referentValidation" component="div" className="error-message" />

                                {values.referentValidation === 'false' && (
                                    <div style={{ marginTop: '15px', paddingLeft: '15px', borderLeft: '3px solid #d9534f' }}>
                                        <label style={{ display: 'block', marginBottom: '8px' }}>Your Rating (1-5) <span style={{ color: "red" }}>*</span></label>
                                        <div role="group" style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                                            {[1, 2, 3, 4, 5].map((score) => (
                                                <label key={score}>
                                                    <Field type="radio" name="referentRating" value={String(score)} /> {score}
                                                </label>
                                            ))}
                                        </div>
                                        <ErrorMessage name="referentRating" component="div" className="error-message" />

                                        <label style={{ display: 'block', marginBottom: '8px', marginTop: '10px' }}>Explanation <span style={{ color: "red" }}>*</span></label>
                                        <Field
                                            as="textarea"
                                            name="referentComment"
                                            placeholder="Please explain why you disagree and justify your rating..."
                                            className="comment-box"
                                        />
                                        <ErrorMessage name="referentComment" component="div" className="error-message" />
                                    </div>
                                )}
                            </div>

                            <h2>Date of interview <span style={{ color: "red" }}>*</span></h2>
                            <Field
                                type="date"
                                name="dateEntretien"
                                id="dateEntretien"
                                className="comment-box"
                            />
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
                                            <Field
                                                as="select"
                                                name={`Q${i + 1}`}
                                                id={`Q${i + 1}`}
                                                className="comment-select"
                                            >
                                                <option value="">Choisir</option>
                                                <option value="-">-</option>
                                                <option value="±">±</option>
                                                <option value="+">+</option>
                                                <option value="NotAddressed">Not addressed</option>
                                            </Field>
                                            <span style={{ color: "red" }}>*</span>
                                        </div>

                                        <Field
                                            as="textarea"
                                            name={`Q${i + 1}_comment`}
                                            id={`Q${i + 1}_comment`}
                                            placeholder="Commentaire"
                                            className="comment-box"
                                        />
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
                                            <Field
                                                as="select"
                                                name={`Q${i + 4}`}
                                                id={`Q${i + 4}`}
                                                className="comment-select"
                                            >
                                                <option value="">Choisir</option>
                                                <option value="-">-</option>
                                                <option value="±">±</option>
                                                <option value="+">+</option>
                                                <option value="NotAddressed">Not addressed</option>
                                            </Field>
                                            <span style={{ color: "red" }}>*</span>
                                        </div>

                                        <Field
                                            as="textarea"
                                            name={`Q${i + 4}_comment`}
                                            id={`Q${i + 4}_comment`}
                                            placeholder="Commentaire"
                                            className="comment-box"
                                        />
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
                                            <Field
                                                as="select"
                                                name={`Q${i + 12}`}
                                                id={`Q${i + 12}`}
                                                className="comment-select"
                                            >
                                                <option value="">Choisir</option>
                                                <option value="-">-</option>
                                                <option value="±">±</option>
                                                <option value="+">+</option>
                                                <option value="NotAddressed">Not addressed</option>
                                            </Field>
                                            <span style={{ color: "red" }}>*</span>
                                        </div>

                                        <Field
                                            as="textarea"
                                            name={`Q${i + 12}_comment`}
                                            id={`Q${i + 12}_comment`}
                                            placeholder="Commentaire"
                                            className="comment-box"
                                        />
                                        <div>
                                            <ErrorMessage name={`Q${i + 12}`} component="div" className="warning-message" />
                                            <ErrorMessage name={`Q${i + 12}_comment`} component="div" className="warning-message" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <h2>Conclusion <span style={{ color: "red" }}>*</span></h2>
                            <Field
                                as="textarea"
                                name="conclusion"
                                id="conclusion"
                                className="conclusion-box"
                            />
                            <ErrorMessage name="conclusion" component="div" />

                            <h2>Recommandations <span style={{ color: "red" }}>*</span></h2>
                            <div className="recommendation-container" id="recommendation">
                                {["approve", "disapprove", "exemption", "unfavourable", "new_meeting"].map((value, i) => (
                                    <label key={value}>
                                        <Field
                                            type="radio"
                                            name="recommendation"
                                            value={value}
                                        />
                                        {[
                                            "The committee approves the re-registration",
                                            "The committee disapproves of the re-registration",
                                            "The committee supports the request for an exemption for an additional registration",
                                            "The committee issues an unfavourable opinion on the request for a derogation for additional registration",
                                            "The committee advises scheduling a new meeting with the CSI"
                                        ][i]}
                                    </label>
                                ))}
                            </div>
                            <ErrorMessage name="recommendation" component="div" />

                            <h2>Comment on the recommandation <span style={{ color: "red" }}>*</span></h2>
                            <Field
                                as="textarea"
                                name="recommendation_comment"
                                id="recommendation_comment"
                                className="comment-box"
                            />
                            <ErrorMessage name="recommendation_comment" component="div" />

                            <p style={{ color: 'red', fontWeight: 'bold', marginBottom: '10px' }}>
                                ⚠️ <u>Only one member of the committee must submit this form!</u>
                            </p>

                            <div className="submit-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    onClick={() => setFormSubmitted(true)}
                                >
                                    {submitting ? "Submitting..." : "Submit"}
                                </button>

                                {formSubmitted && errorEntries.length > 0 && (
                                    <div
                                        className="missing-fields"
                                        style={{
                                            fontSize: '0.8rem',
                                            maxWidth: '380px',
                                            lineHeight: 1.3
                                        }}
                                    >
                                        <p
                                            style={{
                                                color: 'red',
                                                fontWeight: 'bold',
                                                marginBottom: '4px'
                                            }}
                                        >
                                            Champs manquants / à corriger (cliquer pour être redirigé vers le champ concerné) :
                                        </p>
                                        <ul style={{ paddingLeft: '18px', margin: 0 }}>
                                            {errorEntries.map(([field, message]) => (
                                                <li key={field} style={{ marginBottom: '2px' }}>
                                                    <a
                                                        href={`#${field}`}
                                                        style={{
                                                            textDecoration: 'underline',
                                                            cursor: 'pointer',
                                                            color: 'black'   // texte noir, souligné
                                                        }}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            const el = document.getElementById(field);
                                                            if (el) {
                                                                el.scrollIntoView({
                                                                    behavior: 'smooth',
                                                                    block: 'center'
                                                                });
                                                                (el as HTMLElement).focus?.();
                                                            }
                                                        }}
                                                    >
                                                        {typeof message === 'string'
                                                            ? message
                                                            : `Erreur sur le champ ${field}`}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </Form>
                    );
                }}
            </Formik>
        </div>
    );
};

export default FormulaireToken;