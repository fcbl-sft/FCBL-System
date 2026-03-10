import { Measurement, TechPackData } from './types';

export const DEFAULT_MEASUREMENTS: Measurement[] = [
  { id: '1', code: 'A', labelEs: 'Ancho cuello', labelEn: 'Neck width', values: [''], tolerance: '0.5' },
  { id: '2', code: 'A1', labelEs: 'Bajada cuello delantero', labelEn: 'Front neck drop', values: [''], tolerance: '0.5' },
  { id: '3', code: 'A2', labelEs: 'Bajada cuello trasero', labelEn: 'Back neck drop', values: [''], tolerance: '0.5' },
  { id: '4', code: 'B', labelEs: 'Ancho hombro', labelEn: 'Shoulder width', values: [''], tolerance: '1.0' },
  { id: '5', code: 'C', labelEs: 'Ancho pecho', labelEn: 'Chest width', values: [''], tolerance: '1.0' },
  { id: '6', code: 'C1', labelEs: 'Ancho cintura', labelEn: 'Waist width', values: [''], tolerance: '1.0' },
  { id: '7', code: 'C2', labelEs: 'Ancho bajo', labelEn: 'Hem width', values: [''], tolerance: '1.0' },
  { id: '8', code: 'D', labelEs: 'Largo total', labelEn: 'Total length', values: [''], tolerance: '1.5' },
  { id: '9', code: 'E', labelEs: 'Largo manga', labelEn: 'Sleeve length', values: [''], tolerance: '1.0' },
  { id: '10', code: 'F', labelEs: 'Ancho sisa', labelEn: 'Armhole width', values: [''], tolerance: '0.5' },
  { id: '11', code: 'G', labelEs: 'Ancho bíceps', labelEn: 'Bicep width', values: [''], tolerance: '0.5' },
  { id: '12', code: 'H', labelEs: 'Puño', labelEn: 'Cuff opening', values: [''], tolerance: '0.5' },
  { id: '13', code: 'I', labelEs: 'Alto puño', labelEn: 'Cuff height', values: [''], tolerance: '0.2' },
  { id: '14', code: 'J', labelEs: 'Alto cuello', labelEn: 'Neck trim height', values: [''], tolerance: '0.2' },
];

export const SEASONS = ['SS', 'AW', 'RESORT', 'PRE-FALL'];
export const YEARS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() + i).toString());
export const DEPARTMENTS = ['MEN KNITWEAR', 'WOMEN KNITWEAR', 'MEN WOVEN', 'WOMEN WOVEN', 'ACCESSORIES', 'DENIM'];
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'OS'];
export const GARMENT_TYPES = [
  'Camiseta / T-Shirt',
  'Sudadera / Sweatshirt',
  'Pantalón / Trousers',
  'Vestido / Dress',
  'Chaqueta / Jacket',
  'Falda / Skirt',
  'Camisa / Shirt'
];

export const INITIAL_DATA: TechPackData = {
  id: 'page-1',
  pageType: 'measurement',
  tabName: 'Measurements',
  sectionTitle: 'MEASUREMENTS',
  leftPanelContent: '',
  measurementVersions: ['Original'],
  header: {
    season: SEASONS[0],
    year: new Date().getFullYear().toString(),
    styleName: '',
    date: new Date().toISOString().split('T')[0],
    designerName: 'Factory User',
    designerEmail: '',
    department: 'WOMEN KNITWEAR',
    garmentDetails: 'Self fabric neck binding. Twin needle stitch at hem and cuffs. 1x1 Rib structure.',
  },
  specs: {
    supplier: 'FASHION COMFORT (BD) LTD',
    referenceNumber: '',
    departmentType: 'Circular Knit',
    garmentType: 'Camiseta / T-Shirt',
    sampleDate: new Date().toISOString().split('T')[0],
    seasonCode: 'S1',
    size: 'M'
  },
  measurements: DEFAULT_MEASUREMENTS,
  images: [
    { url: 'https://picsum.photos/800/800', label: 'Front View' },
    { url: 'https://picsum.photos/400/600', label: 'Side View' },
    { url: 'https://picsum.photos/400/400', label: 'Detail' }
  ]
};