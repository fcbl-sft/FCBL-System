
import React from 'react';
import { Project, Inspection, FileAttachment, SectionComment } from '../types';
import { FileText, Paperclip, Camera, Link, ExternalLink, Package, Image as ImageIcon } from 'lucide-react';

interface InspectionReportTemplateProps {
  project: Project;
  inspection: Inspection;
}

const InspectionReportTemplate: React.FC<InspectionReportTemplateProps> = ({ inspection }) => {
  const data = inspection.data;
  const { visibleSections } = data;

  const calculateDiff = (actual: string, standard: string) => {
    const act = parseFloat(actual);
    const std = parseFloat(standard);
    if (isNaN(act) || isNaN(std)) return '-';
    const diff = act - std;
    return diff.toFixed(2);
  };

  const isDiffWarning = (diff: string, tolPlus: string, tolMinus: string) => {
    const d = parseFloat(diff);
    // Correctly parse thresholds with support for 0 value
    const tp = (tolPlus !== '' && !isNaN(parseFloat(tolPlus))) ? parseFloat(tolPlus) : (parseFloat(data.globalMasterTolerance) || 0);
    const tm = (tolMinus !== '' && !isNaN(parseFloat(tolMinus))) ? parseFloat(tolMinus) : (parseFloat(data.globalMasterTolerance) || 0);
    
    if (isNaN(d)) return false;
    // Highlight if difference is above positive tolerance OR below negative tolerance
    return d > tp || d < -tm;
  };

  const defectTotals = (data.qcDefects || []).reduce((acc, curr) => ({
    critical: acc.critical + (curr.critical || 0),
    major: acc.major + (curr.major || 0),
    minor: acc.minor + (curr.minor || 0)
  }), { critical: 0, major: 0, minor: 0 });

  const allDocuments: { label: string, files: FileAttachment[] }[] = [];
  data.attachments.forEach(att => {
    if (att.attachments?.length > 0) allDocuments.push({ label: `Requirement: ${att.label}`, files: att.attachments });
  });

  const SECTIONS = [
    { id: 'generalInfo', label: 'General Information' },
    { id: 'orderDetails', label: 'Order Details' },
    { id: 'factoryInfo', label: 'Factory Information' },
    { id: 'shipment', label: 'Quantities & Shipment' },
    { id: 'sampling', label: 'Sampling Data' },
    { id: 'attachments', label: 'Attachments & Checklist' },
    { id: 'qcDefects', label: 'Quality Control (QC)' },
    { id: 'judgement', label: 'Judgement & Results' }, 
    { id: 'measurements', label: 'Measurement Analysis' }, 
    { id: 'images', label: 'Inspection Photos' },
    { id: 'packing', label: 'Packing List' }
  ];

  (Object.entries(data.sectionComments || {}) as [string, SectionComment[]][]).forEach(([sid, comments]) => {
    const sectionName = SECTIONS.find(s => s.id === sid)?.label || sid;
    comments.forEach((c, idx) => {
      if (c.attachments?.length > 0) allDocuments.push({ label: `${sectionName} Note #${idx+1}`, files: c.attachments });
    });
  });

  const renderSectionComments = (sectionId: string) => {
    const comments = data.sectionComments?.[sectionId] || [];
    if (comments.length === 0) return null;
    return (
      <div className="mt-2 p-2 bg-gray-50 border-t border-gray-100 rounded-b no-print-break">
        <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-1">Remarks / Observaciones:</span>
        <ul className="list-disc pl-3 space-y-0.5">
          {comments.map(c => (
            <li key={c.id} className="text-[8px] text-gray-700 font-bold leading-tight">
                {c.text}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div id="report-content" className="bg-white text-black p-8 text-[10px] flex flex-col gap-6 font-sans min-h-[297mm] print:p-4">
      {/* HEADER */}
      <div className="text-center border-b-4 border-black pb-4">
          <h1 className="text-2xl font-black tracking-tighter">FASHION COMFORT (BD) LTD</h1>
          <p className="text-[10px] uppercase font-black text-indigo-600 mt-1">Technical Document: {inspection.type}</p>
          <div className="mt-2 bg-black text-white inline-block px-4 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm">Report No: {inspection.id}</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 1. GENERAL INFORMATION */}
        {visibleSections.includes('generalInfo') && (
            <div className="border-2 border-black overflow-hidden rounded-xl shadow-sm no-print-break">
            <h3 className="bg-gray-100 p-1.5 border-b-2 border-black font-black uppercase text-[8px] tracking-widest">1. General Information</h3>
            <div className="grid grid-cols-1 gap-2 p-3 text-[9px]">
                <div className="flex justify-between border-b border-gray-100"><span>Buyer:</span> <strong className="uppercase">{data.buyerName}</strong></div>
                <div className="flex justify-between border-b border-gray-100"><span>Inspector:</span> <strong className="uppercase">{data.inspectorName}</strong></div>
                <div className="flex justify-between border-b border-gray-100"><span>Date:</span> <strong>{data.inspectionDate}</strong></div>
                <div className="flex justify-between"><span>Address:</span> <strong className="uppercase truncate max-w-[150px]">{data.supplierAddress}</strong></div>
            </div>
            {renderSectionComments('generalInfo')}
            </div>
        )}

        {/* 2. ORDER DETAILS */}
        {visibleSections.includes('orderDetails') && (
            <div className="border-2 border-black overflow-hidden rounded-xl shadow-sm no-print-break">
            <h3 className="bg-gray-100 p-1.5 border-b-2 border-black font-black uppercase text-[8px] tracking-widest">2. Order Details</h3>
            <div className="grid grid-cols-1 gap-2 p-3 text-[9px]">
                <div className="flex justify-between border-b border-gray-100"><span>Style:</span> <strong className="uppercase">{data.styleName}</strong></div>
                <div className="flex justify-between border-b border-gray-100"><span>Order No:</span> <strong>{data.orderNumber}</strong></div>
                <div className="flex justify-between border-b border-gray-100"><span>Composition:</span> <strong>{data.composition}</strong></div>
                <div className="flex justify-between"><span>Color:</span> <strong>{data.colorName}</strong></div>
            </div>
            {renderSectionComments('orderDetails')}
            </div>
        )}
      </div>

      {/* 3. FACTORY INFO */}
      {visibleSections.includes('factoryInfo') && (
          <div className="border-2 border-black overflow-hidden rounded-xl shadow-sm no-print-break">
              <h3 className="bg-gray-100 p-1.5 border-b-2 border-black font-black uppercase text-[8px] tracking-widest">3. Factory Information</h3>
              <div className="grid grid-cols-2 gap-6 p-3 text-[9px]">
                  <div className="flex justify-between border-b border-gray-100"><span>Factory Name:</span> <strong className="uppercase">{data.factoryName}</strong></div>
                  <div className="flex justify-between border-b border-gray-100"><span>Origin:</span> <strong className="uppercase">{data.countryOfProduction}</strong></div>
              </div>
              {renderSectionComments('factoryInfo')}
          </div>
      )}

      {/* 4. QUANTITIES & SHIPMENT */}
      {visibleSections.includes('shipment') && (
        <div className="border-2 border-black overflow-hidden rounded-xl shadow-sm no-print-break">
          <h3 className="bg-gray-100 p-1.5 border-b-2 border-black font-black uppercase text-[8px] tracking-widest">4. Quantities & Shipment</h3>
          <div className="p-3 space-y-4">
            {(data.shipmentGroups || []).map(group => (
              <div key={group.id} className="border border-black p-2 bg-gray-50/50">
                <p className="font-black text-[7px] uppercase mb-1">Color Group: {group.color}</p>
                <table className="w-full border-collapse text-[7px]">
                  <thead>
                    <tr className="bg-black text-white text-center">
                      <th className="p-1">Size</th>
                      <th className="p-1">Order Qty</th>
                      <th className="p-1">Ship Qty</th>
                      <th className="p-1">Cartons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(group.rows || []).map(row => (
                      <tr key={row.id} className="border-b border-black text-center font-bold">
                        <td className="p-1">{row.size}</td>
                        <td className="p-1">{row.orderQty}</td>
                        <td className="p-1">{row.shipQty}</td>
                        <td className="p-1">{row.cartonCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          {renderSectionComments('shipment')}
        </div>
      )}

      {/* 5. SAMPLING DATA */}
      {visibleSections.includes('sampling') && (
          <div className="border-2 border-black overflow-hidden rounded-xl shadow-sm no-print-break">
            <h3 className="bg-gray-100 p-1.5 border-b-2 border-black font-black uppercase text-[8px] tracking-widest">5. Sampling Data</h3>
            <div className="grid grid-cols-2 gap-6 p-3 text-[9px]">
                <div className="flex justify-between border-b border-gray-100"><span>Measurement Qty:</span> <strong>{data.measurementQty} Pcs</strong></div>
                <div className="flex justify-between border-b border-gray-100"><span>AQL Sampling:</span> <strong>{data.controlledQty} Pcs</strong></div>
            </div>
            {renderSectionComments('sampling')}
          </div>
      )}

      {/* 7. QC FINDINGS WITH TOTALS */}
      {visibleSections.includes('qcDefects') && (
        <div className="border-2 border-black overflow-hidden rounded-xl shadow-sm no-print-break">
            <h3 className="bg-black text-white p-2 font-black uppercase text-[10px] tracking-widest text-center">7. Quality Control (QC) Findings</h3>
            <table className="w-full border-collapse text-[8px]">
                <thead>
                    <tr className="bg-gray-200 text-black font-black uppercase">
                        <th className="border-r border-black p-2 text-left">Defect Description</th>
                        <th className="border-r border-black p-2 w-16 text-center text-red-700">Critical</th>
                        <th className="border-r border-black p-2 w-16 text-center text-indigo-700">Major</th>
                        <th className="p-2 w-16 text-center text-slate-500">Minor</th>
                    </tr>
                </thead>
                <tbody>
                    {(data.qcDefects || []).map(d => (
                        <tr key={d.id} className="border-b border-gray-300">
                            <td className="border-r border-black p-2 font-bold uppercase">{d.description || 'Generic Defect'}</td>
                            <td className="border-r border-black p-2 text-center font-black text-red-600">{d.critical}</td>
                            <td className="border-r border-black p-2 text-center font-black text-indigo-600">{d.major}</td>
                            <td className="p-2 text-center font-bold text-gray-500">{d.minor}</td>
                        </tr>
                    ))}
                    <tr className="bg-slate-100 border-t-2 border-black font-black text-[9px]">
                        <td className="border-r border-black p-2 text-right uppercase tracking-widest">Total Defects Found:</td>
                        <td className="border-r border-black p-2 text-center text-red-700">{defectTotals.critical}</td>
                        <td className="border-r border-black p-2 text-center text-indigo-700">{defectTotals.major}</td>
                        <td className="p-2 text-center text-slate-700">{defectTotals.minor}</td>
                    </tr>
                </tbody>
            </table>
            {renderSectionComments('qcDefects')}
        </div>
      )}

      {/* 8. JUDGEMENT & RESULTS */}
      {visibleSections.includes('judgement') && (
          <div className="border-4 border-black overflow-hidden rounded-xl shadow-sm no-print-break">
            <h3 className="bg-black text-white p-2 font-black uppercase text-[10px] tracking-widest text-center">8. Final Judgement & Results</h3>
            <div className="p-4 text-center">
                <div className={`inline-block px-8 py-3 rounded-2xl text-2xl font-black uppercase tracking-tighter mb-4 ${data.overallResult === 'ACCEPTED' ? 'bg-green-600 text-white' : data.overallResult === 'REJECTED' ? 'bg-red-600 text-white' : 'bg-orange-400 text-white'}`}>
                    {data.overallResult}
                </div>
                <div className="text-left border-t border-gray-200 pt-4 mt-2 italic font-medium whitespace-pre-wrap text-[9px]">
                    <strong>Judgement Remarks:</strong> {data.judgementComments || 'No summary comments.'}
                </div>
            </div>
            {renderSectionComments('judgement')}
          </div>
      )}

      {/* 9. MEASUREMENTS WITH HIERARCHICAL COLS */}
      {visibleSections.includes('measurements') && (
        <div className="border-2 border-black overflow-hidden rounded-xl shadow-sm no-print-break">
            <h3 className="bg-gray-100 p-1.5 border-b-2 border-black font-black uppercase text-[8px] tracking-widest flex justify-between items-center">
                <span>9. Measurement Analysis Sheet</span>
                <span className="text-[7px]">Global Tolerance: +/- {data.globalMasterTolerance || '1.0'} CM</span>
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[7px]">
                    <thead>
                        <tr className="bg-black text-white font-black uppercase text-center">
                            <th rowSpan={2} className="border-r border-white p-1 text-left min-w-[120px]">Point of Measurement</th>
                            <th colSpan={2} className="border-r border-white p-1 text-center w-12 border-b border-white">Tol</th>
                            {(data.qcMeasurementTable?.groups || []).map(g => (
                                <th key={g.id} colSpan={(g.colorCols?.length || 0) + 1} className="border-r border-white p-1 font-black bg-indigo-900 border-b border-indigo-700">{g.size}</th>
                            ))}
                        </tr>
                        <tr className="bg-gray-800 text-white font-black text-[6px]">
                            <th className="border-r border-gray-600 px-1 font-black">(+)</th>
                            <th className="border-r border-gray-600 px-1 font-black">(-)</th>
                            {(data.qcMeasurementTable?.groups || []).map(g => (
                                <React.Fragment key={g.id}>
                                    {(g.colorCols || []).map(c => (
                                        <th key={c.id} className="border-r border-gray-600 px-1 truncate uppercase">{c.color} <br/><span className="text-[5px] opacity-60">STD</span></th>
                                    ))}
                                    <th className="border-r border-white bg-indigo-950 px-1 text-indigo-300">ACTUAL</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(data.qcMeasurementTable?.rows || []).map(row => (
                            <tr key={row.id} className="border-b border-gray-300">
                                <td className="border-r border-black p-1.5 font-black bg-gray-50 uppercase">{row.name}</td>
                                <td className="border-r border-black p-1 text-center font-bold text-gray-500">{row.tolerancePlus}</td>
                                <td className="border-r border-black p-1 text-center font-bold text-gray-500">{row.toleranceMinus}</td>
                                {(data.qcMeasurementTable?.groups || []).map(g => {
                                    const rowGroup = row.groups?.[g.id];
                                    if (!rowGroup) return null;
                                    return (
                                        <React.Fragment key={g.id}>
                                           {(rowGroup.subColumns || []).map(sc => {
                                              const diff = calculateDiff(rowGroup.actualValue, sc.standardValue);
                                              const warn = isDiffWarning(diff, row.tolerancePlus, row.toleranceMinus);
                                              return (
                                                <td key={sc.id} className={`border-r border-gray-300 text-center p-1 font-bold`}>
                                                  <div className="flex flex-col">
                                                    <span className={warn ? 'text-red-600' : ''}>{sc.standardValue || '-'}</span>
                                                    {diff !== '-' && <span className={`text-[5px] font-black ${warn ? 'text-red-600' : 'text-green-600'}`}>({diff})</span>}
                                                  </div>
                                                </td>
                                              );
                                           })}
                                           <td className="border-r border-black text-center p-1 bg-yellow-50 font-black">{rowGroup.actualValue || '-'}</td>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {renderSectionComments('measurements')}
        </div>
      )}

      {/* 10. INSPECTION PHOTOS */}
      {visibleSections.includes('images') && data.images && data.images.length > 0 && (
        <div className="border-2 border-black overflow-hidden rounded-xl shadow-sm no-print-break">
            <h3 className="bg-gray-100 p-1.5 border-b-2 border-black font-black uppercase text-[8px] tracking-widest flex items-center gap-2">
                <ImageIcon className="w-3 h-3"/> 10. Inspection Documentation Photos
            </h3>
            <div className="p-4 grid grid-cols-2 gap-4">
                {data.images.map((img, idx) => (
                    <div key={idx} className="flex flex-col gap-1 border border-gray-200 p-1 rounded bg-gray-50">
                        <div className="aspect-video bg-white overflow-hidden flex items-center justify-center">
                            <img src={img.url} alt={img.label} className="max-w-full max-h-full object-contain" crossOrigin="anonymous" />
                        </div>
                        <span className="text-[7px] font-black text-center uppercase text-gray-500 py-1">{img.label}</span>
                    </div>
                ))}
            </div>
            {renderSectionComments('images')}
        </div>
      )}

      {/* DOCUMENT INDEX */}
      {allDocuments.length > 0 && (
        <div className="border-2 border-black overflow-hidden rounded-xl shadow-sm bg-indigo-50/20 no-print-break">
            <h3 className="bg-indigo-600 text-white p-1.5 font-black uppercase text-[8px] tracking-widest flex items-center gap-2">
                <Link className="w-3 h-3"/> Document Reference Index
            </h3>
            <div className="p-4 grid grid-cols-2 gap-x-8 gap-y-4">
                {allDocuments.map((doc, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                        <span className="text-[6px] font-black text-indigo-700 uppercase tracking-tighter">{doc.label}</span>
                        {doc.files.map(f => (
                            <div key={f.id} className="flex items-center justify-between bg-white border border-indigo-100 p-1 rounded">
                                <div className="flex items-center gap-1 overflow-hidden">
                                    <FileText className="w-2.5 h-2.5 text-slate-400 shrink-0"/>
                                    <span className="text-[7px] truncate font-bold">{f.fileName}</span>
                                </div>
                                <span className="text-[5px] text-gray-400 font-mono italic">Attached</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-auto pt-10 flex justify-between">
          <div className="w-48 border-t-2 border-black text-center pt-2 font-black text-[9px] uppercase tracking-widest">Authorized Factory Seal</div>
          <div className="w-48 border-t-2 border-black text-center pt-2 font-black text-[9px] uppercase tracking-widest">QC Auditor Final Signature</div>
      </div>
    </div>
  );
};

export default InspectionReportTemplate;
