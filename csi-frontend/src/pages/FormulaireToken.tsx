
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Formik, Form, Field, ErrorMessage, useFormikContext } from 'formik';
import * as Yup from 'yup';
import '../styles/FormulaireToken.css';

interface Question {
    _id: string;
    target: string;
    section: string;
    type: string;
    content: string;
    order: number;
    active: boolean;
    required?: boolean;
    helpText?: string;
    placeholder?: string;
    systemId?: string;
    visibleToReferent?: boolean;
    options?: string[];
    allowMultipleSelection?: boolean;
}

// Helper to improved visual rendering of descriptions
const formatDescription = (text: string) => {
    if (!text) return '';
    // Bold: **text** -> <b>text</b>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    // Italic: *text* -> <i>text</i>
    formatted = formatted.replace(/\*(.*?)\*/g, '<i>$1</i>');
    // Line breaks: \n -> <br />
    formatted = formatted.replace(/\n/g, '<br />');
    return formatted;
};

const FormAutoScroll = () => {
    const { submitCount, isValid } = useFormikContext();
    useEffect(() => {
        if (submitCount > 0 && !isValid) {
            const firstError = document.querySelector('.input-error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const input = firstError.querySelector('input, select, textarea');
                if (input) (input as HTMLElement).focus();
            }
        }
    }, [submitCount, isValid]);
    return null;
};

const FormulaireToken: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
    const [doctorant, setDoctorant] = useState<any>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [sharedQuestions, setSharedQuestions] = useState<Question[]>([]);
    const [showSharedQuestions, setShowSharedQuestions] = useState(true); // Toggle for the section

    // Group questions by section
    const sections: { [key: string]: Question[] } = {};
    questions.forEach(q => {
        if (!sections[q.section]) sections[q.section] = [];
        sections[q.section].push(q);
    });

    useEffect(() => {
        const init = async () => {
            if (!token) {
                console.warn("⚠️ Aucun token présent dans l'URL");
                setLoading(false);
                return;
            }

            try {
                // 1. Validate Token & Get Doctorant
                const authResponse = await api.post('/email/validate-token', { token });
                if (authResponse.data) {
                    const doc = authResponse.data.doctorant;
                    setDoctorant(doc);

                    if (doc?.representantValide) {
                        navigate('/merci');
                        return;
                    }

                    // 2. Fetch Questions (Referent)
                    const qResponse = await api.get<Question[]>('/questions?target=referent');
                    const sortedReferent = qResponse.data.sort((a: Question, b: Question) => a.order - b.order);
                    setQuestions(sortedReferent);

                    // 3. Fetch Questions (Doctorant - for shared view)
                    const docQResponse = await api.get<Question[]>('/questions?target=doctorant');
                    const sortedShared = docQResponse.data
                        .filter((q: Question) => q.visibleToReferent)
                        .sort((a: Question, b: Question) => a.order - b.order);
                    setSharedQuestions(sortedShared);
                } else {
                    alert('Lien invalide ou expiré.');
                }
            } catch (error) {
                console.error("Erreur chargement:", error);
                alert('Erreur lors du chargement.');
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [token, navigate]);

    if (loading) return <p>Chargement...</p>;
    if (!doctorant) return <p>Erreur: Impossible de charger les données.</p>;

    // Build Dynamic Initial Values
    const initialValues: any = {
        dateEntretien: '',
        conclusion: '',
        recommendation: '',
        recommendation_comment: '',
        referentValidation: '',
        referentRating: '',
        referentComment: '',
        responses: {} // Store answers by Question ID
    };

    questions.forEach(q => {
        initialValues.responses[q._id] = {
            value: q.type === 'multiple_choice' && q.allowMultipleSelection ? [] : '',
            comment: ''
        };
    });

    // Initialize Shared Questions Fields
    if (sharedQuestions) {
        sharedQuestions.forEach(q => {
            // We use a specific structure for the review logic
            // validation: 'true' | 'false' (agree or disagree)
            // corrected: { value: '', comment: '' }
            initialValues.responses[`${q._id}_validation`] = 'true';
            initialValues.responses[`${q._id}_corrected`] = { value: '', comment: '' };
        });
    }

    // Build Dynamic Validation Schema
    const validationShape: any = {
        dateEntretien: Yup.date().required('La date de l’entretien est obligatoire'),
        conclusion: Yup.string().required('La conclusion est obligatoire'),
        recommendation: Yup.string().required('Veuillez choisir une recommandation'),
        recommendation_comment: Yup.string().required('Veuillez ajouter un commentaire'),
        // referentValidation & Rating removed as per request
        responses: Yup.object().shape({
            ...questions.reduce((acc, q) => {
                const valueSchema = q.required
                    ? (q.type === 'multiple_choice' && q.allowMultipleSelection)
                        ? Yup.array().min(1, 'Réponse obligatoire')
                        : Yup.string().required('Réponse obligatoire')
                    : (q.type === 'multiple_choice' && q.allowMultipleSelection)
                        ? Yup.array()
                        : Yup.string();

                acc[q._id] = Yup.object().shape({
                    value: valueSchema,
                    comment: Yup.string()
                });
                return acc;
            }, {} as any),
            ...sharedQuestions.reduce((acc, q) => {
                acc[`${q._id}_validation`] = Yup.string().required();
                acc[`${q._id}_corrected`] = Yup.object().when(`${q._id}_validation`, {
                    is: 'false',
                    then: (schema) => schema.shape({
                        value: Yup.string().required("Correction requise"),
                        comment: Yup.string()
                    }),
                    otherwise: (schema) => schema.shape({
                        value: Yup.string(),
                        comment: Yup.string()
                    })
                });
                return acc;
            }, {} as any)
        })
    };
    const validationSchema = Yup.object(validationShape);

    const onSubmit = async (values: any) => {
        const confirmation = window.confirm("⚠️ Only one member of the committee must submit this form! Proceed?");
        if (!confirmation) return;

        setSubmitting(true);
        try {
            // Transform form values to backend expected format
            // Transform form values to backend expected format
            const formattedResponses: any[] = [];

            Object.keys(values.responses).forEach(key => {
                const responseData = values.responses[key];

                // Case 1: Standard Response (Object with value/comment)
                // We check if it's NOT a validation flag or a corrected object wrapper
                if (key.endsWith('_validation')) return; // Skip validation flags, or store them if needed? Let's skip layout flags.

                if (key.endsWith('_corrected')) {
                    // This is a correction object { value: '', comment: '' }
                    // We only save it if the corresponding validation was FALSE (disagreement)
                    // The key is like "QID_corrected"
                    const originalId = key.replace('_corrected', '');
                    const isValid = values.responses[`${originalId}_validation`] === 'true';

                    if (!isValid) {
                        // User disagreed, save correction
                        // We append "_referent" to name as requested? user said "Q1_corrected_referent"
                        // My key is "QID_corrected". Let's use that as questionId.
                        formattedResponses.push({
                            questionId: `${originalId}_corrected_referent`, // As requested
                            value: String(responseData.value || ''),
                            comment: responseData.comment
                        });
                    }
                } else {
                    // Standard Question Response
                    // It should be an object { value, comment }
                    // But wait, initialValues initialized it as such.
                    // Just double check it's not a string (legacy)
                    if (typeof responseData === 'object' && responseData !== null) {
                        formattedResponses.push({
                            questionId: key,
                            value: String(responseData.value || ''),
                            comment: responseData.comment
                        });
                    }
                }
            });

            // ⚠️ SEPARATE Student vs Referent Responses
            // Student responses are preserved in doctorant.responses
            // Referent responses are stored in referentResponses

            const payload = {
                ...doctorant, // Keep existing doctorant data
                emailAdditionalMembre: doctorant.emailAdditionalMembre || undefined, // Fix for validation error on empty string
                emailMembre2: doctorant.emailMembre2 || undefined,
                email_HDR: doctorant.email_HDR || undefined,

                // Update with Form Data
                dateEntretien: values.dateEntretien,
                conclusion: values.conclusion,
                recommendation: values.recommendation,
                recommendation_comment: values.recommendation_comment,
                // referentValidation removed

                // Dedicated array for referent responses
                referentResponses: formattedResponses,

                // Validate Flags
                representantValide: true,

                rapport: {
                    nomOriginal: `Rapport_${doctorant.nom}_${doctorant.prenom}.pdf`,
                    cheminStockage: `uploads/doctorants/${doctorant.ID_DOCTORANT}/rapport/Rapport_${doctorant.nom}_${doctorant.prenom}.pdf`
                }
            };

            await api.put(`/doctorant/${doctorant._id}`, payload);

            // Trigger Emails
            await api.post('/email/send-department', {
                doctorantId: doctorant._id,
                doctorantEmail: doctorant.email,
                doctorantPrenom: doctorant.prenom,
                doctorantNom: doctorant.nom,
                department: doctorant.departementDoctorant,
            });

            await api.post('/email/send-referent-confirmation', {
                doctorantId: doctorant._id,
                doctorantEmail: doctorant.email,
                doctorantPrenom: doctorant.prenom,
                doctorantNom: doctorant.nom,
            });

            navigate('/merci');

        } catch (error: any) {
            console.error("Error submitting:", error);
            alert(`Erreur: ${error.response?.data?.message || 'Soumission échouée'}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="form-token-container">
            <div className="form-header">
                <h1>CSI Evaluation Form</h1>
                <p>Confidential evaluation by the referent member</p>
            </div>

            <div className="form-section">
                <h2>Doctoral Student Information</h2>
                <div className="info-grid">
                    <div className="info-item">
                        <label>Family Name</label>
                        <span>{doctorant.nom}</span>
                    </div>
                    <div className="info-item">
                        <label>First Name</label>
                        <span>{doctorant.prenom}</span>
                    </div>
                    <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                        <label>Thesis Title</label>
                        <span>{doctorant.titreThese}</span>
                    </div>
                </div>
            </div>

            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={onSubmit}
            >
                {({ errors, touched, submitCount, isValid }) => {
                    return (
                        <Form>
                            <FormAutoScroll />
                            {/* SELF EVALUATION REMOVED */}

                            <div className="form-section">
                                <h2>Interview Details</h2>
                                <div className={`input-group ${errors.dateEntretien && touched.dateEntretien ? 'input-error' : ''}`}>
                                    <label className="question-text">Date of interview <span className="red">*</span></label>
                                    <Field type="date" name="dateEntretien" className="select-input" />
                                    <ErrorMessage name="dateEntretien" component="div" className="error-msg" />
                                </div>
                            </div>

                            {/* DYNAMIC QUESTIONS RENDERED IN ORDER (respects order field) */}
                            {(() => {
                                const elements: JSX.Element[] = [];
                                let currentSection: string | null = null;
                                let sectionContent: JSX.Element[] = [];

                                const flushSection = () => {
                                    if (currentSection !== null && sectionContent.length > 0) {
                                        elements.push(
                                            <div key={`section-${currentSection}`} className="form-section">
                                                {currentSection !== 'CHAPTER' && <h2>{currentSection}</h2>}
                                                {sectionContent}
                                            </div>
                                        );
                                        sectionContent = [];
                                    }
                                };

                                questions.filter(q => !q.systemId).forEach(q => {
                                    if (q.section !== currentSection) {
                                        flushSection();
                                        currentSection = q.section;
                                    }

                                    if (q.type === 'chapter_title') {
                                        sectionContent.push(
                                            <div key={q._id} style={{ marginTop: '20px', marginBottom: '20px', textAlign: 'center', borderBottom: '2px solid #0056b3', paddingBottom: '10px' }}>
                                                <h2 style={{ color: '#0056b3', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.8em', margin: 0 }}>{q.content}</h2>
                                                {q.helpText && (
                                                    <p style={{ marginTop: '5px', fontSize: '0.9em', color: '#555', fontStyle: 'italic' }} dangerouslySetInnerHTML={{ __html: formatDescription(q.helpText) }}></p>
                                                )}
                                            </div>
                                        );
                                        return;
                                    }

                                    if (q.type === 'description') {
                                        sectionContent.push(
                                            <div key={q._id} style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderLeft: '3px solid #6f42c1', borderRadius: '4px' }}>
                                                <p style={{ margin: 0, fontSize: '0.95em', color: '#333' }} dangerouslySetInnerHTML={{ __html: formatDescription(q.content) }}></p>
                                            </div>
                                        );
                                        return;
                                    }

                                    const hasError = (errors.responses as any)?.[q._id]?.value && (touched.responses as any)?.[q._id]?.value;
                                    sectionContent.push(
                                        <div className="question-block" key={q._id}>
                                            <label className="question-text">
                                                {q.content}
                                                {q.required && <span className="red"> *</span>}
                                            </label>

                                            {q.helpText && (
                                                <p style={{ fontSize: '0.85em', color: '#666', marginTop: '-5px', marginBottom: '10px' }}>
                                                    ℹ️ {q.helpText}
                                                </p>
                                            )}

                                            <div className={`input-group ${hasError ? 'input-error' : ''}`} style={{ padding: hasError ? '10px' : '0', borderRadius: '4px' }}>
                                                {q.type === 'plus_minus_comment' ? (
                                                    <Field as="select" name={`responses.${q._id}.value`} className="select-input">
                                                        <option value="">{q.placeholder || "Choose an option..."}</option>
                                                        <option value="+">+ (Strong/Yes)</option>
                                                        <option value="-">- (Weak/No)</option>
                                                        <option value="±">± (Moderate/Mixed)</option>
                                                        <option value="NotAddressed">Not Addressed</option>
                                                    </Field>
                                                ) : q.type === 'scale_1_5' || q.type === 'rating_comment' ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                        <span style={{ fontSize: '0.9em', color: '#666', fontWeight: 600 }}>Low (1)</span>
                                                        <div style={{ flex: 1, position: 'relative' }}>
                                                            <Field
                                                                type="range"
                                                                name={`responses.${q._id}.value`}
                                                                min="1"
                                                                max="5"
                                                                step="1"
                                                                style={{ width: '100%', cursor: 'pointer', accentColor: '#007bff' }}
                                                            />
                                                            <div className="slider-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '5px' }}>
                                                                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                                            </div>
                                                        </div>
                                                        <span style={{ fontSize: '0.9em', color: '#666', fontWeight: 600 }}>High (5)</span>
                                                    </div>
                                                ) : q.type === 'multiple_choice' ? (
                                                    <div className="radio-options" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', marginBottom: '10px' }}>
                                                        {(q.options || []).map((opt: string, idx: number) => (
                                                            <label key={idx} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                                <Field
                                                                    type={q.allowMultipleSelection ? "checkbox" : "radio"}
                                                                    name={`responses.${q._id}.value`}
                                                                    value={opt}
                                                                    style={{ margin: 0, marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                                                                />
                                                                <span style={{ fontSize: '1rem', color: '#333' }}>{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : q.type === 'select' ? (
                                                    <Field as="select" name={`responses.${q._id}.value`} className="select-input">
                                                        <option value="">{q.placeholder || "Choose..."}</option>
                                                        <option value="Yes">Yes</option>
                                                        <option value="No">No</option>
                                                    </Field>
                                                ) : (
                                                    <Field
                                                        type="text"
                                                        name={`responses.${q._id}.value`}
                                                        className="comment-box"
                                                        placeholder={q.placeholder || "Your answer..."}
                                                        style={{ minHeight: '45px' }}
                                                    />
                                                )}
                                            </div>
                                            <ErrorMessage name={`responses.${q._id}.value`} component="div" className="error-msg" />

                                            <div className="input-group" style={{ marginTop: '15px' }}>
                                                <Field
                                                    as="textarea"
                                                    name={`responses.${q._id}.comment`}
                                                    className="comment-box"
                                                    placeholder="Additional comments (optional)..."
                                                />
                                                <ErrorMessage name={`responses.${q._id}.comment`} component="div" className="error-msg" />
                                            </div>
                                        </div>
                                    );
                                });

                                flushSection(); // flush last section
                                return elements;
                            })()}


                            {/* REVIEW SHARED ANSWERS (Moved) */}
                            {sharedQuestions.length > 0 && (
                                <div className="form-section" style={{ border: '2px dashed #6f42c1', backgroundColor: '#f8f4ff' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowSharedQuestions(!showSharedQuestions)}>
                                        <h2 style={{ color: '#6f42c1', margin: 0 }}>Review Student Answers</h2>
                                        <button type="button" className="btn" style={{ background: 'transparent', color: '#6f42c1', border: '1px solid #6f42c1' }}>
                                            {showSharedQuestions ? "Hide" : "Show"}
                                        </button>
                                    </div>

                                    {showSharedQuestions && (
                                        <div style={{ marginTop: '20px' }}>
                                            <p>Please review the student's answers below. If you disagree, provide a corrected answer.</p>
                                            {sharedQuestions.map(q => {
                                                const originalResponse = doctorant.responses.find((r: any) => r.questionId === q._id);
                                                const originalValue = originalResponse ? originalResponse.value : "Not answered";
                                                const originalComment = originalResponse ? originalResponse.comment : "";

                                                return (
                                                    <div key={q._id} className="question-block" style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                                        <h4 style={{ margin: '0 0 10px 0' }}>{q.content}</h4>

                                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
                                                            {/* Right: Student Answer (Read-only) */}
                                                            <div style={{ flex: 1, backgroundColor: '#e9ecef', padding: '15px', borderRadius: '4px' }}>
                                                                <strong style={{ display: 'block', marginBottom: '8px', color: '#6f42c1' }}>Student's Answer:</strong>
                                                                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{originalValue}</p>
                                                                {originalComment && (
                                                                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #d1d9e6' }}>
                                                                        <strong style={{ fontSize: '0.9em', color: '#666' }}>Comment:</strong>
                                                                        <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', fontSize: '0.95em' }}>{originalComment}</p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Left: Interaction */}
                                                            <div style={{ flex: 1 }}>
                                                                <label className="question-text" style={{ marginTop: 0 }}>Do you agree with this answer?</label>
                                                                <div className="radio-options" style={{ marginBottom: '15px' }}>
                                                                    <label><Field type="radio" name={`responses.${q._id}_validation`} value="true" /> Yes</label>
                                                                    <label><Field type="radio" name={`responses.${q._id}_validation`} value="false" /> No (Correction)</label>
                                                                </div>

                                                                {/* Conditional Render for Correction */}
                                                                <Field name={`responses.${q._id}_validation`}>
                                                                    {({ field }: any) => field.value === 'false' && (
                                                                        <div
                                                                            style={{ marginTop: '10px', padding: '10px', borderLeft: '3px solid #dc3545', backgroundColor: '#fff8f8' }}
                                                                            className={(errors.responses as any)?.[`${q._id}_corrected`]?.value && (touched.responses as any)?.[`${q._id}_corrected`]?.value ? 'input-error' : ''}
                                                                        >
                                                                            <label className="question-text" style={{ color: '#dc3545' }}>Corrected Answer</label>

                                                                            {(q.type === 'scale_1_5' || q.type === 'rating_comment') ? (
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                                    <span style={{ fontSize: '0.8em', color: '#666' }}>1</span>
                                                                                    <div style={{ flex: 1 }}>
                                                                                        <Field
                                                                                            type="range"
                                                                                            name={`responses.${q._id}_corrected.value`}
                                                                                            min="1"
                                                                                            max="5"
                                                                                            step="1"
                                                                                            style={{ width: '100%', cursor: 'pointer', accentColor: '#dc3545' }}
                                                                                        />
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                                                                            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <span style={{ fontSize: '0.8em', color: '#666' }}>5</span>
                                                                                </div>
                                                                            ) : (q.type === 'select' || q.type === 'plus_minus_comment') ? (
                                                                                <Field as="select" name={`responses.${q._id}_corrected.value`} className="select-input">
                                                                                    <option value="">Choose...</option>
                                                                                    {q.type === 'plus_minus_comment' && <>
                                                                                        <option value="+">+ (Strong/Yes)</option>
                                                                                        <option value="-">- (Weak/No)</option>
                                                                                        <option value="±">± (Moderate/Mixed)</option>
                                                                                        <option value="NotAddressed">Not Addressed</option>
                                                                                    </>}
                                                                                    {q.type === 'select' && <>
                                                                                        <option value="Yes">Yes</option>
                                                                                        <option value="No">No</option>
                                                                                    </>}
                                                                                </Field>
                                                                            ) : q.type === 'multiple_choice' ? (
                                                                                <div className="radio-options" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', marginBottom: '10px' }}>
                                                                                    {(q.options || []).map((opt: string, idx: number) => (
                                                                                        <label key={idx} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                                                            <Field 
                                                                                                type={q.allowMultipleSelection ? "checkbox" : "radio"} 
                                                                                                name={`responses.${q._id}_corrected.value`} 
                                                                                                value={opt} 
                                                                                                style={{ margin: 0, marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                                                                                            />
                                                                                            <span style={{ fontSize: '1rem', color: '#333' }}>{opt}</span>
                                                                                        </label>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <Field type="text" name={`responses.${q._id}_corrected.value`} className="select-input" placeholder="Your corrected answer..." />
                                                                            )}

                                                                            <label className="question-text" style={{ marginTop: '10px' }}>Comment (Optional)</label>
                                                                            <Field type="text" name={`responses.${q._id}_corrected.comment`} className="select-input" placeholder="Why this correction?" />
                                                                        </div>
                                                                    )}
                                                                </Field>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="form-section">
                                <h2>Conclusion & Recommendations</h2>

                                <div className={`input-group ${errors.conclusion && touched.conclusion ? 'input-error' : ''}`} style={{ padding: '5px', borderRadius: '4px' }}>
                                    <label className="question-text">General Conclusion <span className="red">*</span></label>
                                    <Field as="textarea" name="conclusion" className="comment-box" style={{ minHeight: '120px' }} placeholder="Summarize the interview..." />
                                    <ErrorMessage name="conclusion" component="div" className="error-msg" />
                                </div>

                                <div className={`input-group ${errors.recommendation && touched.recommendation ? 'input-error' : ''}`} style={{ marginTop: '25px', padding: '5px', borderRadius: '4px' }}>
                                    <label className="question-text" style={{ marginBottom: '15px', display: 'block' }}>Committee Recommendation <span className="red">*</span></label>
                                    <div className="radio-options" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {[
                                            { val: "approve", label: "The committee approves the re-registration" },
                                            { val: "disapprove", label: "The committee disapproves of the re-registration" },
                                            { val: "exemption", label: "The committee supports the request for an exemption for an additional registration" },
                                            { val: "unfavourable", label: "The committee issues an unfavourable opinion on the request for a derogation for additional registration" },
                                            { val: "new_meeting", label: "The committee advises scheduling a new meeting with the CSI" }
                                        ].map(opt => (
                                            <label key={opt.val} style={{ display: 'flex', alignItems: 'center' }}>
                                                <Field type="radio" name="recommendation" value={opt.val} style={{ marginRight: '10px' }} />
                                                {opt.label}
                                            </label>
                                        ))}
                                    </div>
                                    <ErrorMessage name="recommendation" component="div" className="error-msg" />
                                </div>

                                <div className="input-group" style={{ marginTop: '25px' }}>
                                    <label className="question-text">Specific Comments on Recommendation <span className="red">*</span></label>
                                    <Field as="textarea" name="recommendation_comment" className="comment-box" placeholder="Any specific reasons or advice..." />
                                    <ErrorMessage name="recommendation_comment" component="div" className="error-msg" />
                                </div>
                            </div>



                            <div className="submit-row" style={{ marginTop: '40px', paddingBottom: '40px' }}>
                                <button type="submit" disabled={submitting} onClick={() => setFormSubmitted(true)} className="submit-btn" style={{ opacity: submitting ? 0.7 : 1 }}>
                                    {submitting ? (
                                        <>
                                            <span className="spinner"></span>
                                            Submitting...
                                        </>
                                    ) : (
                                        "Submit Evaluation"
                                    )}
                                </button>
                                {formSubmitted && Object.keys(errors).length > 0 && (
                                    <div className="missing-fields">
                                        <p className="red">Please correct errors above.</p>
                                    </div>
                                )}
                            </div>
                        </Form>
                    )
                }}
            </Formik>
        </div>
    );
};

export default FormulaireToken;