/**
 * Aegis Medicas ERP - Supplier Directory & Ledger Management
 * Handles supplier directories, GSTIN validation records, pending payment ledgers,
 * expense settlements, and purchase order tracking.
 */

class SupplierView {
    static render(container) {
        this.container = container;
        this.searchQuery = '';

        this.renderLayout();
        this.loadSuppliersData();
        this.bindEvents();
    }

    static renderLayout() {
        this.container.innerHTML = `
            <div class="supplier-root fade-in" style="display:flex; flex-direction:column; gap:20px;">
                <!-- Filter control bar -->
                <div class="card glass-panel" style="padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                        <!-- Search Box -->
                        <div class="input-icon-wrapper" style="width:100%; max-width:400px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <input type="text" id="supp-search" class="input-field" placeholder="Search by company, contact or GSTIN..." value="${this.searchQuery}">
                        </div>

                        <!-- Add Supplier -->
                        <button class="btn btn-primary" id="btn-add-supplier">
                            ➕ Add Supplier Account
                        </button>
                    </div>
                </div>

                <!-- Supplier table card -->
                <div class="card glass-panel" style="padding:20px;">
                    <div class="table-container">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Company / Contact Person</th>
                                    <th>Phone / Email</th>
                                    <th>GSTIN Number</th>
                                    <th>Pending Dues</th>
                                    <th style="text-align: center;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="supp-table-body">
                                <!-- Dynamic rows -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    static loadSuppliersData() {
        let suppliers = AppStorage.getAll('suppliers');

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            suppliers = suppliers.filter(s => 
                s.name.toLowerCase().includes(q) ||
                s.companyName.toLowerCase().includes(q) ||
                s.phone.includes(q) ||
                s.gstin.toLowerCase().includes(q)
            );
        }

        const tbody = document.getElementById('supp-table-body');
        if (suppliers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center; padding:30px;">No suppliers registered matching search.</td></tr>`;
            return;
        }

        tbody.innerHTML = suppliers.map(s => `
            <tr>
                <td data-label="Company / Contact">
                    <div style="display:flex; flex-direction:column;">
                        <span class="bold text-primary">${s.companyName}</span>
                        <span class="text-muted" style="font-size:0.8rem;">Contact: ${s.name}</span>
                    </div>
                </td>
                <td data-label="Phone / Email">
                    <div style="display:flex; flex-direction:column;">
                        <span>${s.phone}</span>
                        <span class="text-muted" style="font-size:0.8rem;">${s.email || 'N/A'}</span>
                    </div>
                </td>
                <td data-label="GSTIN Number">
                    <span class="bold" style="color:var(--info); font-size:0.85rem;">${s.gstin || '-'}</span>
                </td>
                <td data-label="Pending Dues" class="bold ${s.pendingPayments > 0 ? 'text-warning' : 'text-success'}">
                    ${Formatter.currency(s.pendingPayments)}
                </td>
                <td data-label="Actions">
                    <div style="display:flex; justify-content:center; gap:8px;">
                        <button class="btn btn-secondary btn-icon-only action-supp-view" data-id="${s.id}" title="View Dues Ledger">👁️ Ledger</button>
                        <button class="btn btn-secondary btn-icon-only action-supp-edit" data-id="${s.id}" title="Edit Profile">✏️</button>
                        <button class="btn btn-danger btn-icon-only action-supp-delete" data-id="${s.id}" title="Delete Account">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    static bindEvents() {
        // Search
        document.getElementById('supp-search').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.loadSuppliersData();
        });

        // Add
        document.getElementById('btn-add-supplier').addEventListener('click', () => {
            this.openSupplierFormModal();
        });

        // Actions delegation
        document.getElementById('supp-table-body').addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const id = btn.dataset.id;
            if (btn.classList.contains('action-supp-view')) {
                this.viewSupplierDetails(id);
            } else if (btn.classList.contains('action-supp-edit')) {
                this.openSupplierFormModal(id);
            } else if (btn.classList.contains('action-supp-delete')) {
                const supp = AppStorage.getById('suppliers', id);
                if (supp.pendingPayments > 0) {
                    Toast.error(`Cannot delete supplier "${supp.companyName}" because they have pending payment dues of ${Formatter.currency(supp.pendingPayments)}.`);
                    return;
                }

                const confirmDelete = await Dialog.confirm({
                    title: 'Remove Supplier Account',
                    message: `Are you sure you want to delete supplier company "${supp.companyName}" from index?`,
                    confirmText: 'Delete Account',
                    cancelText: 'Cancel',
                    type: 'danger'
                });

                if (confirmDelete) {
                    AppStorage.delete('suppliers', id);
                    Toast.success("Supplier account deleted!");
                    this.loadSuppliersData();
                }
            }
        });
    }

    static openSupplierFormModal(id = null) {
        const isEdit = !!id;
        const s = isEdit ? AppStorage.getById('suppliers', id) : { name: '', phone: '', email: '', companyName: '', gstin: '', pendingPayments: 0 };

        const formContent = `
            <form id="supplier-form">
                <div class="form-group">
                    <label for="s-company">Company Corporate Name *</label>
                    <input type="text" id="s-company" class="input-field" value="${s.companyName}" placeholder="e.g. Pfizer Distribution Ltd" required>
                </div>
                <div class="form-group">
                    <label for="s-name">Contact Person Full Name *</label>
                    <input type="text" id="s-name" class="input-field" value="${s.name}" placeholder="e.g. Mark Ruffalo" required>
                </div>
                <div class="form-group">
                    <label for="s-phone">Contact Phone *</label>
                    <input type="text" id="s-phone" class="input-field" value="${s.phone}" placeholder="e.g. 080-25661100" required>
                </div>
                <div class="form-group">
                    <label for="s-email">Email Address</label>
                    <input type="email" id="s-email" class="input-field" value="${s.email || ''}" placeholder="e.g. support@cipla.com">
                </div>
                <div class="form-group">
                    <label for="s-gst">GSTIN Tax Registration ID *</label>
                    <input type="text" id="s-gst" class="input-field" value="${s.gstin}" placeholder="e.g. 29AAAAA1111A1Z1" pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}" required title="Standard Indian 15-digit GSTIN format required">
                </div>
                ${isEdit ? `
                    <div class="form-group">
                        <label for="s-dues">Outstanding Dues Payable (₹)</label>
                        <input type="number" id="s-dues" class="input-field" value="${s.pendingPayments}" min="0" step="0.01">
                    </div>
                ` : ''}
            </form>
        `;

        Dialog.showCustomModal(
            'supplier-form-modal',
            isEdit ? 'Update Supplier Profile' : 'Register Supplier Account',
            formContent,
            [
                { text: 'Cancel', class: 'btn-secondary' },
                {
                    text: isEdit ? 'Update details' : 'Register supplier',
                    class: 'btn-primary',
                    click: (close, overlay) => {
                        const form = overlay.querySelector('#supplier-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const updated = {
                            ...s,
                            companyName: overlay.querySelector('#s-company').value.trim(),
                            name: overlay.querySelector('#s-name').value.trim(),
                            phone: overlay.querySelector('#s-phone').value.trim(),
                            email: overlay.querySelector('#s-email').value.trim(),
                            gstin: overlay.querySelector('#s-gst').value.trim().toUpperCase(),
                            pendingPayments: isEdit ? parseFloat(overlay.querySelector('#s-dues').value) : 0
                        };

                        AppStorage.save('suppliers', updated);
                        Toast.success(isEdit ? "Supplier profile updated!" : "Supplier account registered successfully!");
                        close();
                        this.loadSuppliersData();
                    }
                }
            ]
        );
    }

    static viewSupplierDetails(id) {
        const s = AppStorage.getById('suppliers', id);
        const purchases = AppStorage.getAll('purchases').filter(p => p.supplierId === id);

        const buildContent = () => `
            <div style="display:grid; grid-template-columns: 1fr; gap:20px;">
                <!-- Header Stats card -->
                <div style="display:grid; grid-template-columns:1fr; gap:16px;">
                    <div class="card glass-panel" style="padding:16px; background:rgba(148, 163, 184, 0.03); justify-content:space-between; flex-direction:row; align-items:center;">
                        <div>
                            <span class="text-muted" style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Outstanding Payable Balance</span>
                            <h2 style="color:${s.pendingPayments > 0 ? 'var(--warning)' : 'var(--secondary)'}; margin-top:5px;">
                                ${Formatter.currency(s.pendingPayments)}
                            </h2>
                        </div>
                        ${s.pendingPayments > 0 ? `<button class="btn btn-primary" id="btn-settle-dues" style="padding:8px 12px; font-size:0.85rem;">Settle payment</button>` : ''}
                    </div>
                </div>

                <!-- PO history ledger -->
                <div class="card glass-panel" style="padding:16px;">
                    <h3 style="font-size:1.05rem; margin-bottom:10px;">Corporate Purchase Orders (POs)</h3>
                    <div class="table-container" style="border:none; margin-top:0; max-height:220px; overflow-y:auto;">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>PO Number</th>
                                    <th>Date</th>
                                    <th>Total Cost</th>
                                    <th>PO Status</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${purchases.length === 0 ? '<tr><td colspan="5" class="text-muted" style="text-align:center; padding:15px;">No purchase orders linked to supplier.</td></tr>' : 
                                purchases.map(po => `
                                    <tr>
                                        <td class="bold text-info">${po.poNo}</td>
                                        <td style="font-size:0.85rem;">${Formatter.date(po.date)}</td>
                                        <td class="bold">${Formatter.currency(po.grandTotal)}</td>
                                        <td><span class="badge ${po.status === 'Received' ? 'badge-success' : 'badge-warning'}">${po.status}</span></td>
                                        <td><button class="btn btn-secondary view-po-receipt" data-po-id="${po.id}" style="padding:4px 8px; font-size:0.75rem;">View</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const modal = Dialog.showCustomModal(
            'supplier-ledger-modal',
            `Corporate Account File: ${s.companyName}`,
            buildContent(),
            [{ text: 'Dismiss File', class: 'btn-secondary' }]
        );

        // Bind Collect Dues button
        const settleBtn = modal.querySelector('#btn-settle-dues');
        if (settleBtn) {
            settleBtn.addEventListener('click', async () => {
                const confirmSettle = await Dialog.confirm({
                    title: 'Settle Supplier Dues Payable',
                    message: `Log financial payment settlement of ${Formatter.currency(s.pendingPayments)} to ${s.companyName}?`,
                    confirmText: 'Settle Payment',
                    cancelText: 'Cancel',
                    type: 'warning'
                });

                if (confirmSettle) {
                    // Update finance expenses logs
                    AppStorage.save('expenses', {
                        date: new Date().toISOString().split('T')[0],
                        category: 'Logistics',
                        description: `Supplier liability settlement paid to ${s.companyName}`,
                        amount: s.pendingPayments
                    });

                    // Clear dues
                    s.pendingPayments = 0;
                    AppStorage.save('suppliers', s);
                    Toast.success("Supplier dues paid & settled successfully.");
                    
                    // Close ledger and reload UI
                    document.getElementById('supplier-ledger-modal').remove();
                    this.loadSuppliersData();
                    if (window.App) window.App.runRealtimeScanner();
                }
            });
        }

        // Bind View PO details click
        modal.querySelector('.table-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('view-po-receipt')) {
                const poId = e.target.dataset.poId;
                const po = AppStorage.getById('purchases', poId);
                if (po) {
                    PurchaseView.openPODetailsModal(po);
                }
            }
        });
    }
}

window.SupplierView = SupplierView;
