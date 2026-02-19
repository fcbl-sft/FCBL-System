
import React, { useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, UserRole, ProjectStatus, PONumber, MainStatus, ProductionStage } from '../types';
import { Search, ChevronDown, ChevronUp, X, Check, User, Settings, Shield, LogOut } from 'lucide-react';
import StyleCard from './StyleCard';
import DeleteStyleModal from './DeleteStyleModal';
import EditStyleModal from './EditStyleModal';

interface DashboardProps {
  role: UserRole;
  userName: string;
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
  role, userName, projects, onSelectProject, onUploadTechPack, onCreateTechPack,
  onLogout, onManageInspection, onManageInvoice, onManagePacking,
  onManageOrderSheet, onManageConsumption, onManageMaterialControl, onManagePPMeeting,
  onDeleteProject, onRenameProject, onUpdateProject
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Team, Brand and Factory filter state
  const [teamFilterOpen, setTeamFilterOpen] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [brandFilterOpen, setBrandFilterOpen] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [factoryFilterOpen, setFactoryFilterOpen] = useState(false);
  const [selectedFactories, setSelectedFactories] = useState<string[]>([]);

  // Modal state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  // Get unique teams, brands and factories from all projects
  const uniqueTeams = useMemo(() => {
    const teams = projects
      .map(p => p.team)
      .filter((team): team is string => !!team && team.trim() !== '');
    return [...new Set(teams)].sort();
  }, [projects]);

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

  // Auto-detect current production stage based on data presence
  const getProjectStage = (project: Project): ProductionStage | null => {
    if (project.inspections && project.inspections.length > 0) return 'QC Inspection';
    if (project.invoices && project.invoices.length > 0) return 'Commercial';
    if (project.materialControl && project.materialControl.length > 0) return 'MQ Control';
    if (project.ppMeetings && project.ppMeetings.length > 0) return 'PP Meeting';
    if (project.consumption && (project.consumption.yarnItems?.length > 0 || project.consumption.accessoryItems?.length > 0)) return 'Consumption';
    if (project.orderSheet) return 'Order Sheet';
    if (project.pages && project.pages.length > 0) return 'Tech Pack';
    return null;
  };

  // Get effective main status (use project.mainStatus if set, otherwise auto-detect)
  const getEffectiveMainStatus = (project: Project): MainStatus => {
    return project.mainStatus || 'DEVELOPMENT';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadTechPack(e.target.files[0]);
    }
  };

  // Team filter handlers
  const handleTeamToggle = (team: string) => {
    setSelectedTeams(prev =>
      prev.includes(team)
        ? prev.filter(t => t !== team)
        : [...prev, team]
    );
  };

  const handleSelectAllTeams = () => {
    if (selectedTeams.length === uniqueTeams.length) {
      setSelectedTeams([]);
    } else {
      setSelectedTeams([...uniqueTeams]);
    }
  };

  const clearTeamFilter = () => {
    setSelectedTeams([]);
    setTeamFilterOpen(false);
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
    setTeamFilterOpen(false);
    setBrandFilterOpen(false);
    setFactoryFilterOpen(false);
  };

  const filteredProjects = projects.filter(project => {
    const latestInsp = getLatestInspection(project);
    const qcResult = latestInsp?.data?.overallResult || 'PENDING';
    const matchesSearch = (project.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.poNumbers || []).some(po => po.number.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filter (multi-select with hierarchy)
    let matchesStatus = true;
    if (selectedStatuses.length > 0) {
      const mainStatus = getEffectiveMainStatus(project);
      const stage = getProjectStage(project);
      const approvalStatus = project.status;
      const latestInsp = getLatestInspection(project);
      const qcResult = latestInsp?.data?.overallResult || 'PENDING';

      matchesStatus = selectedStatuses.some(s => {
        // Main stages
        if (['DEVELOPMENT', 'PRE-PRODUCTION', 'PRODUCTION', 'FINALIZED', 'CANCELLED'].includes(s)) {
          return mainStatus === s;
        }
        // Production sub-stages
        if (['Tech Pack', 'Order Sheet', 'Consumption', 'PP Meeting', 'MQ Control', 'Commercial', 'QC Inspection'].includes(s)) {
          return mainStatus === 'PRODUCTION' && stage === s;
        }
        // Approval statuses
        if (['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PENDING', 'ACCEPTED'].includes(s)) {
          return approvalStatus === s || qcResult === s;
        }
        return false;
      });
    }

    // Team filter
    const matchesTeam = selectedTeams.length === 0 ||
      (project.team && selectedTeams.includes(project.team));

    // Brand filter
    const matchesBrand = selectedBrands.length === 0 ||
      (project.brand && selectedBrands.includes(project.brand));

    // Factory filter
    const matchesFactory = selectedFactories.length === 0 ||
      (project.factoryName && selectedFactories.includes(project.factoryName));

    return matchesSearch && matchesStatus && matchesTeam && matchesBrand && matchesFactory;
  });

  const statusCount = selectedStatuses.length > 0 ? filteredProjects.length : null;

  // Status filter handlers
  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const MAIN_STAGES: MainStatus[] = ['DEVELOPMENT', 'PRE-PRODUCTION', 'PRODUCTION', 'FINALIZED', 'CANCELLED'];
  const PRODUCTION_SUBSTAGES: ProductionStage[] = ['Tech Pack', 'Order Sheet', 'Consumption', 'PP Meeting', 'MQ Control', 'Commercial', 'QC Inspection'];
  const APPROVAL_STATUSES: string[] = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'];
  const ALL_STATUS_OPTIONS = [...MAIN_STAGES, ...PRODUCTION_SUBSTAGES, ...APPROVAL_STATUSES];

  const handleSelectAllStatuses = () => {
    if (selectedStatuses.length === ALL_STATUS_OPTIONS.length) {
      setSelectedStatuses([]);
    } else {
      setSelectedStatuses([...ALL_STATUS_OPTIONS]);
    }
  };

  const clearStatusFilter = () => {
    setSelectedStatuses([]);
    setStatusFilterOpen(false);
  };

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
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/fcbl-logo.svg" alt="FCBL" style={{ height: '36px' }} />
        </div>
        <nav className="flex gap-6 text-sm absolute left-1/2 transform -translate-x-1/2">
          <span className="text-black font-medium border-b-2 pb-1" style={{ borderBottomColor: '#4CAF50', color: '#388E3C' }}>PRODUCTS</span>
          <span className="text-gray-400">ORDERS</span>
        </nav>
        {/* User Menu */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-black transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <span className="font-medium">{userName || 'User'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-50"
              style={{ minWidth: '180px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{userName || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{role.replace('_', ' ')}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                {(role === 'super_admin' || role === 'admin') && (
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/admin'); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Admin Panel
                  </button>
                )}
              </div>
              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={() => { setUserMenuOpen(false); onLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
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
              onClick={() => { setStatusFilterOpen(!statusFilterOpen); setTeamFilterOpen(false); setBrandFilterOpen(false); setFactoryFilterOpen(false); }}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase ${selectedStatuses.length > 0 ? 'text-black' : 'text-gray-600'}`}
            >
              STATUS {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
              {selectedStatuses.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearStatusFilter(); }}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {statusFilterOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {statusFilterOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-50 min-w-[220px] max-h-[400px] overflow-y-auto">
                {/* Main Stages */}
                {MAIN_STAGES.map(stage => (
                  <div key={stage}>
                    <button
                      onClick={() => handleStatusToggle(stage)}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span className={`w-4 h-4 border rounded flex items-center justify-center ${selectedStatuses.includes(stage) ? 'bg-black border-black' : 'border-gray-300'}`}>
                        {selectedStatuses.includes(stage) && <Check className="w-3 h-3 text-white" />}
                      </span>
                      {stage}
                    </button>
                    {/* Production Sub-stages (nested under PRODUCTION) */}
                    {stage === 'PRODUCTION' && PRODUCTION_SUBSTAGES.map(sub => (
                      <button
                        key={sub}
                        onClick={() => handleStatusToggle(sub)}
                        className="w-full text-left pl-8 pr-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className={`w-4 h-4 border rounded flex items-center justify-center ${selectedStatuses.includes(sub) ? 'bg-black border-black' : 'border-gray-300'}`}>
                          {selectedStatuses.includes(sub) && <Check className="w-3 h-3 text-white" />}
                        </span>
                        {sub}
                      </button>
                    ))}
                  </div>
                ))}
                {/* Divider */}
                <div className="border-t border-gray-100 my-1" />
                {/* Approval Statuses */}
                {APPROVAL_STATUSES.map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusToggle(status)}
                    className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className={`w-4 h-4 border rounded flex items-center justify-center ${selectedStatuses.includes(status) ? 'bg-black border-black' : 'border-gray-300'}`}>
                      {selectedStatuses.includes(status) && <Check className="w-3 h-3 text-white" />}
                    </span>
                    {status}
                  </button>
                ))}
                {/* Divider + Select All */}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleSelectAllStatuses}
                    className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className={`w-4 h-4 border rounded flex items-center justify-center ${selectedStatuses.length === ALL_STATUS_OPTIONS.length ? 'bg-black border-black' : 'border-gray-300'}`}>
                      {selectedStatuses.length === ALL_STATUS_OPTIONS.length && <Check className="w-3 h-3 text-white" />}
                    </span>
                    Select all
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Static filters */}
          {['MILESTONES', 'SAMPLE TASKS'].map(filter => (
            <button key={filter} className="flex items-center gap-1 text-xs font-bold uppercase text-gray-600">
              {filter} <ChevronDown className="w-3 h-3" />
            </button>
          ))}

          {/* TEAM Filter */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setTeamFilterOpen(!teamFilterOpen); setStatusFilterOpen(false); setBrandFilterOpen(false); setFactoryFilterOpen(false); }}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase ${selectedTeams.length > 0 ? 'text-black' : 'text-gray-600'}`}
            >
              TEAM {selectedTeams.length > 0 && `(${selectedTeams.length})`}
              {selectedTeams.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearTeamFilter(); }}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {teamFilterOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {teamFilterOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                {uniqueTeams.length > 0 ? (
                  <>
                    {uniqueTeams.map(team => (
                      <button
                        key={team}
                        onClick={() => handleTeamToggle(team)}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className={`w-4 h-4 border rounded flex items-center justify-center ${selectedTeams.includes(team) ? 'bg-black border-black' : 'border-gray-300'}`}>
                          {selectedTeams.includes(team) && <Check className="w-3 h-3 text-white" />}
                        </span>
                        {team}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleSelectAllTeams}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className={`w-4 h-4 border rounded flex items-center justify-center ${selectedTeams.length === uniqueTeams.length ? 'bg-black border-black' : 'border-gray-300'}`}>
                          {selectedTeams.length === uniqueTeams.length && <Check className="w-3 h-3 text-white" />}
                        </span>
                        Select all
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-400">No teams available</div>
                )}
              </div>
            )}
          </div>

          {/* BRAND Filter */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setBrandFilterOpen(!brandFilterOpen); setStatusFilterOpen(false); setTeamFilterOpen(false); setFactoryFilterOpen(false); }}
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
              onClick={() => { setFactoryFilterOpen(!factoryFilterOpen); setStatusFilterOpen(false); setTeamFilterOpen(false); setBrandFilterOpen(false); }}
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
            background: 'linear-gradient(90deg, #4CAF50, #388E3C)',
            color: '#FFFFFF',
            borderRadius: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(90deg, #388E3C, #2E7D32)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(90deg, #4CAF50, #388E3C)'}
        >
          + New Style
        </button>
      </div>

      {/* Green Gradient Accent Line */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #4CAF50, #388E3C)', width: '100%' }} />

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
