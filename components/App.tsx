
import React, { useState, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import Dashboard from './Dashboard';
import TechPackEditor from './TechPackEditor';
import InspectionEditor from './InspectionEditor';
import MaterialControl from './MaterialControl';
import PPMeeting from './PPMeeting';
import InvoiceEditor from './InvoiceEditor';
import PackingEditor from './PackingEditor';
import OrderSheetEditor from './OrderSheetEditor';
import ConsumptionEditor from './ConsumptionEditor';
import { Project, UserRole, Inspection, PPMeeting as PPMeetingType, MaterialControlItem, PONumber, Invoice, PackingInfo, TechPackData, OrderSheet, ProjectStatus, Comment, ConsumptionData } from '../types';
import { INITIAL_DATA } from '../constants';
import { supabase } from '../lib/supabase';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'dashboard' | 'editor' | 'inspection' | 'materialControl' | 'ppMeeting' | 'invoice' | 'packing' | 'orderSheet' | 'consumption'>('login');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [bgVideoUrl, setBgVideoUrl] = useState<string | undefined>(undefined);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeInspectionId, setActiveInspectionId] = useState<string | null>(null);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeInspection = activeProject?.inspections.find((i: Inspection) => i.id === activeInspectionId);
  const activeInvoice = activeProject?.invoices?.find((i: Invoice) => i.id === activeInvoiceId);

  const mapToDB = (proj: Partial<Project>) => {
    const dbObj: any = {};
    if (proj.id) dbObj.id = proj.id;
    if (proj.title) dbObj.title = proj.title;
    if (proj.status) dbObj.status = proj.status;
    if (proj.poNumbers) dbObj.po_numbers = proj.poNumbers;
    if (proj.updatedAt) dbObj.updated_at = proj.updatedAt;
    if (proj.techPackFiles) dbObj.tech_pack_files = proj.techPackFiles;
    if (proj.pages) dbObj.pages = proj.pages;
    if (proj.comments) dbObj.comments = proj.comments;
    if (proj.inspections) dbObj.inspections = proj.inspections;
    if (proj.ppMeetings) dbObj.pp_meetings = proj.ppMeetings;
    if (proj.materialControl) dbObj.material_control = proj.materialControl;
    if (proj.invoices) dbObj.invoices = proj.invoices;
    if (proj.packing) dbObj.packing = proj.packing;
    if (proj.orderSheet) dbObj.order_sheet = proj.orderSheet;
    if (proj.consumption) dbObj.consumption = proj.consumption;
    if (proj.materialRemarks !== undefined) dbObj.material_remarks = proj.materialRemarks;
    if (proj.materialAttachments !== undefined) dbObj.material_attachments = proj.materialAttachments;
    if (proj.materialComments !== undefined) dbObj.material_comments = proj.materialComments;
    return dbObj;
  };

  const mapFromDB = (row: any): Project => ({
    id: row.id,
    title: row.title,
    poNumbers: row.po_numbers || [],
    status: row.status,
    updatedAt: row.updated_at,
    techPackFiles: row.tech_pack_files || [],
    pages: row.pages || [],
    comments: row.comments || [],
    inspections: row.inspections || [],
    ppMeetings: row.pp_meetings || [],
    materialControl: row.material_control || [],
    invoices: row.invoices || [],
    packing: row.packing || createDefaultPacking(),
    orderSheet: row.order_sheet,
    consumption: row.consumption,
    materialRemarks: row.material_remarks || '',
    materialAttachments: row.material_attachments || [],
    materialComments: row.material_comments || []
  });

  useEffect(() => {
    if (currentUserRole) {
      fetchProjects();
    }
  }, [currentUserRole]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects((data || []).map(mapFromDB));
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (role: UserRole) => {
    setCurrentUserRole(role);
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    setCurrentUserRole(null);
    setCurrentScreen('login');
    setActiveProjectId(null);
    setActiveInspectionId(null);
    setActiveInvoiceId(null);
  };

  const updateProjectInDB = async (projectId: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
    try {
      const dbUpdates = mapToDB({ ...updates, updatedAt: new Date().toISOString() });
      const { error } = await supabase.from('projects').update(dbUpdates).eq('id', projectId);
      if (error) throw error;
    } catch (err: any) {
      console.error("Database update failed:", err);
    }
  };

  const handleCreateTechPack = async () => {
    const styleName = prompt("Enter Style Name:");
    if (!styleName) return;

    const poNumber = prompt("Enter PO Number:");
    if (!poNumber) return;

    const initialPages: TechPackData[] = [JSON.parse(JSON.stringify(INITIAL_DATA))];
    if (initialPages[0]?.header) {
      initialPages[0].header.styleName = styleName;
    }

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      title: styleName,
      poNumbers: [{ id: `po-${Date.now()}`, number: poNumber }],
      status: 'DRAFT',
      updatedAt: new Date().toISOString(),
      techPackFiles: [],
      pages: initialPages,
      comments: [],
      inspections: [],
      ppMeetings: [],
      materialControl: [],
      invoices: [],
      packing: createDefaultPacking(),
      materialRemarks: '',
      materialAttachments: [],
      materialComments: []
    };

    try {
      const { error } = await supabase.from('projects').insert(mapToDB(newProj));
      if (error) throw error;
      setProjects(prev => [newProj, ...prev]);
      setActiveProjectId(newProj.id);
      setCurrentScreen('editor');
    } catch (err: any) {
      console.error("Failed to create tech pack:", err);
      alert("Failed to create tech pack");
    }
  };

  const handleUpdateInspection = async (updatedInspection: Inspection) => {
    if (!activeProject) return;
    setActiveInspectionId(updatedInspection.id);
    const exists = activeProject.inspections.some((i: Inspection) => i.id === updatedInspection.id);
    const updatedInspections = exists
      ? activeProject.inspections.map((i: Inspection) => i.id === updatedInspection.id ? updatedInspection : i)
      : [...activeProject.inspections, updatedInspection];
    await updateProjectInDB(activeProject.id, { inspections: updatedInspections });
  };

  const handleManageInspection = async (project: Project) => {
    setActiveProjectId(project.id);
    const existing = project.inspections.length > 0 ? project.inspections[project.inspections.length - 1] : null;
    if (existing) {
      setActiveInspectionId(existing.id);
    } else {
      const newInsp = createDefaultInspection(project.id, project.title, 'Inline');
      const updatedIns = [...project.inspections, newInsp];
      await updateProjectInDB(project.id, { inspections: updatedIns });
      setActiveInspectionId(newInsp.id);
    }
    setCurrentScreen('inspection');
  };

  const handleManageInvoice = async (project: Project) => {
    setActiveProjectId(project.id);
    const existing = project.invoices && project.invoices.length > 0 ? project.invoices[0] : null;
    if (existing) {
      setActiveInvoiceId(existing.id);
    } else {
      const newInvoice: Invoice = {
        id: `INV-${Date.now()}`,
        invoiceNo: `FC-${Date.now().toString().slice(-6)}`,
        invoiceDate: new Date().toISOString().split('T')[0],
        expNo: '', expDate: '', scNo: '', scDate: '',
        shipperName: 'FASHION COMFORT (BD) LTD',
        shipperAddress: 'Dhaka, Bangladesh',
        buyerName: '', buyerAddress: '', buyerVatId: '',
        consigneeName: '', consigneeAddress: '',
        notifyParty1Name: '', notifyParty1Address: '', notifyParty1Phone: '', notifyParty1Contact: '', notifyParty1Email: '',
        notifyParty2Name: '', notifyParty2Address: '',
        bankName: '', bankBranch: '', bankSwift: '', bankAccountNo: '',
        exportRegNo: '', exportRegDate: '',
        portOfLoading: 'Chittagong, BD',
        finalDestination: '',
        paymentTerms: 'TT / LC',
        modeOfShipment: 'SEA',
        blNo: '', blDate: '',
        countryOfOrigin: 'Bangladesh',
        lineItems: [],
        netWeight: 0, grossWeight: 0, totalCbm: 0,
        rexDeclaration: 'The exporter declarations...',
        attachments: [],
        status: 'DRAFT',
        remarks: '',
        comments: []
      };
      const updated = [...(project.invoices || []), newInvoice];
      await updateProjectInDB(project.id, { invoices: updated });
      setActiveInvoiceId(newInvoice.id);
    }
    setCurrentScreen('invoice');
  };

  const handleManagePacking = (project: Project) => {
    setActiveProjectId(project.id);
    setCurrentScreen('packing');
  };

  const handleManageOrderSheet = (project: Project) => {
    setActiveProjectId(project.id);
    setCurrentScreen('orderSheet');
  };

  const handleManageConsumption = (project: Project) => {
    setActiveProjectId(project.id);
    setCurrentScreen('consumption');
  };

  const handleDeleteInspection = async (id: string) => {
    if (!activeProject) return;
    const updatedIns = activeProject.inspections.filter((i: Inspection) => i.id !== id);
    await updateProjectInDB(activeProject.id, { inspections: updatedIns });
    if (activeInspectionId === id) {
      setActiveInspectionId(updatedIns[0]?.id || null);
    }
  };

  function createDefaultPacking(): PackingInfo {
    return {
      division: 'BLOQUE',
      section: 'SENORA',
      invoiceRef: '',
      deliveryNoteNo: '',
      orderNumber: '',
      shipmentType: 'SEA',
      alarmedGoods: false,
      supplierCode: 'PROV-123',
      supplierName: 'FASHION COMFORT (BD) LTD',
      vatCode: 'VAT-BD-999',
      address: 'Dhaka',
      phone: '+880-123',
      fax: '',
      email: 'logistics@fashioncomfort.bd',
      destination: 'Barcelona',
      deliveryAddress: '',
      shipmentDate: '',
      arrivalDate: '',
      arrivalTime: '',
      boxDetails: [],
      summaryRows: [],
      colorReferences: [],
      grossWeight: 0,
      grossWeightUnit: 'KGS',
      netWeight: 0,
      netWeightUnit: 'KGS',
      volume: 0,
      volumeUnit: 'CBM',
      cartonType: 'Standard',
      boxLengthCm: 0,
      boxWidthCm: 0,
      boxHeightCm: 0,
      remarks: '',
      attachments: [],
      comments: []
    };
  }

  const createDefaultInspection = (projectId: string, title: string, type: string = 'Inline'): Inspection => {
    const preloadedMeasurements = ["Body length", "Chest width"];
    const defaultSizes = ['S', 'M', 'L'];
    const groupConfigs = defaultSizes.map(size => ({
      id: `g-${size}-${Date.now()}`,
      size: size,
      colorCols: [{ id: `c-${Date.now()}`, color: 'Standard' }]
    }));
    const qcMeasurementRows = preloadedMeasurements.map((name, i) => {
      const rowGroups: any = {};
      groupConfigs.forEach(gc => {
        rowGroups[gc.id] = { id: gc.id, size: gc.size, actualValue: '', subColumns: [{ id: gc.colorCols[0].id, color: 'Standard', standardValue: '' }] };
      });
      return { id: `m-${i}`, point: (i + 1).toString(), name, tolerancePlus: '1.0', toleranceMinus: '1.0', groups: rowGroups, remarks: '' };
    });

    return {
      id: `INS-${Date.now()}`,
      projectId: projectId,
      type: type,
      status: 'DRAFT',
      data: {
        supplierName: 'FASHION COMFORT (BD) LTD',
        inspectionDate: new Date().toISOString().split('T')[0],
        styleName: title,
        composition: '100% Cotton',
        shipmentGroups: [],
        attachments: [],
        qcDefects: [],
        qcSummary: { majorFound: 0, maxAllowed: 4, criticalMaxAllowed: 0, minorMaxAllowed: 10 },
        overallResult: 'PENDING',
        qcMeasurementTable: { groups: groupConfigs, rows: qcMeasurementRows },
        globalMasterTolerance: '1.0',
        images: [],
        visibleSections: ['generalInfo', 'orderDetails', 'shipment', 'qcDefects', 'judgement', 'measurements'],
        sectionComments: {},
        supplierAddress: '', inspectionType: '', inspectorName: '', buyerName: '', styleNumber: '', orderNumber: '', totalOrderQuantity: 0, refNumber: '', colorName: '', gauges: '', weight: '', time: '', factoryName: '', factoryContact: '', countryOfProduction: '', measurementQty: 0, controlledQty: 0, judgementComments: '', additionalComments: '', maxToleranceColorVariation: 0, measurementComments: ''
      }
    };
  };

  return (
    <div className="min-h-screen">
      {currentScreen === 'login' && <LoginScreen onLogin={handleLogin} videoUrl={bgVideoUrl} />}

      {currentScreen === 'dashboard' && (
        <Dashboard
          role={currentUserRole!}
          projects={projects}
          onSelectProject={(p: Project) => { setActiveProjectId(p.id); setCurrentScreen('editor'); }}
          onCreateTechPack={handleCreateTechPack}
          onUploadTechPack={async (file: File) => {
            const fileUrl = URL.createObjectURL(file);
            const newProj: Project = {
              id: `proj-${Date.now()}`,
              title: file.name,
              poNumbers: [{ id: 'default', number: 'N/A' }],
              status: 'DRAFT',
              updatedAt: new Date().toISOString(),
              pages: [JSON.parse(JSON.stringify(INITIAL_DATA))],
              techPackFiles: [{ id: `f-${Date.now()}`, name: 'PDF Import', fileUrl, uploadDate: new Date().toISOString() }],
              invoices: [],
              inspections: [],
              ppMeetings: [],
              materialControl: [],
              comments: [],
              packing: createDefaultPacking(),
              materialRemarks: '',
              materialAttachments: [],
              materialComments: []
            };
            try {
              const { error } = await supabase.from('projects').insert(mapToDB(newProj));
              if (error) throw error;
              setProjects(prev => [newProj, ...prev]);
            } catch (err: any) { console.error(err); }
          }}
          onLogout={handleLogout}
          onDeleteProject={async (id: string) => { if (confirm("Delete Style?")) { await supabase.from('projects').delete().eq('id', id); setProjects(p => p.filter(x => x.id !== id)); } }}
          onRenameProject={(id: string, title: string) => updateProjectInDB(id, { title })}
          onManageInspection={handleManageInspection}
          onManageInvoice={handleManageInvoice}
          onManagePacking={handleManagePacking}
          onManageOrderSheet={handleManageOrderSheet}
          onManageConsumption={handleManageConsumption}
          onManageMaterialControl={(p: Project) => { setActiveProjectId(p.id); setCurrentScreen('materialControl'); }}
          onManagePPMeeting={(p: Project) => { setActiveProjectId(p.id); setCurrentScreen('ppMeeting'); }}
          onUpdateProject={updateProjectInDB}
        />
      )}

      {currentScreen === 'editor' && activeProject && (
        <TechPackEditor
          project={activeProject}
          onUpdateProject={(p: Project) => updateProjectInDB(p.id, p)}
          onBack={() => setCurrentScreen('dashboard')}
          currentUserRole={currentUserRole!}
          onStatusChange={(s: ProjectStatus) => updateProjectInDB(activeProject.id, { status: s })}
          onAddComment={(txt: string) => {
            const newComment = { id: Date.now().toString(), author: 'User', role: currentUserRole!, text: txt, timestamp: new Date().toISOString() };
            updateProjectInDB(activeProject.id, { comments: [...(activeProject.comments || []), newComment] });
          }}
        />
      )}

      {currentScreen === 'orderSheet' && activeProject && (
        <OrderSheetEditor
          project={activeProject}
          onUpdate={(orderSheet: OrderSheet) => updateProjectInDB(activeProject.id, { orderSheet })}
          onBack={() => setCurrentScreen('dashboard')}
          onSave={() => setCurrentScreen('dashboard')}
        />
      )}

      {currentScreen === 'invoice' && activeProject && activeInvoice && (
        <InvoiceEditor
          project={activeProject}
          invoice={activeInvoice}
          onUpdate={(inv: Invoice) => {
            const updated = activeProject.invoices.map((i: Invoice) => i.id === inv.id ? inv : i);
            updateProjectInDB(activeProject.id, { invoices: updated });
          }}
          onBack={() => setCurrentScreen('dashboard')}
          onSave={() => setCurrentScreen('dashboard')}
        />
      )}

      {currentScreen === 'packing' && activeProject && (
        <PackingEditor
          project={activeProject}
          onUpdate={(packing: PackingInfo) => updateProjectInDB(activeProject.id, { packing })}
          onBack={() => setCurrentScreen('dashboard')}
          onSave={() => setCurrentScreen('dashboard')}
        />
      )}

      {currentScreen === 'inspection' && activeProject && activeInspection && (
        <InspectionEditor
          project={activeProject}
          inspection={activeInspection}
          onUpdate={handleUpdateInspection}
          onBack={() => setCurrentScreen('dashboard')}
          onSave={() => setCurrentScreen('dashboard')}
          onDeleteInspection={handleDeleteInspection}
        />
      )}

      {currentScreen === 'materialControl' && activeProject && (
        <MaterialControl
          project={activeProject}
          onUpdateProject={(updates: Partial<Project>) => updateProjectInDB(activeProject.id, updates)}
          onUpdate={(items: MaterialControlItem[]) => updateProjectInDB(activeProject.id, { materialControl: items })}
          onBack={() => setCurrentScreen('dashboard')}
        />
      )}

      {currentScreen === 'ppMeeting' && activeProject && (
        <PPMeeting
          project={activeProject}
          onUpdate={(meetings: PPMeetingType[]) => updateProjectInDB(activeProject.id, { ppMeetings: meetings })}
          onBack={() => setCurrentScreen('dashboard')}
        />
      )}

      {currentScreen === 'consumption' && activeProject && (
        <ConsumptionEditor
          project={activeProject}
          onUpdate={(consumption: ConsumptionData) => updateProjectInDB(activeProject.id, { consumption })}
          onBack={() => setCurrentScreen('dashboard')}
          onSave={() => setCurrentScreen('dashboard')}
        />
      )}

      {loading && <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[100] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}
    </div>
  );
};

export default App;
