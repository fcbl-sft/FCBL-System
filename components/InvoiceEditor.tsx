
import React, { useState, useMemo, useRef } from 'react';
import { Project, Invoice, InvoiceLineItem, FileAttachment, Comment } from '../types';
import { ArrowLeft, Save, Printer, FileDown, Plus, Trash2, Building2, Banknote, Ship, MapPin, CheckCircle2, ChevronRight, X, UserCircle2, Paperclip, FileText, Download, ExternalLink, Upload, MessageSquare, Edit3, UserCircle } from 'lucide-react';

// For PDF generation
declare var html2pdf: any;

interface InvoiceEditorProps {
    project: Project;
    invoice: Invoice;
    onUpdate: (updatedInvoice: Invoice) => void;
    onBack: () => void;
    onSave: () => void;
}

const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ project, invoice, onUpdate, onBack, onSave }) => {
    const [viewMode, setViewMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');
    const [showSaveToast, setShowSaveToast] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');

    const updateField = (field: keyof Invoice, value: any) => {
        onUpdate({ ...invoice, [field]: value });
    };

    const handleAddLineItem = () => {
        const newItem: InvoiceLineItem = {
            id: `LI-${Date.now()}`,
            marksAndNumber: 'FCBL / ' + (project.poNumbers?.[0]?.number || 'N/A'),
            description: project.title,
            composition: '100% COTTON KNITTED SWEATER',
            orderNo: project.poNumbers?.[0]?.number || '',
            styleNo: project.title,
            hsCode: '6110.20.00',
            quantity: 0,
            cartons: 0,
            unitPrice: 0,
            totalAmount: 0
        };
        updateField('lineItems', [...(invoice.lineItems || []), newItem]);
    };

    const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: any) => {
        const updated = (invoice.lineItems || []).map(item => {
            if (item.id === id) {
                const newItem = { ...item, [field]: value };
                if (field === 'quantity' || field === 'unitPrice') {
                    newItem.totalAmount = (newItem.quantity || 0) * (newItem.unitPrice || 0);
                }
                return newItem;
            }
            return item;
        });
        updateField('lineItems', updated);
    };

    const deleteLineItem = (id: string) => {
        updateField('lineItems', (invoice.lineItems || []).filter(i => i.id !== id));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const fileUrl = URL.createObjectURL(file);
            const newAttachment: FileAttachment = {
                id: `invatt-${Date.now()}`,
                fileName: file.name,
                fileUrl: fileUrl,
                uploadDate: new Date().toISOString()
            };
            updateField('attachments', [...(invoice.attachments || []), newAttachment]);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const deleteAttachment = (attId: string) => {
        if (!confirm("Delete this document?")) return;
        updateField('attachments', (invoice.attachments || []).filter(a => a.id !== attId));
    };

    const addComment = () => {
        if (!commentText.trim()) return;
        const newComment: Comment = {
            id: `icomm-${Date.now()}`,
            author: 'Commercial Team',
            role: 'supplier',
            text: commentText,
            timestamp: new Date().toISOString()
        };
        updateField('comments', [...(invoice.comments || []), newComment]);
        setCommentText('');
    };

    const deleteComment = (id: string) => {
        if (!confirm("Delete this comment?")) return;
        updateField('comments', (invoice.comments || []).filter(c => c.id !== id));
    };

    const startEditComment = (c: Comment) => {
        setEditingCommentId(c.id);
        setCommentText(c.text);
    };

    const saveEditedComment = () => {
        if (!editingCommentId) return;
        const updated = (invoice.comments || []).map(c => c.id === editingCommentId ? { ...c, text: commentText, timestamp: new Date().toISOString() } : c);
        updateField('comments', updated);
        setEditingCommentId(null);
        setCommentText('');
    };

    const totals = useMemo(() => {
        return (invoice.lineItems || []).reduce((acc, curr) => ({
            qty: acc.qty + (curr.quantity || 0),
            cartons: acc.cartons + (curr.cartons || 0),
            amount: acc.amount + (curr.totalAmount || 0)
        }), { qty: 0, cartons: 0, amount: 0 });
    }, [invoice.lineItems]);

    // Auto-compute packing data from project.packing
    const packingData = useMemo(() => {
        const packing = project.packing;
        if (!packing) return { totalUnits: 0, totalCartons: 0, netWeight: 0, grossWeight: 0, totalCbm: 0 };

        // Calculate total units and cartons from box details
        let totalUnits = 0;
        let totalCartons = 0;
        (packing.boxDetails || []).forEach(box => {
            const boxes = Number(box.totalBoxes) || 0;
            const unitsPer = Number(box.unitsPerBox) || 0;
            totalCartons += boxes;
            totalUnits += boxes * unitsPer;
        });

        // Get weights and CBM with proper computation
        const boxLength = Number((packing as any).boxLength || 0.58);
        const boxWidth = Number((packing as any).boxWidth || 0.38);
        const boxHeight = Number((packing as any).boxHeight || 0.40);
        const unitWeightG = Number((packing as any).unitWeightG || 620);
        const cartonWeightKg = Number((packing as any).cartonWeightKg || 2);

        const netWeight = (totalUnits * unitWeightG) / 1000;
        const grossWeight = netWeight + (totalCartons * cartonWeightKg);
        const totalCbm = boxLength * boxWidth * boxHeight * totalCartons;

        return { totalUnits, totalCartons, netWeight: Math.round(netWeight * 100) / 100, grossWeight: Math.round(grossWeight * 100) / 100, totalCbm: Math.round(totalCbm * 1000) / 1000 };
    }, [project.packing]);

    const handleSave = () => {
        onSave();
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 3000);
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById('invoice-preview-content');
        if (!element) return;

        // Get actual content height
        const contentHeight = element.scrollHeight;
        const contentWidth = element.scrollWidth;

        // Calculate scale to fit A4 (210mm x 297mm = 794px x 1123px at 96 DPI)
        const a4HeightPx = 1123;
        const a4WidthPx = 794;

        // Calculate scale factor to fit content on single page
        const scaleX = a4WidthPx / contentWidth;
        const scaleY = a4HeightPx / contentHeight;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

        const opt = {
            margin: 0,
            filename: `CommercialInvoice_${invoice.invoiceNo}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: scale * 2,  // Apply calculated scale
                useCORS: true,
                logging: false,
                width: contentWidth,
                height: contentHeight
            },
            jsPDF: {
                unit: 'px',
                format: [a4WidthPx, a4HeightPx],
                orientation: 'portrait',
                compress: true
            }
        };

        await html2pdf().set(opt).from(element).save();
    };

    const inputClass = "w-full border border-slate-200 p-3 text-sm bg-[#DFEDF7] focus:bg-white focus:ring-2 focus:ring-black/20 outline-none font-bold text-slate-800 transition-all";
    const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 pl-1";

    const numberToWords = (num: number): string => {
        const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
        const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

        const numStr = num.toString();
        if (numStr.length > 9) return 'OVERFLOW';

        let n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return '';

        let str = '';
        str += (parseInt(n[1]) !== 0) ? (a[parseInt(n[1])] || b[parseInt(n[1][0])] + ' ' + a[parseInt(n[1][1])]) + 'crore ' : '';
        str += (parseInt(n[2]) !== 0) ? (a[parseInt(n[2])] || b[parseInt(n[2][0])] + ' ' + a[parseInt(n[2][1])]) + 'lakh ' : '';
        str += (parseInt(n[3]) !== 0) ? (a[parseInt(n[3])] || b[parseInt(n[3][0])] + ' ' + a[parseInt(n[3][1])]) + 'thousand ' : '';
        str += (parseInt(n[4]) !== 0) ? (a[parseInt(n[4])] || b[parseInt(n[4][0])] + ' ' + a[parseInt(n[4][1])]) + 'hundred ' : '';
        str += (parseInt(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[parseInt(n[5])] || b[parseInt(n[5][0])] + ' ' + a[parseInt(n[5][1])]) : '';
        return str.toUpperCase();
    };

    const amountToWords = (amount: number): string => {
        const parts = amount.toFixed(2).split('.');
        const dollars = parseInt(parts[0]);
        const cents = parseInt(parts[1]);

        let result = numberToWords(dollars) + ' DOLLARS';
        if (cents > 0) {
            result += ' AND ' + numberToWords(cents) + ' CENTS';
        }
        return result + ' ONLY';
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 print:bg-white">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm shrink-0 z-30 no-print">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2.5 hover:bg-gray-100 transition-all">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="font-black text-xl text-slate-800 tracking-tight">Commercial Invoice Editor</h1>
                        <div className="text-[10px] font-black uppercase text-black tracking-widest">Doc Ref: {invoice.invoiceNo} | Project: {project.title}</div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setViewMode(viewMode === 'EDIT' ? 'PREVIEW' : 'EDIT')} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-5 py-2.5 font-black text-xs uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all">
                        {viewMode === 'EDIT' ? <FileDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />} {viewMode === 'EDIT' ? 'Technical Preview' : 'Technical Editor'}
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-2 bg-black text-white px-6 py-2.5 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-all">
                        <Save className="w-4 h-4" /> Save Record
                    </button>
                </div>
            </header>

            {showSaveToast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-600 text-white px-8 py-4 shadow-2xl font-black uppercase tracking-widest text-xs z-[100] animate-bounce flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5" /> Commercial Document Saved
                </div>
            )}

            <main className="flex-grow overflow-y-auto p-8 bg-slate-100/30 print:p-0 print:bg-white relative">
                <div className="w-full space-y-10 pb-32 no-print">

                    {/* 1. EXPORTER / SHIPPER Section */}
                    <div className="bg-white p-10 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="p-2 bg-gray-100 text-black"><Building2 className="w-5 h-5" /></div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">1. EXPORTER / SHIPPER</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div><label className={labelClass}>Company</label><input className={inputClass} value={invoice.shipperName || ''} onChange={e => updateField('shipperName', e.target.value)} /></div>
                            <div><label className={labelClass}>Factory Address</label><textarea className={`${inputClass} h-20 resize-none`} value={invoice.shipperAddress || ''} onChange={e => updateField('shipperAddress', e.target.value)} /></div>
                        </div>
                    </div>

                    {/* 2. DOCUMENT DETAILS Section */}
                    <div className="bg-white p-10 shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="col-span-full mb-2"><h3 className="font-black text-sm uppercase tracking-widest text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2"><FileText className="w-5 h-5 text-black" /> 2. DOCUMENT DETAILS</h3></div>
                        <div><label className={labelClass}>Invoice No.</label><input className={inputClass} value={invoice.invoiceNo || ''} onChange={e => updateField('invoiceNo', e.target.value)} /></div>
                        <div><label className={labelClass}>Invoice Date</label><input type="date" className={inputClass} value={invoice.invoiceDate || ''} onChange={e => updateField('invoiceDate', e.target.value)} /></div>
                        <div><label className={labelClass}>EXP No.</label><input className={inputClass} value={invoice.expNo || ''} onChange={e => updateField('expNo', e.target.value)} /></div>
                        <div><label className={labelClass}>EXP Date</label><input type="date" className={inputClass} value={invoice.expDate || ''} onChange={e => updateField('expDate', e.target.value)} /></div>
                        <div>
                            <label className={labelClass}>Payment Type</label>
                            <select className={inputClass} value={invoice.paymentType || 'S/C'} onChange={e => updateField('paymentType', e.target.value)}>
                                <option value="S/C">S/C (Sales Contract)</option>
                                <option value="L/C">L/C (Letter of Credit)</option>
                            </select>
                        </div>
                        {(invoice.paymentType || 'S/C') === 'S/C' ? (
                            <>
                                <div><label className={labelClass}>S/C No.</label><input className={inputClass} value={invoice.scNo || ''} onChange={e => updateField('scNo', e.target.value)} /></div>
                                <div><label className={labelClass}>S/C Date</label><input type="date" className={inputClass} value={invoice.scDate || ''} onChange={e => updateField('scDate', e.target.value)} /></div>
                            </>
                        ) : (
                            <>
                                <div><label className={labelClass}>LC No.</label><input className={inputClass} value={invoice.lcNo || ''} onChange={e => updateField('lcNo', e.target.value)} /></div>
                                <div><label className={labelClass}>LC Date</label><input type="date" className={inputClass} value={invoice.lcDate || ''} onChange={e => updateField('lcDate', e.target.value)} /></div>
                            </>
                        )}
                    </div>

                    {/* 3. FOR ACCOUNT AND RISK OF Section */}
                    <div className="bg-white p-10 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="p-2 bg-gray-100 text-black"><UserCircle2 className="w-5 h-5" /></div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">3. FOR ACCOUNT AND RISK OF</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div><label className={labelClass}>Company</label><input className={inputClass} value={invoice.buyerName || ''} onChange={e => updateField('buyerName', e.target.value)} /></div>
                            <div><label className={labelClass}>Address</label><textarea className={`${inputClass} h-20 resize-none`} value={invoice.buyerAddress || ''} onChange={e => updateField('buyerAddress', e.target.value)} /></div>
                            <div><label className={labelClass}>VAT/ID</label><input className={inputClass} value={invoice.buyerVatId || ''} onChange={e => updateField('buyerVatId', e.target.value)} /></div>
                        </div>
                    </div>

                    {/* 4. CONSIGNEE Section */}
                    <div className="bg-white p-10 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="p-2 bg-gray-100 text-black"><MapPin className="w-5 h-5" /></div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">4. CONSIGNEE</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div><label className={labelClass}>Company</label><input className={inputClass} value={invoice.consigneeName || ''} onChange={e => updateField('consigneeName', e.target.value)} /></div>
                            <div><label className={labelClass}>Address</label><textarea className={`${inputClass} h-20 resize-none`} value={invoice.consigneeAddress || ''} onChange={e => updateField('consigneeAddress', e.target.value)} /></div>
                        </div>
                    </div>

                    {/* 5. NOTIFY PARTY 1 Section */}
                    <div className="bg-white p-10 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="p-2 bg-gray-100 text-black"><UserCircle className="w-5 h-5" /></div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">5. NOTIFY PARTY 1</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div><label className={labelClass}>Company</label><input className={inputClass} value={invoice.notifyParty1Name || ''} onChange={e => updateField('notifyParty1Name', e.target.value)} /></div>
                            <div><label className={labelClass}>Address</label><textarea className={`${inputClass} h-20 col-span-2 resize-none`} value={invoice.notifyParty1Address || ''} onChange={e => updateField('notifyParty1Address', e.target.value)} /></div>
                            <div><label className={labelClass}>Telephone</label><input className={inputClass} value={invoice.notifyParty1Phone || ''} onChange={e => updateField('notifyParty1Phone', e.target.value)} /></div>
                            <div><label className={labelClass}>Contact</label><input className={inputClass} value={invoice.notifyParty1Contact || ''} onChange={e => updateField('notifyParty1Contact', e.target.value)} /></div>
                            <div><label className={labelClass}>E-mail</label><input type="email" className={inputClass} value={invoice.notifyParty1Email || ''} onChange={e => updateField('notifyParty1Email', e.target.value)} /></div>
                        </div>
                    </div>

                    {/* 6. NOTIFY PARTY 2 Section */}
                    <div className="bg-white p-10 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="p-2 bg-gray-100 text-black"><UserCircle className="w-5 h-5" /></div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">6. NOTIFY PARTY 2</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div><label className={labelClass}>Company</label><input className={inputClass} value={invoice.notifyParty2Name || ''} onChange={e => updateField('notifyParty2Name', e.target.value)} /></div>
                            <div><label className={labelClass}>Address</label><textarea className={`${inputClass} h-20 resize-none`} value={invoice.notifyParty2Address || ''} onChange={e => updateField('notifyParty2Address', e.target.value)} /></div>
                        </div>
                    </div>

                    {/* 7. NEGOTIATING BANK / TO ORDER OF Section */}
                    <div className="bg-white p-10 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="p-2 bg-gray-100 text-black"><Banknote className="w-5 h-5" /></div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">7. NEGOTIATING BANK / TO ORDER OF</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div><label className={labelClass}>Bank</label><input className={inputClass} value={invoice.bankName || ''} onChange={e => updateField('bankName', e.target.value)} /></div>
                            <div><label className={labelClass}>Branch</label><textarea className={`${inputClass} h-20 col-span-2 resize-none`} value={invoice.bankBranch || ''} onChange={e => updateField('bankBranch', e.target.value)} /></div>
                            <div><label className={labelClass}>SWIFT Code</label><input className={inputClass} value={invoice.bankSwift || ''} onChange={e => updateField('bankSwift', e.target.value)} /></div>
                            <div><label className={labelClass}>A/C No.</label><input className={inputClass} value={invoice.bankAccountNo || ''} onChange={e => updateField('bankAccountNo', e.target.value)} /></div>
                            <div><label className={labelClass}>Export Reg. No.</label><input className={inputClass} value={invoice.exportRegNo || ''} onChange={e => updateField('exportRegNo', e.target.value)} /></div>
                            <div><label className={labelClass}>Export Reg. Date</label><input type="date" className={inputClass} value={invoice.exportRegDate || ''} onChange={e => updateField('exportRegDate', e.target.value)} /></div>
                        </div>
                    </div>

                    {/* 8. SHIPPING INFORMATION Section */}
                    <div className="bg-white p-10 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                            <div className="p-2 bg-gray-100 text-black"><Ship className="w-5 h-5" /></div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">8. SHIPPING INFORMATION</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                            <div><label className={labelClass}>Port of Loading</label><input className={inputClass} value={invoice.portOfLoading || ''} onChange={e => updateField('portOfLoading', e.target.value)} /></div>
                            <div><label className={labelClass}>Final Destination</label><input className={inputClass} value={invoice.finalDestination || ''} onChange={e => updateField('finalDestination', e.target.value)} /></div>
                            <div><label className={labelClass}>Mode of Shipment</label>
                                <select className={inputClass} value={invoice.modeOfShipment || 'BY SEA'} onChange={e => updateField('modeOfShipment', e.target.value)}>
                                    <option value="BY SEA">BY SEA</option>
                                    <option value="BY AIR">BY AIR</option>
                                    <option value="BY ROAD">BY ROAD</option>
                                    <option value="SEA-AIR">SEA-AIR</option>
                                </select>
                            </div>
                            <div><label className={labelClass}>Payment Terms</label>
                                <select className={inputClass} value={invoice.paymentTerms || 'BY TT'} onChange={e => updateField('paymentTerms', e.target.value)}>
                                    <option value="BY TT">BY TT</option>
                                    <option value="BY L/C">BY L/C</option>
                                    <option value="BY DP">BY DP</option>
                                    <option value="BY DA">BY DA</option>
                                </select>
                            </div>
                            <div><label className={labelClass}>Country of Origin</label>
                                <select className={inputClass} value={invoice.countryOfOrigin || 'BANGLADESH'} onChange={e => updateField('countryOfOrigin', e.target.value)}>
                                    <option value="BANGLADESH">BANGLADESH</option>
                                    <option value="CHINA">CHINA</option>
                                    <option value="INDIA">INDIA</option>
                                    <option value="VIETNAM">VIETNAM</option>
                                    <option value="TURKEY">TURKEY</option>
                                </select>
                            </div>
                            <div><label className={labelClass}>B/L Number (Optional)</label><input className={inputClass} value={invoice.blNo || ''} onChange={e => updateField('blNo', e.target.value)} /></div>
                        </div>
                    </div>

                    {/* LINE ITEMS TABLE */}
                    <div className="bg-white p-10 shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 text-black"><Banknote className="w-5 h-5" /></div>
                                <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Commercial Line Items</h3>
                            </div>
                            <button onClick={handleAddLineItem} className="bg-black text-white px-5 py-2.5 font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2"><Plus className="w-4 h-4" /> Add Item</button>
                        </div>
                        <div className="overflow-x-auto border border-slate-100">
                            <table className="w-full border-collapse">
                                <thead className="bg-slate-900 text-white">
                                    <tr>
                                        <th className="p-3 text-left text-[9px] font-black uppercase tracking-widest w-40">Marks & Number</th>
                                        <th className="p-3 text-left text-[9px] font-black uppercase tracking-widest">Description of Goods</th>
                                        <th className="p-3 text-center text-[9px] font-black uppercase tracking-widest w-28">Qty (PCS/CTN)</th>
                                        <th className="p-3 text-center text-[9px] font-black uppercase tracking-widest w-24">Unit Price</th>
                                        <th className="p-3 text-center text-[9px] font-black uppercase tracking-widest w-28">Total Amount</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(invoice.lineItems || []).map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-2">
                                                <textarea className="w-full bg-[#DFEDF7] border-none rounded-lg p-2 text-xs font-bold resize-none h-20" value={item.marksAndNumber || ''} onChange={e => updateLineItem(item.id, 'marksAndNumber', e.target.value)} placeholder="FCBL / PO-XXX" />
                                            </td>
                                            <td className="p-2">
                                                <div className="flex flex-col gap-1.5">
                                                    <div>
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase">Style:</span>
                                                        <input className="w-full bg-[#DFEDF7] border-none rounded-lg p-2 text-xs font-bold" value={item.description || ''} onChange={e => updateLineItem(item.id, 'description', e.target.value)} placeholder="Product Name / Style" />
                                                    </div>
                                                    <div>
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase">Composition:</span>
                                                        <input className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] italic" value={item.composition || ''} onChange={e => updateLineItem(item.id, 'composition', e.target.value)} placeholder="100% Cotton Knitted Sweater" />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div>
                                                            <span className="text-[8px] text-slate-400 font-bold uppercase">Order No:</span>
                                                            <input className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px] font-mono" value={item.orderNo || ''} onChange={e => updateLineItem(item.id, 'orderNo', e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <span className="text-[8px] text-slate-400 font-bold uppercase">Style No:</span>
                                                            <input className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px] font-mono" value={item.styleNo || ''} onChange={e => updateLineItem(item.id, 'styleNo', e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <span className="text-[8px] text-slate-400 font-bold uppercase">HS Code:</span>
                                                            <input className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px] font-mono" value={item.hsCode || ''} onChange={e => updateLineItem(item.id, 'hsCode', e.target.value)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-center">
                                                        <span className="text-[8px] text-slate-400 font-bold">PCS</span>
                                                        <input type="number" className="w-full bg-[#DFEDF7] border-none rounded-lg p-2 text-xs text-center font-black" value={item.quantity || ''} onChange={e => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-[8px] text-slate-400 font-bold">CTN</span>
                                                        <input type="number" className="w-full bg-slate-100 border-none rounded-lg p-2 text-xs text-center font-bold" value={item.cartons || ''} onChange={e => updateLineItem(item.id, 'cartons', parseInt(e.target.value) || 0)} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2"><input type="number" step="0.01" className="w-full bg-[#DFEDF7] border-none rounded-lg p-2 text-xs text-center font-black text-indigo-600" value={item.unitPrice || ''} onChange={e => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} /></td>
                                            <td className="p-3 text-center font-black text-slate-600 bg-slate-50">${(item.totalAmount || 0).toFixed(2)}</td>
                                            <td className="p-2 text-center"><button onClick={() => deleteLineItem(item.id)} className="text-slate-300 hover:text-red-500 p-2 transition-all"><Trash2 className="w-4 h-4" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-100 border-t-2 border-slate-900 font-black">
                                    <tr>
                                        <td className="p-4 text-right uppercase tracking-widest text-[10px]">Grand Totals:</td>
                                        <td></td>
                                        <td className="p-4 text-center text-xs">
                                            <div>{totals.qty} PCS</div>
                                            <div className="text-slate-500">{totals.cartons} CTN</div>
                                        </td>
                                        <td></td>
                                        <td className="p-4 text-center text-sm text-indigo-700">${totals.amount.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* AUTO-FILL FROM PACKING LIST */}
                        <div className="mt-6 p-4 bg-amber-50 border border-amber-200">
                            <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-2">
                                <Ship className="w-4 h-4" /> Auto-Fill from Packing List
                            </div>
                            <div className="grid grid-cols-5 gap-4 text-center">
                                <div className="bg-white p-3 border border-amber-100">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Total PCS</div>
                                    <div className="text-lg font-black text-slate-800">{packingData.totalUnits.toLocaleString()}</div>
                                </div>
                                <div className="bg-white p-3 border border-amber-100">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Total Cartons</div>
                                    <div className="text-lg font-black text-slate-800">{packingData.totalCartons}</div>
                                </div>
                                <div className="bg-white p-3 border border-amber-100">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Net Weight</div>
                                    <div className="text-lg font-black text-slate-800">{packingData.netWeight} KG</div>
                                </div>
                                <div className="bg-white p-3 border border-amber-100">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Gross Weight</div>
                                    <div className="text-lg font-black text-slate-800">{packingData.grossWeight} KG</div>
                                </div>
                                <div className="bg-white p-3 border border-amber-100">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Total CBM</div>
                                    <div className="text-lg font-black text-slate-800">{packingData.totalCbm} m³</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-10 shadow-sm border border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                            <div><label className={labelClass}>Net Weight (kg)</label><input type="number" className={inputClass} value={invoice.netWeight || ''} onChange={e => updateField('netWeight', parseFloat(e.target.value) || 0)} /></div>
                            <div><label className={labelClass}>Gross Weight (kg)</label><input type="number" className={inputClass} value={invoice.grossWeight || ''} onChange={e => updateField('grossWeight', parseFloat(e.target.value) || 0)} /></div>
                            <div><label className={labelClass}>Total CBM (m³)</label><input type="number" step="0.01" className={inputClass} value={invoice.totalCbm || ''} onChange={e => updateField('totalCbm', parseFloat(e.target.value) || 0)} /></div>
                        </div>
                        <div><label className={labelClass}>REX Declaration / Customs Statement</label><textarea className={`${inputClass} h-32 resize-none font-mono text-[11px]`} value={invoice.rexDeclaration || ''} onChange={e => updateField('rexDeclaration', e.target.value)} /></div>
                    </div>

                    {/* NEW: TECHNICAL COMMENTS & ATTACHMENTS SYSTEM FOOTER */}
                    <div className="mt-12 pt-10 border-t-2 border-slate-200">
                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 mb-8 flex items-center gap-3">
                            <span className="w-8 h-8 bg-black text-white rounded flex items-center justify-center text-xs">CI</span>
                            Technical Comments & Documentation
                        </h3>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* COMMENTS PANEL */}
                            <div className="bg-white p-8 shadow-sm border border-slate-200 flex flex-col h-[500px]">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-indigo-500" /> Commercial Remarks
                                    </h4>
                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{(invoice.comments || []).length} Records</span>
                                </div>

                                <div className="flex-grow overflow-y-auto space-y-4 mb-6 pr-2">
                                    {(invoice.comments || []).map((c) => (
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
                                    {(invoice.comments || []).length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 italic">
                                            <MessageSquare className="w-8 h-8 opacity-20" />
                                            <p className="text-xs font-bold">No documentation notes</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto">
                                    <textarea
                                        className="w-full bg-[#DFEDF7] border border-slate-200 rounded-2xl p-4 text-xs font-bold focus:bg-white outline-none mb-3 resize-none h-24"
                                        placeholder="Add a new documentation comment..."
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                    />
                                    <button
                                        onClick={editingCommentId ? saveEditedComment : addComment}
                                        className="w-full bg-black text-white py-3 font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        {editingCommentId ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                        {editingCommentId ? 'Update Record' : 'Post Comment'}
                                    </button>
                                </div>
                            </div>

                            {/* ATTACHMENTS PANEL */}
                            <div className="bg-white p-8 shadow-sm border border-slate-200 flex flex-col h-[500px]">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Paperclip className="w-4 h-4 text-indigo-500" /> Technical Documents
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
                                    {(invoice.attachments || []).map((att) => (
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
                                    {(invoice.attachments || []).length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 italic">
                                            <Paperclip className="w-8 h-8 opacity-20" />
                                            <p className="text-xs font-bold">No documents attached</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                    <p className="text-[9px] font-black uppercase text-indigo-400 tracking-tighter mb-1">Commercial Note</p>
                                    <p className="text-[10px] font-bold text-indigo-900 leading-relaxed italic">Attach B/L copies, EXP certificates, and L/C relevant documentation here.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PREVIEW CONTENT */}
                {viewMode === 'PREVIEW' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm print:relative print:p-0 print:bg-white no-print">
                        <div className="bg-white w-full max-w-6xl max-h-[95vh] rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col print:max-w-none print:max-h-none print:shadow-none print:rounded-none">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gray-50/50 no-print">
                                <h2 className="font-black text-lg uppercase tracking-tight text-slate-800">Commercial Document Preview</h2>
                                <div className="flex gap-2">
                                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-black text-white px-5 py-2.5 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-all">
                                        <FileDown className="w-4 h-4" /> Download PDF
                                    </button>
                                    <button onClick={() => setViewMode('EDIT')} className="p-3 hover:bg-gray-200 rounded-2xl transition-all">
                                        <X className="w-6 h-6 text-gray-400" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 md:p-8 overflow-y-auto bg-gray-100 flex-grow print:p-0 print:overflow-visible flex flex-col items-center">
                                <div id="invoice-preview-content" className="bg-white text-black print:w-full" style={{ width: '210mm', padding: '6mm', boxSizing: 'border-box', overflow: 'visible', fontFamily: 'Arial, sans-serif', fontSize: '9px' }}>

                                    {/* HEADER SECTION */}
                                    <div className="text-center mb-0">
                                        <h1 className="font-bold leading-tight uppercase" style={{ fontSize: '14px' }}>
                                            CROWN EXCLUSIVE WEARS LTD.
                                        </h1>
                                        <p className="font-bold uppercase tracking-wider mb-1" style={{ fontSize: '7px' }}>
                                            FACTORY: MAWNA, SREEPUR, GAZIPUR-1740, BANGLADESH.
                                        </p>
                                        <div className="border-t-[1pt] border-black mt-0.5 mb-1"></div>
                                        <div className="border-t-[0.5pt] border-black mb-1"></div>
                                        <h2 className="font-bold uppercase underline inline-block mb-1" style={{ fontSize: '10px' }}>
                                            COMMERCIAL INVOICE
                                        </h2>
                                    </div>

                                    {/* MAIN CONTENT GRID */}
                                    <div className="grid grid-cols-[1.2fr_0.8fr] border-[1pt] border-black">
                                        {/* LEFT COLUMN */}
                                        <div className="border-r-[1pt] border-black">
                                            <div className="p-1 border-b-[1pt] border-black">
                                                <span className="text-[7px] font-bold block underline">SHIPPER / EXPORTER :</span>
                                                <div className="text-[8px] mt-1 leading-tight font-bold">
                                                    {invoice.shipperName || 'CROWN EXCLUSIVE WEARS LTD.'}
                                                </div>
                                                <div className="text-[7px] leading-tight whitespace-pre-wrap mt-0.5">
                                                    {invoice.shipperAddress || 'MAWNA, SREEPUR, GAZIPUR-1740,\nBANGLADESH.'}
                                                </div>
                                            </div>
                                            <div className="p-1 border-b-[1pt] border-black">
                                                <span className="text-[7px] font-bold block underline">FOR ACCOUNT AND RISK OF:</span>
                                                <div className="text-[8px] mt-1 leading-tight font-bold">
                                                    {invoice.buyerName || '-'}
                                                </div>
                                                <div className="text-[7px] leading-tight whitespace-pre-wrap mt-0.5">
                                                    {invoice.buyerAddress || '-'}
                                                </div>
                                                <div className="text-[7px] leading-tight mt-1 uppercase font-bold">
                                                    VAT/ID: {invoice.buyerVatId || '-'}
                                                </div>
                                            </div>
                                            <div className="p-1 border-b-[1pt] border-black">
                                                <span className="text-[7px] font-bold block underline">NOTIFY PARTY:</span>
                                                <div className="text-[8px] leading-tight mt-1">
                                                    <span className="font-bold">1. </span>
                                                    {invoice.notifyParty1Name || '-'}
                                                </div>
                                                <div className="text-[7px] leading-tight whitespace-pre-wrap pl-3">
                                                    {invoice.notifyParty1Address || '-'}
                                                </div>
                                                <div className="text-[7px] leading-tight mt-1 pl-3 font-bold">
                                                    TEL: {invoice.notifyParty1Phone || '-'}, CONTRACT: {invoice.notifyParty1Contact || '-'}
                                                </div>
                                                <div className="text-[7px] leading-tight pl-3 font-bold">
                                                    E-MAIL: {invoice.notifyParty1Email || '-'}
                                                </div>

                                                <div className="text-[8px] leading-tight mt-2">
                                                    <span className="font-bold">2. </span>
                                                    {invoice.notifyParty2Name || '-'}
                                                </div>
                                                <div className="text-[7px] leading-tight whitespace-pre-wrap pl-3">
                                                    {invoice.notifyParty2Address || '-'}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 divide-x-[1pt] divide-black">
                                                <div className="p-1">
                                                    <span className="text-[6px] font-bold block text-center">PORT OF LOADING:</span>
                                                    <div className="text-[7px] font-bold text-center mt-1 leading-tight uppercase">
                                                        {invoice.portOfLoading || '-'}
                                                    </div>
                                                </div>
                                                <div className="p-1">
                                                    <span className="text-[6px] font-bold block text-center">FINAL DESTINATION:</span>
                                                    <div className="text-[7px] font-bold text-center mt-1 leading-tight uppercase">
                                                        {invoice.finalDestination || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT COLUMN */}
                                        <div className="flex flex-col">
                                            <div className="p-1 border-b-[1pt] border-black">
                                                <span className="text-[7px] font-bold block underline">DOCUMENTS DETAILS:</span>
                                                <div className="grid grid-cols-[85px_1fr_35px_1fr] text-[7px] mt-1 gap-y-0.5 items-center">
                                                    <span className="font-medium">INVOICE NO.:</span>
                                                    <span className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>{invoice.invoiceNo || '-'}</span>
                                                    <span className="font-medium">DATE:</span>
                                                    <span className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>{invoice.invoiceDate || '-'}</span>

                                                    <span className="font-medium">EXP NO.:</span>
                                                    <span className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>{invoice.expNo || '-'}</span>
                                                    <span className="font-medium">DATE:</span>
                                                    <span className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>{invoice.expDate || '-'}</span>

                                                    {(invoice.paymentType || 'S/C') === 'S/C' ? (
                                                        <>
                                                            {(invoice.scNo || invoice.scDate) && (
                                                                <>
                                                                    <span className="font-medium">S/C NO:</span>
                                                                    <span className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>{invoice.scNo || '-'}</span>
                                                                    <span className="font-medium">DATE:</span>
                                                                    <span className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>{invoice.scDate || '-'}</span>
                                                                </>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {(invoice.lcNo || invoice.lcDate) && (
                                                                <>
                                                                    <span className="font-medium">L/C NO:</span>
                                                                    <span className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>{invoice.lcNo || '-'}</span>
                                                                    <span className="font-medium">DATE:</span>
                                                                    <span className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>{invoice.lcDate || '-'}</span>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-1 border-b-[1pt] border-black">
                                                <span className="text-[7px] font-bold block underline">CONSIGNEE:</span>
                                                <div className="text-[8px] mt-1 leading-tight font-bold">
                                                    {invoice.consigneeName || '-'}
                                                </div>
                                                <div className="text-[7px] leading-tight whitespace-pre-wrap mt-0.5">
                                                    {invoice.consigneeAddress || '-'}
                                                </div>
                                            </div>
                                            <div className="p-1 border-b-[1pt] border-black">
                                                <span className="text-[7px] font-bold block underline">NEGOTIATING BANK/TO ORDER OF:</span>
                                                <div className="text-[7px] mt-1">
                                                    <span className="font-bold underline text-[6px]">SHIPPER BANK:</span>
                                                    <div className="font-bold leading-tight mt-0.5">{invoice.bankName || '-'}</div>
                                                    <div className="leading-tight mt-0.5 whitespace-pre-wrap text-[6px]">{invoice.bankBranch || '-'}</div>
                                                    <div className="grid grid-cols-[75px_1fr] mt-0.5 gap-y-0.1">
                                                        <span>SWIFT CODE:</span><span className="font-bold uppercase" style={{ fontFamily: 'Roboto Mono, monospace' }}>{invoice.bankSwift || '-'}</span>
                                                        <span>A/C NO:</span><span className="font-bold uppercase" style={{ fontFamily: 'Roboto Mono, monospace' }}>{invoice.bankAccountNo || '-'}</span>
                                                        <span className="text-[5px]">EXPT REG. NO.:</span><span className="font-bold text-[6px] uppercase" style={{ fontFamily: 'Roboto Mono, monospace' }}>{invoice.exportRegNo || '-'}</span>
                                                        <span>DATE:</span><span className="font-bold uppercase" style={{ fontFamily: 'Roboto Mono, monospace' }}>{invoice.exportRegDate || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col flex-grow divide-y-[1pt] divide-black">
                                                <div className="p-1 grid grid-cols-[100px_1fr] text-[7px]">
                                                    <span className="font-bold">PAYMENT TERMS:</span>
                                                    <span className="font-bold uppercase">BY {invoice.paymentTerms || '-'}</span>
                                                </div>
                                                <div className="p-1 grid grid-cols-[100px_1fr] text-[7px]">
                                                    <span className="font-bold">MODE OF SHIP:</span>
                                                    <div className="flex items-center">
                                                        <span className="font-bold px-3 bg-yellow-300 print:bg-yellow-300 uppercase">{invoice.modeOfShipment || '-'}</span>
                                                    </div>
                                                </div>
                                                <div className="p-1 grid grid-cols-[50px_1fr_40px_1fr] text-[7px]">
                                                    <span className="font-bold">BL NO.:</span>
                                                    <span className="font-bold uppercase">{invoice.blNo || '-'}</span>
                                                    <span className="font-bold">DATE:</span>
                                                    <span className="font-bold uppercase">{invoice.blDate || '-'}</span>
                                                </div>
                                                <div className="p-1 grid grid-cols-[100px_1fr] text-[7px]">
                                                    <span className="font-bold">COUNTRY OF ORIGIN:</span>
                                                    <span className="font-bold uppercase">{invoice.countryOfOrigin || 'BANGLADESH'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PRODUCT DETAILS TABLE */}
                                    <table className="w-full border-x-[1pt] border-b-[1pt] border-black border-collapse mt-0">
                                        <thead>
                                            <tr className="border-y-[1pt] border-black text-[6px] font-bold">
                                                <th className="border-r-[1pt] border-black p-1 text-left">MARKS & NUMBER</th>
                                                <th className="border-r-[1pt] border-black p-1 text-left">DESCRIPTION OF GOODS</th>
                                                <th className="border-r-[1pt] border-black p-1 text-center">QTY (PCS/CTN)</th>
                                                <th className="border-r-[1pt] border-black p-1 text-right">UNIT PRICE</th>
                                                <th className="p-1 text-right">TOTAL US$</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-[7px] leading-tight font-bold">
                                            <tr>
                                                <td className="border-r-[1pt] border-black p-1 align-top">
                                                    <div className="underline mb-1 text-[6px]">SHIPPING MARKS</div>
                                                    <div className="text-[5px] font-medium leading-[1.1]">
                                                        <p>Bershka</p>
                                                        <p>IVAN-POLIGONO INDITEX.</p>
                                                        <p>CTRA. LOCAL TORDERA-PALAFOLLS</p>
                                                        <p>KM 0,9. 08389 PALAFOLLS</p>
                                                        <p>BARCELONA-ESPANA.</p>
                                                        <div className="mt-1 grid grid-cols-[90px_1fr] gap-x-0.5 text-[5px]">
                                                            <span>DIVISION</span><span>:</span>
                                                            <span>INDITEX STYLE NO.</span><span>:</span>
                                                            <span>COLOUR</span><span>:</span>
                                                            <span>SIZE</span><span>:</span>
                                                            <span>LOTS QUANTITY</span><span>:</span>
                                                            <span>SUPPLIER</span><span>:</span>
                                                            <span>INDITEX INVOICE NUMBER</span><span>:</span>
                                                            <span>ORDER NUMBER</span><span>:</span>
                                                            <span>CARTON NO.</span><span>:</span>
                                                            <span>TOTAL CARTONS</span><span>:</span>
                                                            <span>UNITS QUANTITY</span><span>:</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="border-r-[1pt] border-black p-1 align-top">
                                                    {(invoice.lineItems || []).map((item, idx) => (
                                                        <div key={item.id} className={idx > 0 ? 'mt-3 border-t border-dotted border-gray-300 pt-1.5' : ''}>
                                                            <div className="uppercase font-bold text-[7px]">{item.description}</div>
                                                            <div className="text-[6px] font-medium italic mt-0.5">{item.composition}</div>
                                                            <div className="mt-1.5 text-[6px] font-bold grid grid-cols-[80px_1fr] gap-y-0.1">
                                                                <span>ORDER NO.</span><span style={{ fontFamily: 'Roboto Mono, monospace' }}>: {item.orderNo}</span>
                                                                <span>STYLE NO.</span><span style={{ fontFamily: 'Roboto Mono, monospace' }}>: {item.styleNo}</span>
                                                                <div className="mt-1"></div><div></div>
                                                                <span>H.S. CODE NO.</span><span style={{ fontFamily: 'Roboto Mono, monospace' }}>: {item.hsCode}</span>
                                                                <span>CAT</span><span>: 05</span>
                                                            </div>
                                                        </div>
                                                    ))}

                                                </td>
                                                <td className="border-r-[1pt] border-black p-0 align-top">
                                                    <div className="grid grid-cols-2 divide-x-[1pt] divide-black border-b-[1pt] border-black text-center items-center uppercase text-[5px] py-0.5">
                                                        <span>PCS</span>
                                                        <span>CTN</span>
                                                    </div>
                                                    {(invoice.lineItems || []).map((item, idx) => (
                                                        <div key={item.id} className={`grid grid-cols-2 divide-x-[1pt] divide-black text-center items-center text-[7px] py-1`}>
                                                            <div className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>{item.quantity}</div>
                                                            <div className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>{item.cartons}</div>
                                                        </div>
                                                    ))}
                                                </td>
                                                <td className="border-r-[1pt] border-black p-1 align-top text-right pr-2">
                                                    {(invoice.lineItems || []).map((item) => (
                                                        <div key={item.id} className="flex items-center justify-end font-bold text-[7px] py-1">
                                                            $ <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    ))}
                                                </td>
                                                <td className="p-1 align-top text-right pr-2">
                                                    {(invoice.lineItems || []).map((item) => (
                                                        <div key={item.id} className="flex items-center justify-end font-bold text-[7px] py-1">
                                                            $ <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    ))}
                                                </td>
                                            </tr>
                                            {/* TOTAL ROW */}
                                            <tr className="border-y-[1pt] border-black">
                                                <td className="border-r-[1pt] border-black"></td>
                                                <td className="border-r-[1pt] border-black p-1 text-right font-bold pr-2 bg-gray-50">TOTAL =</td>
                                                <td className="border-r-[1pt] border-black p-0">
                                                    <div className="grid grid-cols-2 divide-x-[1pt] divide-black text-center h-full items-center font-black">
                                                        <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{totals.qty} PCS</span>
                                                        <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{totals.cartons} CTN</span>
                                                    </div>
                                                </td>
                                                <td className="border-r-[1pt] border-black"></td>
                                                <td className="p-1 text-right pr-2 font-black bg-gray-50 uppercase text-[7px]">$ <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{totals.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                                            </tr>
                                            {/* AMOUNT IN WORDS */}
                                            <tr className="border-t-[1pt] border-black">
                                                <td colSpan={5} className="p-1 pt-1.5 font-bold text-[7px] uppercase italic">
                                                    (SAY US DOLLAR: {amountToWords(totals.amount)})
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    {/* SHIPMENT DETAILS AND REX SECTION */}
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <div className="border-[1pt] border-black p-1 text-[6px] leading-tight">
                                            <div className="font-bold underline mb-1">SHIPMENT DETAILS:</div>
                                            <div className="grid grid-cols-[90px_1fr] gap-y-0.5">
                                                <span>TOTAL CARTONS</span><span className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>: {totals.cartons} CTNS</span>
                                                <span>TOTAL NET WEIGHT</span><span className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>: {invoice.netWeight} KGS</span>
                                                <span>TOTAL GROSS WEIGHT</span><span className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>: {invoice.grossWeight} KGS</span>
                                                <span>VESSEL/FLIGHT</span><span className="font-bold uppercase">: {(invoice as any).vesselFlight || '-'}</span>
                                                <span>ETD</span><span className="font-bold" style={{ fontFamily: 'Roboto Mono, monospace' }}>: {(invoice as any).etd || '-'}</span>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col justify-end pb-1 pr-1 font-bold">
                                            <div className="text-[7px] uppercase">FOR CROWN EXCLUSIVE WEARS LTD.</div>
                                            <div className="h-6"></div>
                                            <div className="text-[7px] underline">AUTHORIZED SIGNATORY</div>
                                        </div>
                                    </div>

                                    <div className="mt-3 text-[6px] leading-tight border-t-[0.8pt] border-black pt-2 italic">
                                        <p className="font-bold">
                                            "THE EXPORTER OF THE PRODUCTS COVERED BY THIS DOCUMENT (REX NO: <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{(invoice as any).rexNo || 'BDREX202100000000'}</span>) DECLARES THAT, EXCEPT WHERE OTHERWISE CLEARLY INDICATED, THESE PRODUCTS ARE OF BANGLADESH PREFERENTIAL ORIGIN ACCORDING TO THE RULES OF ORIGIN OF THE GENERALIZED SYSTEM OF PREFERENCES OF THE EUROPEAN UNION AND THAT THE ORIGIN CRITERIA MET IS "W" <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{invoice.lineItems?.[0]?.hsCode || '6110'}</span>."
                                        </p>
                                    </div>

                                    {/* BOTTOM MARGIN FOR PRINT */}
                                    <div className="h-4"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default InvoiceEditor;
