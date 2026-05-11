/**
 * New Style Page - Full-page form for creating new styles
 * Matches the Edit Style modal design but as a full page
 */
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Upload, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ROUTES from '../router/routes';
import { PONumber, ProductColor, TechPackData } from '../../types';
import { INITIAL_DATA } from '../../constants';
import { supabase } from '../../lib/supabase';

const NewStylePage: React.FC = () => {
    useDocumentTitle('New Style');
    const navigate = useNavigate();
    const { createProject } = useProjects();

    // Form state
    const [title, setTitle] = useState('');
    const [articleNumber, setArticleNumber] = useState('');
    const [styleNumber, setStyleNumber] = useState('');
    const [description, setDescription] = useState('');
    const [brand, setBrand] = useState('');
    const [team, setTeam] = useState('');
    const [factoryName, setFactoryName] = useState('');
    const [poReceiveDate, setPoReceiveDate] = useState('');
    const [shipmentDate, setShipmentDate] = useState('');
    const [fob, setFob] = useState('');
    const [productImage, setProductImage] = useState('');
    const [productColors, setProductColors] = useState<ProductColor[]>([]);
    const [poNumbers, setPoNumbers] = useState<PONumber[]>([{ id: `po-${Date.now()}`, number: '' }]);

    // Technical Specifications state
    const [gauge, setGauge] = useState('');
    const [yarn, setYarn] = useState('');
    const [knittingTime, setKnittingTime] = useState('');
    const [wash, setWash] = useState('');
    const [embroideryPrint, setEmbroideryPrint] = useState('');
    const [specialTrims, setSpecialTrims] = useState('');
    const [bodyPly, setBodyPly] = useState('');
    const [cuffBottomPly, setCuffBottomPly] = useState('');
    const [neckPly, setNeckPly] = useState('');
    const [sampleComment, setSampleComment] = useState('');

    // Machine Information state
    const [machineName, setMachineName] = useState('');
    const [machineNo, setMachineNo] = useState('');
    const [machineGauge, setMachineGauge] = useState('');
    const [machineTypeNo, setMachineTypeNo] = useState('');

    // New PO form state
    const [showAddPO, setShowAddPO] = useState(false);
    const [newPONumber, setNewPONumber] = useState('');
    const [newPOQuantity, setNewPOQuantity] = useState('');
    const [newPODate, setNewPODate] = useState('');

    // Color picker state
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [newColor, setNewColor] = useState('#3B82F6');
    const [newColorName, setNewColorName] = useState('');

    // Saving state
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [imageUploadError, setImageUploadError] = useState<string | null>(null);

    const imageInputRef = useRef<HTMLInputElement>(null);

    // Image upload handler — uploads to Supabase Storage for a proper public URL
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate size (5 MB max)
        if (file.size > 5 * 1024 * 1024) {
            setImageUploadError('Image must be under 5 MB.');
            return;
        }

        setIsUploadingImage(true);
        setImageUploadError(null);

        try {
            const ext = file.name.split('.').pop();
            const path = `product-images/${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(path, file, { upsert: true });

            if (uploadError) {
                // Fallback: use base64 if storage upload fails (e.g., bucket not set up yet)
                console.warn('[ImageUpload] Storage upload failed, falling back to base64:', uploadError.message);
                const reader = new FileReader();
                reader.onload = (event) => {
                    setProductImage(event.target?.result as string);
                };
                reader.readAsDataURL(file);
                return;
            }

            const { data: urlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(path);

            setProductImage(urlData.publicUrl);
        } catch (err: any) {
            setImageUploadError('Upload failed. Please try again.');
            console.error('[ImageUpload] error:', err);
        } finally {
            setIsUploadingImage(false);
            // Reset input so same file can be re-selected
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    // Color handlers
    const handleAddColor = () => {
        const newColorObj: ProductColor = {
            id: `color-${Date.now()}`,
            hex: newColor,
            name: newColorName.trim() || undefined
        };
        setProductColors([...productColors, newColorObj]);
        setShowColorPicker(false);
        setNewColor('#3B82F6');
        setNewColorName('');
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
        setPoNumbers(poNumbers.filter(po => po.id !== poId));
    };

    // Navigation handlers
    const handleBack = () => {
        navigate(ROUTES.DASHBOARD);
    };

    // Create style handler
    const handleCreate = async () => {

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
                title: title.trim() || 'Untitled Style',
                articleNumber: articleNumber.trim() || undefined,
                styleNumber: styleNumber.trim() || undefined,
                description: description.trim() || undefined,
                brand: brand.trim() || undefined,
                team: team.trim() || undefined,
                factoryName: factoryName.trim() || undefined,
                poReceiveDate: poReceiveDate || undefined,
                shipmentDate: shipmentDate || undefined,
                fob: fob.trim() || undefined,
                // Technical Specifications
                gauge: gauge.trim() || undefined,
                yarn: yarn.trim() || undefined,
                knittingTime: knittingTime.trim() || undefined,
                wash: wash.trim() || undefined,
                embroideryPrint: embroideryPrint.trim() || undefined,
                specialTrims: specialTrims.trim() || undefined,
                bodyPly: bodyPly.trim() || undefined,
                cuffBottomPly: cuffBottomPly.trim() || undefined,
                neckPly: neckPly.trim() || undefined,
                sampleComment: sampleComment.trim() || undefined,
                // Machine Information
                machineName: machineName.trim() || undefined,
                machineNo: machineNo.trim() || undefined,
                machineGauge: machineGauge.trim() || undefined,
                machineTypeNo: machineTypeNo.trim() || undefined,
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
            <div style={{ height: '3px', background: 'linear-gradient(90deg, #4CAF50, #388E3C)', width: '100%' }} />

            {/* Form Content */}
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 md:py-8">
                <div className="space-y-5">
                    {/* Style Name + Article Number (same row) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Style Name
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                placeholder="Enter style name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Article Number
                            </label>
                            <input
                                type="text"
                                value={articleNumber}
                                onChange={e => setArticleNumber(e.target.value)}
                                maxLength={50}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                placeholder="Enter article number"
                            />
                        </div>
                    </div>

                    {/* Style Number */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Style Number
                        </label>
                        <input
                            type="text"
                            value={styleNumber}
                            onChange={e => setStyleNumber(e.target.value)}
                            maxLength={50}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                            placeholder="Enter style number"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            maxLength={500}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
                            placeholder="Enter short description of the style"
                        />
                    </div>

                    {/* Brand */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Brand
                        </label>
                        <input
                            type="text"
                            value={brand}
                            onChange={e => setBrand(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                            placeholder="Enter brand name"
                        />
                    </div>

                    {/* Team */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Team
                        </label>
                        <input
                            type="text"
                            value={team}
                            onChange={e => setTeam(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                            placeholder="Enter team name"
                        />
                    </div>

                    {/* Factory Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Factory Name
                        </label>
                        <input
                            type="text"
                            value={factoryName}
                            onChange={e => setFactoryName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                            placeholder="Enter factory name"
                        />
                    </div>

                    {/* PO Receive Date + Shipment Date (same row) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                PO Receive Date
                            </label>
                            <input
                                type="date"
                                value={poReceiveDate}
                                onChange={e => setPoReceiveDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Shipment Date
                            </label>
                            <input
                                type="date"
                                value={shipmentDate}
                                onChange={e => setShipmentDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* FOB */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            FOB (Free on Board)
                        </label>
                        <input
                            type="text"
                            value={fob}
                            onChange={e => setFob(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                            placeholder="Enter FOB value (e.g., $12.50)"
                        />
                    </div>

                    {/* ── TECHNICAL SPECIFICATIONS ── */}
                    <div className="border-t border-gray-200 pt-6 mt-2">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-green-600 text-white rounded flex items-center justify-center text-[10px] font-bold">TS</span>
                            Technical Specifications
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gauge</label>
                                <input
                                    type="text"
                                    value={gauge}
                                    onChange={e => setGauge(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                    placeholder="e.g., 7GG, 12GG, 14GG"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Yarn</label>
                                <input
                                    type="text"
                                    value={yarn}
                                    onChange={e => setYarn(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                    placeholder="e.g., 100% Cotton, Acrylic Blend"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Knitting Time</label>
                                <input
                                    type="text"
                                    value={knittingTime}
                                    onChange={e => setKnittingTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                    placeholder="e.g., 45 mins, 1.5 hours"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Wash</label>
                                <select
                                    value={wash}
                                    onChange={e => setWash(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white"
                                >
                                    <option value="">Select wash type</option>
                                    <option value="Normal Wash">Normal Wash</option>
                                    <option value="Enzyme Wash">Enzyme Wash</option>
                                    <option value="Garment Wash">Garment Wash</option>
                                    <option value="Acid Wash">Acid Wash</option>
                                    <option value="Stone Wash">Stone Wash</option>
                                    <option value="Softener Wash">Softener Wash</option>
                                    <option value="Silicon Wash">Silicon Wash</option>
                                    <option value="No Wash">No Wash</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Embroidery / Print</label>
                                <input
                                    type="text"
                                    value={embroideryPrint}
                                    onChange={e => setEmbroideryPrint(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                    placeholder="e.g., Screen Print, Embroidery"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Special Trims</label>
                                <input
                                    type="text"
                                    value={specialTrims}
                                    onChange={e => setSpecialTrims(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                    placeholder="e.g., Metal buttons, zippers"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Body Ply</label>
                                <input
                                    type="text"
                                    value={bodyPly}
                                    onChange={e => setBodyPly(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                    placeholder="e.g., Single, Double"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cuff / Bottom Ply</label>
                                <input
                                    type="text"
                                    value={cuffBottomPly}
                                    onChange={e => setCuffBottomPly(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                    placeholder="e.g., 1x1 Rib, 2x2 Rib"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Neck Ply</label>
                                <input
                                    type="text"
                                    value={neckPly}
                                    onChange={e => setNeckPly(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                    placeholder="e.g., V-Neck Rib, Crew Neck"
                                />
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sample Comment</label>
                                <textarea
                                    value={sampleComment}
                                    onChange={e => setSampleComment(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
                                    placeholder="Any notes about the sample..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── MACHINE INFORMATION ── */}
                    <div className="border-t border-gray-200 pt-6 mt-2">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-gray-800 text-white rounded flex items-center justify-center text-[10px] font-bold">MI</span>
                            Machine Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Machine Name</label>
                                <input
                                    type="text"
                                    value={machineName}
                                    onChange={e => setMachineName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                    placeholder="e.g., Shima Seiki, Stoll"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Machine No</label>
                                <input
                                    type="text"
                                    value={machineNo}
                                    onChange={e => setMachineNo(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                    placeholder="e.g., M-001, M-045"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Machine Gauge</label>
                                <input
                                    type="text"
                                    value={machineGauge}
                                    onChange={e => setMachineGauge(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                    placeholder="e.g., 7GG, 12GG"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Machine Type No</label>
                                <input
                                    type="text"
                                    value={machineTypeNo}
                                    onChange={e => setMachineTypeNo(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                    placeholder="e.g., SES-183S"
                                />
                            </div>
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
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <input
                                            type="text"
                                            value={po.number}
                                            onChange={e => handleUpdatePO(po.id, 'number', e.target.value)}
                                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-600"
                                            placeholder="PO Number"
                                        />
                                        <input
                                            type="number"
                                            value={po.quantity || ''}
                                            onChange={e => handleUpdatePO(po.id, 'quantity', e.target.value)}
                                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-600"
                                            placeholder="Qty (pcs)"
                                        />
                                        <input
                                            type="date"
                                            value={po.deliveryDate || ''}
                                            onChange={e => handleUpdatePO(po.id, 'deliveryDate', e.target.value)}
                                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-600"
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
                                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-600"
                                            placeholder="PO Number *"
                                            autoFocus
                                        />
                                        <input
                                            type="number"
                                            value={newPOQuantity}
                                            onChange={e => setNewPOQuantity(e.target.value)}
                                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-600"
                                            placeholder="Qty (optional)"
                                        />
                                        <input
                                            type="date"
                                            value={newPODate}
                                            onChange={e => setNewPODate(e.target.value)}
                                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-600"
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
                                            className="px-2 py-1 btn-primary text-xs rounded"
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
                                    {isUploadingImage
                                        ? <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
                                        : <ImageIcon className="w-8 h-8 text-gray-300" />}
                                </div>
                            )}
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={isUploadingImage}
                                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploadingImage
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                                        : <><Upload className="w-4 h-4" /> Upload Image</>}
                                </button>
                                {imageUploadError && (
                                    <p className="text-xs text-red-500">{imageUploadError}</p>
                                )}
                                <p className="text-xs text-gray-400">JPG, PNG, WebP — max 5 MB</p>
                            </div>
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
                        {/* Added Colors List */}
                        {productColors.length > 0 && (
                            <div className="space-y-2 mb-3">
                                {productColors.map(color => (
                                    <div
                                        key={color.id}
                                        className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded border border-gray-200"
                                    >
                                        <div
                                            className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
                                            style={{ backgroundColor: color.hex }}
                                        />
                                        <span className="text-sm font-mono text-gray-500">{color.hex}</span>
                                        {color.name && (
                                            <>
                                                <span className="text-gray-400">—</span>
                                                <span className="text-sm font-medium text-gray-700">{color.name}</span>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleDeleteColor(color.id)}
                                            className="ml-auto p-1 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Remove color"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Color Picker */}
                        {showColorPicker ? (
                            <div className="flex items-center gap-2 flex-wrap">
                                <input
                                    type="color"
                                    value={newColor}
                                    onChange={e => setNewColor(e.target.value)}
                                    className="w-10 h-10 cursor-pointer border border-gray-300 rounded"
                                />
                                <input
                                    type="text"
                                    value={newColorName}
                                    onChange={e => setNewColorName(e.target.value)}
                                    className="flex-1 min-w-[180px] px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                                    placeholder="Color Name (e.g., Black, Navy Blue)"
                                />
                                <button
                                    onClick={handleAddColor}
                                    className="px-3 py-2 btn-primary text-xs rounded"
                                >
                                    Add
                                </button>
                                <button
                                    onClick={() => { setShowColorPicker(false); setNewColorName(''); }}
                                    className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
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

                {/* Action Buttons — stacked full-width on mobile */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                    <button
                        onClick={handleBack}
                        className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={isSaving}
                        className="w-full sm:w-auto px-6 py-3 sm:py-2 btn-primary text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Creating...' : 'Create Style'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewStylePage;
