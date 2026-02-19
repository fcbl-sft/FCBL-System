import React, { useState, useRef } from 'react';
import { Project, PPMeeting, ProductionDetail, Milestone, Approval, FileAttachment, Comment } from '../types';
import { ArrowLeft, Users, Calendar, Plus, Trash2, ClipboardList, Timer, CheckCircle, Save, X, Eye, MessageSquare, Camera, Upload, FileDown, Paperclip, FileText, Download, ExternalLink, Printer, CheckCircle2, Edit3, UserCircle, Ruler, Settings2, PlusCircle, PlusSquare, MinusSquare } from 'lucide-react';

// For PDF generation
declare var html2pdf: any;

interface PPMeetingProps {
  project: Project;
  onUpdate: (meetings: PPMeeting[]) => void;
  onBack: () => void;
}

type AttachmentTarget = {
  type: 'MEETING_INFO' | 'MEETING_PROD' | 'MEETING_MILE' | 'MEETING_APP' | 'ROW_PROD' | 'ROW_MILE' | 'ROW_APP' | 'GLOBAL_PP';
  meetingId: string;
  rowId?: string;
};

const PPMeetingComponent: React.FC<PPMeetingProps> = ({ project, onUpdate, onBack }) => {
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(project.ppMeetings?.[0]?.id || null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const [activeAttachmentTarget, setActiveAttachmentTarget] = useState<AttachmentTarget | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigUploadRef = useRef<HTMLInputElement>(null);
  const [uploadRowId, setUploadRowId] = useState<string | null>(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const meetings = project.ppMeetings || [];
  const activeMeeting = meetings.find(m => m.id === activeMeetingId);

  const handleManualSave = () => {
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('pp-preview-content');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `PPMeetingReport_${project.title}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const createNewMeeting = () => {
    const newMeeting: PPMeeting = {
      id: `PP-${Date.now()}`,
      meetingType: 'New Meeting',
      meetingDate: new Date().toISOString().split('T')[0],
      styleNumber: project.title,
      orderNumber: (project.poNumbers || []).map(p => p.number).join(', '),
      orderQuantity: 0,
      infoRemarks: '',
      infoAttachments: [],
      productionDetails: [{
        id: `pd-${Date.now()}`,
        knittingStartDate: '',
        color: 'Main Color',
        numMachines: 0,
        leadTimeDays: 0,
        productionPerDay: 0,
        remarks: '',
        attachments: []
      }],
      productionRemarks: '',
      productionAttachments: [],
      milestones: [{
        id: `ms-${Date.now()}`,
        label: 'Fabric In-house',
        date: '',
        remarks: '',
        attachments: []
      }],
      milestoneRemarks: '',
      milestoneAttachments: [],
      approvals: [{
        id: `ap-${Date.now()}`,
        name: 'Technical Manager',
        date: '',
        signatureUrl: '',
        remarks: '',
        attachments: []
      }],
      approvalRemarks: '',
      approvalAttachments: [],
      qcMeasurementTable: { groups: [], rows: [] },
      globalMasterTolerance: '1.0',
      comments: []
    };
    const updated = [...meetings, newMeeting];
    onUpdate(updated);
    setActiveMeetingId(newMeeting.id);
  };

  const updateMeetingField = (id: string, field: keyof PPMeeting, value: any) => {
    const updated = meetings.map(m => m.id === id ? { ...m, [field]: value } : m);
    onUpdate(updated);
  };

  const deleteMeeting = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Permanently delete this Pre-Production meeting record?")) {
      const updated = meetings.filter(m => m.id !== id);
      onUpdate(updated);
      if (activeMeetingId === id) setActiveMeetingId(updated[0]?.id || null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeAttachmentTarget) {
      const fileUrl = URL.createObjectURL(file);
      const newAttachment: FileAttachment = {
        id: `att-${Date.now()}`,
        fileName: file.name,
        fileUrl: fileUrl,
        uploadDate: new Date().toISOString()
      };

      const updatedMeetings = meetings.map(m => {
        if (m.id === activeAttachmentTarget.meetingId) {
          switch (activeAttachmentTarget.type) {
            case 'GLOBAL_PP':
              return { ...m, infoAttachments: [...(m.infoAttachments || []), newAttachment] };
            case 'MEETING_INFO':
              return { ...m, infoAttachments: [...(m.infoAttachments || []), newAttachment] };
            case 'MEETING_PROD':
              return { ...m, productionAttachments: [...(m.productionAttachments || []), newAttachment] };
            case 'MEETING_MILE':
              return { ...m, milestoneAttachments: [...(m.milestoneAttachments || []), newAttachment] };
            case 'MEETING_APP':
              return { ...m, approvalAttachments: [...(m.approvalAttachments || []), newAttachment] };
            case 'ROW_PROD':
              return { ...m, productionDetails: m.productionDetails.map(pd => pd.id === activeAttachmentTarget.rowId ? { ...pd, attachments: [...(pd.attachments || []), newAttachment] } : pd) };
            case 'ROW_MILE':
              return { ...m, milestones: m.milestones.map(ms => ms.id === activeAttachmentTarget.rowId ? { ...ms, attachments: [...(ms.attachments || []), newAttachment] } : ms) };
            case 'ROW_APP':
              return { ...m, approvals: m.approvals.map(ap => ap.id === activeAttachmentTarget.rowId ? { ...ap, attachments: [...(ap.attachments || []), newAttachment] } : ap) };
            default:
              return m;
          }
        }
        return m;
      });

      onUpdate(updatedMeetings);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteAttachment = (target: AttachmentTarget, attId: string) => {
    const updatedMeetings = meetings.map(m => {
      if (m.id === target.meetingId) {
        switch (target.type) {
          case 'GLOBAL_PP':
          case 'MEETING_INFO':
            return { ...m, infoAttachments: m.infoAttachments.filter(a => a.id !== attId) };
          case 'MEETING_PROD':
            return { ...m, productionAttachments: m.productionAttachments.filter(a => a.id !== attId) };
          case 'MEETING_MILE':
            return { ...m, milestoneAttachments: m.milestoneAttachments.filter(a => a.id !== attId) };
          case 'MEETING_APP':
            return { ...m, approvalAttachments: m.approvalAttachments.filter(a => a.id !== attId) };
          case 'ROW_PROD':
            return { ...m, productionDetails: m.productionDetails.map(pd => pd.id === target.rowId ? { ...pd, attachments: pd.attachments.filter(a => a.id !== attId) } : pd) };
          case 'ROW_MILE':
            return { ...m, milestones: m.milestones.map(ms => ms.id === target.rowId ? { ...ms, attachments: ms.attachments.filter(a => a.id !== attId) } : ms) };
          case 'ROW_APP':
            return { ...m, approvals: m.approvals.map(ap => ap.id === target.rowId ? { ...ap, attachments: ap.attachments.filter(a => a.id !== attId) } : ap) };
          default:
            return m;
        }
      }
      return m;
    });
    onUpdate(updatedMeetings);
  };

  const getAttachmentsForTarget = (target: AttachmentTarget): FileAttachment[] => {
    const m = meetings.find(m => m.id === target.meetingId);
    if (!m) return [];
    switch (target.type) {
      case 'GLOBAL_PP':
      case 'MEETING_INFO': return m.infoAttachments || [];
      case 'MEETING_PROD': return m.productionAttachments || [];
      case 'MEETING_MILE': return m.milestoneAttachments || [];
      case 'MEETING_APP': return m.approvalAttachments || [];
      case 'ROW_PROD': return m.productionDetails.find(pd => pd.id === target.rowId)?.attachments || [];
      case 'ROW_MILE': return m.milestones.find(ms => ms.id === target.rowId)?.attachments || [];
      case 'ROW_APP': return m.approvals.find(ap => ap.id === target.rowId)?.attachments || [];
      default: return [];
    }
  };

  const addComment = () => {
    if (!commentText.trim() || !activeMeetingId) return;
    const m = meetings.find(meeting => meeting.id === activeMeetingId);
    if (!m) return;

    const newComment: Comment = {
      id: `comm-${Date.now()}`,
      author: 'Factory Team',
      role: 'viewer',
      text: commentText,
      timestamp: new Date().toISOString()
    };

    const updatedComments = [...(m.comments || []), newComment];
    updateMeetingField(activeMeetingId, 'comments', updatedComments);
    setCommentText('');
  };

  const deleteComment = (commentId: string) => {
    if (!activeMeetingId || !confirm("Delete this comment?")) return;
    const m = meetings.find(meeting => meeting.id === activeMeetingId);
    if (!m) return;
    const updated = (m.comments || []).filter(c => c.id !== commentId);
    updateMeetingField(activeMeetingId, 'comments', updated);
  };

  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setCommentText(comment.text);
  };

  const saveEditedComment = () => {
    if (!activeMeetingId || !editingCommentId) return;
    const m = meetings.find(meeting => meeting.id === activeMeetingId);
    if (!m) return;
    const updated = (m.comments || []).map(c => c.id === editingCommentId ? { ...c, text: commentText, timestamp: new Date().toISOString() } : c);
    updateMeetingField(activeMeetingId, 'comments', updated);
    setEditingCommentId(null);
    setCommentText('');
  };

  const addToList = (id: string, listField: 'productionDetails' | 'milestones' | 'approvals', defaultItem: any) => {
    const meeting = meetings.find(m => m.id === id);
    if (!meeting) return;
    const updatedList = [...(meeting[listField] as any[]), { ...defaultItem, id: `${listField.slice(0, 2)}-${Date.now()}`, attachments: [] }];
    updateMeetingField(id, listField, updatedList);
  };

  const removeFromList = (id: string, listField: 'productionDetails' | 'milestones' | 'approvals', itemId: string) => {
    const meeting = meetings.find(m => m.id === id);
    if (!meeting) return;
    const updatedList = (meeting[listField] as any[]).filter(item => item.id !== itemId);
    updateMeetingField(id, listField, updatedList);
  };

  const updateListItem = (meetingId: string, listField: 'productionDetails' | 'milestones' | 'approvals', itemId: string, field: string, value: any) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    const updatedList = (meeting[listField] as any[]).map(item => item.id === itemId ? { ...item, [field]: value } : item);
    updateMeetingField(meetingId, listField, updatedList);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadRowId && activeMeetingId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        updateListItem(activeMeetingId, 'approvals', uploadRowId, 'signatureUrl', base64);
        setUploadRowId(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper for tolerance highlighting - returns true if out of tolerance (red)
  const checkTolerance = (actual: string, standard: string, tolPlus: string, tolMinus: string) => {
    const act = parseFloat(actual);
    const std = parseFloat(standard);
    const tp = (tolPlus !== '' && !isNaN(parseFloat(tolPlus))) ? parseFloat(tolPlus) : (parseFloat(activeMeeting?.globalMasterTolerance || '1.0') || 1.0);
    const tm = (tolMinus !== '' && !isNaN(parseFloat(tolMinus))) ? parseFloat(tolMinus) : (parseFloat(activeMeeting?.globalMasterTolerance || '1.0') || 1.0);
    if (isNaN(act) || isNaN(std)) return false;
    const diff = act - std;
    return diff > tp || diff < -tm;
  };

  const labelClass = "text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1 pl-1";
  const inputClass = "w-full border border-gray-200 text-sm p-2.5 bg-[#DFEDF7] focus:bg-white transition-all focus:ring-2 focus:ring-black/20 focus:border-black outline-none font-bold";
  const tableInputClass = "w-full bg-[#DFEDF7] border-none focus:bg-white p-2 text-xs outline-none font-bold text-slate-900 transition-all";
  const remarkClass = "w-full border border-gray-100 p-3 text-xs bg-[#DFEDF7] focus:bg-white transition-all min-h-[80px] resize-none outline-none font-medium";

  return (
    <div className="flex flex-col h-screen bg-gray-50 print:bg-white">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm shrink-0 z-30 no-print">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 hover:bg-gray-100 transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-black text-xl text-gray-800 tracking-tight">Pre-Production Meeting (PP)</h1>
            <div className="text-[10px] font-black uppercase text-black tracking-widest">
              Style: {project.title} | POs: {(project.poNumbers || []).map(p => p.number).join(', ')}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {activeMeeting && (
            <button onClick={() => setShowPreview(true)} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 text-xs font-black hover:bg-gray-50 shadow-sm transition-all">
              <Eye className="w-4 h-4" /> Preview Report
            </button>
          )}
          <button onClick={createNewMeeting} className="flex items-center gap-2 bg-black text-white px-4 py-2.5 text-xs font-black hover:bg-gray-800 shadow-md">
            <Plus className="w-4 h-4" /> Add New Record
          </button>
          <button onClick={handleManualSave} className="flex items-center gap-2 bg-black text-white px-6 py-2.5 text-xs font-black hover:bg-gray-800 shadow-md transition-all">
            <Save className="w-4 h-4" /> Save Work
          </button>
        </div>
      </header>

      {showSaveToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-600 text-white px-8 py-4 shadow-2xl font-black uppercase tracking-widest text-xs z-[100] animate-bounce flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" /> Saved Successfully
        </div>
      )}

      <div className="flex-grow flex overflow-hidden print:overflow-visible">
        {/* SIDEBAR */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 no-print">
          <div className="p-4 border-b border-gray-100 font-black text-[10px] text-gray-400 uppercase tracking-widest bg-gray-50 flex justify-between items-center">
            Meeting History
            <button onClick={createNewMeeting} className="p-1 hover:bg-indigo-100 text-indigo-600 rounded transition-all"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex-grow overflow-y-auto">
            {meetings.map(m => (
              <div
                key={m.id}
                onClick={() => setActiveMeetingId(m.id)}
                className={`p-4 border-l-4 cursor-pointer transition-all flex justify-between items-center group ${activeMeetingId === m.id ? 'bg-indigo-50 border-l-indigo-600 shadow-inner' : 'border-l-transparent hover:bg-gray-50'}`}
              >
                <div className="flex-grow overflow-hidden">
                  <div className={`text-sm font-black truncate ${activeMeetingId === m.id ? 'text-indigo-700' : 'text-gray-700'}`}>{m.meetingType}</div>
                  <div className="text-[10px] text-gray-400 font-bold">{m.meetingDate}</div>
                </div>
                <button
                  onClick={(e) => deleteMeeting(m.id, e)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {meetings.length === 0 && (
              <div className="p-10 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-relaxed">No meeting records yet. Click '+' to start.</div>
            )}
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-8 bg-gray-100/30 print:p-0 print:bg-white">
          {activeMeeting ? (
            <div className="w-full space-y-10 pb-32">

              {/* MEETING INFORMATION */}
              <div className="bg-white p-8 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 text-black shadow-sm"><ClipboardList className="w-5 h-5" /></div>
                    <h3 className="text-sm font-black uppercase text-gray-800 tracking-widest">Meeting Information</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className={labelClass}>Meeting Type</label>
                    <input className={inputClass} value={activeMeeting.meetingType} onChange={e => updateMeetingField(activeMeeting.id, 'meetingType', e.target.value)} placeholder="e.g. Size Set Review" />
                  </div>
                  <div>
                    <label className={labelClass}>Meeting Date</label>
                    <input type="date" className={inputClass} value={activeMeeting.meetingDate} onChange={e => updateMeetingField(activeMeeting.id, 'meetingDate', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Order Quantity (Pcs)</label>
                  <input type="number" className={inputClass} value={activeMeeting.orderQuantity || ''} onChange={e => updateMeetingField(activeMeeting.id, 'orderQuantity', parseInt(e.target.value) || 0)} />
                </div>
              </div>

              {/* PRODUCTION DETAILS */}
              <div className="bg-white p-8 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 text-black shadow-sm"><Timer className="w-5 h-5" /></div>
                    <h3 className="text-sm font-black uppercase text-gray-800 tracking-widest">Production Planning</h3>
                  </div>
                  <button onClick={() => addToList(activeMeeting.id, 'productionDetails', { knittingStartDate: '', color: '', numMachines: 0, leadTimeDays: 0, productionPerDay: 0, remarks: '', attachments: [] })} className="p-2 bg-black text-white hover:bg-gray-800 shadow-md transition-all"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="space-y-6">
                  {activeMeeting.productionDetails.map((pd) => (
                    <div key={pd.id} className="p-6 bg-gray-50/50 border border-gray-100 group/row relative">
                      <button onClick={() => removeFromList(activeMeeting.id, 'productionDetails', pd.id)} className="absolute -top-2 -right-2 p-1.5 bg-white border border-gray-200 text-red-400 hover:text-red-600 shadow-sm opacity-0 group-hover/row:opacity-100 transition-all"><X className="w-4 h-4" /></button>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div><label className={labelClass}>Start Date</label><input type="date" className={inputClass} value={pd.knittingStartDate} onChange={e => updateListItem(activeMeeting.id, 'productionDetails', pd.id, 'knittingStartDate', e.target.value)} /></div>
                        <div><label className={labelClass}>Color Way</label><input className={inputClass} value={pd.color} onChange={e => updateListItem(activeMeeting.id, 'productionDetails', pd.id, 'color', e.target.value)} /></div>
                        <div><label className={labelClass}>Target Output (Daily)</label><input type="number" className={inputClass} value={pd.productionPerDay || ''} onChange={e => updateListItem(activeMeeting.id, 'productionDetails', pd.id, 'productionPerDay', parseFloat(e.target.value) || 0)} /></div>
                      </div>
                      <div className="mt-4">
                        <label className={labelClass}>Capacity Note</label>
                        <textarea className={remarkClass} value={pd.remarks} onChange={e => updateListItem(activeMeeting.id, 'productionDetails', pd.id, 'remarks', e.target.value)} placeholder="Notes on machinery or line allocation..."></textarea>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MILESTONES */}
              <div className="bg-white p-8 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 text-black shadow-sm"><Calendar className="w-5 h-5" /></div>
                    <h3 className="text-sm font-black uppercase text-gray-800 tracking-widest">Key Milestones</h3>
                  </div>
                  <button onClick={() => addToList(activeMeeting.id, 'milestones', { label: '', date: '', remarks: '', attachments: [] })} className="p-2 bg-black text-white hover:bg-gray-800 shadow-md transition-all"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  {activeMeeting.milestones.map((ms) => (
                    <div key={ms.id} className="flex gap-4 items-end bg-gray-50/50 p-4 border border-gray-100 group/ms">
                      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className={labelClass}>Milestone Name</label><input className={inputClass} value={ms.label} onChange={e => updateListItem(activeMeeting.id, 'milestones', ms.id, 'label', e.target.value)} /></div>
                        <div><label className={labelClass}>Target Date</label><input type="date" className={inputClass} value={ms.date} onChange={e => updateListItem(activeMeeting.id, 'milestones', ms.id, 'date', e.target.value)} /></div>
                      </div>
                      <button onClick={() => removeFromList(activeMeeting.id, 'milestones', ms.id)} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-white transition-all border border-transparent hover:border-red-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* APPROVALS */}
              <div className="bg-white p-8 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 text-black shadow-sm"><CheckCircle className="w-5 h-5" /></div>
                    <h3 className="text-sm font-black uppercase text-gray-800 tracking-widest">Official Approvals</h3>
                  </div>
                  <button onClick={() => addToList(activeMeeting.id, 'approvals', { name: '', date: '', signatureUrl: '', remarks: '', attachments: [] })} className="p-2 bg-black text-white hover:bg-gray-800 shadow-md transition-all"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {activeMeeting.approvals.map((ap) => (
                    <div key={ap.id} className="p-6 bg-slate-50/50 border border-slate-100 relative group/ap">
                      <button onClick={() => removeFromList(activeMeeting.id, 'approvals', ap.id)} className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover/ap:opacity-100 transition-all"><X className="w-4 h-4" /></button>
                      <div className="space-y-4">
                        <div><label className={labelClass}>Full Name / Title</label><input className={inputClass} value={ap.name} onChange={e => updateListItem(activeMeeting.id, 'approvals', ap.id, 'name', e.target.value)} /></div>
                        <div><label className={labelClass}>Approval Date</label><input type="date" className={inputClass} value={ap.date} onChange={e => updateListItem(activeMeeting.id, 'approvals', ap.id, 'date', e.target.value)} /></div>
                        <div>
                          <label className={labelClass}>Electronic Seal / Sign</label>
                          <div className="mt-2 border-2 border-dashed border-slate-200 h-32 flex items-center justify-center bg-white overflow-hidden relative group/sig cursor-pointer" onClick={() => { setUploadRowId(ap.id); sigUploadRef.current?.click(); }}>
                            {ap.signatureUrl ? (
                              <img src={ap.signatureUrl} className="h-full w-full object-contain p-2" alt="Signature" />
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-slate-400">
                                <Camera className="w-8 h-8" />
                                <span className="text-[10px] font-black uppercase tracking-tighter">Click to Upload Signature</span>
                              </div>
                            )}
                            {ap.signatureUrl && <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/sig:opacity-100 flex items-center justify-center transition-all text-white text-[10px] font-black uppercase tracking-widest">Update Signature</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MEASUREMENT ANALYSIS SECTION */}
              <div className="bg-white p-8 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 text-black shadow-sm"><Ruler className="w-5 h-5" /></div>
                    <h3 className="text-sm font-black uppercase text-gray-800 tracking-widest">Measurement Analysis</h3>
                  </div>
                </div>

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
                      value={activeMeeting.globalMasterTolerance || '1.0'}
                      onChange={e => updateMeetingField(activeMeeting.id, 'globalMasterTolerance', e.target.value)}
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
                      const currentTable = activeMeeting.qcMeasurementTable || { groups: [], rows: [] };
                      const newGroup = { id: gid, size: size, colorCols: [{ id: `c-${Date.now()}`, color: 'Standard' }] };
                      updateMeetingField(activeMeeting.id, 'qcMeasurementTable', {
                        ...currentTable,
                        groups: [...currentTable.groups, newGroup],
                        rows: currentTable.rows.map((r: any) => ({
                          ...r,
                          groups: { ...r.groups, [gid]: { id: gid, size: size, actualValue: '', subColumns: [{ id: `sc-${Date.now()}`, color: 'Standard', standardValue: '' }] } }
                        }))
                      });
                    }} className="bg-black text-white px-5 py-2.5 text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all hover:bg-gray-800"><PlusCircle className="w-4 h-4" /> Add Size</button>
                    <button onClick={() => {
                      const name = prompt("Enter Point of Measurement:");
                      if (!name) return;
                      const rid = `r-${Date.now()}`;
                      const currentTable = activeMeeting.qcMeasurementTable || { groups: [], rows: [] };
                      const rowGroups: any = {};
                      currentTable.groups.forEach((g: any) => {
                        rowGroups[g.id] = { id: g.id, size: g.size, actualValue: '', subColumns: g.colorCols.map((c: any) => ({ id: `sc-${Date.now()}-${c.id}`, color: c.color, standardValue: '' })) };
                      });
                      updateMeetingField(activeMeeting.id, 'qcMeasurementTable', { ...currentTable, rows: [...currentTable.rows, { id: rid, point: (currentTable.rows.length + 1).toString(), name, tolerancePlus: activeMeeting.globalMasterTolerance || '1.0', toleranceMinus: activeMeeting.globalMasterTolerance || '1.0', groups: rowGroups, remarks: '' }] });
                    }} className="bg-gray-700 text-white px-5 py-2.5 text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all hover:bg-gray-800"><Plus className="w-4 h-4" /> Add Measurement Point</button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-100 border-b-2 border-slate-200">
                      <tr className="border-b border-slate-200">
                        <th rowSpan={2} className="p-4 text-left text-[9px] font-black uppercase text-slate-500 tracking-widest min-w-[200px]">Point of Measurement</th>
                        <th colSpan={2} className="p-2 text-center text-[9px] font-black uppercase text-slate-500 tracking-widest border-l border-slate-200">Tolerance</th>
                        {(activeMeeting.qcMeasurementTable?.groups || []).map((g: any) => (
                          <th key={g.id} colSpan={(g.colorCols?.length || 0) + 1} className="p-2 text-center border-l border-slate-200">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <span className="text-[11px] font-black uppercase text-indigo-600 tracking-widest">{g.size}</span>
                              <button
                                onClick={() => {
                                  const colorName = prompt("Enter Color Name (e.g. Navy, Red):", "New Color");
                                  if (!colorName) return;
                                  const cid = `c-${Date.now()}`;
                                  const currentTable = activeMeeting.qcMeasurementTable;
                                  const updatedGroups = currentTable.groups.map((gg: any) => gg.id === g.id ? { ...gg, colorCols: [...gg.colorCols, { id: cid, color: colorName }] } : gg);
                                  const updatedRows = currentTable.rows.map((row: any) => ({
                                    ...row,
                                    groups: {
                                      ...row.groups,
                                      [g.id]: {
                                        ...row.groups[g.id],
                                        subColumns: [...row.groups[g.id].subColumns, { id: `sc-${Date.now()}`, color: colorName, standardValue: '' }]
                                      }
                                    }
                                  }));
                                  updateMeetingField(activeMeeting.id, 'qcMeasurementTable', { groups: updatedGroups, rows: updatedRows });
                                }}
                                className="p-1 bg-white text-indigo-400 rounded-lg border border-indigo-100 hover:text-indigo-600 hover:shadow-sm transition-all"
                              ><PlusSquare className="w-3 h-3" /></button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete size group ${g.size} and all its data?`)) {
                                    const currentTable = activeMeeting.qcMeasurementTable;
                                    updateMeetingField(activeMeeting.id, 'qcMeasurementTable', {
                                      groups: currentTable.groups.filter((gg: any) => gg.id !== g.id),
                                      rows: currentTable.rows.map((row: any) => {
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
                        {(activeMeeting.qcMeasurementTable?.groups || []).map((g: any) => (
                          <React.Fragment key={g.id}>
                            {(g.colorCols || []).map((c: any) => (
                              <th key={c.id} className="p-2 text-center text-[8px] font-black uppercase text-slate-400 tracking-widest border-l border-slate-200">
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex items-center gap-1">
                                    <span className="truncate max-w-[50px]">{c.color}</span>
                                    <button
                                      onClick={() => {
                                        if ((g.colorCols || []).length <= 1) return;
                                        const currentTable = activeMeeting.qcMeasurementTable;
                                        const updatedGroups = currentTable.groups.map((gg: any) => gg.id === g.id ? { ...gg, colorCols: gg.colorCols.filter((col: any) => col.id !== c.id) } : gg);
                                        const updatedRows = currentTable.rows.map((row: any) => ({
                                          ...row,
                                          groups: {
                                            ...row.groups,
                                            [g.id]: {
                                              ...row.groups[g.id],
                                              subColumns: row.groups[g.id].subColumns.filter((_: any, idx: number) => idx !== g.colorCols.findIndex((col: any) => col.id === c.id))
                                            }
                                          }
                                        }));
                                        updateMeetingField(activeMeeting.id, 'qcMeasurementTable', { groups: updatedGroups, rows: updatedRows });
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
                      {(activeMeeting.qcMeasurementTable?.rows || []).map((row: any) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2"><input className={tableInputClass} value={row.name} onChange={e => {
                            const currentTable = activeMeeting.qcMeasurementTable;
                            updateMeetingField(activeMeeting.id, 'qcMeasurementTable', { ...currentTable, rows: currentTable.rows.map((r: any) => r.id === row.id ? { ...r, name: e.target.value } : r) });
                          }} /></td>
                          <td className="p-2 border-l border-slate-100"><input className={`${tableInputClass} text-center font-bold text-slate-500`} value={row.tolerancePlus} onChange={e => {
                            const currentTable = activeMeeting.qcMeasurementTable;
                            updateMeetingField(activeMeeting.id, 'qcMeasurementTable', { ...currentTable, rows: currentTable.rows.map((r: any) => r.id === row.id ? { ...r, tolerancePlus: e.target.value } : r) });
                          }} placeholder="(+)" /></td>
                          <td className="p-2 border-l border-slate-100"><input className={`${tableInputClass} text-center font-bold text-slate-500`} value={row.toleranceMinus} onChange={e => {
                            const currentTable = activeMeeting.qcMeasurementTable;
                            updateMeetingField(activeMeeting.id, 'qcMeasurementTable', { ...currentTable, rows: currentTable.rows.map((r: any) => r.id === row.id ? { ...r, toleranceMinus: e.target.value } : r) });
                          }} placeholder="(-)" /></td>
                          {(activeMeeting.qcMeasurementTable?.groups || []).map((g: any) => {
                            const rowGroup = row.groups?.[g.id] || { subColumns: [], actualValue: '' };
                            return (
                              <React.Fragment key={g.id}>
                                {(rowGroup.subColumns || []).map((sc: any, idx: number) => {
                                  const isOut = checkTolerance(rowGroup.actualValue, sc.standardValue, row.tolerancePlus, row.toleranceMinus);
                                  return (
                                    <td key={sc.id} className="p-2 border-l border-slate-100 transition-colors">
                                      <input className={`${tableInputClass} text-center font-black ${isOut ? 'text-red-600' : 'text-slate-400'}`} value={sc.standardValue} onChange={e => {
                                        const currentTable = activeMeeting.qcMeasurementTable;
                                        updateMeetingField(activeMeeting.id, 'qcMeasurementTable', { ...currentTable, rows: currentTable.rows.map((r: any) => r.id === row.id ? { ...r, groups: { ...r.groups, [g.id]: { ...r.groups[g.id], subColumns: r.groups[g.id].subColumns.map((scc: any, sidx: number) => sidx === idx ? { ...scc, standardValue: e.target.value } : scc) } } } : r) });
                                      }} placeholder="Std" />
                                    </td>
                                  );
                                })}
                                <td className="p-2 border-l border-slate-100 bg-indigo-50/30">
                                  <input className={`${tableInputClass} text-center font-black text-indigo-700 bg-transparent`} value={rowGroup.actualValue} onChange={e => {
                                    const currentTable = activeMeeting.qcMeasurementTable;
                                    updateMeetingField(activeMeeting.id, 'qcMeasurementTable', { ...currentTable, rows: currentTable.rows.map((r: any) => r.id === row.id ? { ...r, groups: { ...r.groups, [g.id]: { ...r.groups[g.id], actualValue: e.target.value } } } : r) });
                                  }} placeholder="-" />
                                </td>
                              </React.Fragment>
                            );
                          })}
                          <td className="p-2 text-center border-l border-slate-100"><button onClick={() => {
                            const currentTable = activeMeeting.qcMeasurementTable;
                            updateMeetingField(activeMeeting.id, 'qcMeasurementTable', { ...currentTable, rows: currentTable.rows.filter((r: any) => r.id !== row.id) });
                          }} className="text-slate-300 hover:text-red-500 p-1.5"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(activeMeeting.qcMeasurementTable?.rows?.length === 0 || !activeMeeting.qcMeasurementTable?.rows) && (
                  <div className="text-center py-10 text-slate-300 font-bold text-xs uppercase tracking-widest">
                    No measurement points added yet. Click "Add Size" then "Add Measurement Point" to start.
                  </div>
                )}

                {/* Measurement Remarks Section */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Measurement Notes / Observations</label>
                  </div>
                  <textarea
                    className={remarkClass}
                    value={activeMeeting.productionRemarks || ''}
                    onChange={e => updateMeetingField(activeMeeting.id, 'productionRemarks', e.target.value)}
                    placeholder="Enter any measurement-related notes, observations, or discrepancies..."
                  ></textarea>
                </div>
              </div>


              <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl text-white">
                <div className="flex items-center gap-3 mb-6">
                  <MessageSquare className="w-6 h-6 text-indigo-400" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Meeting Summary & Action Points</h3>
                </div>
                <textarea
                  className="w-full bg-slate-800 border-none rounded-2xl p-6 text-sm text-slate-200 font-medium min-h-[150px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={activeMeeting.infoRemarks}
                  onChange={e => updateMeetingField(activeMeeting.id, 'infoRemarks', e.target.value)}
                  placeholder="List out critical decisions, agreed quality standards, and person-in-charge for action items..."
                ></textarea>
              </div>

              {/* NEW: TECHNICAL COMMENTS & ATTACHMENTS SYSTEM */}
              <div className="mt-12 pt-10 border-t-2 border-slate-200 no-print">
                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 mb-8 flex items-center gap-3">
                  <span className="w-8 h-8 bg-black text-white rounded flex items-center justify-center text-xs">TP</span>
                  Technical Documentation & Feedback
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* COMMENTS PANEL */}
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-500" /> Remarks Log
                      </h4>
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{(activeMeeting.comments || []).length} Records</span>
                    </div>

                    <div className="flex-grow overflow-y-auto space-y-4 mb-6 pr-2">
                      {(activeMeeting.comments || []).map((c) => (
                        <div key={c.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl relative group">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <UserCircle className="w-4 h-4 text-slate-400" />
                              <span className="text-[10px] font-black uppercase text-slate-700">{c.author}</span>
                              <span className="text-[9px] text-slate-400 font-bold">{new Date(c.timestamp).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditComment(c)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteComment(c.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                          <p className="text-xs font-medium text-slate-600 leading-relaxed">{c.text}</p>
                        </div>
                      ))}
                      {(activeMeeting.comments || []).length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 italic">
                          <MessageSquare className="w-8 h-8 opacity-20" />
                          <p className="text-xs font-bold">No remarks yet</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto">
                      <textarea
                        className="w-full bg-[#DFEDF7] border border-slate-200 rounded-2xl p-4 text-xs font-bold focus:bg-white outline-none mb-3 resize-none h-24"
                        placeholder="Add a new technical remark..."
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                      />
                      <button
                        onClick={editingCommentId ? saveEditedComment : addComment}
                        className="w-full bg-black text-white py-3 font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                      >
                        {editingCommentId ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {editingCommentId ? 'Update Remark' : 'Post Remark'}
                      </button>
                    </div>
                  </div>

                  {/* ATTACHMENTS PANEL */}
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-indigo-500" /> Reference Files
                      </h4>
                      <button
                        onClick={() => {
                          if (activeMeetingId) {
                            setActiveAttachmentTarget({ type: 'GLOBAL_PP', meetingId: activeMeetingId });
                            fileInputRef.current?.click();
                          }
                        }}
                        className="p-2 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                      {(activeMeeting.infoAttachments || []).map((att) => (
                        <div key={att.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-white rounded-xl text-indigo-500 shadow-sm"><FileText className="w-5 h-5" /></div>
                            <div className="truncate">
                              <p className="text-xs font-black text-slate-800 truncate">{att.fileName}</p>
                              <p className="text-[9px] font-bold text-slate-400">{new Date(att.uploadDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => window.open(att.fileUrl)} className="p-2 text-indigo-600 hover:bg-white rounded-xl transition-all" title="Preview"><ExternalLink className="w-4 h-4" /></button>
                            <a href={att.fileUrl} download={att.fileName} className="p-2 text-emerald-600 hover:bg-white rounded-xl transition-all" title="Download"><Download className="w-4 h-4" /></a>
                            <button onClick={() => {
                              if (activeMeetingId) {
                                deleteAttachment({ type: 'GLOBAL_PP', meetingId: activeMeetingId }, att.id);
                              }
                            }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                      {(activeMeeting.infoAttachments || []).length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 italic">
                          <Paperclip className="w-8 h-8 opacity-20" />
                          <p className="text-xs font-bold">No files uploaded</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <p className="text-[9px] font-black uppercase text-indigo-400 tracking-tighter mb-2">Technical Note</p>
                      <p className="text-[10px] font-bold text-indigo-900 leading-relaxed italic">Upload size sets photos, trim cards, or signed lab dips for permanent record.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-6 opacity-30 text-slate-400">
              <ClipboardList className="w-24 h-24 stroke-[1]" />
              <div className="text-center">
                <h2 className="text-2xl font-black uppercase tracking-widest">Technical Meeting Log</h2>
                <p className="text-sm font-bold mt-2">Select a meeting from history or create a new entry</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
      <input type="file" ref={sigUploadRef} className="hidden" accept="image/*" onChange={handleSignatureUpload} />

      {/* ATTACHMENT MODAL */}
      {activeAttachmentTarget && activeAttachmentTarget.type !== 'GLOBAL_PP' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm no-print">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-700">Meeting Attachments</h3>
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
                    <button onClick={() => deleteAttachment(activeAttachmentTarget, att.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {getAttachmentsForTarget(activeAttachmentTarget).length === 0 && (
                <div className="text-center py-10 text-gray-300 font-bold text-xs uppercase tracking-widest italic">No files attached to this row.</div>
              )}
            </div>
            <div className="p-6 bg-white border-t">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" /> Upload Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreview && activeMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/70 backdrop-blur-md print:relative print:p-0 print:bg-white print:z-0">
          <div className="bg-white w-full max-w-6xl max-h-[95vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col print:max-w-none print:max-h-none print:shadow-none">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50 no-print">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Users className="w-6 h-6" /></div>
                <h2 className="font-black text-2xl uppercase tracking-tighter">PP Meeting Summary Report</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all">
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all">
                  <FileDown className="w-4 h-4" /> Download PDF
                </button>
                <button onClick={() => setShowPreview(false)} className="p-3 hover:bg-gray-200 rounded-2xl transition-all">
                  <X className="w-8 h-8 text-gray-400" />
                </button>
              </div>
            </div>

            <div id="pp-preview-content" className="p-12 overflow-y-auto bg-white flex-grow font-sans space-y-12 print:overflow-visible print:p-4">
              <div className="border-b-4 border-black pb-8 mb-10 flex justify-between items-end">
                <div>
                  <h1 className="text-5xl font-black tracking-tighter text-gray-900 leading-none mb-2">{activeMeeting.meetingType.toUpperCase()}</h1>
                  <p className="text-sm font-bold text-indigo-600 uppercase tracking-[0.2em]">{project.title} • POs: {(project.poNumbers || []).map(p => p.number).join(', ')}</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meeting Date</div>
                  <div className="text-2xl font-black">{activeMeeting.meetingDate}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Production Table */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest border-l-4 border-indigo-600 pl-3">Production Planning</h3>
                  <table className="w-full border-collapse border-2 border-black">
                    <thead className="bg-black text-white">
                      <tr>
                        <th className="p-2 text-left text-[9px] font-black uppercase">Color/Version</th>
                        <th className="p-2 text-center text-[9px] font-black uppercase">Start</th>
                        <th className="p-2 text-center text-[9px] font-black uppercase">Qty/Day</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {activeMeeting.productionDetails.map(pd => (
                        <tr key={pd.id} className="text-[11px] font-bold">
                          <td className="p-2 border-r border-black bg-gray-50">{pd.color}</td>
                          <td className="p-2 text-center border-r border-black">{pd.knittingStartDate || '-'}</td>
                          <td className="p-2 text-center">{pd.productionPerDay} pcs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Milestone Table */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest border-l-4 border-black pl-3">Critical Timeline</h3>
                  <div className="space-y-2">
                    {activeMeeting.milestones.map(ms => (
                      <div key={ms.id} className="flex justify-between items-center p-3 border-b-2 border-slate-100">
                        <span className="text-[11px] font-black uppercase text-slate-600">{ms.label}</span>
                        <span className="text-[11px] font-black text-indigo-600">{ms.date || 'TBC'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Points */}
              <div className="bg-slate-50 border-2 border-black p-8">
                <h3 className="text-xs font-black uppercase tracking-widest mb-4">Minutes & Action Items</h3>
                <div className="text-[12px] leading-relaxed whitespace-pre-wrap font-medium">
                  {activeMeeting.infoRemarks || "No meeting minutes recorded."}
                </div>
              </div>

              {/* Approvals */}
              <div className="grid grid-cols-2 gap-8 pt-10">
                {activeMeeting.approvals.map(ap => (
                  <div key={ap.id} className="border-t-2 border-black pt-4">
                    <div className="h-24 mb-4 flex items-center justify-center">
                      {ap.signatureUrl && <img src={ap.signatureUrl} className="max-h-full object-contain" alt="Seal" />}
                    </div>
                    <div className="text-center">
                      <div className="text-[11px] font-black uppercase">{ap.name}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{ap.date || 'UNSPECIFIED DATE'}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* MEASUREMENT ANALYSIS */}
              {activeMeeting.qcMeasurementTable?.rows?.length > 0 && (
                <div className="space-y-4 pt-10 border-t-2 border-black">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest border-l-4 border-indigo-600 pl-3">Measurement Analysis</h3>
                    <div className="text-[9px] font-black text-slate-400 uppercase">
                      Global Tolerance: ±{activeMeeting.globalMasterTolerance || '1.0'} CM
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border-2 border-black text-[10px]">
                      <thead className="bg-black text-white">
                        <tr>
                          <th className="p-2 text-left font-black uppercase border-r border-white/30">Point of Measurement</th>
                          <th className="p-2 text-center font-black uppercase border-r border-white/30">Tol (+)</th>
                          <th className="p-2 text-center font-black uppercase border-r border-white/30">Tol (-)</th>
                          {(activeMeeting.qcMeasurementTable?.groups || []).map((g: any) => (
                            <React.Fragment key={g.id}>
                              {(g.colorCols || []).map((c: any) => (
                                <th key={c.id} className="p-2 text-center font-black uppercase border-r border-white/30">
                                  {g.size} / {c.color}
                                </th>
                              ))}
                              <th className="p-2 text-center font-black uppercase border-r border-white/30 bg-indigo-700">
                                {g.size} Actual
                              </th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {(activeMeeting.qcMeasurementTable?.rows || []).map((row: any) => (
                          <tr key={row.id}>
                            <td className="p-2 border-r border-black font-bold bg-gray-50">{row.name}</td>
                            <td className="p-2 text-center border-r border-black">{row.tolerancePlus || '-'}</td>
                            <td className="p-2 text-center border-r border-black">{row.toleranceMinus || '-'}</td>
                            {(activeMeeting.qcMeasurementTable?.groups || []).map((g: any) => {
                              const rowGroup = row.groups?.[g.id] || { subColumns: [], actualValue: '' };
                              return (
                                <React.Fragment key={g.id}>
                                  {(rowGroup.subColumns || []).map((sc: any) => {
                                    const isOut = checkTolerance(rowGroup.actualValue, sc.standardValue, row.tolerancePlus, row.toleranceMinus);
                                    return (
                                      <td key={sc.id} className={`p-2 text-center border-r border-black ${isOut ? 'bg-red-100 text-red-700 font-black' : ''}`}>
                                        {sc.standardValue || '-'}
                                      </td>
                                    );
                                  })}
                                  <td className={`p-2 text-center border-r border-black font-black bg-indigo-50 ${(rowGroup.subColumns || []).some((sc: any) => checkTolerance(rowGroup.actualValue, sc.standardValue, row.tolerancePlus, row.toleranceMinus))
                                    ? 'text-red-600' : 'text-indigo-700'
                                    }`}>
                                    {rowGroup.actualValue || '-'}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {activeMeeting.productionRemarks && (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded">
                      <div className="text-[9px] font-black uppercase text-slate-400 mb-2">Measurement Notes</div>
                      <div className="text-[11px] leading-relaxed">{activeMeeting.productionRemarks}</div>
                    </div>
                  )}
                </div>
              )}

              {/* TECHNICAL DOCUMENTATION & FEEDBACK */}
              {((activeMeeting.comments?.length || 0) > 0 || (activeMeeting.infoAttachments?.length || 0) > 0) && (
                <div className="space-y-6 pt-10 border-t-2 border-black">
                  <h3 className="text-xs font-black uppercase tracking-widest border-l-4 border-indigo-600 pl-3">Technical Documentation & Feedback</h3>

                  {/* Comments */}
                  {(activeMeeting.comments?.length || 0) > 0 && (
                    <div className="space-y-3">
                      <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Remarks Log ({activeMeeting.comments?.length || 0} entries)</div>
                      {(activeMeeting.comments || []).map((c) => (
                        <div key={c.id} className="p-4 bg-slate-50 border border-slate-200 rounded">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase text-slate-700">{c.author}</span>
                            <span className="text-[9px] font-bold text-slate-400">{new Date(c.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-600">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attachments */}
                  {(activeMeeting.infoAttachments?.length || 0) > 0 && (
                    <div className="space-y-3">
                      <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Reference Files ({activeMeeting.infoAttachments?.length || 0} files)</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {(activeMeeting.infoAttachments || []).map((att) => {
                          const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.fileName);
                          return (
                            <div key={att.id} className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center gap-3">
                              {isImage ? (
                                <img src={att.fileUrl} className="w-12 h-12 object-cover rounded" alt={att.fileName} />
                              ) : (
                                <div className="w-12 h-12 bg-indigo-100 rounded flex items-center justify-center">
                                  <FileText className="w-6 h-6 text-indigo-600" />
                                </div>
                              )}
                              <div className="flex-grow overflow-hidden">
                                <p className="text-[10px] font-black text-slate-800 truncate">{att.fileName}</p>
                                <p className="text-[8px] font-bold text-slate-400">{new Date(att.uploadDate).toLocaleDateString()}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PPMeetingComponent;
