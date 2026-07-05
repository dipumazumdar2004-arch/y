/**
 * Aegis Medicas ERP - Core Utilities & UI Helpers
 * Custom Toast Notifications, Reusable Modals, HTML Canvas Chart Engine, and simulated file exports.
 */

// 1. Toast Notification System
class Toast {
    static initContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    static show(message, type = 'info', duration = 3500) {
        const container = this.initContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} slide-in`;
        
        let iconSvg = '';
        switch(type) {
            case 'success':
                iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
                break;
            case 'error':
                iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
                break;
            case 'warning':
                iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
                break;
            default: // info
                iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }

        toast.innerHTML = `
            <div class="toast-content">
                ${iconSvg}
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);

        // Bind close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.dismiss(toast);
        });

        // Auto dismiss
        const timeoutId = setTimeout(() => {
            this.dismiss(toast);
        }, duration);

        toast.dataset.timeoutId = timeoutId;
    }

    static dismiss(toast) {
        if (toast.classList.contains('fade-out')) return;
        clearTimeout(parseInt(toast.dataset.timeoutId));
        toast.classList.remove('slide-in');
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }

    static success(msg, dur) { this.show(msg, 'success', dur); }
    static error(msg, dur) { this.show(msg, 'error', dur); }
    static warning(msg, dur) { this.show(msg, 'warning', dur); }
    static info(msg, dur) { this.show(msg, 'info', dur); }
}

// 2. Reusable Modal & Dialog Controller
class Dialog {
    static confirm({ title = 'Are you sure?', message = 'This action cannot be undone.', confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) {
        return new Promise((resolve) => {
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay fade-in';
            
            let colorClass = 'btn-primary';
            if (type === 'danger') colorClass = 'btn-danger';
            if (type === 'warning') colorClass = 'btn-warning';

            modalOverlay.innerHTML = `
                <div class="modal-box glass-panel slide-up">
                    <div class="modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary cancel-btn">${cancelText}</button>
                        <button class="btn ${colorClass} confirm-btn">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modalOverlay);

            const closeDialog = (result) => {
                const box = modalOverlay.querySelector('.modal-box');
                box.classList.remove('slide-up');
                box.classList.add('slide-down');
                modalOverlay.classList.remove('fade-in');
                modalOverlay.classList.add('fade-out');
                
                modalOverlay.addEventListener('animationend', () => {
                    modalOverlay.remove();
                    resolve(result);
                });
            };

            modalOverlay.querySelector('.cancel-btn').addEventListener('click', () => closeDialog(false));
            modalOverlay.querySelector('.confirm-btn').addEventListener('click', () => closeDialog(true));
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) closeDialog(false);
            });
        });
    }

    static showCustomModal(id, title, contentHtml, buttons = []) {
        const existing = document.getElementById(id);
        if (existing) existing.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.id = id;
        modalOverlay.className = 'modal-overlay fade-in';

        let footerButtonsHtml = buttons.map((btn, index) => {
            return `<button class="btn ${btn.class || 'btn-secondary'} modal-action-${index}">${btn.text}</button>`;
        }).join('');

        modalOverlay.innerHTML = `
            <div class="modal-box modal-large glass-panel slide-up">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close-icon">&times;</button>
                </div>
                <div class="modal-body">
                    ${contentHtml}
                </div>
                ${buttons.length > 0 ? `<div class="modal-footer">${footerButtonsHtml}</div>` : ''}
            </div>
        `;

        document.body.appendChild(modalOverlay);

        const closeCustom = () => {
            const box = modalOverlay.querySelector('.modal-box');
            box.classList.remove('slide-up');
            box.classList.add('slide-down');
            modalOverlay.classList.remove('fade-in');
            modalOverlay.classList.add('fade-out');
            modalOverlay.addEventListener('animationend', () => {
                modalOverlay.remove();
            });
        };

        modalOverlay.querySelector('.modal-close-icon').addEventListener('click', closeCustom);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeCustom();
        });

        buttons.forEach((btn, index) => {
            modalOverlay.querySelector(`.modal-action-${index}`).addEventListener('click', (e) => {
                if (btn.click) {
                    btn.click(closeCustom, modalOverlay);
                } else {
                    closeCustom();
                }
            });
        });

        return modalOverlay;
    }
}

// 3. Data Formatting Helpers
class Formatter {
    static currency(amount) {
        const settings = AppStorage.get('settings') || { currency: '₹' };
        return `${settings.currency} ${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    static date(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    static dateTime(dateTimeStr) {
        if (!dateTimeStr) return '-';
        const d = new Date(dateTimeStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
}

// 4. HTML Canvas Custom Rendering Engine
class CanvasCharts {
    // Draws a beautiful Bar Chart
    static bar(canvasId, data, labels, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        // Handle responsiveness
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        ctx.clearRect(0, 0, width, height);

        // Chart styling parameters
        const padding = { top: 30, right: 20, bottom: 40, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Data limits
        const maxVal = Math.max(...data, 100) * 1.15; // padding top
        const stepCount = 5;

        // Y-axis grid & labels
        ctx.strokeStyle = options.gridColor || 'rgba(255, 255, 255, 0.08)';
        ctx.fillStyle = options.textColor || '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= stepCount; i++) {
            const val = (maxVal / stepCount) * i;
            const y = padding.top + chartHeight - (chartHeight * (i / stepCount));
            
            // Draw horizontal grid line
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();

            // Label
            ctx.fillText(Math.round(val), padding.left - 10, y);
        }

        // Draw Bars
        const barSpacing = chartWidth / data.length;
        const barWidth = barSpacing * 0.55;

        data.forEach((val, index) => {
            const x = padding.left + (index * barSpacing) + (barSpacing - barWidth) / 2;
            const barH = (val / maxVal) * chartHeight;
            const y = padding.top + chartHeight - barH;

            // Bar Gradient
            const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
            gradient.addColorStop(0, options.barColorStart || '#3b82f6');
            gradient.addColorStop(1, options.barColorEnd || 'rgba(59, 130, 246, 0.1)');

            ctx.fillStyle = gradient;
            // Draw rounded bar
            this.roundRect(ctx, x, y, barWidth, barH, { tl: 4, tr: 4, bl: 0, br: 0 });
            ctx.fill();

            // Draw shadow/highlight hover simulation
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(x, y, barWidth, 2);

            // X-axis label
            ctx.fillStyle = options.textColor || '#94a3b8';
            ctx.textAlign = 'center';
            ctx.fillText(labels[index], x + barWidth / 2, padding.top + chartHeight + 20);

            // Draw values above bars on desktop
            if (width > 300) {
                ctx.fillStyle = options.valueColor || '#3b82f6';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText(Math.round(val), x + barWidth / 2, y - 10);
            }
        });
    }

    // Draws a beautiful Line Chart
    static line(canvasId, data, labels, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        ctx.clearRect(0, 0, width, height);

        const padding = { top: 30, right: 30, bottom: 40, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const maxVal = Math.max(...data, 1000) * 1.15;
        const stepCount = 5;

        // Grid & Y labels
        ctx.strokeStyle = options.gridColor || 'rgba(255, 255, 255, 0.08)';
        ctx.fillStyle = options.textColor || '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= stepCount; i++) {
            const val = (maxVal / stepCount) * i;
            const y = padding.top + chartHeight - (chartHeight * (i / stepCount));
            
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();

            ctx.fillText(Formatter.currency(val).split('.')[0], padding.left - 10, y);
        }

        // Draw Line
        const points = [];
        const xSpacing = chartWidth / (data.length - 1);

        data.forEach((val, index) => {
            const x = padding.left + (index * xSpacing);
            const y = padding.top + chartHeight - ((val / maxVal) * chartHeight);
            points.push({ x, y });
        });

        // Draw area fill under the line
        if (points.length > 0) {
            const fillGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
            fillGrad.addColorStop(0, options.areaColorStart || 'rgba(16, 185, 129, 0.3)');
            fillGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

            ctx.beginPath();
            ctx.moveTo(points[0].x, padding.top + chartHeight);
            
            // Draw curved line coordinates
            ctx.lineTo(points[0].x, points[0].y);
            for (let i = 0; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
            ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
            ctx.closePath();
            ctx.fillStyle = fillGrad;
            ctx.fill();
        }

        // Draw stroke line
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = options.lineColor || '#10b981';
        ctx.lineJoin = 'round';

        if (points.length > 0) {
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 0; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
            ctx.stroke();
        }

        // Dots and label texts
        points.forEach((pt, index) => {
            // Circle border
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = options.dotColor || '#059669';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff';
            ctx.stroke();

            // Label
            ctx.fillStyle = options.textColor || '#94a3b8';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels[index], pt.x, padding.top + chartHeight + 20);
        });
    }

    // Helper for rounded rectangles
    static roundRect(ctx, x, y, width, height, radius = 5) {
        if (typeof radius === 'number') {
            radius = { tl: radius, tr: radius, bl: radius, br: radius };
        }
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();
    }
}

// 5. Excel & PDF Simulators
class Exporter {
    // Generate CSV and trigger download
    static toCSV(filename, dataHeaders, rows) {
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Add headers
        csvContent += dataHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
        
        // Add data rows
        rows.forEach(row => {
            csvContent += row.map(val => {
                const str = String(val === null || val === undefined ? '' : val);
                return `"${str.replace(/"/g, '""')}"`;
            }).join(",") + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Toast.success("Exported to Excel (CSV) successfully!");
    }

    // Simulate PDF generation using printing layout
    static toPDF(title, elementId) {
        const printContents = document.getElementById(elementId).innerHTML;
        const originalContents = document.body.innerHTML;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 25px;
                        color: #333;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 10px;
                        text-align: left;
                    }
                    th {
                        background-color: #f5f5f5;
                        font-weight: bold;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .header-invoice {
                        margin-bottom: 30px;
                    }
                    .footer-invoice {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 12px;
                        color: #777;
                    }
                </style>
            </head>
            <body>
                <h2>${title}</h2>
                <div>${printContents}</div>
                <script>
                    window.onload = function() {
                        window.print();
                        window.close();
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        Toast.success("Generated PDF / Print Window Successfully!");
    }
}
