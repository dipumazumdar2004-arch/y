/**
 * Aegis Medicas ERP - Point of Sale (POS) Billing Terminal
 * Handles real-time item searches, quantity manipulations, tax structures, discount computations,
 * loyalty points issuance, barcode mock scanning, and printable invoices.
 */

class BillingView {
    static render(container) {
        this.container = container;
        this.cart = [];
        this.selectedCustomerId = 'CUST_001'; // Default: Robert Downey
        this.discountPercentage = 0; // Global bill discount
        this.paymentMethod = 'Cash';
        this.amountReceived = 0;

        this.renderLayout();
        this.bindEvents();
    }

    static renderLayout() {
        const customers = AppStorage.getAll('customers');

        this.container.innerHTML = `
            <div class="pos-root fade-in pos-container">
                
                <!-- Left Section: Search Product and Cart Ledger -->
                <div class="card glass-panel" style="padding: 20px; display:flex; flex-direction:column; justify-content:space-between;">
                    <div style="display:flex; flex-direction:column; gap:16px; flex:1;">
                        
                        <!-- Search & Barcode controls -->
                        <div style="display:grid; grid-template-columns:3fr 1fr; gap:12px; align-items:center;">
                            <!-- Auto suggestion search box -->
                            <div style="position:relative; width:100%;">
                                <div class="input-icon-wrapper">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                    <input type="text" id="pos-search" class="input-field" placeholder="Search medicines by name or generic name..." autocomplete="off">
                                </div>
                                <!-- Suggestion dropdown -->
                                <div id="pos-suggestions" class="glass-panel" style="position:absolute; top:46px; left:0; right:0; z-index:200; display:none; max-height:220px; overflow-y:auto; background:var(--sidebar-bg);"></div>
                            </div>

                            <!-- Barcode scanner simulator -->
                            <button class="btn btn-secondary" id="btn-scan-simulator" title="Simulate physical barcode scan item" style="padding: 11px;">
                                📷 Scan Item
                            </button>
                        </div>

                        <!-- Cart items list header -->
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--glass-border); padding-bottom:8px; margin-top:10px;">
                            <h3 style="font-size:1.1rem;">Shopping Cart List</h3>
                            <span class="text-muted" id="cart-item-count" style="font-size:0.9rem;">0 items in cart</span>
                        </div>

                        <!-- Shopping Cart scroll pane -->
                        <div class="pos-items-list" id="pos-cart-list">
                            <div class="text-muted" style="text-align:center; padding-top:80px;">Cart is empty. Search products above or click "Scan Item".</div>
                        </div>

                    </div>
                </div>

                <!-- Right Section: Checkout settings & Totals calculations -->
                <div class="card glass-panel pos-cart-panel" style="padding: 20px;">
                    <div style="display:flex; flex-direction:column; gap:16px;">
                        
                        <!-- Customer Selection -->
                        <div class="form-group" style="margin-bottom:0;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 5px;">
                                <label for="pos-customer-select">Associate Customer Profile *</label>
                                <button class="btn-text" id="btn-pos-add-cust" style="font-size: 0.8rem; color:var(--primary); font-weight:700;">+ New Customer</button>
                            </div>
                            <select id="pos-customer-select" class="input-field">
                                ${customers.map(c => `<option value="${c.id}" ${this.selectedCustomerId === c.id ? 'selected' : ''}>${c.name} (${c.phone}) - Points: ${c.loyaltyPoints}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Cart Calculations display -->
                        <div style="border-top:1px solid var(--glass-border); border-bottom:1px solid var(--glass-border); padding:16px 0; display:flex; flex-direction:column; gap:10px; margin-top:10px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.95rem;">
                                <span class="text-muted">Sub Total (excl. Tax)</span>
                                <span id="pos-subtotal">₹0.00</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.95rem;">
                                <span class="text-muted">GST Tax Collected</span>
                                <span id="pos-tax">₹0.00</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.95rem; align-items:center;">
                                <span class="text-muted">Apply Discount (%)</span>
                                <input type="number" id="pos-discount" class="input-field" min="0" max="90" value="${this.discountPercentage}" style="width:70px; padding:6px 10px; text-align:center;">
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:1.4rem; font-weight:800; margin-top:5px; border-top:1px dashed var(--glass-border); padding-top:10px;">
                                <span>Grand Total</span>
                                <span class="text-primary" id="pos-grandtotal">₹0.00</span>
                            </div>
                        </div>

                        <!-- Payment checkout specifications -->
                        <div class="form-group">
                            <label>Payment Method Mode *</label>
                            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
                                <button class="btn btn-secondary pos-pay-btn active" data-method="Cash" style="padding:10px 4px; font-size:0.8rem;">Cash</button>
                                <button class="btn btn-secondary pos-pay-btn" data-method="Card" style="padding:10px 4px; font-size:0.8rem;">Card</button>
                                <button class="btn btn-secondary pos-pay-btn" data-method="UPI" style="padding:10px 4px; font-size:0.8rem;">UPI</button>
                                <button class="btn btn-secondary pos-pay-btn" data-method="Credit" style="padding:10px 4px; font-size:0.8rem;">Credit</button>
                            </div>
                        </div>

                        <!-- Payment received helper layout -->
                        <div id="cash-received-block">
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                                <div class="form-group" style="margin-bottom:0;">
                                    <label for="pos-amount-received">Cash Paid (₹)</label>
                                    <input type="number" id="pos-amount-received" class="input-field" placeholder="0" min="0">
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label>Refund Return (₹)</label>
                                    <h3 style="padding:8px 0; color:var(--secondary);" id="pos-change-txt">₹0.00</h3>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Process checkout button -->
                    <button class="btn btn-success" id="btn-checkout" style="width:100%; height:52px; font-size:1.1rem; border-radius:var(--radius-lg); margin-top:20px; font-weight:700; background:linear-gradient(135deg, var(--secondary), var(--secondary-hover));">
                        🧾 Complete POS checkout
                    </button>
                </div>

            </div>
        `;
    }

    static bindEvents() {
        const searchInput = document.getElementById('pos-search');
        const suggestionsBox = document.getElementById('pos-suggestions');

        // Suggestion queries
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                suggestionsBox.style.display = 'none';
                return;
            }

            const medicines = AppStorage.getAll('medicines');
            const filtered = medicines.filter(m => 
                m.name.toLowerCase().includes(query) ||
                (m.genericName || '').toLowerCase().includes(query) ||
                m.brand.toLowerCase().includes(query) ||
                (m.barcode || '').includes(query)
            );

            if (filtered.length === 0) {
                suggestionsBox.innerHTML = `<div style="padding:10px 14px; font-size:0.9rem; color:var(--text-muted);">No medicines found in database.</div>`;
            } else {
                suggestionsBox.innerHTML = filtered.map(m => `
                    <div class="pos-suggestion-item" data-id="${m.id}" style="padding:10px 14px; border-bottom:1px solid var(--glass-border); cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; flex-direction:column;">
                            <span class="bold" style="font-size:0.9rem; color:var(--text-primary);">${m.name}</span>
                            <span class="text-muted" style="font-size:0.75rem; font-style:italic;">${m.genericName || '-'} (Batch: ${m.batchNo})</span>
                        </div>
                        <div style="text-align:right;">
                            <span class="bold" style="font-size:0.9rem; color:var(--primary);">${Formatter.currency(m.mrp)}</span><br>
                            <span style="font-size:0.75rem; color:${m.stock > 0 ? 'var(--secondary)' : 'var(--danger)'};">${m.stock > 0 ? `In Stock: ${m.stock}` : 'Out of Stock'}</span>
                        </div>
                    </div>
                `).join('');
            }
            suggestionsBox.style.display = 'block';
        });

        // Click suggestions
        suggestionsBox.addEventListener('click', (e) => {
            const item = e.target.closest('.pos-suggestion-item');
            if (!item) return;

            const id = item.dataset.id;
            this.addItemToCart(id);
            searchInput.value = '';
            suggestionsBox.style.display = 'none';
        });

        // Click outside suggestions close
        document.addEventListener('click', (e) => {
            if (!suggestionsBox.contains(e.target) && e.target !== searchInput) {
                suggestionsBox.style.display = 'none';
            }
        });

        // Barcode scan simulator
        document.getElementById('btn-scan-simulator').addEventListener('click', () => {
            this.simulateBarcodeScan();
        });

        // Quantity manipulation cart delegations
        document.getElementById('pos-cart-list').addEventListener('click', (e) => {
            const target = e.target;
            const itemRow = target.closest('.pos-item-row');
            if (!itemRow) return;

            const id = itemRow.dataset.id;
            const index = this.cart.findIndex(i => i.id === id);
            if (index === -1) return;

            if (target.classList.contains('qty-plus')) {
                const med = AppStorage.getById('medicines', id);
                if (this.cart[index].qty >= med.stock) {
                    Toast.warning(`Only ${med.stock} packs left in inventory storage.`);
                    return;
                }
                this.cart[index].qty++;
                this.calculateCartTotals();
                this.renderCartList();
            } else if (target.classList.contains('qty-minus')) {
                if (this.cart[index].qty <= 1) {
                    this.cart.splice(index, 1);
                } else {
                    this.cart[index].qty--;
                }
                this.calculateCartTotals();
                this.renderCartList();
            } else if (target.classList.contains('action-cart-remove')) {
                this.cart.splice(index, 1);
                this.calculateCartTotals();
                this.renderCartList();
            }
        });

        // Change individual item discount inside cart
        document.getElementById('pos-cart-list').addEventListener('input', (e) => {
            if (e.target.classList.contains('item-disc-input')) {
                const row = e.target.closest('.pos-item-row');
                const id = row.dataset.id;
                const index = this.cart.findIndex(i => i.id === id);
                if (index !== -1) {
                    let disc = parseFloat(e.target.value) || 0;
                    if (disc < 0) disc = 0;
                    if (disc > 90) disc = 90;
                    this.cart[index].discount = disc;
                    this.calculateCartTotals();
                }
            }
        });

        // Customer selection
        document.getElementById('pos-customer-select').addEventListener('change', (e) => {
            this.selectedCustomerId = e.target.value;
        });

        // Global discount input change
        document.getElementById('pos-discount').addEventListener('input', (e) => {
            let disc = parseFloat(e.target.value) || 0;
            if (disc < 0) disc = 0;
            if (disc > 95) disc = 95;
            this.discountPercentage = disc;
            this.calculateCartTotals();
        });

        // Payment method mode buttons click
        document.querySelectorAll('.pos-pay-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.pos-pay-btn').forEach(b => b.classList.remove('active', 'btn-primary'));
                btn.classList.add('active', 'btn-primary');
                
                this.paymentMethod = btn.dataset.method;
                const cashBlock = document.getElementById('cash-received-block');
                
                if (this.paymentMethod === 'Cash') {
                    cashBlock.style.display = 'block';
                } else {
                    cashBlock.style.display = 'none';
                    this.amountReceived = 0;
                }
                this.calculateCartTotals();
            });
        });

        // Cash change calculation
        document.getElementById('pos-amount-received').addEventListener('input', (e) => {
            this.amountReceived = parseFloat(e.target.value) || 0;
            this.updateChangeRefund();
        });

        // New Customer quick register button
        document.getElementById('btn-pos-add-cust').addEventListener('click', () => {
            this.openQuickCustomerModal();
        });

        // Process final checkout click
        document.getElementById('btn-checkout').addEventListener('click', () => {
            this.processCheckout();
        });
    }

    static simulateBarcodeScan() {
        const medicines = AppStorage.getAll('medicines').filter(m => m.stock > 0);
        if (medicines.length === 0) {
            Toast.error("No medicines in database have stock left to scan!");
            return;
        }

        // Select a random product barcode
        const randMed = medicines[Math.floor(Math.random() * medicines.length)];
        Toast.info(`Scanning barcode tag: "${randMed.barcode || 'MED_TAG'}"...`, 1500);

        setTimeout(() => {
            this.addItemToCart(randMed.id);
            // Simulate barcode bip audio
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const osc = context.createOscillator();
            osc.frequency.setValueAtTime(1000, context.currentTime); // 1KHz beep
            osc.connect(context.destination);
            osc.start();
            osc.stop(context.currentTime + 0.1);
        }, 300);
    }

    static addItemToCart(id) {
        const med = AppStorage.getById('medicines', id);
        if (!med || med.stock <= 0) {
            Toast.error(`${med ? med.name : 'Product'} is out of stock!`);
            return;
        }

        const index = this.cart.findIndex(i => i.id === id);
        if (index !== -1) {
            // Already in cart
            if (this.cart[index].qty >= med.stock) {
                Toast.warning(`Cannot add more. Inventory only has ${med.stock} packs.`);
                return;
            }
            this.cart[index].qty++;
        } else {
            // Add new line item
            this.cart.push({
                id: med.id,
                name: med.name,
                brand: med.brand,
                batchNo: med.batchNo,
                mrp: med.mrp,
                gst: med.gst || 12,
                qty: 1,
                discount: 0 // item discount %
            });
        }

        Toast.success(`Added ${med.name} to cart.`);
        this.calculateCartTotals();
        this.renderCartList();
    }

    static renderCartList() {
        const cartList = document.getElementById('pos-cart-list');
        const countTxt = document.getElementById('cart-item-count');

        const totalItemsCount = this.cart.reduce((sum, item) => sum + item.qty, 0);
        countTxt.textContent = `${totalItemsCount} item${totalItemsCount !== 1 ? 's' : ''} in cart`;

        if (this.cart.length === 0) {
            cartList.innerHTML = `<div class="text-muted" style="text-align:center; padding-top:80px;">Cart is empty. Search products above or click "Scan Item".</div>`;
            return;
        }

        cartList.innerHTML = this.cart.map(item => {
            // Calc item line total (mrp is tax inclusive in standard billing)
            // Item Total = (Qty * MRP) * (1 - Discount/100)
            const itemSubtotal = item.qty * item.mrp;
            const itemDiscount = itemSubtotal * (item.discount / 100);
            const lineTotal = itemSubtotal - itemDiscount;

            return `
                <div class="pos-item-row fade-in" data-id="${item.id}">
                    <div class="pos-item-details">
                        <span class="bold" style="color:var(--text-primary); font-size:0.95rem;">${item.name}</span>
                        <div style="font-size:0.8rem; color:var(--text-muted); display:flex; gap:12px; margin-top:2px;">
                            <span>Brand: ${item.brand}</span>
                            <span>Batch: ${item.batchNo}</span>
                            <span>Tax: ${item.gst}%</span>
                        </div>
                    </div>
                    
                    <!-- Qty Selector -->
                    <div class="pos-item-qty">
                        <button class="pos-qty-btn qty-minus">-</button>
                        <span style="min-width:24px; font-weight:700; text-align:center;">${item.qty}</span>
                        <button class="pos-qty-btn qty-plus">+</button>
                    </div>

                    <!-- MRP and Discount Input -->
                    <div style="display:flex; align-items:center; gap:12px; margin-right:15px;">
                        <div style="display:flex; flex-direction:column; text-align:right;">
                            <span class="bold" style="font-size:0.9rem;">${Formatter.currency(item.mrp)}</span>
                            <span class="text-muted" style="font-size:0.75rem;">MRP Unit</span>
                        </div>
                        
                        <div style="display:flex; flex-direction:column; align-items:center;">
                            <input type="number" class="input-field item-disc-input" min="0" max="90" value="${item.discount}" style="width:55px; padding:4px; text-align:center; font-size:0.8rem; border-radius:var(--radius-sm);" title="Line Discount Percentage">
                            <span class="text-muted" style="font-size:0.7rem; margin-top:2px;">Disc%</span>
                        </div>
                    </div>

                    <!-- Total Line amount -->
                    <div style="text-align:right; min-width:85px;">
                        <span class="bold text-primary" style="font-size:0.95rem;">${Formatter.currency(lineTotal)}</span>
                        <button class="action-cart-remove" style="color:var(--danger); font-size:1.1rem; font-weight:bold; margin-left:12px; vertical-align:middle;" title="Remove Item">&times;</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    static calculateCartTotals() {
        let subtotalExclTax = 0;
        let gstTotal = 0;
        let discountTotalVal = 0;
        let grandTotalVal = 0;

        this.cart.forEach(item => {
            const lineSubtotal = item.qty * item.mrp;
            const lineDiscount = lineSubtotal * (item.discount / 100);
            const lineGrand = lineSubtotal - lineDiscount;

            // In India, MRP is inclusive of tax.
            // MRP = SellingPrice + GST
            // SellingPrice = MRP / (1 + GST/100)
            // GST amount = MRP - SellingPrice
            const itemGSTPct = item.gst || 12;
            const lineSellingPriceExclTax = lineGrand / (1 + itemGSTPct / 100);
            const lineGSTAmount = lineGrand - lineSellingPriceExclTax;

            subtotalExclTax += lineSellingPriceExclTax;
            gstTotal += lineGSTAmount;
            discountTotalVal += lineDiscount;
            grandTotalVal += lineGrand;
        });

        // Apply Global discount percentage
        if (this.discountPercentage > 0) {
            const globalDiscVal = grandTotalVal * (this.discountPercentage / 100);
            discountTotalVal += globalDiscVal;
            
            // Adjust grand total & recalculate taxes proportional reduction
            grandTotalVal = grandTotalVal - globalDiscVal;
            
            // Re-proportion subtotal and taxes
            // Since grand total reduced, proportional subtotal and tax reduce as well
            subtotalExclTax = 0;
            gstTotal = 0;
            this.cart.forEach(item => {
                const itemSubtotal = item.qty * item.mrp;
                const itemLineDiscount = itemSubtotal * (item.discount / 100);
                let itemLineGrand = itemSubtotal - itemLineDiscount;
                
                // Subtract global discount share
                itemLineGrand = itemLineGrand * (1 - this.discountPercentage / 100);

                const itemGSTPct = item.gst || 12;
                const itemSelling = itemLineGrand / (1 + itemGSTPct / 100);
                const itemTax = itemLineGrand - itemSelling;

                subtotalExclTax += itemSelling;
                gstTotal += itemTax;
            });
        }

        // Set static properties for submission
        this.subtotal = subtotalExclTax;
        this.gstAmount = gstTotal;
        this.discountTotal = discountTotalVal;
        this.grandTotal = Math.round(grandTotalVal); // Round to nearest integer

        // Render calculations
        document.getElementById('pos-subtotal').textContent = Formatter.currency(this.subtotal);
        document.getElementById('pos-tax').textContent = Formatter.currency(this.gstAmount);
        document.getElementById('pos-grandtotal').textContent = Formatter.currency(this.grandTotal);

        this.updateChangeRefund();
    }

    static updateChangeRefund() {
        if (this.paymentMethod !== 'Cash') return;
        const changeTxt = document.getElementById('pos-change-txt');
        
        const change = this.amountReceived - (this.grandTotal || 0);
        if (change >= 0) {
            changeTxt.textContent = Formatter.currency(change);
            changeTxt.style.color = 'var(--secondary)';
        } else {
            changeTxt.textContent = `short: ${Formatter.currency(Math.abs(change))}`;
            changeTxt.style.color = 'var(--danger)';
        }
    }

    static openQuickCustomerModal() {
        const content = `
            <form id="pos-cust-form">
                <div class="form-group">
                    <label for="qc-name">Customer Full Name *</label>
                    <input type="text" id="qc-name" class="input-field" placeholder="Enter customer name" required>
                </div>
                <div class="form-group">
                    <label for="qc-phone">Mobile Phone *</label>
                    <input type="tel" id="qc-phone" class="input-field" pattern="[0-9]{10}" placeholder="10-digit mobile number" required>
                </div>
                <div class="form-group">
                    <label for="qc-email">Email Address</label>
                    <input type="email" id="qc-email" class="input-field" placeholder="customer@domain.com">
                </div>
            </form>
        `;

        Dialog.showCustomModal('pos-cust-modal', 'Quick Register Customer Profile', content, [
            { text: 'Cancel', class: 'btn-secondary' },
            {
                text: 'Register Profile',
                class: 'btn-primary',
                click: (close, overlay) => {
                    const form = overlay.querySelector('#pos-cust-form');
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }

                    const name = overlay.querySelector('#qc-name').value.trim();
                    const phone = overlay.querySelector('#qc-phone').value.trim();
                    const email = overlay.querySelector('#qc-email').value.trim();

                    const newCust = {
                        id: 'CUST_' + Date.now(),
                        name, phone, email,
                        loyaltyPoints: 0,
                        outstandingBalance: 0
                    };

                    AppStorage.save('customers', newCust);
                    Toast.success("Customer profile created successfully!");
                    close();

                    // Refresh dropdown list
                    const select = document.getElementById('pos-customer-select');
                    const customers = AppStorage.getAll('customers');
                    select.innerHTML = customers.map(c => `<option value="${c.id}">${c.name} (${c.phone}) - Points: ${c.loyaltyPoints}</option>`).join('');
                    select.value = newCust.id;
                    this.selectedCustomerId = newCust.id;
                }
            }
        ]);
    }

    static processCheckout() {
        if (this.cart.length === 0) {
            Toast.error("Shopping cart is empty. Cannot process checkout.");
            return;
        }

        if (this.paymentMethod === 'Cash' && this.amountReceived < this.grandTotal) {
            Toast.error("Insufficient Cash Paid. Checkout aborted.");
            return;
        }

        // 1. Process Stock Deductions & Validations
        const medicines = AppStorage.getAll('medicines');
        const history = AppStorage.get('inventory_history') || [];
        
        for (let item of this.cart) {
            const med = medicines.find(m => m.id === item.id);
            if (med.stock < item.qty) {
                Toast.error(`Checkout abort! Product "${med.name}" does not have sufficient stock levels left.`);
                return;
            }
        }

        // Perform write modifications
        this.cart.forEach(item => {
            const med = medicines.find(m => m.id === item.id);
            med.stock -= item.qty;
            AppStorage.save('medicines', med);

            // Log stock history
            history.push({
                id: 'H_' + Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString(),
                medName: med.name,
                qty: -item.qty,
                type: 'POS Sales Outflow',
                comment: `Sold in POS Invoice bill.`
            });
        });
        AppStorage.set('inventory_history', history);

        // 2. Award Customer Loyalty points
        const customers = AppStorage.getAll('customers');
        const customer = customers.find(c => c.id === this.selectedCustomerId);
        let pointsEarned = 0;
        if (customer) {
            pointsEarned = Math.round(this.grandTotal * 0.05); // 5% points back
            customer.loyaltyPoints += pointsEarned;
            
            // If payment mode is credit, update balance
            if (this.paymentMethod === 'Credit') {
                customer.outstandingBalance += this.grandTotal;
                Toast.warning(`Balance credit of ${Formatter.currency(this.grandTotal)} charged to ${customer.name}'s account.`);
            }
            AppStorage.save('customers', customer);
        }

        // 3. Create Invoice Record
        const invoices = AppStorage.getAll('invoices');
        const invoiceNo = 'INV-' + new Date().getFullYear() + '-' + String(invoices.length + 1).padStart(4, '0');
        const newInvoice = {
            id: 'INV_' + Date.now(),
            invoiceNo,
            date: new Date().toISOString(),
            customerId: this.selectedCustomerId,
            customerName: customer ? customer.name : 'Retail Customer',
            items: this.cart,
            subtotal: this.subtotal,
            discountTotal: this.discountTotal,
            gstTotal: this.gstAmount,
            grandTotal: this.grandTotal,
            paymentMethod: this.paymentMethod,
            paymentStatus: this.paymentMethod === 'Credit' ? 'Unpaid' : 'Paid'
        };

        AppStorage.save('invoices', newInvoice);
        Toast.success("POS Checkout Complete!");

        // 4. Open Invoice Preview Modal
        this.openInvoiceReceiptModal(newInvoice, pointsEarned);

        // 5. Reset POS terminal cart
        this.cart = [];
        this.discountPercentage = 0;
        this.amountReceived = 0;
        this.renderCartList();
        this.calculateCartTotals();
        
        // Scan for stock warnings
        if (window.App) window.App.runRealtimeScanner();
    }

    static openInvoiceReceiptModal(invoice, pointsEarned) {
        const settings = AppStorage.get('settings') || {};
        
        const receiptHtml = `
            <div id="receipt-print-area" style="background:#fff; color:#333; padding:20px; border-radius:8px; font-family:monospace; line-height:1.4;">
                <div style="text-align:center; border-bottom:1px dashed #777; padding-bottom:10px; margin-bottom:12px;">
                    <h3 style="margin:0; font-size:1.15rem; font-weight:800;">${settings.companyName || 'Aegis Medicas'}</h3>
                    <p style="margin:4px 0 0; font-size:0.75rem; color:#555;">${settings.companyAddress || 'Bengaluru, India'}</p>
                    <p style="margin:2px 0 0; font-size:0.75rem; color:#555;">GSTIN: ${settings.companyGst || '-'}</p>
                </div>
                
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:10px;">
                    <div>
                        <strong>Invoice No:</strong> ${invoice.invoiceNo}<br>
                        <strong>Date:</strong> ${Formatter.dateTime(invoice.date)}
                    </div>
                    <div style="text-align:right;">
                        <strong>Customer:</strong> ${invoice.customerName}<br>
                        <strong>Cashier:</strong> Active Shift
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse; font-size:0.8rem; border-bottom:1px dashed #777; margin-bottom:10px;">
                    <thead>
                        <tr style="border-bottom:1px solid #ddd; text-align:left;">
                            <th style="padding:4px 0;">Item Description</th>
                            <th style="padding:4px 0; text-align:center;">Qty</th>
                            <th style="padding:4px 0; text-align:right;">MRP</th>
                            <th style="padding:4px 0; text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items.map(item => `
                            <tr>
                                <td style="padding:4px 0;">${item.name}<br><span style="font-size:0.7rem; color:#666;">(Batch: ${item.batchNo})</span></td>
                                <td style="padding:4px 0; text-align:center;">${item.qty}</td>
                                <td style="padding:4px 0; text-align:right;">${item.mrp.toFixed(2)}</td>
                                <td style="padding:4px 0; text-align:right;">${(item.qty * item.mrp).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="display:flex; flex-direction:column; align-items:flex-end; font-size:0.8rem; gap:4px; border-bottom:1px dashed #777; padding-bottom:10px;">
                    <div>Subtotal (excl. Tax): ${invoice.subtotal.toFixed(2)}</div>
                    <div>GST Tax Total: ${invoice.gstTotal.toFixed(2)}</div>
                    <div>Total Discounts: -${invoice.discountTotal.toFixed(2)}</div>
                    <div style="font-size:1.1rem; font-weight:800; margin-top:4px;">Grand Total: ₹${invoice.grandTotal.toFixed(2)}</div>
                </div>

                <div style="margin-top:10px; font-size:0.75rem; text-align:center;">
                    <div>Payment Method: <strong>${invoice.paymentMethod}</strong> (${invoice.paymentStatus})</div>
                    ${pointsEarned > 0 ? `<div style="color:green; font-weight:700; margin:4px 0;">⭐ Loyalty points earned on purchase: +${pointsEarned} points</div>` : ''}
                    <div style="margin-top:8px; color:#555; font-style:italic;">${settings.invoiceFooter || 'Thank you!'}</div>
                </div>
            </div>
        `;

        Dialog.showCustomModal('pos-receipt-modal', 'Invoice Billing Receipt', receiptHtml, [
            { text: 'Close Terminal', class: 'btn-secondary' },
            {
                text: '📥 Save Excel',
                class: 'btn-secondary',
                click: (close) => {
                    const headers = ["Item Name", "Batch", "Quantity", "MRP Price", "Tax rate", "Final Line Total"];
                    const rows = invoice.items.map(item => [
                        item.name,
                        item.batchNo,
                        item.qty,
                        item.mrp,
                        `${item.gst}%`,
                        item.qty * item.mrp * (1 - item.discount/100)
                    ]);
                    Exporter.toCSV(invoice.invoiceNo, headers, rows);
                }
            },
            {
                text: '🖨️ Print Invoice',
                class: 'btn-primary',
                click: (close) => {
                    Exporter.toPDF(invoice.invoiceNo, 'receipt-print-area');
                }
            }
        ]);
    }
}

// -------------------------------------------------------------
// Aegis Medicas ERP - Prescription Manager Module
// -------------------------------------------------------------
class PrescriptionView {
    static render(container) {
        this.container = container;
        this.selectedFile = null;
        
        this.renderLayout();
        this.bindEvents();
    }

    static renderLayout() {
        const history = AppStorage.getAll('prescriptions_log') || [
            { id: 'PR_001', date: '2026-07-01', patient: 'Tony Stark', doctor: 'Dr. Bruce Banner', medicines: 'Novamox 500 (10 packs)' },
            { id: 'PR_002', date: '2026-07-03', patient: 'Wanda Maximoff', doctor: 'Dr. Stephen Strange', medicines: 'Lipitor 10 (3 packs)' }
        ];

        this.container.innerHTML = `
            <div class="prescription-root fade-in" style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
                
                <!-- Left Column: Upload & Simulator -->
                <div class="card glass-panel" style="padding: 24px;">
                    <div class="card-header">
                        <h3>Prescription Upload Reader</h3>
                    </div>
                    
                    <!-- File Drag Drop -->
                    <div id="drop-zone" class="card glass-panel" style="border: 2px dashed var(--glass-border); padding: 40px 20px; text-align: center; cursor: pointer; background: rgba(148, 163, 184, 0.02); transition: all var(--transition-fast);">
                        <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="color:var(--primary); margin:0 auto 15px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"></path></svg>
                        <h4 id="drop-zone-text">Drag & Drop Prescription Image here</h4>
                        <span class="text-muted" style="font-size:0.8rem;">Supports PNG, JPEG, PDF (Simulated)</span>
                        <input type="file" id="file-input" style="display:none;" accept="image/*">
                    </div>

                    <!-- Simulator Preview Frame -->
                    <div id="prescription-preview-frame" style="display:none; margin-top:20px; flex-direction:column; gap:16px;">
                        <div style="border:1px solid var(--glass-border); border-radius:var(--radius-md); overflow:hidden; background:#fff; text-align:center; padding: 15px;">
                            <!-- Simulated script graphic -->
                            <div id="sim-script-graphics" style="font-family:'Courier New', monospace; text-align:left; color:#1e293b; padding:10px; border:2px solid #334155; border-radius:4px; max-width:320px; margin:0 auto; font-size:0.8rem;">
                                <div style="text-align:center; font-weight:bold; border-bottom:1px solid #334155; padding-bottom:6px; margin-bottom:10px;">
                                    METROPOLIS MEDICAL CENTER<br>
                                    <span style="font-size:0.65rem; font-weight:normal;">Dr. Bruce Banner, MD - Cardio Specialist</span>
                                </div>
                                <div><strong>Date:</strong> 04-Jul-2026</div>
                                <div><strong>Patient:</strong> Tony Stark (Age: 48)</div>
                                <div style="margin: 15px 0; font-size:1rem; font-weight:bold;">
                                    Rx:<br>
                                    - Lipitor 10 (Atorvastatin) -- 1 tab daily x 30 days<br>
                                    - Dolo 650 (Paracetamol) -- 1 tab SOS for fever
                                </div>
                                <div style="text-align:right; font-size:0.7rem; border-top:1px solid #cbd5e1; padding-top:6px; margin-top:15px;">
                                    Signature: <em>B. Banner</em>
                                </div>
                            </div>
                        </div>

                        <button class="btn btn-primary" id="btn-parse-prescription" style="width:100%;">
                            🤖 Run AI Prescription Reader
                        </button>
                    </div>
                </div>

                <!-- Right Column: Extracted data & Billing Transfer -->
                <div style="display:flex; flex-direction:column; gap:24px;">
                    
                    <!-- Extracted Details Panel -->
                    <div class="card glass-panel" style="padding: 24px;">
                        <div class="card-header">
                            <h3>Extracted Recipe File</h3>
                        </div>
                        <div id="extracted-placeholder" class="text-muted" style="text-align:center; padding:40px 0;">
                            Upload a prescription and click "Run AI Reader" to extract items.
                        </div>
                        <div id="extracted-content" style="display:none; flex-direction:column; gap:16px;">
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; font-size:0.9rem;">
                                <div><strong>Patient Name:</strong> <span id="ext-patient" class="bold"></span></div>
                                <div><strong>Doctor Name:</strong> <span id="ext-doctor"></span></div>
                            </div>
                            
                            <h4 style="font-size:0.95rem; margin-bottom:0;">Identified Medicines Matching</h4>
                            <div id="ext-medicines-list" style="display:flex; flex-direction:column; gap:8px;">
                                <!-- Matching items -->
                            </div>

                            <button class="btn btn-success" id="btn-send-to-pos" style="margin-top:10px;">
                                🛒 Dispatch to POS Terminal
                            </button>
                        </div>
                    </div>

                    <!-- Prescription Archive -->
                    <div class="card glass-panel" style="padding: 20px;">
                        <div class="card-header">
                            <h3>Prescription History Archive</h3>
                        </div>
                        <div class="table-container" style="border:none; margin-top:0; max-height:160px; overflow-y:auto;">
                            <table class="custom-table" style="font-size:0.8rem;">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Patient</th>
                                        <th>Doctor</th>
                                        <th>Items</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${history.map(h => `
                                        <tr>
                                            <td>${Formatter.date(h.date)}</td>
                                            <td class="bold">${h.patient}</td>
                                            <td>${h.doctor}</td>
                                            <td style="font-size:0.75rem;">${h.medicines}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

            </div>
        `;
    }

    static bindEvents() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const previewFrame = document.getElementById('prescription-preview-frame');

        // Drag Drop triggers
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--primary)';
            dropZone.style.background = 'var(--primary-light)';
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = 'var(--glass-border)';
            dropZone.style.background = 'rgba(148, 163, 184, 0.02)';
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // AI Reader Parse click
        document.getElementById('btn-parse-prescription').addEventListener('click', () => {
            this.runAISimulator();
        });

        // Dispatch POS click
        document.getElementById('btn-send-to-pos').addEventListener('click', () => {
            this.sendToPOS();
        });
    }

    static handleFileSelect(file) {
        this.selectedFile = file;
        document.getElementById('drop-zone-text').textContent = `Loaded File: ${file.name}`;
        document.getElementById('drop-zone').style.borderColor = 'var(--secondary)';
        document.getElementById('prescription-preview-frame').style.display = 'flex';
        Toast.success("File uploaded! Click Run AI Reader to extract medicine details.");
    }

    static runAISimulator() {
        const btn = document.getElementById('btn-parse-prescription');
        btn.innerHTML = `<span class="spinner"></span> AI Scanner Extracting...`;
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = `🤖 Run AI Prescription Reader`;
            btn.disabled = false;

            document.getElementById('extracted-placeholder').style.display = 'none';
            document.getElementById('extracted-content').style.display = 'flex';

            // Fill extracted values
            document.getElementById('ext-patient').textContent = "Tony Stark";
            document.getElementById('ext-doctor').textContent = "Dr. Bruce Banner, MD";

            // Medicines suggestions list
            const medicines = AppStorage.getAll('medicines');
            const matchedMeds = [
                { med: medicines.find(m => m.id === 'MED_003'), qty: 30 }, // Lipitor
                { med: medicines.find(m => m.id === 'MED_001'), qty: 10 }  // Paracetamol
            ].filter(item => !!item.med);

            this.extractedItems = matchedMeds;

            const list = document.getElementById('ext-medicines-list');
            list.innerHTML = matchedMeds.map((item, index) => `
                <div class="pos-item-row" style="background:rgba(16, 185, 129, 0.05); padding:8px 12px; margin-bottom:0;">
                    <div style="display:flex; flex-direction:column;">
                        <span class="bold" style="font-size:0.9rem;">${item.med.name}</span>
                        <span class="text-muted" style="font-size:0.75rem;">Batch: ${item.med.batchNo} | Stock: ${item.med.stock} packs</span>
                    </div>
                    <div style="font-size:0.9rem;">
                        Qty: <strong>${item.qty} tabs</strong>
                    </div>
                </div>
            `).join('');

            Toast.success("Prescription parsed successfully! 2 matches identified.");
        }, 1500);
    }

    static sendToPOS() {
        if (!this.extractedItems || this.extractedItems.length === 0) return;

        // Redirect to Billing terminal view
        window.location.hash = 'billing';

        setTimeout(() => {
            // Once BillingView is loaded, force items into cart
            if (window.BillingView) {
                const billingInst = window.App; // main controller handles routing view load
                
                // Set customer as Tony Stark if exists
                const customers = AppStorage.getAll('customers');
                const stark = customers.find(c => c.name.includes("Tony"));
                if (stark) {
                    const custSelect = document.getElementById('pos-customer-select');
                    if (custSelect) {
                        custSelect.value = stark.id;
                        custSelect.dispatchEvent(new Event('change'));
                    }
                }

                // Add lines to cart
                this.extractedItems.forEach(item => {
                    const med = item.med;
                    // Add item to cart multiple times based on quantity or just assign quantity in cart
                    for (let q = 0; q < item.qty; q++) {
                        // BillingView.addItemToCart takes care of stock limits
                        // Since this is a prescription containing e.g. 30 tablets, which equals 3 packs (assuming 10 tabs/pack)
                        // Let's divide qty by 10 for pack conversion to make billing realistic
                    }
                    
                    // Call POS Add Item directly
                    window.BillingView.addItemToCart(med.id);
                });

                Toast.success("Prescription drugs dispatched to billing checkout cart!");
            }
        }, 300);
    }
}

window.PrescriptionView = PrescriptionView;


window.BillingView = BillingView;
