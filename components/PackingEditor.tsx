import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, PackingInfo, PackingBoxDetail, FileAttachment, PONumber, Comment } from '../types';
// Fix: Added missing MessageSquare icon from lucide-react
import {
  ArrowLeft, Save, Printer, FileDown, Plus, Trash2,
  Building2, Package, Truck, MapPin, CheckCircle2,
  ChevronRight, X, ClipboardList, CheckSquare,
  Paperclip, FileText, Download, ExternalLink,
  Upload, Box, Layers, Weight, Ruler, Trash,
  FileSpreadsheet, RotateCcw, Eye, Search, Edit3, UserCircle, MessageSquare
} from 'lucide-react';

// For PDF generation
declare var html2pdf: any;

interface PackingEditorProps {
  project: Project;
  onUpdate: (updatedPacking: PackingInfo) => void;
  onBack: () => void;
  onSave: () => void;
}

const SIZES_KEYS = ['XS', 'S', 'M', 'L', 'XL'] as const;
type SizeKey = typeof SIZES_KEYS[number];

const PackingEditor: React.FC<PackingEditorProps> = ({ project, onUpdate, onBack, onSave }) => {
  const [viewMode, setViewMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [showSaveToast, setShowSaveToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Initialize data if empty
  useEffect(() => {
    if (!project.packing.boxDetails || project.packing.boxDetails.length === 0) {
      const initialBoxes: PackingBoxDetail[] = [
        ...createRows(36, 14, '251-BLANCO', 'XS'),
        ...createRows(1, 4, '251-BLANCO', 'XS'),
        ...createRows(41, 12, '251-BLANCO', 'S'),
        ...createRows(1, 8, '251-BLANCO', 'S'),
        ...createRows(54, 12, '251-BLANCO', 'M'),
        ...createRows(51, 12, '251-BLANCO', 'L'),
        ...createRows(1, 4, '251-BLANCO', 'L'),
        ...createRows(20, 12, '251-BLANCO', 'XL'),
        ...createRows(1, 14, '251-BLANCO', 'XL'),
        ...createRows(27, 14, '700-MARRON', 'XS'),
        ...createRows(1, 7, '700-MARRON', 'XS'),
        ...createRows(30, 12, '700-MARRON', 'S'),
        ...createRows(1, 4, '700-MARRON', 'S'),
        ...createRows(40, 12, '700-MARRON', 'M'),
        ...createRows(38, 12, '700-MARRON', 'L'),
        ...createRows(1, 10, '700-MARRON', 'L'),
        ...createRows(16, 12, '700-MARRON', 'XL'),
        ...createRows(34, 14, '800-NEGRO', 'XS'),
        ...createRows(1, 16, '800-NEGRO', 'XS'),
        ...createRows(39, 12, '800-NEGRO', 'S'),
        ...createRows(1, 6, '800-NEGRO', 'S'),
        ...createRows(50, 12, '800-NEGRO', 'M'),
        ...createRows(1, 14, '800-NEGRO', 'M'),
        ...createRows(49, 12, '800-NEGRO', 'L'),
        ...createRows(1, 8, '800-NEGRO', 'L'),
        ...createRows(20, 12, '800-NEGRO', 'XL'),
        ...createRows(1, 5, '800-NEGRO', 'XL'),
      ];

      const initialPacking: PackingInfo = {
        ...project.packing,
        division: project.packing.division || 'BLOQUE',
        section: project.packing.section || 'SENORA',
        invoiceRef: project.packing.invoiceRef || 'CEWL/EXP/456/25',
        orderNumber: project.packing.orderNumber || (project.poNumbers?.[0]?.number || '78778-01/2'),
        shipmentType: project.packing.shipmentType || 'SEA',
        supplierCode: project.packing.supplierCode || '02596',
        supplierName: project.packing.supplierName || 'FASHION COMFORT EUROPE SL',
        vatCode: project.packing.vatCode || 'B66957994',
        address: project.packing.address || 'C/ Ronda Prim 62',
        email: project.packing.email || 'afzal@fashioncomfort.com',
        phone: project.packing.phone || '+88028819917',
        destination: project.packing.destination || 'BARCELONA, SPAIN',
        boxDetails: initialBoxes,
        //@ts-ignore
        boxLength: (project.packing as any).boxLength || 0.58,
        //@ts-ignore
        boxWidth: (project.packing as any).boxWidth || 0.38,
        //@ts-ignore
        boxHeight: (project.packing as any).boxHeight || 0.40,
        //@ts-ignore
        unitWeightG: (project.packing as any).unitWeightG || 620,
        //@ts-ignore
        cartonWeightKg: (project.packing as any).cartonWeightKg || 2,
        comments: []
      };
      onUpdate(initialPacking);
    }
  }, [project.id]);

  function createRows(totalBoxes: number, unitsPerBox: number, colorRef: string, size: string): PackingBoxDetail[] {
    return [{
      id: Math.random().toString(36).substr(2, 9),
      seqRange: '',
      totalBoxes,
      unitsPerBox,
      model: '7040',
      quality: '623',
      colorRef,
      colorCode: '',
      size,
      ratio: 0,
      totalPcsInOneBag: 0,
      totalBagInCtn: 0,
      totalBag: 0,
      units: totalBoxes * unitsPerBox,
      observation: '58X38X40'
    }];
  }

  const packing = project.packing;
  const getExtendedField = (key: string, def: any) => (packing as any)[key] ?? def;

  const updateField = (field: string, value: any) => {
    onUpdate({ ...packing, [field]: value });
  };

  const handleAddBoxDetail = () => {
    const newBox: PackingBoxDetail = {
      id: `BOX-${Date.now()}`,
      seqRange: '',
      totalBoxes: 1,
      unitsPerBox: 12,
      model: '7040',
      quality: '623',
      colorRef: '251-BLANCO',
      colorCode: '',
      size: 'M',
      ratio: 0,
      totalPcsInOneBag: 0,
      totalBagInCtn: 0,
      totalBag: 0,
      units: 12,
      observation: '58X38X40'
    };
    updateField('boxDetails', [...(packing.boxDetails || []), newBox]);
  };

  const updateBoxDetail = (id: string, field: keyof PackingBoxDetail, value: any) => {
    const updated = (packing.boxDetails || []).map(box => box.id === id ? { ...box, [field]: value } : box);
    updateField('boxDetails', updated);
  };

  const deleteBoxDetail = (id: string) => {
    updateField('boxDetails', (packing.boxDetails || []).filter(b => b.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      const newAttachment: FileAttachment = {
        id: `packatt-${Date.now()}`,
        fileName: file.name,
        fileUrl: fileUrl,
        uploadDate: new Date().toISOString()
      };
      updateField('attachments', [...(packing.attachments || []), newAttachment]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteAttachment = (attId: string) => {
    if (!confirm("Delete this document?")) return;
    updateField('attachments', (packing.attachments || []).filter(a => a.id !== attId));
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: `pcomm-${Date.now()}`,
      author: 'Logistics Lead',
      role: 'viewer',
      text: commentText,
      timestamp: new Date().toISOString()
    };
    updateField('comments', [...(packing.comments || []), newComment]);
    setCommentText('');
  };

  const deleteComment = (id: string) => {
    if (!confirm("Delete this comment?")) return;
    updateField('comments', (packing.comments || []).filter(c => c.id !== id));
  };

  const startEditComment = (c: Comment) => {
    setEditingCommentId(c.id);
    setCommentText(c.text);
  };

  const saveEditedComment = () => {
    if (!editingCommentId) return;
    const updated = (packing.comments || []).map(c => c.id === editingCommentId ? { ...c, text: commentText, timestamp: new Date().toISOString() } : c);
    updateField('comments', updated);
    setEditingCommentId(null);
    setCommentText('');
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to clear all packing data? This cannot be undone.")) {
      updateField('boxDetails', []);
    }
  };

  const calculatedData = useMemo(() => {
    let currentSeq = 1;
    let totalCartons = 0;
    let totalUnits = 0;

    const rowsWithSeq = (packing.boxDetails || []).map(box => {
      const boxes = Number(box.totalBoxes) || 0;
      const unitsPer = Number(box.unitsPerBox) || 0;
      const start = currentSeq;
      const end = boxes > 0 ? start + boxes - 1 : start;
      const rowTotalUnits = boxes * unitsPer;

      currentSeq = end + 1;
      totalCartons += boxes;
      totalUnits += rowTotalUnits;

      return {
        ...box,
        startSeq: start,
        endSeq: end,
        totalUnits: rowTotalUnits
      };
    });

    const boxLength = Number(getExtendedField('boxLength', 0.58));
    const boxWidth = Number(getExtendedField('boxWidth', 0.38));
    const boxHeight = Number(getExtendedField('boxHeight', 0.40));
    const unitWeightG = Number(getExtendedField('unitWeightG', 620));
    const cartonWeightKg = Number(getExtendedField('cartonWeightKg', 2));

    const netWeight = (totalUnits * unitWeightG) / 1000;
    const grossWeight = netWeight + (totalCartons * cartonWeightKg);
    const totalCbm = boxLength * boxWidth * boxHeight * totalCartons;

    const summaryGroups: Record<string, any> = {};
    rowsWithSeq.forEach(row => {
      const key = `${row.model}-${row.quality}-${row.colorRef}`;
      if (!summaryGroups[key]) {
        summaryGroups[key] = {
          model: row.model,
          quality: row.quality,
          colorRef: row.colorRef,
          XS: 0, S: 0, M: 0, L: 0, XL: 0,
          total: 0
        };
      }
      const size = row.size as SizeKey;
      if (summaryGroups[key][size] !== undefined) {
        summaryGroups[key][size] += row.totalUnits;
        summaryGroups[key].total += row.totalUnits;
      }
    });

    return {
      rows: rowsWithSeq,
      totalCartons,
      totalUnits,
      netWeight,
      grossWeight,
      totalCbm,
      summaryRows: Object.values(summaryGroups),
      dimensions: { boxLength, boxWidth, boxHeight, unitWeightG, cartonWeightKg }
    };
  }, [packing]);

  const handleExportCSV = () => {
    const headers = ['Start Seq', 'End Seq', 'Boxes', 'Units/Box', 'Model', 'Quality', 'Color Ref', 'Size', 'Total Units', 'Observation'];
    const rows = calculatedData.rows.map(r => [
      r.startSeq, r.endSeq, r.totalBoxes, r.unitsPerBox, r.model, r.quality, r.colorRef, r.size, r.totalUnits, r.observation
    ]);

    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PackingList_${project.title}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = () => {
    onSave();
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const handlePrint = () => { window.print(); };

  const inputClass = "w-full border border-slate-200 p-2 text-sm bg-[#DFEDF7] focus:bg-white focus:ring-2 focus:ring-black/20 outline-none font-mono text-slate-800 transition-all";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 pl-1";

  const getColorDot = (colorRef: string) => {
    const c = colorRef.toUpperCase();
    if (c.includes('BLANCO')) return 'bg-white border border-gray-300';
    if (c.includes('MARRON')) return 'bg-[#8B4513]';
    if (c.includes('NEGRO')) return 'bg-[#1a1a1a]';
    return 'bg-gray-400';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 print:bg-white overflow-hidden">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm shrink-0 z-30 no-print">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 hover:bg-gray-100 transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-xl text-black tracking-tight leading-none">Packing List System</h1>
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Management & Automation</div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={clearAll} className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 text-xs font-black hover:bg-red-50 transition-all shadow-sm">
            <RotateCcw className="w-3.5 h-3.5" /> Clear All
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 text-xs font-black hover:bg-gray-50 transition-all shadow-sm">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV/XLSX
          </button>
          <button onClick={() => setViewMode(viewMode === 'EDIT' ? 'PREVIEW' : 'EDIT')} className="flex items-center gap-2 bg-white border border-gray-200 text-black px-4 py-2 text-xs font-black hover:bg-gray-50 transition-all shadow-sm">
            {viewMode === 'EDIT' ? <Eye className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />} {viewMode === 'EDIT' ? 'Preview' : 'Editor'}
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 bg-black text-white px-5 py-2 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-all">
            <Save className="w-3.5 h-3.5" /> Save Work
          </button>
        </div>
      </header>

      <div className="flex-grow flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-80 bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-6 no-print shrink-0">

          <div className="bg-white border border-slate-100 p-4 shadow-sm space-y-4 animate-fade-in" style={{ animationDelay: '0ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gray-100 text-black flex items-center justify-center"><ClipboardList className="w-4 h-4" /></div>
              <h3 className="font-black text-[11px] uppercase tracking-wider text-slate-800">Document Info</h3>
            </div>
            <div><label className={labelClass}>Division</label><input className={inputClass} value={packing.division} onChange={e => updateField('division', e.target.value)} /></div>
            <div><label className={labelClass}>Reference Number</label><input className={inputClass} value={packing.invoiceRef} onChange={e => updateField('invoiceRef', e.target.value)} /></div>
            <div><label className={labelClass}>Section</label><input className={inputClass} value={packing.section} onChange={e => updateField('section', e.target.value)} /></div>
            <div><label className={labelClass}>Delivery Note</label><input className={inputClass} value={packing.deliveryNoteNo} onChange={e => updateField('deliveryNoteNo', e.target.value)} /></div>
            <div><label className={labelClass}>Order Number</label><input className={inputClass} value={packing.orderNumber} onChange={e => updateField('orderNumber', e.target.value)} /></div>
            <div>
              <label className={labelClass}>Shipment Type</label>
              <select className={inputClass} value={packing.shipmentType} onChange={e => updateField('shipmentType', e.target.value)}>
                <option value="SEA">SEA</option>
                <option value="AIR">AIR</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Alarmed Goods</label>
              <select className={inputClass} value={packing.alarmedGoods ? 'Yes' : 'No'} onChange={e => updateField('alarmedGoods', e.target.value === 'Yes')}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-4 shadow-sm space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gray-100 text-black flex items-center justify-center"><Building2 className="w-4 h-4" /></div>
              <h3 className="font-black text-[11px] uppercase tracking-wider text-slate-800">Supplier Info</h3>
            </div>
            <div><label className={labelClass}>Supplier Code</label><input className={inputClass} value={packing.supplierCode} onChange={e => updateField('supplierCode', e.target.value)} /></div>
            <div><label className={labelClass}>Company Name</label><input className={inputClass} value={packing.supplierName} onChange={e => updateField('supplierName', e.target.value)} /></div>
            <div><label className={labelClass}>VAT Code</label><input className={inputClass} value={packing.vatCode} onChange={e => updateField('vatCode', e.target.value)} /></div>
            <div><label className={labelClass}>Address</label><input className={inputClass} value={packing.address} onChange={e => updateField('address', e.target.value)} /></div>
            <div><label className={labelClass}>Phone</label><input className={inputClass} value={packing.phone} onChange={e => updateField('phone', e.target.value)} /></div>
            <div><label className={labelClass}>Email</label><input className={inputClass} value={packing.email} onChange={e => updateField('email', e.target.value)} /></div>
          </div>

          <div className="bg-white border border-slate-100 p-4 shadow-sm space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gray-100 text-black flex items-center justify-center"><MapPin className="w-4 h-4" /></div>
              <h3 className="font-black text-[11px] uppercase tracking-wider text-slate-800">Destination</h3>
            </div>
            <div><label className={labelClass}>Final Destination</label><input className={inputClass} value={packing.destination} onChange={e => updateField('destination', e.target.value)} /></div>
            <div><label className={labelClass}>Receiver Address</label><textarea rows={3} className={`${inputClass} resize-none`} value={getExtendedField('receiverAddress', '')} onChange={e => updateField('receiverAddress', e.target.value)} /></div>
            <div><label className={labelClass}>Shipment Date</label><input type="date" className={inputClass} value={packing.shipmentDate} onChange={e => updateField('shipmentDate', e.target.value)} /></div>
            <div><label className={labelClass}>Arrival Date</label><input type="date" className={inputClass} value={packing.arrivalDate} onChange={e => updateField('arrivalDate', e.target.value)} /></div>
          </div>

          <div className="bg-white border border-slate-100 p-4 shadow-sm space-y-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gray-100 text-black flex items-center justify-center"><Ruler className="w-4 h-4" /></div>
              <h3 className="font-black text-[11px] uppercase tracking-wider text-slate-800">Box Dimensions</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className={labelClass}>Len(m)</label><input type="number" step="0.01" className={inputClass} value={calculatedData.dimensions.boxLength} onChange={e => updateField('boxLength', e.target.value)} /></div>
              <div><label className={labelClass}>Wid(m)</label><input type="number" step="0.01" className={inputClass} value={calculatedData.dimensions.boxWidth} onChange={e => updateField('boxWidth', e.target.value)} /></div>
              <div><label className={labelClass}>Hei(m)</label><input type="number" step="0.01" className={inputClass} value={calculatedData.dimensions.boxHeight} onChange={e => updateField('boxHeight', e.target.value)} /></div>
            </div>
            <div><label className={labelClass}>Weight/Unit (grams)</label><input type="number" className={inputClass} value={calculatedData.dimensions.unitWeightG} onChange={e => updateField('unitWeightG', e.target.value)} /></div>
            <div><label className={labelClass}>Carton Weight (kg)</label><input type="number" className={inputClass} value={calculatedData.dimensions.cartonWeightKg} onChange={e => updateField('cartonWeightKg', e.target.value)} /></div>
          </div>
        </aside>

        <main className="flex-grow overflow-y-auto bg-slate-50 p-8 space-y-8">
          <div className="grid grid-cols-4 gap-6 no-print">
            <div className="bg-black text-white p-6 shadow-lg flex items-center gap-5">
              <div className="w-12 h-12 bg-white/20 flex items-center justify-center"><Box className="w-6 h-6" /></div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Cartons</div>
                <div className="text-3xl font-black">{calculatedData.totalCartons}</div>
              </div>
            </div>
            <div className="bg-gray-800 text-white p-6 shadow-lg flex items-center gap-5">
              <div className="w-12 h-12 bg-white/20 flex items-center justify-center"><Layers className="w-6 h-6" /></div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Units</div>
                <div className="text-3xl font-black">{calculatedData.totalUnits.toLocaleString()}</div>
              </div>
            </div>
            <div className="bg-gray-600 text-white p-6 shadow-lg flex items-center gap-5">
              <div className="w-12 h-12 bg-white/20 flex items-center justify-center"><Weight className="w-6 h-6" /></div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Net Weight</div>
                <div className="text-2xl font-black">{calculatedData.netWeight.toFixed(2)} <span className="text-sm font-bold">KGS</span></div>
              </div>
            </div>
            <div className="bg-gray-500 text-white p-6 shadow-lg flex items-center gap-5">
              <div className="w-12 h-12 bg-white/20 flex items-center justify-center"><Weight className="w-6 h-6" /></div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Gross Weight</div>
                <div className="text-2xl font-black">{calculatedData.grossWeight.toFixed(2)} <span className="text-sm font-bold">KGS</span></div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden animate-fade-in no-print">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-black" /> Packing Details Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest text-center">
                    <th className="p-4 w-12"><Trash2 className="w-4 h-4 mx-auto" /></th>
                    <th className="p-4 w-20">Seq Start</th>
                    <th className="p-4 w-20">Seq End</th>
                    <th className="p-4 w-24">Boxes</th>
                    <th className="p-4 w-24">Units/Box</th>
                    <th className="p-4 text-left">Model</th>
                    <th className="p-4">Quality</th>
                    <th className="p-4">Color Ref</th>
                    <th className="p-4 w-24">Size</th>
                    <th className="p-4 w-32 bg-indigo-800">Total Units</th>
                    <th className="p-4 text-left">Observation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculatedData.rows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-2 text-center">
                        <button onClick={() => deleteBoxDetail(row.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash className="w-4 h-4" /></button>
                      </td>
                      <td className="p-2 text-center font-mono text-xs text-slate-400">{row.startSeq}</td>
                      <td className="p-2 text-center font-mono text-xs text-slate-400">{row.endSeq}</td>
                      <td className="p-2">
                        <input type="number" className="w-full bg-[#DFEDF7] border-none rounded-lg p-2 text-xs text-center font-black" value={row.totalBoxes} onChange={e => updateBoxDetail(row.id, 'totalBoxes', parseInt(e.target.value) || 0)} />
                      </td>
                      <td className="p-2">
                        <input type="number" className="w-full bg-[#DFEDF7] border-none rounded-lg p-2 text-xs text-center font-black" value={row.unitsPerBox} onChange={e => updateBoxDetail(row.id, 'unitsPerBox', parseInt(e.target.value) || 0)} />
                      </td>
                      <td className="p-2">
                        <input className="w-full bg-white border border-slate-100 rounded-lg p-2 text-xs font-bold" value={row.model} onChange={e => updateBoxDetail(row.id, 'model', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <input className="w-full bg-white border border-slate-100 rounded-lg p-2 text-xs text-center font-bold" value={row.quality} onChange={e => updateBoxDetail(row.id, 'quality', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <input className="w-full bg-white border border-slate-100 rounded-lg p-2 text-xs text-center font-bold" value={row.colorRef} onChange={e => updateBoxDetail(row.id, 'colorRef', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <select className="w-full bg-[#DFEDF7] border-none rounded-lg p-2 text-xs text-center font-black" value={row.size} onChange={e => updateBoxDetail(row.id, 'size', e.target.value)}>
                          {SIZES_KEYS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="p-2 text-center font-black text-cyan-600 bg-cyan-50/50">{row.totalUnits.toLocaleString()}</td>
                      <td className="p-2">
                        <input className="w-full bg-white border border-slate-100 rounded-lg p-2 text-xs" value={row.observation} onChange={e => updateBoxDetail(row.id, 'observation', e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-black text-slate-800 text-center uppercase">
                  <tr>
                    <td colSpan={3} className="p-4 text-right tracking-widest text-xs">Total =</td>
                    <td className="p-4 text-sm text-indigo-600">{calculatedData.totalCartons}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="p-4 text-sm text-emerald-600 bg-emerald-50">{calculatedData.totalUnits.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button
              onClick={handleAddBoxDetail}
              className="w-full p-4 border-t border-dashed border-slate-200 text-black font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add New Row
            </button>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden animate-fade-in no-print">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-black" /> Summary by Color Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest text-center border-b border-slate-100">
                    <th className="p-4 text-left">Model</th>
                    <th className="p-4 text-left">Quality</th>
                    <th className="p-4 text-left">Color Reference</th>
                    {SIZES_KEYS.map(s => <th key={s} className="p-4">{s}</th>)}
                    <th className="p-4 bg-slate-900 text-white">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculatedData.summaryRows.map((row, i) => (
                    <tr key={i} className="text-center hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-left font-black text-xs text-slate-800">{row.model}</td>
                      <td className="p-4 text-left font-bold text-xs text-slate-500">{row.quality}</td>
                      <td className="p-4 text-left">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getColorDot(row.colorRef)} shadow-sm`}></div>
                          <span className="font-black text-xs uppercase text-slate-800">{row.colorRef}</span>
                        </div>
                      </td>
                      {SIZES_KEYS.map(s => (
                        <td key={s} className="p-4 font-bold text-xs text-slate-700">{row[s].toLocaleString()}</td>
                      ))}
                      <td className="p-4 font-black text-sm text-indigo-600 bg-indigo-50/50">{row.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black text-xs text-center uppercase">
                  <tr>
                    <td colSpan={3} className="p-5 text-right tracking-widest">Grand Total =</td>
                    {SIZES_KEYS.map(s => (
                      <td key={s} className="p-5">
                        {calculatedData.summaryRows.reduce((acc, curr) => acc + curr[s], 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="p-5 text-base bg-emerald-500">{calculatedData.totalUnits.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* NEW: TECHNICAL COMMENTS & ATTACHMENTS SYSTEM FOOTER */}
          <div className="mt-12 pt-10 border-t-2 border-slate-200 no-print pb-32">
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 mb-8 flex items-center gap-3">
              <span className="w-8 h-8 bg-black text-white rounded flex items-center justify-center text-xs">PL</span>
              Technical Feedback & Document Audit
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* COMMENTS PANEL */}
              <div className="bg-white p-8 shadow-sm border border-slate-200 flex flex-col h-[500px]">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" /> Packing Notes Log
                  </h4>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{(packing.comments || []).length} Records</span>
                </div>

                <div className="flex-grow overflow-y-auto space-y-4 mb-6 pr-2">
                  {(packing.comments || []).map((c) => (
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
                  {(packing.comments || []).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 italic">
                      <MessageSquare className="w-8 h-8 opacity-20" />
                      <p className="text-xs font-bold">No documentation logs yet</p>
                    </div>
                  )}
                </div>

                <div className="mt-auto">
                  <textarea
                    className="w-full bg-[#DFEDF7] border border-slate-200 rounded-2xl p-4 text-xs font-bold focus:bg-white outline-none mb-3 resize-none h-24"
                    placeholder="Add a new packing or shipping note..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                  />
                  <button
                    onClick={editingCommentId ? saveEditedComment : addComment}
                    className="w-full bg-black text-white py-3 font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    {editingCommentId ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingCommentId ? 'Update Record' : 'Post New Record'}
                  </button>
                </div>
              </div>

              {/* ATTACHMENTS PANEL */}
              <div className="bg-white p-8 shadow-sm border border-slate-200 flex flex-col h-[500px]">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-indigo-500" /> Audit Documentation
                  </h4>
                  <div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-black text-white shadow-md hover:bg-gray-800 transition-all"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                  {(packing.attachments || []).map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-white text-black shadow-sm"><FileText className="w-5 h-5" /></div>
                        <div className="truncate">
                          <p className="text-xs font-black text-slate-800 truncate">{att.fileName}</p>
                          <p className="text-[9px] font-bold text-slate-400">{new Date(att.uploadDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => window.open(att.fileUrl)} className="p-2 text-black hover:bg-white transition-all" title="Preview"><ExternalLink className="w-4 h-4" /></button>
                        <a href={att.fileUrl} download={att.fileName} className="p-2 text-emerald-600 hover:bg-white transition-all" title="Download"><Download className="w-4 h-4" /></a>
                        <button onClick={() => deleteAttachment(att.id)} className="p-2 text-red-500 hover:bg-red-50 transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  {(packing.attachments || []).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 italic">
                      <Paperclip className="w-8 h-8 opacity-20" />
                      <p className="text-xs font-bold">No documentation attached</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-[9px] font-black uppercase text-indigo-400 tracking-tighter mb-1">Logistics Note</p>
                  <p className="text-[10px] font-bold text-indigo-900 leading-relaxed italic">Upload weighbridge slips, container loading photos, and verified packing declarations.</p>
                </div>
              </div>
            </div>
          </div>

          {viewMode === 'PREVIEW' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:relative print:p-0 print:bg-white">
              <div className="bg-white w-full max-w-[210mm] max-h-[95vh] rounded-lg shadow-2xl overflow-hidden flex flex-col print:max-w-none print:max-h-none print:shadow-none print:rounded-none">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gray-50 no-print">
                  <h2 className="font-black text-sm uppercase tracking-tight text-slate-800">Packing List Preview</h2>
                  <div className="flex gap-2">
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-xs uppercase shadow-lg hover:bg-indigo-700">
                      <Printer className="w-4 h-4" /> Print
                    </button>
                    <button onClick={() => setViewMode('EDIT')} className="p-2 hover:bg-gray-200 rounded-lg">
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div id="packing-preview-content" className="overflow-y-auto bg-white flex-grow print:overflow-visible">
                  <div className="w-full bg-white p-[8mm]" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px' }}>

                    {/* HEADER - 3 COLUMN LAYOUT */}
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      {/* LEFT: Division/Section */}
                      <div className="text-[8px]">
                        <div><strong>División / Division:</strong> {packing.division || 'BLOQUES'}</div>
                        <div><strong>Sección / Section:</strong> {packing.section || 'SENORA'}</div>
                      </div>

                      {/* CENTER: Reference Number */}
                      <div className="flex items-center justify-center">
                        <div className="bg-[#CCFF66] border-2 border-black px-4 py-1 text-center font-black text-sm">
                          {packing.invoiceRef || 'CEWL/EXP/456/25'}
                        </div>
                      </div>

                      {/* RIGHT: Bershka Logo/Address */}
                      <div className="text-right text-[8px]">
                        <div className="text-[#FF6600] font-black text-xl mb-1">Bershka</div>
                        <div className="text-[7px]">
                          <div>INDITEX TALDEA, S.A.</div>
                          <div>Edificio Inditex, Avda. de la Diputación</div>
                          <div>15142 Arteixo (A Coruña) - España</div>
                        </div>
                      </div>
                    </div>

                    {/* ORDER DETAILS - YELLOW HIGHLIGHT */}
                    <div className="bg-[#FFFF00] border border-black px-2 py-1 mb-2 text-[8px] font-bold">
                      {packing.orderNumber || '78778-01/2'} {packing.shipmentType || 'SEA'} SHIPMENT
                    </div>

                    {/* LISTA DE CONTENIDO / PACKING LIST */}
                    <div className="border border-black px-2 py-1 mb-2 text-[8px] font-bold">
                      LISTA DE CONTENIDO / PACKING LIST
                    </div>

                    {/* SUPPLIER INFO BOX */}
                    <div className="border border-black mb-3">
                      <div className="grid grid-cols-2">
                        {/* Left Column */}
                        <div className="border-r border-black p-2 text-[8px]">
                          <div className="mb-1"><strong>Código proveedor / Supplier code:</strong></div>
                          <div className="mb-2">{packing.supplierCode || '02596'}</div>
                          <div className="mb-1"><strong>Nombre / Company name:</strong> {packing.supplierName || 'FASHION COMFORT EUROPE SL'}</div>
                          <div className="mb-1"><strong>Dirección / Address:</strong> {packing.address || 'C/ Ronda Prim 62'}</div>
                          <div className="mb-1"><strong>Población / Town:</strong> Barcelona</div>
                          <div className="mb-1"><strong>C.P. / Postal code:</strong> 08019</div>
                          <div className="mb-1"><strong>País / Country:</strong> SPAIN</div>
                          <div className="mb-1"><strong>CIF / VAT code:</strong> {packing.vatCode || 'B66957994'}</div>
                        </div>

                        {/* Right Column */}
                        <div className="p-2 text-[8px]">
                          <div className="mb-1"><strong>Nº teléfono / Phone number:</strong> {packing.phone || '+88028819917'}</div>
                          <div className="mb-1"><strong>Nº fax / Fax number:</strong> {packing.fax || ''}</div>
                          <div className="mb-1"><strong>E-mail:</strong> {packing.email || 'afzal@fashioncomfort.com'}</div>
                          <div className="mb-1"><strong>Nº de albarán / Delivery note no.:</strong> {packing.deliveryNoteNo || ''}</div>
                          <div className="mb-1"><strong>Nº de pedido / Order number:</strong> {packing.orderNumber || '78778-01/2'}</div>
                          <div className="mb-1"><strong>Mercancía alarmada / Alarmed goods:</strong> {packing.alarmedGoods ? 'SÍ/YES' : 'NO'}</div>
                          <div className="mb-1"><strong>Fecha de Envío / Date of shipment:</strong> {packing.shipmentDate || ''}</div>
                          <div className="mb-1"><strong>Fecha de llegada / Arrival date:</strong> {packing.arrivalDate || ''}</div>
                        </div>
                      </div>
                    </div>

                    {/* MAIN TABLE: DETALLE POR BULTO / DETAIL PER BOX */}
                    <table className="w-full border-collapse border border-black mb-2" style={{ fontSize: '7px' }}>
                      <thead>
                        <tr className="bg-[#FFFF00]">
                          <th className="border border-black p-1 font-bold">Secuencia</th>
                          <th className="border border-black p-1 font-bold">Nº de bultos</th>
                          <th className="border border-black p-1 font-bold">Unidades por bulto</th>
                          <th className="border border-black p-1 font-bold">Modelo</th>
                          <th className="border border-black p-1 font-bold">Calidad</th>
                          <th className="border border-black p-1 font-bold">Ref. Color</th>
                          <th className="border border-black p-1 font-bold">Talla</th>
                          <th className="border border-black p-1 font-bold">Nº de unidades</th>
                          <th className="border border-black p-1 font-bold">Observaciones</th>
                        </tr>
                        <tr className="bg-[#FFFF00]">
                          <th className="border border-black p-1 font-bold text-[6px]">Sequence</th>
                          <th className="border border-black p-1 font-bold text-[6px]">Total boxes</th>
                          <th className="border border-black p-1 font-bold text-[6px]">Unit per box</th>
                          <th className="border border-black p-1 font-bold text-[6px]">Model</th>
                          <th className="border border-black p-1 font-bold text-[6px]">Quality</th>
                          <th className="border border-black p-1 font-bold text-[6px]">Colour ref</th>
                          <th className="border border-black p-1 font-bold text-[6px]">Size</th>
                          <th className="border border-black p-1 font-bold text-[6px]">Units</th>
                          <th className="border border-black p-1 font-bold text-[6px]">Observation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculatedData.rows.map((row, idx) => (
                          <tr key={idx} className="text-center">
                            <td className="border border-black p-1">{row.startSeq} - {row.endSeq}</td>
                            <td className="border border-black p-1">{row.totalBoxes}</td>
                            <td className="border border-black p-1">{row.unitsPerBox}</td>
                            <td className="border border-black p-1">{row.model}</td>
                            <td className="border border-black p-1">{row.quality}</td>
                            <td className="border border-black p-1">{row.colorRef}</td>
                            <td className="border border-black p-1">{row.size}</td>
                            <td className="border border-black p-1 font-bold">{row.totalUnits}</td>
                            <td className="border border-black p-1 text-[6px]">{row.observation}</td>
                          </tr>
                        ))}
                        <tr className="font-bold">
                          <td colSpan={1} className="border border-black p-1 text-left">TOTAL</td>
                          <td className="border border-black p-1">{calculatedData.totalCartons}</td>
                          <td colSpan={5} className="border border-black p-1"></td>
                          <td className="border border-black p-1">{calculatedData.totalUnits}</td>
                          <td className="border border-black p-1"></td>
                        </tr>
                      </tbody>
                    </table>

                    {/* WEIGHT/CARTON SUMMARY LINE */}
                    <div className="grid grid-cols-4 gap-2 mb-3 text-[7px] font-bold text-center">
                      <div>Peso bruto total/Total gross weight: <span className="font-black">{calculatedData.grossWeight.toFixed(2)} KGS</span></div>
                      <div>Peso neto total/Total net weight: <span className="font-black">{calculatedData.netWeight.toFixed(2)} KGS</span></div>
                      <div><span className="font-black">{calculatedData.totalCartons} CARTONS</span></div>
                      <div><span className="font-black">{calculatedData.totalCbm.toFixed(2)} M3</span></div>
                    </div>

                    {/* SUMMARY TABLE: TABLA RESUMEN / SUMMARY TABLE */}
                    <div className="border border-black p-2 mb-2 text-[7px] font-bold text-center">
                      TABLA RESUMEN / SUMMARY TABLE
                    </div>

                    <table className="w-full border-collapse border border-black" style={{ fontSize: '7px' }}>
                      <thead>
                        <tr className="bg-[#FFFF00]">
                          <th className="border border-black p-1 font-bold">Modelo</th>
                          <th className="border border-black p-1 font-bold">Calidad</th>
                          <th className="border border-black p-1 font-bold">Ref. Color</th>
                          <th className="border border-black p-1 font-bold">XS</th>
                          <th className="border border-black p-1 font-bold">S</th>
                          <th className="border border-black p-1 font-bold">M</th>
                          <th className="border border-black p-1 font-bold">L</th>
                          <th className="border border-black p-1 font-bold">XL</th>
                          <th className="border border-black p-1 font-bold">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculatedData.summaryRows.map((row, idx) => (
                          <tr key={idx} className="text-center">
                            <td className="border border-black p-1">{row.model}</td>
                            <td className="border border-black p-1">{row.quality}</td>
                            <td className="border border-black p-1">{row.colorRef}</td>
                            <td className="border border-black p-1">{row.XS}</td>
                            <td className="border border-black p-1">{row.S}</td>
                            <td className="border border-black p-1">{row.M}</td>
                            <td className="border border-black p-1">{row.L}</td>
                            <td className="border border-black p-1">{row.XL}</td>
                            <td className="border border-black p-1 font-bold">{row.total}</td>
                          </tr>
                        ))}
                        <tr className="font-bold">
                          <td colSpan={3} className="border border-black p-1 text-left">TOTAL</td>
                          <td className="border border-black p-1">{calculatedData.summaryRows.reduce((acc, curr) => acc + curr.XS, 0)}</td>
                          <td className="border border-black p-1">{calculatedData.summaryRows.reduce((acc, curr) => acc + curr.S, 0)}</td>
                          <td className="border border-black p-1">{calculatedData.summaryRows.reduce((acc, curr) => acc + curr.M, 0)}</td>
                          <td className="border border-black p-1">{calculatedData.summaryRows.reduce((acc, curr) => acc + curr.L, 0)}</td>
                          <td className="border border-black p-1">{calculatedData.summaryRows.reduce((acc, curr) => acc + curr.XL, 0)}</td>
                          <td className="border border-black p-1">{calculatedData.totalUnits}</td>
                        </tr>
                      </tbody>
                    </table>

                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {showSaveToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-black uppercase tracking-widest text-xs z-[100] animate-bounce flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" /> All Calculations Synchronized
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        @media print {
            aside, header, footer, .no-print { display: none !important; }
            main { padding: 0 !important; width: 100% !important; background: white !important; overflow: visible !important; }
            .print-reset { margin: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default PackingEditor;