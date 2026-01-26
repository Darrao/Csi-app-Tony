import React, { useEffect, useState } from 'react';
import api from '../services/api';
import '../styles/AdminQuestionConfig.css';
import FormPreview from '../components/FormPreview';
import { SystemBlockRenderer } from '../components/form-blocks/SystemBlockRenderer';

interface Question {
    _id: string;
    target: 'doctorant' | 'referent';
    section: string;
    type: string; // Changed from specific types to string to accommodate 'system'
    content: string;
    order: number;
    active: boolean;
    required?: boolean;
    helpText?: string;
    placeholder?: string;
    systemId?: string; // New field for system blocks
    visibleToReferent?: boolean;
    visibleInPdf?: boolean; // ✅ New field
}

const DEFAULT_SYSTEM_BLOCKS: Partial<Question>[] = [
    { systemId: 'identity', section: 'Personal Information', content: 'Personal Information', type: 'system', order: 0, target: 'doctorant', visibleInPdf: true },
    { systemId: 'thesis_info', section: 'Thesis Information', content: 'Thesis Information', type: 'system', order: 1, target: 'doctorant', visibleInPdf: true },
    { systemId: 'research_unit', section: 'Research Unit', content: 'Research Unit', type: 'system', order: 2, target: 'doctorant', visibleInPdf: true },
    { systemId: 'team_info', section: 'Team', content: 'Team Information', type: 'system', order: 3, target: 'doctorant', visibleInPdf: true },
    { systemId: 'csi_members', section: 'CSI Members', content: 'CSI Members', type: 'system', order: 4, target: 'doctorant', visibleInPdf: true },
    { systemId: 'scientific_activities', section: 'Scientific Activities', content: 'Scientific Activities', type: 'system', order: 5, target: 'doctorant', visibleInPdf: true },
    { systemId: 'training_modules', section: 'Training Modules', content: 'Training Modules', type: 'system', order: 6, target: 'doctorant', visibleInPdf: true },
    { systemId: 'documents_upload', section: 'Documents Upload', content: 'Documents Upload', type: 'system', order: 999, target: 'doctorant', visibleInPdf: true },
    { systemId: 'conclusion_recommendations', section: 'Conclusion & Recommendations', content: 'Conclusion & Recommendations', type: 'system', order: 999, target: 'referent', visibleInPdf: true },
];

// Helper for interactive preview in Admin (so fields are not disabled)
const InteractiveSystemPreview: React.FC<{ systemId: string }> = ({ systemId }) => {
    const [data, setData] = useState<any>({});
    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setData((prev: any) => ({ ...prev, [name]: value }));
    };
    return (
        <SystemBlockRenderer
            systemId={systemId}
            data={data}
            onChange={handleChange}
            readOnly={false} // Enable typing
        />
    );
};

// Helper to auto-assign section to descriptions based on context


const AdminQuestionConfig: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [target, setTarget] = useState<'doctorant' | 'referent'>('doctorant'); // Changed initial target
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null); // New state for DnD

    // Initial state for new question
    const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
        target: 'doctorant', // Changed initial target
        section: '',
        type: 'plus_minus_comment',
        content: '',
        order: 0,
        active: true,
        required: false,
        visibleToReferent: false,
        visibleInPdf: true, // ✅ Default true
        helpText: '',
        placeholder: ''
    });

    const [deletedIds, setDeletedIds] = useState<string[]>([]);

    // Fetch questions
    const fetchQuestions = async () => {
        try {
            const response = await api.get<Question[]>(`/questions?target=${target}`);
            let sorted = response.data.sort((a, b) => a.order - b.order);

            // Check for missing system blocks and auto-create (Mock Init)
            if (target === 'doctorant') {
                const hasSystem = sorted.some(q => q.systemId);
                if (!hasSystem && sorted.length > 0) {
                    // Suggest initialization
                }
            }

            setQuestions(sorted);
            // Reset unsaved changes when pulling fresh data
            setUnsavedChanges(false);
            setDeletedIds([]);
        } catch (error) {
            console.error('Error fetching questions:', error);
        }
    };

    // Auto-init System Blocks
    const initializeSystemBlocks = async () => {
        if (!window.confirm("Initialize default system blocks? This will add them to the list.")) return;
        try {
            for (const block of DEFAULT_SYSTEM_BLOCKS.filter(b => b.target === target)) {
                // Check if exists locally or remotely? Remotely for init.
                await api.post('/questions', { ...block, target });
            }
            fetchQuestions();
        } catch (e) {
            console.error(e);
            alert("Error initializing blocks");
        }
    };

    useEffect(() => {
        if (unsavedChanges) {
            const confirmLeave = window.confirm("You have unsaved changes. Discard them?");
            if (!confirmLeave) return; // Logic flaw in hook, but fine for basic protection
        }
        setUnsavedChanges(false);
        setDeletedIds([]);
        fetchQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target]);

    // Warn on tab close
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (unsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [unsavedChanges]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this question?')) return;

        // Remove locally
        setQuestions(prev => prev.filter(q => q._id !== id));

        // If it's a real ID (not temp), add to deletion queue
        if (!id.startsWith('temp_')) {
            setDeletedIds(prev => [...prev, id]);
        }

        setUnsavedChanges(true);
    };

    const handleCreate = async () => {
        const tempId = `temp_${Date.now()}`;
        const newQ: Question = {
            ...newQuestion,
            target: target, // cible la target (doctorant ou referent)
            _id: tempId,
            order: questions.length + 1
        } as Question;

        setQuestions(prev => [...prev, newQ]);
        setNewQuestion({ ...newQuestion, content: '', order: questions.length + 2 });
        setUnsavedChanges(true);
    };

    const handleUpdate = async () => {
        if (!editingQuestion) return;

        setQuestions(prev => prev.map(q => q._id === editingQuestion._id ? editingQuestion : q));
        setEditingQuestion(null);
        setUnsavedChanges(true);
    };



    // 🆕 Section Editor State
    const [sectionEditor, setSectionEditor] = useState<{
        originalName: string;
        newName: string;
        descriptionId?: string; // ID if existing description block found
        descriptionContent: string;
    } | null>(null);

    const handleEditSection = (sectionName: string, sectionQuestions: Question[]) => {
        // Find if there is an existing description block at the START of this section
        // We assume the first question in the group might be a description if grouped correctly
        const firstQ = sectionQuestions[0];
        let descId : string | undefined = undefined;
        let descContent = '';

        if (firstQ.type === 'description') {
            descId = firstQ._id;
            descContent = firstQ.content;
        }

        setSectionEditor({
            originalName: sectionName,
            newName: sectionName === 'CHAPTER' ? '' : sectionName,
            descriptionId: descId,
            descriptionContent: descContent
        });
    };

    const handleSaveSectionEditor = () => {
        if (!sectionEditor) return;

        let updatedQuestions = [...questions];
        const { originalName, newName, descriptionId, descriptionContent } = sectionEditor;
        const finalName = newName.trim() || 'CHAPTER'; // Fallback if empty, though unlikely for sections

        // 1. Rename Section (for ALL questions in this section)
        // If the original name was different, update all
        if (originalName !== finalName) {
            updatedQuestions = updatedQuestions.map(q => 
                q.section === originalName ? { ...q, section: finalName } : q
            );
        }

        // 2. Handle Description
        if (descriptionContent.trim()) {
            if (descriptionId) {
                // Update existing
                updatedQuestions = updatedQuestions.map(q => 
                    q._id === descriptionId ? { ...q, content: descriptionContent, section: finalName } : q
                ); 
                // Note: section update is redundant if covered by step 1, but safe.
            } else {
                // Create New Description
                // Find the minimum order in this section to place it before
                const sectionQs = updatedQuestions.filter(q => q.section === finalName);
                const minOrder = sectionQs.length > 0 ? Math.min(...sectionQs.map(q => q.order)) : questions.length;
                
                const newDesc: Question = {
                    _id: `temp_desc_${Date.now()}`,
                    target: target,
                    section: finalName,
                    type: 'description',
                    content: descriptionContent,
                    order: minOrder - 1, // Place before first item
                    active: true,
                    visibleInPdf: true,
                    required: false
                } as Question;
                
                updatedQuestions.push(newDesc);
            }
        } else {
            // Content empty - if ID exists, user deleted the description
            if (descriptionId) {
                updatedQuestions = updatedQuestions.filter(q => q._id !== descriptionId);
                // Also add to deletedIds if it's not a temp one
                if (!descriptionId.startsWith('temp_')) {
                    setDeletedIds(prev => [...prev, descriptionId]);
                }
            }
        }

        // Re-sort questions by order to ensure visual consistency
        updatedQuestions.sort((a, b) => a.order - b.order);

        setQuestions(updatedQuestions);
        setUnsavedChanges(true);
        setSectionEditor(null);
    };

    const handleMoveQuestion = (index: number, direction: -1 | 1) => {
        if (direction === -1 && index === 0) return;
        if (direction === 1 && index === questions.length - 1) return;

        const newQuestions = [...questions];
        const temp = newQuestions[index];
        newQuestions[index] = newQuestions[index + direction];
        newQuestions[index + direction] = temp;

        // Swap orders properly if we want to persist order changes robustly
        // But simply swapping positions in array works if we blindly trust array index = order on save, 
        // OR we swap the 'order' property values.
        // Current save logic in handleSaveChanges payload uses `index + 1` for order.
        // So swapping array positions IS sufficient.

        setQuestions(newQuestions);
        setUnsavedChanges(true);
    };

    const handleAddChapterTitle = () => {
        const title = window.prompt("Enter Chapter Title:");
        if (!title) return;

        const tempId = `temp_chap_${Date.now()}`;
        const newQ: Question = {
            _id: tempId,
            target: target,
            section: "CHAPTER", 
            type: "chapter_title",
            content: title,
            order: questions.length + 1,
            active: true,
            visibleInPdf: true,
            required: false
        } as Question;

        setQuestions(prev => [...prev, newQ]);
        setUnsavedChanges(true);
    };

    const handleSaveChanges = async () => {
        try {
            // 1. Process Insertions and Updates
            await Promise.all(questions.map(async (q, index) => {
                // Construct clean payload
                const payload: any = {
                    target: q.target,
                    content: q.content,
                    section: (q.type === 'chapter_title' && (!q.section || q.section === "")) ? "CHAPTER" : q.section, // ✅ Auto-fix empty sections for chapters
                    type: q.type,
                    order: index + 1,
                    active: q.active,
                    required: !!q.required,
                    visibleToReferent: !!q.visibleToReferent,
                    visibleInPdf: !!q.visibleInPdf, // ✅ Include in payload
                };
                if (q.helpText) payload.helpText = q.helpText;
                if (q.placeholder) payload.placeholder = q.placeholder;
                if (q.systemId) payload.systemId = q.systemId;

                if (q._id.startsWith('temp_')) {
                    // CREATE
                    await api.post('/questions', payload);
                } else {
                    // UPDATE
                    await api.put(`/questions/${q._id}`, payload);
                }
            }));

            // 2. Process Deletions
            if (deletedIds.length > 0) {
                await Promise.all(deletedIds.map(id => api.delete(`/questions/${id}`)));
            }

            setUnsavedChanges(false);
            setDeletedIds([]);

            // Refresh to get real IDs back
            await fetchQuestions();

            alert("All changes saved successfully!");
        } catch (err: any) {
            console.error("Error saving changes:", err);
            const msg = err.response?.data?.message || err.message;
            alert(`Failed to save changes: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (index: number) => {
        setDraggedItemIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedItemIndex === null) return;
        if (draggedItemIndex === index) return;

        const newQuestions = [...questions];
        const draggedItem = newQuestions[draggedItemIndex];
        newQuestions.splice(draggedItemIndex, 1);
        newQuestions.splice(index, 0, draggedItem);

        setQuestions(newQuestions);
        setDraggedItemIndex(index);
        setUnsavedChanges(true);
    };

    const handleDragEnd = () => {
        setDraggedItemIndex(null);
    };

    return (
        <div className="form-token-container" style={{ paddingBottom: '100px' }}>
            {unsavedChanges && (
                <div className="unsaved-banner">
                    <span>⚠️ You have unsaved changes</span>
                    <button className="btn btn-primary" onClick={handleSaveChanges} style={{ backgroundColor: '#ffc107', color: 'black', border: 'none' }}>
                        Save Changes
                    </button>
                </div>
            )}

            <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Form Builder (CRM Mode)</h1>
                    <p>Customize the {target === 'doctorant' ? 'Doctoral Student' : 'Referent'} form structure.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn" onClick={handleAddChapterTitle} style={{ backgroundColor: '#28a745', color: 'white' }}>➕ Chapter Title</button>
                    {/* Description button removed - use Section Header Edit instead */}
                    {target === 'doctorant' && !questions.some(q => q.systemId) && (
                        <button className="btn" onClick={initializeSystemBlocks} style={{ backgroundColor: '#6f42c1', color: 'white' }}>⚡ Init System Blocks</button>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowPreview(true)}>
                        👁️ Preview Form
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <select value={target} onChange={(e) => setTarget(e.target.value as any)} className="select-input" style={{ width: 'auto', display: 'inline-block' }}>
                    <option value="doctorant">Doctorant Form</option>
                    <option value="referent">Referent Form</option>
                </select>
            </div>

            {/* PREVIEW MODAL */}
            {showPreview && (
                <FormPreview
                    questions={questions}
                    target={target}
                    onClose={() => setShowPreview(false)}
                />
            )}

            <div className="crm-builder-list">
                {questions.reduce((groups, question, index) => {
                    // Group adjacent questions by section
                    const lastGroup = groups[groups.length - 1];

                    // Logic to continue group:
                    // 1. Same section name
                    // 2. AND neither the current question NOR the last group is a 'chapter_title'
                    // (Chapter titles must always stand alone in their own group)
                    const isChapter = question.type === 'chapter_title';
                    const lastIsChapter = lastGroup && lastGroup.questions[0].type === 'chapter_title';

                    if (lastGroup && lastGroup.section === question.section && !isChapter && !lastIsChapter) {
                        lastGroup.questions.push({ ...question, originalIndex: index });
                        // If this question is a system block, ensure the group is tagged
                        if (question.systemId) lastGroup.systemId = question.systemId; 
                    } else {
                        groups.push({
                            section: question.section,
                            questions: [{ ...question, originalIndex: index }],
                            systemId: question.systemId
                        });
                    }
                    return groups;
                }, [] as { section: string, questions: (Question & { originalIndex: number })[], systemId?: string }[]).map((group, groupIndex) => {
                    const hasShared = group.questions.some(q => q.visibleToReferent);
                    return (
                        <div
                            key={group.questions[0]._id} // Stable key from first question
                            className="admin-card"
                        >
                            <div className="card-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: 600, color: group.questions[0].type === 'chapter_title' ? '#007bff' : '#2c3e50' }}>
                                        {group.questions[0].type === 'chapter_title' ? '─── CHAPTER SEPARATOR ───' : (group.section === 'CHAPTER' ? '' : (group.section || 'Uncategorized'))}
                                    </span>
                                    {/* Show Rename (Edit Section) for regular sections AND descriptions */}
                                    {group.questions[0].type !== 'chapter_title' && (
                                        <button
                                            onClick={() => handleEditSection(group.section, group.questions)}
                                            className="btn-icon"
                                            title="Edit Section Name & Description"
                                        >
                                            ✏️
                                        </button>
                                    )}
                                    {group.systemId && <span className="card-badge system">SYSTEM BLOCK</span>}
                                    {hasShared && <span title="Contains questions visible to Referent" style={{ marginLeft: '10px', fontSize: '1.2em' }}>👁️</span>}
                                </div>
                            </div>

                            {/* Questions List */}
                            <div style={{ marginTop: '10px' }}>
                                {group.questions.map((q, qIndex) => (
                                    <div key={q._id}
                                        draggable
                                        onDragStart={(e) => {
                                            e.stopPropagation();
                                            handleDragStart(q.originalIndex);
                                        }}
                                        onDragOver={(e) => {
                                            e.stopPropagation();
                                            handleDragOver(e, q.originalIndex);
                                        }}
                                        onDragEnd={handleDragEnd}
                                        style={{
                                            marginBottom: '10px',
                                            padding: '10px',
                                            backgroundColor: q.type === 'chapter_title' ? '#e3f2fd' : (draggedItemIndex === q.originalIndex ? '#f0f0f0' : '#f9f9f9'),
                                            border: q.type === 'chapter_title' ? '2px solid #007bff' : '1px solid #eee',
                                            borderRadius: '6px',
                                            position: 'relative',
                                            opacity: draggedItemIndex === q.originalIndex ? 0.5 : 1,
                                            cursor: 'grab'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                {q.type === 'chapter_title' ? (
                                                    <h3 style={{ margin: '5px 0', color: '#0056b3', textTransform: 'uppercase' }}>
                                                        {q.content}
                                                    </h3>
                                                ) : q.type === 'description' ? (
                                                    <p style={{ margin: '5px 0', color: '#555', fontStyle: 'italic', fontSize: '0.9em', whiteSpace: 'pre-wrap' }}>
                                                        ℹ️ {q.content}
                                                    </p>
                                                ) : (
                                                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1em' }}>
                                                        <span style={{ marginRight: '10px', color: '#aaa', fontSize: '0.8em' }}>#{q.order}</span>
                                                        {q.content}
                                                        {q.required && <span className="red"> *</span>}
                                                        {/* 🆕 PDF Icon (Undefined = True default) */}
                                                        {(q.visibleInPdf !== false) ? <span title="Visible in PDF" style={{ marginLeft: '8px', fontSize: '0.8em' }}>📄</span> : <span title="Not visible in PDF" style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.3 }}>🚫📄</span>}
                                                    </h4>
                                                )}

                                                {!q.systemId && q.type !== 'chapter_title' && q.type !== 'description' && (
                                                    <div className="type-indicator" style={{ fontSize: '0.8em', color: '#888' }}>
                                                        {q.type}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => handleMoveQuestion(q.originalIndex, -1)}
                                                    disabled={q.originalIndex === 0}
                                                    style={{ background: 'white', border: '1px solid #ccc', padding: '2px 5px', fontSize: '0.8em', cursor: 'pointer' }}
                                                    title="Move Up"
                                                >
                                                    ⬆️
                                                </button>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => handleMoveQuestion(q.originalIndex, 1)}
                                                    disabled={q.originalIndex === questions.length - 1}
                                                    style={{ background: 'white', border: '1px solid #ccc', padding: '2px 5px', fontSize: '0.8em', cursor: 'pointer' }}
                                                    title="Move Down"
                                                >
                                                    ⬇️
                                                </button>
                                                <button className="btn btn-sm" onClick={() => setEditingQuestion(q)} style={{ background: 'white', border: '1px solid #ccc', padding: '2px 8px', fontSize: '0.8em' }}>✏️ Edit</button>
                                                {!q.systemId && <button className="btn btn-sm" onClick={() => handleDelete(q._id)} style={{ background: '#dc3545', color: 'white', padding: '2px 8px', fontSize: '0.8em' }}>🗑</button>}
                                            </div>
                                        </div>

                                        {/* Preview of Input (Read Only) */}
                                        {q.systemId ? (
                                            <div style={{ marginTop: '10px', transform: 'scale(0.95)', transformOrigin: 'top left' }}>
                                                <InteractiveSystemPreview systemId={q.systemId} />
                                            </div>
                                        ) : (
                                            q.type !== 'chapter_title' && (
                                                <div className="input-group" style={{ marginTop: '5px', pointerEvents: 'none', opacity: 0.6 }}>
                                                    {q.type === 'text' && <input type="text" className="select-input" placeholder={q.placeholder || "Text input"} style={{ padding: '5px' }} />}
                                                    {q.type === 'scale_1_5' && <div style={{ padding: '5px', background: '#eee', fontSize: '0.8em' }}>Scale 1-5</div>}
                                                    {q.type === 'rating_comment' && <div style={{ padding: '5px', background: '#eee', fontSize: '0.8em' }}>Rating (1-5) + Comment</div>}
                                                    {q.type === 'plus_minus_comment' && <div style={{ padding: '5px', background: '#eee', fontSize: '0.8em' }}>+/- with Comment</div>}
                                                    {q.type === 'select' && <div style={{ padding: '5px', background: '#eee', fontSize: '0.8em' }}>Yes/No Select</div>}
                                                </div>
                                            )
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* EDIT QUESTION MODAL */}
                            {
                                editingQuestion && (
                                    <div className="modal-overlay">
                                        <div className="modal-content">
                                            <h2>Edit {editingQuestion.systemId ? 'System Block' : 'Question'}</h2>

                                            {editingQuestion.type !== 'chapter_title' && editingQuestion.type !== 'description' && (
                                                <div className="form-group">
                                                    <label>Section Header</label>
                                                    <input
                                                        type="text"
                                                        className="select-input"
                                                        value={editingQuestion.section}
                                                        onChange={e => setEditingQuestion({ ...editingQuestion, section: e.target.value })}
                                                    />
                                                </div>
                                            )}

                                            <div className="form-group">
                                                <label>Label / Title</label>
                                                <textarea
                                                    className="comment-box"
                                                    value={editingQuestion.content}
                                                    onChange={e => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                                                />
                                            </div>

                                            {(!editingQuestion.systemId && editingQuestion.type !== 'chapter_title' && editingQuestion.type !== 'description') && (
                                                <>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                        <div className="form-group">
                                                            <label>Type</label>
                                                            <select
                                                                className="select-input"
                                                                value={editingQuestion.type}
                                                                onChange={e => setEditingQuestion({ ...editingQuestion, type: e.target.value as any })}
                                                            >
                                                                <option value="plus_minus_comment">+/- with Comment</option>
                                                                <option value="scale_1_5">Scale 1-5</option>
                                                                <option value="rating_comment">Rating (1-5) + Comment</option>
                                                                <option value="select">Yes/No Select</option>
                                                                <option value="text">Text Input</option>
                                                            </select>
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Status</label>
                                                            <select
                                                                className="select-input"
                                                                value={editingQuestion.active ? 'true' : 'false'}
                                                                onChange={e => setEditingQuestion({ ...editingQuestion, active: e.target.value === 'true' })}
                                                            >
                                                                <option value="true">Active</option>
                                                                <option value="false">Inactive</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                        <div className="form-group">
                                                            <label>Help Text</label>
                                                            <input
                                                                type="text"
                                                                className="select-input"
                                                                value={editingQuestion.helpText || ''}
                                                                onChange={e => setEditingQuestion({ ...editingQuestion, helpText: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Placeholder</label>
                                                            <input
                                                                type="text"
                                                                className="select-input"
                                                                value={editingQuestion.placeholder || ''}
                                                                onChange={e => setEditingQuestion({ ...editingQuestion, placeholder: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="form-group">
                                                        <label>
                                                            <input
                                                                type="checkbox"
                                                                checked={editingQuestion.required || false}
                                                                onChange={e => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                                                            /> Required Field
                                                        </label>
                                                    </div>

                                                </>
                                            )}

                                            <div className="form-group">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!editingQuestion.visibleInPdf}
                                                        onChange={e => setEditingQuestion({ ...editingQuestion, visibleInPdf: e.target.checked })}
                                                    /> Show in PDF?
                                                </label>
                                            </div>

                                            <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                                <button className="btn btn-cancel" onClick={() => setEditingQuestion(null)}>Cancel</button>
                                                <button className="btn btn-primary" onClick={handleUpdate}>Save Changes</button>
                                            </div>
                                        </div >
                                    </div >
                                )}
                        </div >
                    );

                })}
            </div>

            {/* ADD NEW QUESTION FORM */}
            <div className="from-section" style={{ marginTop: '40px', borderTop: '2px solid #eee', paddingTop: '20px', paddingBottom: '30px' }}>
                <h2>➕ Add Custom Question</h2>
                <div className="form-group">
                    <label>Section</label>
                    <input
                        type="text"
                        className="select-input"
                        value={newQuestion.section}
                        onChange={e => setNewQuestion({ ...newQuestion, section: e.target.value })}
                        placeholder="e.g., Scientific Knowledge"
                    />
                </div>
                <div className="form-group">
                    <label>Question Content</label>
                    <input
                        type="text"
                        className="select-input"
                        value={newQuestion.content}
                        onChange={e => setNewQuestion({ ...newQuestion, content: e.target.value })}
                        placeholder="Question text..."
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                        <label>Type</label>
                        <select
                            className="select-input"
                            value={newQuestion.type}
                            onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value as any })}
                        >
                            <option value="plus_minus_comment">+/- with Comment</option>
                            <option value="scale_1_5">Scale 1-5</option>
                            <option value="rating_comment">Rating (1-5) + Comment</option>
                            <option value="select">Yes/No Select</option>
                            <option value="text">Text Input</option>
                            <option value="description">Description Block</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '30px' }}>
                        <label>
                            <input
                                type="checkbox"
                                checked={newQuestion.required}
                                onChange={e => setNewQuestion({ ...newQuestion, required: e.target.checked })}
                            /> Required Field
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={newQuestion.active}
                                onChange={e => setNewQuestion({ ...newQuestion, active: e.target.checked })}
                            /> Active
                        </label>
                        {target === 'doctorant' && (
                            <label>
                                <input
                                    type="checkbox"
                                    checked={newQuestion.visibleToReferent}
                                    onChange={e => setNewQuestion({ ...newQuestion, visibleToReferent: e.target.checked })}
                                /> Show to Referent?
                            </label>
                        )}
                        <label>
                            <input
                                type="checkbox"
                                checked={!!newQuestion.visibleInPdf}
                                onChange={e => setNewQuestion({ ...newQuestion, visibleInPdf: e.target.checked })}
                            /> Show in PDF?
                        </label>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                        <label>Help Text (Optional)</label>
                        <input
                            type="text"
                            className="select-input"
                            value={newQuestion.helpText || ''}
                            onChange={e => setNewQuestion({ ...newQuestion, helpText: e.target.value })}
                            placeholder="Small info text..."
                        />
                    </div>
                    <div className="form-group">
                        <label>Placeholder (Optional)</label>
                        <input
                            type="text"
                            className="select-input"
                            value={newQuestion.placeholder || ''}
                            onChange={e => setNewQuestion({ ...newQuestion, placeholder: e.target.value })}
                            placeholder="Input placeholder..."
                        />
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: '20px' }}>
                    <button className="btn btn-primary" onClick={handleCreate} style={{ width: '100%' }}>Create Question</button>
                </div>
            </div>

            {/* NEW SECTION EDITOR MODAL */}
            {sectionEditor && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: 'white', padding: '25px', borderRadius: '8px',
                        width: '500px', maxWidth: '90%', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}>
                        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Edit Section</h2>
                        
                        <div className="form-group">
                            <label style={{fontWeight: 600}}>Section Name</label>
                            <input
                                type="text"
                                className="select-input"
                                value={sectionEditor.newName}
                                onChange={(e) => setSectionEditor({...sectionEditor, newName: e.target.value})}
                                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                            />
                        </div>

                        <div className="form-group" style={{marginTop: '20px'}}>
                            <label style={{fontWeight: 600}}>Description</label>
                            <p style={{ fontSize: '0.85em', color: '#666', marginTop: '5px', marginBottom: '5px' }}>
                                This text will appear below the section header. It can be used for instructions or context.
                            </p>
                            <textarea
                                value={sectionEditor.descriptionContent}
                                onChange={(e) => setSectionEditor({...sectionEditor, descriptionContent: e.target.value})}
                                placeholder="Enter section description..."
                                style={{
                                    width: '100%', height: '100px', padding: '10px',
                                    borderRadius: '4px', border: '1px solid #ccc',
                                    fontFamily: 'inherit', fontSize: '0.95em', resize: 'vertical'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px' }}>
                            <button className="btn" onClick={() => setSectionEditor(null)}
                                style={{ backgroundColor: '#ccc', color: 'black', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSaveSectionEditor}
                                style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminQuestionConfig;
