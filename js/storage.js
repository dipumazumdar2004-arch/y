/**
 * Aegis Medicas ERP - LocalStorage Database Layer
 * Reusable storage module for CRUD operations and production seed defaults.
 */

class AppStorage {
    // Base helper methods for LocalStorage
    static get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`Error reading ${key} from LocalStorage`, e);
            return null;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Error writing ${key} to LocalStorage`, e);
            return false;
        }
    }

    // Generic CRUD Methods
    static getAll(collection) {
        return this.get(collection) || [];
    }

    static getById(collection, id) {
        const list = this.getAll(collection);
        return list.find(item => item.id === id) || null;
    }

    static save(collection, item) {
        const list = this.getAll(collection);
        if (item.id) {
            // Update existing
            const index = list.findIndex(i => i.id === item.id);
            if (index !== -1) {
                list[index] = { ...list[index], ...item, updatedAt: new Date().toISOString() };
            } else {
                list.push(item);
            }
        } else {
            // Create new
            item.id = 'ID_' + Math.random().toString(36).substr(2, 9).toUpperCase();
            item.createdAt = new Date().toISOString();
            item.updatedAt = item.createdAt;
            list.push(item);
        }
        this.set(collection, list);
        return item;
    }

    static delete(collection, id) {
        const list = this.getAll(collection);
        const filtered = list.filter(item => item.id !== id);
        this.set(collection, filtered);
        return true;
    }

    // Custom initialization with seed data
    static init() {
        // Force clear old mock data once to establish a clean-slate production database
        if (!localStorage.getItem('erp_production_reset')) {
            localStorage.clear();
            this.seedData();
            localStorage.setItem('erp_production_reset', 'true');
            localStorage.setItem('erp_initialized', 'true');
        }
    }

    static seedData() {
        // 1. Settings (Generic Company Profile Settings)
        const settings = {
            companyName: 'My Pharmacy Shop',
            companyAddress: 'Enter Business Address Details Here',
            companyPhone: '+91 XXXXXXXXXX',
            companyGst: 'Enter GSTIN ID',
            logoUrl: '',
            invoiceFooter: 'Thank you for your business. Stay Healthy!',
            currency: '₹',
            lowStockThreshold: 15
        };
        this.set('settings', settings);

        // 2. Employees (Preserved credential access logs)
        const employees = [
            { id: 'EMP_001', name: 'Store Administrator', role: 'Admin', email: 'admin@pharmacy.com', phone: '+91 9999988888', status: 'Active' },
            { id: 'EMP_002', name: 'Chief Pharmacist', role: 'Pharmacist', email: 'pharmacist@pharmacy.com', phone: '+91 9888877777', status: 'Active' },
            { id: 'EMP_003', name: 'Cashier Clerk', role: 'Cashier', email: 'cashier@pharmacy.com', phone: '+91 9777766666', status: 'Active' }
        ];
        this.set('employees', employees);

        // 3. Clear slate for transaction and inventory collections
        this.set('customers', []);
        this.set('suppliers', []);
        this.set('medicines', []);
        this.set('invoices', []);
        this.set('purchases', []);
        this.set('returns', []);
        this.set('expenses', []);
    }
}

// Auto init on page load
AppStorage.init();
