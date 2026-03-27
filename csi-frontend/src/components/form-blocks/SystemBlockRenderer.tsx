
import React from 'react';

// Interfaces for props
interface SystemBlockProps {
    systemId: string;
    data?: any;
    readOnly?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    // Special handler for Training Modules which calculates totals
    handleHoursChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const IdentityBlock: React.FC<SystemBlockProps> = ({ data, onChange, readOnly }) => (
    <div className="info-grid">
        <div className='info-item'>
            <label>First Name <span className="red">*</span></label>
            <input className="select-input" type="text" name="prenom" value={data?.prenom || ''} onChange={onChange} disabled={readOnly} />
        </div>
        <div className='info-item'>
            <label>Family Name <span className="red">*</span></label>
            <input className="select-input" type="text" name="nom" value={data?.nom || ''} onChange={onChange} disabled={readOnly} />
        </div>
        <div className='info-item' style={{ gridColumn: '1 / -1', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
            <label style={{ color: '#007bff', fontWeight: 'bold' }}>Your ORCID identification number</label>
            <p style={{ fontSize: '0.85em', color: '#666', marginBottom: '8px' }}>
                Please indicate your ORCID number.
            </p>
            <input className="select-input" type="text" name="orcid" value={data?.orcid || ''} onChange={onChange} disabled={readOnly} style={{ width: '100%', borderColor: '#007bff' }} />
        </div>
        <div className='info-item'>
            <label>Email <span className="red">*</span></label>
            <input className="select-input" type="email" name="email" value={data?.email || ''} onChange={onChange} disabled={readOnly} />
        </div>
        <div className='info-item'>
            <label>Date first registration <span className="red">*</span></label>
            <input className="select-input" type="date" name="datePremiereInscription" value={data?.datePremiereInscription?.split('T')[0] || ''} onChange={onChange} disabled={readOnly} />
        </div>
        <div className='info-item'>
            <label>Unique ID <span className="red">*</span></label>
            <input className="select-input" disabled type="text" name="ID_DOCTORANT" value={data?.ID_DOCTORANT || ''} style={{ backgroundColor: '#e9ecef' }} />
        </div>
        <div className='info-item'>
            <label>Doctoral student's department <span className="red">*</span></label>
            <select className="select-input" name="departementDoctorant" value={data?.departementDoctorant || ''} onChange={onChange} disabled={readOnly}>
                <option value="">-- Select --</option>
                <option value="MECA">MECA</option>
                <option value="PP">PP</option>
                <option value="IM">IM</option>
                <option value="IMMUNO">IMMUNO</option>
                <option value="GENYX">GENYX</option>
            </select>
        </div>
    </div>
);

const ThesisBlock: React.FC<SystemBlockProps> = ({ data, onChange, readOnly }) => (
    <div className="info-grid">
        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
            <label>Thesis Title <span className="red">*</span></label>
            <input className="select-input" type="text" name="titreThese" value={data?.titreThese || ''} onChange={onChange} disabled={readOnly} style={{ width: '100%' }} />
        </div>
        <div className="info-item">
            <label>CSI Number <span className="red">*</span></label>
            <input className="select-input" type="text" name="anneeThese" value={data?.anneeThese || ''} onChange={onChange} disabled={readOnly} />
        </div>
        <div className="info-item">
            <label>Funding <span className="red">*</span></label>
            <input className="select-input" type="text" name="typeFinancement" value={data?.typeFinancement || ''} onChange={onChange} disabled={readOnly} />
        </div>
    </div>
);

const ResearchUnitBlock: React.FC<SystemBlockProps> = ({ data, onChange, readOnly }) => (
    <div className="info-grid">
        <div className="info-item">
            <label>Title of the research unit <span className="red">*</span></label>
            <input className="select-input" type="text" name="intituleUR" value={data?.intituleUR || ''} onChange={onChange} disabled={readOnly} />
        </div>
        <div className="info-item">
            <label>Director of the research unit <span className="red">*</span></label>
            <input className="select-input" type="text" name="directeurUR" value={data?.directeurUR || ''} onChange={onChange} disabled={readOnly} />
        </div>
    </div>
);

const TeamBlock: React.FC<SystemBlockProps> = ({ data, onChange, readOnly }) => (
    <div className="info-grid">
        <div className='info-item'>
            <label>Title of the team <span className="red">*</span></label>
            <input className="select-input" type="text" name="intituleEquipe" value={data?.intituleEquipe || ''} onChange={onChange} disabled={readOnly} />
        </div>
        <div className='info-item'>
            <label>Team leader <span className="red">*</span></label>
            <input className="select-input" type="text" name="directeurEquipe" value={data?.directeurEquipe || ''} onChange={onChange} disabled={readOnly} />
        </div>
        <div className='info-item'>
            <label>Thesis supervisor <span className="red">*</span></label>
            <input className="select-input" type="text" name="nomPrenomHDR" value={data?.nomPrenomHDR || ''} onChange={onChange} disabled={readOnly} placeholder="Supervisor Name" />
            <input className="select-input" type="email" name="email_HDR" value={data?.email_HDR || ''} onChange={onChange} disabled={readOnly} style={{ marginTop: '5px' }} placeholder="Supervisor Email" />
        </div>
        <div className='info-item'>
            <label>Thesis co-supervisor (optional)</label>
            <input className="select-input" type="text" name="coDirecteurThese" value={data?.coDirecteurThese || ''} onChange={onChange} disabled={readOnly} />
        </div>
    </div>
);

const CSIMembersBlock: React.FC<SystemBlockProps> = ({ data, onChange, readOnly }) => (
    <div className="info-grid">
        <div className="info-item">
            <label>Member #1 <span className="red">*</span></label>
            <input className="select-input" type="text" name="nomMembre1" value={data?.nomMembre1 || ''} onChange={onChange} disabled={readOnly} placeholder="Name" />
            <input className="select-input" type="email" name="emailMembre1" value={data?.emailMembre1 || ''} onChange={onChange} disabled={readOnly} style={{ marginTop: '5px' }} placeholder="Email" />
        </div>
        <div className="info-item">
            <label>Member #2 <span className="red">*</span></label>
            <input className="select-input" type="text" name="nomMembre2" value={data?.nomMembre2 || ''} onChange={onChange} disabled={readOnly} placeholder="Name" />
            <input className="select-input" type="email" name="emailMembre2" value={data?.emailMembre2 || ''} onChange={onChange} disabled={readOnly} style={{ marginTop: '5px' }} placeholder="Email" />
        </div>
        <div className="info-item">
            <label>Additional member (optional)</label>
            <input className="select-input" type="text" name="nomAdditionalMembre" value={data?.nomAdditionalMembre || ''} onChange={onChange} disabled={readOnly} placeholder="Name" />
            <input className="select-input" type="email" name="emailAdditionalMembre" value={data?.emailAdditionalMembre || ''} onChange={onChange} disabled={readOnly} style={{ marginTop: '5px' }} placeholder="Email" />
        </div>
    </div>
);

const ScientificActivitiesBlock: React.FC<SystemBlockProps> = ({ data, onChange, readOnly }) => (
    <div className="info-grid">
        {['missions', 'publications', 'conferencePapers', 'posters', 'publicCommunication'].map(field => (
            <div key={field} className="info-item" style={{ gridColumn: '1 / -1' }}>
                <label style={{ textTransform: 'capitalize' }}>{field.replace(/([A-Z])/g, ' $1').trim()} <span className="red">*</span></label>
                <textarea className="comment-box" name={field} value={data?.[field] || ''} onChange={onChange} disabled={readOnly} placeholder='"None" for empty field' />
            </div>
        ))}
    </div>
);

const TrainingBlock: React.FC<SystemBlockProps> = ({ data, onChange, handleHoursChange, readOnly }) => (
    <>
        <div className="info-item">
            <label>Scientific modules (cumulated hours) :</label>
            <input className="select-input" type="number" name="nbHoursScientificModules" value={data?.nbHoursScientificModules || 0} onChange={handleHoursChange || onChange} disabled={readOnly} />
        </div>
        <div className="info-item">
            <label>Cross-disciplinary modules (cumulated hours) :</label>
            <input className="select-input" type="number" name="nbHoursCrossDisciplinaryModules" value={data?.nbHoursCrossDisciplinaryModules || 0} onChange={handleHoursChange || onChange} disabled={readOnly} />
        </div>
        <div className="info-item">
            <label>Professional integration modules (cumulated hours):</label>
            <input className="select-input" type="number" name="nbHoursProfessionalIntegrationModules" value={data?.nbHoursProfessionalIntegrationModules || 0} onChange={handleHoursChange || onChange} disabled={readOnly} />
        </div>
        <div className="info-item">
            <label>Total number of hours (all modules) :</label>
            <input className="select-input" type="number" name="totalNbHours" value={data?.totalNbHours || 0} disabled style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }} />
        </div>
    </>
);

// Map
const RENDERERS: { [key: string]: React.FC<SystemBlockProps> } = {
    'identity': IdentityBlock,
    'thesis_info': ThesisBlock,
    'research_unit': ResearchUnitBlock,
    'team_info': TeamBlock,
    'csi_members': CSIMembersBlock,
    'scientific_activities': ScientificActivitiesBlock,
    'training_modules': TrainingBlock,
    // Add dummy renderers for upload/documents if needed, typically customized heavily so might keep logic inline or here
};

export const SystemBlockRenderer: React.FC<SystemBlockProps> = (props) => {
    const Component = RENDERERS[props.systemId];
    if (!Component) return <div style={{ color: 'red' }}>Unknown System Block: {props.systemId}</div>;
    return <Component {...props} />;
};
