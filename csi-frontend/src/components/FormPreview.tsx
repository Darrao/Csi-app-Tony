
import React from 'react';
import '../styles/FormulaireToken.css'; // Re-use existing styles
import { SystemBlockRenderer } from './form-blocks/SystemBlockRenderer';

interface Question {
    _id: string;
    target: 'doctorant' | 'referent';
    section: string;
    type: string;
    content: string;
    required?: boolean;
    helpText?: string;
    placeholder?: string;
    systemId?: string; // New field for system blocks
    options?: string[];
    allowMultipleSelection?: boolean;
}

interface FormPreviewProps {
    questions: Question[];
    target: 'doctorant' | 'referent';
    onClose: () => void;
}

const FormPreview: React.FC<FormPreviewProps> = ({ questions, target, onClose }) => {
    // Group questions by section
    const sections: { [key: string]: Question[] } = {};

    // Maintain order by using a Set of keys from the sorted questions array to iterate later
    const sortedSections: string[] = [];

    questions.forEach(q => {
        if (!sections[q.section]) {
            sections[q.section] = [];
            sortedSections.push(q.section);
        }
        sections[q.section].push(q);
    });

    return (
        <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div
                className="modal-content"
                style={{ position: 'relative', maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button X */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#666'
                    }}
                >
                    &times;
                </button>

                <div className="form-header">
                    <h1>{target === 'doctorant' ? 'CSI Annual Report (Preview)' : 'CSI Evaluation Form (Preview)'}</h1>
                    <p>This is how the form will look to the user.</p>
                </div>

                <div className="form-token-container" style={{ boxShadow: 'none', padding: 0 }}>
                    {/* Fallback if no questions at all (e.g. not initialized) */}
                    {questions.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                            <p>No questions configured yet.</p>
                            <p>Please initialize default blocks or add custom questions.</p>
                        </div>
                    )}

                    {sortedSections.map(sectionName => (
                        <div key={sectionName} className="form-section">
                            <h2>{sectionName}</h2>

                            {/* Grid wrapper for consistency */}
                            <div className="info-grid">
                                {sections[sectionName].map(q => {
                                    if (q.systemId) {
                                        // Render System Block (ReadOnly)
                                        return (
                                            <div key={q._id} style={{ gridColumn: '1 / -1', marginBottom: '15px' }}>
                                                {/* Specialized renderer for documents in preview? */}
                                                {q.systemId === 'documents_upload' ? (
                                                    <div className="question-block">
                                                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Scientific Report & Self Assessment</div>
                                                        <div style={{ padding: '15px', border: '2px dashed #ccc', textAlign: 'center', color: '#999', borderRadius: '5px' }}>
                                                            [File Upload Inputs would appear here]
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <SystemBlockRenderer systemId={q.systemId} readOnly />
                                                )}
                                            </div>
                                        );
                                    }

                                    // Render Dynamic Question
                                    return (
                                        <div className="question-block" key={q._id} style={{ gridColumn: '1 / -1', marginBottom: '15px' }}>
                                            <label className="question-text">
                                                {q.content}
                                                {q.required && <span className="red"> *</span>}
                                            </label>

                                            {q.helpText && (
                                                <p style={{ fontSize: '0.85em', color: '#666', marginTop: '-5px', marginBottom: '10px' }}>
                                                    ℹ️ {q.helpText}
                                                </p>
                                            )}

                                            <div className="input-group">
                                                {q.type === 'plus_minus_comment' ? (
                                                    <select className="select-input" disabled>
                                                        <option>{q.placeholder || "Choose an option..."}</option>
                                                        <option>+ (Strong/Yes)</option>
                                                        <option>- (Weak/No)</option>
                                                        <option>± (Moderate/Mixed)</option>
                                                        <option>NotAddressed</option>
                                                    </select>
                                                ) : q.type === 'scale_1_5' || q.type === 'rating_comment' ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                        <span style={{ fontSize: '0.9em', color: '#666' }}>Low (1)</span>
                                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                                            <input type="range" min="1" max="5" disabled style={{ width: '100%' }} />
                                                        </div>
                                                        <span style={{ fontSize: '0.9em', color: '#666' }}>High (5)</span>
                                                    </div>
                                                ) : q.type === 'multiple_choice' ? (
                                                    <div className="radio-options" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', marginBottom: '10px' }}>
                                                        {(q.options || []).map((opt: string, idx: number) => (
                                                            <label key={idx} style={{ display: 'flex', alignItems: 'center', cursor: 'not-allowed' }}>
                                                                <input 
                                                                    type={q.allowMultipleSelection ? "checkbox" : "radio"} 
                                                                    disabled 
                                                                    style={{ margin: 0, marginRight: '10px', width: '18px', height: '18px' }}
                                                                />
                                                                <span style={{ fontSize: '1rem', color: '#666' }}>{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : q.type === 'select' ? (
                                                    <select className="select-input" disabled>
                                                        <option>{q.placeholder || "Choose..."}</option>
                                                        <option>Yes</option>
                                                        <option>No</option>
                                                    </select>
                                                ) : (
                                                    <input type="text" className="select-input" placeholder={q.placeholder || "Your answer..."} disabled />
                                                )}
                                            </div>

                                            <div className="input-group" style={{ marginTop: '10px' }}>
                                                <textarea className="comment-box" placeholder="Additional comments (optional)..." disabled style={{ height: '50px' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="card-footer" style={{ marginTop: '20px', textAlign: 'center' }}>
                    <button className="btn btn-primary" onClick={onClose}>Close Preview</button>
                </div>
            </div>
        </div>
    );
};

export default FormPreview;
