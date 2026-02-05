import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, OrderSheet, OrderBreakdown, ColorSizeRow, POAccessories } from '../types';
import { ArrowLeft, Save, Printer, FileDown, Plus, Trash2, Building2, ShoppingCart, Truck, MapPin, CheckCircle2, Eye, Edit3, X, Image as ImageIcon, RotateCcw, Download, Package, LayoutPanelTop, Box, CheckSquare, Layers } from 'lucide-react';

// For PDF generation
declare var html2pdf: any;

interface OrderSheetEditorProps {
  project: Project;
  onUpdate: (updatedPO: OrderSheet) => void;
  onBack: () => void;
  onSave: () => void;
}

// Default size columns for new breakdown tables
const DEFAULT_SIZE_COLUMNS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Helper to calculate row total from dynamic sizes
const calculateRowTotal = (sizes: { [key: string]: number }) =>
  Object.values(sizes).reduce((sum, val) => sum + (Number(val) || 0), 0);

// Helper to create empty sizes object from columns
const createEmptySizes = (columns: string[]) =>
  columns.reduce((acc, col) => ({ ...acc, [col]: 0 }), {} as { [key: string]: number });

const INITIAL_PO: OrderSheet = {
  id: `PO-${Date.now()}`,
  companyName: 'FASHION COMFORT USA LLC',
  companyAddress: '123 Fashion Ave, New York, NY 10001, USA',
  companyEmail1: 'orders@fashioncomfort.com',
  companyEmail2: 'billing@fashioncomfort.com',
  poNumber: 'FC-US-2025-001',
  poNumbers: [
    { id: 'po-default', number: 'FC-US-2025-001', quantity: 0, deliveryDate: '' }
  ],
  factoryName: 'ASDWA FASHION LTD',
  factoryAddress: 'Industrial Zone, Dhaka, Bangladesh',
  factoryBin: 'BIN-BD-12345678',
  buyerName: 'FASHION COMFORT USA LLC',
  buyerAddress: '123 Fashion Ave, New York, NY 10001, USA',
  consigneeName: 'FASHION COMFORT LOGISTICS',
  consigneeAddress: 'Warehouse 45, Port of New Jersey, USA',
  shipmentDate: new Date().toISOString().split('T')[0],
  incoterms: 'FOB Chittagong',
  paymentMethod: 'TT',
  poDate: new Date().toISOString().split('T')[0],
  season: 'SS26',
  currency: 'USD',
  contractNo: 'CONT-10293',
  paymentTerms: '60 Days after BL',
  rnNumber: 'RN# 998877',
  exFactoryDate: '',
  shipmentMethod: 'SEA',
  originCountry: 'Bangladesh',
  portOfLading: 'Chittagong',
  dischargePort: 'New Jersey',
  hsCode: '6110.20.00',
  styleName: 'CHILL THREAD',
  styleCode: 'CT-900',
  fabricWeight: '180 GSM',
  composition: '100% COTTON',
  gauge: '12GG',
  sizeRatio: '2:3:3:2:1',
  unitPrice: 17.00,
  productImageUrl: '',
  breakdowns: [
    {
      id: 'breakdown-1',
      poNumber: 'FC-US-2025-001',
      sizeColumns: DEFAULT_SIZE_COLUMNS,
      sizeRows: [
        { id: '1', colorCode: 'BLACK / 900', sizes: { 'XS': 0, 'S': 12, 'M': 18, 'L': 18, 'XL': 12, 'XXL': 6 }, total: 66 }
      ]
    }
  ],
  accessories: {
    mainLabel: '1 pc per garment',
    careLabel: '1 pc per garment',
    hangTag: '1 pc per garment',
    polybag: 'Individual poly',
    carton: 'Standard Export'
  },
  remarks: [
    'All garments must meet AQL 2.5 standards.',
    'Color matching must be within 5% tolerance of approved lab dip.',
    'Packing must strictly follow instructions provided in the packing manual.',
    'Shipping documents must reach the buyer 7 days before ETA.',
    'Notification of delay must be sent at least 15 days before ex-factory date.'
  ]
};

const OrderSheetEditor: React.FC<OrderSheetEditorProps> = ({ project, onUpdate, onBack, onSave }) => {
  const [viewMode, setViewMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [formData, setFormData] = useState<OrderSheet>(() => {
    const existing = project.orderSheet;
    if (!existing) return INITIAL_PO;

    // Migration logic for old data formats
    let migratedData = existing;

    // Handle very old format with sizeRows at root level
    if (!existing.breakdowns && (existing as any).sizeRows) {
      migratedData = {
        ...existing,
        breakdowns: [
          {
            id: 'legacy-breakdown',
            poNumber: existing.poNumber || 'Legacy',
            sizeColumns: DEFAULT_SIZE_COLUMNS,
            sizeRows: (existing as any).sizeRows
          }
        ]
      };
    }

    // Migrate breakdowns from old fixed-size format to new dynamic format
    if (migratedData.breakdowns) {
      migratedData = {
        ...migratedData,
        breakdowns: migratedData.breakdowns.map(b => {
          // Add sizeColumns if missing
          if (!b.sizeColumns) {
            b = { ...b, sizeColumns: DEFAULT_SIZE_COLUMNS };
          }
          // Convert old s/m/l/xl/xxl to sizes object if needed
          b = {
            ...b,
            sizeRows: b.sizeRows.map(row => {
              if (!row.sizes) {
                const oldRow = row as any;
                return {
                  id: row.id,
                  colorCode: row.colorCode,
                  sizes: {
                    'XS': oldRow.xs || 0,
                    'S': oldRow.s || 0,
                    'M': oldRow.m || 0,
                    'L': oldRow.l || 0,
                    'XL': oldRow.xl || 0,
                    'XXL': oldRow.xxl || 0
                  },
                  total: row.total
                };
              }
              return row;
            })
          };
          return b;
        })
      };
    }

    return migratedData;
  });

  const [showSaveToast, setShowSaveToast] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Auto-populate from Project/Tech Pack data
  useEffect(() => {
    // Only auto-populate if form data is at initial/default state
    const isDefaultStyleName = formData.styleName === 'CHILL THREAD';
    const isDefaultPONumbers = !formData.poNumbers || formData.poNumbers.length === 0 ||
      (formData.poNumbers.length === 1 && formData.poNumbers[0].number === 'FC-US-2025-001');

    const updates: Partial<OrderSheet> = {};

    // Auto-fill Style Name from project title if still at default
    if (isDefaultStyleName && project.title && project.title !== 'CHILL THREAD') {
      updates.styleName = project.title;
    }

    // Auto-fill PO Numbers from project if still at default
    if (isDefaultPONumbers && project.poNumbers && project.poNumbers.length > 0) {
      updates.poNumbers = project.poNumbers.map(po => ({
        id: po.id,
        number: po.number,
        quantity: po.quantity || 0,
        deliveryDate: po.deliveryDate || ''
      }));
      updates.poNumber = project.poNumbers[0].number;
    }

    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [project.title, project.poNumbers]);

  // Auto-create breakdown tables for each PO Number from Tech Pack
  // This runs only once when the component mounts and project has POs
  const hasInitializedBreakdowns = useRef(false);

  useEffect(() => {
    // Only run initialization once
    if (hasInitializedBreakdowns.current) return;

    const projectPOs = project.poNumbers || [];
    if (projectPOs.length === 0) return;

    // Mark as initialized
    hasInitializedBreakdowns.current = true;

    // Check if current breakdowns are just the default/initial ones
    const isUsingDefaultBreakdowns = formData.breakdowns.length === 1 &&
      (formData.breakdowns[0].id === 'breakdown-1' ||
        formData.breakdowns[0].poNumber === 'FC-US-2025-001');

    // If using default breakdowns, replace them with project PO breakdowns
    if (isUsingDefaultBreakdowns) {
      const projectBreakdowns: OrderBreakdown[] = projectPOs.map((po, idx) => ({
        id: `breakdown-auto-${po.id}`,
        poNumber: po.number,
        sizeColumns: DEFAULT_SIZE_COLUMNS,
        isAutoCreated: true,
        isEdited: false,
        sizeRows: [
          { id: `row-auto-${idx}`, colorCode: '', sizes: createEmptySizes(DEFAULT_SIZE_COLUMNS), total: 0 }
        ]
      }));

      setFormData(prev => ({
        ...prev,
        breakdowns: projectBreakdowns
      }));
    } else {
      // If user has existing breakdowns, only add missing POs
      const existingPONumbers = new Set(formData.breakdowns.map(b => b.poNumber));
      const newBreakdowns: OrderBreakdown[] = [];

      projectPOs.forEach((po, idx) => {
        if (!existingPONumbers.has(po.number)) {
          newBreakdowns.push({
            id: `breakdown-auto-${po.id}`,
            poNumber: po.number,
            sizeColumns: DEFAULT_SIZE_COLUMNS,
            isAutoCreated: true,
            isEdited: false,
            sizeRows: [
              { id: `row-auto-${idx}`, colorCode: '', sizes: createEmptySizes(DEFAULT_SIZE_COLUMNS), total: 0 }
            ]
          });
        }
      });

      if (newBreakdowns.length > 0) {
        setFormData(prev => ({
          ...prev,
          breakdowns: [...prev.breakdowns, ...newBreakdowns]
        }));
      }
    }
  }, [project.poNumbers]);

  const totals = useMemo(() => {
    let qtyTotal = 0;
    const sizeTotals: { [key: string]: number } = {};

    (formData.breakdowns || []).forEach(breakdown => {
      (breakdown.sizeRows || []).forEach(row => {
        // Aggregate totals per size column
        Object.entries(row.sizes || {}).forEach(([size, qty]) => {
          sizeTotals[size] = (sizeTotals[size] || 0) + (Number(qty) || 0);
        });
        qtyTotal += (Number(row.total) || 0);
      });
    });

    const amountTotal = qtyTotal * (formData.unitPrice || 0);

    return { sizeTotals, qtyTotal, amountTotal };
  }, [formData.breakdowns, formData.unitPrice]);

  const updateField = (field: keyof OrderSheet, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateAccessory = (field: keyof POAccessories, value: string) => {
    setFormData(prev => ({ ...prev, accessories: { ...prev.accessories, [field]: value } }));
  };

  // Update PO Number quantity or delivery date
  const updatePOField = (poId: string, field: 'quantity' | 'deliveryDate', value: number | string) => {
    setFormData(prev => ({
      ...prev,
      poNumbers: (prev.poNumbers || []).map(po =>
        po.id === poId ? { ...po, [field]: value } : po
      )
    }));
  };

  // Add new PO Number
  const addPONumber = () => {
    const newPO = {
      id: `po-${Date.now()}`,
      number: '',
      quantity: 0,
      deliveryDate: ''
    };
    setFormData(prev => ({
      ...prev,
      poNumbers: [...(prev.poNumbers || []), newPO]
    }));
  };

  // Update PO Number value
  const updatePONumber = (poId: string, number: string) => {
    setFormData(prev => ({
      ...prev,
      poNumbers: (prev.poNumbers || []).map(po =>
        po.id === poId ? { ...po, number } : po
      )
    }));
  };

  // Delete PO Number
  const deletePONumber = (poId: string) => {
    if ((formData.poNumbers || []).length <= 1) {
      return alert("At least one PO Number is required.");
    }
    setFormData(prev => ({
      ...prev,
      poNumbers: (prev.poNumbers || []).filter(po => po.id !== poId)
    }));
  };

  // MULTI-BREAKDOWN LOGIC
  const addBreakdownTable = () => {
    const newBreakdown: OrderBreakdown = {
      id: `breakdown-${Date.now()}`,
      poNumber: 'Custom PO',
      sizeColumns: DEFAULT_SIZE_COLUMNS,
      isAutoCreated: false,
      isEdited: true,
      sizeRows: [
        { id: `row-${Date.now()}`, colorCode: '', sizes: createEmptySizes(DEFAULT_SIZE_COLUMNS), total: 0 }
      ]
    };
    updateField('breakdowns', [...formData.breakdowns, newBreakdown]);
  };

  const deleteBreakdownTable = (id: string) => {
    if (formData.breakdowns.length <= 1) return alert("At least one breakdown table is required.");
    if (confirm("Permanently remove this breakdown table?")) {
      updateField('breakdowns', formData.breakdowns.filter(b => b.id !== id));
    }
  };

  const updateBreakdownPO = (id: string, poNumber: string) => {
    updateField('breakdowns', formData.breakdowns.map(b => b.id === id ? { ...b, poNumber, isEdited: true } : b));
  };

  const addSizeRow = (breakdownId: string) => {
    const updatedBreakdowns = formData.breakdowns.map(b => {
      if (b.id === breakdownId) {
        const newRow: ColorSizeRow = {
          id: `row-${Date.now()}`,
          colorCode: '',
          sizes: createEmptySizes(b.sizeColumns || DEFAULT_SIZE_COLUMNS),
          total: 0
        };
        return { ...b, sizeRows: [...b.sizeRows, newRow], isEdited: true };
      }
      return b;
    });
    updateField('breakdowns', updatedBreakdowns);
  };

  // Update a size value in a row
  const updateSizeValue = (breakdownId: string, rowId: string, sizeName: string, value: number) => {
    const updatedBreakdowns = formData.breakdowns.map(b => {
      if (b.id === breakdownId) {
        const updatedRows = b.sizeRows.map(row => {
          if (row.id === rowId) {
            const newSizes = { ...row.sizes, [sizeName]: value };
            const newTotal = calculateRowTotal(newSizes);
            return { ...row, sizes: newSizes, total: newTotal };
          }
          return row;
        });
        return { ...b, sizeRows: updatedRows, isEdited: true };
      }
      return b;
    });
    updateField('breakdowns', updatedBreakdowns);
  };

  // Update color code for a row
  const updateRowColorCode = (breakdownId: string, rowId: string, colorCode: string) => {
    const updatedBreakdowns = formData.breakdowns.map(b => {
      if (b.id === breakdownId) {
        const updatedRows = b.sizeRows.map(row => {
          if (row.id === rowId) {
            return { ...row, colorCode };
          }
          return row;
        });
        return { ...b, sizeRows: updatedRows, isEdited: true };
      }
      return b;
    });
    updateField('breakdowns', updatedBreakdowns);
  };

  // Add new size column to a breakdown
  const addSizeColumn = (breakdownId: string) => {
    const sizeName = prompt('Enter new size name (e.g., 3XL, 4XL, One Size, 38, 40):');
    if (!sizeName?.trim()) return;

    const normalizedSize = sizeName.trim().toUpperCase();

    const updatedBreakdowns = formData.breakdowns.map(b => {
      if (b.id === breakdownId) {
        if (b.sizeColumns.includes(normalizedSize)) {
          alert('This size already exists!');
          return b;
        }
        const newCols = [...b.sizeColumns, normalizedSize];
        const updatedRows = b.sizeRows.map(row => ({
          ...row,
          sizes: { ...row.sizes, [normalizedSize]: 0 }
        }));
        return { ...b, sizeColumns: newCols, sizeRows: updatedRows, isEdited: true };
      }
      return b;
    });
    updateField('breakdowns', updatedBreakdowns);
  };

  // Delete size column from a breakdown
  const deleteSizeColumn = (breakdownId: string, sizeName: string) => {
    if (!confirm(`Delete size column "${sizeName}"? All quantity data for this size will be lost.`)) return;

    const updatedBreakdowns = formData.breakdowns.map(b => {
      if (b.id === breakdownId) {
        const newCols = b.sizeColumns.filter(s => s !== sizeName);
        if (newCols.length === 0) {
          alert('At least one size column is required!');
          return b;
        }
        const updatedRows = b.sizeRows.map(row => {
          const { [sizeName]: _, ...remainingSizes } = row.sizes;
          return { ...row, sizes: remainingSizes, total: calculateRowTotal(remainingSizes) };
        });
        return { ...b, sizeColumns: newCols, sizeRows: updatedRows, isEdited: true };
      }
      return b;
    });
    updateField('breakdowns', updatedBreakdowns);
  };

  // Quantity validation helper
  const getQuantityValidation = (breakdown: OrderBreakdown) => {
    const breakdownTotal = breakdown.sizeRows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);

    // Find matching PO quantity
    const matchingPO = (formData.poNumbers || []).find(po => po.number === breakdown.poNumber);
    const poQuantity = matchingPO?.quantity || 0;

    if (poQuantity === 0) {
      return { status: 'no-po' as const, breakdownTotal, poQuantity, difference: 0 };
    }

    const difference = breakdownTotal - poQuantity;

    if (difference > 0) {
      return { status: 'over' as const, breakdownTotal, poQuantity, difference };
    } else if (difference === 0) {
      return { status: 'exact' as const, breakdownTotal, poQuantity, difference: 0 };
    } else {
      return { status: 'under' as const, breakdownTotal, poQuantity, difference: Math.abs(difference) };
    }
  };

  const deleteSizeRow = (breakdownId: string, rowId: string) => {
    const updatedBreakdowns = formData.breakdowns.map(b => {
      if (b.id === breakdownId) {
        return { ...b, sizeRows: b.sizeRows.filter(r => r.id !== rowId), isEdited: true };
      }
      return b;
    });
    updateField('breakdowns', updatedBreakdowns);
  };

  const addRemark = () => {
    updateField('remarks', [...formData.remarks, '']);
  };

  const updateRemark = (index: number, value: string) => {
    const updated = [...formData.remarks];
    updated[index] = value;
    updateField('remarks', updated);
  };

  const deleteRemark = (index: number) => {
    updateField('remarks', formData.remarks.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => updateField('productImageUrl', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    if (confirm("Reset form to default? All unsaved data will be lost.")) {
      setFormData(INITIAL_PO);
    }
  };

  const handleSave = () => {
    onUpdate(formData);
    onSave();
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('po-preview-document');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `PurchaseOrder_${formData.poNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handlePrint = () => window.print();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const sectionLabel = "text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 pl-1";
  const inputClass = "w-full border p-3 text-sm bg-white focus:border-black outline-none font-normal text-black transition-all";
  const previewBoxHeader = "bg-black text-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider";

  return (
    <div className="flex flex-col h-screen bg-white print:bg-white overflow-hidden" style={{ color: '#000000' }}>
      <header className="bg-white px-6 py-4 flex justify-between items-center shrink-0 z-30 no-print" style={{ borderBottom: '1px solid #E0E0E0' }}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 transition-all" style={{ color: '#000000' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h1 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#000000' }}>Order Sheet (PO)</h1>
              <div style={{ fontSize: '10px', fontWeight: 400, textTransform: 'uppercase', color: '#666666', letterSpacing: '0.5px', marginTop: '2px' }}>Purchase Order Management</div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-all" style={{ border: '1px solid #D32F2F', color: '#D32F2F', backgroundColor: 'white' }}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={() => setViewMode(viewMode === 'EDIT' ? 'PREVIEW' : 'EDIT')} className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-all" style={{ border: '1px solid #000000', color: '#000000', backgroundColor: 'white' }}>
            {viewMode === 'EDIT' ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />} {viewMode === 'EDIT' ? 'Preview' : 'Edit'}
          </button>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" /> SAVE
          </button>
        </div>
      </header>

      {showSaveToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-black text-white px-8 py-4 shadow-lg font-bold uppercase tracking-wider text-xs z-[100] flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" /> Order Sheet Saved
        </div>
      )}

      <main className="flex-grow overflow-y-auto p-8 bg-slate-100/30 print:p-0 print:bg-white relative">
        {viewMode === 'EDIT' ? (
          <div className="w-full space-y-10 pb-32 no-print">
            {/* COMPANY & HEADER INFO */}
            <div className="bg-white p-8 border border-gray-200 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2"><label className={sectionLabel}>Company Name</label><input className={inputClass} value={formData.companyName} onChange={e => updateField('companyName', e.target.value)} /></div>
                <div><label className={sectionLabel}>Style Name</label><input className={inputClass} value={formData.styleName} onChange={e => updateField('styleName', e.target.value)} /></div>
                <div className="lg:col-span-2"><label className={sectionLabel}>Company Address</label><input className={inputClass} value={formData.companyAddress} onChange={e => updateField('companyAddress', e.target.value)} /></div>
                <div className="flex gap-4">
                  <div className="flex-1"><label className={sectionLabel}>Email 1</label><input className={inputClass} value={formData.companyEmail1} onChange={e => updateField('companyEmail1', e.target.value)} /></div>
                  <div className="flex-1"><label className={sectionLabel}>Email 2</label><input className={inputClass} value={formData.companyEmail2} onChange={e => updateField('companyEmail2', e.target.value)} /></div>
                </div>
              </div>

              {/* PO Numbers Table - Editable */}
              <div className="bg-gray-50 p-6 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <label className={sectionLabel}>PO Numbers</label>
                  <button
                    onClick={addPONumber}
                    className="btn-primary text-[10px] py-1.5 px-3"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add PO
                  </button>
                </div>
                <div className="overflow-hidden border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-black text-white">
                      <tr className="text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">PO Number</th>
                        <th className="px-4 py-3 text-center">Quantity (pcs)</th>
                        <th className="px-4 py-3 text-center">Delivery Date</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(formData.poNumbers || []).map((po, idx) => (
                        <tr key={po.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2">
                            <input
                              className="w-full bg-white border border-gray-200 px-3 py-2 text-sm font-bold text-black uppercase focus:border-black outline-none"
                              value={po.number}
                              onChange={e => updatePONumber(po.id, e.target.value)}
                              placeholder="Enter PO#"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              className="w-full bg-white border border-gray-200 px-3 py-2 text-sm font-bold text-center text-gray-700 focus:border-black outline-none"
                              value={po.quantity || ''}
                              onChange={e => updatePOField(po.id, 'quantity', parseInt(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              className="w-full bg-white border border-gray-200 px-3 py-2 text-sm font-bold text-center text-gray-700 focus:border-black outline-none"
                              value={po.deliveryDate || ''}
                              onChange={e => updatePOField(po.id, 'deliveryDate', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => deletePONumber(po.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* TRADING PARTNERS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 border border-gray-200">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 text-black">
                  <Building2 className="w-5 h-5" /><h3 className="font-bold text-xs uppercase tracking-wider">Factory (Partner)</h3>
                </div>
                <div className="space-y-4">
                  <div><label className={sectionLabel}>Factory Name</label><input className={inputClass} value={formData.factoryName} onChange={e => updateField('factoryName', e.target.value)} /></div>
                  <div><label className={sectionLabel}>Factory BIN/VAT</label><input className={inputClass} value={formData.factoryBin} onChange={e => updateField('factoryBin', e.target.value)} /></div>
                  <div><label className={sectionLabel}>Factory Address</label><textarea className={`${inputClass} h-24 resize-none`} value={formData.factoryAddress} onChange={e => updateField('factoryAddress', e.target.value)} /></div>
                </div>
              </div>
              <div className="bg-white p-8 border border-gray-200">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 text-black">
                  <ShoppingCart className="w-5 h-5" /><h3 className="font-bold text-xs uppercase tracking-wider">Buyer & Consignee</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={sectionLabel}>Buyer Name</label><input className={inputClass} value={formData.buyerName} onChange={e => updateField('buyerName', e.target.value)} /></div>
                    <div><label className={sectionLabel}>Consignee Name</label><input className={inputClass} value={formData.consigneeName} onChange={e => updateField('consigneeName', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={sectionLabel}>Buyer Address</label><textarea className={`${inputClass} h-24 resize-none`} value={formData.buyerAddress} onChange={e => updateField('buyerAddress', e.target.value)} /></div>
                    <div><label className={sectionLabel}>Consignee Address</label><textarea className={`${inputClass} h-24 resize-none`} value={formData.consigneeAddress} onChange={e => updateField('consigneeAddress', e.target.value)} /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* SHIPPING & ORDER DETAILS */}
            <div className="bg-white p-8 border border-gray-200">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-200 text-black">
                <Truck className="w-5 h-5" /><h3 className="font-bold text-xs uppercase tracking-wider">Shipping & Logistics</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div><label className={sectionLabel}>PO Date</label><input type="date" className={inputClass} value={formData.poDate} onChange={e => updateField('poDate', e.target.value)} /></div>
                <div><label className={sectionLabel}>Shipment Date</label><input type="date" className={inputClass} value={formData.shipmentDate} onChange={e => updateField('shipmentDate', e.target.value)} /></div>
                <div><label className={sectionLabel}>Ex-Factory Date</label><input type="date" className={inputClass} value={formData.exFactoryDate} onChange={e => updateField('exFactoryDate', e.target.value)} /></div>
                <div>
                  <label className={sectionLabel}>Incoterms</label>
                  <select className={inputClass} value={formData.incoterms} onChange={e => updateField('incoterms', e.target.value)}>
                    <option value="FOB Chittagong">FOB Chittagong</option>
                    <option value="FOB Dhaka">FOB Dhaka</option>
                    <option value="CIF">CIF</option>
                    <option value="CFR">CFR</option>
                    <option value="EXW">EXW</option>
                  </select>
                </div>
                <div>
                  <label className={sectionLabel}>Payment Method</label>
                  <select className={inputClass} value={formData.paymentMethod} onChange={e => updateField('paymentMethod', e.target.value)}>
                    <option value="TT">TT</option>
                    <option value="LC">LC</option>
                    <option value="DP">DP</option>
                  </select>
                </div>
                <div><label className={sectionLabel}>Payment Terms</label><input className={inputClass} value={formData.paymentTerms} onChange={e => updateField('paymentTerms', e.target.value)} /></div>
                <div><label className={sectionLabel}>Season</label><input className={inputClass} value={formData.season} onChange={e => updateField('season', e.target.value)} /></div>
                <div><label className={sectionLabel}>Currency</label><input className={inputClass} value={formData.currency} onChange={e => updateField('currency', e.target.value)} /></div>
                <div><label className={sectionLabel}>Contract No</label><input className={inputClass} value={formData.contractNo} onChange={e => updateField('contractNo', e.target.value)} /></div>
                <div><label className={sectionLabel}>Shipment Method</label><select className={inputClass} value={formData.shipmentMethod} onChange={e => updateField('shipmentMethod', e.target.value as any)}><option value="SEA">SEA</option><option value="AIR">AIR</option><option value="SEA-AIR">SEA-AIR</option></select></div>
                <div><label className={sectionLabel}>Port of Lading</label><input className={inputClass} value={formData.portOfLading} onChange={e => updateField('portOfLading', e.target.value)} /></div>
                <div><label className={sectionLabel}>Discharge Port</label><input className={inputClass} value={formData.dischargePort} onChange={e => updateField('dischargePort', e.target.value)} /></div>
              </div>
            </div>

            {/* PRODUCT DETAILS */}
            <div className="bg-white p-8 border border-gray-200">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-200 text-black">
                <Package className="w-5 h-5" /><h3 className="font-bold text-xs uppercase tracking-wider">Product Information</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={sectionLabel}>Style Name</label><input className={inputClass} value={formData.styleName} onChange={e => updateField('styleName', e.target.value)} /></div>
                    <div><label className={sectionLabel}>Style Code</label><input className={inputClass} value={formData.styleCode} onChange={e => updateField('styleCode', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className={sectionLabel}>Fabric (GSM)</label><input className={inputClass} value={formData.fabricWeight} onChange={e => updateField('fabricWeight', e.target.value)} /></div>
                    <div><label className={sectionLabel}>Composition</label><input className={inputClass} value={formData.composition} onChange={e => updateField('composition', e.target.value)} /></div>
                    <div><label className={sectionLabel}>Gauge</label><input className={inputClass} value={formData.gauge} onChange={e => updateField('gauge', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={sectionLabel}>Size Ratio</label><input className={inputClass} value={formData.sizeRatio} onChange={e => updateField('sizeRatio', e.target.value)} /></div>
                    <div><label className={sectionLabel}>Unit Price ($)</label><input type="number" step="0.01" className={inputClass} value={formData.unitPrice || ''} onChange={e => updateField('unitPrice', parseFloat(e.target.value) || 0)} /></div>
                  </div>
                  <div><label className={sectionLabel}>HS Code</label><input className={inputClass} value={formData.hsCode} onChange={e => updateField('hsCode', e.target.value)} /></div>
                </div>
                <div className="relative border-2 border-dashed border-gray-300 h-64 flex flex-col items-center justify-center bg-gray-50 group overflow-hidden">
                  {formData.productImageUrl ? (
                    <>
                      <img src={formData.productImageUrl} className="w-full h-full object-contain" />
                      <button onClick={() => updateField('productImageUrl', '')} className="absolute top-2 right-2 p-2 bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <button onClick={() => imageInputRef.current?.click()} className="flex flex-col items-center gap-3 text-gray-400 hover:text-black transition-colors">
                      <ImageIcon className="w-12 h-12" />
                      <span className="font-bold text-[10px] uppercase tracking-wider">Upload Product Image</span>
                    </button>
                  )}
                  <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>
            </div>

            {/* COLOR & SIZE BREAKDOWN - MULTIPLE TABLES SUPPORT */}
            <div className="space-y-12">
              <div className="flex justify-between items-center no-print">
                <h2 className="text-lg font-bold text-black tracking-tight uppercase flex items-center gap-3">
                  <Layers className="w-6 h-6 text-black" />
                  Purchase Order Breakdown Tables
                </h2>
                <button
                  onClick={addBreakdownTable}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4" /> Add New Table
                </button>
              </div>

              {(formData.breakdowns || []).map((breakdown, bIdx) => (
                <div key={breakdown.id} className="bg-white p-8 border border-gray-200 relative">
                  <button
                    onClick={() => deleteBreakdownTable(breakdown.id)}
                    className="absolute -top-3 -right-3 p-3 bg-red-600 text-white hover:bg-red-700 transition-all z-10 opacity-0 group-hover:opacity-100 hover:scale-110 group"
                    title="Delete this table"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="group">
                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-4 flex-1 max-w-sm">
                        <div className="p-2.5 bg-gray-100 text-black"><LayoutPanelTop className="w-5 h-5" /></div>
                        <div className="w-full">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Breakdown for PO#</label>
                          <input
                            className="w-full bg-gray-100 border border-gray-200 p-2 text-xs font-bold uppercase tracking-tight focus:bg-white transition-all outline-none"
                            value={breakdown.poNumber}
                            onChange={e => updateBreakdownPO(breakdown.id, e.target.value)}
                            placeholder="Enter PO Number..."
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 items-center">
                        {breakdown.isAutoCreated && !breakdown.isEdited && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 text-[9px] font-bold flex items-center gap-1">
                            🔄 Auto-created
                          </span>
                        )}
                        {breakdown.isEdited && (
                          <span className="bg-amber-100 text-amber-700 px-2 py-1 text-[9px] font-bold flex items-center gap-1">
                            ✏️ Edited
                          </span>
                        )}
                        {!breakdown.isAutoCreated && !breakdown.isEdited && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 text-[9px] font-bold flex items-center gap-1">
                            📋 Manual
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-3 py-1.5 uppercase tracking-wider">Table #{bIdx + 1}</span>
                        <button onClick={() => addSizeColumn(breakdown.id)} className="btn-secondary text-[10px] py-1.5 px-3"><Plus className="w-3.5 h-3.5" /> Add Size</button>
                        <button onClick={() => addSizeRow(breakdown.id)} className="btn-primary text-[10px] py-1.5 px-3"><Plus className="w-3.5 h-3.5" /> Add Row</button>
                        <button onClick={() => deleteBreakdownTable(breakdown.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-gray-200">
                      <table className="w-full border-collapse">
                        <thead className="bg-black text-white">
                          <tr className="text-[10px] font-bold uppercase tracking-wider">
                            <th className="p-4 text-left">Color / Code</th>
                            {(breakdown.sizeColumns || DEFAULT_SIZE_COLUMNS).map(size => (
                              <th key={size} className="p-4 text-center relative group">
                                <span>{size}</span>
                                {breakdown.sizeColumns.length > 1 && (
                                  <button
                                    onClick={() => deleteSizeColumn(breakdown.id, size)}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex items-center justify-center"
                                    title={`Delete ${size} column`}
                                  >
                                    ×
                                  </button>
                                )}
                              </th>
                            ))}
                            <th className="p-4 text-center bg-gray-800">QTY</th>
                            <th className="p-4 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(breakdown.sizeRows || []).map(row => (
                            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-2"><input className="w-full bg-gray-100 border border-gray-200 p-2 text-xs font-bold" value={row.colorCode} onChange={e => updateRowColorCode(breakdown.id, row.id, e.target.value)} /></td>
                              {(breakdown.sizeColumns || DEFAULT_SIZE_COLUMNS).map(size => (
                                <td key={size} className="p-2">
                                  <input
                                    type="number"
                                    className="w-full bg-white border border-gray-200 p-2 text-xs text-center font-bold"
                                    value={row.sizes?.[size] || ''}
                                    onChange={e => updateSizeValue(breakdown.id, row.id, size, parseInt(e.target.value) || 0)}
                                  />
                                </td>
                              ))}
                              <td className="p-4 text-center font-bold text-black bg-gray-100">{row.total}</td>
                              <td className="p-2 text-center"><button onClick={() => deleteSizeRow(breakdown.id, row.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 border-t-2 border-black font-bold text-[10px] uppercase">
                          <tr>
                            <td className="p-4 text-right pr-6">Table Sub-Totals:</td>
                            {(breakdown.sizeColumns || DEFAULT_SIZE_COLUMNS).map(size => (
                              <td key={size} className="p-4 text-center">
                                {breakdown.sizeRows.reduce((a, c) => a + (Number(c.sizes?.[size]) || 0), 0)}
                              </td>
                            ))}
                            <td className="p-4 text-center text-sm text-black">{breakdown.sizeRows.reduce((a, c) => a + (Number(c.total) || 0), 0)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Quantity Validation Display */}
                    {(() => {
                      const validation = getQuantityValidation(breakdown);
                      if (validation.status === 'no-po') return null;

                      return (
                        <div className={`mt-4 p-4 border-2 ${validation.status === 'over' ? 'bg-red-50 border-red-300' :
                          validation.status === 'exact' ? 'bg-green-50 border-green-300' :
                            'bg-amber-50 border-amber-300'
                          }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">
                                {validation.status === 'over' ? '⚠️' : validation.status === 'exact' ? '✅' : 'ℹ️'}
                              </span>
                              <div>
                                <div className={`text-xs font-black uppercase tracking-widest ${validation.status === 'over' ? 'text-red-700' :
                                  validation.status === 'exact' ? 'text-green-700' :
                                    'text-amber-700'
                                  }`}>
                                  {validation.status === 'over' ? 'WARNING: Quantity Exceeded!' :
                                    validation.status === 'exact' ? 'Quantity Matched!' :
                                      'Quantity Remaining'}
                                </div>
                                <div className="text-[10px] text-slate-600 mt-1">
                                  PO Quantity: <span className="font-bold">{validation.poQuantity.toLocaleString()} pcs</span>
                                  <span className="mx-2">|</span>
                                  Breakdown Total: <span className="font-bold">{validation.breakdownTotal.toLocaleString()} pcs</span>
                                </div>
                              </div>
                            </div>
                            <div className={`text-lg font-black ${validation.status === 'over' ? 'text-red-600' :
                              validation.status === 'exact' ? 'text-green-600' :
                                'text-amber-600'
                              }`}>
                              {validation.status === 'over' ? `Over by: ${validation.difference.toLocaleString()} pcs` :
                                validation.status === 'exact' ? 'Perfect!' :
                                  `Remaining: ${validation.difference.toLocaleString()} pcs`}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}

              <div className="flex justify-end no-print">
                <div className="bg-black text-white p-6 flex items-center gap-12 border-4 border-white">
                  <div>
                    <span className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] block mb-1">Grand Total Order Qty</span>
                    <span className="text-4xl font-black">{totals.qtyTotal.toLocaleString()} PCS</span>
                  </div>
                  <div className="w-px h-12 bg-white/20"></div>
                  <div>
                    <span className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] block mb-1">Consolidated PO Value</span>
                    <span className="text-4xl font-black">${totals.amountTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.currency}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACCESSORIES & REMARKS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 border border-gray-200">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 text-black">
                  <Box className="w-5 h-5" /><h3 className="font-bold text-xs uppercase tracking-wider">Trim & Accessories</h3>
                </div>
                <div className="space-y-4">
                  <div><label className={sectionLabel}>Main Label</label><input className={inputClass} value={formData.accessories.mainLabel} onChange={e => updateAccessory('mainLabel', e.target.value)} /></div>
                  <div><label className={sectionLabel}>Care Label</label><input className={inputClass} value={formData.accessories.careLabel} onChange={e => updateAccessory('careLabel', e.target.value)} /></div>
                  <div><label className={sectionLabel}>Hang Tag</label><input className={inputClass} value={formData.accessories.hangTag} onChange={e => updateAccessory('hangTag', e.target.value)} /></div>
                  <div><label className={sectionLabel}>Polybag</label><input className={inputClass} value={formData.accessories.polybag} onChange={e => updateAccessory('polybag', e.target.value)} /></div>
                  <div><label className={sectionLabel}>Carton Req.</label><input className={inputClass} value={formData.accessories.carton} onChange={e => updateAccessory('carton', e.target.value)} /></div>
                </div>
              </div>
              <div className="bg-white p-8 border border-gray-200">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3 text-black">
                    <CheckSquare className="w-5 h-5" /><h3 className="font-bold text-xs uppercase tracking-wider">Technical Remarks</h3>
                  </div>
                  <button onClick={addRemark} className="p-1.5 bg-gray-100 text-black border border-gray-200 hover:bg-gray-200 transition-all"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3">
                  {formData.remarks.map((remark, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 text-[10px] font-bold">{idx + 1}</div>
                      <input className="flex-1 bg-gray-100 border border-gray-200 px-4 text-xs font-bold" value={remark} onChange={e => updateRemark(idx, e.target.value)} placeholder="Type remark..." />
                      <button onClick={() => deleteRemark(idx)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* PREVIEW MODE */
          <div className="flex flex-col items-center gap-8 pb-32">
            <div className="flex gap-3 no-print">
              <button onClick={handleDownloadPDF} className="btn-primary"><FileDown className="w-5 h-5" /> Download PDF</button>
              <button onClick={handlePrint} className="btn-secondary"><Printer className="w-5 h-5" /> Print Document</button>
            </div>

            {/* THE ACTUAL PO DOCUMENT TEMPLATE */}
            <div id="po-preview-document" className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-[15mm] text-black font-sans box-border relative print:shadow-none print:m-0 print:w-full">
              {/* HEADER SECTION */}
              <div className="flex justify-between items-start mb-10 border-b-4 border-slate-900 pb-8">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter leading-none mb-3">{formData.companyName}</h2>
                  <p className="text-[11px] font-medium text-slate-500 w-80 mb-2 leading-relaxed">{formData.companyAddress}</p>
                  <div className="flex gap-4 text-[10px] font-black text-indigo-600">
                    <span>{formData.companyEmail1}</span>
                    <span>{formData.companyEmail2}</span>
                  </div>
                </div>
                <div className="text-right">
                  <h1 className="text-5xl font-black tracking-tighter text-indigo-600 uppercase leading-none mb-4">Purchase Order</h1>
                  <div className="inline-block border-2 border-slate-900 px-6 py-2 rounded-lg">
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest text-center mb-1">PO#</span>
                    <span className="text-xl font-black">{formData.poNumber}</span>
                  </div>
                </div>
              </div>

              {/* INFO BLOCKS (3 Columns) */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="border border-slate-200 overflow-hidden rounded-xl">
                  <div className={`${previewBoxHeader} bg-indigo-600`}>Trading Partner / Factory</div>
                  <div className="p-4 space-y-2">
                    <p className="text-[12px] font-black uppercase">{formData.factoryName}</p>
                    <p className="text-[10px] font-medium text-slate-500 leading-tight">{formData.factoryAddress}</p>
                    <div className="pt-2 border-t border-slate-100 text-[10px] font-black text-slate-400">BIN: <span className="text-slate-900 uppercase">{formData.factoryBin}</span></div>
                  </div>
                </div>
                <div className="border border-slate-200 overflow-hidden rounded-xl">
                  <div className={`${previewBoxHeader} bg-slate-900`}>Shipping & Payment Info</div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between"><span className="text-[9px] font-black text-slate-400 uppercase">Ship Date:</span> <span className="text-[10px] font-black">{formatDate(formData.shipmentDate)}</span></div>
                    <div className="flex justify-between"><span className="text-[9px] font-black text-slate-400 uppercase">Incoterms:</span> <span className="text-[10px] font-black uppercase">{formData.incoterms}</span></div>
                    <div className="flex justify-between"><span className="text-[9px] font-black text-slate-400 uppercase">Method:</span> <span className="text-[10px] font-black uppercase">{formData.paymentMethod}</span></div>
                    <div className="flex justify-between pt-2 border-t border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase">Terms:</span> <span className="text-[10px] font-black">{formData.paymentTerms}</span></div>
                  </div>
                </div>
                <div className="border border-slate-200 overflow-hidden rounded-xl">
                  <div className={`${previewBoxHeader} bg-slate-900`}>Order Management</div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between"><span className="text-[9px] font-black text-slate-400 uppercase">PO Date:</span> <span className="text-[10px] font-black">{formatDate(formData.poDate)}</span></div>
                    <div className="flex justify-between"><span className="text-[9px] font-black text-slate-400 uppercase">Season:</span> <span className="text-[10px] font-black uppercase">{formData.season}</span></div>
                    <div className="flex justify-between"><span className="text-[9px] font-black text-slate-400 uppercase">Currency:</span> <span className="text-[10px] font-black uppercase">{formData.currency}</span></div>
                    <div className="flex justify-between pt-2 border-t border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase">Contract:</span> <span className="text-[10px] font-black uppercase">{formData.contractNo}</span></div>
                  </div>
                </div>
              </div>

              {/* CONTRACT DETAILS ROW */}
              <div className="grid grid-cols-4 border border-slate-200 divide-x divide-slate-200 mb-8 overflow-hidden rounded-xl text-center">
                <div className="p-2"><span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Ship Via</span><span className="text-[10px] font-black uppercase">{formData.shipmentMethod}</span></div>
                <div className="p-2"><span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Country of Origin</span><span className="text-[10px] font-black uppercase">{formData.originCountry}</span></div>
                <div className="p-2"><span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Port of Lading</span><span className="text-[10px] font-black uppercase">{formData.portOfLading}</span></div>
                <div className="p-2"><span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Discharge Port</span><span className="text-[10px] font-black uppercase">{formData.dischargePort}</span></div>
                <div className="p-2 border-t border-slate-200"><span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">HS Code</span><span className="text-[10px] font-black">{formData.hsCode}</span></div>
                <div className="p-2 border-t border-slate-200"><span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">RN Number</span><span className="text-[10px] font-black">{formData.rnNumber}</span></div>
                <div className="p-2 border-t border-slate-200"><span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Ex-Factory Date</span><span className="text-[10px] font-black">{formatDate(formData.exFactoryDate)}</span></div>
                <div className="p-2 border-t border-slate-200 bg-indigo-50"><span className="text-[8px] font-black uppercase text-indigo-400 block mb-0.5">Grand Total Qty</span><span className="text-[11px] font-black">{totals.qtyTotal.toLocaleString()} PCS</span></div>
              </div>

              {/* PRODUCT BOX */}
              <div className="flex border border-slate-900 mb-8 h-[45mm] rounded-xl overflow-hidden">
                <div className="flex-1 p-6 border-r border-slate-900">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                    <div><span className="text-[9px] font-black uppercase text-slate-400 block">Style Name</span><span className="text-[13px] font-black uppercase">{formData.styleName}</span></div>
                    <div><span className="text-[9px] font-black uppercase text-slate-400 block">Style Code</span><span className="text-[13px] font-black uppercase">{formData.styleCode}</span></div>
                    <div className="col-span-2 grid grid-cols-3 gap-2">
                      <div><span className="text-[8px] font-black uppercase text-slate-400 block">Composition</span><span className="text-[9px] font-bold uppercase">{formData.composition}</span></div>
                      <div><span className="text-[8px] font-black uppercase text-slate-400 block">Weight</span><span className="text-[9px] font-bold uppercase">{formData.fabricWeight}</span></div>
                      <div><span className="text-[8px] font-black uppercase text-slate-400 block">Gauge</span><span className="text-[9px] font-bold uppercase">{formData.gauge}</span></div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-6 bg-slate-50 rounded-lg p-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">Size Ratio:</span>
                    <span className="text-[14px] font-black tracking-widest text-indigo-600">{formData.sizeRatio}</span>
                  </div>
                </div>
                <div className="w-[50mm] bg-white flex items-center justify-center p-4">
                  {formData.productImageUrl ? <img src={formData.productImageUrl} className="max-h-full max-w-full object-contain" /> : <div className="text-[10px] font-black uppercase text-slate-200">No Image</div>}
                </div>
              </div>

              {/* SIZE TABLES - PREVIEW */}
              <div className="space-y-10 mb-10">
                {(formData.breakdowns || []).map((breakdown, idx) => (
                  <div key={breakdown.id} className="page-break-inside-avoid">
                    <div className="flex justify-between items-end mb-2">
                      <h3 className="text-xs font-black uppercase tracking-tighter border-l-4 border-indigo-600 pl-2">Order Breakdown Table #{idx + 1} <span className="ml-4 text-indigo-600">PO# {breakdown.poNumber}</span></h3>
                    </div>
                    <table className="w-full border-2 border-slate-900 border-collapse text-[10px]">
                      <thead className="bg-slate-100 font-black uppercase text-center border-b-2 border-slate-900">
                        <tr>
                          <th className="p-2 border-r border-slate-300 text-left">Color Description / Code</th>
                          {(breakdown.sizeColumns || DEFAULT_SIZE_COLUMNS).map(size => (
                            <th key={size} className="p-2 border-r border-slate-300 w-10">{size}</th>
                          ))}
                          <th className="p-2 border-r border-slate-300 w-20">QTY</th>
                          <th className="p-2 border-r border-slate-300 w-16">PRICE</th>
                          <th className="p-2 w-28">AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody className="text-center font-bold">
                        {breakdown.sizeRows.map((row, rIdx) => (
                          <tr key={rIdx} className={`${rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-200`}>
                            <td className="p-2 border-r border-slate-200 text-left font-black uppercase">{row.colorCode}</td>
                            {(breakdown.sizeColumns || DEFAULT_SIZE_COLUMNS).map(size => (
                              <td key={size} className="p-2 border-r border-slate-200">{row.sizes?.[size] || 0}</td>
                            ))}
                            <td className="p-2 border-r border-slate-200 font-black">{row.total}</td>
                            <td className="p-2 border-r border-slate-200 font-mono">${(formData.unitPrice || 0).toFixed(2)}</td>
                            <td className="p-2 font-black bg-indigo-50 font-mono">${(row.total * (formData.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-200 border-t-2 border-slate-900 font-black uppercase text-center text-[9px]">
                        <tr>
                          <td className="p-2 text-right pr-4 uppercase tracking-widest border-r border-slate-900">Table Sub-Totals:</td>
                          {(breakdown.sizeColumns || DEFAULT_SIZE_COLUMNS).map(size => (
                            <td key={size} className="p-2 border-r border-slate-300">
                              {breakdown.sizeRows.reduce((a, c) => a + (Number(c.sizes?.[size]) || 0), 0)}
                            </td>
                          ))}
                          <td className="p-2 border-r border-slate-300 text-indigo-700">{breakdown.sizeRows.reduce((a, c) => a + (Number(c.total) || 0), 0)} PCS</td>
                          <td className="border-r border-slate-300"></td>
                          <td className="p-2 font-mono text-indigo-800">${breakdown.sizeRows.reduce((a, c) => a + (Number(c.total) * (formData.unitPrice || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ))}
              </div>

              {/* GRAND TOTAL SUMMARY */}
              <div className="flex justify-end mb-10 page-break-inside-avoid">
                <div className="bg-slate-900 text-white p-5 rounded-xl flex items-center gap-10">
                  <div className="text-right">
                    <span className="text-[8px] font-black uppercase opacity-60 block tracking-widest">Grand Total Pieces</span>
                    <span className="text-xl font-black">{totals.qtyTotal.toLocaleString()} PCS</span>
                  </div>
                  <div className="w-px h-8 bg-white/20"></div>
                  <div className="text-right">
                    <span className="text-[8px] font-black uppercase opacity-60 block tracking-widest">Grand Total Amount</span>
                    <span className="text-xl font-black text-indigo-400 font-mono">${totals.amountTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.currency}</span>
                  </div>
                </div>
              </div>

              {/* ACCESSORIES & REMARKS BOTTOM ROW */}
              <div className="grid grid-cols-2 gap-8 mb-16 page-break-inside-avoid">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className={`${previewBoxHeader} bg-indigo-600`}>Mandatory Trims & Packing</div>
                  <div className="p-4 space-y-3 text-[10px]">
                    <div className="flex justify-between border-b border-slate-100 pb-1"><span>Main Label:</span> <strong className="uppercase">{formData.accessories.mainLabel}</strong></div>
                    <div className="flex justify-between border-b border-slate-100 pb-1"><span>Care Label:</span> <strong className="uppercase">{formData.accessories.careLabel}</strong></div>
                    <div className="flex justify-between border-b border-slate-100 pb-1"><span>Hang Tag:</span> <strong className="uppercase">{formData.accessories.hangTag}</strong></div>
                    <div className="flex justify-between border-b border-slate-100 pb-1"><span>Polybag:</span> <strong className="uppercase">{formData.accessories.polybag}</strong></div>
                    <div className="flex justify-between"><span>Carton Packing:</span> <strong className="uppercase">{formData.accessories.carton}</strong></div>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className={`${previewBoxHeader} bg-amber-600`}>Conditions & Remarks</div>
                  <div className="p-4">
                    <ul className="list-decimal pl-5 space-y-1.5 text-[9px] font-bold leading-tight text-slate-700">
                      {formData.remarks.filter(r => r.trim() !== '').map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* SIGNATURES */}
              <div className="grid grid-cols-4 gap-4 mt-auto mb-10 text-center page-break-inside-avoid">
                <div className="border-t-2 border-slate-900 pt-3"><span className="text-[10px] font-black uppercase block leading-none">Merchandiser</span></div>
                <div className="border-t-2 border-slate-900 pt-3"><span className="text-[10px] font-black uppercase block leading-none">Marketing Director</span></div>
                <div className="border-t-2 border-slate-900 pt-3"><span className="text-[10px] font-black uppercase block leading-none">Operation Director</span></div>
                <div className="border-t-2 border-slate-900 pt-3"><span className="text-[10px] font-black uppercase block leading-none">Executive Director</span></div>
              </div>

              {/* FOOTER */}
              <div className="absolute bottom-6 left-[15mm] right-[15mm] border-t border-slate-100 pt-4 flex justify-between items-center text-[9px] font-black text-slate-300 tracking-widest uppercase no-print">
                <span>Page 1 of 1</span>
                <span>Automated Order Sheet - Multi Breakdown v2</span>
                <span>Fashion Comfort industrial Systems</span>
              </div>
            </div>
          </div >
        )}
      </main >

      <style>{`
        @media print {
            aside, header, footer, .no-print { display: none !important; }
            main { padding: 0 !important; width: 100% !important; background: white !important; overflow: visible !important; }
            #po-preview-document { box-shadow: none !important; margin: 0 !important; border: none !important; width: 100% !important; height: auto !important; position: relative !important; }
            .page-break-inside-avoid { page-break-inside: avoid; }
        }
      `}</style>
    </div >
  );
};

export default OrderSheetEditor;
