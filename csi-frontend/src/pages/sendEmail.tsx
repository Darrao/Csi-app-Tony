import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../services/api';
import '../styles/ImportCSVAndSendEmail.css';

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const ImportCSVAndSendEmail: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [importYear, setImportYear] = useState<number>(currentYear);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [forceReimport, setForceReimport] = useState(false);
    const [importStats, setImportStats] = useState<{ total: number; inserted: number; skippedDuplicate: number; skippedNoEmail: number; errors: number } | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: false
    });

    const handleUpload = async () => {
        if (!file) {
            alert('Veuillez sélectionner un fichier CSV.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        setIsLoading(true);
        setProgress(0);

        try {
            const url = `/doctorant/import-csv?importYear=${importYear}${forceReimport ? '&force=true' : ''}`;
            const response = await api.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (event) => {
                    if (event.total) {
                        const pct = Math.round((event.loaded * 100) / event.total);
                        setProgress(pct);
                    }
                },
            });
            setProgress(100);
            setImportStats(response.data.result);
        } catch (error) {
            console.error('Erreur lors de l’importation du CSV :', error);
            alert('Échec de l’importation.');
        } finally {
            setIsLoading(false);
            setProgress(0);
        }
    };

    return (
        <div className="container-csv">
            <h1 className="title">Importer un fichier CSV</h1>

            {/* Zone de Drag & Drop stylée */}
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <div className="icon-container">
                    <svg width="80" height="50" viewBox="0 0 24 24" fill="none" stroke="#C4C4CF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 16l-4-4-4 4M12 12v9M20.39 18.39A5 5 0 0018 8h-1.26A8 8 0 103 16.3" />
                    </svg>
                </div>
                {file ? (
                    <p className="file-name">{file.name}</p>
                ) : (
                    <p className="drag-text">
                        Glissez-déposez un fichier ici ou <span className="click-text">cliquez pour sélectionner</span>
                    </p>
                )}
            </div>

            {/* Sélecteur d'année */}
            <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label htmlFor="import-year" style={{ fontWeight: 600, fontSize: '14px' }}>
                    Année de campagne :
                </label>
                <select
                    id="import-year"
                    value={importYear}
                    onChange={(e) => setImportYear(Number(e.target.value))}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #ccc',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    {yearOptions.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {/* Force reimport */}
            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                    id="force-reimport"
                    type="checkbox"
                    checked={forceReimport}
                    onChange={(e) => setForceReimport(e.target.checked)}
                />
                <label htmlFor="force-reimport" style={{ fontSize: '13px', color: '#6b7280' }}>
                    Forcer la réimportation (ignore les doublons)
                </label>
            </div>

            {/* Bouton d'importation */}
            <button className="upload-btn" onClick={handleUpload} disabled={isLoading}>
                {isLoading ? `Importation... ${progress}%` : `Importer en ${importYear}`}
            </button>

            {/* Barre de progression */}
            {isLoading && (
                <div style={{ margin: '16px 0' }}>
                    <div style={{
                        width: '100%',
                        height: '10px',
                        background: '#e0e0e0',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #4f46e5, #818cf8)',
                            borderRadius: '8px',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                    <p style={{ textAlign: 'center', marginTop: '6px', fontSize: '13px', color: '#6b7280' }}>
                        {progress < 100 ? `Envoi du fichier : ${progress}%` : 'Traitement en cours...'}
                    </p>
                </div>
            )}
            {/* Résultat de l'import */}
            {importStats && (
                <div style={{
                    margin: '16px 0',
                    padding: '16px',
                    background: importStats.errors > 0 ? '#fff3cd' : '#d1fae5',
                    borderRadius: '8px',
                    fontSize: '14px',
                    border: `1px solid ${importStats.errors > 0 ? '#ffc107' : '#10b981'}`
                }}>
                    <strong>Résultat de l'import pour {importYear} :</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                        <li>✅ <strong>{importStats.inserted}</strong> doctorant(s) ajouté(s)</li>
                        {importStats.skippedDuplicate > 0 && (
                            <li>⚠️ <strong>{importStats.skippedDuplicate}</strong> doublon(s) ignoré(s) (déjà présent(s) en {importYear}) — coche "Forcer" pour les réimporter</li>
                        )}
                        {importStats.skippedNoEmail > 0 && (
                            <li>⚠️ <strong>{importStats.skippedNoEmail}</strong> ligne(s) sans email ignorée(s)</li>
                        )}
                        {importStats.errors > 0 && (
                            <li>❌ <strong>{importStats.errors}</strong> erreur(s) lors de l'insertion</li>
                        )}
                    </ul>
                </div>
            )}
            <div className="csv-info-box">
                <h2>Format attendu du fichier CSV :</h2>
                <p>Le fichier doit contenir les colonnes suivantes <strong>dans cet ordre exact</strong> :</p>
                <ul>
                    <li><code>Prénom</code></li>
                    <li><code>Nom</code></li>
                    <li><code>Date 1ère Inscription</code></li>
                    <li><code>AnnéeThèse</code></li>
                    <li><code>Type Financement Clean</code></li>
                    <li><code>Missions</code></li>
                    <li><code>Sujet Thèse à l'inscription</code></li>
                    <li><code>UnitésRecherche::Intitulé Unité Recherche</code></li>
                    <li><code>UnitésRecherche::Nom_Prenom_DU</code></li>
                    <li><code>Equipes::Nom Equipe Affichée</code></li>
                    <li><code>Equipes::Nom_Prenom_Responsable</code></li>
                    <li><code>HDR::Nom_Prenom_HDR</code></li>
                    <li><code>Email d'envoi</code></li>
                    <li><code>ID_DOCTORANT</code></li>
                    <li><code>DEPARTEMENT_DOCTORANT_DIRECT::Nom Département</code></li>
                </ul>
                <p>⚠️ Le fichier doit être encodé en <strong>UTF-8</strong> et peut utiliser une <strong>virgule (,)</strong> ou un <strong>point-virgule (;)</strong> comme séparateur (il sera converti automatiquement).</p>
            </div>
        </div>
    );
};

export default ImportCSVAndSendEmail;