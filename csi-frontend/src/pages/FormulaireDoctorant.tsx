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
  });

  const onSubmit = async (values: any) => {
    console.log('Soumission du formulaire avec les valeurs :', values); // Ajoute ce log

    try {
        const response = await api.post('/doctorant', values);
        console.log('Réponse du backend :', response.data);
    } catch (error) {
        console.error('Erreur lors de l’envoi des données :', error);
    }
  };

  return (
    <div>
      <h1>Formulaire Doctorant</h1>
      <Formik
        initialValues={initialValues}
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
            <Field as="select" idla ="financement" name="financement">
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
          <button type="submit">Soumettre</button>
        </Form>
      </Formik>
    </div>
  );
};

export default FormulaireDoctorant;