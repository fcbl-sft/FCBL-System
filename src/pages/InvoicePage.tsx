/**
 * Invoice Page - Route wrapper for InvoiceEditor
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InvoiceEditor from '../../components/InvoiceEditor';
import { useProjects } from '../context/ProjectContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';
import ROUTES from '../router/routes';
import { Invoice } from '../../types';

const InvoicePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getProject, updateProject } = useProjects();
    const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

    const project = id ? getProject(id) : undefined;
    useDocumentTitle(project ? `Invoice - ${project.title}` : 'Invoice');

    useEffect(() => {
        if (project) {
            if (project.invoices && project.invoices.length > 0) {
                setActiveInvoiceId(project.invoices[0].id);
            } else {
                const newInvoice: Invoice = {
                    id: `INV-${Date.now()}`,
                    invoiceNo: `FC-${Date.now().toString().slice(-6)}`,
                    invoiceDate: new Date().toISOString().split('T')[0],
                    expNo: '', expDate: '', scNo: '', scDate: '',
                    shipperName: 'FASHION COMFORT (BD) LTD', shipperAddress: 'Dhaka, Bangladesh',
                    buyerName: '', buyerAddress: '', buyerVatId: '',
                    consigneeName: '', consigneeAddress: '',
                    notifyParty1Name: '', notifyParty1Address: '', notifyParty1Phone: '', notifyParty1Contact: '', notifyParty1Email: '',
                    notifyParty2Name: '', notifyParty2Address: '',
                    bankName: 'Standard Bank Ltd.', bankBranch: '', bankSwift: '', bankAccountNo: '',
                    exportRegNo: '', exportRegDate: '', portOfLoading: 'Chittagong, BD', finalDestination: '',
                    paymentTerms: 'TT / LC', modeOfShipment: 'SEA', blNo: '', blDate: '', countryOfOrigin: 'Bangladesh',
                    lineItems: [], netWeight: 0, grossWeight: 0, totalCbm: 0,
                    rexDeclaration: 'The exporter declarations...', attachments: [], status: 'DRAFT', remarks: '', comments: []
                };
                updateProject(project.id, { invoices: [newInvoice] });
                setActiveInvoiceId(newInvoice.id);
            }
        }
    }, [project?.id]);

    if (!id) return <NotFoundPage />;
    if (!project) return <LoadingSpinner message="Loading Invoice..." />;

    const activeInvoice = project.invoices?.find((i: Invoice) => i.id === activeInvoiceId);
    if (!activeInvoice) return <LoadingSpinner message="Initializing Invoice..." />;

    const handleUpdate = (invoice: Invoice) => {
        const updated = project.invoices.map((i: Invoice) => i.id === invoice.id ? invoice : i);
        updateProject(project.id, { invoices: updated });
    };

    const handleSave = () => { };
    const handleBack = () => navigate(ROUTES.DASHBOARD);

    return (
        <InvoiceEditor
            project={project}
            invoice={activeInvoice}
            onUpdate={handleUpdate}
            onBack={handleBack}
            onSave={handleSave}
        />
    );
};

export default InvoicePage;
