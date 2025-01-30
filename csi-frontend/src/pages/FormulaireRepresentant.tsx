import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

// Fonction pour formater la date au format "yyyy-MM-dd"
const formatDate = (isoDate: string) => {
    if (!isoDate) return '';
    return new Date(isoDate).toISOString().split('T')[0];
};

const FormulaireRepresentant: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [role, setRole] = useState<string | null>(null); // 'representant1' ou 'representant2'
    const [doctorantData, setDoctorantData] = useState<any>(null);

    useEffect(() => {
        const validateToken = async () => {
            try {
                console.log('Validation du token en cours...'); // Ajouté
                const response = await api.post('/email/validate-token', { token });
        
                console.log('Réponse du backend après validation du token :', response.data); // Ajouté
        
                if (response.data.valid && response.data.doctorant?.representantData) {
                    setRole(
                        response.data.email === response.data.doctorant.representantData.representantEmail1
                            ? 'representant1'
                            : 'representant2'
                    );
        
                    setDoctorantData(response.data.doctorant);
                    console.log('Role défini pour le représentant :', response.data.email === response.data.doctorant.representantData.representantEmail1 ? 'representant1' : 'representant2'); // Ajouté
                } else {
                    console.log('Validation échouée ou données incomplètes :', response.data); // Ajouté
                    alert(response.data.message || 'Lien invalide ou expiré.');
                }
            } catch (error) {
                console.error('Erreur lors de la validation du token :', error); // Ajouté
            }
        };

        if (token) {
            validateToken();
        }
    }, [token]);

    const validationSchema = Yup.object({
        choix1: Yup.string().required('Choix 1 est requis'),
        choix2: Yup.string().required('Choix 2 est requis'),
    });

    const initialValues = role === 'representant1'
    ? doctorantData?.representantData?.representant1Choices || { choix1: '', choix2: '' }
    : doctorantData?.representantData?.representant2Choices || { choix1: '', choix2: '' };

    const onSubmit = async (values: any) => {
        console.log('Données soumises par le rôle :', role); // Ajouté
        console.log('Données soumises :', values); // Ajouté

        try {
            const updateData = role === 'representant1'
                ? { representant1Choices: values }
                : { representant2Choices: values };

            console.log('Payload envoyé au backend :', {
                doctorantEmail: doctorantData.email,
                role,
                choices: values,
            }); // Ajouté

            await api.post('/doctorant/representant', {
                doctorantEmail: doctorantData.email,
                role,
                choices: values,
            });

            alert('Formulaire soumis avec succès !');
        } catch (error) {
            console.error('Erreur lors de la soumission des données :', error); // Ajouté
            alert('Erreur lors de la soumission.');
        }
    };

    if (!doctorantData) {
        return <p>Chargement...</p>;
    }

    return (
        <div>
            <h1>Formulaire du Représentant</h1>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit} enableReinitialize>
                <Form>
                    <div>
                        <label>Email du Doctorant</label>
                        <Field type="hidden" name="doctorantEmail" value={doctorantData.email} />
                        <span>{doctorantData.email}</span>
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
                        <Field
                            type="date"
                            name="dateInscription"
                            value={formatDate(doctorantData.dateInscription)}
                            disabled
                        />
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
                        <label>Choix 1</label>
                        <Field type="text" name="choix1" />
                        <ErrorMessage name="choix1" component="div" />
                    </div>
                    <div>
                        <label>Choix 2</label>
                        <Field type="text" name="choix2" />
                        <ErrorMessage name="choix2" component="div" />
                    </div>
                    <button type="submit">Soumettre</button>
                </Form>
            </Formik>
        </div>
    );
};

export default FormulaireRepresentant;