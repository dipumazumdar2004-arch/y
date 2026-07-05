/**
 * Aegis Medicas ERP - Inventory Control Controller
 * Manages inventory valuations, stock thresholds, manual adjustments, and audit histories.
 */

class InventoryView {
    static render(container) {
        this.container = container;
        this.activeTab = 'current'; // 'current', 'low', 'expired', 'history'
        this.initHistory();

        this.renderLayout();
        this.loadTabData();
        this.bindEvents();
    }

    static initHistory() {
        if (!localStorage.getItem('inventory_history')) {
            AppStorage.set('inventory_history', []);
        }
    }

    static renderLayout() {
        const medicines = AppStorage.getAll('medicines');
        const returns = AppStorage.getAll('returns');
        const today = new Date();

        // 1. Calculations for KPI cards
        let totalValuation = 0;
        let lowStockAlerts = 0;
        let expiredItems = 0;
        let damagedVal = 0;

        medicines.forEach(m => {
            totalValuation += (m.stock * m.purchasePrice);
            if (m.stock <= (m.minStock || 15)) {
                lowStockAlerts++;
            }
            if (m.expiryDate && new Date(m.expiryDate) <= today) {
                expiredItems++;
            }
        });

        returns.forEach(r => {
            if (r.type === 'Damaged') {
                damagedVal += r.amount;
            }
        });

        this.container.innerHTML = `
            <div class="inventory-root fade-in" style="display: flex; flex-direction: column; gap: 24px;">
                
                <!-- Inventory KPI Cards Grid -->
                <div class="stats-grid">
                    <div class="card glass-panel stat-card">
                        <div class="stat-header">
                            <span class="stat-title">Total Inventory Value</span>
                            <div class="stat-icon-box" style="background: var(--info-light); color: var(--info);">🪙</div>
                        </div>
                        <h2 class="stat-value">${Formatter.currency(totalValuation)}</h2>
                        <span class="text-muted" style="font-size:0.8rem;">Assets currently in stock</span>
                    </div>
                    
                    <div class="card glass-panel stat-card">
                        <div class="stat-header">
                            <span class="stat-title">Low Stock Shortages</span>
                            <div class="stat-icon-box" style="background: var(--warning-light); color: var(--warning);">⚠️</div>
                        </div>
                        <h2 class="stat-value ${lowStockAlerts > 0 ? 'text-warning' : ''}">${lowStockAlerts}</h2>
                        <span class="text-muted" style="font-size:0.8rem;">Below minimum order level</span>
                    </div>

                    <div class="card glass-panel stat-card">
                        <div class="stat-header">
                            <span class="stat-title">Expired Products</span>
                            <div class="stat-icon-box" style="background: var(--danger-light); color: var(--danger);">🛑</div>
                        </div>
                        <h2 class="stat-value ${expiredItems > 0 ? 'text-danger' : ''}">${expiredItems}</h2>
                        <span class="text-muted" style="font-size:0.8rem;">Requiring disposal returns</span>
                    </div>

                    <div class="card glass-panel stat-card">
                        <div class="stat-header">
                            <span class="stat-title">Damaged Scraps</span>
                            <div class="stat-icon-box" style="background: var(--danger-light); color: var(--danger);">💔</div>
                        </div>
                        <h2 class="stat-value">${Formatter.currency(damagedVal)}</h2>
                        <span class="text-muted" style="font-size:0.8rem;">Total value write-off</span>
                    </div>
                </div>

                <!-- Tab Navigation Card -->
                <div class="card glass-panel" style="padding: 24px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom: 15px;">
                        <div class="tabs" style="margin-bottom:0; border-bottom:none;">
                            <button class="tab-btn ${this.activeTab === 'current' ? 'active' : ''}" data-tab="current">Current Stock Ledger</button>
                            <button class="tab-btn ${this.activeTab === 'low' ? 'active' : ''}" data-tab="low">Low Stock Warnings</button>
                            <button class="tab-btn ${this.activeTab === 'expired' ? 'active' : ''}" data-tab="expired">Expired Products list</button>
                            <button class="tab-btn ${this.activeTab === 'history' ? 'active' : ''}" data-tab="history">Audit Stock History</button>
                        </div>
                        
                        <div style="display:flex; gap:10px;">
                            <button class="btn btn-secondary" id="btn-adjust-stock">⚙️ Manual Adjustment</button>
                        </div>
                    </div>

                    <!-- Inner tab viewport -->
                    <div id="inventory-tab-content">
                        <!-- Dynamic components load here -->
                    </div>
                </div>

            </div>
        `;
    }

    static loadTabData() {
        const viewport = document.getElementById('inventory-tab-content');
        if (!viewport) return;

        const medicines = AppStorage.getAll('medicines');
        const today = new Date();

        switch (this.activeTab) {
            case 'current':
                viewport.innerHTML = `
                    <div class="table-container" style="border:none; margin-top:0;">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Medicine Name</th>
                                    <th>Batch / Barcode</th>
                                    <th>Category</th>
                                    <th>Stock Level</th>
                                    <th>Purchase Price</th>
                                    <th>Asset Valuation</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${medicines.map(m => `
                                    <tr>
                                        <td data-label="Medicine Name">
                                            <div style="display:flex; flex-direction:column;">
                                                <span class="bold text-primary">${m.name}</span>
                                                <span class="text-muted" style="font-size:0.8rem;">Rack shelf: ${m.rackNo || '-'}</span>
                                            </div>
                                        </td>
                                        <td data-label="Batch / Barcode">
                                            <div style="display:flex; flex-direction:column;">
                                                <span>Batch: ${m.batchNo}</span>
                                                <span class="text-muted" style="font-size:0.75rem;">Barcode: ${m.barcode || '-'}</span>
                                            </div>
                                        </td>
                                        <td data-label="Category">${m.category}</td>
                                        <td data-label="Stock Level">
                                            <span class="badge ${m.stock <= (m.minStock || 15) ? 'badge-warning' : 'badge-success'}">${m.stock} packs</span>
                                        </td>
                                        <td data-label="Purchase Price">${Formatter.currency(m.purchasePrice)}</td>
                                        <td data-label="Asset Valuation" class="bold">${Formatter.currency(m.stock * m.purchasePrice)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                break;

            case 'low':
                const lowStockList = medicines.filter(m => m.stock <= (m.minStock || 15));
                viewport.innerHTML = `
                    <div class="table-container" style="border:none; margin-top:0;">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Medicine Name</th>
                                    <th>Current Stock</th>
                                    <th>Min. Threshold</th>
                                    <th>Required order</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lowStockList.length === 0 ? '<tr><td colspan="5" class="text-muted" style="text-align:center; padding:30px;">All medicines stock counts are above minimum thresholds.</td></tr>' : 
                                lowStockList.map(m => `
                                    <tr>
                                        <td data-label="Medicine Name" class="bold text-primary">${m.name}</td>
                                        <td data-label="Current Stock"><span class="badge badge-danger">${m.stock} packs</span></td>
                                        <td data-label="Min. Threshold">${m.minStock}</td>
                                        <td data-label="Required order" class="bold text-warning">${m.maxStock - m.stock} packs</td>
                                        <td data-label="Actions">
                                            <button class="btn btn-primary btn-sm action-order-stock" data-id="${m.id}" style="padding: 6px 12px; font-size: 0.8rem;">
                                                📝 Create PO
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                break;

            case 'expired':
                const expiredList = medicines.filter(m => m.expiryDate && new Date(m.expiryDate) <= today);
                viewport.innerHTML = `
                    <div class="table-container" style="border:none; margin-top:0;">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Medicine Name</th>
                                    <th>Expired Batch</th>
                                    <th>Expiry Date</th>
                                    <th>Stock to Return</th>
                                    <th>Valuation loss</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${expiredList.length === 0 ? '<tr><td colspan="6" class="text-muted" style="text-align:center; padding:30px;">No expired medicines detected. Great shelf rotation!</td></tr>' : 
                                expiredList.map(m => `
                                    <tr>
                                        <td data-label="Medicine Name" class="bold text-danger">${m.name}</td>
                                        <td data-label="Expired Batch">${m.batchNo}</td>
                                        <td data-label="Expiry Date" class="bold text-danger">${Formatter.date(m.expiryDate)}</td>
                                        <td data-label="Stock to Return">${m.stock} packs</td>
                                        <td data-label="Valuation loss" class="bold">${Formatter.currency(m.stock * m.purchasePrice)}</td>
                                        <td data-label="Actions">
                                            <button class="btn btn-danger btn-sm action-scrap-expired" data-id="${m.id}" style="padding: 6px 12px; font-size: 0.8rem;">
                                                🗑️ Dispose & Return
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                break;

            case 'history':
                const auditHistory = AppStorage.get('inventory_history') || [];
                viewport.innerHTML = `
                    <div class="table-container" style="border:none; margin-top:0;">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Medicine</th>
                                    <th>Quantity Change</th>
                                    <th>Flow Type</th>
                                    <th>Comments</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${auditHistory.length === 0 ? '<tr><td colspan="5" class="text-muted" style="text-align:center; padding:30px;">No inventory transaction audit trails logged.</td></tr>' : 
                                [...auditHistory].reverse().map(h => `
                                    <tr>
                                        <td data-label="Date" style="font-size:0.85rem;">${Formatter.dateTime(h.date)}</td>
                                        <td data-label="Medicine" class="bold text-primary">${h.medName}</td>
                                        <td data-label="Quantity Change" class="bold ${h.qty > 0 ? 'text-success' : 'text-danger'}">
                                            ${h.qty > 0 ? '+' : ''}${h.qty}
                                        </td>
                                        <td data-label="Flow Type"><span class="badge ${h.qty > 0 ? 'badge-success' : 'badge-warning'}">${h.type}</span></td>
                                        <td data-label="Comments" style="font-size:0.85rem;">${h.comment || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                break;
        }
    }

    static bindEvents() {
        // Tab clicks
        this.container.querySelectorAll('.tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activeTab = btn.dataset.tab;
                this.renderLayout();
                this.loadTabData();
                this.bindEvents();
            });
        });

        // Manual Stock Adjustment click
        this.container.querySelector('#btn-adjust-stock').addEventListener('click', () => {
            this.openStockAdjustmentModal();
        });

        // Tab sub-buttons delegations
        const viewport = document.getElementById('inventory-tab-content');
        viewport.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const id = btn.dataset.id;
            if (btn.classList.contains('action-order-stock')) {
                // Redirect to purchase orders view
                window.location.hash = 'purchase';
            } else if (btn.classList.contains('action-scrap-expired')) {
                const med = AppStorage.getById('medicines', id);
                if (med.stock === 0) {
                    Toast.warning("No stock left to dispose.");
                    return;
                }

                const confirmScrap = await Dialog.confirm({
                    title: 'Dispose & Return Expired Product',
                    message: `Are you sure you want to return ${med.stock} packs of expired "${med.name}" to suppliers and write off inventory?`,
                    confirmText: 'Return & Write Off',
                    cancelText: 'Cancel',
                    type: 'danger'
                });

                if (confirmScrap) {
                    // Update adjustment log
                    const history = AppStorage.get('inventory_history') || [];
                    history.push({
                        id: 'H_' + Date.now(),
                        date: new Date().toISOString(),
                        medName: med.name,
                        qty: -med.stock,
                        type: 'Expired Return',
                        comment: `Returned expired stock of batch ${med.batchNo} to suppliers.`
                    });
                    AppStorage.set('inventory_history', history);

                    // Add to returns collection
                    const returnRecord = {
                        returnNo: 'RET-E-' + Math.floor(Math.random()*9000 + 1000),
                        date: new Date().toISOString().split('T')[0],
                        type: 'Expired',
                        itemId: med.id,
                        itemName: med.name,
                        qty: med.stock,
                        amount: med.stock * med.purchasePrice
                    };
                    AppStorage.save('returns', returnRecord);

                    // Update medicine stock
                    med.stock = 0;
                    AppStorage.save('medicines', med);

                    Toast.success("Expired stock successfully processed and cleared.");
                    this.renderLayout();
                    this.loadTabData();
                    this.bindEvents();

                    if (window.App) window.App.runRealtimeScanner();
                }
            }
        });
    }

    static openStockAdjustmentModal() {
        const medicines = AppStorage.getAll('medicines');
        const formHtml = `
            <form id="stock-adjust-form">
                <div class="form-group">
                    <label for="adj-med-id">Select Medicine *</label>
                    <select id="adj-med-id" class="input-field" required>
                        ${medicines.map(m => `<option value="${m.id}" data-stock="${m.stock}">${m.name} (Batch: ${m.batchNo}, Current Stock: ${m.stock} packs)</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="adj-type">Adjustment Direction *</label>
                    <select id="adj-type" class="input-field" required>
                        <option value="add">Add Inflow Stock (+)</option>
                        <option value="deduct">Deduct Outflow Stock (-)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="adj-qty">Adjust Quantity *</label>
                    <input type="number" id="adj-qty" class="input-field" min="1" placeholder="Quantity count" required>
                </div>
                <div class="form-group">
                    <label for="adj-comment">Reason / Action Comment *</label>
                    <input type="text" id="adj-comment" class="input-field" placeholder="Provide audit trail explanation details" required>
                </div>
            </form>
        `;

        Dialog.showCustomModal('stock-adjust-modal', 'Process Stock Adjustment Audit', formHtml, [
            { text: 'Cancel', class: 'btn-secondary' },
            {
                text: 'Confirm Adjustment',
                class: 'btn-primary',
                click: (close, overlay) => {
                    const form = overlay.querySelector('#stock-adjust-form');
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }

                    const medId = overlay.querySelector('#adj-med-id').value;
                    const type = overlay.querySelector('#adj-type').value;
                    const qty = parseInt(overlay.querySelector('#adj-qty').value);
                    const comment = overlay.querySelector('#adj-comment').value.trim();

                    const med = AppStorage.getById('medicines', medId);
                    if (!med) return;

                    const change = type === 'add' ? qty : -qty;

                    // Outflow validations
                    if (type === 'deduct' && med.stock < qty) {
                        Toast.error(`Adjustment failed! Cannot deduct ${qty} packs when only ${med.stock} packs are in stock.`);
                        return;
                    }

                    // Log history
                    const history = AppStorage.get('inventory_history') || [];
                    history.push({
                        id: 'H_' + Date.now(),
                        date: new Date().toISOString(),
                        medName: med.name,
                        qty: change,
                        type: 'Stock Adjustment',
                        comment
                    });
                    AppStorage.set('inventory_history', history);

                    // Update medicine stock
                    med.stock += change;
                    AppStorage.save('medicines', med);

                    Toast.success("Inventory stock levels successfully updated.");
                    close();

                    this.renderLayout();
                    this.loadTabData();
                    this.bindEvents();

                    if (window.App) window.App.runRealtimeScanner();
                }
            }
        ]);
    }
}

// -------------------------------------------------------------
// Aegis Medicas ERP - Returns Management Module
// -------------------------------------------------------------
class ReturnsView {
    static render(container) {
        this.container = container;
        this.activeTab = 'list'; // 'list', 'customer', 'supplier'
        
        this.renderLayout();
        this.loadReturnsList();
        this.bindEvents();
    }

    static renderLayout() {
        this.container.innerHTML = `
            <div class="returns-root fade-in" style="display: flex; flex-direction: column; gap: 20px;">
                <!-- Toolbar Control card -->
                <div class="card glass-panel" style="padding: 16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                        <div class="tabs" style="margin-bottom:0; border-bottom:none;">
                            <button class="tab-btn ${this.activeTab === 'list' ? 'active' : ''}" data-tab="list">Returns Ledger</button>
                            <button class="tab-btn ${this.activeTab === 'customer' ? 'active' : ''}" data-tab="customer">Log Customer Return</button>
                            <button class="tab-btn ${this.activeTab === 'supplier' ? 'active' : ''}" data-tab="supplier">Log Supplier Return</button>
                        </div>
                    </div>
                </div>

                <!-- Main View container -->
                <div class="card glass-panel" style="padding: 24px;" id="returns-viewport">
                    <!-- Dynamic load -->
                </div>
            </div>
        `;
    }

    static loadReturnsList() {
        const viewport = document.getElementById('returns-viewport');
        if (!viewport) return;

        if (this.activeTab === 'list') {
            const returnsList = AppStorage.getAll('returns');
            viewport.innerHTML = `
                <h3 style="font-size:1.1rem; margin-bottom:12px;">Returns Transaction Logs</h3>
                <div class="table-container" style="border:none; margin-top:0;">
                    <table class="custom-table">
                        <thead>
                            <tr>
                                <th>Return Code</th>
                                <th>Return Type</th>
                                <th>Date</th>
                                <th>Medicine Item</th>
                                <th style="text-align:center;">Qty</th>
                                <th>Credit/Refund</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${returnsList.length === 0 ? '<tr><td colspan="6" class="text-muted" style="text-align:center; padding:30px;">No returns transactions logged.</td></tr>' : 
                            [...returnsList].reverse().map(r => {
                                let typeClass = 'badge-info';
                                if (r.type === 'Customer') typeClass = 'badge-success';
                                if (r.type === 'Supplier') typeClass = 'badge-warning';
                                if (r.type === 'Expired' || r.type === 'Damaged') typeClass = 'badge-danger';

                                return `
                                    <tr>
                                        <td data-label="Code" class="bold text-info">${r.returnNo}</td>
                                        <td data-label="Type"><span class="badge ${typeClass}">${r.type}</span></td>
                                        <td data-label="Date" style="font-size:0.85rem;">${Formatter.date(r.date)}</td>
                                        <td data-label="Medicine" class="bold">${r.itemName}</td>
                                        <td data-label="Qty" style="text-align:center;">${r.qty} packs</td>
                                        <td data-label="Amount" class="bold">${Formatter.currency(r.amount)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else if (this.activeTab === 'customer') {
            const invoices = AppStorage.getAll('invoices');
            viewport.innerHTML = `
                <h3 style="font-size:1.1rem; margin-bottom:12px;">Log Sales Customer Return</h3>
                <form id="customer-return-form" style="max-width:550px; display:flex; flex-direction:column; gap:16px;">
                    <div class="form-group">
                        <label for="ret-inv-select">Select Reference Invoice *</label>
                        <select id="ret-inv-select" class="input-field" required>
                            <option value="">-- Choose Invoice Code --</option>
                            ${invoices.map(inv => `<option value="${inv.id}">${inv.invoiceNo} (Customer: ${inv.customerName}, Date: ${Formatter.date(inv.date)})</option>`).join('')}
                        </select>
                    </div>

                    <!-- Items from selected invoice will load here -->
                    <div class="form-group" id="ret-inv-items-group" style="display:none;">
                        <label for="ret-med-select">Select Medicine Item *</label>
                        <select id="ret-med-select" class="input-field" required></select>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                        <div class="form-group">
                            <label for="ret-qty">Returned Quantity *</label>
                            <input type="number" id="ret-qty" class="input-field" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="ret-refund">Calculated Refund Value (₹)</label>
                            <input type="number" id="ret-refund" class="input-field" step="0.01" readonly style="background:rgba(148,163,184,0.08);">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="ret-comment">Return Reason / Comment *</label>
                        <input type="text" id="ret-comment" class="input-field" placeholder="Why is patient returning this product?" required>
                    </div>

                    <button type="submit" class="btn btn-primary" style="align-self:flex-start; height:44px; font-weight:700;">
                        🔄 Process Customer Refund Return
                    </button>
                </form>
            `;
            this.bindCustomerFormEvents();
        } else if (this.activeTab === 'supplier') {
            const suppliers = AppStorage.getAll('suppliers');
            const medicines = AppStorage.getAll('medicines');
            viewport.innerHTML = `
                <h3 style="font-size:1.1rem; margin-bottom:12px;">Log Outflow Supplier Return</h3>
                <form id="supplier-return-form" style="max-width:550px; display:flex; flex-direction:column; gap:16px;">
                    <div class="form-group">
                        <label for="ret-supp-select">Select Supplier Account *</label>
                        <select id="ret-supp-select" class="input-field" required>
                            <option value="">-- Choose Supplier corporate --</option>
                            ${suppliers.map(s => `<option value="${s.id}">${s.companyName} (Pending Dues: ${Formatter.currency(s.pendingPayments)})</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="ret-supp-med">Select Medicine to Return *</label>
                        <select id="ret-supp-med" class="input-field" required>
                            <option value="">-- Choose Medicine Item --</option>
                            ${medicines.map(m => `<option value="${m.id}" data-price="${m.purchasePrice}" data-stock="${m.stock}">${m.name} (Batch: ${m.batchNo}, Stock: ${m.stock} packs)</option>`).join('')}
                        </select>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                        <div class="form-group">
                            <label for="ret-supp-qty">Returned Quantity *</label>
                            <input type="number" id="ret-supp-qty" class="input-field" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="ret-supp-credit">Debit Settlement Offset (₹)</label>
                            <input type="number" id="ret-supp-credit" class="input-field" step="0.01" readonly style="background:rgba(148,163,184,0.08);">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="ret-supp-comment">Return Reason / Notes *</label>
                        <input type="text" id="ret-supp-comment" class="input-field" placeholder="Reason for returning stock to vendor" required>
                    </div>

                    <button type="submit" class="btn btn-primary" style="align-self:flex-start; height:44px; font-weight:700;">
                        🔄 Process Supplier Write-Off Return
                    </button>
                </form>
            `;
            this.bindSupplierFormEvents();
        }
    }

    static bindEvents() {
        // Tab toggling listeners
        this.container.querySelectorAll('.tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activeTab = btn.dataset.tab;
                this.renderLayout();
                this.loadReturnsList();
                this.bindEvents();
            });
        });
    }

    static bindCustomerFormEvents() {
        const form = document.getElementById('customer-return-form');
        const invSelect = document.getElementById('ret-inv-select');
        const medGroup = document.getElementById('ret-inv-items-group');
        const medSelect = document.getElementById('ret-med-select');
        const qtyInput = document.getElementById('ret-qty');
        const refundInput = document.getElementById('ret-refund');

        // Invoice selections change load items
        invSelect.addEventListener('change', () => {
            const invId = invSelect.value;
            if (!invId) {
                medGroup.style.display = 'none';
                return;
            }

            const inv = AppStorage.getById('invoices', invId);
            if (inv) {
                medSelect.innerHTML = `<option value="">-- Choose Item --</option>` + inv.items.map(item => `
                    <option value="${item.medicineId}" data-price="${item.price}" data-qty="${item.qty}">${item.name} (Qty sold: ${item.qty}, Price: ${item.price.toFixed(2)})</option>
                `).join('');
                medGroup.style.display = 'block';
            }
        });

        // Medicine selection calculations
        medSelect.addEventListener('change', () => {
            const opt = medSelect.options[medSelect.selectedIndex];
            if (opt && opt.value) {
                qtyInput.max = opt.dataset.qty;
                qtyInput.value = 1;
                refundInput.value = parseFloat(opt.dataset.price).toFixed(2);
            }
        });

        qtyInput.addEventListener('input', () => {
            const opt = medSelect.options[medSelect.selectedIndex];
            if (opt && opt.value) {
                const qty = parseInt(qtyInput.value) || 0;
                const price = parseFloat(opt.dataset.price);
                refundInput.value = (qty * price).toFixed(2);
            }
        });

        // Submit return
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const invId = invSelect.value;
            const medId = medSelect.value;
            const qty = parseInt(qtyInput.value);
            const refund = parseFloat(refundInput.value);
            const comment = document.getElementById('ret-comment').value.trim();

            const inv = AppStorage.getById('invoices', invId);
            const med = AppStorage.getById('medicines', medId);
            const item = inv.items.find(i => i.medicineId === medId);

            if (qty > item.qty) {
                Toast.error(`Cannot return quantity greater than sold in bill (${item.qty} packs).`);
                return;
            }

            // 1. Process Stock Restoration
            if (med) {
                med.stock += qty;
                AppStorage.save('medicines', med);
            }

            // 2. Add log to inventory history
            const history = AppStorage.get('inventory_history') || [];
            history.push({
                id: 'H_' + Date.now(),
                date: new Date().toISOString(),
                medName: item.name,
                qty: qty,
                type: 'Customer Return',
                comment: `Restored: returned from patient under invoice: ${inv.invoiceNo}`
            });
            AppStorage.set('inventory_history', history);

            // 3. Save Return registry
            const returnNo = 'RET-C-' + Math.floor(Math.random()*9000 + 1000);
            AppStorage.save('returns', {
                returnNo,
                date: new Date().toISOString().split('T')[0],
                type: 'Customer',
                itemId: medId,
                itemName: item.name,
                qty,
                amount: refund
            });

            // 4. Record as negative expense (refund outflow)
            AppStorage.save('expenses', {
                date: new Date().toISOString().split('T')[0],
                category: 'Returns Refund',
                description: `Patient cash refund processed for return ${returnNo}`,
                amount: refund
            });

            Toast.success(`Return processed successfully! Refund of ${Formatter.currency(refund)} confirmed.`);
            this.activeTab = 'list';
            this.renderLayout();
            this.loadReturnsList();
            this.bindEvents();

            if (window.App) window.App.runRealtimeScanner();
        });
    }

    static bindSupplierFormEvents() {
        const form = document.getElementById('supplier-return-form');
        const suppSelect = document.getElementById('ret-supp-select');
        const medSelect = document.getElementById('ret-supp-med');
        const qtyInput = document.getElementById('ret-supp-qty');
        const creditInput = document.getElementById('ret-supp-credit');

        // Price auto fill calculations
        medSelect.addEventListener('change', () => {
            const opt = medSelect.options[medSelect.selectedIndex];
            if (opt && opt.value) {
                qtyInput.max = opt.dataset.stock;
                qtyInput.value = Math.min(parseInt(opt.dataset.stock), 10);
                creditInput.value = (qtyInput.value * parseFloat(opt.dataset.price)).toFixed(2);
            }
        });

        qtyInput.addEventListener('input', () => {
            const opt = medSelect.options[medSelect.selectedIndex];
            if (opt && opt.value) {
                const qty = parseInt(qtyInput.value) || 0;
                const price = parseFloat(opt.dataset.price);
                creditInput.value = (qty * price).toFixed(2);
            }
        });

        // Submit
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const suppId = suppSelect.value;
            const medId = medSelect.value;
            const qty = parseInt(qtyInput.value);
            const creditVal = parseFloat(creditInput.value);
            const comment = document.getElementById('ret-supp-comment').value.trim();

            const supplier = AppStorage.getById('suppliers', suppId);
            const med = AppStorage.getById('medicines', medId);

            if (qty > med.stock) {
                Toast.error(`Cannot return quantity greater than currently in stock (${med.stock} packs).`);
                return;
            }

            // 1. Deduct Stock level
            med.stock -= qty;
            AppStorage.save('medicines', med);

            // 2. Adjust supplier liability dues
            if (supplier.pendingPayments >= creditVal) {
                supplier.pendingPayments -= creditVal;
            } else {
                supplier.pendingPayments = 0;
            }
            AppStorage.save('suppliers', supplier);

            // 3. Log history
            const history = AppStorage.get('inventory_history') || [];
            history.push({
                id: 'H_' + Date.now(),
                date: new Date().toISOString(),
                medName: med.name,
                qty: -qty,
                type: 'Supplier Return',
                comment: `Outflow: returned stock to supplier ${supplier.companyName}. Reason: ${comment}`
            });
            AppStorage.set('inventory_history', history);

            // 4. Save return registry
            const returnNo = 'RET-S-' + Math.floor(Math.random()*9000 + 1000);
            AppStorage.save('returns', {
                returnNo,
                date: new Date().toISOString().split('T')[0],
                type: 'Supplier',
                itemId: medId,
                itemName: med.name,
                qty,
                amount: creditVal
            });

            Toast.success(`Supplier return processed successfully! Pending payment reduced by ${Formatter.currency(creditVal)}.`);
            this.activeTab = 'list';
            this.renderLayout();
            this.loadReturnsList();
            this.bindEvents();

            if (window.App) window.App.runRealtimeScanner();
        });
    }
}

window.ReturnsView = ReturnsView;


window.InventoryView = InventoryView;
