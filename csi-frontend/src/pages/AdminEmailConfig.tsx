import React, { useEffect, useState } from 'react';
import api from '../services/api';
import '../styles/AdminEmailConfig.css';

// ✅ Définition des types de configuration email
interface EmailGroup {
    recipient: string[];
    cc: string[];
}

interface EmailConfig {
    _id: string;
    MECA: EmailGroup;
    PP: EmailGroup;
    IM: EmailGroup;
    IMMUNO: EmailGroup;
    GENYX: EmailGroup;
    presentationTemplate: string;
    csiProposalLink: string;
    contactLink: string;
    firstDoctorantEmail: string;
    doctorantSubmit: string;
    formCsiMember: string;
    thanksForSubmitCsiMember: string;
    CsiMemberHasSubmitForDoctorant: string;
    CsiMemberHasSubmitForDirector: string;
}

const AdminEmailConfig: React.FC = () => {
    const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);

    const fetchEmailConfig = async () => {
        try {
            // console.log('[FRONTEND] Récupération des configurations d\'email...');
            const response = await api.get<EmailConfig[]>('/email-config');
            // console.log('[FRONTEND] Réponse brute de l\'API :', response);
            // console.log('[FRONTEND] Réponse de l\'API:', response.data);

            if (response.data.length > 0) {
                setEmailConfig(response.data[0]); // Il n'y a qu'une seule configuration
            } else {
                console.log('[FRONTEND] Aucune configuration trouvée. Affichage des champs par défaut.');
                setEmailConfig({
                    _id: '', // 🛠 Champ vide car il sera généré par MongoDB à la création
                    MECA: { recipient: [], cc: [] },
                    PP: { recipient: [], cc: [] },
                    IM: { recipient: [], cc: [] },
                    IMMUNO: { recipient: [], cc: [] },
                    GENYX: { recipient: [], cc: [] },
                    presentationTemplate: '',
                    csiProposalLink: '',
                    contactLink: '',
                    firstDoctorantEmail: '',
                    doctorantSubmit: '',
                    formCsiMember: '',
                    thanksForSubmitCsiMember: '',
                    CsiMemberHasSubmitForDoctorant: '',
                    CsiMemberHasSubmitForDirector: '',
                });
            }
        } catch (error) {
            console.error('[FRONTEND] Erreur lors de la récupération des configurations d\'email :', error);
        }
    };

    useEffect(() => {
        fetchEmailConfig();
    }, []);

    const handleUpdateConfig = async () => {
        if (!emailConfig) {
            alert('Erreur : Aucune configuration trouvée.');
            return;
        }
    
        try {
            console.log('[FRONTEND] Réinitialisation et recréation de la configuration...');
    
            // Crée une copie avec _id optionnel
            const configToSend: Partial<EmailConfig> = { ...emailConfig };
    
            // Supprime _id s'il est vide
            if (configToSend._id === '') {
                delete configToSend._id;
            }
    
            // Applique le formatage HTML uniquement pour les champs de texte long
            const textFields: (keyof EmailConfig)[] = [
                'firstDoctorantEmail',
                'doctorantSubmit',
                'formCsiMember',
                'thanksForSubmitCsiMember',
                'CsiMemberHasSubmitForDirector'
            ];
    
            textFields.forEach(field => {
                const value = configToSend[field];
    
                // ✅ Vérifie si la valeur est bien une string avant d'appliquer formatTextToHtml
                if (typeof value === 'string') {
                    (configToSend as any)[field] = formatTextToHtml(value);
                }
            });
    
            // Envoie la requête à l'API
            const response = await api.post('/email-config/reset', configToSend);
    
            setEmailConfig(response.data);
            alert('Configuration recréée avec succès !');
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la configuration :', error);
            alert('Échec de la mise à jour.');
        }
    };

    const handleInputChange = (field: keyof EmailConfig, value: string) => {
        if (emailConfig) {
            setEmailConfig((prevConfig) => ({
                ...prevConfig!,
                [field]: value,
            }));
        }
    };

    const handleArrayChange = (group: keyof EmailConfig, type: keyof EmailGroup, index: number, value: string) => {
        if (emailConfig && emailConfig[group] && typeof emailConfig[group] === 'object') {
            const updatedGroup = { ...(emailConfig[group] as EmailGroup) };
            updatedGroup[type][index] = value;
            setEmailConfig((prevConfig) => ({
                ...prevConfig!,
                [group]: updatedGroup,
            }));
        }
    };

    const addRecipient = (group: keyof EmailConfig, type: keyof EmailGroup) => {
        if (emailConfig && emailConfig[group] && typeof emailConfig[group] === 'object') {
            const updatedGroup = { ...(emailConfig[group] as EmailGroup) };
            updatedGroup[type] = [...updatedGroup[type], ''];
            setEmailConfig((prevConfig) => ({
                ...prevConfig!,
                [group]: updatedGroup,
            }));
        }
    };

    const removeRecipient = (group: keyof EmailConfig, type: keyof EmailGroup, index: number) => {
        if (emailConfig && emailConfig[group] && typeof emailConfig[group] === 'object') {
            const updatedGroup = { ...(emailConfig[group] as EmailGroup) };
            updatedGroup[type] = updatedGroup[type].filter((_, i) => i !== index);
            setEmailConfig((prevConfig) => ({
                ...prevConfig!,
                [group]: updatedGroup,
            }));
        }
    };

    // 🔄 Convertit le texte brut en HTML en ajoutant des <p> à chaque ligne
    const formatTextToHtml = (text: string): string => {
        return text
            .split('\n') // Divise par les sauts de ligne
            .map(line => line.trim()) // Supprime les espaces superflus
            .filter(line => line.length > 0) // Supprime les lignes vides
            .map(line => {
                // ✅ Si la ligne contient déjà une balise HTML, on la garde telle quelle
                if (line.match(/^<.*?>/)) {
                    return line;
                }
                // ❌ Sinon, on l'entoure d'un <p>
                return `<p>${line}</p>`;
            })
            .join(''); // Assemble en une seule string
    };

    const emailLabels: Partial<Record<keyof EmailConfig, string>> = {
        firstDoctorantEmail: "1er mail d'invitation destiné aux doctorants pour remplir leur compte rendu annuel",
        doctorantSubmit: "Accusé de réception envoyé au doctorant et au directeur de thèse en CC après soumission de son compte rendu",
        formCsiMember: "Mail d'invitation pour les membres du comité de suivi pour remplir le compte rendu annuel du doctorant",
        thanksForSubmitCsiMember: "Accusé de réception envoyé aux membres du comité de suivi après validation de leur compte rendu",
        CsiMemberHasSubmitForDirector: "Mail envoyé aux directeurs de département et aux gestionnaires",
        CsiMemberHasSubmitForDoctorant: "Confirmation de soumission du membre du CSI pour le doctorant",
    };

    return (
        <div className="admin-email-config-container">
            <h1 className="title">Gestion des Configurations Email</h1>
    
            {emailConfig ? (
                <>
                    {/* 🔧 Champs pour les emails des groupes */}
                    {(['MECA', 'PP', 'IM', 'IMMUNO', 'GENYX'] as (keyof EmailConfig)[]).map((group) => (
                        <div key={group} className="email-group">
                            <h2>{group}</h2>

                            <div>
                                <h3>Destinataires principaux</h3>
                                {(emailConfig[group] as EmailGroup).recipient.map((email, index) => (
                                    <div key={index} className="email-entry">
                                        <input
                                            type="text"
                                            value={email}
                                            onChange={(e) => handleArrayChange(group, 'recipient', index, e.target.value)}
                                        />
                                        <button onClick={() => removeRecipient(group, 'recipient', index)}>❌</button>
                                    </div>
                                ))}
                                <button onClick={() => addRecipient(group, 'recipient')}>➕ Ajouter un destinataire</button>
                            </div>

                            <div>
                                <h3>En copie (CC)</h3>
                                {(emailConfig[group] as EmailGroup).cc.map((email, index) => (
                                    <div key={index} className="email-entry">
                                        <input
                                            type="text"
                                            value={email}
                                            onChange={(e) => handleArrayChange(group, 'cc', index, e.target.value)}
                                        />
                                        <button onClick={() => removeRecipient(group, 'cc', index)}>❌</button>
                                    </div>
                                ))}
                                <button onClick={() => addRecipient(group, 'cc')}>➕ Ajouter en CC</button>
                            </div>
                        </div>
                    ))}
                    
                    <div className="email-group">
                        <h2>Lien pour les doctorant pour faire valider leur comitée de CSI</h2>
                        <div className="email-entry">
                            <input
                                type="text"
                                value={emailConfig.csiProposalLink}
                                onChange={(e) => handleInputChange('csiProposalLink', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="email-group">
                        <h2>Lien de contact de l'ED</h2>
                        <div className="email-entry">
                            <input
                                type="text"
                                value={emailConfig.contactLink}
                                onChange={(e) => handleInputChange('contactLink', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="email-group">
                        <h2>Lien vers le template pour les présentations des doctorants</h2>
                        <div className="email-entry">
                            <input
                                type="text"
                                value={emailConfig.presentationTemplate}
                                onChange={(e) => handleInputChange('presentationTemplate', e.target.value)}
                            />
                        </div>
                    </div>
                    {/* ✉️ Champs pour le contenu des emails */}
                    <div className="email-content-fields">
                        <h2>Contenu des emails</h2>
                        {([
                            'firstDoctorantEmail',
                            'doctorantSubmit',
                            'formCsiMember',
                            'thanksForSubmitCsiMember',
                            // 'CsiMemberHasSubmitForDoctorant',
                            'CsiMemberHasSubmitForDirector',
                        ] as (keyof EmailConfig)[]).map((field) => (
                            <div key={field} className="email-content">
                                <h3>{emailLabels[field]}</h3>
                                <textarea
                                    value={typeof emailConfig[field] === 'string' ? (emailConfig[field] as string) : ''}
                                    onChange={(e) => handleInputChange(field, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                    <button onClick={handleUpdateConfig} className="btn btn-success">💾 Sauvegarder les modifications</button>
                </>
            ) : (
                <p>Chargement...</p>
            )}
        </div>
    );
};

// `1er mail d'invitation déstiné aux doctorants pour remplir leur compte rendu annuel`,
//                             'Accusé de reception envoyé au doctorant après soumission de son compte rendu',
//                             `Mail d'invitation pour les membres du comité de suivi pour remplir le compte rendu annuel du doctorant`,
//                             'Accusé de reception envoyé aux membres du comité de suivi après validation de leur compte rendu',
//                             // 'CsiMemberHasSubmitForDoctorant',
//                             'Mail envoyé aux directeurs de département et aux gestionnaires',

export default AdminEmailConfig;