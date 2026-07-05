/**
 * Aegis Medicas ERP - Medicine Management Controller
 * Handles Medicine list views, pagination, sorting, CRUD forms, and detailed drawers.
 */

class MedicineView {
    static render(container) {
        this.container = container;
        this.currentPage = 1;
        this.pageSize = 5; // Rows per page
        this.searchQuery = '';
        this.categoryFilter = '';
        this.sortField = 'name';
        this.sortOrder = 'asc'; // 'asc' or 'desc'

        this.renderLayout();
        this.loadTableData();
        this.bindEvents();
    }

    static renderLayout() {
        // Collect all categories for filter dropdown
        const medicines = AppStorage.getAll('medicines');
        const categories = [...new Set(medicines.map(m => m.category || 'General'))];

        this.container.innerHTML = `
            <div class="medicine-root fade-in" style="display: flex; flex-direction: column; gap: 20px;">
                <!-- Filter & Controls Bar -->
                <div class="card glass-panel" style="padding: 16px;">
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 12px; align-items: center;">
                        <!-- Search Box -->
                        <div class="input-icon-wrapper">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <input type="text" id="med-search" class="input-field" placeholder="Search by name, brand, barcode or rack..." value="${this.searchQuery}">
                        </div>

                        <!-- Category Filter -->
                        <select id="med-category-filter" class="input-field">
                            <option value="">All Categories</option>
                            ${categories.map(cat => `<option value="${cat}" ${this.categoryFilter === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                        </select>

                        <!-- Sort Order -->
                        <select id="med-sort" class="input-field">
                            <option value="name_asc" ${this.sortField === 'name' && this.sortOrder === 'asc' ? 'selected' : ''}>Sort: Alphabetical (A-Z)</option>
                            <option value="name_desc" ${this.sortField === 'name' && this.sortOrder === 'desc' ? 'selected' : ''}>Sort: Alphabetical (Z-A)</option>
                            <option value="stock_asc" ${this.sortField === 'stock' && this.sortOrder === 'asc' ? 'selected' : ''}>Sort: Stock (Low to High)</option>
                            <option value="stock_desc" ${this.sortField === 'stock' && this.sortOrder === 'desc' ? 'selected' : ''}>Sort: Stock (High to Low)</option>
                            <option value="expiry_asc" ${this.sortField === 'expiryDate' && this.sortOrder === 'asc' ? 'selected' : ''}>Sort: Expiry (Soonest first)</option>
                            <option value="mrp_desc" ${this.sortField === 'mrp' && this.sortOrder === 'desc' ? 'selected' : ''}>Sort: Price (MRP High to Low)</option>
                        </select>

                        <!-- Add Button -->
                        <button class="btn btn-primary" id="btn-add-medicine">
                            ➕ Add Medicine
                        </button>
                    </div>
                </div>

                <!-- Medicine Table Card -->
                <div class="card glass-panel" style="padding: 20px;">
                    <div class="table-container">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Medicine Name</th>
                                    <th>Brand / Category</th>
                                    <th>Rack</th>
                                    <th>Stock</th>
                                    <th>Sell Price</th>
                                    <th>Expiry Date</th>
                                    <th style="text-align: center;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="med-table-body">
                                <!-- Dynamic Rows -->
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination Controls -->
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px; flex-wrap: wrap; gap: 12px;">
                        <span class="text-muted" id="med-pagination-info" style="font-size:0.9rem;">Showing 0 to 0 of 0 entries</span>
                        <div style="display: flex; gap: 8px;" id="med-pagination-controls">
                            <!-- Prev / Next buttons -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static loadTableData() {
        let medicines = AppStorage.getAll('medicines');
        const today = new Date();

        // 1. Search Query Filter
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            medicines = medicines.filter(m => 
                m.name.toLowerCase().includes(q) ||
                (m.genericName || '').toLowerCase().includes(q) ||
                m.brand.toLowerCase().includes(q) ||
                (m.barcode || '').includes(q) ||
                (m.rackNo || '').toLowerCase().includes(q)
            );
        }

        // 2. Category Filter
        if (this.categoryFilter) {
            medicines = medicines.filter(m => m.category === this.categoryFilter);
        }

        // 3. Sorting
        medicines.sort((a, b) => {
            let valA = a[this.sortField];
            let valB = b[this.sortField];

            // Expiry Date sorting specific check
            if (this.sortField === 'expiryDate') {
                valA = valA ? new Date(valA) : new Date(2099, 11, 31);
                valB = valB ? new Date(valB) : new Date(2099, 11, 31);
            }

            if (typeof valA === 'string') {
                return this.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else {
                return this.sortOrder === 'asc' ? valA - valB : valB - valA;
            }
        });

        // 4. Pagination math
        const totalEntries = medicines.length;
        const totalPages = Math.ceil(totalEntries / this.pageSize) || 1;
        
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, totalEntries);
        const paginatedMedicines = medicines.slice(startIndex, startIndex + this.pageSize);

        // Update info text
        document.getElementById('med-pagination-info').textContent = 
            `Showing ${totalEntries === 0 ? 0 : startIndex + 1} to ${endIndex} of ${totalEntries} medicines`;

        // Render Table Rows
        const tbody = document.getElementById('med-table-body');
        if (paginatedMedicines.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 30px;">No matching medicines in register database.</td></tr>`;
        } else {
            tbody.innerHTML = paginatedMedicines.map(m => {
                // Stock color checks
                let stockPill = `<span class="badge badge-success">${m.stock} packs</span>`;
                if (m.stock <= 0) {
                    stockPill = `<span class="badge badge-danger">Out of Stock</span>`;
                } else if (m.stock <= (m.minStock || 15)) {
                    stockPill = `<span class="badge badge-warning">Low: ${m.stock}</span>`;
                }

                // Expiry colors checks
                let expiryText = Formatter.date(m.expiryDate);
                let expiryPill = `<span>${expiryText}</span>`;
                if (m.expiryDate) {
                    const exp = new Date(m.expiryDate);
                    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                    if (diff <= 0) {
                        expiryPill = `<span class="badge badge-danger">Expired (${expiryText})</span>`;
                    } else if (diff <= 30) {
                        expiryPill = `<span class="badge badge-warning">Near Expiry (${diff}d)</span>`;
                    }
                }

                return `
                    <tr style="vertical-align: middle;">
                        <td data-label="Medicine Name">
                            <div style="display:flex; flex-direction:column;">
                                <span class="bold text-primary">${m.name}</span>
                                <span class="text-muted" style="font-size:0.78rem; font-style:italic;">${m.genericName || '-'}</span>
                            </div>
                        </td>
                        <td data-label="Brand / Category">
                            <div style="display:flex; flex-direction:column;">
                                <span>${m.brand}</span>
                                <span class="text-muted" style="font-size:0.8rem;">${m.category}</span>
                            </div>
                        </td>
                        <td data-label="Rack"><span class="bold" style="color:var(--info);">${m.rackNo || '-'}</span></td>
                        <td data-label="Stock">${stockPill}</td>
                        <td data-label="Sell Price" class="bold">${Formatter.currency(m.sellingPrice)}</td>
                        <td data-label="Expiry Date">${expiryPill}</td>
                        <td data-label="Actions">
                            <div style="display:flex; justify-content:center; gap:8px;">
                                <button class="btn btn-secondary btn-icon-only action-view" data-id="${m.id}" title="View Details">👁️</button>
                                <button class="btn btn-secondary btn-icon-only action-edit" data-id="${m.id}" title="Edit Medicine">✏️</button>
                                <button class="btn btn-danger btn-icon-only action-delete" data-id="${m.id}" title="Delete Medicine">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Render Pagination buttons
        const paginationControls = document.getElementById('med-pagination-controls');
        paginationControls.innerHTML = `
            <button class="btn btn-secondary ${this.currentPage === 1 ? 'disabled' : ''}" id="med-btn-prev" ${this.currentPage === 1 ? 'disabled' : ''}>&larr; Prev</button>
            ${Array.from({ length: totalPages }, (_, i) => i + 1).map(page => 
                `<button class="btn ${page === this.currentPage ? 'btn-primary' : 'btn-secondary'}" data-page="${page}">${page}</button>`
            ).join('')}
            <button class="btn btn-secondary ${this.currentPage === totalPages ? 'disabled' : ''}" id="med-btn-next" ${this.currentPage === totalPages ? 'disabled' : ''}>Next &rarr;</button>
        `;
    }

    static bindEvents() {
        // Search & Filters inputs
        document.getElementById('med-search').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.currentPage = 1;
            this.loadTableData();
        });

        document.getElementById('med-category-filter').addEventListener('change', (e) => {
            this.categoryFilter = e.target.value;
            this.currentPage = 1;
            this.loadTableData();
        });

        document.getElementById('med-sort').addEventListener('change', (e) => {
            const [field, order] = e.target.value.split('_');
            this.sortField = field;
            this.sortOrder = order;
            this.loadTableData();
        });

        // Add Medicine click
        document.getElementById('btn-add-medicine').addEventListener('click', () => {
            this.openMedicineFormModal();
        });

        // Table actions delegation
        document.getElementById('med-table-body').addEventListener('click', async (e) => {
            const target = e.target;
            const btn = target.closest('button');
            if (!btn) return;

            const id = btn.dataset.id;
            if (btn.classList.contains('action-view')) {
                this.viewMedicineDetails(id);
            } else if (btn.classList.contains('action-edit')) {
                this.openMedicineFormModal(id);
            } else if (btn.classList.contains('action-delete')) {
                const med = AppStorage.getById('medicines', id);
                const deleteConfirm = await Dialog.confirm({
                    title: 'Remove Medicine Record',
                    message: `Are you sure you want to completely delete "${med.name}" from registry database?`,
                    confirmText: 'Delete Record',
                    cancelText: 'Cancel',
                    type: 'danger'
                });
                if (deleteConfirm) {
                    AppStorage.delete('medicines', id);
                    Toast.success("Medicine deleted successfully!");
                    this.loadTableData();
                    if (window.App) window.App.runRealtimeScanner(); // update alerts
                }
            }
        });

        // Pagination clicks delegation
        document.getElementById('med-pagination-controls').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            if (btn.id === 'med-btn-prev') {
                this.currentPage--;
            } else if (btn.id === 'med-btn-next') {
                this.currentPage++;
            } else if (btn.dataset.page) {
                this.currentPage = parseInt(btn.dataset.page);
            }
            this.loadTableData();
        });
    }

    static openMedicineFormModal(id = null) {
        const isEdit = !!id;
        const med = isEdit ? AppStorage.getById('medicines', id) : {
            name: '', genericName: '', brand: '', manufacturer: '', category: 'Analgesics',
            batchNo: '', barcode: '', rackNo: '', purchasePrice: '', sellingPrice: '',
            mrp: '', gst: 12, stock: 0, minStock: 15, maxStock: 500,
            expiryDate: '', manufacturingDate: '', description: ''
        };

        const categories = ["Analgesics", "Antibiotics", "Cardiovascular", "Antidiabetics", "Antihistamines", "Gastrointestinal", "Supplements", "Respiratory", "Dermatology", "General"];

        const formContent = `
            <form id="medicine-form" style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group" style="grid-column: span 2;">
                    <label for="m-name">Medicine Name *</label>
                    <input type="text" id="m-name" class="input-field" value="${med.name}" placeholder="e.g. Paracetamol 650mg" required>
                </div>
                <div class="form-group">
                    <label for="m-generic">Generic Composition Name</label>
                    <input type="text" id="m-generic" class="input-field" value="${med.genericName || ''}" placeholder="e.g. Paracetamol / Acetaminophen">
                </div>
                <div class="form-group">
                    <label for="m-brand">Brand Name *</label>
                    <input type="text" id="m-brand" class="input-field" value="${med.brand}" placeholder="e.g. Dolo 650" required>
                </div>
                <div class="form-group">
                    <label for="m-manufacturer">Manufacturer *</label>
                    <input type="text" id="m-manufacturer" class="input-field" value="${med.manufacturer}" placeholder="e.g. Micro Labs Ltd" required>
                </div>
                <div class="form-group">
                    <label for="m-category">Category Type *</label>
                    <select id="m-category" class="input-field">
                        ${categories.map(cat => `<option value="${cat}" ${med.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="m-batch">Batch Number *</label>
                    <input type="text" id="m-batch" class="input-field" value="${med.batchNo}" placeholder="e.g. DL8921" required>
                </div>
                <div class="form-group">
                    <label for="m-barcode">Barcode ID (for POS Simulator)</label>
                    <input type="text" id="m-barcode" class="input-field" value="${med.barcode || ''}" placeholder="e.g. 890100100101">
                </div>
                <div class="form-group">
                    <label for="m-rack">Rack Shelf Allocation</label>
                    <input type="text" id="m-rack" class="input-field" value="${med.rackNo || ''}" placeholder="e.g. A-12">
                </div>
                <div class="form-group">
                    <label for="m-purchase">Purchase Price (₹) *</label>
                    <input type="number" id="m-purchase" class="input-field" value="${med.purchasePrice}" step="0.01" min="0" placeholder="0.00" required>
                </div>
                <div class="form-group">
                    <label for="m-selling">Selling Price (excl. Tax) (₹) *</label>
                    <input type="number" id="m-selling" class="input-field" value="${med.sellingPrice}" step="0.01" min="0" placeholder="0.00" required>
                </div>
                <div class="form-group">
                    <label for="m-mrp">Maximum Retail Price (MRP) (₹) *</label>
                    <input type="number" id="m-mrp" class="input-field" value="${med.mrp}" step="0.01" min="0" placeholder="0.00" required>
                </div>
                <div class="form-group">
                    <label for="m-gst">GST Tax Slab (%)</label>
                    <select id="m-gst" class="input-field">
                        <option value="0" ${med.gst === 0 ? 'selected' : ''}>0% Tax Free</option>
                        <option value="5" ${med.gst === 5 ? 'selected' : ''}>5% GST</option>
                        <option value="12" ${med.gst === 12 ? 'selected' : ''}>12% GST</option>
                        <option value="18" ${med.gst === 18 ? 'selected' : ''}>18% GST</option>
                        <option value="28" ${med.gst === 28 ? 'selected' : ''}>28% GST</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="m-stock">Opening Stock Count *</label>
                    <input type="number" id="m-stock" class="input-field" value="${med.stock}" min="0" required>
                </div>
                <div class="form-group">
                    <label for="m-min">Minimum Threshold Alert *</label>
                    <input type="number" id="m-min" class="input-field" value="${med.minStock}" min="1" required>
                </div>
                <div class="form-group">
                    <label for="m-max">Maximum Threshold Storage</label>
                    <input type="number" id="m-max" class="input-field" value="${med.maxStock}" min="1">
                </div>
                <div class="form-group">
                    <label for="m-mfg">Manufacturing Date</label>
                    <input type="date" id="m-mfg" class="input-field" value="${med.manufacturingDate || ''}">
                </div>
                <div class="form-group">
                    <label for="m-expiry">Expiry Date *</label>
                    <input type="date" id="m-expiry" class="input-field" value="${med.expiryDate}" required>
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <label for="m-desc">Description Notes</label>
                    <textarea id="m-desc" class="input-field" rows="2" placeholder="Describe precautions, dosages, etc...">${med.description || ''}</textarea>
                </div>
            </form>
        `;

        Dialog.showCustomModal(
            'medicine-form-modal',
            isEdit ? 'Update Medicine Register' : 'Register New Medicine',
            formContent,
            [
                { text: 'Cancel', class: 'btn-secondary' },
                {
                    text: isEdit ? 'Update Details' : 'Register Medicine',
                    class: 'btn-primary',
                    click: (close, overlay) => {
                        const form = overlay.querySelector('#medicine-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        // Collect values
                        const updatedItem = {
                            ...med,
                            name: overlay.querySelector('#m-name').value.trim(),
                            genericName: overlay.querySelector('#m-generic').value.trim(),
                            brand: overlay.querySelector('#m-brand').value.trim(),
                            manufacturer: overlay.querySelector('#m-manufacturer').value.trim(),
                            category: overlay.querySelector('#m-category').value,
                            batchNo: overlay.querySelector('#m-batch').value.trim(),
                            barcode: overlay.querySelector('#m-barcode').value.trim(),
                            rackNo: overlay.querySelector('#m-rack').value.trim(),
                            purchasePrice: parseFloat(overlay.querySelector('#m-purchase').value),
                            sellingPrice: parseFloat(overlay.querySelector('#m-selling').value),
                            mrp: parseFloat(overlay.querySelector('#m-mrp').value),
                            gst: parseInt(overlay.querySelector('#m-gst').value),
                            stock: parseInt(overlay.querySelector('#m-stock').value),
                            minStock: parseInt(overlay.querySelector('#m-min').value),
                            maxStock: parseInt(overlay.querySelector('#m-max').value) || 500,
                            manufacturingDate: overlay.querySelector('#m-mfg').value,
                            expiryDate: overlay.querySelector('#m-expiry').value,
                            description: overlay.querySelector('#m-desc').value.trim()
                        };

                        AppStorage.save('medicines', updatedItem);
                        Toast.success(isEdit ? "Medicine details updated!" : "New medicine registered successfully!");
                        close();
                        this.renderLayout();
                        this.loadTableData();
                        this.bindEvents();

                        if (window.App) window.App.runRealtimeScanner(); // update alert indicators
                    }
                }
            ]
        );
    }

    static viewMedicineDetails(id) {
        const med = AppStorage.getById('medicines', id);
        const detailsHtml = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:0.95rem;">
                <div style="grid-column: span 2; border-bottom:1px solid var(--glass-border); padding-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <h3 class="text-primary">${med.name}</h3>
                    <span class="badge badge-info">${med.category}</span>
                </div>
                <div><strong>Generic Name:</strong> ${med.genericName || '-'}</div>
                <div><strong>Brand Name:</strong> ${med.brand}</div>
                <div><strong>Manufacturer:</strong> ${med.manufacturer}</div>
                <div><strong>Batch Number:</strong> ${med.batchNo}</div>
                <div><strong>Barcode ID:</strong> ${med.barcode || 'N/A'}</div>
                <div><strong>Rack Position:</strong> ${med.rackNo || 'Not Allocated'}</div>
                <div><strong>Purchase Price:</strong> ${Formatter.currency(med.purchasePrice)}</div>
                <div><strong>Selling Price:</strong> ${Formatter.currency(med.sellingPrice)} (excluding GST)</div>
                <div><strong>Maximum Retail Price:</strong> ${Formatter.currency(med.mrp)} (incl. ${med.gst}% GST)</div>
                <div><strong>Current Stock:</strong> <span class="bold ${med.stock <= med.minStock ? 'text-danger' : 'text-success'}">${med.stock} packs</span></div>
                <div><strong>Minimum/Maximum Limits:</strong> Min: ${med.minStock} / Max: ${med.maxStock}</div>
                <div><strong>Mfg. Date:</strong> ${Formatter.date(med.manufacturingDate)}</div>
                <div><strong>Expiry Date:</strong> <span class="bold">${Formatter.date(med.expiryDate)}</span></div>
                <div style="grid-column: span 2; margin-top:10px;">
                    <strong>Description Notes:</strong>
                    <p style="background:rgba(148, 163, 184, 0.05); padding:10px; border-radius:var(--radius-sm); border:1px solid var(--glass-border); margin-top:5px; font-size:0.88rem; line-height:1.4;">
                        ${med.description || 'No description notes available.'}
                    </p>
                </div>
            </div>
        `;

        Dialog.showCustomModal(
            'medicine-detail-modal',
            'Medicine Detailed File',
            detailsHtml,
            [{ text: 'Dismiss', class: 'btn-secondary' }]
        );
    }
}

window.MedicineView = MedicineView;
