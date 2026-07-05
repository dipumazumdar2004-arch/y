/**
 * Aegis Medicas ERP - Settings & Employee Configurations Controller
 * Handles business settings, invoice customizers, JSON backup import/export,
 * and employee credentials management.
 */

// =============================================================
// 1. Settings Controller
// =============================================================
class SettingsView {
    static render(container) {
        this.container = container;
        this.renderLayout();
        this.bindEvents();
    }

    static renderLayout() {
        const settings = AppStorage.get('settings') || {
            companyName: 'Aegis Medicas Pharmacy',
            companyAddress: 'Grid Tech Park, Block-C, Bangalore',
            companyPhone: '+91 80 4912 8000',
            companyGst: '29AAAAA1111A1Z1',
            invoiceFooter: 'Thank you for choosing Aegis Medicas!',
            currency: '₹',
            lowStockThreshold: 15
        };

        const activeUser = AppStorage.get('erp_active_user');
        const isAdmin = activeUser && activeUser.role === 'Admin';

        this.container.innerHTML = `
            <div class="settings-root fade-in" style="display:grid; grid-template-columns: 2fr 1fr; gap:24px;">
                
                <!-- Left: Company Settings Profile -->
                <div class="card glass-panel" style="padding: 24px;">
                    <div class="card-header" style="border-bottom: 1px solid var(--glass-border); padding-bottom:10px;">
                        <h3>ERP Company Settings</h3>
                        ${!isAdmin ? `<span class="badge badge-warning">Read-Only</span>` : ''}
                    </div>
                    
                    ${!isAdmin ? `
                        <div class="text-warning bold" style="background:var(--warning-light); padding:10px; border-radius:var(--radius-sm); border:1px solid var(--glass-border); margin-top:15px; font-size:0.85rem;">
                            ⚠️ You are logged in as a non-administrator role (${activeUser ? activeUser.role : 'Guest'}). Company settings details are read-only.
                        </div>
                    ` : ''}

                    <form id="company-settings-form" style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-top: 15px;">
                        <div class="form-group" style="grid-column: span 2;">
                            <label for="set-company">Company Corporate Name *</label>
                            <input type="text" id="set-company" class="input-field" value="${settings.companyName}" required ${!isAdmin ? 'disabled' : ''}>
                        </div>
                        <div class="form-group" style="grid-column: span 2;">
                            <label for="set-address">Store Premises Address *</label>
                            <input type="text" id="set-address" class="input-field" value="${settings.companyAddress}" required ${!isAdmin ? 'disabled' : ''}>
                        </div>
                        <div class="form-group">
                            <label for="set-phone">Store Contact Line *</label>
                            <input type="text" id="set-phone" class="input-field" value="${settings.companyPhone}" required ${!isAdmin ? 'disabled' : ''}>
                        </div>
                        <div class="form-group">
                            <label for="set-gst">GSTIN Tax Registration ID *</label>
                            <input type="text" id="set-gst" class="input-field" value="${settings.companyGst}" required ${!isAdmin ? 'disabled' : ''}>
                        </div>
                        <div class="form-group">
                            <label for="set-currency">Active Currency Symbol</label>
                            <select id="set-currency" class="input-field" ${!isAdmin ? 'disabled' : ''}>
                                <option value="₹" ${settings.currency === '₹' ? 'selected' : ''}>₹ Rupees (INR)</option>
                                <option value="$" ${settings.currency === '$' ? 'selected' : ''}>$ US Dollar (USD)</option>
                                <option value="£" ${settings.currency === '£' ? 'selected' : ''}>£ British Pound (GBP)</option>
                                <option value="€" ${settings.currency === '€' ? 'selected' : ''}>€ Euro (EUR)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="set-lowstock">Low Stock Warning Alert limit</label>
                            <input type="number" id="set-lowstock" class="input-field" value="${settings.lowStockThreshold || 15}" min="5" required ${!isAdmin ? 'disabled' : ''}>
                        </div>
                        <div class="form-group" style="grid-column: span 2;">
                            <label for="set-footer">Invoice Bill Footer Greeting</label>
                            <input type="text" id="set-footer" class="input-field" value="${settings.invoiceFooter}" ${!isAdmin ? 'disabled' : ''}>
                        </div>

                        ${isAdmin ? `
                            <button type="submit" class="btn btn-primary" style="grid-column: span 2; height:48px; font-weight:700;">
                                💾 Save settings profile
                            </button>
                        ` : ''}
                    </form>
                </div>

                <!-- Right: Database Utilities Backup/Restore -->
                <div style="display:flex; flex-direction:column; gap:24px;">
                    
                    <!-- Backup / Restore Panel -->
                    <div class="card glass-panel" style="padding: 20px;">
                        <div class="card-header" style="margin-bottom:12px;">
                            <h3>ERP Database Backup</h3>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:16px;">
                            <p class="text-muted" style="font-size:0.82rem; line-height:1.4;">
                                Export the client-side database tables to a local JSON backup file, or restore tables from a previous backup.
                            </p>
                            <button class="btn btn-secondary" id="btn-db-export" style="width:100%;">
                                📥 Export JSON Backup
                            </button>
                            
                            <div style="border-top:1px solid var(--glass-border); padding-top:14px; margin-top:5px;">
                                ${isAdmin ? `
                                    <label for="db-import-file" class="btn btn-primary" style="width:100%; cursor:pointer; text-align:center;">
                                        📤 Upload & Restore Backup
                                    </label>
                                    <input type="file" id="db-import-file" style="display:none;" accept=".json">
                                ` : `
                                    <button class="btn btn-primary disabled" style="width:100%; cursor:not-allowed; opacity:0.5;" disabled>
                                        📤 Restore Locked (Admins Only)
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>

                    <!-- App info card -->
                    <div class="card glass-panel" style="padding: 20px; background: rgba(148, 163, 184, 0.02);">
                        <h4 style="margin-bottom:8px;">System Information</h4>
                        <div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem; color:var(--text-secondary);">
                            <div><strong>ERP Engine:</strong> Aegis Medicas v2.4.0-Client</div>
                            <div><strong>Runtime:</strong> HTML5 / CSS3 / ES6 Browser</div>
                            <div><strong>Database:</strong> LocalStorage (Sandbox)</div>
                            <div><strong>Security context:</strong> Active Local HTTPS</div>
                        </div>
                    </div>

                </div>

            </div>
        `;
    }

    static bindEvents() {
        const form = document.getElementById('company-settings-form');
        if (!form) return;
        
        // Save Settings
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const activeUser = AppStorage.get('erp_active_user');
            if (!activeUser || activeUser.role !== 'Admin') {
                Toast.error("Unauthorized! Only Administrators can edit settings.");
                return;
            }

            const settings = {
                companyName: document.getElementById('set-company').value.trim(),
                companyAddress: document.getElementById('set-address').value.trim(),
                companyPhone: document.getElementById('set-phone').value.trim(),
                companyGst: document.getElementById('set-gst').value.trim().toUpperCase(),
                currency: document.getElementById('set-currency').value,
                lowStockThreshold: parseInt(document.getElementById('set-lowstock').value),
                invoiceFooter: document.getElementById('set-footer').value.trim()
            };

            AppStorage.set('settings', settings);
            Toast.success("ERP Company settings profile saved successfully!");

            // Trigger dynamic UI logo text refresh instantly
            if (window.App && window.App.setupCompanyUI) {
                window.App.setupCompanyUI();
            }
        });

        // Export Database
        document.getElementById('btn-db-export').addEventListener('click', () => {
            this.exportDatabaseJSON();
        });

        // Import Database uploader
        document.getElementById('db-import-file').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importDatabaseJSON(e.target.files[0]);
            }
        });
    }

    static exportDatabaseJSON() {
        const backupData = {
            medicines: AppStorage.getAll('medicines'),
            customers: AppStorage.getAll('customers'),
            suppliers: AppStorage.getAll('suppliers'),
            invoices: AppStorage.getAll('invoices'),
            purchases: AppStorage.getAll('purchases'),
            returns: AppStorage.getAll('returns'),
            employees: AppStorage.getAll('employees'),
            expenses: AppStorage.getAll('expenses'),
            settings: AppStorage.get('settings'),
            backupVersion: '2.4.0',
            exportedAt: new Date().toISOString()
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `AegisMedicas_ERP_Backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        Toast.success("Database JSON file downloaded successfully!");
    }

    static importDatabaseJSON(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                
                // Schema checks
                if (!parsed.medicines || !parsed.customers || !parsed.settings) {
                    Toast.error("Restore failed! Invalid backup file format schema.");
                    return;
                }

                const confirmRestore = await Dialog.confirm({
                    title: 'Restore Database Backup',
                    message: 'Overwriting the local database tables with this backup file will discard all current records. Proceed?',
                    confirmText: 'Overwite & Restore',
                    cancelText: 'Cancel',
                    type: 'danger'
                });

                if (confirmRestore) {
                    // Save all keys
                    AppStorage.set('medicines', parsed.medicines);
                    AppStorage.set('customers', parsed.customers);
                    AppStorage.set('suppliers', parsed.suppliers || []);
                    AppStorage.set('invoices', parsed.invoices || []);
                    AppStorage.set('purchases', parsed.purchases || []);
                    AppStorage.set('returns', parsed.returns || []);
                    AppStorage.set('employees', parsed.employees || []);
                    AppStorage.set('expenses', parsed.expenses || []);
                    AppStorage.set('settings', parsed.settings);

                    Toast.success("Database restored! Reloading workspace environment...");
                    setTimeout(() => {
                        window.location.reload();
                    }, 1200);
                }
            } catch (err) {
                console.error("Backup JSON parsing error", err);
                Toast.error("Failed to parse JSON backup file structure.");
            }
        };
        reader.readAsText(file);
    }
}

// =============================================================
// 2. Employee Roster Controller
// =============================================================
class EmployeeView {
    static render(container) {
        this.container = container;
        this.renderLayout();
        this.loadEmployeesData();
        this.bindEvents();
    }

    static renderLayout() {
        const activeUser = AppStorage.get('erp_active_user');
        const isAdmin = activeUser && activeUser.role === 'Admin';

        this.container.innerHTML = `
            <div class="employee-root fade-in" style="display:flex; flex-direction:column; gap:20px;">
                <!-- Toolbar Control bar -->
                <div class="card glass-panel" style="padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                        <h3 style="font-size:1.15rem;">Active Employee Shift roster</h3>
                        ${isAdmin ? `
                            <button class="btn btn-primary" id="btn-add-employee">
                                👤 Register Employee Profile
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Employee table card -->
                <div class="card glass-panel" style="padding:20px;">
                    <div class="table-container">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Employee Name</th>
                                    <th>Role Duty</th>
                                    <th>Email ID</th>
                                    <th>Phone line</th>
                                    <th>Shift Status</th>
                                    ${isAdmin ? `<th style="text-align: center;">Actions</th>` : ''}
                                </tr>
                            </thead>
                            <tbody id="emp-table-body">
                                <!-- Dynamic rows -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    static loadEmployeesData() {
        const employees = AppStorage.getAll('employees');
        const tbody = document.getElementById('emp-table-body');

        if (employees.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No employee records registered.</td></tr>`;
            return;
        }

        const activeUser = AppStorage.get('erp_active_user');
        const isAdmin = activeUser && activeUser.role === 'Admin';

        tbody.innerHTML = employees.map(e => {
            const statusClass = e.status === 'Active' ? 'badge-success' : 'badge-danger';
            let rolePill = 'badge-info';
            if (e.role === 'Admin') rolePill = 'badge-danger';
            if (e.role === 'Pharmacist') rolePill = 'badge-success';

            return `
                <tr>
                    <td data-label="Name" class="bold text-primary">${e.name}</td>
                    <td data-label="Role"><span class="badge ${rolePill}">${e.role}</span></td>
                    <td data-label="Email">${e.email}</td>
                    <td data-label="Phone">${e.phone}</td>
                    <td data-label="Status"><span class="badge ${statusClass}">${e.status}</span></td>
                    ${isAdmin ? `
                        <td data-label="Actions">
                            <div style="display:flex; justify-content:center; gap:8px;">
                                <button class="btn btn-secondary btn-icon-only action-emp-edit" data-id="${e.id}" title="Edit Profile">✏️</button>
                                <button class="btn btn-danger btn-icon-only action-emp-delete" data-id="${e.id}" title="Delete Record">🗑️</button>
                            </div>
                        </td>
                    ` : ''}
                </tr>
            `;
        }).join('');
    }

    static bindEvents() {
        const activeUser = AppStorage.get('erp_active_user');
        const isAdmin = activeUser && activeUser.role === 'Admin';
        if (!isAdmin) return; // Disallow binding events for non-admins since form triggers are absent

        // Register click
        document.getElementById('btn-add-employee').addEventListener('click', () => {
            this.openEmployeeFormModal();
        });

        // Table delegation actions
        document.getElementById('emp-table-body').addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const id = btn.dataset.id;
            if (btn.classList.contains('action-emp-edit')) {
                this.openEmployeeFormModal(id);
            } else if (btn.classList.contains('action-emp-delete')) {
                const emp = AppStorage.getById('employees', id);
                
                // Prevent self delete admin safety checks
                if (activeUser && activeUser.username === emp.email.split('@')[0]) {
                    Toast.error("Self-delete warning! You cannot delete your currently active login profile session.");
                    return;
                }

                const confirmDelete = await Dialog.confirm({
                    title: 'Remove Employee Profile',
                    message: `Are you sure you want to delete employee "${emp.name}" from shifts roster?`,
                    confirmText: 'Delete Record',
                    cancelText: 'Cancel',
                    type: 'danger'
                });

                if (confirmDelete) {
                    AppStorage.delete('employees', id);
                    Toast.success("Employee records cleared successfully.");
                    this.loadEmployeesData();
                }
            }
        });
    }

    static openEmployeeFormModal(id = null) {
        const isEdit = !!id;
        const e = isEdit ? AppStorage.getById('employees', id) : { name: '', role: 'Cashier', email: '', phone: '', status: 'Active' };

        const formContent = `
            <form id="employee-form">
                <div class="form-group">
                    <label for="e-name">Employee Full Name *</label>
                    <input type="text" id="e-name" class="input-field" value="${e.name}" placeholder="e.g. Alex Mercer" required>
                </div>
                <div class="form-group">
                    <label for="e-role">Role duty Authorization *</label>
                    <select id="e-role" class="input-field" required>
                        <option value="Admin" ${e.role === 'Admin' ? 'selected' : ''}>System Administrator</option>
                        <option value="Pharmacist" ${e.role === 'Pharmacist' ? 'selected' : ''}>Chief Pharmacist</option>
                        <option value="Cashier" ${e.role === 'Cashier' ? 'selected' : ''}>POS Billing Cashier</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="e-email">Corporate Email *</label>
                    <input type="email" id="e-email" class="input-field" value="${e.email}" placeholder="alex@aegis.com" required>
                </div>
                <div class="form-group">
                    <label for="e-phone">Shift Contact Phone *</label>
                    <input type="text" id="e-phone" class="input-field" value="${e.phone}" placeholder="+91 9988776655" required>
                </div>
                <div class="form-group">
                    <label for="e-status">Duty status *</label>
                    <select id="e-status" class="input-field" required>
                        <option value="Active" ${e.status === 'Active' ? 'selected' : ''}>Active Shift</option>
                        <option value="Inactive" ${e.status === 'Inactive' ? 'selected' : ''}>Inactive/On Leave</option>
                    </select>
                </div>
            </form>
        `;

        Dialog.showCustomModal(
            'employee-form-modal',
            isEdit ? 'Update Employee shifts file' : 'Register Employee shifts file',
            formContent,
            [
                { text: 'Cancel', class: 'btn-secondary' },
                {
                    text: isEdit ? 'Update details' : 'Register employee',
                    class: 'btn-primary',
                    click: (close, overlay) => {
                        const form = overlay.querySelector('#employee-form');
                        if (!form.checkValidity()) {
                            form.reportValidity();
                            return;
                        }

                        const updated = {
                            ...e,
                            name: overlay.querySelector('#e-name').value.trim(),
                            role: overlay.querySelector('#e-role').value,
                            email: overlay.querySelector('#e-email').value.trim(),
                            phone: overlay.querySelector('#e-phone').value.trim(),
                            status: overlay.querySelector('#e-status').value
                        };

                        AppStorage.save('employees', updated);
                        Toast.success(isEdit ? "Employee details saved!" : "New employee registered to shifts roster!");
                        close();
                        this.loadEmployeesData();
                    }
                }
            ]
        );
    }
}

window.SettingsView = SettingsView;
window.EmployeeView = EmployeeView;
