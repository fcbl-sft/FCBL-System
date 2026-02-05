/**
 * Invoice Content - Renders inside StyleLayout
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import InvoiceEditor from '../../components/InvoiceEditor';
import { useProjects } from '../context/ProjectContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Invoice } from '../../types';

const InvoiceContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;

    if (!project) return <LoadingSpinner message="Loading..." />;

    const getOrCreateInvoice = (): Invoice => {
        if (project.invoices && project.invoices.length > 0) {
            return project.invoices[project.invoices.length - 1];
        }
        return {
            id: `inv-${Date.now()}`,
            invoiceNo: '',
            invoiceDate: new Date().toISOString().split('T')[0],
            expNo: '',
            expDate: '',
            scNo: '',
            scDate: '',
            shipperName: '',
            shipperAddress: '',
            buyerName: '',
            buyerAddress: '',
            buyerVatId: '',
            consigneeName: '',
            consigneeAddress: '',
            notifyParty1Name: '',
            notifyParty1Address: '',
            notifyParty1Phone: '',
            notifyParty1Contact: '',
            notifyParty1Email: '',
            notifyParty2Name: '',
            notifyParty2Address: '',
            bankName: '',
            bankBranch: '',
            bankSwift: '',
            bankAccountNo: '',
            exportRegNo: '',
            exportRegDate: '',
            portOfLoading: '',
            finalDestination: '',
            paymentTerms: '',
            modeOfShipment: '',
            blNo: '',
            blDate: '',
            countryOfOrigin: '',
            lineItems: [],
            netWeight: 0,
            grossWeight: 0,
            totalCbm: 0,
            rexDeclaration: '',
            attachments: [],
            status: 'DRAFT'
        };
    };

    const handleUpdate = (invoice: Invoice) => {
        const existingInvoices = project.invoices || [];
        const existingIndex = existingInvoices.findIndex(i => i.id === invoice.id);
        if (existingIndex >= 0) {
            const updatedInvoices = [...existingInvoices];
            updatedInvoices[existingIndex] = invoice;
            updateProject(project.id, { invoices: updatedInvoices });
        } else {
            updateProject(project.id, { invoices: [...existingInvoices, invoice] });
        }
    };

    const noOp = () => { };

    return (
        <InvoiceEditor
            project={project}
            invoice={getOrCreateInvoice()}
            onUpdate={handleUpdate}
            onBack={noOp}
            onSave={noOp}
        />
    );
};

export default InvoiceContent;
