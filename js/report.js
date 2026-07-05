/**
 * Aegis Medicas ERP - Reports & Financial Ledger Controller
 * Handles report aggregations (Sales, Profit Margins, Tax GST, Popular Items),
 * Canvas chart visualizations, CSV exports, and general ledger expenses.
 */

// =============================================================
// 1. Reports Controller
// =============================================================
class ReportView {
    static render(container) {
        this.container = container;
        this.activeReport = 'sales'; // 'sales', 'profit', 'popularity', 'gst'
        
        this.renderLayout();
        this.loadReportData();
        this.bindEvents();
    }

    static renderLayout() {
        this.container.innerHTML = `
            <div class="reports-root fade-in" style="display:flex; flex-direction:column; gap:20px;">
                <!-- Tab controller -->
                <div class="card glass-panel" style="padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                        <div class="tabs" style="margin-bottom:0; border-bottom:none;">
                            <button class="tab-btn ${this.activeReport === 'sales' ? 'active' : ''}" data-report="sales">Sales Audit</button>
                            <button class="tab-btn ${this.activeReport === 'profit' ? 'active' : ''}" data-report="profit">Profit Margins</button>
                            <button class="tab-btn ${this.activeReport === 'popularity' ? 'active' : ''}" data-report="popularity">Popular Medicines</button>
                            <button class="tab-btn ${this.activeReport === 'gst' ? 'active' : ''}" data-report="gst">GST Tax Audit</button>
                        </div>
                        
                        <div style="display:flex; gap:10px;">
                            <button class="btn btn-secondary" id="btn-export-excel">📥 Excel (CSV)</button>
                            <button class="btn btn-primary" id="btn-export-pdf">🖨️ PDF Print</button>
                        </div>
                    </div>
                </div>

                <!-- Report Details viewport card -->
                <div class="card glass-panel" style="padding:24px;" id="report-viewport-area">
                    <!-- Dynamic rendering -->
                </div>
            </div>
        `;
    }

    static loadReportData() {
        const viewport = document.getElementById('report-viewport-area');
        if (!viewport) return;

        const invoices = AppStorage.getAll('invoices');
        const medicines = AppStorage.getAll('medicines');
        
        switch (this.activeReport) {
            case 'sales':
                // Daily sales list
                viewport.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <h3>Sales Invoices Audit</h3>
                        <span class="text-muted" style="font-size:0.85rem;">Total Sales: ${invoices.length} Bills</span>
                    </div>
                    <div class="table-container" style="border:none; margin-top:0;">
                        <table class="custom-table" id="sales-report-table">
                            <thead>
                                <tr>
                                    <th>Invoice No</th>
                                    <th>Date</th>
                                    <th>Customer Name</th>
                                    <th>Items Count</th>
                                    <th>Tax Collected</th>
                                    <th>Grand Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${invoices.length === 0 ? '<tr><td colspan="6" style="text-align:center;">No sales recorded.</td></tr>' : 
                                invoices.map(inv => `
                                    <tr>
                                        <td class="bold text-info">${inv.invoiceNo}</td>
                                        <td style="font-size:0.85rem;">${Formatter.dateTime(inv.date)}</td>
                                        <td class="bold">${inv.customerName}</td>
                                        <td>${inv.items.reduce((sum,i)=>sum+i.qty, 0)} packs</td>
                                        <td>${Formatter.currency(inv.gstTotal)}</td>
                                        <td class="bold">${Formatter.currency(inv.grandTotal)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                break;

            case 'profit':
                // Profit report
                let cumulativeSales = 0;
                let cumulativeCost = 0;
                let itemsList = [];

                invoices.forEach(inv => {
                    inv.items.forEach(item => {
                        const med = medicines.find(m => m.id === item.medicineId);
                        const unitCost = med ? med.purchasePrice : (item.price * 0.6);
                        const lineCost = item.qty * unitCost;
                        const lineSell = item.qty * item.price * (1 - item.discount/100);

                        cumulativeSales += lineSell;
                        cumulativeCost += lineCost;

                        const existingIdx = itemsList.findIndex(x => x.medicineId === item.medicineId);
                        if (existingIdx !== -1) {
                            itemsList[existingIdx].qty += item.qty;
                            itemsList[existingIdx].cost += lineCost;
                            itemsList[existingIdx].sell += lineSell;
                        } else {
                            itemsList.push({
                                medicineId: item.medicineId,
                                name: item.name,
                                qty: item.qty,
                                cost: lineCost,
                                sell: lineSell
                            });
                        }
                    });
                });

                const netProfit = cumulativeSales - cumulativeCost;
                const profitPct = cumulativeSales > 0 ? (netProfit / cumulativeSales) * 100 : 0;

                viewport.innerHTML = `
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; margin-bottom:24px;">
                        <div class="card glass-panel" style="padding:16px; background:rgba(148,163,184,0.02);">
                            <span class="text-muted" style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Sales Revenue</span>
                            <h2 style="color:var(--primary); margin-top:5px;">${Formatter.currency(cumulativeSales)}</h2>
                        </div>
                        <div class="card glass-panel" style="padding:16px; background:rgba(148,163,184,0.02);">
                            <span class="text-muted" style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Acquisition Cost</span>
                            <h2 style="color:var(--text-secondary); margin-top:5px;">${Formatter.currency(cumulativeCost)}</h2>
                        </div>
                        <div class="card glass-panel" style="padding:16px; background:rgba(148,163,184,0.02);">
                            <span class="text-muted" style="font-size:0.8rem; font-weight:700; text-transform:uppercase;">Gross Profit Margin</span>
                            <h2 style="color:var(--secondary); margin-top:5px;">${Formatter.currency(netProfit)} <span style="font-size:0.95rem; font-weight:normal;">(${profitPct.toFixed(1)}%)</span></h2>
                        </div>
                    </div>

                    <h3 style="font-size:1.1rem; margin-bottom:12px;">Product-wise Profit Breakdown</h3>
                    <div class="table-container" style="border:none; margin-top:0;">
                        <table class="custom-table" id="profit-report-table">
                            <thead>
                                <tr>
                                    <th>Medicine Name</th>
                                    <th style="text-align:center;">Quantity Sold</th>
                                    <th>Cost Value</th>
                                    <th>Sales Value</th>
                                    <th>Net Margin</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsList.length === 0 ? '<tr><td colspan="5" style="text-align:center;">No profit audits logged.</td></tr>' : 
                                itemsList.map(i => `
                                    <tr>
                                        <td class="bold text-primary">${i.name}</td>
                                        <td style="text-align:center;">${i.qty} packs</td>
                                        <td>${Formatter.currency(i.cost)}</td>
                                        <td>${Formatter.currency(i.sell)}</td>
                                        <td class="bold text-success">${Formatter.currency(i.sell - i.cost)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                break;

            case 'popularity':
                // Popular items list
                const popMap = {};
                invoices.forEach(inv => {
                    inv.items.forEach(item => {
                        popMap[item.name] = (popMap[item.name] || 0) + item.qty;
                    });
                });

                const sortedPopular = Object.entries(popMap)
                    .map(([name, qty]) => ({ name, qty }))
                    .sort((a,b) => b.qty - a.qty);

                viewport.innerHTML = `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
                        
                        <!-- Left Panel Table -->
                        <div>
                            <h3 style="font-size:1.1rem; margin-bottom:12px;">Rankings</h3>
                            <div class="table-container" style="border:none; margin-top:0;">
                                <table class="custom-table" id="pop-report-table">
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Medicine Name</th>
                                            <th style="text-align:center;">Units Sold</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${sortedPopular.length === 0 ? '<tr><td colspan="3" style="text-align:center;">No entries.</td></tr>' : 
                                        sortedPopular.map((item, idx) => `
                                            <tr>
                                                <td class="bold">#${idx + 1}</td>
                                                <td class="text-primary bold">${item.name}</td>
                                                <td style="text-align:center;" class="bold">${item.qty} packs</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Right Panel: Canvas Chart -->
                        <div class="card glass-panel" style="padding:16px; height: 300px; justify-content:center;">
                            <h4 style="margin-bottom:10px;">Visual Analytics (Units)</h4>
                            <canvas id="popularity-chart-canvas" style="width:100%; height:200px;"></canvas>
                        </div>
                    </div>
                `;

                // Render Canvas graph (Take top 5 popular)
                if (sortedPopular.length > 0) {
                    const top5 = sortedPopular.slice(0, 5);
                    setTimeout(() => {
                        const vals = top5.map(x => x.qty);
                        const lbls = top5.map(x => x.name.split(' ')[0]); // take first name word
                        CanvasCharts.bar('popularity-chart-canvas', vals, lbls, {
                            barColorStart: '#10b981',
                            barColorEnd: 'rgba(16, 185, 129, 0.1)',
                            gridColor: 'rgba(148, 163, 184, 0.08)',
                            textColor: '#94a3b8'
                        });
                    }, 50);
                }
                break;

            case 'gst':
                // GST taxation report
                // GST slabs: 5%, 12%, 18%
                let gstVal5 = 0;
                let gstVal12 = 0;
                let gstVal18 = 0;
                
                let salesVal5 = 0;
                let salesVal12 = 0;
                let salesVal18 = 0;

                invoices.forEach(inv => {
                    inv.items.forEach(item => {
                        const rate = item.gst || 12;
                        const lineSub = item.qty * item.mrp * (1 - item.discount/100);
                        const lineSell = lineSub / (1 + rate / 100);
                        const lineTax = lineSub - lineSell;

                        if (rate === 5) {
                            salesVal5 += lineSell;
                            gstVal5 += lineTax;
                        } else if (rate === 12) {
                            salesVal12 += lineSell;
                            gstVal12 += lineTax;
                        } else if (rate === 18) {
                            salesVal18 += lineSell;
                            gstVal18 += lineTax;
                        }
                    });
                });

                viewport.innerHTML = `
                    <h3 style="font-size:1.15rem; margin-bottom:12px;">GST Taxation Audit Reports</h3>
                    <div class="table-container" style="border:none; margin-top:0;">
                        <table class="custom-table" id="gst-report-table">
                            <thead>
                                <tr>
                                    <th>Tax Slab Category</th>
                                    <th>Taxable Selling Value</th>
                                    <th>SGST Tax Share (50%)</th>
                                    <th>CGST Tax Share (50%)</th>
                                    <th>Total GST Collected</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="bold">GST 5% Slab</td>
                                    <td>${Formatter.currency(salesVal5)}</td>
                                    <td>${Formatter.currency(gstVal5 / 2)}</td>
                                    <td>${Formatter.currency(gstVal5 / 2)}</td>
                                    <td class="bold text-primary">${Formatter.currency(gstVal5)}</td>
                                </tr>
                                <tr>
                                    <td class="bold">GST 12% Slab</td>
                                    <td>${Formatter.currency(salesVal12)}</td>
                                    <td>${Formatter.currency(gstVal12 / 2)}</td>
                                    <td>${Formatter.currency(gstVal12 / 2)}</td>
                                    <td class="bold text-primary">${Formatter.currency(gstVal12)}</td>
                                </tr>
                                <tr>
                                    <td class="bold">GST 18% Slab</td>
                                    <td>${Formatter.currency(salesVal18)}</td>
                                    <td>${Formatter.currency(gstVal18 / 2)}</td>
                                    <td>${Formatter.currency(gstVal18 / 2)}</td>
                                    <td class="bold text-primary">${Formatter.currency(gstVal18)}</td>
                                </tr>
                                <tr style="background:rgba(148, 163, 184, 0.08); font-weight:800; font-size:1rem;">
                                    <td>Total Taxation Aggregate</td>
                                    <td>${Formatter.currency(salesVal5 + salesVal12 + salesVal18)}</td>
                                    <td>${Formatter.currency((gstVal5 + gstVal12 + gstVal18)/2)}</td>
                                    <td>${Formatter.currency((gstVal5 + gstVal12 + gstVal18)/2)}</td>
                                    <td class="text-success">${Formatter.currency(gstVal5 + gstVal12 + gstVal18)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `;
                break;
        }
    }

    static bindEvents() {
        // Tab click toggles
        this.container.querySelectorAll('.tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activeReport = btn.dataset.report;
                this.renderLayout();
                this.loadReportData();
                this.bindEvents();
            });
        });

        // Export Excel Click
        document.getElementById('btn-export-excel').addEventListener('click', () => {
            this.handleExcelExport();
        });

        // Export PDF Print click
        document.getElementById('btn-export-pdf').addEventListener('click', () => {
            Exporter.toPDF(`ERP_Report_${this.activeReport.toUpperCase()}`, 'report-viewport-area');
        });
    }

    static handleExcelExport() {
        let headers = [];
        let rows = [];
        const dateStr = new Date().toISOString().split('T')[0];

        switch(this.activeReport) {
            case 'sales':
                headers = ["Invoice No", "Date", "Customer Name", "Tax Collected", "Grand Total"];
                rows = AppStorage.getAll('invoices').map(inv => [
                    inv.invoiceNo, inv.date, inv.customerName, inv.gstTotal, inv.grandTotal
                ]);
                break;
            case 'profit':
                headers = ["Product Name", "Acquisition Cost Value", "Sales Value", "Profit Margin Value"];
                // Recalculate
                const medicines = AppStorage.getAll('medicines');
                const itemsList = {};
                AppStorage.getAll('invoices').forEach(inv => {
                    inv.items.forEach(item => {
                        const med = medicines.find(m => m.id === item.medicineId);
                        const cost = item.qty * (med ? med.purchasePrice : item.price * 0.6);
                        const sell = item.qty * item.price * (1 - item.discount/100);
                        if (!itemsList[item.name]) {
                            itemsList[item.name] = { cost: 0, sell: 0 };
                        }
                        itemsList[item.name].cost += cost;
                        itemsList[item.name].sell += sell;
                    });
                });
                rows = Object.entries(itemsList).map(([name, data]) => [
                    name, data.cost, data.sell, data.sell - data.cost
                ]);
                break;
            case 'popularity':
                headers = ["Medicine Name", "Quantity Sold (Packs)"];
                const popMap = {};
                AppStorage.getAll('invoices').forEach(inv => {
                    inv.items.forEach(item => {
                        popMap[item.name] = (popMap[item.name] || 0) + item.qty;
                    });
                });
                rows = Object.entries(popMap).sort((a,b) => b[1] - a[1]);
                break;
            case 'gst':
                headers = ["GST Bracket Slab", "Taxable Value", "CGST share", "SGST share", "Total tax Collected"];
                // Settle rows directly
                rows = [["Refer to GST screen values directly for tax audits."]];
                break;
        }

        Exporter.toCSV(`Report_${this.activeReport}_${dateStr}`, headers, rows);
    }
}

// =============================================================
// 2. Finance Ledger Controller
// =============================================================
class FinanceView {
    static render(container) {
        this.container = container;
        this.renderLayout();
        this.loadLedgerData();
        this.bindEvents();
    }

    static renderLayout() {
        this.container.innerHTML = `
            <div class="finance-root fade-in" style="display:flex; flex-direction:column; gap:24px;">
                
                <!-- Finance Summary widgets -->
                <div class="stats-grid">
                    <div class="card glass-panel stat-card">
                        <div class="stat-header">
                            <span class="stat-title">Cash-In Revenue</span>
                            <div class="stat-icon-box" style="background:var(--secondary-light); color:var(--secondary);">📈</div>
                        </div>
                        <h2 class="stat-value" id="fin-income">₹0.00</h2>
                        <span class="text-muted" style="font-size:0.8rem;">Sales bill settlements</span>
                    </div>

                    <div class="card glass-panel stat-card">
                        <div class="stat-header">
                            <span class="stat-title">Cash-Out Expenses</span>
                            <div class="stat-icon-box" style="background:var(--danger-light); color:var(--danger);">📉</div>
                        </div>
                        <h2 class="stat-value text-danger" id="fin-expense">₹0.00</h2>
                        <span class="text-muted" style="font-size:0.8rem;">Salaries, rent, supplier pay</span>
                    </div>

                    <div class="card glass-panel stat-card">
                        <div class="stat-header">
                            <span class="stat-title">Net Liquid Earnings</span>
                            <div class="stat-icon-box" style="background:var(--info-light); color:var(--info);">💰</div>
                        </div>
                        <h2 class="stat-value" id="fin-profit">₹0.00</h2>
                        <span class="text-muted" style="font-size:0.8rem;">Operating surplus</span>
                    </div>
                </div>

                <!-- Ledger split screen -->
                <div class="dashboard-split-grid">
                    <!-- Expense log table -->
                    <div class="card glass-panel">
                        <div class="card-header">
                            <h3>Operations Expenses Ledger</h3>
                        </div>
                        <div class="table-container" style="border:none; margin-top:0; max-height:300px; overflow-y:auto;">
                            <table class="custom-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Category</th>
                                        <th>Description</th>
                                        <th>Amount</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="expenses-ledger-body">
                                    <!-- Dynamic rows -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Log Expense Form -->
                    <div class="card glass-panel">
                        <div class="card-header">
                            <h3>Log Operating Expense</h3>
                        </div>
                        <form id="ledger-expense-form" style="display:flex; flex-direction:column; gap:12px;">
                            <div class="form-group">
                                <label for="le-cat">Expense Category *</label>
                                <select id="le-cat" class="input-field" required>
                                    <option value="Rent">Premises Rent</option>
                                    <option value="Utilities">Electricity & Utilities</option>
                                    <option value="Salaries">Staff Salary Payments</option>
                                    <option value="Logistics">Supplier Settlements / Logistics</option>
                                    <option value="Miscellaneous">Miscellaneous</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="le-desc">Short Description *</label>
                                <input type="text" id="le-desc" class="input-field" placeholder="Payee name, details..." required>
                            </div>
                            <div class="form-group">
                                <label for="le-amount">Amount Outlay (₹) *</label>
                                <input type="number" id="le-amount" class="input-field" step="0.01" min="1" required>
                            </div>
                            <button type="submit" class="btn btn-danger" style="margin-top:10px; height:44px; font-weight:700;">
                                💸 Log Cash Outflow
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        `;
    }

    static loadLedgerData() {
        const invoices = AppStorage.getAll('invoices');
        const expenses = AppStorage.getAll('expenses') || [];

        // 1. Calculate Income
        // Paid sales invoice totals
        let incomeTotal = invoices
            .filter(inv => inv.paymentStatus === 'Paid')
            .reduce((sum, inv) => sum + inv.grandTotal, 0);

        // 2. Calculate Expenses
        // Note: in storage, we saved credit customer collections as negative expenses
        // Let's filter actual expenses (amount > 0) and income recoveries (amount < 0)
        let expenseTotal = 0;
        expenses.forEach(e => {
            if (e.amount > 0) {
                expenseTotal += e.amount;
            } else {
                incomeTotal += Math.abs(e.amount); // recovery added to cash income
            }
        });

        const surplus = incomeTotal - expenseTotal;

        // Set text
        document.getElementById('fin-income').textContent = Formatter.currency(incomeTotal);
        document.getElementById('fin-expense').textContent = Formatter.currency(expenseTotal);
        
        const profitEl = document.getElementById('fin-profit');
        profitEl.textContent = Formatter.currency(surplus);
        if (surplus >= 0) {
            profitEl.style.color = 'var(--secondary)';
        } else {
            profitEl.style.color = 'var(--danger)';
        }

        // Render expenses table rows
        const tbody = document.getElementById('expenses-ledger-body');
        if (expenses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No expense records logged.</td></tr>`;
            return;
        }

        // Filter and display expenses (showing positive amounts first, negative recovery records too)
        const sorted = [...expenses].sort((a,b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = sorted.map(e => `
            <tr>
                <td style="font-size:0.85rem;">${Formatter.date(e.date)}</td>
                <td><span class="badge ${e.amount < 0 ? 'badge-success' : 'badge-danger'}">${e.category}</span></td>
                <td style="font-size:0.85rem;">${e.description}</td>
                <td class="bold ${e.amount < 0 ? 'text-success' : 'text-danger'}">
                    ${e.amount < 0 ? '+' : '-'}${Formatter.currency(Math.abs(e.amount))}
                </td>
                <td>
                    <button class="action-del-expense" data-id="${e.id}" style="color:var(--danger); font-size:1.1rem; font-weight:bold;">&times;</button>
                </td>
            </tr>
        `).join('');
    }

    static bindEvents() {
        const form = document.getElementById('ledger-expense-form');
        
        // Log Expense
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const category = document.getElementById('le-cat').value;
            const description = document.getElementById('le-desc').value.trim();
            const amount = parseFloat(document.getElementById('le-amount').value);

            const newExp = {
                id: 'EXP_' + Date.now(),
                date: new Date().toISOString().split('T')[0],
                category,
                description,
                amount
            };

            AppStorage.save('expenses', newExp);
            Toast.success("Cash outflow logged!");
            form.reset();
            this.loadLedgerData();
            
            if (window.App) window.App.runRealtimeScanner();
        });

        // Delete expense delegation
        document.getElementById('expenses-ledger-body').addEventListener('click', async (e) => {
            if (e.target.classList.contains('action-del-expense')) {
                const id = e.target.dataset.id;
                const confirmCancel = await Dialog.confirm({
                    title: 'Delete Expense Entry',
                    message: 'Are you sure you want to remove this ledger entry?',
                    confirmText: 'Remove Entry',
                    cancelText: 'Cancel',
                    type: 'danger'
                });

                if (confirmCancel) {
                    AppStorage.delete('expenses', id);
                    Toast.success("Ledger entry removed.");
                    this.loadLedgerData();
                    if (window.App) window.App.runRealtimeScanner();
                }
            }
        });
    }
}

window.ReportView = ReportView;
window.FinanceView = FinanceView;
