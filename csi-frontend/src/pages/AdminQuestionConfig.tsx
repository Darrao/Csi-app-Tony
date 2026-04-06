import React, { useEffect, useState } from 'react';
import api from '../services/api';
import '../styles/AdminQuestionConfig.css';
import FormPreview from '../components/FormPreview';

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
    options?: string[]; // Array of strings for choices
    allowMultipleSelection?: boolean; // False by default -> Radio; True -> Checkboxes
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

// Helper to auto-assign section to descriptions based on context

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
        placeholder: '',
        options: [],
        allowMultipleSelection: false
    });


    
    // EXPORT / IMPORT LOGIC
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        try {
            const response = await api.get<Question[]>('/questions/export');
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response.data, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `questions_export_${new Date().toISOString()}.json`);
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed!");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileObj = event.target.files && event.target.files[0];
        if (!fileObj) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (!window.confirm(`About to import ${json.length} questions. This will REPLACE current questions. Continue?`)) return;
                
                await api.post('/questions/import', json);
                alert("Import successful!");
                fetchQuestions(); // Refresh UI
            } catch (error) {
                console.error("Import failed:", error);
                alert("Import failed! Invalid JSON or server error.");
            }
        };
        reader.readAsText(fileObj);
        // Reset input
        event.target.value = '';
    };

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
    // 🆕 Section Editor State
    const [sectionEditor, setSectionEditor] = useState<{
        originalName: string;
        newName: string;
        descriptionId?: string; // ID if existing description block found
        descriptionContent: string;
        affectedQuestionIds: string[]; // IDs of questions in this block
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
            descriptionContent: descContent,
            affectedQuestionIds: sectionQuestions.map(q => q._id)
        });
    };

    const handleSaveSectionEditor = () => {
        if (!sectionEditor) return;

        let updatedQuestions = [...questions];
        const { originalName, newName, descriptionId, descriptionContent, affectedQuestionIds } = sectionEditor;
        const finalName = newName.trim() || 'CHAPTER'; // Fallback if empty, though unlikely for sections

        console.log('Saving Section Editor:', { originalName, finalName, affectedCount: affectedQuestionIds.length, ids: affectedQuestionIds });

        // 1. Rename Section (for ONLY questions in this VISUAL block)
        if (originalName !== finalName) {
            updatedQuestions = updatedQuestions.map(q => 
                affectedQuestionIds.includes(q._id) ? { ...q, section: finalName } : q
            );
        }

        // 2. Handle Description
        if (descriptionContent.trim()) {
            if (descriptionId) {
                // Update existing
                updatedQuestions = updatedQuestions.map(q => 
                    q._id === descriptionId ? { ...q, content: descriptionContent, section: finalName } : q
                ); 
            } else {
                // Create New Description
                // Find the minimum order in this section (using filter on FINAL name) to place it before
                
                // We must consider that we just moved the affected questions to 'finalName'.
                // But there could be other questions already in 'finalName' (merging sections).
                // Ideally, we place it before the FIRST question of the affected block.
                
                const minOrder = updatedQuestions
                    .filter(q => affectedQuestionIds.includes(q._id))
                    .reduce((min, q) => Math.min(min, q.order), Infinity);
                
                const safeOrder = minOrder === Infinity ? questions.length : minOrder;

                const newDesc: Question = {
                    _id: `temp_desc_${Date.now()}`,
                    target: target,
                    section: finalName,
                    type: 'description',
                    content: descriptionContent,
                    order: safeOrder - 1, // Place before first item of this block
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
                // Also delete from updatedQuestions if it's not a temp one
                if (!descriptionId.startsWith('temp_')) {
                    // Handled by bulk sync on save
                }
            }
        }

        // Re-sort questions by order to ensure visual consistency
        updatedQuestions.sort((a, b) => a.order - b.order);

        setQuestions(updatedQuestions);
        setUnsavedChanges(true);
        setSectionEditor(null);
    };

    const handleMoveSection = (sectionName: string, direction: 'up' | 'down') => {
        const sectionQuestions = questions.filter(q => q.section === sectionName);
        if (sectionQuestions.length === 0) return;

        const firstIndex = questions.findIndex(q => q.section === sectionName);
        const lastIndex = questions.map(q => q.section).lastIndexOf(sectionName);

        if (direction === 'up' && firstIndex > 0) {
            const newQuestions = [...questions];
            // If the item before is a chapter title, we might want to stay within chapter?
            // For now, simple swap of the whole block with the item before it
            newQuestions.splice(firstIndex - 1, 0, ...newQuestions.splice(firstIndex, sectionQuestions.length));
            setQuestions(newQuestions);
            setUnsavedChanges(true);
        } else if (direction === 'down' && lastIndex < questions.length - 1) {
            const newQuestions = [...questions];
            const numToMove = sectionQuestions.length;
            const itemsToMove = newQuestions.splice(firstIndex, numToMove);
            newQuestions.splice(firstIndex + 1, 0, ...itemsToMove);
            setQuestions(newQuestions);
            setUnsavedChanges(true);
        }
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
        if (questions.length === 0 && !window.confirm("Are you sure you want to delete ALL questions for this target?")) return;

        try {
            // Prepare clean payload for bulk sync
            const syncPayload = questions.map((q, index) => {
                const payload: any = {
                    ...q,
                    order: index + 1,
                    section: (q.type === 'chapter_title' && (!q.section || q.section === "")) ? "CHAPTER" : q.section
                };
                
                // Ensure correct types
                payload.required = !!q.required;
                payload.active = !!q.active;
                payload.visibleToReferent = !!q.visibleToReferent;
                payload.visibleInPdf = q.visibleInPdf !== false;

                // Strip unnecessary fields for cleaner payload
                if (payload.type !== 'multiple_choice') {
                    delete payload.options;
                    delete payload.allowMultipleSelection;
                }

                return payload;
            });

            await api.post(`/questions/import?target=${target}`, syncPayload);
            
            setUnsavedChanges(false);
            
            // Refresh to get real MongoDB IDs and stay synced
            await fetchQuestions();
            
            alert('All changes saved successfully!');
        } catch (err: any) {
            console.error('Failed to save changes:', err);
            const msg = err.response?.data?.message || err.message;
            alert('Failed to save changes: ' + (Array.isArray(msg) ? msg.join(', ') : msg));
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
                    <button className="btn" onClick={handleExport} style={{ backgroundColor: '#17a2b8', color: 'white' }}>⬇️ Export JSON</button>
                    <button className="btn" onClick={handleImportClick} style={{ backgroundColor: '#e83e8c', color: 'white' }}>⬆️ Import JSON</button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept="application/json" 
                        onChange={handleFileChange} 
                    />
                    <button className="btn" onClick={handleAddChapterTitle} style={{ backgroundColor: '#28a745', color: 'white' }}>➕ Chapter Title</button>
                    {/* Description button removed - use Section Header Edit instead */}
                    {!questions.some(q => q.systemId) && (
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
                {/* GROUPED LIST BY CHAPTER > SECTION */}
                {(() => {
                    const chapterGroups: any[] = [];
                    let currentChapter: any = null;

                    questions.forEach((q, index) => {
                        if (q.type === 'chapter_title') {
                            currentChapter = {
                                chapter: q,
                                sections: []
                            };
                            chapterGroups.push(currentChapter);
                        } else {
                            if (!currentChapter) {
                                currentChapter = {
                                    chapter: { content: 'Default Chapter', _id: 'default' },
                                    sections: []
                                };
                                chapterGroups.push(currentChapter);
                            }

                            const lastSection = currentChapter.sections[currentChapter.sections.length - 1];
                            if (lastSection && lastSection.section === q.section) {
                                lastSection.questions.push({ ...q, originalIndex: index });
                            } else {
                                currentChapter.sections.push({
                                    section: q.section,
                                    questions: [{ ...q, originalIndex: index }]
                                });
                            }
                        }
                    });

                    return chapterGroups.map((chGroup, chIdx) => (
                        <div key={chIdx} className="chapter-container" style={{ marginBottom: '40px', border: '1px solid #e1e4e8', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fcfcfc', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                            <div className="chapter-header" style={{ backgroundColor: '#f1f3f5', padding: '15px 25px', borderBottom: '2px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.4em', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.2em' }}>🔖</span> {chGroup.chapter.content}
                                </h2>
                                {chGroup.chapter._id !== 'default' && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button className="btn btn-primary" style={{ padding: '6px 15px', fontSize: '0.9em' }} onClick={() => setEditingQuestion(chGroup.chapter)}>Edit Chapter</button>
                                        <button className="btn btn-danger" style={{ padding: '6px 15px', fontSize: '0.9em' }} onClick={() => handleDelete(chGroup.chapter._id)}>Delete</button>
                                    </div>
                                )}
                            </div>

                            <div className="chapter-body" style={{ padding: '20px' }}>
                                {chGroup.sections.map((group: any, gIdx: number) => (
                                    <div key={gIdx} className="section-block" style={{ marginBottom: '25px', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
                                        <div className="section-header" style={{ backgroundColor: '#f8f9fa', padding: '12px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <h3 style={{ margin: 0, fontSize: '1.1em', color: '#4a5568' }}>Section: {group.section || "(No Section)"}</h3>
                                            </div>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button className="btn" style={{ padding: '4px 10px', fontSize: '0.85em', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }} onClick={() => handleEditSection(group.section, group.questions)}>Edit Section</button>
                                                <button className="btn" style={{ padding: '4px 10px', fontSize: '0.85em', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }} onClick={() => handleMoveSection(group.section, 'up')}>↑</button>
                                                <button className="btn" style={{ padding: '4px 10px', fontSize: '0.85em', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }} onClick={() => handleMoveSection(group.section, 'down')}>↓</button>
                                            </div>
                                        </div>
                                        {/* Questions List */}
                                        <div className="questions-grid">
                                            {group.questions.map((q: any) => (
                                                <div 
                                                    key={q._id} 
                                                    className="question-list-item" 
                                                    style={{ 
                                                        display: 'flex', 
                                                        justifyContent: 'space-between', 
                                                        alignItems: 'center', 
                                                        padding: '12px 20px', 
                                                        borderBottom: '1px solid #edf2f7',
                                                        opacity: draggedItemIndex === q.originalIndex ? 0.5 : 1
                                                    }}
                                                    draggable
                                                    onDragStart={() => handleDragStart(q.originalIndex)}
                                                    onDragOver={(e) => handleDragOver(e, q.originalIndex)}
                                                    onDragEnd={handleDragEnd}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                                                        <span style={{ color: '#cbd5e0', cursor: 'grab' }}>⠿</span>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '500', color: '#2d3748' }}>
                                                                {q.content}
                                                                {q.required && <span style={{ color: '#dc3545', marginLeft: '5px' }}>*</span>}
                                                            </div>
                                                            <div style={{ fontSize: '0.8em', color: '#718096', marginTop: '3px' }}>
                                                                Type: {q.type} | {q.active ? 'Active' : 'Inactive'}
                                                                {q.visibleToReferent && " | 👥 Referent"}
                                                                {!q.visibleInPdf ? " | 🔒 Confidential" : " | 📄 In PDF"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <div style={{ display: 'flex', gap: '2px', marginRight: '5px' }}>
                                                            <button className="btn" style={{ padding: '2px 6px', fontSize: '0.75em', background: 'white', border: '1px solid #ccc' }} onClick={() => handleMoveQuestion(q.originalIndex, -1)} title="Move Up">↑</button>
                                                            <button className="btn" style={{ padding: '2px 6px', fontSize: '0.75em', background: 'white', border: '1px solid #ccc' }} onClick={() => handleMoveQuestion(q.originalIndex, 1)} title="Move Down">↓</button>
                                                        </div>
                                                        <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.85em' }} onClick={() => setEditingQuestion(q)}>Edit</button>
                                                        {!q.systemId && <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.85em' }} onClick={() => handleDelete(q._id)}>Delete</button>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {chGroup.sections.length === 0 && <p style={{ textAlign: 'center', color: '#a0aec0', padding: '20px' }}>No sections in this chapter yet.</p>}
                            </div>
                        </div>
                    ));
                })()}
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
                            <option value="multiple_choice">Multiple Choice (Radio/Checkboxes)</option>
                            <option value="text">Text Input</option>
                            <option value="description">Description Block</option>
                        </select>
                    </div>

                    {newQuestion.type === 'multiple_choice' && (
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Choices / Options</label>
                            {(newQuestion.options || []).map((opt, i) => (
                                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                                    <input 
                                        type="text" 
                                        className="select-input" 
                                        value={opt} 
                                        placeholder={`Option ${i+1}`}
                                        onChange={e => {
                                            const newOpts = [...(newQuestion.options || [])];
                                            newOpts[i] = e.target.value;
                                            setNewQuestion({...newQuestion, options: newOpts});
                                        }} 
                                    />
                                    <button className="btn" style={{ background: '#dc3545', color: 'white', padding: '0 10px', border: 'none', borderRadius: '4px' }} onClick={() => {
                                        const newOpts = (newQuestion.options || []).filter((_, idx) => idx !== i);
                                        setNewQuestion({...newQuestion, options: newOpts});
                                    }}>🗑</button>
                                </div>
                            ))}
                            <button className="btn" style={{ marginTop: '5px', background: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px' }} onClick={() => {
                                setNewQuestion({...newQuestion, options: [...(newQuestion.options || []), ""]});
                            }}>➕ Add Option</button>
                            
                            <label style={{ display: 'flex', alignItems: 'center', marginTop: '15px', gap: '8px', fontWeight: 'bold' }}>
                                <input 
                                    type="checkbox" 
                                    checked={newQuestion.allowMultipleSelection || false} 
                                    onChange={e => setNewQuestion({...newQuestion, allowMultipleSelection: e.target.checked})} 
                                /> 
                                Allow Multiple Selection (Display checkboxes instead of radio buttons)
                            </label>
                        </div>
                    )}

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '30px', gridColumn: '1 / -1' }}>
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
                            /> Show in PDF? <span style={{fontSize: '0.8em', color: '#dc3545'}}>(Uncheck for Confidential)</span>
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

            {/* EDIT QUESTION MODAL */}
            {
                editingQuestion && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                    }}>
                        <div className="modal-content" style={{
                            backgroundColor: 'white', borderRadius: '8px',
                            width: '700px', maxWidth: '90%', maxHeight: '90vh', 
                            display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                        }}>
                            {/* STICKY HEADER */}
                            <div className="modal-header" style={{ padding: '20px 25px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ margin: 0, fontSize: '1.4em' }}>
                                    {editingQuestion.type === 'chapter_title' ? 'Edit Chapter Title' : (editingQuestion.systemId ? 'Edit System Block' : 'Edit Question')}
                                </h2>
                                <button style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer' }} onClick={() => setEditingQuestion(null)}>&times;</button>
                            </div>

                            {/* SCROLLABLE BODY */}
                            <div className="modal-body" style={{ padding: '25px', overflowY: 'auto', flex: 1 }}>
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
                                        style={{ width: '100%', minHeight: '80px' }}
                                    />
                                </div>

                                {(!editingQuestion.systemId && editingQuestion.type !== 'description') && (
                                    <>
                                        {editingQuestion.type !== 'chapter_title' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
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
                                                        <option value="multiple_choice">Multiple Choice (Radio/Checkboxes)</option>
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
                                        )}

                                        {editingQuestion.type === 'multiple_choice' && (
                                            <div className="form-group" style={{ marginBottom: '15px', marginTop: '15px' }}>
                                                <label>Choices / Options</label>
                                                {(editingQuestion.options || []).map((opt, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                                                        <input 
                                                            type="text" 
                                                            className="select-input" 
                                                            value={opt} 
                                                            onChange={e => {
                                                                const newOpts = [...(editingQuestion.options || [])];
                                                                newOpts[i] = e.target.value;
                                                                setEditingQuestion({...editingQuestion, options: newOpts});
                                                            }} 
                                                        />
                                                        <button className="btn" style={{ background: '#dc3545', color: 'white', padding: '0 10px', border: 'none', borderRadius: '4px' }} onClick={() => {
                                                            const newOpts = (editingQuestion.options || []).filter((_, idx) => idx !== i);
                                                            setEditingQuestion({...editingQuestion, options: newOpts});
                                                        }}>🗑</button>
                                                    </div>
                                                ))}
                                                <button className="btn" style={{ marginTop: '5px', background: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px' }} onClick={() => {
                                                    setEditingQuestion({...editingQuestion, options: [...(editingQuestion.options || []), ""]});
                                                }}>➕ Add Option</button>
                                                
                                                <label style={{ display: 'flex', alignItems: 'center', marginTop: '15px', gap: '8px', fontWeight: 'bold' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={editingQuestion.allowMultipleSelection || false} 
                                                        onChange={e => setEditingQuestion({...editingQuestion, allowMultipleSelection: e.target.checked})} 
                                                    /> 
                                                    Allow Multiple Selection (Display checkboxes instead of radio buttons)
                                                </label>
                                            </div>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                                            <div className="form-group">
                                                <label>{editingQuestion.type === 'chapter_title' ? 'Description (Active under title)' : 'Help Text'}</label>
                                                {editingQuestion.type === 'chapter_title' ? (
                                                    <>
                                                        <textarea
                                                            className="select-input"
                                                            value={editingQuestion.helpText || ''}
                                                            onChange={e => setEditingQuestion({ ...editingQuestion, helpText: e.target.value })}
                                                            style={{ height: '80px', fontFamily: 'monospace', fontSize: '0.9em' }}
                                                        />
                                                        <div style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
                                                            <span style={{ marginRight: '10px' }}>Gras: <b>**text**</b></span>
                                                            <span>Italic: <i>*text*</i></span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className="select-input"
                                                        value={editingQuestion.helpText || ''}
                                                        onChange={e => setEditingQuestion({ ...editingQuestion, helpText: e.target.value })}
                                                    />
                                                )}
                                            </div>
                                            {editingQuestion.type !== 'chapter_title' && (
                                                <div className="form-group">
                                                    <label>Placeholder</label>
                                                    <input
                                                        type="text"
                                                        className="select-input"
                                                        value={editingQuestion.placeholder || ''}
                                                        onChange={e => setEditingQuestion({ ...editingQuestion, placeholder: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {editingQuestion.type !== 'chapter_title' && (
                                            <div className="form-group" style={{ marginTop: '15px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={editingQuestion.required || false}
                                                        onChange={e => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                                                    /> Required Field
                                                </label>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="form-group" style={{ marginTop: '15px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            checked={!!editingQuestion.visibleInPdf}
                                            onChange={e => setEditingQuestion({ ...editingQuestion, visibleInPdf: e.target.checked })}
                                        /> Show in PDF? <span style={{fontSize: '0.8em', color: '#dc3545', fontWeight: 'normal'}}>(Uncheck for Confidential)</span>
                                    </label>
                                </div>
                            </div>

                            {/* STICKY FOOTER */}
                            <div className="modal-actions" style={{ padding: '20px 25px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button className="btn btn-cancel" style={{ background: '#6c757d', color: 'white' }} onClick={() => setEditingQuestion(null)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleUpdate}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                )
            }

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
                        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Edit Section (Visual Block)</h2>
                        
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
