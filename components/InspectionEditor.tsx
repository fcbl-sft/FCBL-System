
import React, { useState, useRef, useEffect } from 'react';
import { Project, Inspection, ShipmentGroup, ShipmentSizeRow, AttachmentItem, QCDefectRow, QCMeasurementRow, SectionComment, PackingBoxDetail, FileAttachment, WorkflowFields, createDefaultWorkflow } from '../types';
import { ArrowLeft, Eye, Edit, CheckCircle, Plus, Ruler, ClipboardList, Box, Factory, BarChart3, Trash2, Camera, Upload, Download, Package, CheckSquare, MessageSquare, FileText, X, PlusCircle, LayoutPanelTop, CheckSquare2, FileDown, PlusSquare, MinusSquare, Paperclip, ExternalLink, Settings2, Save, Printer } from 'lucide-react';
import InspectionReportTemplate from './InspectionReportTemplate';
import { SIZES } from '../constants';
import { useAuth } from '../src/context/AuthContext';
import ApprovalControls from './ApprovalControls';
import StatusBadge from './StatusBadge';

// For PDF generation
declare var html2pdf: any;

interface InspectionEditorProps {
    project: Project;
    inspection: Inspection;
    onUpdate: (updatedInspection: Inspection) => void;
    onBack: () => void;
    onSave: () => void;
    onDeleteInspection: (id: string) => void;
}

const SECTIONS = [
    { id: 'generalInfo', label: 'General Information', icon: ClipboardList },
    { id: 'orderDetails', label: 'Order Details', icon: Box },
    { id: 'factoryInfo', label: 'Factory Information', icon: Factory },
    { id: 'shipment', label: 'Quantities & Cartons', icon: Package },
    { id: 'sampling', label: 'Sampling Data', icon: BarChart3 },
    { id: 'attachments', label: 'Attachments & Checklist', icon: FileText },
    { id: 'qcDefects', label: 'Quality Control (QC)', icon: CheckSquare },
    { id: 'judgement', label: 'Judgement & Results', icon: CheckCircle },
    { id: 'measurements', label: 'Measurement Analysis', icon: Ruler },
    { id: 'images', label: 'Inspection Images', icon: Camera },
    { id: 'packing', label: 'Packing List / Lista de Empaque', icon: LayoutPanelTop }
];

type InspectionAttachmentTarget = {
    type: 'CHECKLIST' | 'SECTION_COMMENT';
    targetId: string;
    sectionId?: string;
};

const InspectionEditor: React.FC<InspectionEditorProps> = ({ project, inspection, onUpdate, onBack, onSave, onDeleteInspection }) => {
    const { userRole, user, profile } = useAuth();
    const workflow = inspection.workflow || createDefaultWorkflow();
    const isLocked = workflow.status === 'SUBMITTED' || workflow.status === 'APPROVED';

    const handleWorkflowChange = (wf: WorkflowFields) => {
        onUpdate({ ...inspection, workflow: wf });
    };

    const [viewMode, setViewMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');
    const [isAddingStage, setIsAddingStage] = useState(false);
    const [newStageName, setNewStageName] = useState('');
    const [showSaveToast, setShowSaveToast] = useState(false);

    const [activeAttachmentTarget, setActiveAttachmentTarget] = useState<InspectionAttachmentTarget | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const data = inspection.data;

    // Helper for tolerance highlighting in editor - strictly considers both (+) and (-)
    const checkTolerance = (actual: string, standard: string, tolPlus: string, tolMinus: string) => {
        const act = parseFloat(actual);
        const std = parseFloat(standard);

        // Improved parsing to handle '0' correctly as a valid tolerance instead of falling back
        const tp = (tolPlus !== '' && !isNaN(parseFloat(tolPlus))) ? parseFloat(tolPlus) : (parseFloat(data.globalMasterTolerance) || 0);
        const tm = (tolMinus !== '' && !isNaN(parseFloat(tolMinus))) ? parseFloat(tolMinus) : (parseFloat(data.globalMasterTolerance) || 0);

        if (isNaN(act) || isNaN(std)) return false;
        const diff = act - std;

        // Returns true (triggering red) if diff exceeds positive tolerance OR is below negative tolerance
        return diff > tp || diff < -tm;
    };

    const handleManualSave = () => {
        onSave();
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 3000);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = () => {
        const element = document.getElementById('report-content');
        if (!element) return;
        const opt = {
            margin: 10,
            filename: `InspectionReport_${inspection.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    // Judgement Auto-Update Logic
    useEffect(() => {
        if (isLocked) return;
        const totals = data.qcDefects.reduce((acc, curr) => ({
            critical: acc.critical + (curr.critical || 0),
            major: acc.major + (curr.major || 0),
            minor: acc.minor + (curr.minor || 0)
        }), { critical: 0, major: 0, minor: 0 });

        const isOverCritical = totals.critical > (data.qcSummary.criticalMaxAllowed || 0);
        const isOverMajor = totals.major > (data.qcSummary.maxAllowed || 0);
        const isOverMinor = totals.minor > (data.qcSummary.minorMaxAllowed || 0);

        const newResult = (isOverCritical || isOverMajor || isOverMinor) ? 'REJECTED' : 'ACCEPTED';

        if (newResult !== data.overallResult) {
            updateField('overallResult', newResult);
        }
    }, [data.qcDefects, data.qcSummary]);

    // Auto-populate Measurement Data from PP Meeting (one-way sync)
    useEffect(() => {
        if (isLocked) return;
        // Only auto-populate if QC Inspect measurement table is empty
        const hasExistingData = data.qcMeasurementTable?.rows?.length > 0;
        if (hasExistingData) return;

        // Find latest PP Meeting with measurement data
        const ppMeetings = project.ppMeetings || [];
        const latestMeetingWithData = ppMeetings.slice().reverse().find(
            m => m.qcMeasurementTable?.rows?.length > 0
        );

        if (latestMeetingWithData?.qcMeasurementTable) {
            // Deep clone the measurement table from PP Meeting
            const clonedTable = JSON.parse(JSON.stringify(latestMeetingWithData.qcMeasurementTable));
            onUpdate({
                ...inspection,
                data: {
                    ...data,
                    qcMeasurementTable: clonedTable,
                    globalMasterTolerance: latestMeetingWithData.globalMasterTolerance || data.globalMasterTolerance
                }
            });
        }
    }, [project.ppMeetings]);

    const updateField = (field: keyof typeof data, value: any) => {
        if (isLocked) return;
        onUpdate({ ...inspection, data: { ...data, [field]: value } });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && activeAttachmentTarget) {
            const fileUrl = URL.createObjectURL(file);
            const newAttachment: FileAttachment = {
                id: `qcatt-${Date.now()}`,
                fileName: file.name,
                fileUrl: fileUrl,
                uploadDate: new Date().toISOString()
            };

            if (activeAttachmentTarget.type === 'CHECKLIST') {
                const updated = data.attachments.map(att => att.id === activeAttachmentTarget.targetId ? { ...att, available: true, attachments: [...(att.attachments || []), newAttachment] } : att);
                updateField('attachments', updated);
            } else if (activeAttachmentTarget.type === 'SECTION_COMMENT' && activeAttachmentTarget.sectionId) {
                const sid = activeAttachmentTarget.sectionId;
                const updatedComments = (data.sectionComments[sid] || []).map(c => c.id === activeAttachmentTarget.targetId ? { ...c, attachments: [...(c.attachments || []), newAttachment] } : c);
                updateField('sectionComments', { ...data.sectionComments, [sid]: updatedComments });
            }

            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const deleteAttachment = (target: InspectionAttachmentTarget, attId: string) => {
        if (target.type === 'CHECKLIST') {
            const updated = data.attachments.map(att => att.id === target.targetId ? { ...att, attachments: att.attachments.filter(a => a.id !== attId), available: (att.attachments.length > 1) } : att);
            updateField('attachments', updated);
        } else if (target.type === 'SECTION_COMMENT' && target.sectionId) {
            const sid = target.sectionId;
            const updatedComments = (data.sectionComments[sid] || []).map(c => c.id === target.targetId ? { ...c, attachments: c.attachments.filter(a => a.id !== attId) } : c);
            updateField('sectionComments', { ...data.sectionComments, [sid]: updatedComments });
        }
    };

    const getAttachmentsForTarget = (target: InspectionAttachmentTarget): FileAttachment[] => {
        if (target.type === 'CHECKLIST') {
            return data.attachments.find(a => a.id === target.targetId)?.attachments || [];
        } else if (target.type === 'SECTION_COMMENT' && target.sectionId) {
            return data.sectionComments[target.sectionId]?.find(c => c.id === target.targetId)?.attachments || [];
        }
        return [];
    };

    const addComment = (sectionId: string) => {
        const comments = data.sectionComments[sectionId] || [];
        const newComments = [...comments, { id: Date.now().toString(), text: '', attachments: [] }];
        updateField('sectionComments', { ...data.sectionComments, [sectionId]: newComments });
    };

    const updateComment = (sectionId: string, commentId: string, text: string) => {
        const comments = data.sectionComments[sectionId] || [];
        const newComments = comments.map(c => c.id === commentId ? { ...c, text } : c);
        updateField('sectionComments', { ...data.sectionComments, [sectionId]: newComments });
    };

    const handleAddNewStage = () => {
        const name = newStageName.trim();
        if (!name) return;

        // Clone all data from the current phase to satisfy "copying all information from previous phase"
        const baseData = JSON.parse(JSON.stringify(inspection.data));

        // We set result to PENDING for the new phase so user can review the copied data
        baseData.overallResult = 'PENDING';
        baseData.inspectionType = name;
        baseData.inspectionDate = new Date().toISOString().split('T')[0];

        const newInspection: Inspection = {
            id: `INS-${Date.now()}`,
            projectId: project.id,
            type: name,
            status: 'DRAFT',
            data: baseData
        };

        // App.tsx's handleUpdateInspection will detect the new ID and append it while switching view
        onUpdate(newInspection);
        setIsAddingStage(false);
        setNewStageName('');
    };

    const defectTotals = data.qcDefects.reduce((acc, curr) => ({
        critical: acc.critical + (curr.critical || 0),
        major: acc.major + (curr.major || 0),
        minor: acc.minor + (curr.minor || 0)
    }), { critical: 0, major: 0, minor: 0 });

    const labelClass = "text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-1.5 pl-1";
    const commonInput = "w-full border border-slate-300 text-sm p-3 bg-[#DFEDF7] focus:bg-white transition-all focus:ring-2 focus:ring-black/20 focus:border-black outline-none text-slate-900 font-bold placeholder:text-slate-500 shadow-sm";
    const tableInputClass = "w-full bg-[#DFEDF7] border-none focus:bg-white p-2 text-xs outline-none font-bold text-slate-900 transition-all";

    const renderSectionHeader = (sectionId: string, label: string) => {
        const isVisible = data.visibleSections.includes(sectionId);
        return (
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 no-print">
                <div className="flex items-center gap-3">
                    <div className={`p-2 transition-all ${isVisible ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-gray-300'}`}>
                        {SECTIONS.find(s => s.id === sectionId)?.icon && React.createElement(SECTIONS.find(s => s.id === sectionId)!.icon, { className: "w-5 h-5" })}
                    </div>
                    <h3 className={`text-base font-black uppercase tracking-tight ${isVisible ? 'text-slate-900' : 'text-gray-300'}`}>{label}</h3>
                </div>
                <button onClick={() => updateField('visibleSections', isVisible ? data.visibleSections.filter(s => s !== sectionId) : [...data.visibleSections, sectionId])} className={`px-4 py-2 text-[10px] font-black uppercase border transition-all ${isVisible ? 'text-slate-400 border-slate-200' : 'text-black border-gray-200 bg-gray-50'}`}>
                    {isVisible ? 'Hide Section' : 'Show Section'}
                </button>
            </div>
        );
    };

    const renderComments = (sectionId: string) => {
        const comments = data.sectionComments[sectionId] || [];
        return (
            <div className="mt-8 pt-6 border-t border-gray-100 no-print">
                <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Section Remarks / Notas</label>
                    <button onClick={() => addComment(sectionId)} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-100 transition-all"><Plus className="w-3 h-3" /> Add Note</button>
                </div>
                <div className="space-y-3">
                    {comments.map(c => (
                        <div key={c.id} className="flex flex-col gap-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group">
                            <div className="flex gap-2 items-start">
                                <input className="flex-grow bg-[#DFEDF7] border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold focus:bg-white outline-none shadow-sm" value={c.text} onChange={e => updateComment(sectionId, c.id, e.target.value)} placeholder="Enter technical note..." />
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => setActiveAttachmentTarget({ type: 'SECTION_COMMENT', targetId: c.id, sectionId })} className="p-2.5 bg-white text-slate-400 hover:text-indigo-600 rounded-xl transition-all relative border border-slate-200 shadow-sm">
                                        <Paperclip className="w-4 h-4" />
                                        {c.attachments?.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[8px] rounded-full flex items-center justify-center">{c.attachments.length}</span>}
                                    </button>
                                    <button onClick={() => updateField('sectionComments', { ...data.sectionComments, [sectionId]: comments.filter(com => com.id !== c.id) })} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 print:bg-white">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm shrink-0 z-30 no-print">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2.5 hover:bg-gray-100 transition-all"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="font-black text-xl text-slate-900 tracking-tight">{inspection.type} Phase Editor</h1>
                            <StatusBadge status={workflow.status} size="sm" />
                        </div>
                        <div className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Style: {project.title} | POs: {(project.poNumbers || []).map(p => p.number).join(', ')}</div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setViewMode(viewMode === 'EDIT' ? 'PREVIEW' : 'EDIT')} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-5 py-2.5 font-black text-xs uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all">
                        {viewMode === 'EDIT' ? <Eye className="w-4 h-4" /> : <Edit className="w-4 h-4" />} {viewMode === 'EDIT' ? 'Report Preview' : 'Technical Editor'}
                    </button>
                    {!isLocked && (
                        <button onClick={handleManualSave} className="flex items-center gap-2 bg-black text-white px-5 py-2.5 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-all">
                            <Save className="w-4 h-4" /> Save Work
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-grow flex overflow-hidden">
                <div className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 no-print">
                    <div className="p-5 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest bg-slate-50 flex justify-between items-center">Phases History <button onClick={() => setIsAddingStage(true)} className="p-1.5 bg-white border border-slate-200 hover:bg-gray-100 text-slate-400 transition-all"><Plus className="w-3.5 h-3.5" /></button></div>
                    {isAddingStage && (
                        <div className="p-4 border-b border-gray-100 bg-gray-50"><input autoFocus className="w-full border border-gray-200 p-2.5 text-xs mb-3 font-bold bg-white" value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="e.g. Pre-Final Inspection" /><div className="flex gap-2"><button onClick={handleAddNewStage} className="flex-1 bg-black text-white p-2 text-[10px] font-black uppercase">Create</button><button onClick={() => setIsAddingStage(false)} className="flex-1 bg-white border border-slate-200 p-2 text-[10px] font-black uppercase">Cancel</button></div></div>
                    )}
                    <div className="flex-grow overflow-y-auto">
                        {project.inspections.map(insp => (
                            <div key={insp.id} onClick={() => onUpdate(insp)} className={`px-6 py-5 border-l-4 transition-all cursor-pointer flex justify-between items-center group ${inspection.id === insp.id ? 'bg-gray-100 border-l-black' : 'border-l-transparent hover:bg-slate-50'}`}><div><div className={`text-sm font-black tracking-tight ${inspection.id === insp.id ? 'text-black' : 'text-slate-900'}`}>{insp.type}</div><div className={`text-[10px] uppercase font-black tracking-widest mt-0.5 ${insp.status === 'SUBMITTED' ? 'text-green-600' : 'text-slate-400'}`}>{insp.status}</div></div>{project.inspections.length > 1 && <button onClick={(e) => { e.stopPropagation(); onDeleteInspection(insp.id); }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1.5"><Trash2 className="w-4 h-4" /></button>}</div>
                        ))}
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-8 bg-slate-100/30 print:p-0 print:bg-white relative">
                    <div className="w-full space-y-10 pb-32 no-print">

                        {/* 1. GENERAL INFO */}
                        <div className={`bg-white p-8 shadow-sm border border-slate-200 transition-all ${data.visibleSections.includes('generalInfo') ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                            {renderSectionHeader('generalInfo', 'General Information')}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2"><label className={labelClass}>Supplier Name</label><input className={commonInput} value={data.supplierName} onChange={e => updateField('supplierName', e.target.value)} /></div>
                                <div><label className={labelClass}>Inspection Date</label><input type="date" className={commonInput} value={data.inspectionDate} onChange={e => updateField('inspectionDate', e.target.value)} /></div>
                                <div className="lg:col-span-2"><label className={labelClass}>Facility Address</label><input className={commonInput} value={data.supplierAddress} onChange={e => updateField('supplierAddress', e.target.value)} /></div>
                                <div><label className={labelClass}>Lead Inspector</label><input className={commonInput} value={data.inspectorName} onChange={e => updateField('inspectorName', e.target.value)} /></div>
                            </div>
                            {renderComments('generalInfo')}
                        </div>

                        {/* 2. ORDER DETAILS */}
                        <div className={`bg-white p-8 shadow-sm border border-slate-200 transition-all ${data.visibleSections.includes('orderDetails') ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                            {renderSectionHeader('orderDetails', 'Order Details')}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div><label className={labelClass}>Order Number</label><input className={commonInput} value={data.orderNumber} onChange={e => updateField('orderNumber', e.target.value)} /></div>
                                <div><label className={labelClass}>Style Name</label><input className={commonInput} value={data.styleName} onChange={e => updateField('styleName', e.target.value)} /></div>
                                <div><label className={labelClass}>Ref Number</label><input className={commonInput} value={data.refNumber} onChange={e => updateField('refNumber', e.target.value)} /></div>
                                <div><label className={labelClass}>Total Qty</label><input type="number" className={commonInput} value={data.totalOrderQuantity || ''} onChange={e => updateField('totalOrderQuantity', parseInt(e.target.value) || 0)} /></div>
                                <div><label className={labelClass}>Color</label><input className={commonInput} value={data.colorName} onChange={e => updateField('colorName', e.target.value)} /></div>
                                <div><label className={labelClass}>Composition</label><input className={commonInput} value={data.composition} onChange={e => updateField('composition', e.target.value)} /></div>
                            </div>
                            {renderComments('orderDetails')}
                        </div>

                        {/* 3. FACTORY INFO */}
                        <div className={`bg-white p-8 shadow-sm border border-slate-200 transition-all ${data.visibleSections.includes('factoryInfo') ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                            {renderSectionHeader('factoryInfo', 'Factory Information')}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2"><label className={labelClass}>Factory Name</label><input className={commonInput} value={data.factoryName} onChange={e => updateField('factoryName', e.target.value)} /></div>
                                <div><label className={labelClass}>Origin Country</label><input className={commonInput} value={data.countryOfProduction} onChange={e => updateField('countryOfProduction', e.target.value)} /></div>
                            </div>
                            {renderComments('factoryInfo')}
                        </div>

                        {/* 4. SHIPMENT BREAKDOWN */}
                        <div className={`bg-white p-8 shadow-sm border border-slate-200 transition-all ${data.visibleSections.includes('shipment') ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                            {renderSectionHeader('shipment', 'Quantities & Cartons Breakdown')}
                            <div className="space-y-6">
                                {data.shipmentGroups.map(group => (
                                    <div key={group.id} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group/group">
                                        <div className="flex justify-between items-center mb-5">
                                            <div className="flex items-center gap-4">
                                                <label className="text-[10px] font-black uppercase text-indigo-600">Color Group:</label>
                                                <input className="bg-[#DFEDF7] border-none rounded px-3 py-1.5 text-xs font-bold w-40" value={group.color} onChange={e => updateField('shipmentGroups', data.shipmentGroups.map(g => g.id === group.id ? { ...g, color: e.target.value } : g))} />
                                            </div>
                                            <button onClick={() => updateField('shipmentGroups', data.shipmentGroups.filter(g => g.id !== group.id))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover/group:opacity-100 transition-all p-2"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className="p-2 text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">Size</th>
                                                    <th className="p-2 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Order Qty</th>
                                                    <th className="p-2 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Ship Qty</th>
                                                    <th className="p-2 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Cartons</th>
                                                    <th className="p-2 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {group.rows.map(row => (
                                                    <tr key={row.id}>
                                                        <td className="p-1"><input className={tableInputClass} value={row.size} onChange={e => updateField('shipmentGroups', data.shipmentGroups.map(g => g.id === group.id ? { ...g, rows: g.rows.map(r => r.id === row.id ? { ...r, size: e.target.value } : r) } : g))} /></td>
                                                        <td className="p-1"><input type="number" className={`${tableInputClass} text-center`} value={row.orderQty || ''} onChange={e => updateField('shipmentGroups', data.shipmentGroups.map(g => g.id === group.id ? { ...g, rows: g.rows.map(r => r.id === row.id ? { ...r, orderQty: parseInt(e.target.value) || 0 } : r) } : g))} /></td>
                                                        <td className="p-1"><input type="number" className={`${tableInputClass} text-center`} value={row.shipQty || ''} onChange={e => updateField('shipmentGroups', data.shipmentGroups.map(g => g.id === group.id ? { ...g, rows: g.rows.map(r => r.id === row.id ? { ...r, shipQty: parseInt(e.target.value) || 0 } : r) } : g))} /></td>
                                                        <td className="p-1"><input type="number" className={`${tableInputClass} text-center`} value={row.cartonCount || ''} onChange={e => updateField('shipmentGroups', data.shipmentGroups.map(g => g.id === group.id ? { ...g, rows: g.rows.map(r => r.id === row.id ? { ...r, cartonCount: parseInt(e.target.value) || 0 } : r) } : g))} /></td>
                                                        <td className="p-1 text-center"><button onClick={() => updateField('shipmentGroups', data.shipmentGroups.map(g => g.id === group.id ? { ...g, rows: g.rows.filter(r => r.id !== row.id) } : g))} className="text-slate-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <button onClick={() => updateField('shipmentGroups', data.shipmentGroups.map(g => g.id === group.id ? { ...g, rows: [...g.rows, { id: Date.now().toString(), size: 'M', orderQty: 0, shipQty: 0, cartonCount: 0 }] } : g))} className="mt-4 text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors flex items-center gap-1.5"><Plus className="w-3 h-3" /> Add Size Row</button>
                                    </div>
                                ))}
                                <button onClick={() => updateField('shipmentGroups', [...data.shipmentGroups, { id: Date.now().toString(), color: 'New Color', rows: [] }])} className="w-full py-4 border-2 border-dashed border-indigo-100 rounded-2xl text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center justify-center gap-2"><PlusCircle className="w-4 h-4" /> Add New Color Group</button>
                            </div>
                            {renderComments('shipment')}
                        </div>

                        {/* 5. SAMPLING DATA */}
                        <div className={`bg-white p-8 shadow-sm border border-slate-200 transition-all ${data.visibleSections.includes('sampling') ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                            {renderSectionHeader('sampling', 'Sampling Data')}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <label className={labelClass}>Measurement Sampling Qty</label>
                                    <input type="number" className={commonInput} value={data.measurementQty || ''} onChange={e => updateField('measurementQty', parseInt(e.target.value) || 0)} placeholder="e.g. 5 Pcs" />
                                </div>
                                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <label className={labelClass}>Controlled Lot Qty (AQL)</label>
                                    <input type="number" className={commonInput} value={data.controlledQty || ''} onChange={e => updateField('controlledQty', parseInt(e.target.value) || 0)} placeholder="e.g. 80 Pcs" />
                                </div>
                            </div>
                            {renderComments('sampling')}
                        </div>

                        {/* 6. ATTACHMENTS & CHECKLIST */}
                        <div className={`bg-white p-8 shadow-sm border border-slate-200 transition-all ${data.visibleSections.includes('attachments') ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                            {renderSectionHeader('attachments', 'Attachments & Checklist')}
                            <button onClick={() => updateField('attachments', [...data.attachments, { id: Date.now().toString(), label: 'New Requirement', available: false, attachments: [], checked: false }])} className="mb-8 bg-black text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all hover:bg-gray-800"><PlusCircle className="w-4 h-4" /> Add Requirement Item</button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {data.attachments.map(att => (
                                    <div key={att.id} className={`p-5 border-2 transition-all duration-300 flex flex-col gap-4 ${att.available ? 'bg-gray-50 border-gray-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => updateField('attachments', data.attachments.map(a => a.id === att.id ? { ...a, checked: !a.checked } : a))} className={`p-1.5 transition-all ${att.checked ? 'bg-green-600 text-white' : 'bg-slate-200 text-white'}`}><CheckSquare2 className="w-5 h-5" /></button>
                                                <div className="flex flex-col">
                                                    <input className="text-xs font-black uppercase text-slate-900 tracking-tight bg-[#DFEDF7] border-none rounded p-1 mb-0.5 outline-none" value={att.label} onChange={e => updateField('attachments', data.attachments.map(a => a.id === att.id ? { ...a, label: e.target.value } : a))} />
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${att.available ? 'text-black' : 'text-slate-400'}`}>{att.attachments?.length || 0} Files Attached</span>
                                                </div>
                                            </div>
                                            <button onClick={() => updateField('attachments', data.attachments.filter(a => a.id !== att.id))} className="text-slate-300 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                        <button onClick={() => setActiveAttachmentTarget({ type: 'CHECKLIST', targetId: att.id })} className="w-full flex items-center justify-center gap-2 bg-black text-white py-2.5 text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-gray-800"><Paperclip className="w-3.5 h-3.5" /> Manage Documents</button>
                                    </div>
                                ))}
                            </div>
                            {renderComments('attachments')}
                        </div>

                        {/* 7. QC DEFECTS */}
                        <div className={`bg-white p-8 shadow-sm border border-slate-200 transition-all ${data.visibleSections.includes('qcDefects') ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                            {renderSectionHeader('qcDefects', 'Quality Control (QC) Findings')}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 text-center"><label className={labelClass}>Major Max Allowed</label><input type="number" className={`${commonInput} text-center`} value={data.qcSummary.maxAllowed || ''} onChange={e => updateField('qcSummary', { ...data.qcSummary, maxAllowed: parseInt(e.target.value) || 0 })} /></div>
                                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 text-center"><label className={labelClass}>Critical Max Allowed</label><input type="number" className={`${commonInput} text-center`} value={data.qcSummary.criticalMaxAllowed || ''} onChange={e => updateField('qcSummary', { ...data.qcSummary, criticalMaxAllowed: parseInt(e.target.value) || 0 })} /></div>
                                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 text-center"><label className={labelClass}>Minor Max Allowed</label><input type="number" className={`${commonInput} text-center`} value={data.qcSummary.minorMaxAllowed || ''} onChange={e => updateField('qcSummary', { ...data.qcSummary, minorMaxAllowed: parseInt(e.target.value) || 0 })} /></div>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <table className="w-full border-collapse">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="p-4 text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">Defect Description</th>
                                            <th className="p-4 text-center text-[9px] font-black uppercase text-red-400 tracking-widest">Critical</th>
                                            <th className="p-4 text-center text-[9px] font-black uppercase text-indigo-400 tracking-widest">Major</th>
                                            <th className="p-4 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Minor</th>
                                            <th className="p-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {data.qcDefects.map(defect => (
                                            <tr key={defect.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-2"><input className={tableInputClass} value={defect.description} onChange={e => updateField('qcDefects', data.qcDefects.map(d => d.id === defect.id ? { ...d, description: e.target.value } : d))} placeholder="e.g. Broken Stitch" /></td>
                                                <td className="p-2"><input type="number" className={`${tableInputClass} text-center font-black text-red-600`} value={defect.critical || ''} onChange={e => updateField('qcDefects', data.qcDefects.map(d => d.id === defect.id ? { ...d, critical: parseInt(e.target.value) || 0 } : d))} /></td>
                                                <td className="p-2"><input type="number" className={`${tableInputClass} text-center font-black text-indigo-600`} value={defect.major || ''} onChange={e => updateField('qcDefects', data.qcDefects.map(d => d.id === defect.id ? { ...d, major: parseInt(e.target.value) || 0 } : d))} /></td>
                                                <td className="p-2"><input type="number" className={`${tableInputClass} text-center font-bold text-slate-500`} value={defect.minor || ''} onChange={e => updateField('qcDefects', data.qcDefects.map(d => d.id === defect.id ? { ...d, minor: parseInt(e.target.value) || 0 } : d))} /></td>
                                                <td className="p-2 text-center"><button onClick={() => updateField('qcDefects', data.qcDefects.filter(d => d.id !== defect.id))} className="text-slate-300 hover:text-red-500 p-1.5"><Trash2 className="w-3.5 h-3.5" /></button></td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-100 font-black border-t-2 border-slate-200">
                                            <td className="p-4 text-right text-[10px] uppercase tracking-widest">Total Defects Found:</td>
                                            <td className="p-4 text-center text-red-600 text-sm">{defectTotals.critical}</td>
                                            <td className="p-4 text-center text-indigo-600 text-sm">{defectTotals.major}</td>
                                            <td className="p-4 text-center text-slate-500 text-sm">{defectTotals.minor}</td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <button onClick={() => updateField('qcDefects', [...data.qcDefects, { id: Date.now().toString(), description: '', critical: 0, major: 0, minor: 0 }])} className="mt-6 text-[10px] font-black text-black bg-gray-100 px-6 py-3 uppercase tracking-widest shadow-lg hover:bg-gray-200 transition-all flex items-center gap-2"><Plus className="w-4 h-4" /> Add Defect Category</button>
                            {renderComments('qcDefects')}
                        </div>

                        {/* 8. JUDGEMENT & RESULTS */}
                        <div className={`bg-white p-8 shadow-sm border border-slate-200 transition-all ${data.visibleSections.includes('judgement') ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                            {renderSectionHeader('judgement', 'Judgement & Results')}
                            <div className="flex flex-col md:flex-row gap-10 items-center justify-center p-10 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                                <div className="flex flex-col items-center gap-4">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Final Status</label>
                                    <div className={`text-4xl font-black px-12 py-6 rounded-[2rem] border-4 shadow-2xl transition-all ${data.overallResult === 'ACCEPTED' ? 'bg-green-100 border-green-600 text-green-700 shadow-green-100' : data.overallResult === 'REJECTED' ? 'bg-red-100 border-red-600 text-red-700 shadow-red-100' : 'bg-orange-100 border-orange-600 text-orange-700 shadow-orange-100'}`}>
                                        {data.overallResult}
                                    </div>
                                </div>
                                <div className="flex-1 w-full max-w-lg">
                                    <label className={labelClass}>Judgement Observations</label>
                                    <textarea className="w-full h-32 bg-[#DFEDF7] border border-slate-300 rounded-3xl p-5 text-sm font-bold text-slate-900 focus:bg-white transition-all outline-none shadow-inner" value={data.judgementComments} onChange={e => updateField('judgementComments', e.target.value)} placeholder="General summary of the inspection findings and decision justification..."></textarea>
                                </div>
                            </div>
                            {renderComments('judgement')}
                        </div>

                        {/* 9. MEASUREMENT ANALYSIS */}
                        <div className={`bg-white p-8 shadow-sm border border-slate-200 transition-all ${data.visibleSections.includes('measurements') ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                            {renderSectionHeader('measurements', 'Measurement Analysis')}

                            {/* Global Master Tolerance Control */}
                            <div className="flex flex-wrap items-center justify-between gap-6 mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-black text-white shadow-lg"><Settings2 className="w-5 h-5" /></div>
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-tight leading-none mb-1">Global Master Tolerance</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Default +/- for all points</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        className="w-24 text-center py-2 bg-white border border-slate-300 text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-black/20"
                                        value={data.globalMasterTolerance || '1.0'}
                                        onChange={e => updateField('globalMasterTolerance', e.target.value)}
                                        placeholder="1.0"
                                    />
                                    <span className="text-xs font-black text-slate-400">CM</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-6">
                                <div className="flex gap-2">
                                    <button onClick={() => {
                                        const size = prompt("Enter Size (e.g. S, M, XL):", "M");
                                        if (!size) return;
                                        const gid = `g-${Date.now()}`;
                                        const newGroup = { id: gid, size: size, colorCols: [{ id: `c-${Date.now()}`, color: 'Standard' }] };
                                        updateField('qcMeasurementTable', {
                                            ...data.qcMeasurementTable,
                                            groups: [...data.qcMeasurementTable.groups, newGroup],
                                            rows: data.qcMeasurementTable.rows.map(r => ({
                                                ...r,
                                                groups: { ...r.groups, [gid]: { id: gid, size: size, actualValue: '', subColumns: [{ id: `sc-${Date.now()}`, color: 'Standard', standardValue: '' }] } }
                                            }))
                                        });
                                    }} className="bg-black text-white px-5 py-2.5 text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all hover:bg-gray-800"><PlusCircle className="w-4 h-4" /> Add Size</button>
                                    <button onClick={() => {
                                        const name = prompt("Enter Point of Measurement:");
                                        if (!name) return;
                                        const rid = `r-${Date.now()}`;
                                        const rowGroups: any = {};
                                        data.qcMeasurementTable.groups.forEach(g => {
                                            rowGroups[g.id] = { id: g.id, size: g.size, actualValue: '', subColumns: g.colorCols.map(c => ({ id: `sc-${Date.now()}-${c.id}`, color: c.color, standardValue: '' })) };
                                        });
                                        updateField('qcMeasurementTable', { ...data.qcMeasurementTable, rows: [...data.qcMeasurementTable.rows, { id: rid, point: (data.qcMeasurementTable.rows.length + 1).toString(), name, tolerancePlus: data.globalMasterTolerance || '1.0', toleranceMinus: data.globalMasterTolerance || '1.0', groups: rowGroups, remarks: '' }] });
                                    }} className="bg-gray-800 text-white px-5 py-2.5 text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all hover:bg-slate-700"><Plus className="w-4 h-4" /> Add Measurement Point</button>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                                <table className="w-full border-collapse">
                                    <thead className="bg-slate-100 border-b-2 border-slate-200">
                                        <tr className="border-b border-slate-200">
                                            <th rowSpan={2} className="p-4 text-left text-[9px] font-black uppercase text-slate-500 tracking-widest min-w-[200px]">Point of Measurement</th>
                                            <th colSpan={2} className="p-2 text-center text-[9px] font-black uppercase text-slate-500 tracking-widest border-l border-slate-200">Tolerance</th>
                                            {data.qcMeasurementTable.groups.map(g => (
                                                <th key={g.id} colSpan={g.colorCols.length + 1} className="p-2 text-center border-l border-slate-200">
                                                    <div className="flex items-center justify-center gap-2 mb-1">
                                                        <span className="text-[11px] font-black uppercase text-indigo-600 tracking-widest">{g.size}</span>
                                                        <button
                                                            onClick={() => {
                                                                const colorName = prompt("Enter Color Name (e.g. Navy, Red):", "New Color");
                                                                if (!colorName) return;
                                                                const cid = `c-${Date.now()}`;
                                                                const updatedGroups = data.qcMeasurementTable.groups.map(gg => gg.id === g.id ? { ...gg, colorCols: [...gg.colorCols, { id: cid, color: colorName }] } : gg);
                                                                const updatedRows = data.qcMeasurementTable.rows.map(row => ({
                                                                    ...row,
                                                                    groups: {
                                                                        ...row.groups,
                                                                        [g.id]: {
                                                                            ...row.groups[g.id],
                                                                            subColumns: [...row.groups[g.id].subColumns, { id: `sc-${Date.now()}`, color: colorName, standardValue: '' }]
                                                                        }
                                                                    }
                                                                }));
                                                                updateField('qcMeasurementTable', { groups: updatedGroups, rows: updatedRows });
                                                            }}
                                                            className="p-1 bg-white text-indigo-400 rounded-lg border border-indigo-100 hover:text-indigo-600 hover:shadow-sm transition-all"
                                                        ><PlusSquare className="w-3 h-3" /></button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`Delete size group ${g.size} and all its data?`)) {
                                                                    updateField('qcMeasurementTable', {
                                                                        groups: data.qcMeasurementTable.groups.filter(gg => gg.id !== g.id),
                                                                        rows: data.qcMeasurementTable.rows.map(row => {
                                                                            const newGroups = { ...row.groups };
                                                                            delete newGroups[g.id];
                                                                            return { ...row, groups: newGroups };
                                                                        })
                                                                    });
                                                                }
                                                            }}
                                                            className="p-1 bg-white text-red-300 rounded-lg border border-red-50 hover:text-red-500 transition-all"
                                                        ><Trash2 className="w-3 h-3" /></button>
                                                    </div>
                                                </th>
                                            ))}
                                            <th rowSpan={2} className="p-4 w-10"></th>
                                        </tr>
                                        <tr>
                                            <th className="p-2 text-center text-[8px] font-black uppercase text-slate-400 border-l border-slate-200">(+)</th>
                                            <th className="p-2 text-center text-[8px] font-black uppercase text-slate-400 border-l border-slate-200">(-)</th>
                                            {data.qcMeasurementTable.groups.map(g => (
                                                <React.Fragment key={g.id}>
                                                    {g.colorCols.map(c => (
                                                        <th key={c.id} className="p-2 text-center text-[8px] font-black uppercase text-slate-400 tracking-widest border-l border-slate-200">
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="truncate max-w-[50px]">{c.color}</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (g.colorCols.length <= 1) return;
                                                                            const updatedGroups = data.qcMeasurementTable.groups.map(gg => gg.id === g.id ? { ...gg, colorCols: gg.colorCols.filter(col => col.id !== c.id) } : gg);
                                                                            const updatedRows = data.qcMeasurementTable.rows.map(row => ({
                                                                                ...row,
                                                                                groups: {
                                                                                    ...row.groups,
                                                                                    [g.id]: {
                                                                                        ...row.groups[g.id],
                                                                                        subColumns: row.groups[g.id].subColumns.filter((_, idx) => idx !== g.colorCols.findIndex(col => col.id === c.id))
                                                                                    }
                                                                                }
                                                                            }));
                                                                            updateField('qcMeasurementTable', { groups: updatedGroups, rows: updatedRows });
                                                                        }}
                                                                        className="text-red-300 hover:text-red-500"
                                                                    ><MinusSquare className="w-2.5 h-2.5" /></button>
                                                                </div>
                                                                <span className="opacity-50">Standard</span>
                                                            </div>
                                                        </th>
                                                    ))}
                                                    <th className="p-2 text-center text-[8px] font-black uppercase text-indigo-500 tracking-widest border-l border-slate-200 bg-indigo-50/50">Actual</th>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.qcMeasurementTable.rows.map(row => (
                                            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-2"><input className={tableInputClass} value={row.name} onChange={e => updateField('qcMeasurementTable', { ...data.qcMeasurementTable, rows: data.qcMeasurementTable.rows.map(r => r.id === row.id ? { ...r, name: e.target.value } : r) })} /></td>
                                                <td className="p-2 border-l border-slate-100"><input className={`${tableInputClass} text-center font-bold text-slate-500`} value={row.tolerancePlus} onChange={e => updateField('qcMeasurementTable', { ...data.qcMeasurementTable, rows: data.qcMeasurementTable.rows.map(r => r.id === row.id ? { ...r, tolerancePlus: e.target.value } : r) })} placeholder="(+)" /></td>
                                                <td className="p-2 border-l border-slate-100"><input className={`${tableInputClass} text-center font-bold text-slate-500`} value={row.toleranceMinus} onChange={e => updateField('qcMeasurementTable', { ...data.qcMeasurementTable, rows: data.qcMeasurementTable.rows.map(r => r.id === row.id ? { ...r, toleranceMinus: e.target.value } : r) })} placeholder="(-)" /></td>
                                                {data.qcMeasurementTable.groups.map(g => {
                                                    const rowGroup = row.groups[g.id];
                                                    return (
                                                        <React.Fragment key={g.id}>
                                                            {rowGroup.subColumns.map((sc, idx) => {
                                                                const isOut = checkTolerance(rowGroup.actualValue, sc.standardValue, row.tolerancePlus, row.toleranceMinus);
                                                                return (
                                                                    <td key={sc.id} className={`p-2 border-l border-slate-100 transition-colors`}>
                                                                        <input className={`${tableInputClass} text-center font-black ${isOut ? 'text-red-600' : 'text-slate-400'}`} value={sc.standardValue} onChange={e => updateField('qcMeasurementTable', { ...data.qcMeasurementTable, rows: data.qcMeasurementTable.rows.map(r => r.id === row.id ? { ...r, groups: { ...r.groups, [g.id]: { ...r.groups[g.id], subColumns: r.groups[g.id].subColumns.map((scc, sidx) => sidx === idx ? { ...scc, standardValue: e.target.value } : scc) } } } : r) })} placeholder="Std" />
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="p-2 border-l border-slate-100 bg-indigo-50/30">
                                                                <input className={`${tableInputClass} text-center font-black text-indigo-700 bg-transparent`} value={rowGroup.actualValue} onChange={e => updateField('qcMeasurementTable', { ...data.qcMeasurementTable, rows: data.qcMeasurementTable.rows.map(r => r.id === row.id ? { ...r, groups: { ...r.groups, [g.id]: { ...r.groups[g.id], actualValue: e.target.value } } } : r) })} placeholder="-" />
                                                            </td>
                                                        </React.Fragment>
                                                    );
                                                })}
                                                <td className="p-2 text-center border-l border-slate-100"><button onClick={() => updateField('qcMeasurementTable', { ...data.qcMeasurementTable, rows: data.qcMeasurementTable.rows.filter(r => r.id !== row.id) })} className="text-slate-300 hover:text-red-500 p-1.5"><Trash2 className="w-3.5 h-3.5" /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {renderComments('measurements')}
                        </div>

                        {/* 10. INSPECTION IMAGES */}
                        <div className={`bg-white p-8 shadow-sm border border-slate-200 transition-all ${data.visibleSections.includes('images') ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                            {renderSectionHeader('images', 'Inspection Documentation Photos')}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {data.images.map((img, idx) => (
                                    <div key={idx} className="group relative bg-slate-50 border border-slate-100 overflow-hidden shadow-sm flex flex-col items-center">
                                        <div className="w-full h-56 overflow-hidden">
                                            <img src={img.url} alt={img.label} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" crossOrigin="anonymous" />
                                        </div>
                                        <div className="w-full p-4 bg-white border-t border-slate-50 flex gap-2">
                                            <input className="flex-1 bg-[#DFEDF7] border-none rounded-xl px-4 py-2 text-xs font-bold outline-none" value={img.label} onChange={e => updateField('images', data.images.map((im, i) => i === idx ? { ...im, label: e.target.value } : im))} />
                                            <button onClick={() => updateField('images', data.images.filter((_, i) => i !== idx))} className="p-2 bg-red-50 text-red-500 hover:bg-red-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => imageInputRef.current?.click()} className="h-56 border-4 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-black hover:bg-gray-50 hover:border-gray-300 transition-all group">
                                    <div className="p-4 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform"><Camera className="w-8 h-8" /></div>
                                    <span className="font-black text-[10px] uppercase tracking-widest">Upload Documentation Photo</span>
                                </button>
                            </div>
                            {renderComments('images')}
                        </div>

                    </div>

                    {/* PREVIEW CONTENT (Hidden until needed) - CONVERTED TO MODAL FOR FULL WINDOW STYLE */}
                    {viewMode === 'PREVIEW' && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm print:relative print:p-0 print:bg-white no-print">
                            <div className="bg-white w-full max-w-6xl max-h-[95vh] shadow-2xl overflow-hidden flex flex-col print:max-w-none print:max-h-none print:shadow-none">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gray-50/50">
                                    <h2 className="font-black text-lg uppercase tracking-tight text-slate-800">Inspection Report Preview</h2>
                                    <div className="flex gap-2">
                                        <button onClick={handlePrint} className="flex items-center gap-2 bg-black text-white px-5 py-2.5 font-black text-xs uppercase tracking-widest shadow-xl">
                                            <Printer className="w-4 h-4" /> Print Report
                                        </button>
                                        <button onClick={() => setViewMode('EDIT')} className="p-3 hover:bg-gray-200 transition-all">
                                            <X className="w-6 h-6 text-gray-400" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-12 overflow-y-auto bg-white flex-grow print:p-4 print:overflow-visible">
                                    <InspectionReportTemplate project={project} inspection={inspection} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => updateField('images', [...data.images, { url: reader.result as string, label: 'Technical Photo' }]);
                    reader.readAsDataURL(file);
                }
            }} />

            {/* SAVE TOAST */}
            {showSaveToast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-black uppercase tracking-widest text-xs z-[100] animate-bounce flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" /> Saved Successfully
                </div>
            )}

            {activeAttachmentTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm no-print">
                    <div className="bg-white w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                            <h3 className="font-black text-sm uppercase tracking-widest text-gray-700">Attachments Management</h3>
                            <button onClick={() => setActiveAttachmentTarget(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {getAttachmentsForTarget(activeAttachmentTarget).map(att => (
                                <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                                        <div className="truncate">
                                            <p className="text-xs font-bold text-gray-800 truncate">{att.fileName}</p>
                                            <p className="text-[9px] text-gray-400">{new Date(att.uploadDate).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => window.open(att.fileUrl)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"><ExternalLink className="w-4 h-4" /></button>
                                        <a href={att.fileUrl} download={att.fileName} className="p-2 text-gray-400 hover:text-green-600 hover:bg-white rounded-lg transition-all"><Download className="w-4 h-4" /></a>
                                        <button onClick={() => deleteAttachment(activeAttachmentTarget, att.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                            {getAttachmentsForTarget(activeAttachmentTarget).length === 0 && (
                                <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase tracking-widest italic opacity-50">No files uploaded yet.</div>
                            )}
                        </div>
                        <div className="p-6 bg-white border-t">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full bg-black text-white py-3 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add New File
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approval Workflow Footer */}
            <ApprovalControls
                workflow={workflow}
                onWorkflowChange={handleWorkflowChange}
                onSave={handleManualSave}
                userRole={userRole || 'viewer'}
                userName={profile?.name || user?.fullName || 'User'}
                userId={user?.id || ''}
                sectionLabel="Inspection"
            />
        </div>
    );
};

export default InspectionEditor;
