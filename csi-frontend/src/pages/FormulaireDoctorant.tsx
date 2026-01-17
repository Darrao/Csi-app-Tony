
import React, { useEffect, useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';

interface Question {
  _id: string;
  target: string;
  section: string;
  type: string;
  content: string;
  order: number;
  active: boolean;
}

interface FormValues {
  nom: string;
  prenom: string;
  dateInscription: string;
  titreThese: string;
  uniteRecherche: string;
  directeurThese: string;
  financement: string;
  email: string;
  representantEmail1: string;
  representantEmail2: string;
  orcid: string;
  selfEvaluation: number;
  responses: { [key: string]: { value: string; comment: string } };
}


const FormulaireDoctorant: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Initial Values for basic fields
  const initialValues: FormValues & { email_HDR: string } = {
    nom: '',
    prenom: '',
    dateInscription: '',
    titreThese: '',
    uniteRecherche: '',
    directeurThese: '',
    email_HDR: '', // Added Email HDR
    financement: '',
    email: '',
    representantEmail1: '',
    representantEmail2: '',
    orcid: '',
    selfEvaluation: 0,
    responses: {}
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await api.get<Question[]>('/questions?target=doctorant');
        setQuestions(response.data);
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, []);

  // Build Dynamic Schema
  const validationShape: any = {
    nom: Yup.string().required('Nom est requis'),
    prenom: Yup.string().required('Prénom est requis'),
    dateInscription: Yup.date().required("Date d'inscription est requise"),
    titreThese: Yup.string().required('Titre de la thèse est requis'),
    uniteRecherche: Yup.string().required('Unité de recherche est requise'),
    directeurThese: Yup.string().required('Directeur de thèse est requis'),
    email_HDR: Yup.string().email('Email invalide').required('Email du directeur est requis'), // Added validation
    financement: Yup.string().required('Type de financement est requis'),
    email: Yup.string().email('Email invalide').required('Email est requis'),
    orcid: Yup.string()
      .matches(
        /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/,
        "Invalid format (ex: 0000-0000-0000-0000)"
      )
      .required("ORCID is required"),
    selfEvaluation: Yup.number()
      .min(1)
      .max(5)
      .required("L'auto-évaluation est requise"),
    responses: Yup.object().shape(
      questions.reduce((acc, q) => {
        acc[q._id] = Yup.object().shape({
          value: Yup.string().required('Réponse obligatoire'),
        });
        return acc;
      }, {} as any)
    )
  };

  const validationSchema = Yup.object(validationShape);

  // Init responses in initialValues
  if (questions.length > 0) {
    questions.forEach(q => {
      initialValues.responses[q._id] = { value: '', comment: '' };
    });
  }

  const onSubmit = async (values: any) => {
    try {
      const formattedResponses = Object.keys(values.responses).map(qId => ({
        questionId: qId,
        value: values.responses[qId].value,
        comment: values.responses[qId].comment
      }));

      const payload = {
        ...values,
        responses: formattedResponses
      };

      const response = await api.post('/doctorant', payload);
      alert('Formulaire soumis avec succès !');
      // Optional: Redirect or clear form
    } catch (error) {
      console.error('Erreur lors de l’envoi des données :', error);
      alert('Erreur lors de la soumission.');
    }
  };

  if (loadingQuestions) return <p>Chargement du formulaire...</p>;

  // Group questions by section
  const sections: { [key: string]: Question[] } = {};
  questions.forEach(q => {
    if (!sections[q.section]) sections[q.section] = [];
    sections[q.section].push(q);
  });

  return (
    <div>
      <style>{`
        .input-error {
          border: 2px solid #dc3545 !important;
          background-color: #fff8f8;
        }
        .error {
          color: #dc3545;
          font-size: 0.85em;
          margin-top: 5px;
        }
      `}</style>
      <h1>Formulaire Doctorant</h1>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
        enableReinitialize
      >
        {({ errors, touched, submitCount, isValid }) => {
          // Auto-scroll to first error
          useEffect(() => {
            if (submitCount > 0 && !isValid) {
              const firstError = document.querySelector('.input-error');
              if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                (firstError.closest('div')?.querySelector('input, select') as HTMLElement)?.focus();
              }
            }
          }, [submitCount, isValid]);

          return (
            <Form>
              <div>
                <label htmlFor="nom">Nom</label>
                <Field type="text" id="nom" name="nom" className={errors.nom && touched.nom ? 'input-error' : ''} />
                <ErrorMessage name="nom" component="div" className="error" />
              </div>
              <div>
                <label htmlFor="prenom">First Name</label>
                <Field type="text" id="prenom" name="prenom" className={errors.prenom && touched.prenom ? 'input-error' : ''} />
                <ErrorMessage name="prenom" component="div" className="error" />
              </div>

              {/* ORCID Field */}
              <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9', borderLeft: errors.orcid && touched.orcid ? '5px solid #dc3545' : '5px solid transparent' }}>
                <label htmlFor="orcid" style={{ color: errors.orcid && touched.orcid ? '#dc3545' : 'black', fontWeight: 'bold' }}>
                  Your ORCID identification number :
                </label>
                <p style={{ fontSize: '0.9em', color: '#555', marginTop: '5px', lineHeight: '1.4' }}>
                  Please indicate your ORCID identification number. Even if you have not yet published, you can already register on this system: <a href="https://orcid.org" target="_blank" rel="noopener noreferrer">https://orcid.org</a>.<br />
                  This number will remain yours throughout your career, so keep it. It is of interest to us to automatically record your publications in our database.<br />
                  <br />
                  <strong style={{ color: 'red' }}>******** We advise you to make the information in your ORCID space public so that it is available to as many people as possible (including the BioSPC ED).*******</strong>
                </p>
                <Field type="text" id="orcid" name="orcid" placeholder="0000-0000-0000-0000" style={{ width: '100%', padding: '8px', marginTop: '5px' }} className={errors.orcid && touched.orcid ? 'input-error' : ''} />
                <div style={{ color: 'red', marginTop: '5px' }}>
                  <ErrorMessage name="orcid" component="div" />
                </div>
              </div>
              <div>
                <label htmlFor="dateInscription">Date d'inscription</label>
                <Field type="date" id="dateInscription" name="dateInscription" className={errors.dateInscription && touched.dateInscription ? 'input-error' : ''} />
                <ErrorMessage name="dateInscription" component="div" className="error" />
              </div>
              <div>
                <label htmlFor="titreThese">Titre de la thèse</label>
                <Field type="text" id="titreThese" name="titreThese" className={errors.titreThese && touched.titreThese ? 'input-error' : ''} />
                <ErrorMessage name="titreThese" component="div" className="error" />
              </div>
              <div>
                <label htmlFor="uniteRecherche">Unité de recherche</label>
                <Field type="text" id="uniteRecherche" name="uniteRecherche" className={errors.uniteRecherche && touched.uniteRecherche ? 'input-error' : ''} />
                <ErrorMessage name="uniteRecherche" component="div" className="error" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label htmlFor="directeurThese">Directeur de thèse (Nom Prénom)</label>
                  <Field type="text" id="directeurThese" name="directeurThese" style={{ width: '100%' }} className={errors.directeurThese && touched.directeurThese ? 'input-error' : ''} />
                  <ErrorMessage name="directeurThese" component="div" className="error" />
                </div>
                <div>
                  <label htmlFor="email_HDR">Email Directeur de thèse</label>
                  <Field type="email" id="email_HDR" name="email_HDR" placeholder="email@exemple.com" style={{ width: '100%' }} className={errors.email_HDR && touched.email_HDR ? 'input-error' : ''} />
                  <ErrorMessage name="email_HDR" component="div" className="error" />
                </div>
              </div>

              <div>
                <label htmlFor="financement">Type de financement</label>
                <Field as="select" id="financement" name="financement" className={errors.financement && touched.financement ? 'input-error' : ''}>
                  <option value="">Choisir</option>
                  <option value="bourse">Bourse</option>
                  <option value="contrat">Contrat</option>
                  <option value="autre">Autre</option>
                </Field>
                <ErrorMessage name="financement" component="div" className="error" />
              </div>
              <div>
                <label htmlFor="email">Email</label>
                <Field type="email" id="email" name="email" className={errors.email && touched.email ? 'input-error' : ''} />
                <ErrorMessage name="email" component="div" className="error" />
              </div>

              {/* Auto-Evaluation Field */}
              <div style={{ margin: '20px 0' }}>
                <label style={{ display: 'block', marginBottom: '10px' }}>Auto-évaluation (Score 1-5)</label>
                <div role="group" aria-labelledby="my-radio-group" style={{ display: 'flex', gap: '15px' }}>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <label key={score}>
                      <Field type="radio" name="selfEvaluation" value={String(score)} />
                      {score}
                    </label>
                  ))}
                </div>
                <div style={{ color: 'red' }}>
                  <ErrorMessage name="selfEvaluation" component="div" />
                </div>
              </div>

              {/* DYNAMIC QUESTIONS RENDERED BY SECTION */}
              {Object.keys(sections).map(section => (
                <div key={section} style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <h3 style={{
                    marginTop: 0,
                    borderBottom: '2px solid #0056b3',
                    paddingBottom: '10px',
                    marginBottom: '20px',
                    color: '#0056b3',
                    fontSize: '1.4em'
                  }}>
                    {section || "Questions Complémentaires"}
                  </h3>
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {sections[section].map(q => {
                      const fieldName = `responses.${q._id}.value`;
                      const hasError = (errors.responses as any)?.[q._id]?.value && (touched.responses as any)?.[q._id]?.value;

                      return (
                        <div key={q._id}>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{q.content}</label>

                          <div style={{ marginBottom: '5px' }}>
                            {q.type === 'plus_minus_comment' ? (
                              <Field as="select" name={fieldName} style={{ padding: '8px', minWidth: '150px' }} className={hasError ? 'input-error' : ''}>
                                <option value="">Choose...</option>
                                <option value="+">+ (Strong/Yes)</option>
                                <option value="-">- (Weak/No)</option>
                                <option value="±">± (Moderate/Mixed)</option>
                                <option value="NotAddressed">Not Addressed</option>
                              </Field>
                            ) : q.type === 'scale_1_5' || q.type === 'rating_comment' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12px', color: '#666' }}>Low (1)</span>
                                <div style={{ flex: 1, position: 'relative' }}>
                                  <Field
                                    type="range"
                                    name={fieldName}
                                    min="1"
                                    max="5"
                                    step="1"
                                    style={{ width: '100%', cursor: 'pointer', accentColor: '#007BFF' }}
                                  />
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#999', marginTop: '5px' }}>
                                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                  </div>
                                </div>
                                <span style={{ fontSize: '12px', color: '#666' }}>High (5)</span>
                              </div>
                            ) : q.type === 'select' ? (
                              <Field as="select" name={fieldName} style={{ padding: '8px', minWidth: '100px' }} className={hasError ? 'input-error' : ''}>
                                <option value="">Choose...</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </Field>
                            ) : (
                              <Field type="text" name={fieldName} style={{ padding: '8px', width: '100%' }} placeholder="Your answer..." className={hasError ? 'input-error' : ''} />
                            )}
                          </div>
                          <div style={{ color: 'red' }}>
                            <ErrorMessage name={fieldName} component="div" />
                          </div>

                          <Field
                            as="textarea"
                            name={`responses.${q._id}.comment`}
                            style={{ width: '100%', padding: '8px', height: '60px' }}
                            placeholder="Optional comment"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit">Submit</button>
                <button type="button" onClick={() => window.print()} style={{ backgroundColor: '#6c757d' }}>
                  Download local copy
                </button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};


export default FormulaireDoctorant;