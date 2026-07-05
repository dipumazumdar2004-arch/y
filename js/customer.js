/**
 * Aegis Medicas ERP - Customer Relationship Management
 * Manages customer directories, loyalty point ledgers, outstanding balances,
 * credit settlement logs, and transaction audit trails.
 */

class CustomerView {
    static render(container) {
        this.container = container;
        this.searchQuery = '';
        
        this.renderLayout();
        this.loadCustomersData();
        this.bindEvents();
    }

    static renderLayout() {
        this.container.innerHTML = `
            <div class="customer-root fade-in" style="display:flex; flex-direction:column; gap:20px;">
                <!-- Filter control bar -->
                <div class="card glass-panel" style="padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                        <!-- Search Box -->
                        <div class="input-icon-wrapper" style="width:100%; max-width:400px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <input type="text" id="cust-search" class="input-field" placeholder="Search by name, phone or email..." value="${this.searchQuery}">
                        </div>

                        <!-- Add Customer -->
                        <button class="btn btn-primary" id="btn-add-customer">
                            👤 Add New Customer
                        </button>
                    </div>
                </div>

                <!-- Customer Listing grid -->
                <div class="card glass-panel" style="padding:20px;">
                    <div class="table-container">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Customer Name</th>
                                    <th>Phone / Email</th>
                                    <th>Loyalty Points</th>
                                    <th>Outstanding Dues</th>
                                    <th style="text-align: center;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="cust-table-body">
                                <!-- Dynamic rows -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    static loadCustomersData() {
        let customers = AppStorage.getAll('customers');

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            customers = customers.filter(c => 
                c.name.toLowerCase().includes(q) ||
                c.phone.includes(q) ||
                (c.email || '').toLowerCase().includes(q)
            );
        }

        const tbody = document.getElementById('cust-table-body');
        if (customers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center; padding:30px;">No customer records matching search criteria.</td></tr>`;
            return;
        }

        tbody.innerHTML = customers.map(c => `
            <tr>
                <td data-label="Customer Name">
                    <span class="bold text-primary">${c.name}</span>
                </td>
                <td data-label="Phone / Email">
                    <div style="display:flex; flex-direction:column;">
                        <span>${c.phone}</span>
                        <span class="text-muted" style="font-size:0.8rem;">${c.email || 'N/A'}</span>
                    </div>
                </td>
                <td data-label="Loyalty Points">
                    <span class="badge badge-success">⭐ ${c.loyaltyPoints} points</span>
                </td>
                <td data-label="Outstanding Dues" class="bold ${c.outstandingBalance > 0 ? 'text-danger' : 'text-success'}">
                    ${Formatter.currency(c.outstandingBalance)}
                </td>
                <td data-label="Actions">
                    <div style="display:flex; justify-content:center; gap:8px;">
                        <button class="btn btn-secondary btn-icon-only action-cust-view" data-id="${c.id}" title="View File Ledger">👁️ History</button>
                        <button class="btn btn-secondary btn-icon-only action-cust-edit" data-id="${c.id}" title="Edit Profile">✏️</button>
                        <button class="btn btn-danger btn-icon-only action-cust-delete" data-id="${c.id}" title="Delete Record">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    static bindEvents() {
        // Search input
        document.getElementById('cust-search').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.loadCustomersData();
        });

        // Add customer click
        document.getElementById('btn-add-customer').addEventListener('click', () => {
            this.openCustomerFormModal();
        });

        // Action click delegation
        document.getElementById('cust-table-body').addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const id = btn.dataset.id;
            if (btn.classList.contains('action-cust-view')) {
                this.viewCustomerDetails(id);
            } else if (btn.classList.contains('action-cust-edit')) {
                this.openCustomerFormModal(id);
            } else if (btn.classList.contains('action-cust-delete')) {
                const cust = AppStorage.getById('customers', id);
                if (cust.outstandingBalance > 0) {
                    Toast.error(`Cannot delete customer "${cust.name}" because they have outstanding dues of ${Formatter.currency(cust.outstandingBalance)}.`);
                    return;
                }

                const confirmDelete = await Dialog.confirm({
                    title: 'Remove Customer Profile',
                    message: `Are you sure you want to delete "${cust.name}"? This deletes their loyalty point registry.`,
                    confirmText: 'Delete Record',
                    cancelText: 'Cancel',
                    type: 'danger'
                });

                if (confirmDelete) {
                    AppStorage.delete('customers', id);
                    Toast.success("Customer profile deleted!");
                    this.loadCustomersData();
                }
            }
        });
    }

    static openCustomerFormModal(id = null) {
        const isEdit = !!id;
        const cust = isEdit ? AppStorage.getById('customers', id) : { name: '', phone: '', email: '', loyaltyPoints: 0, outstandingBalance: 0 };

        const formContent = `
            <form id="customer-form">
                <div class="form-group">
                    <label for="c-name">Customer Name *</label>
                    <input type="text" id="c-name" class="input-field" value="${cust.name}" placeholder="e.g. Wanda Maximoff" required>
                </div>
                <div class="form-group">
                    <label for="c-phone">Contact Number *</label>
                    <input type="tel" id="c-phone" class="input-field" pattern="[0-9]{10}" placeholder="10-digit mobile number" value="${cust.phone}" required>
                </div>
                <div class="form-group">
                    <label for="c-email">Email Address</label>
                    <input type="email" id="c-email" class="input-field" placeholder="e.g. wanda@scarlet.com" value="${cust.email || ''}">
                </div>
                ${isEdit ? `
                    <div class="form-group">
                        <label for="c-points">Loyalty Points Balance</label>
                        <input type="number" id="c-points" class="input-field" value="${cust.loyaltyPoints}" min="0">
                    </div>
                ` : ''}
            </form>
        `;

        Dialog.showCustomModal(
            'customer-form-modal',
            isEdit ? 'Update Customer Profile' : 'Register Customer Profile',
            formContent,
            [
                { text: 'Cancel', class: 'btn-secondary' },
                {
                    text: isEdit ? 'Update Details' : 'Register Customer',
                    class: 'btn-primary',
                    click: (close, overlay) => {
                        const form = overlay.querySelector('#customer-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const updated = {
                            ...cust,
                            name: overlay.querySelector('#c-name').value.trim(),
                            phone: overlay.querySelector('#c-phone').value.trim(),
                            email: overlay.querySelector('#c-email').value.trim(),
                            loyaltyPoints: isEdit ? parseInt(overlay.querySelector('#c-points').value) : 0
                        };

                        AppStorage.save('customers', updated);
                        Toast.success(isEdit ? "Customer profile details updated!" : "Customer profile registered!");
                        close();
                        this.loadCustomersData();
                    }
                }
            ]
        );
    }

    static viewCustomerDetails(id) {
        const cust = AppStorage.getById('customers', id);
        const invoices = AppStorage.getAll('invoices').filter(inv => inv.customerId === id);

        const buildContent = () => `
            <div style="display:grid; grid-template-columns: 1fr; gap:20px;">
                <!-- Header Stats card -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div class="card glass-panel" style="padding:16px; background:rgba(148, 163, 184, 0.03);">
                        <span class="text-muted" style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Loyalty Balance</span>
                        <h2 style="color:var(--secondary); margin-top:5px;">⭐ ${cust.loyaltyPoints}</h2>
                        <span style="font-size:0.75rem; color:var(--text-muted);">Points redeemable at billing</span>
                    </div>
                    <div class="card glass-panel" style="padding:16px; background:rgba(148, 163, 184, 0.03); justify-content:space-between; flex-direction:row; align-items:center;">
                        <div>
                            <span class="text-muted" style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Outstanding Dues</span>
                            <h2 style="color:${cust.outstandingBalance > 0 ? 'var(--danger)' : 'var(--secondary)'}; margin-top:5px;">
                                ${Formatter.currency(cust.outstandingBalance)}
                            </h2>
                        </div>
                        ${cust.outstandingBalance > 0 ? `<button class="btn btn-success" id="btn-collect-due" style="padding:8px 12px; font-size:0.85rem;">Settle</button>` : ''}
                    </div>
                </div>

                <!-- Transaction Ledger -->
                <div class="card glass-panel" style="padding:16px;">
                    <h3 style="font-size:1.05rem; margin-bottom:10px;">Purchase Transaction Ledger</h3>
                    <div class="table-container" style="border:none; margin-top:0; max-height:220px; overflow-y:auto;">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Invoice No</th>
                                    <th>Date</th>
                                    <th>Payment</th>
                                    <th>Grand Total</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${invoices.length === 0 ? '<tr><td colspan="5" class="text-muted" style="text-align:center; padding:15px;">No transactions logged for this customer.</td></tr>' : 
                                invoices.map(inv => `
                                    <tr>
                                        <td class="bold text-info">${inv.invoiceNo}</td>
                                        <td style="font-size:0.85rem;">${Formatter.date(inv.date)}</td>
                                        <td>${inv.paymentMethod}</td>
                                        <td class="bold">${Formatter.currency(inv.grandTotal)}</td>
                                        <td><button class="btn btn-secondary view-inv-receipt" data-inv-id="${inv.id}" style="padding:4px 8px; font-size:0.75rem;">Bill Receipt</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const modal = Dialog.showCustomModal(
            'customer-ledger-modal',
            `Ledger File: ${cust.name}`,
            buildContent(),
            [{ text: 'Dismiss Ledger', class: 'btn-secondary' }]
        );

        // Bind Collect Dues button
        const collectBtn = modal.querySelector('#btn-collect-due');
        if (collectBtn) {
            collectBtn.addEventListener('click', async () => {
                const confirmCollect = await Dialog.confirm({
                    title: 'Settle Credit Outstanding balance',
                    message: `Mark payment settlement of ${Formatter.currency(cust.outstandingBalance)} from ${cust.name}?`,
                    confirmText: 'Collect & Settle',
                    cancelText: 'Cancel',
                    type: 'warning'
                });

                if (confirmCollect) {
                    // Update finance settings income
                    const financeExpenses = AppStorage.getAll('expenses');
                    AppStorage.save('expenses', {
                        date: new Date().toISOString().split('T')[0],
                        category: 'Income Recovery',
                        description: `Credit outstanding settlement collection from ${cust.name}`,
                        amount: -cust.outstandingBalance // negative amount as income in expense collection
                    });

                    // Clear balance
                    cust.outstandingBalance = 0;
                    AppStorage.save('customers', cust);
                    Toast.success("Credit account dues settled successfully.");
                    
                    // Close ledger and reload UI
                    document.getElementById('customer-ledger-modal').remove();
                    this.loadCustomersData();
                    if (window.App) window.App.runRealtimeScanner();
                }
            });
        }

        // Bind View Invoice Receipt clicks
        modal.querySelector('.table-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('view-inv-receipt')) {
                const invId = e.target.dataset.invId;
                const inv = AppStorage.getById('invoices', invId);
                if (inv) {
                    BillingView.openInvoiceReceiptModal(inv, 0);
                }
            }
        });
    }
}

window.CustomerView = CustomerView;
