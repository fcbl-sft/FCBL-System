
export interface Measurement {
  id: string;
  code: string;
  labelEs: string;
  labelEn: string;
  values: string[];
  tolerance: string;
}

export interface HeaderInfo {
  season: string;
  year: string;
  styleName: string;
  date: string;
  designerName: string;
  designerEmail: string;
  department: string;
  garmentDetails: string;
}

export interface GarmentSpecs {
  supplier: string;
  referenceNumber: string;
  departmentType: string;
  garmentType: string;
  sampleDate: string;
  seasonCode: string;
  size: string;
}

export interface TechPackImage {
  url: string;
  label: string;
}

export type PageType = 'measurement' | 'fit';

export interface TechPackData {
  id: string;
  pageType: PageType;
  tabName: string;
  sectionTitle: string;
  leftPanelContent: string;
  measurementVersions: string[];
  header: HeaderInfo;
  specs: GarmentSpecs;
  measurements: Measurement[];
  images: TechPackImage[];
}

export type UserRole = 'buyer' | 'supplier';

export type ProjectStatus = 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'PENDING' | 'ACCEPTED';

export interface Comment {
  id: string;
  author: string;
  role: UserRole;
  text: string;
  timestamp: string;
}

export type InspectionStatus = 'DRAFT' | 'SUBMITTED';

export interface ShipmentSizeRow {
  id: string;
  size: string;
  orderQty: number;
  shipQty: number;
  cartonCount: number;
}

export interface ShipmentGroup {
  id: string;
  color: string;
  rows: ShipmentSizeRow[];
}

export interface FileAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadDate: string;
}

export interface AttachmentItem {
  id: string;
  label: string;
  available: boolean;
  attachments: FileAttachment[];
  checked?: boolean;
}

export interface QCDefectRow {
  id: string;
  description: string;
  critical: number;
  major: number;
  minor: number;
}

export interface SectionComment {
  id: string;
  text: string;
  attachments: FileAttachment[];
}

export interface QCMeasurementSubColumn {
  id: string;
  color: string;
  standardValue: string;
}

export interface QCMeasurementGroup {
  id: string;
  size: string;
  actualValue: string;
  subColumns: QCMeasurementSubColumn[];
}

export interface QCMeasurementRow {
  id: string;
  point: string;
  name: string;
  tolerancePlus: string;
  toleranceMinus: string;
  groups: { [groupId: string]: QCMeasurementGroup };
  remarks: string;
}

export interface QCMeasurementTableData {
  groups: { id: string, size: string, colorCols: { id: string, color: string }[] }[];
  rows: QCMeasurementRow[];
}

export interface PackingBoxDetail {
  id: string;
  seqRange: string;
  totalBoxes: number;
  unitsPerBox: number;
  model: string;
  quality: string;
  colorRef: string;
  colorCode: string;
  size: string;
  ratio: number;
  totalPcsInOneBag: number;
  totalBagInCtn: number;
  totalBag: number;
  units: number;
  observation: string;
}

export interface PackingSummaryRow {
  id: string;
  model: string;
  quality: string;
  colorRef: string;
  sizes: { [size: string]: number };
  total: number;
}

export interface ColorReference {
  colorCode: string;
  colorName: string;
}

export interface PackingInfo {
  division: string;
  section: string;
  invoiceRef: string;
  deliveryNoteNo: string;
  orderNumber: string;
  shipmentType: string;
  alarmedGoods: boolean;
  supplierCode: string;
  supplierName: string;
  vatCode: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  destination: string;
  deliveryAddress: string;
  shipmentDate: string;
  arrivalDate: string;
  arrivalTime: string;
  boxDetails: PackingBoxDetail[];
  summaryRows: PackingSummaryRow[];
  colorReferences: ColorReference[];
  grossWeight: number;
  grossWeightUnit: string;
  netWeight: number;
  netWeightUnit: string;
  volume: number;
  volumeUnit: string;
  cartonType: string;
  boxLengthCm: number;
  boxWidthCm: number;
  boxHeightCm: number;
  remarks: string;
  attachments: FileAttachment[];
  comments?: Comment[];
}

export interface InspectionData {
  supplierName: string;
  supplierAddress: string;
  inspectionType: string;
  inspectorName: string;
  inspectionDate: string;
  buyerName: string;
  styleName: string;
  styleNumber: string;
  orderNumber: string;
  totalOrderQuantity: number;
  refNumber: string;
  colorName: string;
  composition: string;
  gauges: string;
  weight: string;
  time: string;
  factoryName: string;
  factoryContact: string;
  countryOfProduction: string;
  shipmentGroups: ShipmentGroup[];
  measurementQty: number;
  controlledQty: number;
  attachments: AttachmentItem[];
  qcDefects: QCDefectRow[];
  qcSummary: {
    majorFound: number;
    maxAllowed: number;
    criticalMaxAllowed: number;
    minorMaxAllowed: number;
  };
  overallResult: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  judgementComments: string;
  additionalComments: string;
  qcMeasurementTable: QCMeasurementTableData;
  globalMasterTolerance: string;
  maxToleranceColorVariation: number;
  measurementComments: string;
  images: TechPackImage[];
  visibleSections: string[];
  sectionComments: { [sectionId: string]: SectionComment[] };
}

export interface Inspection {
  id: string;
  projectId: string;
  type: string;
  status: InspectionStatus;
  data: InspectionData;
}

export interface InvoiceLineItem {
  id: string;
  marksAndNumber: string;
  description: string;
  composition: string;
  orderNo: string;
  styleNo: string;
  hsCode: string;
  quantity: number;
  cartons: number;
  unitPrice: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  expNo: string;
  expDate: string;
  scNo: string;
  scDate: string;
  paymentType?: 'S/C' | 'L/C';  // Payment type selection, defaults to 'S/C'
  lcNo?: string;                 // LC Number (shown when paymentType = 'L/C')
  lcDate?: string;               // LC Date (shown when paymentType = 'L/C')
  shipperName: string; // Exporter / Shipper Company
  shipperAddress: string; // Factory Address
  buyerName: string; // For Account and Risk of Company
  buyerAddress: string; // For Account and Risk of Address
  buyerVatId: string; // For Account and Risk of VAT/ID
  consigneeName: string;
  consigneeAddress: string;
  notifyParty1Name: string;
  notifyParty1Address: string;
  notifyParty1Phone: string;
  notifyParty1Contact: string;
  notifyParty1Email: string;
  notifyParty2Name: string;
  notifyParty2Address: string;
  bankName: string;
  bankBranch: string;
  bankSwift: string;
  bankAccountNo: string;
  exportRegNo: string;
  exportRegDate: string;
  portOfLoading: string;
  finalDestination: string;
  paymentTerms: string;
  modeOfShipment: string;
  blNo: string;
  blDate: string;
  countryOfOrigin: string;
  lineItems: InvoiceLineItem[];
  netWeight: number;
  grossWeight: number;
  totalCbm: number;
  rexDeclaration: string;
  attachments: FileAttachment[];
  status: 'DRAFT' | 'SUBMITTED';
  remarks?: string;
  comments?: Comment[];
}

export interface ProductionDetail {
  id: string;
  knittingStartDate: string;
  color: string;
  numMachines: number;
  leadTimeDays: number;
  productionPerDay: number;
  remarks?: string;
  attachments: FileAttachment[];
}

export interface Milestone {
  id: string;
  label: string;
  date: string;
  remarks?: string;
  attachments: FileAttachment[];
}

export interface Approval {
  id: string;
  name: string;
  date: string;
  signatureUrl?: string;
  remarks?: string;
  attachments: FileAttachment[];
}

export interface PPMeeting {
  id: string;
  meetingType: string;
  meetingDate: string;
  styleNumber: string;
  orderNumber: string;
  orderQuantity: number;
  infoRemarks?: string;
  infoAttachments: FileAttachment[];
  productionDetails: ProductionDetail[];
  productionRemarks?: string;
  productionAttachments: FileAttachment[];
  milestones: Milestone[];
  milestoneRemarks?: string;
  milestoneAttachments: FileAttachment[];
  approvals: Approval[];
  approvalRemarks?: string;
  approvalAttachments: FileAttachment[];
  qcMeasurementTable: QCMeasurementTableData;
  globalMasterTolerance: string;
  comments?: Comment[];
}

export interface MaterialAttachment extends FileAttachment { }

export interface MaterialControlItem {
  id: string;
  label: string;
  orderQty: number;
  receivedQty: number;
  totalWeight: number;
  weightPerProduction: number;
  deadline: string;
  receivedDate: string;
  actualQuality: string;
  receivedQuality: string;
  remark: string;
  attachments: MaterialAttachment[];
  acceptance: string;
  acceptanceDate: string;
  maturityDate: string;
}

export interface UploadedTechPack {
  id: string;
  name: string;
  fileUrl: string;
  uploadDate: string;
  fileName?: string;      // Original file name with extension
  fileType?: string;      // MIME type (e.g., 'application/pdf', 'image/jpeg')
  fileSize?: number;      // Size in bytes
  storagePath?: string;   // Supabase storage path (for cloud uploads)
}

export interface PONumber {
  id: string;
  number: string;
  quantity?: number;      // Quantity in pieces
  deliveryDate?: string;  // Expected delivery date
}

export interface ColorSizeRow {
  id: string;
  colorCode: string;
  sizes: { [sizeKey: string]: number };  // Dynamic sizes object (e.g., { 'XS': 10, 'S': 20, 'M': 30 })
  total: number;
}

export interface POAccessories {
  mainLabel: string;
  careLabel: string;
  hangTag: string;
  polybag: string;
  carton: string;
}

export interface OrderBreakdown {
  id: string;
  poNumber: string;
  sizeColumns: string[];    // List of size column names in order (e.g., ['XS', 'S', 'M', 'L', 'XL', 'XXL'])
  sizeRows: ColorSizeRow[];
  isAutoCreated?: boolean;  // true if auto-created from Tech Pack
  isEdited?: boolean;       // true if user has modified this breakdown
}

export interface OrderSheet {
  id: string;
  companyName: string;
  companyAddress: string;
  companyEmail1: string;
  companyEmail2: string;
  poNumber: string;  // Legacy/primary PO number
  poNumbers?: PONumber[];  // All PO numbers with quantity and delivery date
  factoryName: string;
  factoryAddress: string;
  factoryBin: string;
  buyerName: string;
  buyerAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  shipmentDate: string;
  incoterms: string;
  paymentMethod: string;
  poDate: string;
  season: string;
  currency: string;
  contractNo: string;
  paymentTerms: string;
  rnNumber: string;
  exFactoryDate: string;
  shipmentMethod: 'SEA' | 'AIR' | 'SEA-AIR';
  originCountry: string;
  portOfLading: string;
  dischargePort: string;
  hsCode: string;
  styleName: string;
  styleCode: string;
  fabricWeight: string;
  composition: string;
  gauge: string;
  sizeRatio: string;
  unitPrice: number;
  productImageUrl: string;
  breakdowns: OrderBreakdown[];
  sizeRows?: ColorSizeRow[];
  accessories: POAccessories;
  remarks: string[];
}

// Yarn/Fabric consumption row
export interface YarnConsumptionItem {
  id: string;
  yarnType: string;           // Viscose, Nylon, Cotton, etc.
  compositionPercent: number; // Percentage (must total 100%)
  weightPerPiece: number;     // Grams per garment
  wastagePercent: number;     // Expected wastage %
  ratePerKg: number;          // Cost per kg
  remarks: string;
}

// Accessory consumption row
export interface AccessoryConsumptionItem {
  id: string;
  accessoryName: string;      // Zipper, Button, Label, etc.
  description: string;        // Detailed description
  specification: string;      // Size/spec details
  quantityPerGarment: number; // How many per piece
  unit: string;               // Pcs, Meters, Yards, etc.
  wastagePercent: number;
  ratePerUnit: number;
  supplier: string;
  remarks: string;
}

// Main consumption data
export interface ConsumptionData {
  id: string;
  yarnItems: YarnConsumptionItem[];
  accessoryItems: AccessoryConsumptionItem[];
  remarks?: string;
  comments?: Comment[];
}

// Product color for card display
export interface ProductColor {
  id: string;
  hex: string;
  name?: string;
}

export interface Project {
  id: string;
  title: string;
  productImage?: string;  // Product thumbnail URL for dashboard cards
  productColors?: ProductColor[];  // Color swatches for card display
  poNumbers: PONumber[];
  updatedAt: string;
  status: ProjectStatus;
  techPackFiles: UploadedTechPack[];
  pages: TechPackData[];
  comments: Comment[];
  inspections: Inspection[];
  ppMeetings: PPMeeting[];
  materialControl: MaterialControlItem[];
  invoices: Invoice[];
  packing: PackingInfo;
  orderSheet?: OrderSheet;
  consumption?: ConsumptionData;
  materialRemarks?: string;
  materialAttachments?: FileAttachment[];
  materialComments?: Comment[];
}

