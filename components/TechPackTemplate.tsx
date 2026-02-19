
import React from 'react';
import { TechPackData } from '../types';

interface TechPackTemplateProps {
  data: TechPackData;
}

const TechPackTemplate: React.FC<TechPackTemplateProps> = ({ data }) => {
  // Helper to determine grid class based on image count
  const getImageGridClass = (count: number, index: number) => {
    // Single image: full size
    if (count === 1) return 'col-span-2 row-span-2 h-full';

    // Two images: side by side
    if (count === 2) return 'col-span-1 row-span-2 h-full';

    // Three images: Top is full width (span 2 cols), bottom 2 are side by side
    if (count === 3) {
      if (index === 0) return 'col-span-2 row-span-1 h-full'; // Top
      return 'col-span-1 row-span-1 h-full'; // Bottoms
    }

    // 4+ images: simple grid
    return 'col-span-1 row-span-1 h-full';
  };

  const versions = data.measurementVersions || ['Original'];

  return (
    <div
      id="tech-pack-template"
      className="a4-sheet bg-white text-black relative flex mx-auto shadow-2xl box-border print:shadow-none print:mx-0 items-stretch overflow-hidden"
      style={{
        width: '297mm',
        height: '210mm', // Strict fixed height for single page
        maxHeight: '210mm'
      }}
    >

      {/* LEFT PANEL (40%) */}
      <div className="w-[40%] flex flex-col border-r border-black relative h-full">

        {/* Branding Area - Fixed Height for Alignment (h-32) */}
        <div className="shrink-0 h-32 border-b border-black p-4 flex items-center justify-between bg-white box-border">
          <div>
            <img src="/fcbl-logo.svg" alt="FCBL" style={{ height: '48px' }} />
          </div>
          <div className="text-right">
            <div className="font-bold text-4xl font-display">{data.specs.size || 'M'}</div>
          </div>
        </div>

        {/* Dynamic Section Header - Fixed */}
        <div className="shrink-0 bg-black text-white p-2 flex justify-between items-center">
          <h2 className="font-bold text-sm tracking-widest uppercase pl-2">{data.sectionTitle}</h2>
          {data.pageType === 'measurement' && (
            <span className="text-xs bg-white text-black px-2 py-0.5 rounded font-bold mr-2">TOL +/-</span>
          )}
        </div>

        {/* Left Panel Content: Either Measurement Table OR Text Area */}
        <div className="flex-grow flex flex-col overflow-hidden relative">

          {data.pageType === 'measurement' ? (
            /* MEASUREMENT TABLE */
            <div className="absolute inset-0 overflow-y-auto no-scrollbar">
              <table className="w-full border-collapse table-fixed text-[10px] leading-tight">
                <thead className="bg-gray-100 border-b border-black sticky top-0 z-10">
                  <tr>
                    <th className="text-left py-1 px-2 font-bold border-r border-gray-300 bg-gray-100">DESCRIPTION</th>
                    <th className="w-8 border-r border-gray-300 py-1 text-center font-bold bg-gray-100">CODE</th>
                    {/* Dynamic Version Columns */}
                    {versions.map((ver, i) => (
                      <th key={i} className="border-r border-gray-300 py-1 text-center font-bold bg-gray-100 px-1 truncate">
                        {ver}
                      </th>
                    ))}
                    <th className="w-8 py-1 text-center font-bold bg-gray-100">QC</th>
                  </tr>
                </thead>
                <tbody>
                  {data.measurements.map((m, idx) => (
                    <tr key={m.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200`}>
                      <td className="border-r border-gray-300 py-1.5 px-2 overflow-hidden">
                        <span className="font-bold block text-gray-900 truncate">{m.labelEs}</span>
                        {m.labelEn && <span className="text-gray-500 italic text-[9px] truncate block">{m.labelEn}</span>}
                      </td>
                      <td className="border-r border-gray-300 py-1.5 text-center font-bold font-mono text-[9px] break-words">{m.code}</td>

                      {/* Measurement Values per Version */}
                      {versions.map((_, i) => {
                        const val = m.values[i] || '';
                        // Logic to highlight if value changed from previous version
                        const prevVal = i > 0 ? m.values[i - 1] : undefined;
                        const hasChanged = i > 0 && val !== '' && prevVal !== undefined && val !== prevVal;

                        return (
                          <td key={i} className={`border-r border-gray-300 py-1.5 text-center font-medium text-base ${hasChanged ? 'text-blue-600 font-bold bg-blue-50' : ''}`}>
                            {val}
                          </td>
                        );
                      })}

                      <td className="py-1.5 text-center text-gray-400 text-[8px]">{m.tolerance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* FIT PAGE TEXT CONTENT */
            <div className="absolute inset-0 overflow-y-auto p-4">
              <div className="text-xs whitespace-pre-wrap font-mono text-gray-800 leading-relaxed">
                {data.leftPanelContent || "No fit comments added."}
              </div>
            </div>
          )}

        </div>

        {/* Footer of Left Panel - Fixed Height for Alignment (h-40) */}
        <div className="shrink-0 h-40 border-t border-black p-4 bg-white mt-auto flex flex-col justify-end box-border z-20">
          <div className="flex justify-between text-[10px] mb-2 border-b border-gray-100 pb-1">
            <span className="font-bold uppercase tracking-wider text-gray-500">Designer</span>
            <span className="font-bold">{data.header.designerName}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="font-bold uppercase tracking-wider text-gray-500">Date</span>
            <span className="font-bold">{data.header.date}</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL (60%) - Shared structure for all pages */}
      <div className="w-[60%] flex flex-col relative h-full">

        {/* Top Info Header - Fixed Height for Alignment (h-32) */}
        <div className="shrink-0 h-32 flex flex-col border-b border-black box-border">
          {/* Top Row - Flex 1 */}
          <div className="flex-1 grid grid-cols-2 text-[10px] border-b border-gray-200">
            <div className="p-2 border-r border-gray-300 overflow-hidden flex flex-col justify-center">
              <span className="block text-gray-400 font-bold uppercase tracking-wider text-[10px]">Style Name</span>
              <span className="block text-lg font-bold font-display uppercase truncate leading-none mt-1">{data.header.styleName || 'UNTITLED STYLE'}</span>
            </div>
            <div className="p-2 overflow-hidden flex flex-col justify-center">
              <span className="block text-gray-400 font-bold uppercase tracking-wider text-[10px]">Reference</span>
              <span className="block text-lg font-bold font-display truncate leading-none mt-1">{data.specs.referenceNumber || 'N/A'}</span>
            </div>
          </div>

          {/* Bottom Row - Flex 1 */}
          <div className="flex-1 bg-gray-50 grid grid-cols-4 divide-x divide-gray-300 items-center">
            <div className="p-2 overflow-hidden flex flex-col justify-center h-full">
              <span className="block font-bold text-gray-500 text-[10px] uppercase tracking-wide">SEASON</span>
              <span className="font-bold text-sm truncate leading-tight">{data.header.season} {data.header.year}</span>
            </div>
            <div className="p-2 overflow-hidden flex flex-col justify-center h-full">
              <span className="block font-bold text-gray-500 text-[10px] uppercase tracking-wide">SUPPLIER</span>
              <span className="font-bold text-sm truncate leading-tight">{data.specs.supplier}</span>
            </div>
            <div className="p-2 overflow-hidden flex flex-col justify-center h-full">
              <span className="block font-bold text-gray-500 text-[10px] uppercase tracking-wide">SAMPLE DATE</span>
              <span className="font-bold text-sm truncate leading-tight">{data.specs.sampleDate}</span>
            </div>
            <div className="p-2 overflow-hidden flex flex-col justify-center h-full">
              <span className="block font-bold text-gray-500 text-[10px] uppercase tracking-wide">DEPT</span>
              <span className="font-bold text-sm truncate leading-tight drop-shadow-md text-gray-900">{data.header.department}</span>
            </div>
          </div>
        </div>

        {/* Content Area - Flexible with dynamic height */}
        <div className="flex-grow p-4 flex flex-col gap-4 relative overflow-hidden">

          {/* Images Container */}
          <div className="w-full h-full flex flex-col">

            {data.images.length > 0 ? (
              <div className={`grid gap-4 w-full h-full ${data.images.length > 2 ? 'grid-rows-2' : 'grid-rows-1'} grid-cols-2`}>
                {data.images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`border-2 border-gray-100 rounded-sm relative bg-gray-50 overflow-hidden flex flex-col ${getImageGridClass(data.images.length, idx)}`}
                  >
                    <div className="flex-grow relative overflow-hidden w-full h-full">
                      <img src={img.url} alt={`View ${idx + 1}`} className="w-full h-full object-contain" crossOrigin="anonymous" />
                    </div>

                    {/* Image Label Footer */}
                    <div className="shrink-0 w-full bg-white border-t border-gray-100 py-1 text-center z-10">
                      <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-700 leading-none">{img.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded text-gray-300 text-sm font-bold uppercase tracking-widest">
                No Images Added
              </div>
            )}

          </div>

        </div>

        {/* Footer of Right Panel - Fixed Height for Alignment (h-40) */}
        <div className="shrink-0 h-40 border-t border-black pt-1 w-full overflow-hidden flex flex-col bg-white mt-auto box-border z-20">
          <div className="bg-brand-orange text-white inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest mb-1 self-start ml-1">
            Construction Notes
          </div>
          <div className="text-[10px] leading-relaxed p-2 font-mono text-gray-600 whitespace-pre-wrap flex-grow overflow-hidden break-words">
            {data.header.garmentDetails || "No technical construction notes added."}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TechPackTemplate;
