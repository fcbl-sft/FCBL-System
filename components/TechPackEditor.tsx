import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Upload, FileText, Trash2, Download, Image, FileSpreadsheet, FileType, File, Archive, X, CheckCircle, AlertCircle, RefreshCw, AlertTriangle, Plus } from 'lucide-react';
import { Project, UserRole, ProjectStatus, UploadedTechPack } from '../types';
import { supabase } from '../lib/supabase';

// Supported file types configuration
const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.txt,.csv,.zip,.rar,.ai,.psd,.eps';

const FILE_TYPE_CONFIG: { [key: string]: { icon: React.ElementType; color: string; label: string } } = {
    'application/pdf': { icon: FileText, color: 'text-red-500', label: 'PDF' },
    'application/msword': { icon: FileType, color: 'text-blue-600', label: 'DOC' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileType, color: 'text-blue-600', label: 'DOCX' },
    'application/vnd.ms-excel': { icon: FileSpreadsheet, color: 'text-green-600', label: 'XLS' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-green-600', label: 'XLSX' },
    'application/vnd.ms-powerpoint': { icon: FileType, color: 'text-orange-500', label: 'PPT' },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: FileType, color: 'text-orange-500', label: 'PPTX' },
    'image/jpeg': { icon: Image, color: 'text-purple-500', label: 'JPG' },
    'image/png': { icon: Image, color: 'text-purple-500', label: 'PNG' },
    'image/gif': { icon: Image, color: 'text-purple-500', label: 'GIF' },
    'image/webp': { icon: Image, color: 'text-purple-500', label: 'WEBP' },
    'image/svg+xml': { icon: Image, color: 'text-purple-500', label: 'SVG' },
    'image/bmp': { icon: Image, color: 'text-purple-500', label: 'BMP' },
    'text/plain': { icon: FileText, color: 'text-gray-600', label: 'TXT' },
    'text/csv': { icon: FileSpreadsheet, color: 'text-green-600', label: 'CSV' },
    'application/zip': { icon: Archive, color: 'text-yellow-600', label: 'ZIP' },
    'application/x-rar-compressed': { icon: Archive, color: 'text-yellow-600', label: 'RAR' },
    'default': { icon: File, color: 'text-gray-500', label: 'FILE' }
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

interface TechPackEditorProps {
    project: Project;
    currentUserRole: UserRole;
    onUpdateProject: (updatedProject: Project) => void;
    onBack: () => void;
    onStatusChange: (newStatus: ProjectStatus) => void;
    onAddComment: (text: string) => void;
}

// Helper to format file size
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file type config
const getFileTypeConfig = (mimeType: string) => {
    return FILE_TYPE_CONFIG[mimeType] || FILE_TYPE_CONFIG['default'];
};

// Check if file is an image
const isImageFile = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
};

// Check if file is a PDF
const isPdfFile = (mimeType: string): boolean => {
    return mimeType === 'application/pdf';
};

const TechPackEditor: React.FC<TechPackEditorProps> = ({
    project,
    onUpdateProject,
    onBack
}) => {
    const [activeFileId, setActiveFileId] = useState<string>(project.techPackFiles?.[0]?.id || '');
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [fileErrors, setFileErrors] = useState<{ [key: string]: string }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const reuploadInputRef = useRef<HTMLInputElement>(null);
    const [reuploadTargetFileId, setReuploadTargetFileId] = useState<string | null>(null);

    // Product image upload state
    const productImageInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
    const [productImageDragging, setProductImageDragging] = useState(false);

    // Color picker state
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [newColorHex, setNewColorHex] = useState('#000000');
    const [newColorName, setNewColorName] = useState('');

    const activeFile = project.techPackFiles?.find(f => f.id === activeFileId);

    // Set first file as active if none selected
    useEffect(() => {
        if (!activeFileId && project.techPackFiles?.length > 0) {
            setActiveFileId(project.techPackFiles[0].id);
        }
    }, [project.techPackFiles, activeFileId]);

    // Upload file to Supabase Storage
    const uploadToStorage = async (file: File): Promise<{ url: string; path: string } | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${project.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('tech-packs')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Storage upload error:', error);
                // Show error to user instead of silently using blob URL
                setUploadError(`Upload failed: ${error.message}. Please check that the 'tech-packs' storage bucket exists and is configured correctly in Supabase.`);
                return null;
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('tech-packs')
                .getPublicUrl(data.path);

            if (!publicUrlData?.publicUrl) {
                setUploadError('Failed to get file URL. Please check Supabase storage configuration.');
                return null;
            }

            return { url: publicUrlData.publicUrl, path: data.path };
        } catch (err: any) {
            console.error('Upload error:', err);
            setUploadError(`Upload failed: ${err.message || 'Unknown error'}. Please try again.`);
            return null;
        }
    };

    // Process and upload files
    const processFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        setUploadError(null);
        setUploadSuccess(null);

        // Validate files
        const invalidFiles = fileArray.filter(f => f.size > MAX_FILE_SIZE);
        if (invalidFiles.length > 0) {
            setUploadError(`File(s) too large: ${invalidFiles.map(f => f.name).join(', ')}. Max size is 25MB.`);
            return;
        }

        const newFiles: UploadedTechPack[] = [];

        for (const file of fileArray) {
            const tempId = `upload-${Date.now()}-${Math.random()}`;
            setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));

            // Simulate progress for UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => ({
                    ...prev,
                    [tempId]: Math.min((prev[tempId] || 0) + 10, 90)
                }));
            }, 100);

            const result = await uploadToStorage(file);
            clearInterval(progressInterval);

            if (result) {
                const name = prompt(`Enter name for "${file.name}":`, file.name.split('.')[0] || `File ${project.techPackFiles.length + newFiles.length + 1}`);

                if (name) {
                    const newFile: UploadedTechPack = {
                        id: `file-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        name: name,
                        fileUrl: result.url,
                        uploadDate: new Date().toISOString(),
                        fileName: file.name,
                        fileType: file.type || 'application/octet-stream',
                        fileSize: file.size,
                        storagePath: result.path || undefined
                    };
                    newFiles.push(newFile);
                }
            }

            setUploadProgress(prev => ({ ...prev, [tempId]: 100 }));
            setTimeout(() => {
                setUploadProgress(prev => {
                    const { [tempId]: _, ...rest } = prev;
                    return rest;
                });
            }, 500);
        }

        if (newFiles.length > 0) {
            const updatedProject = {
                ...project,
                techPackFiles: [...(project.techPackFiles || []), ...newFiles]
            };
            onUpdateProject(updatedProject);
            setActiveFileId(newFiles[newFiles.length - 1].id);
            setUploadSuccess(`Successfully uploaded ${newFiles.length} file(s)`);
            setTimeout(() => setUploadSuccess(null), 3000);
        }
    };

    // Handle file input change
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            processFiles(files);
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Drag and drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set to false if leaving the drop zone entirely
        if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFiles(files);
        }
    }, [project, onUpdateProject]);

    // Delete file
    const handleDeleteVersion = async (fileId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this file?")) return;

        const fileToDelete = project.techPackFiles.find(f => f.id === fileId);

        // Try to delete from Supabase storage if it has a storage path
        if (fileToDelete?.storagePath) {
            try {
                await supabase.storage.from('tech-packs').remove([fileToDelete.storagePath]);
            } catch (err) {
                console.error('Error deleting from storage:', err);
            }
        }

        const newFiles = project.techPackFiles.filter(f => f.id !== fileId);
        onUpdateProject({ ...project, techPackFiles: newFiles });

        if (activeFileId === fileId && newFiles.length > 0) {
            setActiveFileId(newFiles[0].id);
        } else if (newFiles.length === 0) {
            setActiveFileId('');
        }
    };

    // Download file
    const handleDownload = (file: UploadedTechPack, e: React.MouseEvent) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = file.fileUrl;
        link.download = file.fileName || file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Handle re-upload for broken files
    const handleReupload = async (fileId: string, newFile: File) => {
        const oldFile = project.techPackFiles.find(f => f.id === fileId);
        if (!oldFile) return;

        // Delete old file from storage if it exists
        if (oldFile.storagePath) {
            try {
                await supabase.storage.from('tech-packs').remove([oldFile.storagePath]);
            } catch (err) {
                console.error('Error removing old file:', err);
            }
        }

        // Upload new file
        const result = await uploadToStorage(newFile);
        if (result) {
            const updatedFile: UploadedTechPack = {
                ...oldFile,
                fileUrl: result.url,
                storagePath: result.path || undefined,
                fileName: newFile.name,
                fileType: newFile.type || 'application/octet-stream',
                fileSize: newFile.size,
                uploadDate: new Date().toISOString()
            };

            const updatedFiles = project.techPackFiles.map(f =>
                f.id === fileId ? updatedFile : f
            );
            onUpdateProject({ ...project, techPackFiles: updatedFiles });

            // Clear error for this file
            setFileErrors(prev => {
                const { [fileId]: _, ...rest } = prev;
                return rest;
            });

            setUploadSuccess(`Successfully re-uploaded ${newFile.name}`);
            setTimeout(() => setUploadSuccess(null), 3000);
        }
    };

    const handleReuploadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && reuploadTargetFileId) {
            handleReupload(reuploadTargetFileId, file);
        }
        setReuploadTargetFileId(null);
        if (reuploadInputRef.current) {
            reuploadInputRef.current.value = '';
        }
    };

    const triggerReupload = (fileId: string) => {
        setReuploadTargetFileId(fileId);
        reuploadInputRef.current?.click();
    };

    // Product image upload handler
    const handleProductImageUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setUploadError('Please select an image file (JPG, PNG, etc.)');
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setUploadError('Image file is too large. Max size is 25MB.');
            return;
        }

        setIsUploadingProductImage(true);
        setUploadError(null);

        try {
            const result = await uploadToStorage(file);
            if (result) {
                onUpdateProject({ ...project, productImage: result.url });
                setUploadSuccess('Product image uploaded successfully');
                setTimeout(() => setUploadSuccess(null), 3000);
            }
        } finally {
            setIsUploadingProductImage(false);
        }
    };

    const handleProductImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleProductImageUpload(file);
        }
        if (productImageInputRef.current) {
            productImageInputRef.current.value = '';
        }
    };

    const handleProductImageDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setProductImageDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleProductImageUpload(file);
        }
    };

    const handleDeleteProductImage = async () => {
        if (!confirm('Delete product image?')) return;
        // Try to delete from storage if it's a Supabase URL
        if (project.productImage && project.productImage.includes('supabase')) {
            try {
                const url = new URL(project.productImage);
                const pathParts = url.pathname.split('/');
                const storagePath = pathParts.slice(pathParts.indexOf('tech-packs') + 1).join('/');
                if (storagePath) {
                    await supabase.storage.from('tech-packs').remove([storagePath]);
                }
            } catch (err) {
                console.error('Error deleting product image from storage:', err);
            }
        }
        onUpdateProject({ ...project, productImage: undefined });
    };

    // Color picker handlers
    const handleAddColor = () => {
        const newColor = {
            id: `color-${Date.now()}`,
            hex: newColorHex,
            name: newColorName.trim() || undefined
        };
        const currentColors = project.productColors || [];
        onUpdateProject({ ...project, productColors: [...currentColors, newColor] });
        setShowColorPicker(false);
        setNewColorHex('#000000');
        setNewColorName('');
    };

    const handleDeleteColor = (colorId: string) => {
        const currentColors = project.productColors || [];
        onUpdateProject({ ...project, productColors: currentColors.filter(c => c.id !== colorId) });
    };

    // Render file preview
    const renderFilePreview = () => {
        if (!activeFile) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <File className="w-16 h-16 mb-4" />
                    <span className="font-bold">No file selected</span>
                    <span className="text-sm mt-2">Upload a file or select one from the sidebar</span>
                </div>
            );
        }

        // Check if file has an error (from actual load failure)
        const fileError = fileErrors[activeFile.id];
        if (fileError) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 bg-red-50">
                    <AlertTriangle className="w-16 h-16 mb-4 text-red-500" />
                    <span className="font-bold text-xl mb-2 text-red-700">File Load Error</span>
                    <span className="text-sm text-red-600 mb-4 text-center max-w-md">
                        {fileError}
                    </span>
                    <button
                        onClick={() => {
                            // Clear error and retry
                            setFileErrors(prev => {
                                const { [activeFile.id]: _, ...rest } = prev;
                                return rest;
                            });
                        }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Retry Loading
                    </button>
                </div>
            );
        }

        // Check if file URL is missing
        if (!activeFile.fileUrl) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 bg-yellow-50">
                    <AlertTriangle className="w-16 h-16 mb-4 text-yellow-500" />
                    <span className="font-bold text-xl mb-2 text-yellow-700">No File URL</span>
                    <span className="text-sm text-yellow-600 mb-4 text-center max-w-md">
                        This file record exists but has no URL. The file may need to be re-uploaded.
                    </span>
                </div>
            );
        }

        const fileType = activeFile.fileType || 'application/octet-stream';

        // Image preview with error handling
        if (isImageFile(fileType)) {
            return (
                <div className="w-full h-full flex items-center justify-center p-4 bg-gray-100">
                    <img
                        src={activeFile.fileUrl}
                        alt={activeFile.name}
                        className="max-w-full max-h-full object-contain shadow-lg rounded"
                        onError={() => {
                            setFileErrors(prev => ({
                                ...prev,
                                [activeFile.id]: 'Failed to load image. File may be corrupted or inaccessible.'
                            }));
                        }}
                    />
                </div>
            );
        }

        // PDF preview
        if (isPdfFile(fileType)) {
            return (
                <iframe
                    src={activeFile.fileUrl}
                    className="w-full h-full shadow-lg rounded bg-white"
                    title="PDF Viewer"
                    onError={() => {
                        setFileErrors(prev => ({
                            ...prev,
                            [activeFile.id]: 'Failed to load PDF. File may be corrupted or inaccessible.'
                        }));
                    }}
                />
            );
        }

        // Other file types - show download prompt
        const config = getFileTypeConfig(fileType);
        const IconComponent = config.icon;

        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 bg-gray-50">
                <IconComponent className={`w-24 h-24 mb-4 ${config.color}`} />
                <span className="font-bold text-xl mb-2">{activeFile.name}</span>
                <span className="text-sm text-gray-500 mb-4">
                    {config.label} • {formatFileSize(activeFile.fileSize || 0)}
                </span>
                <button
                    onClick={(e) => handleDownload(activeFile, e)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                    <Download className="w-5 h-5" />
                    Download File
                </button>
            </div>
        );
    };

    return (
        <div className="flex h-screen w-full bg-white flex-col">
            {/* Top Bar - Inditex style */}
            <div className="h-14 bg-white flex justify-between items-center px-6 shrink-0 z-30" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <div className="flex items-center gap-4">
                    <div>
                        <h1 style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#000000' }}>
                            {project.title}
                        </h1>
                        <span style={{ fontSize: '10px', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tech Pack Files</span>
                    </div>
                </div>

                <div>
                    {/* Hidden input for regular uploads */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept={ACCEPTED_EXTENSIONS}
                        multiple
                        onChange={handleFileInputChange}
                    />
                    {/* Hidden input for re-uploads */}
                    <input
                        type="file"
                        ref={reuploadInputRef}
                        className="hidden"
                        accept={ACCEPTED_EXTENSIONS}
                        onChange={handleReuploadInputChange}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" /> UPLOAD FILES
                    </button>
                </div>
            </div>

            {/* Success/Error Messages */}
            {uploadSuccess && (
                <div className="absolute top-20 right-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg z-50">
                    <CheckCircle className="w-5 h-5" />
                    {uploadSuccess}
                    <button onClick={() => setUploadSuccess(null)} className="ml-2 hover:text-green-900">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            {uploadError && (
                <div className="absolute top-20 right-4 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg z-50">
                    <AlertCircle className="w-5 h-5" />
                    {uploadError}
                    <button onClick={() => setUploadError(null)} className="ml-2 hover:text-red-900">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="flex flex-grow overflow-hidden">
                {/* Sidebar - Inditex style */}
                <div className="w-72 bg-white flex flex-col overflow-y-auto" style={{ borderRight: '1px solid #E0E0E0' }}>
                    {/* Product Image Section */}
                    <div className="p-4" style={{ borderBottom: '1px solid #E0E0E0' }}>
                        <div style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666666', marginBottom: '12px' }}>
                            Product Image
                        </div>
                        <input
                            type="file"
                            ref={productImageInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleProductImageInputChange}
                        />
                        {project.productImage ? (
                            <div className="relative group">
                                <img
                                    src={project.productImage}
                                    alt="Product"
                                    className="w-full aspect-square object-cover rounded-xl border border-gray-200"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => productImageInputRef.current?.click()}
                                        className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                                        title="Replace image"
                                    >
                                        <Upload className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleDeleteProductImage}
                                        className="p-2 bg-white rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                        title="Delete image"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onDragEnter={(e) => { e.preventDefault(); setProductImageDragging(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setProductImageDragging(false); }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleProductImageDrop}
                                onClick={() => productImageInputRef.current?.click()}
                                className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${productImageDragging
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                                    } ${isUploadingProductImage ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                {isUploadingProductImage ? (
                                    <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
                                ) : (
                                    <>
                                        <Image className={`w-10 h-10 mb-2 ${productImageDragging ? 'text-indigo-500' : 'text-gray-300'}`} />
                                        <span className="text-xs font-medium text-gray-500">Upload Product Image</span>
                                        <span className="text-[10px] text-gray-400 mt-1">Shown on dashboard card</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Product Colors Section */}
                    <div className="p-4" style={{ borderBottom: '1px solid #E0E0E0' }}>
                        <div className="flex items-center justify-between mb-3">
                            <span style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666666' }}>
                                Product Colors
                            </span>
                            <button
                                onClick={() => setShowColorPicker(true)}
                                className="flex items-center gap-1"
                                style={{ fontSize: '10px', fontWeight: 700, color: '#000000', textTransform: 'uppercase' }}
                            >
                                <Plus className="w-3 h-3" /> Add
                            </button>
                        </div>

                        {/* Color List */}
                        {(project.productColors || []).length > 0 ? (
                            <div className="space-y-2">
                                {project.productColors?.map(color => (
                                    <div key={color.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                        <div
                                            className="w-5 h-5 rounded-sm border border-gray-300"
                                            style={{ backgroundColor: color.hex }}
                                        />
                                        <span className="text-xs font-medium text-gray-700 flex-grow">
                                            {color.name || color.hex}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-mono">
                                            {color.hex}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteColor(color.id)}
                                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Remove color"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">No colors added. Click + Add Color to add.</p>
                        )}

                        {/* Color Picker Modal */}
                        {showColorPicker && (
                            <div className="mt-3 p-3 bg-white border border-gray-200 rounded-xl shadow-lg">
                                <div className="text-xs font-bold text-gray-700 mb-2">Pick Color</div>
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type="color"
                                        value={newColorHex}
                                        onChange={(e) => setNewColorHex(e.target.value)}
                                        className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                                    />
                                    <input
                                        type="text"
                                        value={newColorHex}
                                        onChange={(e) => setNewColorHex(e.target.value)}
                                        className="flex-grow px-2 py-1.5 text-xs border border-gray-300 rounded font-mono"
                                        placeholder="#000000"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={newColorName}
                                    onChange={(e) => setNewColorName(e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded mb-2"
                                    placeholder="Color name (optional)"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowColorPicker(false)}
                                        className="flex-1 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddColor}
                                        className="flex-1 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
                                    >
                                        Add Color
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-b border-gray-100 font-bold text-xs text-gray-500 uppercase tracking-wider">
                        Uploaded Files ({(project.techPackFiles || []).length})
                    </div>

                    {/* Drag & Drop Zone */}
                    <div
                        ref={dropZoneRef}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`m-3 p-4 border-2 border-dashed rounded-xl transition-all cursor-pointer ${isDragging
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                            }`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="flex flex-col items-center text-center">
                            <Upload className={`w-8 h-8 mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                            {isDragging ? (
                                <span className="text-sm font-bold text-blue-600">Drop files here!</span>
                            ) : (
                                <>
                                    <span className="text-sm font-bold text-gray-600">Drag & Drop Files</span>
                                    <span className="text-xs text-gray-400 mt-1">or click to browse</span>
                                </>
                            )}
                            <span className="text-[10px] text-gray-400 mt-2">
                                PDF, DOC, XLS, JPG, PNG, ZIP...
                            </span>
                            <span className="text-[10px] text-gray-400">
                                Max 25MB per file
                            </span>
                        </div>
                    </div>

                    {/* Upload Progress */}
                    {Object.keys(uploadProgress).length > 0 && (
                        <div className="px-3 pb-3">
                            {Object.entries(uploadProgress).map(([id, progress]) => (
                                <div key={id} className="bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-blue-500 h-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* File List */}
                    <div className="flex-grow overflow-y-auto">
                        {(project.techPackFiles || []).length === 0 ? (
                            <div className="p-4 text-center text-gray-400 text-sm">
                                No files uploaded yet
                            </div>
                        ) : (
                            (project.techPackFiles || []).map(file => {
                                const config = getFileTypeConfig(file.fileType || 'default');
                                const IconComponent = config.icon;
                                const hasError = !!fileErrors[file.id];

                                return (
                                    <div
                                        key={file.id}
                                        onClick={() => setActiveFileId(file.id)}
                                        className={`p-3 border-b border-gray-100 cursor-pointer group ${activeFileId === file.id
                                            ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                            : hasError
                                                ? 'bg-red-50 hover:bg-red-100'
                                                : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {hasError ? (
                                                <AlertTriangle className="w-5 h-5 mt-0.5 text-red-500" />
                                            ) : (
                                                <IconComponent className={`w-5 h-5 mt-0.5 ${config.color}`} />
                                            )}
                                            <div className="flex-grow min-w-0">
                                                <div className={`text-sm font-bold truncate ${hasError ? 'text-red-700' : 'text-gray-700'}`}>
                                                    {file.name}
                                                </div>
                                                <div className="text-[10px] text-gray-400">{file.fileName || 'Unknown file'}</div>
                                                {hasError ? (
                                                    <div className="text-[10px] text-red-500 mt-1 font-medium">
                                                        ⚠ Load error
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-1">
                                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">{config.label}</span>
                                                        <span>{formatFileSize(file.fileSize || 0)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleDownload(file, e)}
                                                    className="p-1 text-gray-400 hover:text-blue-500"
                                                    title="Download"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteVersion(file.id, e)}
                                                    className="p-1 text-gray-400 hover:text-red-500"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* File Preview */}
                <div className="flex-grow bg-gray-200 p-4 flex items-center justify-center">
                    {renderFilePreview()}
                </div>
            </div>
        </div>
    );
};

export default TechPackEditor;