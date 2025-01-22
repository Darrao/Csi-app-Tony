import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';

const ModifierDoctorant: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [initialValues, setInitialValues] = useState({
        nom: '',
        prenom: '',
        dateInscription: '',
        titreThese: '',
        uniteRecherche: '',
        directeurThese: '',
        financement: '',
        email: '',
    });

    useEffect(() => {
        const fetchDoctorant = async () => {
            try {
                const response = await api.get(`/doctorant/${id}`);
                setInitialValues(response.data);
            } catch (error) {
                console.error('Erreur lors de la récupération du doctorant :', error);
            }
        };

        fetchDoctorant();
    }, [id]);

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
        try {
            await api.put(`/doctorant/${id}`, values);
            navigate('/doctorants'); // Retourner à la liste
        } catch (error) {
            console.error('Erreur lors de la mise à jour du doctorant :', error);
        }
    };

    return (
        <div>
            <h1>Modifier Doctorant</h1>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                enableReinitialize
                onSubmit={onSubmit}
            >
                <Form>
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
                        <label>Email</label>
                        <Field type="email" name="email" />
                        <ErrorMessage name="email" component="div" />
                    </div>
                    <button type="submit">Mettre à jour</button>
                </Form>
            </Formik>
        </div>
    );
};

export default ModifierDoctorant;