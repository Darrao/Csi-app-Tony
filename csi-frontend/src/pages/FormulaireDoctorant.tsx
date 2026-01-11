import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';

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
}

const FormulaireDoctorant: React.FC = () => {
  const initialValues: FormValues = {
    nom: '',
    prenom: '',
    dateInscription: '',
    titreThese: '',
    uniteRecherche: '',
    directeurThese: '',
    financement: '',
    email: '',
    representantEmail1: '',
    representantEmail2: '',
  };

  const validationSchema = Yup.object({
    nom: Yup.string().required('Nom est requis'),
    prenom: Yup.string().required('Prénom est requis'),
    dateInscription: Yup.date().required("Date d'inscription est requise"),
    titreThese: Yup.string().required('Titre de la thèse est requis'),
    uniteRecherche: Yup.string().required('Unité de recherche est requise'),
    directeurThese: Yup.string().required('Directeur de thèse est requis'),
    financement: Yup.string().required('Type de financement est requis'),
    email: Yup.string().email('Email invalide').required('Email est requis'),
    orcid: Yup.string()
      .matches(
        /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/,
        "Format invalide (ex: 0000-0000-0000-0000)"
      )
      .required("L'ORCID est requis"),
    selfEvaluation: Yup.number()
      .min(1)
      .max(5)
      .required("L'auto-évaluation est requise"),
  });

  const onSubmit = async (values: any) => {
    // console.log('Soumission du formulaire avec les valeurs :', values); // Ajoute ce log

    try {
      const response = await api.post('/doctorant', values);
      // console.log('Réponse du backend :', response.data);
    } catch (error) {
      console.error('Erreur lors de l’envoi des données :', error);
    }
  };

  return (
    <div>
      <h1>Formulaire Doctorant</h1>
      <Formik
        initialValues={{ ...initialValues, orcid: '', selfEvaluation: 0 }}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
      >
        <Form>
          <div>
            <label htmlFor="nom">Nom</label>
            <Field type="text" id="nom" name="nom" />
            <ErrorMessage name="nom" component="div" />
          </div>
          <div>
            <label htmlFor="prenom">Prénom</label>
            <Field type="text" id="prenom" name="prenom" />
            <ErrorMessage name="prenom" component="div" />
          </div>

          {/* ORCID Field */}
          <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
            <label htmlFor="orcid" style={{ color: 'red', fontWeight: 'bold' }}>
              Your ORCID identification number :
            </label>
            <p style={{ fontSize: '0.9em', color: '#555', marginTop: '5px', lineHeight: '1.4' }}>
              Please indicate your ORCID identification number. Even if you have not yet published, you can already register on this system: <a href="https://orcid.org" target="_blank" rel="noopener noreferrer">https://orcid.org</a>.<br />
              This number will remain yours throughout your career, so keep it. It is of interest to us to automatically record your publications in our database.<br />
              <br />
              <strong style={{ color: 'red' }}>******** We advise you to make the information in your ORCID space public so that it is available to as many people as possible (including the BioSPC ED).*******</strong>
            </p>
            <Field type="text" id="orcid" name="orcid" placeholder="0000-0000-0000-0000" style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
            <div style={{ color: 'red', marginTop: '5px' }}>
              <ErrorMessage name="orcid" component="div" />
            </div>
          </div>
          <div>
            <label htmlFor="dateInscription">Date d'inscription</label>
            <Field type="date" id="dateInscription" name="dateInscription" />
            <ErrorMessage name="dateInscription" component="div" />
          </div>
          <div>
            <label htmlFor="titreThese">Titre de la thèse</label>
            <Field type="text" id="titreThese" name="titreThese" />
            <ErrorMessage name="titreThese" component="div" />
          </div>
          <div>
            <label htmlFor="uniteRecherche">Unité de recherche</label>
            <Field type="text" id="uniteRecherche" name="uniteRecherche" />
            <ErrorMessage name="uniteRecherche" component="div" />
          </div>
          <div>
            <label htmlFor="directeurThese">Directeur de thèse</label>
            <Field type="text" id="directeurThese" name="directeurThese" />
            <ErrorMessage name="directeurThese" component="div" />
          </div>
          <div>
            <label htmlFor="financement">Type de financement</label>
            <Field as="select" idla="financement" name="financement">
              <option value="">Choisir</option>
              <option value="bourse">Bourse</option>
              <option value="contrat">Contrat</option>
              <option value="autre">Autre</option>
            </Field>
            <ErrorMessage name="financement" component="div" />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <Field type="email" id="email" name="email" />
            <ErrorMessage name="email" component="div" />
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
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit">Soumettre</button>
            <button type="button" onClick={() => window.print()} style={{ backgroundColor: '#6c757d' }}>
              Télécharger une copie locale
            </button>
          </div>
        </Form>
      </Formik>
    </div>
  );
};

export default FormulaireDoctorant;