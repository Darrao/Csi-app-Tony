import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const FormulaireToken: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [email, setEmail] = useState<string | null>(null);
    const [existingData, setExistingData] = useState<any>(null);

    useEffect(() => {
        const validateToken = async () => {
            try {
                const response = await api.post('/email/validate-token', { token });
                console.log('Réponse du backend :', response.data);

                if (response.data.valid) {
                    setEmail(response.data.email);
                } else {
                    alert(response.data.message || 'Lien invalide ou expiré.');
                }
            } catch (error) {
                console.error('Erreur lors de la validation du token :', error);
                alert('Erreur lors de la validation du lien.');
            }
        };

        if (token) {
            validateToken();
        }
    }, [token]);

    const initialValues = existingData || {
        nom: '',
        prenom: '',
        dateInscription: '',
        titreThese: '',
        uniteRecherche: '',
        directeurThese: '',
        financement: '',
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
        representantEmail1: Yup.string().email('Email invalide').required('Email du représentant 1 est requis'),
        representantEmail2: Yup.string().email('Email invalide').required('Email du représentant 2 est requis'),
    });

    const onSubmit = async (values: any) => {
        try {
            const data = {
                ...values,
                email,
                representantEmail1: values.representantEmail1,
                representantEmail2: values.representantEmail2,
            };

            console.log('Données soumises au backend :', data);

            await api.post('/doctorant', data);

            await api.post('/email/send-representant-tokens', {
                email,
                representants: [values.representantEmail1, values.representantEmail2],
            });

            alert('Formulaire soumis avec succès et emails envoyés aux représentants !');
        } catch (error) {
            console.error('Erreur lors de la soumission du formulaire :', error);
            alert('Erreur lors de la soumission.');
        }
    };

    if (!email) {
        return <p>Chargement...</p>;
    }

    return (
        <div>
            <h1>Formulaire</h1>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={onSubmit}
                enableReinitialize
            >
                <Form>
                    <div>
                        <label>Email</label>
                        <Field type="email" name="email" value={email} disabled />
                    </div>
                    <div>
                        <label>Nom</label>
                        <Field type="text" name="nom" />
                        <ErrorMessage name="nom" component="div" />
                    </div>
                    <div>
                        <label>Prénom</label>
                        <Field type="text" name="prenom" />
                        <ErrorMessage name="prenom" component="div" />
                    </div>
                    <div>
                        <label>Date d'inscription</label>
                        <Field type="date" name="dateInscription" />
                        <ErrorMessage name="dateInscription" component="div" />
                    </div>
                    <div>
                        <label>Titre de la thèse</label>
                        <Field type="text" name="titreThese" />
                        <ErrorMessage name="titreThese" component="div" />
                    </div>
                    <div>
                        <label>Unité de recherche</label>
                        <Field type="text" name="uniteRecherche" />
                        <ErrorMessage name="uniteRecherche" component="div" />
                    </div>
                    <div>
                        <label>Directeur de thèse</label>
                        <Field type="text" name="directeurThese" />
                        <ErrorMessage name="directeurThese" component="div" />
                    </div>
                    <div>
                        <label>Type de financement</label>
                        <Field as="select" name="financement">
                            <option value="">Choisir</option>
                            <option value="bourse">Bourse</option>
                            <option value="contrat">Contrat</option>
                            <option value="autre">Autre</option>
                        </Field>
                        <ErrorMessage name="financement" component="div" />
                    </div>
                    <div>
                        <label>Email du Représentant 1</label>
                        <Field type="email" name="representantEmail1" />
                        <ErrorMessage name="representantEmail1" component="div" />
                    </div>
                    <div>
                        <label>Email du Représentant 2</label>
                        <Field type="email" name="representantEmail2" />
                        <ErrorMessage name="representantEmail2" component="div" />
                    </div>
                    <button type="submit">Soumettre</button>
                </Form>
            </Formik>
        </div>
    );
};

export default FormulaireToken;