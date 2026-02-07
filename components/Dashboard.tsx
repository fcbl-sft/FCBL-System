
import React, { useRef, useState, useMemo } from 'react';
import { Project, UserRole, ProjectStatus, PONumber } from '../types';
import { Search, ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import StyleCard from './StyleCard';
import DeleteStyleModal from './DeleteStyleModal';
import EditStyleModal from './EditStyleModal';

interface DashboardProps {
  role: UserRole;
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onUploadTechPack: (file: File) => void;
  onCreateTechPack: () => void;
  onLogout: () => void;
  onManageInspection: (project: Project, type?: string) => void;
  onManageInvoice: (project: Project) => void;
  onManagePacking: (project: Project) => void;
  onManageOrderSheet: (project: Project) => void;
  onManageConsumption: (project: Project) => void;
  onManageMaterialControl: (project: Project) => void;
  onManagePPMeeting: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newTitle: string) => void;
  onUpdateProject: (projectId: string, data: Partial<Project>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  role, projects, onSelectProject, onUploadTechPack, onCreateTechPack,
  onLogout, onManageInspection, onManageInvoice, onManagePacking,
  onManageOrderSheet, onManageConsumption, onManageMaterialControl, onManagePPMeeting,
  onDeleteProject, onRenameProject, onUpdateProject
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);

  // Brand and Factory filter state
  const [brandFilterOpen, setBrandFilterOpen] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [factoryFilterOpen, setFactoryFilterOpen] = useState(false);
  const [selectedFactories, setSelectedFactories] = useState<string[]>([]);

  // Modal state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  // Get unique brands and factories from all projects
  const uniqueBrands = useMemo(() => {
    const brands = projects
      .map(p => p.brand)
      .filter((brand): brand is string => !!brand && brand.trim() !== '');
    return [...new Set(brands)].sort();
  }, [projects]);

  const uniqueFactories = useMemo(() => {
    const factories = projects
      .map(p => p.factoryName)
      .filter((factory): factory is string => !!factory && factory.trim() !== '');
    return [...new Set(factories)].sort();
  }, [projects]);

  const getLatestInspection = (project: Project) => {
    if (!project.inspections || project.inspections.length === 0) return null;
    return project.inspections[project.inspections.length - 1];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadTechPack(e.target.files[0]);
    }
  };

  // Brand filter handlers
  const handleBrandToggle = (brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand)
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
  };

  const handleSelectAllBrands = () => {
    if (selectedBrands.length === uniqueBrands.length) {
      setSelectedBrands([]);
    } else {
      setSelectedBrands([...uniqueBrands]);
    }
  };

  const clearBrandFilter = () => {
    setSelectedBrands([]);
    setBrandFilterOpen(false);
  };

  // Factory filter handlers
  const handleFactoryToggle = (factory: string) => {
    setSelectedFactories(prev =>
      prev.includes(factory)
        ? prev.filter(f => f !== factory)
        : [...prev, factory]
    );
  };

  const handleSelectAllFactories = () => {
    if (selectedFactories.length === uniqueFactories.length) {
      setSelectedFactories([]);
    } else {
      setSelectedFactories([...uniqueFactories]);
    }
  };

  const clearFactoryFilter = () => {
    setSelectedFactories([]);
    setFactoryFilterOpen(false);
  };

  // Close dropdowns when clicking outside
  const closeAllDropdowns = () => {
    setStatusFilterOpen(false);
    setBrandFilterOpen(false);
    setFactoryFilterOpen(false);
  };

  const filteredProjects = projects.filter(project => {
    const latestInsp = getLatestInspection(project);
    const qcResult = latestInsp?.data?.overallResult || 'PENDING';
    const matchesSearch = (project.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.poNumbers || []).some(po => po.number.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filter
    let matchesStatus = true;
    if (statusFilter !== 'ALL') {
      if (['ACCEPTED', 'REJECTED', 'PENDING'].includes(statusFilter)) {
        matchesStatus = qcResult === statusFilter;
      } else {
        matchesStatus = project.status === statusFilter;
      }
    }

    // Brand filter
    const matchesBrand = selectedBrands.length === 0 ||
      (project.brand && selectedBrands.includes(project.brand));

    // Factory filter
    const matchesFactory = selectedFactories.length === 0 ||
      (project.factoryName && selectedFactories.includes(project.factoryName));

    return matchesSearch && matchesStatus && matchesBrand && matchesFactory;
  });

  const statusCount = statusFilter !== 'ALL' ? filteredProjects.length : null;

  // Edit handlers
  const handleEditClick = (project: Project) => {
    setEditingProject(project);
  };

  const handleEditSave = (updates: Partial<Project>) => {
    if (editingProject) {
      onUpdateProject(editingProject.id, updates);
      setEditingProject(null);
    }
  };

  const handleEditCancel = () => {
    setEditingProject(null);
  };

  // Delete handlers
  const handleDeleteClick = (project: Project) => {
    setDeletingProject(project);
  };

  const handleDeleteConfirm = () => {
    if (deletingProject) {
      onDeleteProject(deletingProject.id);
      setDeletingProject(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingProject(null);
  };

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}
      onClick={closeAllDropdowns}
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center relative">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">FCBL</span>
        </div>
        <nav className="flex gap-6 text-sm absolute left-1/2 transform -translate-x-1/2">
          <span className="text-black font-medium border-b-2 border-black pb-1">PRODUCTS</span>
          <span className="text-gray-400">ORDERS</span>
        </nav>
        <button onClick={onLogout} className="text-sm text-gray-500 hover:text-red-600">
          Logout
        </button>
      </header>

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="text-sm outline-none w-40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Status Filter */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setStatusFilterOpen(!statusFilterOpen); setBrandFilterOpen(false); setFactoryFilterOpen(false); }}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase ${statusFilter !== 'ALL' ? 'text-black' : 'text-gray-600'
                }`}
            >
              STATUS {statusCount && `(${statusCount})`}
              {statusFilter !== 'ALL' && (
                <button
                  onClick={(e) => { e.stopPropagation(); setStatusFilter('ALL'); }}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {statusFilterOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {statusFilterOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-50 min-w-[140px]">
                {['ALL', 'DRAFT', 'APPROVED', 'PENDING', 'REJECTED'].map(status => (
                  <button
                    key={status}
                    onClick={() => { setStatusFilter(status); setStatusFilterOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 ${statusFilter === status ? 'bg-gray-100 text-black' : 'text-gray-600'
                      }`}
                  >
                    {status === 'ALL' ? 'All Status' : status}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Static filters */}
          {['MILESTONES', 'SAMPLE TASKS'].map(filter => (
            <button key={filter} className="flex items-center gap-1 text-xs font-bold uppercase text-gray-600">
              {filter} <ChevronDown className="w-3 h-3" />
            </button>
          ))}

          {/* BRAND Filter */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setBrandFilterOpen(!brandFilterOpen); setStatusFilterOpen(false); setFactoryFilterOpen(false); }}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase ${selectedBrands.length > 0 ? 'text-black' : 'text-gray-600'}`}
            >
              BRAND {selectedBrands.length > 0 && `(${selectedBrands.length})`}
              {selectedBrands.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearBrandFilter(); }}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {brandFilterOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {brandFilterOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                {uniqueBrands.length > 0 ? (
                  <>
                    {uniqueBrands.map(brand => (
                      <button
                        key={brand}
                        onClick={() => handleBrandToggle(brand)}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className={`w-4 h-4 border rounded flex items-center justify-center ${selectedBrands.includes(brand) ? 'bg-black border-black' : 'border-gray-300'}`}>
                          {selectedBrands.includes(brand) && <Check className="w-3 h-3 text-white" />}
                        </span>
                        {brand}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleSelectAllBrands}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className={`w-4 h-4 border rounded flex items-center justify-center ${selectedBrands.length === uniqueBrands.length ? 'bg-black border-black' : 'border-gray-300'}`}>
                          {selectedBrands.length === uniqueBrands.length && <Check className="w-3 h-3 text-white" />}
                        </span>
                        Select all
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-400">No brands available</div>
                )}
              </div>
            )}
          </div>

          {/* FACTORY Filter */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setFactoryFilterOpen(!factoryFilterOpen); setStatusFilterOpen(false); setBrandFilterOpen(false); }}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase ${selectedFactories.length > 0 ? 'text-black' : 'text-gray-600'}`}
            >
              FACTORY {selectedFactories.length > 0 && `(${selectedFactories.length})`}
              {selectedFactories.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearFactoryFilter(); }}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {factoryFilterOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {factoryFilterOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-50 min-w-[250px] max-h-[300px] overflow-y-auto">
                {uniqueFactories.length > 0 ? (
                  <>
                    {uniqueFactories.map(factory => (
                      <button
                        key={factory}
                        onClick={() => handleFactoryToggle(factory)}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className={`w-4 h-4 border rounded flex items-center justify-center ${selectedFactories.includes(factory) ? 'bg-black border-black' : 'border-gray-300'}`}>
                          {selectedFactories.includes(factory) && <Check className="w-3 h-3 text-white" />}
                        </span>
                        {factory}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleSelectAllFactories}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className={`w-4 h-4 border rounded flex items-center justify-center ${selectedFactories.length === uniqueFactories.length ? 'bg-black border-black' : 'border-gray-300'}`}>
                          {selectedFactories.length === uniqueFactories.length && <Check className="w-3 h-3 text-white" />}
                        </span>
                        Select all
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-400">No factories available</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* + New Style Button */}
        <button
          onClick={onCreateTechPack}
          className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold uppercase tracking-wide"
          style={{
            backgroundColor: '#000000',
            color: '#FFFFFF',
            borderRadius: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333333'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#000000'}
        >
          + New Style
        </button>
      </div>

      {/* Orange Accent Line */}
      <div style={{ height: '3px', backgroundColor: '#E85D26', width: '100%' }} />

      {/* Card Grid - Edge to Edge */}
      <main className="bg-white">
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileChange} />

        {filteredProjects.length > 0 ? (
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '1px',
              backgroundColor: '#E0E0E0'
            }}
          >
            {filteredProjects.map((project) => (
              <StyleCard
                key={project.id}
                project={project}
                onClick={() => onSelectProject(project)}
                onEdit={() => handleEditClick(project)}
                onDelete={() => handleDeleteClick(project)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-700">No styles found</h3>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filter criteria.</p>
            <button
              onClick={onCreateTechPack}
              className="mt-4 px-4 py-2 bg-black text-white text-sm font-bold rounded"
            >
              Create New Style
            </button>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingProject && (
        <EditStyleModal
          isOpen={true}
          project={editingProject}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
        />
      )}

      {/* Delete Modal */}
      {deletingProject && (
        <DeleteStyleModal
          isOpen={true}
          styleName={deletingProject.title}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
};

export default Dashboard;
