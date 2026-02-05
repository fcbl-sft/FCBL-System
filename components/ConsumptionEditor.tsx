import React, { useState, useMemo, useEffect } from 'react';
import { Project, ConsumptionData, YarnConsumptionItem, AccessoryConsumptionItem, OrderBreakdown } from '../types';
import { ArrowLeft, Save, Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle, Lock, Scale, Package, Layers, Calculator } from 'lucide-react';

interface ConsumptionEditorProps {
    project: Project;
    onUpdate: (consumption: ConsumptionData) => void;
    onBack: () => void;
    onSave: () => void;
}

// Yarn type options
const YARN_TYPE_OPTIONS = [
    // Natural
    'Cotton', 'Wool', 'Silk', 'Linen', 'Bamboo',
    // Synthetic
    'Polyester', 'Nylon', 'Acrylic', 'Spandex', 'Lycra',
    // Semi-Synthetic
    'Viscose', 'Rayon', 'Modal', 'Tencel',
    // Blends
    'Poly-Cotton', 'Wool Blend', 'Custom'
];

// Accessory type options
const ACCESSORY_TYPE_OPTIONS = [
    // Closures
    'Zipper', 'Button', 'Snap', 'Hook & Eye', 'Velcro',
    // Trims
    'Chain', 'Lace', 'Ribbon', 'Piping', 'Elastic',
    // Labels
    'Main Label', 'Care Label', 'Size Label', 'Country Label', 'Content Label',
    // Packaging
    'Hang Tag', 'Price Tag', 'Poly Bag', 'Carton', 'Tissue Paper',
    // Threads
    'Sewing Thread', 'Embroidery Thread', 'Overlocking Thread',
    // Others
    'Interlining', 'Padding', 'Shoulder Pad', 'Drawstring', 'Custom'
];

// Unit options
const UNIT_OPTIONS = ['Pcs', 'Meters', 'Yards', 'Sets', 'Rolls', 'Kg', 'Cones'];

const ConsumptionEditor: React.FC<ConsumptionEditorProps> = ({
    project,
    onUpdate,
    onBack,
    onSave
}) => {
    // Get orderSheet from project - will update when project changes
    const orderSheet = project.orderSheet;

    // Initialize consumption data from project or create default
    const getInitialConsumption = (): ConsumptionData => {
        if (project.consumption) {
            return project.consumption;
        }
        return {
            id: `cons-${Date.now()}`,
            yarnItems: [],
            accessoryItems: [],
            remarks: '',
            comments: []
        };
    };

    const [consumption, setConsumption] = useState<ConsumptionData>(getInitialConsumption);

    // Sync consumption state when project prop changes (e.g., when data is loaded from DB)
    useEffect(() => {
        if (project.consumption) {
            setConsumption(project.consumption);
        }
    }, [project.consumption, project.id]);

    // Calculate total quantity from order sheet
    const totalQuantity = useMemo(() => {
        if (!orderSheet?.breakdowns) return 0;
        return orderSheet.breakdowns.reduce((sum, bd) => {
            return sum + bd.sizeRows.reduce((rowSum, row) => rowSum + row.total, 0);
        }, 0);
    }, [orderSheet]);

    // Calculate yarn totals
    const yarnTotals = useMemo(() => {
        let totalComposition = 0;
        let totalWeightPerPiece = 0;
        let totalWeight = 0;
        let totalRequiredWeight = 0;
        let totalCost = 0;

        consumption.yarnItems.forEach(item => {
            totalComposition += item.compositionPercent;
            totalWeightPerPiece += item.weightPerPiece;

            const itemTotalWeight = (item.weightPerPiece * totalQuantity) / 1000;
            const itemRequiredWeight = itemTotalWeight * (1 + item.wastagePercent / 100);
            const itemCost = itemRequiredWeight * item.ratePerKg;

            totalWeight += itemTotalWeight;
            totalRequiredWeight += itemRequiredWeight;
            totalCost += itemCost;
        });

        return { totalComposition, totalWeightPerPiece, totalWeight, totalRequiredWeight, totalCost };
    }, [consumption.yarnItems, totalQuantity]);

    // Calculate accessory totals
    const accessoryTotals = useMemo(() => {
        let totalCost = 0;

        consumption.accessoryItems.forEach(item => {
            const itemTotalQty = item.quantityPerGarment * totalQuantity;
            const itemRequiredQty = itemTotalQty * (1 + item.wastagePercent / 100);
            const itemCost = itemRequiredQty * item.ratePerUnit;
            totalCost += itemCost;
        });

        return { totalCost, itemCount: consumption.accessoryItems.length };
    }, [consumption.accessoryItems, totalQuantity]);

    // Update handlers
    const updateConsumption = (updates: Partial<ConsumptionData>) => {
        const updated = { ...consumption, ...updates };
        setConsumption(updated);
        onUpdate(updated);
    };

    // Yarn item handlers
    const addYarnItem = () => {
        const newItem: YarnConsumptionItem = {
            id: `yarn-${Date.now()}`,
            yarnType: 'Cotton',
            compositionPercent: 0,
            weightPerPiece: 0,
            wastagePercent: 5,
            ratePerKg: 0,
            remarks: ''
        };
        updateConsumption({ yarnItems: [...consumption.yarnItems, newItem] });
    };

    const updateYarnItem = (id: string, field: keyof YarnConsumptionItem, value: any) => {
        const updated = consumption.yarnItems.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        updateConsumption({ yarnItems: updated });
    };

    const deleteYarnItem = (id: string) => {
        updateConsumption({ yarnItems: consumption.yarnItems.filter(item => item.id !== id) });
    };

    // Accessory item handlers
    const addAccessoryItem = () => {
        const newItem: AccessoryConsumptionItem = {
            id: `acc-${Date.now()}`,
            accessoryName: 'Button',
            description: '',
            specification: '',
            quantityPerGarment: 1,
            unit: 'Pcs',
            wastagePercent: 3,
            ratePerUnit: 0,
            supplier: '',
            remarks: ''
        };
        updateConsumption({ accessoryItems: [...consumption.accessoryItems, newItem] });
    };

    const updateAccessoryItem = (id: string, field: keyof AccessoryConsumptionItem, value: any) => {
        const updated = consumption.accessoryItems.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        updateConsumption({ accessoryItems: updated });
    };

    const deleteAccessoryItem = (id: string) => {
        updateConsumption({ accessoryItems: consumption.accessoryItems.filter(item => item.id !== id) });
    };

    const handleSave = () => {
        onUpdate(consumption);
        onSave();
    };

    const formatNumber = (num: number, decimals: number = 2) => {
        return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    };

    const formatCurrency = (num: number) => {
        return '$' + formatNumber(num);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <div className="h-16 bg-white border-b border-gray-200 flex justify-between items-center px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 text-gray-600"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-bold text-gray-800 text-lg">{project.title}</h1>
                        <span className="text-xs text-gray-500">Consumption Management</span>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className="btn-primary"
                >
                    <Save className="w-4 h-4" />
                    Save & Close
                </button>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Section 1: Basic Information */}
                    <div className="bg-white border border-gray-200 overflow-hidden">
                        <div className="bg-black px-6 py-4">
                            <h2 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                <Lock className="w-5 h-5" />
                                BASIC INFORMATION
                            </h2>
                            <p className="text-gray-400 text-xs uppercase mt-1">Auto-copied from Order Sheet (Read Only)</p>
                        </div>
                        <div className="p-6">
                            {!orderSheet ? (
                                <div className="text-center py-8 text-gray-500">
                                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
                                    <p className="font-bold">No Order Sheet found</p>
                                    <p className="text-sm">Please create an Order Sheet first to populate this section.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">Style Name</label>
                                        <div className="mt-1 p-3 bg-gray-50 border border-gray-200 flex items-center justify-between">
                                            <span className="font-bold text-gray-800">{orderSheet.styleName || project.title}</span>
                                            <Lock className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">Style Number</label>
                                        <div className="mt-1 p-3 bg-gray-50 border border-gray-200 flex items-center justify-between">
                                            <span className="font-bold text-gray-800">{orderSheet.styleCode || 'N/A'}</span>
                                            <Lock className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">PO Number(s)</label>
                                        <div className="mt-1 p-3 bg-gray-50 border border-gray-200 flex items-center justify-between">
                                            <span className="font-bold text-gray-800">
                                                {orderSheet.poNumbers?.map(p => p.number).join(', ') || orderSheet.poNumber || 'N/A'}
                                            </span>
                                            <Lock className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">Buyer</label>
                                        <div className="mt-1 p-3 bg-gray-50 border border-gray-200 flex items-center justify-between">
                                            <span className="font-bold text-gray-800">{orderSheet.buyerName || 'N/A'}</span>
                                            <Lock className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">Total Quantity</label>
                                        <div className="mt-1 p-3 bg-gray-100 border border-gray-300 flex items-center justify-between">
                                            <span className="font-bold text-black">{totalQuantity.toLocaleString()} pcs</span>
                                            <Lock className="w-4 h-4 text-gray-500" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Size/Color Breakdown */}
                    {orderSheet && orderSheet.breakdowns && orderSheet.breakdowns.length > 0 && (
                        <div className="bg-white border border-gray-200 overflow-hidden">
                            <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
                                <div>
                                    <h2 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                        <Layers className="w-5 h-5" />
                                        SIZE/COLOR BREAKDOWN
                                    </h2>
                                    <p className="text-gray-400 text-xs uppercase mt-1">From Order Sheet (Read Only)</p>
                                </div>
                            </div>
                            <div className="p-6 overflow-x-auto">
                                {orderSheet.breakdowns.map((breakdown: OrderBreakdown, idx: number) => (
                                    <div key={breakdown.id} className={idx > 0 ? 'mt-6' : ''}>
                                        <div className="text-sm font-bold text-gray-700 mb-2">
                                            PO: {breakdown.poNumber || 'All POs'}
                                        </div>
                                        <table className="w-full border-collapse text-sm">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border border-gray-300 px-3 py-2 text-left font-bold">Color</th>
                                                    {breakdown.sizeColumns.map(size => (
                                                        <th key={size} className="border border-gray-300 px-3 py-2 text-center font-bold">{size}</th>
                                                    ))}
                                                    <th className="border border-gray-300 px-3 py-2 text-center font-bold bg-gray-200">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {breakdown.sizeRows.map(row => (
                                                    <tr key={row.id}>
                                                        <td className="border border-gray-300 px-3 py-2 font-medium">{row.colorCode}</td>
                                                        {breakdown.sizeColumns.map(size => (
                                                            <td key={size} className="border border-gray-300 px-3 py-2 text-center">
                                                                {(row.sizes[size] || 0).toLocaleString()}
                                                            </td>
                                                        ))}
                                                        <td className="border border-gray-300 px-3 py-2 text-center font-bold bg-gray-50">
                                                            {row.total.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Section 3: Yarn/Fabric Consumption */}
                    <div className="bg-white border border-gray-200 overflow-hidden">
                        <div className="bg-black px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                    <Scale className="w-5 h-5" />
                                    YARN / FABRIC CONSUMPTION
                                </h2>
                            </div>
                            <button
                                onClick={addYarnItem}
                                className="btn-secondary-dark"
                            >
                                <Plus className="w-4 h-4" />
                                Add Yarn
                            </button>
                        </div>
                        <div className="p-6">
                            {consumption.yarnItems.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>No yarn/fabric items added yet</p>
                                    <button
                                        onClick={addYarnItem}
                                        className="mt-3 text-green-600 font-bold hover:underline"
                                    >
                                        + Add first yarn item
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-sm">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border border-gray-300 px-3 py-2 text-left font-bold">Yarn Type</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-center font-bold w-20">%</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-center font-bold w-24">Wt/Pc (gm)</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-center font-bold w-28">Total Wt (kg)</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-center font-bold w-20">Waste %</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-center font-bold w-28">Required (kg)</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-center font-bold w-24">Rate/kg</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-center font-bold w-28">Total Cost</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-center font-bold w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {consumption.yarnItems.map(item => {
                                                    const totalWeight = (item.weightPerPiece * totalQuantity) / 1000;
                                                    const requiredWeight = totalWeight * (1 + item.wastagePercent / 100);
                                                    const totalCost = requiredWeight * item.ratePerKg;

                                                    return (
                                                        <tr key={item.id}>
                                                            <td className="border border-gray-300 px-2 py-1">
                                                                <select
                                                                    value={item.yarnType}
                                                                    onChange={(e) => updateYarnItem(item.id, 'yarnType', e.target.value)}
                                                                    className="w-full p-2 border-0 bg-transparent focus:ring-2 focus:ring-black"
                                                                >
                                                                    {YARN_TYPE_OPTIONS.map(opt => (
                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="border border-gray-300 px-2 py-1">
                                                                <input
                                                                    type="number"
                                                                    value={item.compositionPercent}
                                                                    onChange={(e) => updateYarnItem(item.id, 'compositionPercent', parseFloat(e.target.value) || 0)}
                                                                    className="w-full p-2 text-center border-0 bg-transparent focus:ring-2 focus:ring-black"
                                                                    min="0"
                                                                    max="100"
                                                                />
                                                            </td>
                                                            <td className="border border-gray-300 px-2 py-1">
                                                                <input
                                                                    type="number"
                                                                    value={item.weightPerPiece}
                                                                    onChange={(e) => updateYarnItem(item.id, 'weightPerPiece', parseFloat(e.target.value) || 0)}
                                                                    className="w-full p-2 text-center border-0 bg-transparent focus:ring-2 focus:ring-black"
                                                                    min="0"
                                                                />
                                                            </td>
                                                            <td className="border border-gray-300 px-3 py-2 text-center bg-gray-50 font-medium">
                                                                {formatNumber(totalWeight)}
                                                            </td>
                                                            <td className="border border-gray-300 px-2 py-1">
                                                                <input
                                                                    type="number"
                                                                    value={item.wastagePercent}
                                                                    onChange={(e) => updateYarnItem(item.id, 'wastagePercent', parseFloat(e.target.value) || 0)}
                                                                    className="w-full p-2 text-center border-0 bg-transparent focus:ring-2 focus:ring-black"
                                                                    min="0"
                                                                />
                                                            </td>
                                                            <td className="border border-gray-300 px-3 py-2 text-center bg-gray-50 font-medium">
                                                                {formatNumber(requiredWeight)}
                                                            </td>
                                                            <td className="border border-gray-300 px-2 py-1">
                                                                <input
                                                                    type="number"
                                                                    value={item.ratePerKg}
                                                                    onChange={(e) => updateYarnItem(item.id, 'ratePerKg', parseFloat(e.target.value) || 0)}
                                                                    className="w-full p-2 text-center border-0 bg-transparent focus:ring-2 focus:ring-black"
                                                                    min="0"
                                                                    step="0.01"
                                                                />
                                                            </td>
                                                            <td className="border border-gray-300 px-3 py-2 text-center bg-gray-100 font-bold text-black">
                                                                {formatCurrency(totalCost)}
                                                            </td>
                                                            <td className="border border-gray-300 px-2 py-1 text-center">
                                                                <button
                                                                    onClick={() => deleteYarnItem(item.id)}
                                                                    className="p-1 text-red-500 hover:bg-red-50"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {/* Totals Row */}
                                                <tr className="bg-gray-100 font-bold">
                                                    <td className="border border-gray-300 px-3 py-2">TOTAL</td>
                                                    <td className="border border-gray-300 px-3 py-2 text-center">{yarnTotals.totalComposition}%</td>
                                                    <td className="border border-gray-300 px-3 py-2 text-center">{formatNumber(yarnTotals.totalWeightPerPiece)} gm</td>
                                                    <td className="border border-gray-300 px-3 py-2 text-center">{formatNumber(yarnTotals.totalWeight)} kg</td>
                                                    <td className="border border-gray-300 px-3 py-2 text-center">-</td>
                                                    <td className="border border-gray-300 px-3 py-2 text-center">{formatNumber(yarnTotals.totalRequiredWeight)} kg</td>
                                                    <td className="border border-gray-300 px-3 py-2 text-center">-</td>
                                                    <td className="border border-gray-300 px-3 py-2 text-center text-black">{formatCurrency(yarnTotals.totalCost)}</td>
                                                    <td className="border border-gray-300"></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Composition Validation */}
                                    <div className={`mt-4 p-3 flex items-center gap-2 ${yarnTotals.totalComposition === 100
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-red-50 text-red-700'
                                        }`}>
                                        {yarnTotals.totalComposition === 100 ? (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                <span className="font-medium">Composition equals 100% ✓</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="w-5 h-5" />
                                                <span className="font-medium">
                                                    Composition must equal 100% (Currently: {yarnTotals.totalComposition}%)
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Section 4: Accessories Consumption */}
                    <div className="bg-white border border-gray-200 overflow-hidden">
                        <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    ACCESSORIES CONSUMPTION
                                </h2>
                            </div>
                            <button
                                onClick={addAccessoryItem}
                                className="btn-secondary-dark"
                            >
                                <Plus className="w-4 h-4" />
                                Add Accessory
                            </button>
                        </div>
                        <div className="p-6">
                            {consumption.accessoryItems.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>No accessories added yet</p>
                                    <button
                                        onClick={addAccessoryItem}
                                        className="mt-3 text-orange-600 font-bold hover:underline"
                                    >
                                        + Add first accessory
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="border border-gray-300 px-3 py-2 text-left font-bold">Accessory</th>
                                                <th className="border border-gray-300 px-3 py-2 text-left font-bold">Description</th>
                                                <th className="border border-gray-300 px-3 py-2 text-center font-bold w-20">Qty/Pc</th>
                                                <th className="border border-gray-300 px-3 py-2 text-center font-bold w-24">Total Qty</th>
                                                <th className="border border-gray-300 px-3 py-2 text-center font-bold w-20">Unit</th>
                                                <th className="border border-gray-300 px-3 py-2 text-center font-bold w-20">Waste%</th>
                                                <th className="border border-gray-300 px-3 py-2 text-center font-bold w-24">Required</th>
                                                <th className="border border-gray-300 px-3 py-2 text-center font-bold w-24">Rate</th>
                                                <th className="border border-gray-300 px-3 py-2 text-center font-bold w-28">Cost</th>
                                                <th className="border border-gray-300 px-3 py-2 text-center font-bold w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {consumption.accessoryItems.map(item => {
                                                const totalQty = item.quantityPerGarment * totalQuantity;
                                                const requiredQty = totalQty * (1 + item.wastagePercent / 100);
                                                const totalCost = requiredQty * item.ratePerUnit;

                                                return (
                                                    <tr key={item.id}>
                                                        <td className="border border-gray-300 px-2 py-1">
                                                            <select
                                                                value={item.accessoryName}
                                                                onChange={(e) => updateAccessoryItem(item.id, 'accessoryName', e.target.value)}
                                                                className="w-full p-2 border-0 bg-transparent focus:ring-2 focus:ring-black"
                                                            >
                                                                {ACCESSORY_TYPE_OPTIONS.map(opt => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="border border-gray-300 px-2 py-1">
                                                            <input
                                                                type="text"
                                                                value={item.description}
                                                                onChange={(e) => updateAccessoryItem(item.id, 'description', e.target.value)}
                                                                className="w-full p-2 border-0 bg-transparent focus:ring-2 focus:ring-black"
                                                                placeholder="Description..."
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 px-2 py-1">
                                                            <input
                                                                type="number"
                                                                value={item.quantityPerGarment}
                                                                onChange={(e) => updateAccessoryItem(item.id, 'quantityPerGarment', parseFloat(e.target.value) || 0)}
                                                                className="w-full p-2 text-center border-0 bg-transparent focus:ring-2 focus:ring-black"
                                                                min="0"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 px-3 py-2 text-center bg-gray-50 font-medium">
                                                            {totalQty.toLocaleString()}
                                                        </td>
                                                        <td className="border border-gray-300 px-2 py-1">
                                                            <select
                                                                value={item.unit}
                                                                onChange={(e) => updateAccessoryItem(item.id, 'unit', e.target.value)}
                                                                className="w-full p-2 border-0 bg-transparent focus:ring-2 focus:ring-black text-center"
                                                            >
                                                                {UNIT_OPTIONS.map(opt => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="border border-gray-300 px-2 py-1">
                                                            <input
                                                                type="number"
                                                                value={item.wastagePercent}
                                                                onChange={(e) => updateAccessoryItem(item.id, 'wastagePercent', parseFloat(e.target.value) || 0)}
                                                                className="w-full p-2 text-center border-0 bg-transparent focus:ring-2 focus:ring-black"
                                                                min="0"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 px-3 py-2 text-center bg-gray-50 font-medium">
                                                            {Math.ceil(requiredQty).toLocaleString()}
                                                        </td>
                                                        <td className="border border-gray-300 px-2 py-1">
                                                            <input
                                                                type="number"
                                                                value={item.ratePerUnit}
                                                                onChange={(e) => updateAccessoryItem(item.id, 'ratePerUnit', parseFloat(e.target.value) || 0)}
                                                                className="w-full p-2 text-center border-0 bg-transparent focus:ring-2 focus:ring-black"
                                                                min="0"
                                                                step="0.01"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 px-3 py-2 text-center bg-gray-100 font-bold text-black">
                                                            {formatCurrency(totalCost)}
                                                        </td>
                                                        <td className="border border-gray-300 px-2 py-1 text-center">
                                                            <button
                                                                onClick={() => deleteAccessoryItem(item.id)}
                                                                className="p-1 text-red-500 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {/* Totals Row */}
                                            <tr className="bg-gray-100 font-bold">
                                                <td colSpan={8} className="border border-gray-300 px-3 py-2 text-right">
                                                    TOTAL ACCESSORIES COST
                                                </td>
                                                <td className="border border-gray-300 px-3 py-2 text-center text-black">
                                                    {formatCurrency(accessoryTotals.totalCost)}
                                                </td>
                                                <td className="border border-gray-300"></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 5: Consumption Summary */}
                    <div className="bg-white border border-gray-200 overflow-hidden">
                        <div className="bg-black px-6 py-4">
                            <h2 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                <Calculator className="w-5 h-5" />
                                CONSUMPTION SUMMARY
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Yarn Summary */}
                                <div className="bg-gray-100 p-5 border border-gray-200">
                                    <h3 className="font-bold text-black mb-3 flex items-center gap-2">
                                        <Scale className="w-5 h-5" />
                                        YARN / FABRIC
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Weight Required:</span>
                                            <span className="font-bold text-black">{formatNumber(yarnTotals.totalRequiredWeight)} kg</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Yarn Cost:</span>
                                            <span className="font-bold text-black">{formatCurrency(yarnTotals.totalCost)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Accessories Summary */}
                                <div className="bg-gray-100 p-5 border border-gray-200">
                                    <h3 className="font-bold text-black mb-3 flex items-center gap-2">
                                        <Package className="w-5 h-5" />
                                        ACCESSORIES
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Accessory Items:</span>
                                            <span className="font-bold text-black">{accessoryTotals.itemCount} types</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Accessories Cost:</span>
                                            <span className="font-bold text-black">{formatCurrency(accessoryTotals.totalCost)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Grand Total */}
                                <div className="bg-black text-white p-5">
                                    <h3 className="font-bold mb-3 flex items-center gap-2">
                                        <Calculator className="w-5 h-5" />
                                        GRAND TOTAL
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-300">Total Material Cost:</span>
                                            <span className="font-bold text-lg">
                                                {formatCurrency(yarnTotals.totalCost + accessoryTotals.totalCost)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-300">Cost per Piece:</span>
                                            <span className="font-bold">
                                                {totalQuantity > 0
                                                    ? formatCurrency((yarnTotals.totalCost + accessoryTotals.totalCost) / totalQuantity)
                                                    : '$0.00'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ConsumptionEditor;
