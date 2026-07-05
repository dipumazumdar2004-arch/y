/**
 * Aegis Medicas ERP - SPA Shell Controller & Router
 * Handles authentication checks, theme switching, collapsible sidebars,
 * notifications engine, and dynamic route loading.
 */

class AppController {
    constructor() {
        this.activeUser = null;
        this.currentView = null;
        this.notifDrawerOpen = false;
        
        this.init();
    }

    init() {
        // 1. Session check
        this.activeUser = AppStorage.get('erp_active_user');
        if (!this.activeUser) {
            window.location.href = 'login.html';
            return;
        }

        // 2. Setup user display
        this.setupUserUI();

        // 2b. Setup company branding display
        this.setupCompanyUI();

        // 3. Initialize components & Event Listeners
        this.initLayoutListeners();
        this.initTheme();
        this.initRouter();
        this.runRealtimeScanner(); // Scans database for warnings

        // 4. Load initial route based on hash or default to dashboard
        const initialHash = window.location.hash.replace('#', '') || 'dashboard';
        this.navigate(initialHash);
    }

    setupUserUI() {
        // Update user name and role
        document.getElementById('user-display-name').textContent = this.activeUser.name;
        document.getElementById('user-display-role').textContent = this.activeUser.role + ' ' + (this.activeUser.role === 'Admin' ? '👤' : '💊');
        
        // Generate avatar initials
        const parts = this.activeUser.name.split(' ');
        const initials = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
        document.getElementById('user-avatar-initials').textContent = initials;

        // User widget logout binding
        document.getElementById('profile-widget').addEventListener('click', async () => {
            const logout = await Dialog.confirm({
                title: 'Sign Out Session',
                message: 'Do you want to log out from Aegis Medicas workspace?',
                confirmText: 'Sign Out',
                cancelText: 'Stay',
                type: 'warning'
            });
            if (logout) {
                AppStorage.delete('erp_active_user', ''); // Clear key
                localStorage.removeItem('erp_active_user');
                Toast.info("Session terminated successfully.");
                setTimeout(() => window.location.href = 'login.html', 800);
            }
        });
    }

    setupCompanyUI() {
        const settings = AppStorage.get('settings');
        if (settings && settings.companyName) {
            const logoText = document.querySelector('.logo-text');
            if (logoText) logoText.textContent = settings.companyName;
            
            // Sync dashboard page title tab
            document.title = `${settings.companyName} - Workspace`;
        }
    }

    initLayoutListeners() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle');
        const notifToggle = document.getElementById('notifications-toggle');
        const notifDrawer = document.getElementById('notification-drawer');
        const closeNotif = document.getElementById('close-notif-btn');

        // Sidebar Collapse/Expand (Desktop) & slide drawer (Mobile)
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('mobile-open');
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });

        // Close sidebar clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        });

        // Notifications Toggle Drawer
        notifToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleNotifDrawer(true);
        });

        closeNotif.addEventListener('click', () => {
            this.toggleNotifDrawer(false);
        });

        // Close notif drawer clicking outside
        document.addEventListener('click', (e) => {
            if (this.notifDrawerOpen && !notifDrawer.contains(e.target) && !notifToggle.contains(e.target)) {
                this.toggleNotifDrawer(false);
            }
        });

        // Local Calendar DateTime display
        const dateTxt = document.getElementById('current-date-txt');
        const updateDate = () => {
            const now = new Date();
            dateTxt.textContent = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) + ' | ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        };
        updateDate();
        setInterval(updateDate, 1000);

        // Sidebar module filter search
        const menuSearch = document.getElementById('menu-search');
        menuSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
                const text = item.querySelector('.menu-text').textContent.toLowerCase();
                if (text.includes(query)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    toggleNotifDrawer(show) {
        const notifDrawer = document.getElementById('notification-drawer');
        this.notifDrawerOpen = show;
        if (show) {
            notifDrawer.classList.add('open');
            this.runRealtimeScanner(); // Refresh list on open
        } else {
            notifDrawer.classList.remove('open');
        }
    }

    initTheme() {
        const themeSwitch = document.getElementById('theme-switch');
        let currentTheme = localStorage.getItem('erp_theme') || 'light';

        document.documentElement.setAttribute('data-theme', currentTheme);
        themeSwitch.setAttribute('title', `Switch to ${currentTheme === 'light' ? 'Dark' : 'Light'} Mode`);

        themeSwitch.addEventListener('click', () => {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', currentTheme);
            localStorage.setItem('erp_theme', currentTheme);
            themeSwitch.setAttribute('title', `Switch to ${currentTheme === 'light' ? 'Dark' : 'Light'} Mode`);
            
            // Re-render current view if it depends on theme color variables (like charts)
            this.navigate(this.currentView, true);
            Toast.success(`${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)} Mode Enabled!`);
        });
    }

    initRouter() {
        // Intercept clicks on links
        document.querySelectorAll('.sidebar-menu .menu-item').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                window.location.hash = view;
            });
        });

        // Hashchange listener
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '') || 'dashboard';
            this.navigate(hash);
        });
    }

    navigate(viewName, forceRefresh = false) {
        if (this.currentView === viewName && !forceRefresh) return;

        // View validation
        const viewRenderMap = {
            'dashboard': window.DashboardView,
            'medicine': window.MedicineView,
            'inventory': window.InventoryView,
            'billing': window.BillingView,
            'customer': window.CustomerView,
            'supplier': window.SupplierView,
            'purchase': window.PurchaseView,
            'prescription': window.PrescriptionView,
            'returns': window.ReturnsView,
            'employee': window.EmployeeView,
            'finance': window.FinanceView,
            'report': window.ReportView,
            'settings': window.SettingsView
        };

        const TargetViewClass = viewRenderMap[viewName];
        if (!TargetViewClass) {
            console.error(`Route "${viewName}" not registered.`);
            return;
        }

        // Close mobile menu if navigating
        document.getElementById('sidebar').classList.remove('mobile-open');

        // Update active sidebar link
        document.querySelectorAll('.sidebar-menu .menu-item').forEach(link => {
            if (link.dataset.view === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        const mainContent = document.getElementById('main-content');
        const viewTitle = document.getElementById('view-title');

        // Capitalize title
        viewTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1).replace('-', ' ');

        // Apply smooth transition
        mainContent.classList.add('fade-out');

        setTimeout(() => {
            mainContent.innerHTML = '';
            mainContent.classList.remove('fade-out');
            
            // Render View
            TargetViewClass.render(mainContent);
            this.currentView = viewName;
            
            // Add subtle slide-up effect
            mainContent.firstElementChild?.classList.add('slide-up');
        }, 200);
    }

    runRealtimeScanner() {
        const medicines = AppStorage.getAll('medicines');
        const suppliers = AppStorage.getAll('suppliers');
        const customers = AppStorage.getAll('customers');
        const settings = AppStorage.get('settings') || { lowStockThreshold: 15 };
        const today = new Date();

        const alerts = [];

        // 1. Low stock scanner
        medicines.forEach(m => {
            const minThreshold = m.minStock || settings.lowStockThreshold;
            if (m.stock <= 0) {
                alerts.push({
                    title: 'Out of Stock Alert 🔴',
                    desc: `${m.name} is completely out of stock! (Rack: ${m.rackNo || '-'})`,
                    type: 'error'
                });
            } else if (m.stock <= minThreshold) {
                alerts.push({
                    title: 'Low Stock Level 🟡',
                    desc: `${m.name} is low on stock (${m.stock} packs left).`,
                    type: 'warning'
                });
            }
        });

        // 2. Expiry scanner
        medicines.forEach(m => {
            if (!m.expiryDate) return;
            const expDate = new Date(m.expiryDate);
            const diffTime = expDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                alerts.push({
                    title: 'Expired Product Flag ❌',
                    desc: `${m.name} expired on ${Formatter.date(m.expiryDate)}. Remove from inventory immediately!`,
                    type: 'error'
                });
            } else if (diffDays <= 30) {
                alerts.push({
                    title: 'Expiry Warning ⏳',
                    desc: `${m.name} is expiring in ${diffDays} days (${Formatter.date(m.expiryDate)}).`,
                    type: 'warning'
                });
            }
        });

        // 3. Outstanding payment alert scanner
        suppliers.forEach(s => {
            if (s.pendingPayments > 10000) {
                alerts.push({
                    title: 'Supplier Dues Notification 💳',
                    desc: `High outstanding dues for ${s.name} (${Formatter.currency(s.pendingPayments)}).`,
                    type: 'info'
                });
            }
        });

        customers.forEach(c => {
            if (c.outstandingBalance > 300) {
                alerts.push({
                    title: 'Customer Credit Reminder 👤',
                    desc: `Bruce Banner has an outstanding credit balance of ${Formatter.currency(c.outstandingBalance)}.`,
                    type: 'info'
                });
            }
        });

        // Update Notification Badge count
        const badge = document.getElementById('notif-badge');
        if (alerts.length > 0) {
            badge.style.display = 'flex';
            badge.textContent = alerts.length;
        } else {
            badge.style.display = 'none';
        }

        // Render Alerts inside drawer list
        const drawerBody = document.getElementById('notif-drawer-body');
        if (alerts.length === 0) {
            drawerBody.innerHTML = `<div class="text-muted" style="text-align: center; margin-top: 50px;">No alerts. Everything is running smoothly.</div>`;
            return;
        }

        drawerBody.innerHTML = alerts.map(a => {
            let classType = 'info';
            if (a.type === 'error') classType = 'badge-danger';
            if (a.type === 'warning') classType = 'badge-warning';
            if (a.type === 'info') classType = 'badge-info';

            return `
                <div class="notification-item unread">
                    <div class="notification-item-title">
                        <span>${a.title}</span>
                        <span class="badge ${classType}">${a.type}</span>
                    </div>
                    <div class="notification-item-desc">${a.desc}</div>
                    <div class="notification-item-time">Just Now</div>
                </div>
            `;
        }).join('');
    }
}

// Instantiate core coordinator globally on window load
window.addEventListener('DOMContentLoaded', () => {
    window.App = new AppController();
});
