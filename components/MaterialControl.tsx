import React, { useState, useRef, useMemo } from 'react';
import { Project, MaterialControlItem, MaterialAttachment, Comment, FileAttachment } from '../types';
// Fix: Added missing MessageSquare and Upload icons to the imports from lucide-react
import { ArrowLeft, Package, Trash2, Plus, Save, Eye, X, Paperclip, FileText, AlertCircle, Clock, CheckCircle2, TrendingDown, Gauge, Search, Filter, RefreshCcw, Download, ExternalLink, FileDown, Printer, CheckCircle, Edit3, UserCircle, MessageSquare, Upload } from 'lucide-react';

// For PDF generation
declare var html2pdf: any;

interface MaterialControlProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
  onUpdate: (items: MaterialControlItem[]) => void;
  onBack: () => void;
}

type FilterType = 'ALL' | 'DELAYED' | 'QUALITY_ISSUE' | 'FULFILLED' | 'PENDING';

const MaterialControl: React.FC<MaterialControlProps> = ({ project, onUpdateProject, onUpdate, onBack }) => {
  const items = project.materialControl || [];
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [showSaveToast, setshowSaveToast] = useState(false);

  const [activeAttachmentRow, setActiveAttachmentRow] = useState<string | null>(null);
  const [activeGlobalAttachment, setActiveGlobalAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const addRow = (label: string = "New Material") => {
    const newItem: MaterialControlItem = {
      id: `MQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: label,
      orderQty: 0,
      receivedQty: 0,
      totalWeight: 0,
      weightPerProduction: 0,
      deadline: '',
      receivedDate: '',
      actualQuality: '',
      receivedQuality: '',
      remark: '',
      attachments: [],
      acceptance: '',
      acceptanceDate: '',
      maturityDate: ''
    };
    onUpdate([...items, newItem]);
  };

  const updateItemField = (id: string, field: keyof MaterialControlItem, value: any) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Reset acceptanceDate if acceptance is changed from Yes
        if (field === 'acceptance' && value !== 'Yes') {
          updatedItem.acceptanceDate = '';
        }
        return updatedItem;
      }
      return item;
    });
    onUpdate(updated);
  };

  const handleSave = () => {
    setshowSaveToast(true);
    setTimeout(() => setshowSaveToast(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('mq-preview-content');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `MaterialControlReport_${project.title}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const deleteRow = (id: string) => {
    if (confirm("Remove this material tracking row?")) {
      onUpdate(items.filter(item => item.id !== id));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeAttachmentRow) {
      const fileUrl = URL.createObjectURL(file);
      const newAttachment: MaterialAttachment = {
        id: `att-${Date.now()}`,
        fileName: file.name,
        fileUrl: fileUrl,
        uploadDate: new Date().toISOString()
      };

      const updated = items.map(item => {
        if (item.id === activeAttachmentRow) {
          return { ...item, attachments: [...(item.attachments || []), newAttachment] };
        }
        return item;
      });
      onUpdate(updated);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGlobalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      const newAttachment: FileAttachment = {
        id: `globatt-${Date.now()}`,
        fileName: file.name,
        fileUrl: fileUrl,
        uploadDate: new Date().toISOString()
      };
      onUpdateProject({ materialAttachments: [...(project.materialAttachments || []), newAttachment] });
      if (globalFileInputRef.current) globalFileInputRef.current.value = '';
    }
  };

  const deleteAttachment = (rowId: string, attId: string) => {
    const updated = items.map(item => {
      if (item.id === rowId) {
        return { ...item, attachments: item.attachments.filter(a => a.id !== attId) };
      }
      return item;
    });
    onUpdate(updated);
  };

  const deleteGlobalAttachment = (attId: string) => {
    if (!confirm("Delete this document?")) return;
    const updated = (project.materialAttachments || []).filter(a => a.id !== attId);
    onUpdateProject({ materialAttachments: updated });
  };

  const addGlobalComment = () => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: `mcomm-${Date.now()}`,
      author: 'Materials Lead',
      role: 'supplier',
      text: commentText,
      timestamp: new Date().toISOString()
    };
    onUpdateProject({ materialComments: [...(project.materialComments || []), newComment] });
    setCommentText('');
  };

  const deleteGlobalComment = (id: string) => {
    if (!confirm("Delete this comment?")) return;
    const updated = (project.materialComments || []).filter(c => c.id !== id);
    onUpdateProject({ materialComments: updated });
  };

  const startEditGlobalComment = (c: Comment) => {
    setEditingCommentId(c.id);
    setCommentText(c.text);
  };

  const saveEditedGlobalComment = () => {
    if (!editingCommentId) return;
    const updated = (project.materialComments || []).map(c => c.id === editingCommentId ? { ...c, text: commentText, timestamp: new Date().toISOString() } : c);
    onUpdateProject({ materialComments: updated });
    setEditingCommentId(null);
    setCommentText('');
  };

  React.useEffect(() => {
    if (items.length === 0) {
      const defaults = ["Yarn composition", "Count", "Color", "Strength"];
      // Fixed: Added explicit type annotation to initialItems to fix literal inference issue with acceptance property
      const initialItems: MaterialControlItem[] = defaults.map(d => ({
        id: `MQ-${Date.now()}-${d.replace(/\s/g, '-')}`,
        label: d,
        orderQty: 0,
        receivedQty: 0,
        totalWeight: 0,
        weightPerProduction: 0,
        deadline: '',
        receivedDate: '',
        actualQuality: '',
        receivedQuality: '',
        remark: '',
        attachments: [],
        acceptance: '',
        acceptanceDate: '',
        maturityDate: ''
      }));
      onUpdate(initialItems);
    }
  }, []);

  const isDelayed = (recv: string, dead: string) => {
    if (!recv || !dead) return false;
    return new Date(recv) > new Date(dead);
  };

  const qualityMismatch = (actual: string, expected: string) => {
    if (!actual || !expected) return false;
    return actual.trim().toLowerCase() !== expected.trim().toLowerCase();
  };

  const stats = useMemo(() => {
    const total = items.length;
    let delayed = 0; let qualityIssues = 0;
    let fulfilled = 0;
    let pending = 0;
    let totalOrder = 0;
    let totalReceived = 0;

    items.forEach(item => {
      totalOrder += (item.orderQty || 0);
      totalReceived += (item.receivedQty || 0);

      if (isDelayed(item.receivedDate, item.deadline)) delayed++;
      if (qualityMismatch(item.actualQuality, item.receivedQuality)) qualityIssues++;

      const balance = (item.orderQty || 0) - (item.receivedQty || 0);
      if (balance <= 0 && item.orderQty > 0) fulfilled++;
      else if (item.orderQty > 0) pending++;
    });

    return { total, delayed, qualityIssues, fulfilled, pending, totalOrder, totalReceived, totalBalance: totalOrder - totalReceived };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.remark.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'ALL') return true;

      const delayed = isDelayed(item.receivedDate, item.deadline);
      const qualityIssue = qualityMismatch(item.actualQuality, item.receivedQuality);
      const balance = (item.orderQty || 0) - (item.receivedQty || 0);

      if (activeFilter === 'DELAYED') return delayed;
      if (activeFilter === 'QUALITY_ISSUE') return qualityIssue;
      if (activeFilter === 'FULFILLED') return balance <= 0 && item.orderQty > 0;
      if (activeFilter === 'PENDING') return balance > 0 && item.orderQty > 0;

      return true;
    });
  }, [items, searchTerm, activeFilter]);

  const tableHeaderClass = "p-3 text-left text-[9px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 border-b border-gray-100 whitespace-nowrap";
  const cellInputClass = "w-full bg-[#DFEDF7] border-none focus:bg-white p-2 text-[11px] outline-none transition-colors placeholder:text-gray-300 font-medium";

  return (
    <div className="flex flex-col h-screen bg-gray-50 print:bg-white">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm shrink-0 z-30 no-print">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 hover:bg-gray-100 transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-black text-xl text-gray-800 tracking-tight">Material Control (MQ)</h1>
            <div className="text-[10px] font-black uppercase text-black tracking-widest">
              Style: {project.title} | POs: {(project.poNumbers || []).map(p => p.number).join(', ')}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPreview(true)} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 text-xs font-black hover:bg-gray-50 shadow-sm transition-all">
            <Eye className="w-4 h-4" /> Preview Summary
          </button>
          <button onClick={() => addRow()} className="flex items-center gap-2 bg-black text-white px-4 py-2.5 text-xs font-black hover:bg-gray-800 shadow-md transition-all">
            <Plus className="w-4 h-4" /> Add Custom Field
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 bg-black text-white px-6 py-2.5 text-xs font-black hover:bg-gray-800 shadow-md transition-all">
            <Save className="w-4 h-4" /> Save Data
          </button>
        </div>
      </header>

      {showSaveToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-600 text-white px-8 py-4 shadow-2xl font-black uppercase tracking-widest text-xs z-[100] animate-bounce flex items-center gap-3">
          <CheckCircle className="w-5 h-5" /> Saved Successfully
        </div>
      )}

      <main className="flex-grow p-8 overflow-y-auto relative bg-gray-50/50 print:p-0 print:bg-white">
        <div className="w-full space-y-8 pb-32 no-print">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button
              onClick={() => setActiveFilter(activeFilter === 'DELAYED' ? 'ALL' : 'DELAYED')}
              className={`p-6 border transition-all flex items-center gap-5 text-left group shadow-sm ${activeFilter === 'DELAYED' ? 'bg-red-600 border-red-600 text-white ring-4 ring-red-100' : 'bg-white border-gray-100 hover:border-red-200'}`}
            >
              <div className={`p-4 group-hover:scale-110 transition-transform ${activeFilter === 'DELAYED' ? 'bg-white/20 text-white' : 'bg-red-50 text-red-500'}`}>
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'DELAYED' ? 'text-red-100' : 'text-gray-400'}`}>Delayed Shipments</div>
                <div className={`text-3xl font-black tracking-tighter ${activeFilter === 'DELAYED' ? 'text-white' : 'text-red-600'}`}>{stats.delayed}</div>
              </div>
            </button>

            <button
              onClick={() => setActiveFilter(activeFilter === 'QUALITY_ISSUE' ? 'ALL' : 'QUALITY_ISSUE')}
              className={`p-6 border transition-all flex items-center gap-5 text-left group shadow-sm ${activeFilter === 'QUALITY_ISSUE' ? 'bg-orange-600 border-orange-600 text-white ring-4 ring-orange-100' : 'bg-white border-gray-100 hover:border-orange-200'}`}
            >
              <div className={`p-4 group-hover:scale-110 transition-transform ${activeFilter === 'QUALITY_ISSUE' ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-500'}`}>
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'QUALITY_ISSUE' ? 'text-orange-100' : 'text-gray-400'}`}>Quality Alerts</div>
                <div className={`text-3xl font-black tracking-tighter ${activeFilter === 'QUALITY_ISSUE' ? 'text-white' : 'text-orange-600'}`}>{stats.qualityIssues}</div>
              </div>
            </button>

            <button
              onClick={() => setActiveFilter(activeFilter === 'FULFILLED' ? 'ALL' : 'FULFILLED')}
              className={`p-6 border transition-all flex items-center gap-5 text-left group shadow-sm ${activeFilter === 'FULFILLED' ? 'bg-black border-black text-white ring-4 ring-gray-200' : 'bg-white border-gray-100 hover:border-gray-300'}`}
            >
              <div className={`p-4 group-hover:scale-110 transition-transform ${activeFilter === 'FULFILLED' ? 'bg-white/20 text-white' : 'bg-gray-100 text-black'}`}>
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'FULFILLED' ? 'text-gray-300' : 'text-gray-400'}`}>Fulfillment Rate</div>
                <div className={`text-3xl font-black tracking-tighter ${activeFilter === 'FULFILLED' ? 'text-white' : 'text-black'}`}>
                  {stats.totalOrder > 0 ? Math.round((stats.totalReceived / stats.totalOrder) * 100) : 0}%
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveFilter(activeFilter === 'PENDING' ? 'ALL' : 'PENDING')}
              className={`p-6 border transition-all flex items-center gap-5 text-left group shadow-sm ${activeFilter === 'PENDING' ? 'bg-emerald-600 border-emerald-600 text-white ring-4 ring-emerald-100' : 'bg-white border-gray-100 hover:border-emerald-200'}`}
            >
              <div className={`p-4 group-hover:scale-110 transition-transform ${activeFilter === 'PENDING' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-500'}`}>
                <Gauge className="w-6 h-6" />
              </div>
              <div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'PENDING' ? 'text-emerald-100' : 'text-gray-400'}`}>Pending Balance</div>
                <div className={`text-3xl font-black tracking-tighter ${activeFilter === 'PENDING' ? 'text-white' : 'text-emerald-600'}`}>{stats.totalBalance}</div>
              </div>
            </button>
          </div>

          <div className="bg-white p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-grow max-w-xl">
                <div className="relative flex-grow">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by material category..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all font-medium"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeFilter !== 'ALL' || searchTerm !== '' ? (
                  <button
                    onClick={() => { setActiveFilter('ALL'); setSearchTerm(''); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-black font-bold text-xs hover:bg-gray-100 transition-all"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" /> Reset Filters
                  </button>
                ) : null}
                <div className="h-8 w-px bg-gray-200 mx-2" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Viewing {filteredItems.length} items</span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={tableHeaderClass}>Material Category</th>
                    <th className={tableHeaderClass}>Order Qty</th>
                    <th className={tableHeaderClass}>Received Qty</th>
                    <th className={tableHeaderClass}>Total Weight</th>
                    <th className={tableHeaderClass}>Balance</th>
                    <th className={tableHeaderClass}>Acceptance</th>
                    <th className={tableHeaderClass}>Acceptance Date</th>
                    <th className={tableHeaderClass}>Maturity Date</th>
                    <th className={tableHeaderClass}>Deadline Date</th>
                    <th className={tableHeaderClass}>Received Date</th>
                    <th className={tableHeaderClass}>Actual Quality</th>
                    <th className={tableHeaderClass}>Expected Quality</th>
                    <th className={tableHeaderClass}>Files</th>
                    <th className={`${tableHeaderClass} w-10`}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((item) => {
                    const balance = (item.orderQty || 0) - (item.receivedQty || 0);
                    const isDelayedRow = isDelayed(item.receivedDate, item.deadline);
                    const isQualityMismatched = qualityMismatch(item.actualQuality, item.receivedQuality);

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="p-0 border-r border-gray-50">
                          <input className={cellInputClass} value={item.label} onChange={e => updateItemField(item.id, 'label', e.target.value)} />
                        </td>
                        <td className="p-0 border-r border-gray-50">
                          <input type="number" className={cellInputClass} value={item.orderQty || ''} onChange={e => updateItemField(item.id, 'orderQty', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="p-0 border-r border-gray-50">
                          <input type="number" className={cellInputClass} value={item.receivedQty || ''} onChange={e => updateItemField(item.id, 'receivedQty', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="p-0 border-r border-gray-50">
                          <input type="number" step="0.01" className={cellInputClass} value={item.totalWeight || ''} onChange={e => updateItemField(item.id, 'totalWeight', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className={`p-2 border-r border-gray-50 text-[11px] font-black text-center ${balance > 0 ? 'text-orange-500' : balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {balance}
                        </td>
                        <td className="p-0 border-r border-gray-50">
                          <select
                            className={cellInputClass}
                            value={item.acceptance || ''}
                            onChange={e => updateItemField(item.id, 'acceptance', e.target.value)}
                          >
                            <option value="">- Select -</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </td>
                        <td className="p-0 border-r border-gray-50">
                          <input
                            type="date"
                            className={`${cellInputClass} ${item.acceptance !== 'Yes' ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
                            value={item.acceptanceDate || ''}
                            onChange={e => updateItemField(item.id, 'acceptanceDate', e.target.value)}
                            disabled={item.acceptance !== 'Yes'}
                          />
                        </td>
                        <td className="p-0 border-r border-gray-50">
                          <input type="date" className={cellInputClass} value={item.maturityDate || ''} onChange={e => updateItemField(item.id, 'maturityDate', e.target.value)} />
                        </td>
                        <td className="p-0 border-r border-gray-50">
                          <input type="date" className={cellInputClass} value={item.deadline} onChange={e => updateItemField(item.id, 'deadline', e.target.value)} />
                        </td>
                        <td className={`p-0 border-r border-gray-50 ${isDelayedRow ? 'bg-red-100' : ''}`}>
                          <input type="date" className={cellInputClass} value={item.receivedDate} onChange={e => updateItemField(item.id, 'receivedDate', e.target.value)} />
                        </td>
                        <td className={`p-0 border-r border-gray-50 ${isQualityMismatched ? 'bg-red-100' : ''}`}>
                          <input className={cellInputClass} value={item.actualQuality} onChange={e => updateItemField(item.id, 'actualQuality', e.target.value)} />
                        </td>
                        <td className="p-0 border-r border-gray-50">
                          <input className={cellInputClass} value={item.receivedQuality} onChange={e => updateItemField(item.id, 'receivedQuality', e.target.value)} />
                        </td>
                        <td className="p-2 border-r border-gray-50 text-center">
                          <button
                            onClick={() => setActiveAttachmentRow(item.id)}
                            className="relative p-1.5 bg-gray-100 text-black hover:bg-gray-200 transition-colors"
                          >
                            <Paperclip className="w-4 h-4" />
                            {item.attachments?.length > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white text-[8px] font-black flex items-center justify-center">
                                {item.attachments.length}
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="p-2 text-center">
                          <button onClick={() => deleteRow(item.id)} className="text-gray-300 hover:text-red-500 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* NEW: TECHNICAL COMMENTS & ATTACHMENTS SYSTEM */}
          <div className="mt-12 pt-10 border-t-2 border-slate-200">
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 mb-8 flex items-center gap-3">
              <span className="w-8 h-8 bg-black text-white rounded flex items-center justify-center text-xs">MQ</span>
              Material Audit Feedback & Documentation
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* COMMENTS PANEL */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col h-[500px]">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" /> Audit Log
                  </h4>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{(project.materialComments || []).length} Comments</span>
                </div>

                <div className="flex-grow overflow-y-auto space-y-4 mb-6 pr-2">
                  {(project.materialComments || []).map((c) => (
                    <div key={c.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl relative group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4 text-slate-400" />
                          <span className="text-[10px] font-black uppercase text-slate-700">{c.author}</span>
                          <span className="text-[9px] text-slate-400 font-bold">{new Date(c.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditGlobalComment(c)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteGlobalComment(c.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-slate-600 leading-relaxed">{c.text}</p>
                    </div>
                  ))}
                  {(project.materialComments || []).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 italic">
                      <MessageSquare className="w-8 h-8 opacity-20" />
                      <p className="text-xs font-bold">No global audit notes yet</p>
                    </div>
                  )}
                </div>

                <div className="mt-auto">
                  <textarea
                    className="w-full bg-[#DFEDF7] border border-slate-200 rounded-2xl p-4 text-xs font-bold focus:bg-white outline-none mb-3 resize-none h-24"
                    placeholder="Add a new audit comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                  />
                  <button
                    onClick={editingCommentId ? saveEditedGlobalComment : addGlobalComment}
                    className="w-full bg-black text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    {editingCommentId ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingCommentId ? 'Update Note' : 'Add Audit Note'}
                  </button>
                </div>
              </div>

              {/* ATTACHMENTS PANEL */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col h-[500px]">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-indigo-500" /> Reference Documents
                  </h4>
                  <button
                    onClick={() => globalFileInputRef.current?.click()}
                    className="p-2 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                  {(project.materialAttachments || []).map((att) => (
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
                        <button onClick={() => deleteGlobalAttachment(att.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  {(project.materialAttachments || []).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 italic">
                      <Paperclip className="w-8 h-8 opacity-20" />
                      <p className="text-xs font-bold">No global files uploaded</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[9px] font-black uppercase text-emerald-400 tracking-tighter mb-1">Quality Note</p>
                  <p className="text-[10px] font-bold text-emerald-900 leading-relaxed italic">Upload yarn test reports, fabric swatches scans, or lab certificates.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
        <input type="file" ref={globalFileInputRef} className="hidden" onChange={handleGlobalFileUpload} />

        {/* ATTACHMENT MODAL FOR ROWS */}
        {activeAttachmentRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm no-print">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-700">Row Attachments</h3>
                <button onClick={() => setActiveAttachmentRow(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {items.find(i => i.id === activeAttachmentRow)?.attachments?.map(att => (
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
                      <button onClick={() => deleteAttachment(activeAttachmentRow, att.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-white border-t">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Row File
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW MODAL */}
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm print:relative print:p-0 print:bg-white print:z-0">
            <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col print:max-w-none print:max-h-none print:shadow-none">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50 no-print">
                <h2 className="font-black text-xl uppercase tracking-tighter">Material Control Summary Report</h2>
                <div className="flex gap-2">
                  <button onClick={handlePrint} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-gray-100 transition-all">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-gray-100 transition-all">
                    <FileDown className="w-4 h-4" /> Download PDF
                  </button>
                  <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
              </div>
              <div id="mq-preview-content" className="p-10 overflow-y-auto bg-white flex-grow print:overflow-visible print:p-4">
                <div className="mb-10 border-b-4 border-black pb-6 flex justify-between items-end">
                  <div>
                    <h1 className="text-5xl font-black tracking-tighter mb-2">MQ SUMMARY</h1>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{project.title} | POs: {(project.poNumbers || []).map(p => p.number).join(', ')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-10">
                  <div className="border-2 border-black p-4 text-center">
                    <div className="text-[8px] font-black uppercase">Delayed</div>
                    <div className={`text-2xl font-black ${stats.delayed > 0 ? 'text-red-600' : 'text-black'}`}>{stats.delayed}</div>
                  </div>
                  <div className="border-2 border-black p-4 text-center">
                    <div className="text-[8px] font-black uppercase">Quality Alerts</div>
                    <div className={`text-2xl font-black ${stats.qualityIssues > 0 ? 'text-orange-600' : 'text-black'}`}>{stats.qualityIssues}</div>
                  </div>
                  <div className="border-2 border-black p-4 text-center">
                    <div className="text-[8px] font-black uppercase">Fulfillment</div>
                    <div className="text-2xl font-black">{stats.fulfilled} / {stats.total}</div>
                  </div>
                  <div className="border-2 border-black p-4 text-center bg-black text-white">
                    <div className="text-[8px] font-black uppercase">Total Balance</div>
                    <div className="text-2xl font-black">{stats.totalBalance}</div>
                  </div>
                </div>

                <div className="overflow-hidden border-2 border-black rounded-xl">
                  <table className="w-full border-collapse">
                    <thead className="bg-black text-white">
                      <tr className="text-[10px] uppercase font-black tracking-widest">
                        <th className="p-3 text-left">Category</th>
                        <th className="p-3 text-center">Order</th>
                        <th className="p-3 text-center">Recv</th>
                        <th className="p-3 text-center">T.Weight</th>
                        <th className="p-3 text-center">Bal</th>
                        <th className="p-3 text-center">Acc.</th>
                        <th className="p-3 text-center">Acc. Date</th>
                        <th className="p-3 text-center">Maturity</th>
                        <th className="p-3 text-center">Quality</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map(item => {
                        const balance = (item.orderQty || 0) - (item.receivedQty || 0);
                        return (
                          <tr key={item.id} className="text-[11px]">
                            <td className="p-3 font-black bg-gray-50">{item.label}</td>
                            <td className="p-3 text-center font-bold">{item.orderQty}</td>
                            <td className="p-3 text-center font-bold">{item.receivedQty}</td>
                            <td className="p-3 text-center font-bold text-indigo-600">{item.totalWeight}kg</td>
                            <td className={`p-3 text-center font-black ${balance > 0 ? 'text-orange-500' : 'text-green-600'}`}>{balance}</td>
                            <td className="p-3 text-center font-bold">{item.acceptance || '-'}</td>
                            <td className="p-3 text-center">{item.acceptanceDate || '-'}</td>
                            <td className="p-3 text-center">{item.maturityDate || '-'}</td>
                            <td className={`p-3 text-center font-black ${item.actualQuality !== item.receivedQuality ? 'text-red-600' : 'text-gray-500'}`}>{item.actualQuality || 'N/A'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MaterialControl;
