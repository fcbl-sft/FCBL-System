import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { Project, ProjectStatus, PONumber, ProductColor } from '../types';

interface EditStyleModalProps {
    isOpen: boolean;
    project: Project;
    onSave: (updates: Partial<Project>) => void;
    onCancel: () => void;
}

const STATUS_OPTIONS: ProjectStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PENDING'];

const EditStyleModal: React.FC<EditStyleModalProps> = ({
    isOpen,
    project,
    onSave,
    onCancel
}) => {
    // Form state
    const [title, setTitle] = useState(project.title);
    const [status, setStatus] = useState<ProjectStatus>(project.status);
    const [productImage, setProductImage] = useState(project.productImage || '');
    const [productColors, setProductColors] = useState<ProductColor[]>(project.productColors || []);
    const [poNumbers, setPoNumbers] = useState<PONumber[]>(project.poNumbers || []);

    // New PO form state
    const [showAddPO, setShowAddPO] = useState(false);
    const [newPONumber, setNewPONumber] = useState('');
    const [newPOQuantity, setNewPOQuantity] = useState('');
    const [newPODate, setNewPODate] = useState('');

    // Color picker state
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [newColor, setNewColor] = useState('#3B82F6');

    const imageInputRef = useRef<HTMLInputElement>(null);

    // Reset form when project changes
    useEffect(() => {
        setTitle(project.title);
        setStatus(project.status);
        setProductImage(project.productImage || '');
        setProductColors(project.productColors || []);
        setPoNumbers(project.poNumbers || []);
    }, [project]);

    if (!isOpen) return null;

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

    // Save handler
    const handleSave = () => {
        onSave({
            title,
            status,
            productImage: productImage || undefined,
            productColors,
            poNumbers
        });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-bold text-gray-900">Edit Style</h2>
                    <button
                        onClick={onCancel}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-5">
                    {/* Style Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Style Name
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            placeholder="Enter style name"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value as ProjectStatus)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                        >
                            {STATUS_OPTIONS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
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

                    {/* PO Numbers */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                PO Numbers
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
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-black rounded hover:bg-gray-800 transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditStyleModal;
