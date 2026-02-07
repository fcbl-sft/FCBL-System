/**
 * New Style Page - Full-page form for creating new styles
 * Matches the Edit Style modal design but as a full page
 */
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Upload, Image as ImageIcon, X } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ROUTES from '../router/routes';
import { PONumber, ProductColor, TechPackData } from '../../types';
import { INITIAL_DATA } from '../../constants';

const NewStylePage: React.FC = () => {
    useDocumentTitle('New Style');
    const navigate = useNavigate();
    const { createProject } = useProjects();

    // Form state
    const [title, setTitle] = useState('');
    const [brand, setBrand] = useState('');
    const [team, setTeam] = useState('');
    const [productImage, setProductImage] = useState('');
    const [productColors, setProductColors] = useState<ProductColor[]>([]);
    const [poNumbers, setPoNumbers] = useState<PONumber[]>([{ id: `po-${Date.now()}`, number: '' }]);

    // New PO form state
    const [showAddPO, setShowAddPO] = useState(false);
    const [newPONumber, setNewPONumber] = useState('');
    const [newPOQuantity, setNewPOQuantity] = useState('');
    const [newPODate, setNewPODate] = useState('');

    // Color picker state
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [newColor, setNewColor] = useState('#3B82F6');

    // Saving state
    const [isSaving, setIsSaving] = useState(false);

    const imageInputRef = useRef<HTMLInputElement>(null);

    // Image upload handler
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setProductImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Color handlers
    const handleAddColor = () => {
        const newColorObj: ProductColor = {
            id: `color-${Date.now()}`,
            hex: newColor,
            name: ''
        };
        setProductColors([...productColors, newColorObj]);
        setShowColorPicker(false);
        setNewColor('#3B82F6');
    };

    const handleDeleteColor = (colorId: string) => {
        setProductColors(productColors.filter(c => c.id !== colorId));
    };

    // PO handlers
    const handleAddPO = () => {
        if (!newPONumber.trim()) return;
        const newPO: PONumber = {
            id: `po-${Date.now()}`,
            number: newPONumber.trim(),
            quantity: newPOQuantity ? parseInt(newPOQuantity) : undefined,
            deliveryDate: newPODate || undefined
        };
        setPoNumbers([...poNumbers, newPO]);
        setNewPONumber('');
        setNewPOQuantity('');
        setNewPODate('');
        setShowAddPO(false);
    };

    const handleUpdatePO = (poId: string, field: keyof PONumber, value: string | number) => {
        setPoNumbers(poNumbers.map(po => {
            if (po.id === poId) {
                if (field === 'quantity') {
                    return { ...po, [field]: value ? Number(value) : undefined };
                }
                return { ...po, [field]: value || undefined };
            }
            return po;
        }));
    };

    const handleDeletePO = (poId: string) => {
        if (poNumbers.length <= 1) {
            alert('At least one PO number is required');
            return;
        }
        setPoNumbers(poNumbers.filter(po => po.id !== poId));
    };

    // Navigation handlers
    const handleBack = () => {
        navigate(ROUTES.DASHBOARD);
    };

    // Validation
    const isFormValid = () => {
        return title.trim() !== '' &&
            brand.trim() !== '' &&
            team.trim() !== '' &&
            poNumbers.some(po => po.number.trim() !== '');
    };

    // Create style handler
    const handleCreate = async () => {
        if (!isFormValid()) {
            alert('Please fill in all required fields');
            return;
        }

        setIsSaving(true);

        try {
            // Prepare initial pages with style name
            const initialPages: TechPackData[] = [JSON.parse(JSON.stringify(INITIAL_DATA))];
            if (initialPages[0]?.header) {
                initialPages[0].header.styleName = title;
            }

            // Filter out empty PO numbers
            const validPoNumbers = poNumbers.filter(po => po.number.trim() !== '');

            const newProject = await createProject({
                title: title.trim(),
                brand: brand.trim(),
                team: team.trim(),
                productImage: productImage || undefined,
                productColors,
                poNumbers: validPoNumbers.length > 0 ? validPoNumbers : [{ id: `po-${Date.now()}`, number: 'N/A' }],
                pages: initialPages,
            });

            if (newProject) {
                navigate(ROUTES.TECH_PACK(newProject.id));
            }
        } catch (error) {
            console.error('Failed to create style:', error);
            alert('Failed to create style. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="min-h-screen bg-white"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}
        >
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
                <h1 className="flex-1 text-center text-lg font-bold tracking-tight">NEW STYLE</h1>
                <div className="w-16" /> {/* Spacer for centering */}
            </header>

            {/* Orange Accent Line */}
            <div style={{ height: '3px', backgroundColor: '#E85D26', width: '100%' }} />

            {/* Form Content */}
            <div className="max-w-2xl mx-auto px-6 py-8">
                <div className="space-y-6">
                    {/* Style Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Style Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            placeholder="Enter style name"
                        />
                    </div>

                    {/* Brand */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Brand <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={brand}
                            onChange={e => setBrand(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            placeholder="Enter brand name"
                        />
                    </div>

                    {/* Team */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Team <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={team}
                            onChange={e => setTeam(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            placeholder="Enter team name"
                        />
                    </div>

                    {/* PO Numbers */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                PO Numbers <span className="text-red-500">*</span>
                            </label>
                            <button
                                onClick={() => setShowAddPO(true)}
                                className="text-xs font-medium text-black hover:text-gray-700 flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                Add PO
                            </button>
                        </div>
                        <div className="space-y-2">
                            {poNumbers.map(po => (
                                <div key={po.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                                    <div className="flex-1 grid grid-cols-3 gap-2">
                                        <input
                                            type="text"
                                            value={po.number}
                                            onChange={e => handleUpdatePO(po.id, 'number', e.target.value)}
                                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                                            placeholder="PO Number"
                                        />
                                        <input
                                            type="number"
                                            value={po.quantity || ''}
                                            onChange={e => handleUpdatePO(po.id, 'quantity', e.target.value)}
                                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                                            placeholder="Qty (pcs)"
                                        />
                                        <input
                                            type="date"
                                            value={po.deliveryDate || ''}
                                            onChange={e => handleUpdatePO(po.id, 'deliveryDate', e.target.value)}
                                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleDeletePO(po.id)}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Delete PO"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            {/* Add PO Form */}
                            {showAddPO && (
                                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                    <div className="grid grid-cols-3 gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={newPONumber}
                                            onChange={e => setNewPONumber(e.target.value)}
                                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                                            placeholder="PO Number *"
                                            autoFocus
                                        />
                                        <input
                                            type="number"
                                            value={newPOQuantity}
                                            onChange={e => setNewPOQuantity(e.target.value)}
                                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                                            placeholder="Qty (optional)"
                                        />
                                        <input
                                            type="date"
                                            value={newPODate}
                                            onChange={e => setNewPODate(e.target.value)}
                                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setShowAddPO(false)}
                                            className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddPO}
                                            className="px-2 py-1 text-xs font-medium text-white bg-black rounded hover:bg-gray-800"
                                            disabled={!newPONumber.trim()}
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Product Image */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Image
                        </label>
                        <div className="flex items-start gap-4">
                            {productImage ? (
                                <div className="relative w-24 h-24 border border-gray-200 rounded overflow-hidden bg-gray-50">
                                    <img src={productImage} alt="Product" className="w-full h-full object-contain" />
                                    <button
                                        onClick={() => setProductImage('')}
                                        className="absolute top-1 right-1 p-1 bg-white rounded-full shadow hover:bg-gray-100"
                                    >
                                        <X className="w-3 h-3 text-gray-600" />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50">
                                    <ImageIcon className="w-8 h-8 text-gray-300" />
                                </div>
                            )}
                            <button
                                onClick={() => imageInputRef.current?.click()}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Upload Image
                            </button>
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Colors */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Colors
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                            {productColors.map(color => (
                                <div
                                    key={color.id}
                                    className="relative group"
                                >
                                    <div
                                        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name || color.hex}
                                    />
                                    <button
                                        onClick={() => handleDeleteColor(color.id)}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-2.5 h-2.5 text-white" />
                                    </button>
                                </div>
                            ))}
                            {showColorPicker ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={newColor}
                                        onChange={e => setNewColor(e.target.value)}
                                        className="w-8 h-8 cursor-pointer border-0"
                                    />
                                    <button
                                        onClick={handleAddColor}
                                        className="px-2 py-1 text-xs font-medium text-white bg-black rounded hover:bg-gray-800"
                                    >
                                        Add
                                    </button>
                                    <button
                                        onClick={() => setShowColorPicker(false)}
                                        className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowColorPicker(true)}
                                    className="w-8 h-8 rounded border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
                                >
                                    <Plus className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-gray-200">
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!isFormValid() || isSaving}
                        className="px-4 py-2 text-sm font-medium text-white bg-black rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Creating...' : 'Create Style'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewStylePage;
