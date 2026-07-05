/**
 * Aegis Medicas ERP - Purchase Order & Stock Inflow Management
 * Handles purchase order assemblies, order line items, supplier liability accruals,
 * and automated stock receiving audit logs.
 */

class PurchaseView {
    static render(container) {
        this.container = container;
        this.renderLayout();
        this.loadPurchasesData();
        this.bindEvents();
    }

    static renderLayout() {
        this.container.innerHTML = `
            <div class="purchase-root fade-in" style="display:flex; flex-direction:column; gap:20px;">
                <!-- Filter control bar -->
                <div class="card glass-panel" style="padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                        <h3 style="font-size:1.15rem;">Purchase Orders Log Ledger</h3>
                        <button class="btn btn-primary" id="btn-create-po">
                            📝 Create Purchase Order
                        </button>
                    </div>
                </div>

                <!-- Purchase Orders Table card -->
                <div class="card glass-panel" style="padding:20px;">
                    <div class="table-container">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>PO Number</th>
                                    <th>Supplier Partner</th>
                                    <th>Order Date</th>
                                    <th>Grand Total</th>
                                    <th>Status</th>
                                    <th style="text-align: center;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="po-table-body">
                                <!-- Dynamic rows -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    static loadPurchasesData() {
        const purchases = AppStorage.getAll('purchases');
        const tbody = document.getElementById('po-table-body');

        if (purchases.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center; padding:30px;">No purchase orders found in logs.</td></tr>`;
            return;
        }

        // Sort by date descending
        const sorted = [...purchases].sort((a,b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = sorted.map(po => {
            const statusClass = po.status === 'Received' ? 'badge-success' : 'badge-warning';
            return `
                <tr>
                    <td data-label="PO Number" class="bold text-info">${po.poNo}</td>
                    <td data-label="Supplier">${po.supplierName}</td>
                    <td data-label="Order Date" style="font-size:0.85rem;">${Formatter.date(po.date)}</td>
                    <td data-label="Grand Total" class="bold">${Formatter.currency(po.grandTotal)}</td>
                    <td data-label="Status"><span class="badge ${statusClass}">${po.status}</span></td>
                    <td data-label="Actions">
                        <div style="display:flex; justify-content:center; gap:8px;">
                            <button class="btn btn-secondary btn-icon-only action-po-view" data-id="${po.id}" title="View Order Details">👁️</button>
                            ${po.status === 'Pending' ? `
                                <button class="btn btn-success action-po-receive" data-id="${po.id}" style="padding: 6px 12px; font-size: 0.8rem;">
                                    📥 Receive Stock
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    static bindEvents() {
        // Create PO Click
        document.getElementById('btn-create-po').addEventListener('click', () => {
            this.openCreatePOModal();
        });

        // Table actions delegation
        document.getElementById('po-table-body').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const id = btn.dataset.id;
            if (btn.classList.contains('action-po-view')) {
                const po = AppStorage.getById('purchases', id);
                if (po) this.openPODetailsModal(po);
            } else if (btn.classList.contains('action-po-receive')) {
                this.receivePOStock(id);
            }
        });
    }

    static openCreatePOModal() {
        const suppliers = AppStorage.getAll('suppliers');
        const medicines = AppStorage.getAll('medicines');

        if (suppliers.length === 0) {
            Toast.error("Register a supplier account first before building purchase orders.");
            return;
        }

        // We build a dynamic line item creator inside custom modal
        const formContent = `
            <div style="display:flex; flex-direction:column; gap:16px;">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                    <div class="form-group">
                        <label for="po-supp-select">Select Supplier *</label>
                        <select id="po-supp-select" class="input-field">
                            ${suppliers.map(s => `<option value="${s.id}">${s.companyName}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="po-date-input">Order Date *</label>
                        <input type="date" id="po-date-input" class="input-field" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                </div>

                <div class="card glass-panel" style="padding:14px; background:rgba(148, 163, 184, 0.03); border-style:dashed;">
                    <h4 style="font-size:0.95rem; margin-bottom:8px;">Add Line Order Item</h4>
                    <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap:10px; align-items:center;">
                        <select id="po-item-med" class="input-field">
                            ${medicines.map(m => `<option value="${m.id}" data-price="${m.purchasePrice}">${m.name} (Batch: ${m.batchNo})</option>`).join('')}
                        </select>
                        <input type="number" id="po-item-qty" class="input-field" placeholder="Qty packs" min="1" value="10">
                        <input type="number" id="po-item-price" class="input-field" placeholder="Unit cost" step="0.01" min="0">
                        <button class="btn btn-primary" id="btn-po-add-line" style="padding: 11px;">➕ Add</button>
                    </div>
                </div>

                <!-- PO Items list table -->
                <div style="max-height:180px; overflow-y:auto; border:1px solid var(--glass-border); border-radius:8px;">
                    <table class="custom-table" style="font-size:0.85rem;">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Unit Cost</th>
                                <th>Total</th>
                                <th>Rem</th>
                            </tr>
                        </thead>
                        <tbody id="po-lines-body">
                            <tr><td colspan="5" class="text-muted" style="text-align:center; padding:15px;">No lines added yet.</td></tr>
                        </tbody>
                    </table>
                </div>

                <div style="text-align:right; font-size:1.15rem; font-weight:800; border-top:1px dashed var(--glass-border); padding-top:10px;">
                    Estimated Grand Total: <span class="text-primary" id="po-estimated-total">₹0.00</span>
                </div>
            </div>
        `;

        const modal = Dialog.showCustomModal('create-po-modal', 'Draft Corporate Purchase Order', formContent, [
            { text: 'Discard Draft', class: 'btn-secondary' },
            {
                text: 'Publish Purchase Order',
                class: 'btn-primary',
                click: (close) => {
                    if (this.tempPOLines.length === 0) {
                        Toast.error("Cannot publish PO with empty items list.");
                        return;
                    }

                    const supplierId = modal.querySelector('#po-supp-select').value;
                    const supplier = suppliers.find(s => s.id === supplierId);
                    const date = modal.querySelector('#po-date-input').value;

                    const purchases = AppStorage.getAll('purchases');
                    const poNo = 'PO-' + new Date().getFullYear() + '-' + String(purchases.length + 1).padStart(4, '0');

                    const newPO = {
                        id: 'PO_' + Date.now(),
                        poNo,
                        date,
                        supplierId,
                        supplierName: supplier ? supplier.companyName : 'Supplier',
                        items: this.tempPOLines,
                        grandTotal: this.tempPOTotal,
                        status: 'Pending'
                    };

                    AppStorage.save('purchases', newPO);
                    Toast.success(`Purchase Order ${poNo} drafted and published!`);
                    close();
                    this.loadPurchasesData();
                }
            }
        ]);

        // State variables for PO builder
        this.tempPOLines = [];
        this.tempPOTotal = 0;

        const medSelect = modal.querySelector('#po-item-med');
        const priceInput = modal.querySelector('#po-item-price');
        
        // Auto fill price on select change
        const updatePrice = () => {
            const opt = medSelect.options[medSelect.selectedIndex];
            if (opt) {
                priceInput.value = parseFloat(opt.dataset.price).toFixed(2);
            }
        };
        updatePrice();
        medSelect.addEventListener('change', updatePrice);

        // Add line click
        modal.querySelector('#btn-po-add-line').addEventListener('click', () => {
            const medId = medSelect.value;
            const medOpt = medSelect.options[medSelect.selectedIndex];
            const qty = parseInt(modal.querySelector('#po-item-qty').value) || 0;
            const price = parseFloat(priceInput.value) || 0;

            if (qty <= 0 || price < 0) {
                Toast.error("Provide valid quantity counts and cost prices.");
                return;
            }

            const med = medicines.find(m => m.id === medId);
            if (!med) return;

            // Check if already in lines
            const existingIdx = this.tempPOLines.findIndex(l => l.medicineId === medId);
            if (existingIdx !== -1) {
                this.tempPOLines[existingIdx].qty += qty;
                this.tempPOLines[existingIdx].total = this.tempPOLines[existingIdx].qty * price;
            } else {
                this.tempPOLines.push({
                    medicineId: medId,
                    name: med.name,
                    qty,
                    purchasePrice: price,
                    total: qty * price
                });
            }

            this.renderPOLines(modal);
        });

        // Delete line delegation
        modal.querySelector('#po-lines-body').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-po-line')) {
                const idx = parseInt(e.target.dataset.index);
                this.tempPOLines.splice(idx, 1);
                this.renderPOLines(modal);
            }
        });
    }

    static renderPOLines(modal) {
        const tbody = modal.querySelector('#po-lines-body');
        const totalTxt = modal.querySelector('#po-estimated-total');

        if (this.tempPOLines.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center; padding:15px;">No lines added yet.</td></tr>`;
            totalTxt.textContent = '₹0.00';
            this.tempPOTotal = 0;
            return;
        }

        tbody.innerHTML = this.tempPOLines.map((l, index) => `
            <tr>
                <td class="bold">${l.name}</td>
                <td>${l.qty}</td>
                <td>${Formatter.currency(l.purchasePrice)}</td>
                <td class="bold">${Formatter.currency(l.total)}</td>
                <td><button class="remove-po-line" data-index="${index}" style="color:var(--danger); font-size:1.1rem; font-weight:bold;">&times;</button></td>
            </tr>
        `).join('');

        this.tempPOTotal = this.tempPOLines.reduce((sum, l) => sum + l.total, 0);
        totalTxt.textContent = Formatter.currency(this.tempPOTotal);
    }

    static openPODetailsModal(po) {
        const detailHtml = `
            <div style="display:flex; flex-direction:column; gap:16px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.9rem; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">
                    <div>
                        <strong>PO Number Code:</strong> ${po.poNo}<br>
                        <strong>Order Date:</strong> ${Formatter.date(po.date)}
                    </div>
                    <div style="text-align:right;">
                        <strong>Supplier Partner:</strong> ${po.supplierName}<br>
                        <strong>PO Status:</strong> <span class="badge ${po.status === 'Received' ? 'badge-success' : 'badge-warning'}">${po.status}</span>
                    </div>
                </div>

                <div class="table-container" style="border:none; margin-top:0;">
                    <table class="custom-table" style="font-size:0.85rem;">
                        <thead>
                            <tr>
                                <th>Item Description</th>
                                <th style="text-align:center;">Quantity Order</th>
                                <th style="text-align:right;">Unit cost (₹)</th>
                                <th style="text-align:right;">Line Total Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${po.items.map(i => `
                                <tr>
                                    <td class="bold">${i.name}</td>
                                    <td style="text-align:center;">${i.qty} packs</td>
                                    <td style="text-align:right;">${i.purchasePrice.toFixed(2)}</td>
                                    <td style="text-align:right;" class="bold">${Formatter.currency(i.total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="text-align:right; font-size:1.2rem; font-weight:800; border-top:1px dashed var(--glass-border); padding-top:10px;">
                    Grand Total Cost: <span class="text-primary">${Formatter.currency(po.grandTotal)}</span>
                </div>
            </div>
        `;

        Dialog.showCustomModal('po-detail-modal', `Purchase Order Details: ${po.poNo}`, detailHtml, [
            { text: 'Dismiss', class: 'btn-secondary' }
        ]);
    }

    static async receivePOStock(id) {
        const po = AppStorage.getById('purchases', id);
        if (!po || po.status === 'Received') return;

        const confirmReceive = await Dialog.confirm({
            title: 'Verify & Receive Stock Inventory',
            message: `Verify physical receipt of medicines in Purchase Order ${po.poNo}? This will increase stock counts and credit supplier pending payments.`,
            confirmText: 'Verify & Receive',
            cancelText: 'Cancel',
            type: 'warning'
        });

        if (confirmReceive) {
            const medicines = AppStorage.getAll('medicines');
            const history = AppStorage.get('inventory_history') || [];

            // 1. Update medicine stocks
            po.items.forEach(item => {
                const med = medicines.find(m => m.id === item.medicineId);
                if (med) {
                    med.stock += item.qty;
                    AppStorage.save('medicines', med);

                    // Add inflow audit trail
                    history.push({
                        id: 'H_' + Math.random().toString(36).substr(2, 9),
                        date: new Date().toISOString(),
                        medName: med.name,
                        qty: item.qty,
                        type: 'Purchase Inflow',
                        comment: `Inflow stock received from PO: ${po.poNo}.`
                    });
                }
            });
            AppStorage.set('inventory_history', history);

            // 2. Add PO value to Supplier outstanding pendingPayments dues
            const suppliers = AppStorage.getAll('suppliers');
            const supp = suppliers.find(s => s.id === po.supplierId);
            if (supp) {
                supp.pendingPayments += po.grandTotal;
                AppStorage.save('suppliers', supp);
            }

            // 3. Mark PO as Received
            po.status = 'Received';
            AppStorage.save('purchases', po);

            Toast.success(`Purchase Order ${po.poNo} items successfully received into inventory!`);
            this.loadPurchasesData();

            // Refresh header notifications
            if (window.App) window.App.runRealtimeScanner();
        }
    }
}

window.PurchaseView = PurchaseView;
