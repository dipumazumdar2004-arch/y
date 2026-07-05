/**
 * Aegis Medicas ERP - Dashboard View Controller
 * Displays animated statistics, charts, recent records, quick action links,
 * and a synchronized calendar interface.
 */

class DashboardView {
    static render(container) {
        // 1. Calculate values from Storage
        const medicines = AppStorage.getAll('medicines');
        const invoices = AppStorage.getAll('invoices');
        const purchases = AppStorage.getAll('purchases');
        const customers = AppStorage.getAll('customers');
        const suppliers = AppStorage.getAll('suppliers');
        
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Stats calculations
        let todaySales = 0;
        let todayProfit = 0;
        let totalRevenue = 0;
        
        invoices.forEach(inv => {
            totalRevenue += inv.grandTotal;
            if (inv.date.startsWith(todayStr)) {
                todaySales += inv.grandTotal;
                
                // Calculate profit: sellingPrice - purchasePrice for items
                inv.items.forEach(item => {
                    const med = medicines.find(m => m.id === item.medicineId);
                    const purchasePrice = med ? med.purchasePrice : (item.price * 0.6); // Fallback
                    todayProfit += item.qty * (item.price - purchasePrice);
                });
            }
        });

        const medicineCount = medicines.length;
        
        let inventoryValue = 0;
        let lowStockCount = 0;
        let expiredCount = 0;
        let nearExpiryCount = 0;
        const today = new Date();

        medicines.forEach(m => {
            inventoryValue += (m.stock * m.purchasePrice);
            if (m.stock <= (m.minStock || 15)) {
                lowStockCount++;
            }
            if (m.expiryDate) {
                const exp = new Date(m.expiryDate);
                const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                if (diff <= 0) {
                    expiredCount++;
                } else if (diff <= 30) {
                    nearExpiryCount++;
                }
            }
        });

        const pendingPayments = suppliers.reduce((sum, s) => sum + (s.pendingPayments || 0), 0);

        // Render layout
        container.innerHTML = `
            <div class="dashboard-root fade-in" style="display: flex; flex-direction: column; gap: 24px;">
                
                <!-- KPI Statistics Grid -->
                <div class="stats-grid">
                    <!-- Today Sales -->
                    <div class="card glass-panel stat-card hover-lift">
                        <div class="stat-header">
                            <span class="stat-title">Today's Sales</span>
                            <div class="stat-icon-box" style="background: var(--primary-light); color: var(--primary);">
                                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            </div>
                        </div>
                        <h2 class="stat-value" id="stat-today-sales">0.00</h2>
                        <div class="stat-footer">
                            <span class="text-success bold">↑ 12.5%</span>
                            <span class="text-muted">vs yesterday</span>
                        </div>
                    </div>

                    <!-- Today Profit -->
                    <div class="card glass-panel stat-card hover-lift">
                        <div class="stat-header">
                            <span class="stat-title">Today's Profit</span>
                            <div class="stat-icon-box" style="background: var(--secondary-light); color: var(--secondary);">
                                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 22v-1a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </div>
                        </div>
                        <h2 class="stat-value" id="stat-today-profit">0.00</h2>
                        <div class="stat-footer">
                            <span class="text-success bold">↑ 8.4%</span>
                            <span class="text-muted">margin optimized</span>
                        </div>
                    </div>

                    <!-- Inventory Valuation -->
                    <div class="card glass-panel stat-card hover-lift">
                        <div class="stat-header">
                            <span class="stat-title">Inventory Value</span>
                            <div class="stat-icon-box" style="background: var(--info-light); color: var(--info);">
                                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                            </div>
                        </div>
                        <h2 class="stat-value" id="stat-inv-val">0.00</h2>
                        <div class="stat-footer">
                            <span class="text-muted">${medicineCount} items registered</span>
                        </div>
                    </div>

                    <!-- Low Stock Alerts -->
                    <div class="card glass-panel stat-card hover-lift">
                        <div class="stat-header">
                            <span class="stat-title">Low Stock Alerts</span>
                            <div class="stat-icon-box" style="background: var(--danger-light); color: var(--danger);">
                                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            </div>
                        </div>
                        <h2 class="stat-value text-danger" id="stat-low-stock">0</h2>
                        <div class="stat-footer">
                            <span class="text-danger bold">${expiredCount} Expired</span>
                            <span class="text-muted">/ ${nearExpiryCount} near expiry</span>
                        </div>
                    </div>
                </div>

                <!-- Secondary KPI Stats Grid -->
                <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
                    <div class="card glass-panel stat-card" style="padding: 14px 20px; flex-direction: row; align-items: center; justify-content: space-between;">
                        <div>
                            <span class="stat-title" style="font-size:0.75rem;">Total Revenue</span>
                            <h4 id="stat-total-rev">₹0.00</h4>
                        </div>
                        <span class="badge badge-success">Active</span>
                    </div>
                    <div class="card glass-panel stat-card" style="padding: 14px 20px; flex-direction: row; align-items: center; justify-content: space-between;">
                        <div>
                            <span class="stat-title" style="font-size:0.75rem;">Supplier Dues</span>
                            <h4 class="text-warning" id="stat-supplier-dues">₹0.00</h4>
                        </div>
                        <span class="badge badge-warning">Dues</span>
                    </div>
                    <div class="card glass-panel stat-card" style="padding: 14px 20px; flex-direction: row; align-items: center; justify-content: space-between;">
                        <div>
                            <span class="stat-title" style="font-size:0.75rem;">Customers</span>
                            <h4 id="stat-cust-count">0</h4>
                        </div>
                        <span class="badge badge-info">Loyal</span>
                    </div>
                    <div class="card glass-panel stat-card" style="padding: 14px 20px; flex-direction: row; align-items: center; justify-content: space-between;">
                        <div>
                            <span class="stat-title" style="font-size:0.75rem;">Suppliers</span>
                            <h4 id="stat-supp-count">0</h4>
                        </div>
                        <span class="badge badge-info">Direct</span>
                    </div>
                </div>

                <!-- Charts Section -->
                <div class="charts-grid">
                    <!-- Weekly Sales Chart -->
                    <div class="card glass-panel chart-card">
                        <div class="card-header">
                            <h3>Weekly Sales Volume</h3>
                            <span class="text-muted" style="font-size:0.8rem;">Last 7 Days (₹)</span>
                        </div>
                        <div class="chart-wrapper">
                            <canvas id="weekly-sales-canvas" class="chart-canvas"></canvas>
                        </div>
                    </div>

                    <!-- Monthly Revenue Trend -->
                    <div class="card glass-panel chart-card">
                        <div class="card-header">
                            <h3>Weekly Cumulative Revenue</h3>
                            <span class="text-muted" style="font-size:0.8rem;">Trend Overview</span>
                        </div>
                        <div class="chart-wrapper">
                            <canvas id="monthly-rev-canvas" class="chart-canvas"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Dashboard Split Grid (Recent invoices, Calendar, Quick Actions) -->
                <div class="dashboard-split-grid">
                    <!-- Recent Sales Ledger -->
                    <div class="card glass-panel list-panel">
                        <div class="card-header">
                            <h3>Recent Sales POS Bills</h3>
                            <button class="btn btn-secondary" onclick="window.location.hash='billing'">New Billing Terminal</button>
                        </div>
                        <div class="table-container">
                            <table class="custom-table">
                                <thead>
                                    <tr>
                                        <th>Bill No</th>
                                        <th>Customer</th>
                                        <th>Date</th>
                                        <th>Payment</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody id="recent-invoices-body">
                                    <tr>
                                        <td colspan="6" class="text-muted" style="text-align: center;">No transactions found.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Right Column: Calendar Widget & Quick Actions -->
                    <div style="display: flex; flex-direction: column; gap: 24px;">
                        
                        <!-- Quick Actions Grid -->
                        <div class="card glass-panel">
                            <div class="card-header" style="margin-bottom:12px;">
                                <h3>Quick Utilities</h3>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                                <button class="btn btn-primary" onclick="window.location.hash='billing'" style="padding:12px;">
                                    ➕ Billing POS
                                </button>
                                <button class="btn btn-secondary" onclick="window.location.hash='medicine'" style="padding:12px;">
                                    📦 Add Medicine
                                </button>
                                <button class="btn btn-secondary" onclick="window.location.hash='purchase'" style="padding:12px;">
                                    📝 New Purchase
                                </button>
                                <button class="btn btn-secondary" id="action-quick-expense" style="padding:12px;">
                                    💸 Add Expense
                                </button>
                            </div>
                        </div>

                        <!-- Calendar Widget -->
                        <div class="calendar-widget glass-panel">
                            <div class="calendar-header">
                                <span id="calendar-month-year">July 2026</span>
                                <span class="text-muted" style="font-size:0.8rem;">Active Shift</span>
                            </div>
                            <div class="calendar-days">
                                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                            </div>
                            <div class="calendar-grid" id="calendar-grid-cells">
                                <!-- Generated calendar cells -->
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
        `;

        // 2. Animate counter values
        this.animateCounter("stat-today-sales", todaySales, true);
        this.animateCounter("stat-today-profit", todayProfit, true);
        this.animateCounter("stat-inv-val", inventoryValue, true);
        this.animateCounter("stat-total-rev", totalRevenue, true, '₹ ');
        this.animateCounter("stat-supplier-dues", pendingPayments, true, '₹ ');
        this.animateCounter("stat-cust-count", customers.length, false);
        this.animateCounter("stat-supp-count", suppliers.length, false);
        this.animateCounter("stat-low-stock", lowStockCount, false);

        // 3. Render Invoices Table
        this.renderRecentInvoices(invoices);

        // 4. Render Calendar
        this.renderCalendarWidget();

        // 5. Draw Charts
        this.drawWeeklySalesChart(invoices);
        this.drawMonthlyRevenueChart(invoices);

        // 6. Bind Quick Expense dialog action
        document.getElementById('action-quick-expense').addEventListener('click', () => {
            this.openQuickExpenseModal();
        });
    }

    static animateCounter(elementId, targetValue, isCurrency = false, prefix = '₹ ') {
        const el = document.getElementById(elementId);
        if (!el) return;

        let start = 0;
        const duration = 800; // ms
        const steps = 40;
        const stepTime = duration / steps;
        const increment = targetValue / steps;

        let count = 0;
        const timer = setInterval(() => {
            count++;
            start += increment;
            
            if (count >= steps) {
                clearInterval(timer);
                el.textContent = isCurrency ? prefix + targetValue.toFixed(2) : targetValue;
            } else {
                el.textContent = isCurrency ? prefix + start.toFixed(2) : Math.round(start);
            }
        }, stepTime);
    }

    static renderRecentInvoices(invoices) {
        const tbody = document.getElementById('recent-invoices-body');
        if (!tbody || invoices.length === 0) return;

        // Sort by date descending, take last 5
        const sorted = [...invoices].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

        tbody.innerHTML = sorted.map(inv => {
            const statusClass = inv.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning';
            return `
                <tr>
                    <td data-label="Bill No" class="bold text-info">${inv.invoiceNo}</td>
                    <td data-label="Customer">${inv.customerName}</td>
                    <td data-label="Date" style="font-size:0.85rem;">${Formatter.date(inv.date)}</td>
                    <td data-label="Payment">${inv.paymentMethod}</td>
                    <td data-label="Total" class="bold">${Formatter.currency(inv.grandTotal)}</td>
                    <td data-label="Status"><span class="badge ${statusClass}">${inv.paymentStatus}</span></td>
                </tr>
            `;
        }).join('');
    }

    static renderCalendarWidget() {
        const grid = document.getElementById('calendar-grid-cells');
        if (!grid) return;

        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth(); // July is 6 (0-indexed)

        // Set month header
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        document.getElementById('calendar-month-year').textContent = `${months[month]} ${year}`;

        // Get first day of month index and number of days
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const prevDays = new Date(year, month, 0).getDate();

        grid.innerHTML = '';

        // Fill previous month padding cells
        for (let i = firstDayIndex; i > 0; i--) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day inactive';
            cell.textContent = prevDays - i + 1;
            grid.appendChild(cell);
        }

        // Fill current month cells
        for (let i = 1; i <= totalDays; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';
            cell.textContent = i;

            if (i === date.getDate()) {
                cell.className = 'calendar-day active';
            }
            grid.appendChild(cell);
        }
    }

    static drawWeeklySalesChart(invoices) {
        const today = new Date();
        const data = [];
        const labels = [];
        
        // Aggregate last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            
            // Format labels like "28 Jun", "29 Jun", etc.
            labels.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
            
            // Sum sales grand totals
            const salesSum = invoices
                .filter(inv => inv.date.startsWith(dateStr))
                .reduce((sum, inv) => sum + inv.grandTotal, 0);
            data.push(salesSum);
        }

        // Retrieve current UI color settings
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        CanvasCharts.bar('weekly-sales-canvas', data, labels, {
            barColorStart: '#3b82f6',
            barColorEnd: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.1)',
            gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
            textColor: isDark ? '#94a3b8' : '#475569',
            valueColor: '#3b82f6'
        });
    }

    static drawMonthlyRevenueChart(invoices) {
        const today = new Date();
        const data = [];
        const labels = [];

        // Dynamic 7-day cumulative projection trends
        let cumulativeVal = 0;
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            
            labels.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
            
            const salesSum = invoices
                .filter(inv => inv.date.startsWith(dateStr))
                .reduce((sum, inv) => sum + inv.grandTotal, 0);
            
            cumulativeVal += salesSum;
            data.push(cumulativeVal);
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        CanvasCharts.line('monthly-rev-canvas', data, labels, {
            lineColor: '#10b981',
            areaColorStart: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(5, 150, 105, 0.15)',
            dotColor: '#059669',
            gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
            textColor: isDark ? '#94a3b8' : '#475569'
        });
    }

    static openQuickExpenseModal() {
        const content = `
            <form id="quick-expense-form">
                <div class="form-group">
                    <label for="exp-category">Expense Category</label>
                    <select id="exp-category" class="input-field">
                        <option value="Rent">Premises Rent</option>
                        <option value="Utilities">Electricity & Utility Bills</option>
                        <option value="Salaries">Staff Salary Payments</option>
                        <option value="Logistics">Medicine Shipments / Logistics</option>
                        <option value="Miscellaneous">Miscellaneous expenses</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="exp-desc">Description details</label>
                    <input type="text" id="exp-desc" class="input-field" placeholder="Enter short note" required>
                </div>
                <div class="form-group">
                    <label for="exp-amount">Amount (₹)</label>
                    <input type="number" id="exp-amount" class="input-field" step="0.01" min="1" placeholder="Enter amount" required>
                </div>
            </form>
        `;

        Dialog.showCustomModal('quick-expense-modal', 'Create New Expense Outlay', content, [
            {
                text: 'Cancel',
                class: 'btn-secondary'
            },
            {
                text: 'Log Expense',
                class: 'btn-primary',
                click: (close, overlay) => {
                    const form = overlay.querySelector('#quick-expense-form');
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }

                    const category = overlay.querySelector('#exp-category').value;
                    const description = overlay.querySelector('#exp-desc').value;
                    const amount = parseFloat(overlay.querySelector('#exp-amount').value);

                    const newExp = {
                        date: new Date().toISOString().split('T')[0],
                        category,
                        description,
                        amount
                    };

                    AppStorage.save('expenses', newExp);
                    Toast.success("Expense logged into ledger ledger!");
                    close();

                    // Re-scan storage to reflect on notifications in header
                    if (window.App) window.App.runRealtimeScanner();
                }
            }
        ]);
    }
}

// Attach class to window immediately
window.DashboardView = DashboardView;
