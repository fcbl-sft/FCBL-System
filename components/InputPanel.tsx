
import React, { useRef } from 'react';
import { TechPackData, Measurement } from '../types';
import { DEPARTMENTS, SIZES, GARMENT_TYPES } from '../constants';
import { Wand2, Loader2, FileImage, Trash2, Plus, Upload, Settings, Lock, AlertTriangle, Columns } from 'lucide-react';

interface InputPanelProps {
  data: TechPackData;
  previousData?: TechPackData;
  onChange: (newData: TechPackData) => void;
  onAutoFill: (file: File) => void;
  isAnalyzing: boolean;
  readOnly?: boolean;
}

const InputPanel: React.FC<InputPanelProps> = ({ data, previousData, onChange, onAutoFill, isAnalyzing, readOnly = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Helper to check if a value has changed
  const hasChanged = (current: string, prev: string | undefined) => {
    if (prev === undefined) return false;
    return current !== prev;
  };

  // Helper class for diff highlighting
  const getDiffClass = (current: string, prev?: string) => {
    return hasChanged(current, prev) ? 'bg-orange-100 border-orange-400 text-orange-900 ring-1 ring-orange-200' : 'bg-gray-50';
  };

  const updateHeader = (field: keyof typeof data.header, value: string) => {
    if (readOnly) return;
    onChange({
      ...data,
      header: { ...data.header, [field]: value }
    });
  };

  const updateSpecs = (field: keyof typeof data.specs, value: string) => {
    if (readOnly) return;
    onChange({
      ...data,
      specs: { ...data.specs, [field]: value }
    });
  };

  const updateMeasurementLabel = (id: string, field: 'labelEs' | 'labelEn' | 'code' | 'tolerance', value: string) => {
    if (readOnly) return;
    const newMeasurements = data.measurements.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    );
    onChange({ ...data, measurements: newMeasurements });
  };

  // Update a specific version value
  const updateMeasurementValue = (id: string, versionIndex: number, value: string) => {
    if (readOnly) return;
    const newMeasurements = data.measurements.map(m => {
        if (m.id === id) {
            const newValues = [...m.values];
            newValues[versionIndex] = value;
            return { ...m, values: newValues };
        }
        return m;
    });
    onChange({ ...data, measurements: newMeasurements });
  };

  const addMeasurement = () => {
    if (readOnly) return;
    const newId = Date.now().toString();
    // Initialize new measurement with empty strings for all existing versions
    const emptyValues = new Array(data.measurementVersions?.length || 1).fill('');
    
    const newMeasurement: Measurement = {
      id: newId,
      code: String.fromCharCode(65 + data.measurements.length),
      labelEs: '',
      labelEn: '',
      values: emptyValues,
      tolerance: '0.5'
    };
    onChange({
      ...data,
      measurements: [...data.measurements, newMeasurement]
    });
  };

  const removeMeasurement = (id: string) => {
    if (readOnly) return;
    onChange({
      ...data,
      measurements: data.measurements.filter(m => m.id !== id)
    });
  };

  // Add a new measurement version column
  const addMeasurementVersion = () => {
     if (readOnly) return;
     const newVersionName = `Fit ${data.measurementVersions.length}`;
     const newVersions = [...data.measurementVersions, newVersionName];
     
     // Add empty string to values array for all measurements
     const newMeasurements = data.measurements.map(m => ({
         ...m,
         values: [...m.values, '']
     }));

     onChange({
         ...data,
         measurementVersions: newVersions,
         measurements: newMeasurements
     });
  };

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({
          ...data,
          images: [...data.images, { 
            url: reader.result as string, 
            label: `View ${data.images.length + 1}` 
          }]
        });
        if (imageInputRef.current) imageInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (index: number) => {
    if (readOnly) return;
    const newImages = [...data.images];
    newImages.splice(index, 1);
    onChange({
        ...data,
        images: newImages
    });
  };

  const updateImageLabel = (index: number, newLabel: string) => {
    if (readOnly) return;
    const newImages = [...data.images];
    newImages[index] = { ...newImages[index], label: newLabel };
    onChange({ ...data, images: newImages });
  };

  const handleMagicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            onChange({
                ...data,
                images: [{ 
                  url: reader.result as string, 
                  label: 'Main View' 
                }, ...data.images]
            });
            onAutoFill(file);
        };
        reader.readAsDataURL(file);
    }
  };

  const updatePageConfig = (field: 'tabName' | 'sectionTitle' | 'leftPanelContent', value: string) => {
    if (readOnly) return;
    onChange({ ...data, [field]: value });
  };

  const baseInputClass = "w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-black focus:border-black";

  return (
    <div className="h-full flex flex-col">
      <div className="p-5 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-bold font-display text-gray-800 flex items-center gap-2">
          <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-xs rounded">GP</span>
          GenPack Editor
        </h2>
        
        {/* Magic Upload - Only show if not just editing text and not read only */}
        {!readOnly && (
            <div className="mt-4">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleMagicUpload}
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-2 px-4 rounded shadow-sm text-sm font-medium flex items-center justify-center gap-2 transition-all"
                >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {isAnalyzing ? 'Analyzing Garment...' : 'AI Auto-Fill from Image'}
                </button>
            </div>
        )}
        {readOnly && (
             <div className="mt-4 bg-yellow-100 text-yellow-800 text-xs p-2 rounded flex items-center gap-2 font-bold justify-center">
                 <Lock className="w-3 h-3" /> View Only Mode
             </div>
        )}
        {previousData && (
            <div className="mt-2 bg-orange-50 text-orange-800 text-[10px] p-2 rounded flex items-center gap-2 border border-orange-200">
                <AlertTriangle className="w-3 h-3" /> Changes highlighted in orange
            </div>
        )}
      </div>

      <div className="flex-grow p-5 space-y-8 overflow-y-auto">
        
        {/* SECTION 0: PAGE CONFIG */}
        <section className="bg-blue-50 p-3 rounded border border-blue-100">
           <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1">
             <Settings className="w-3 h-3" /> Page Settings
           </h3>
           <div className="grid grid-cols-2 gap-3">
             <div>
               <label className="block text-[10px] font-bold text-gray-500 mb-1">TAB NAME</label>
               <input 
                 className={`${baseInputClass} ${getDiffClass(data.tabName, previousData?.tabName)}`}
                 value={data.tabName}
                 onChange={(e) => updatePageConfig('tabName', e.target.value)}
                 disabled={readOnly}
               />
             </div>
             <div>
               <label className="block text-[10px] font-bold text-gray-500 mb-1">SECTION TITLE</label>
               <input 
                 className={`${baseInputClass} ${getDiffClass(data.sectionTitle, previousData?.sectionTitle)}`}
                 value={data.sectionTitle}
                 onChange={(e) => updatePageConfig('sectionTitle', e.target.value)}
                 disabled={readOnly}
               />
             </div>
           </div>
        </section>

        {/* SECTION 1: HEADER */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Header Info</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Season</label>
              <input 
                type="text"
                className={`${baseInputClass} ${getDiffClass(data.header.season, previousData?.header.season)}`}
                value={data.header.season}
                onChange={(e) => updateHeader('season', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
              <input 
                type="text"
                className={`${baseInputClass} ${getDiffClass(data.header.year, previousData?.header.year)}`}
                value={data.header.year}
                onChange={(e) => updateHeader('year', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Style Name</label>
              <input 
                type="text" 
                className={`${baseInputClass} ${getDiffClass(data.header.styleName, previousData?.header.styleName)}`}
                value={data.header.styleName}
                onChange={(e) => updateHeader('styleName', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="col-span-2">
               <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
               <select 
                className={`${baseInputClass} ${getDiffClass(data.header.department, previousData?.header.department)}`}
                value={data.header.department}
                onChange={(e) => updateHeader('department', e.target.value)}
                disabled={readOnly}
              >
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
             <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Designer Name</label>
              <input 
                type="text" 
                className={`${baseInputClass} ${getDiffClass(data.header.designerName, previousData?.header.designerName)}`}
                value={data.header.designerName}
                onChange={(e) => updateHeader('designerName', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input 
                type="date" 
                className={`${baseInputClass} ${getDiffClass(data.header.date, previousData?.header.date)}`}
                value={data.header.date}
                onChange={(e) => updateHeader('date', e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
        </section>

        {/* SECTION 2: IMAGES */}
        <section>
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Images</h3>
             {!readOnly && (
                <>
                    <button 
                        onClick={() => imageInputRef.current?.click()}
                        className="flex items-center gap-1 text-xs bg-black text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                    >
                        <Upload className="w-3 h-3" /> Add Image
                    </button>
                    <input 
                        type="file" 
                        ref={imageInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleAddImage}
                    />
                </>
             )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {data.images.map((img, index) => {
              const prevImage = previousData?.images?.[index];
              const isLabelChanged = hasChanged(img.label, prevImage?.label);
              
              return (
              <div key={index} className="flex flex-col gap-1">
                <div className="relative group border border-gray-200 rounded overflow-hidden aspect-square bg-gray-50">
                    <img src={img.url} alt={`Uploaded ${index}`} className="w-full h-full object-cover" />
                    {!readOnly && (
                        <button 
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
                        >
                        <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      Pos: {index + 1}
                    </div>
                </div>
                <input 
                  type="text"
                  className={`${baseInputClass} text-[10px] py-1 text-center ${isLabelChanged ? 'bg-orange-100 border-orange-400 text-orange-900' : 'bg-gray-50'}`}
                  value={img.label}
                  onChange={(e) => updateImageLabel(index, e.target.value)}
                  disabled={readOnly}
                />
              </div>
            )})}
            {data.images.length === 0 && (
                <div className="col-span-2 text-center py-6 border-2 border-dashed border-gray-200 rounded text-gray-400 text-xs flex flex-col items-center gap-2">
                    <FileImage className="w-6 h-6 opacity-50" />
                    <span>No images added</span>
                </div>
            )}
          </div>
        </section>

        {/* SECTION 3: SPECS */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Specifications</h3>
          <div className="grid grid-cols-2 gap-3">
             <div className="col-span-2">
               <label className="block text-xs font-medium text-gray-700 mb-1">Garment Type</label>
               <select 
                className={`${baseInputClass} ${getDiffClass(data.specs.garmentType, previousData?.specs.garmentType)}`}
                value={data.specs.garmentType}
                onChange={(e) => updateSpecs('garmentType', e.target.value)}
                disabled={readOnly}
              >
                {GARMENT_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
             </div>
             <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sample Date</label>
                <input 
                    type="date" 
                    className={`${baseInputClass} ${getDiffClass(data.specs.sampleDate, previousData?.specs.sampleDate)}`}
                    value={data.specs.sampleDate}
                    onChange={(e) => updateSpecs('sampleDate', e.target.value)}
                    disabled={readOnly}
                />
             </div>
             <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Size</label>
                <select 
                    className={`${baseInputClass} ${getDiffClass(data.specs.size, previousData?.specs.size)}`}
                    value={data.specs.size}
                    onChange={(e) => updateSpecs('size', e.target.value)}
                    disabled={readOnly}
                >
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>
             <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Supplier Name</label>
                <input 
                    type="text" 
                    className={`${baseInputClass} ${getDiffClass(data.specs.supplier, previousData?.specs.supplier)}`}
                    value={data.specs.supplier}
                    onChange={(e) => updateSpecs('supplier', e.target.value)}
                    disabled={readOnly}
                />
             </div>
             <div className="col-span-2">
                 <label className="block text-xs font-medium text-gray-700 mb-1">Reference #</label>
                 <input 
                    type="text" 
                    className={`${baseInputClass} ${getDiffClass(data.specs.referenceNumber, previousData?.specs.referenceNumber)}`}
                    value={data.specs.referenceNumber}
                    onChange={(e) => updateSpecs('referenceNumber', e.target.value)}
                    disabled={readOnly}
                />
             </div>
          </div>
        </section>

        {/* SECTION 4: MEASUREMENTS OR FIT CONTENT */}
        {data.pageType === 'measurement' ? (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Measurements</h3>
                  <span className="text-[10px] text-gray-500">Size: {data.specs.size}</span>
              </div>
              <div className="flex gap-2">
                  {!readOnly && (
                    <button 
                        onClick={addMeasurementVersion}
                        className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 transition-colors border border-indigo-200"
                    >
                        <Columns className="w-3 h-3" /> Add Ver
                    </button>
                  )}
                  {!readOnly && (
                    <button 
                        onClick={addMeasurement}
                        className="flex items-center gap-1 text-xs bg-black text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                    >
                        <Plus className="w-3 h-3" /> Add Row
                    </button>
                  )}
              </div>
            </div>
            
            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold mb-2 px-1">
              <div className="w-[30%] pl-1">DESC / CODE</div>
              {/* Dynamic Headers in Editor */}
              <div className="flex-1 flex gap-1 overflow-x-auto">
                 {data.measurementVersions.map((ver, i) => (
                     <div key={i} className="min-w-[60px] text-center truncate">{ver}</div>
                 ))}
              </div>
              <div className="w-[20px]"></div>
            </div>

            <div className="space-y-2">
              {data.measurements.map((m) => {
                  const prevM = previousData?.measurements.find(pm => pm.id === m.id);
                  const isLabelEsChanged = hasChanged(m.labelEs, prevM?.labelEs);

                  return (
                  <div key={m.id} className="flex gap-1 items-start bg-gray-50 p-1 rounded border border-gray-100 relative group">
                      
                      {/* Fixed Left Column */}
                      <div className="w-[30%] flex flex-col gap-1 shrink-0">
                          <input 
                              className={`${baseInputClass} text-[10px] py-1 ${isLabelEsChanged ? 'bg-orange-100 border-orange-400' : 'bg-white'}`}
                              value={m.labelEs}
                              onChange={(e) => updateMeasurementLabel(m.id, 'labelEs', e.target.value)}
                              disabled={readOnly}
                              placeholder="Description"
                          />
                          <div className="flex gap-1">
                            <input 
                                className={`${baseInputClass} text-[9px] py-1 italic text-gray-500 bg-white`}
                                value={m.code}
                                onChange={(e) => updateMeasurementLabel(m.id, 'code', e.target.value)}
                                disabled={readOnly}
                                placeholder="Code"
                            />
                             <input 
                                className={`${baseInputClass} text-[9px] py-1 text-gray-400 bg-white w-10 text-center`}
                                value={m.tolerance}
                                onChange={(e) => updateMeasurementLabel(m.id, 'tolerance', e.target.value)}
                                disabled={readOnly}
                                placeholder="Tol"
                            />
                          </div>
                      </div>

                      {/* Dynamic Value Columns */}
                      <div className="flex-1 flex gap-1 overflow-x-auto items-start">
                          {data.measurementVersions.map((ver, i) => {
                              const val = m.values[i] || '';
                              // Diff logic for values: compare with prev snapshot if available
                              const prevValSnapshot = prevM?.values?.[i];
                              const isValChangedSnapshot = hasChanged(val, prevValSnapshot);
                              
                              return (
                                  <input 
                                    key={i}
                                    type="text" 
                                    className={`min-w-[60px] h-full ${baseInputClass} text-center font-bold px-0 
                                        ${isValChangedSnapshot ? 'bg-orange-100 border-orange-400 text-orange-900' : 'bg-white'}`}
                                    value={val}
                                    onChange={(e) => updateMeasurementValue(m.id, i, e.target.value)}
                                    disabled={readOnly}
                                    placeholder="-"
                                  />
                              );
                          })}
                      </div>

                      <div className="w-[20px] flex justify-center pt-2 shrink-0">
                          {!readOnly && (
                            <button 
                                onClick={() => removeMeasurement(m.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                  </div>
              )})}
            </div>
          </section>
        ) : (
          /* FIT PAGE CONTENT */
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Left Panel Content</h3>
            <textarea 
                className={`${baseInputClass} h-64 font-mono text-xs ${getDiffClass(data.leftPanelContent, previousData?.leftPanelContent)}`}
                value={data.leftPanelContent}
                onChange={(e) => updatePageConfig('leftPanelContent', e.target.value)}
                disabled={readOnly}
            />
          </section>
        )}

         {/* SECTION 5: DETAILS */}
         <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Technical Notes</h3>
            <textarea 
                className={`${baseInputClass} h-32 ${getDiffClass(data.header.garmentDetails, previousData?.header.garmentDetails)}`}
                value={data.header.garmentDetails}
                onChange={(e) => updateHeader('garmentDetails', e.target.value)}
                disabled={readOnly}
            />
         </section>

      </div>
    </div>
  );
};

export default InputPanel;
