import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const FormulaireRepresentant: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [doctorantData, setDoctorantData] = useState<any>(null);

    useEffect(() => {
        const fetchDoctorantData = async () => {
            try {
                const response = await api.post('/email/validate-token', { token });
                console.log('Réponse de /email/validate-token:', response.data);
        
                if (response.data.valid) {
                    const normalizedEmail = response.data.email.trim().toLowerCase();
                    console.log('Email du doctorant (normalisé) envoyé au backend :', normalizedEmail);
        
                    const dataResponse = await api.get(`/doctorant/by-email/${normalizedEmail}`);
                    console.log('Réponse de /doctorant/by-email :', dataResponse.data);
                    setDoctorantData(dataResponse.data);
                } else {
                    alert('Lien invalide ou expiré.');
                }
            } catch (error) {
                console.error('Erreur lors de la validation du token :', error);
                alert('Erreur lors de la validation du lien.');
            }
        };
    
        if (token) {
            fetchDoctorantData();
        }
    }, [token]);

    const initialValues = {
        champPlus1: '',
        champPlus2: '',
    };

    const validationSchema = Yup.object({
        champPlus1: Yup.string().required('Champ +1 est requis'),
        champPlus2: Yup.string().required('Champ +2 est requis'),
    });

    const onSubmit = async (values: any) => {
        if (!doctorantData?.email) {
            console.error('Données actuelles de doctorantData:', doctorantData);
            alert('Erreur : l’email du doctorant est introuvable. Veuillez vérifier les données.');
            return;
        }
    
        const data = { ...values, doctorantEmail: doctorantData.email };
        console.log('Données envoyées au backend :', data);
    
        try {
            const response = await api.post('/doctorant/representant', data);
            console.log('Réponse du backend :', response.data);
            alert('Formulaire soumis avec succès !');
        } catch (error) {
            console.error('Erreur lors de la soumission du formulaire :', error);
            alert('Erreur lors de la soumission.');
        }
    };

    if (!doctorantData) {
        return <p>Chargement...</p>;
    }

    return (
        <div>
            <h1>Formulaire du Représentant</h1>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit}>
                <Form>
                    <div>
                        <label>Email du Doctorant</label>
                        <Field type="email" name="doctorantEmail" value={doctorantData.email} disabled />
                    </div>
                    <div>
                        <label>Nom</label>
                        <Field type="text" name="nom" value={doctorantData.nom} disabled />
                    </div>
                    <div>
                        <label>Prénom</label>
                        <Field type="text" name="prenom" value={doctorantData.prenom} disabled />
                    </div>
                    <div>
                        <label>Date d'inscription</label>
                        <Field type="date" name="dateInscription" value={doctorantData.dateInscription} disabled />
                    </div>
                    <div>
                        <label>Titre de la thèse</label>
                        <Field type="text" name="titreThese" value={doctorantData.titreThese} disabled />
                    </div>
                    <div>
                        <label>Unité de recherche</label>
                        <Field type="text" name="uniteRecherche" value={doctorantData.uniteRecherche} disabled />
                    </div>
                    <div>
                        <label>Directeur de thèse</label>
                        <Field type="text" name="directeurThese" value={doctorantData.directeurThese} disabled />
                    </div>
                    <div>
                        <label>Type de financement</label>
                        <Field type="text" name="financement" value={doctorantData.financement} disabled />
                    </div>
                    <div>
                        <label>Champ +1</label>
                        <Field type="text" name="champPlus1" />
                        <ErrorMessage name="champPlus1" component="div" />
                    </div>
                    <div>
                        <label>Champ +2</label>
                        <Field type="text" name="champPlus2" />
                        <ErrorMessage name="champPlus2" component="div" />
                    </div>
                    <button type="submit">Soumettre</button>
                </Form>
            </Formik>
        </div>
    );
};

export default FormulaireRepresentant;