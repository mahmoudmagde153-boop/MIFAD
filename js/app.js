/**
 * Main Application Controller for MIFAD System
 * شركة مصر للمستحضرات الغذائية - ميفاد (MIFAD)
 * Designed for Mahmoud Magdy
 */

(function() {
  'use strict';

  // Global State
  let currentInvoiceItems = [];
  let currentViewingInvoice = null;

  // DOM Elements
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.page-tab-content');

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initDashboard();
    initInvoiceCreator();
    initInvoicesList();
    initReturnsModule();
    initCustomersPage();
    initProductsPage();
    initSettingsPage();
    initModals();
  });

  // Navigation Logic
  function initNavigation() {
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });
  }

  function switchTab(tabId) {
    navItems.forEach(n => n.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(`tab-${tabId}`);

    if (activeNav) activeNav.classList.add('active');
    if (activeContent) activeContent.classList.add('active');

    // Refresh views on switch
    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'invoices') renderInvoicesList();
    if (tabId === 'returns') renderReturnsList();
    if (tabId === 'customers') renderCustomersList();
    if (tabId === 'products') renderProductsList();
  }

  // =========================================================
  // DASHBOARD MODULE
  // =========================================================
  function initDashboard() {
    renderDashboard();
  }

  function renderDashboard() {
    const stats = MIFAD_DB.getDashboardStats();

    document.getElementById('stat-total-sales').textContent = formatCurrency(stats.totalSales);
    document.getElementById('stat-total-paid').textContent = formatCurrency(stats.totalPaid);
    document.getElementById('stat-total-outstanding').textContent = formatCurrency(stats.totalOutstanding);
    document.getElementById('stat-total-returns').textContent = formatCurrency(stats.totalReturns);

    document.getElementById('stat-inv-count').textContent = stats.invoicesCount;
    document.getElementById('stat-cust-count').textContent = stats.customersCount;

    // Recent Invoices Table
    const recentTableBody = document.getElementById('dashboard-recent-invoices');
    if (recentTableBody) {
      if (stats.recentInvoices.length === 0) {
        recentTableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 20px; color: #94a3b8;">لا توجد فواتير مسجلة حتى الآن</td></tr>`;
      } else {
        recentTableBody.innerHTML = stats.recentInvoices.map(inv => `
          <tr>
            <td style="font-weight: bold; color: var(--primary);">${inv.invoiceNumber}</td>
            <td>${inv.customerName}</td>
            <td>${inv.invoiceDate}</td>
            <td style="font-weight: bold;">${formatCurrency(inv.netAmount)}</td>
            <td><span class="brand-badge" style="background:#e8f5ee; color:var(--primary);">${inv.status || 'معتمدة'}</span></td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="MIFAD_APP.viewInvoice('${inv.id}')">👁️ عرض</button>
              <button class="btn btn-sm btn-primary" onclick="MIFAD_APP.printOfficialInvoice('${inv.id}')">🖨️ طباعة</button>
            </td>
          </tr>
        `).join('');
      }
    }

    // Top Debtors Table (أعلى العملاء مديونية)
    const debtorsTableBody = document.getElementById('dashboard-top-debtors');
    if (debtorsTableBody) {
      const customers = MIFAD_DB.getCustomers();
      const debtorList = customers.map(c => {
        const stmt = MIFAD_DB.getCustomerStatement(c.code);
        return { customer: c, balance: stmt.balance };
      }).filter(d => d.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5);

      if (debtorList.length === 0) {
        debtorsTableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 20px; color: #94a3b8;">لا توجد مديونيات مستحقة على العملاء حالياً</td></tr>`;
      } else {
        debtorsTableBody.innerHTML = debtorList.map(d => `
          <tr>
            <td style="font-weight: bold;">${d.customer.name}</td>
            <td>${d.customer.code}</td>
            <td style="font-weight: bold; color: var(--accent);">${formatCurrency(d.balance)}</td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="MIFAD_APP.openCustomerStatement('${d.customer.code}')">📑 كشف حساب</button>
              <button class="btn btn-sm btn-success" onclick="MIFAD_APP.openPaymentModal('${d.customer.code}')">💵 تحصيل</button>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  // =========================================================
  // INVOICE CREATOR MODULE (MODE 1 & MODE 2)
  // =========================================================
  function initInvoiceCreator() {
    const dropzone = document.getElementById('pdf-dropzone');
    const pdfFileInput = document.getElementById('pdf-file-input');
    const btnLoadSample = document.getElementById('btn-load-sample-pdf');
    const btnAddRow = document.getElementById('btn-add-table-row');
    const btnSaveInvoice = document.getElementById('btn-save-invoice');
    const customerSelect = document.getElementById('inv-customer-select');

    // Populate customers dropdown
    populateCustomerDropdown();

    // Discount & Returns inputs event listeners
    ['inv-discount-type', 'inv-discount-value', 'inv-returns-amount', 'inv-returns-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', calculateInvoiceTotals);
    });

    // Dropzone Events
    if (dropzone && pdfFileInput) {
      dropzone.addEventListener('click', () => pdfFileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handlePdfUpload(e.dataTransfer.files[0]);
        }
      });

      pdfFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handlePdfUpload(e.target.files[0]);
        }
      });
    }

    // Fast 1-Click Load Sample PDF Demo
    if (btnLoadSample) {
      btnLoadSample.addEventListener('click', loadSampleDemoInvoice);
    }

    // Add Row (+)
    if (btnAddRow) {
      btnAddRow.addEventListener('click', () => {
        addNewTableRow();
      });
    }

    // Customer Selection Change from Dropdown
    if (customerSelect) {
      customerSelect.addEventListener('change', (e) => {
        const custCode = e.target.value;
        if (custCode) {
          const cust = MIFAD_DB.getCustomerByCode(custCode);
          if (cust) applyCustomerToInvoice(cust);
        }
      });
    }

    // Auto-search / complete by Customer Name (Col D)
    const custNameInput = document.getElementById('inv-customer-name');
    if (custNameInput) {
      const handleNameMatch = () => {
        const val = custNameInput.value.trim().toLowerCase();
        if (!val) return;
        const cust = MIFAD_DB.getCustomers().find(c => c.name.toLowerCase() === val);
        if (cust) applyCustomerToInvoice(cust);
      };
      custNameInput.addEventListener('input', handleNameMatch);
      custNameInput.addEventListener('change', handleNameMatch);
    }

    // Auto-search / complete by Customer Code (Col C)
    const custCodeInput = document.getElementById('inv-customer-code');
    if (custCodeInput) {
      const handleCodeMatch = () => {
        const val = custCodeInput.value.trim().toLowerCase();
        if (!val) return;
        const cust = MIFAD_DB.getCustomers().find(c => c.code.toLowerCase() === val);
        if (cust) applyCustomerToInvoice(cust);
      };
      custCodeInput.addEventListener('input', handleCodeMatch);
      custCodeInput.addEventListener('change', handleCodeMatch);
    }

    // Save Invoice
    if (btnSaveInvoice) {
      btnSaveInvoice.addEventListener('click', saveCurrentInvoice);
    }

    // Default to at least 3 blank rows if empty
    if (currentInvoiceItems.length === 0) {
      loadBlankInvoice();
    }
  }

  function applyCustomerToInvoice(cust) {
    if (!cust) return;
    const nameInput = document.getElementById('inv-customer-name');
    const codeInput = document.getElementById('inv-customer-code');
    const addrInput = document.getElementById('inv-customer-address');
    const accInput = document.getElementById('inv-customer-account');
    const selectEl = document.getElementById('inv-customer-select');

    if (nameInput) nameInput.value = cust.name || '';
    if (codeInput) codeInput.value = cust.code || '';
    if (addrInput) addrInput.value = cust.territory || cust.address || '';
    if (accInput) accInput.value = cust.accountNumber || cust.phone || '';
    // NOTE: Sales Person is completely independent and not tied to the customer or product!
    if (selectEl && selectEl.value !== cust.code) selectEl.value = cust.code;
  }

  function populateCustomerDropdown() {
    const customerSelect = document.getElementById('inv-customer-select');
    const customers = MIFAD_DB.getCustomers();

    if (customerSelect) {
      customerSelect.innerHTML = `<option value="">-- اختر العميل (من ${customers.length} عميل معتمد) --</option>` +
        customers.map(c => {
          const territory = c.territory || c.address || '';
          return `<option value="${c.code}">${c.name} (${c.code})${territory ? ` [${territory}]` : ''}</option>`;
        }).join('');
    }

    // Update count badge in invoice header
    const invBadge = document.getElementById('inv-cust-count-badge');
    if (invBadge) invBadge.textContent = `${customers.length} عميل معتمد`;

    // Populate Sales Persons datalist from Col E & invoices
    const spDatalist = document.getElementById('sales-persons-datalist');
    const salesPersons = MIFAD_DB.getSalesPersons();
    if (spDatalist) {
      spDatalist.innerHTML = salesPersons.map(sp => `<option value="${sp}">`).join('');
    }

    // Populate Customer Names datalist from Col D (No sales person name)
    const nameDatalist = document.getElementById('customers-names-datalist');
    if (nameDatalist) {
      nameDatalist.innerHTML = customers.map(c => `<option value="${c.name}">${c.code}${c.territory ? ` - ${c.territory}` : ''}</option>`).join('');
    }

    // Populate Customer Codes datalist from Col C
    const codeDatalist = document.getElementById('customer-codes-datalist');
    if (codeDatalist) {
      codeDatalist.innerHTML = customers.map(c => `<option value="${c.code}">${c.name}</option>`).join('');
    }
  }

  function loadBlankInvoice() {
    const settings = MIFAD_DB.getSettings();
    document.getElementById('inv-number').value = 'B2B-SINV-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);
    document.getElementById('inv-date').value = new Date().toISOString().split('T')[0];
    const spInput = document.getElementById('inv-sales-person');
    if (spInput) spInput.value = '';
    document.getElementById('inv-po-number').value = '';
    document.getElementById('inv-customer-code').value = '';
    document.getElementById('inv-customer-name').value = '';
    document.getElementById('inv-customer-address').value = '';
    const accInput = document.getElementById('inv-customer-account');
    if (accInput) accInput.value = '';
    const custSelect = document.getElementById('inv-customer-select');
    if (custSelect) custSelect.value = '';
    document.getElementById('inv-doc-code').value = settings.docCode || 'SM/FM/09';

    document.getElementById('inv-discount-type').value = 'amount';
    document.getElementById('inv-discount-value').value = '0';
    document.getElementById('inv-returns-amount').value = '0';
    document.getElementById('inv-returns-notes').value = '';
    const payTypeEl = document.getElementById('inv-payment-type');
    if (payTypeEl) payTypeEl.value = 'credit';

    currentInvoiceItems = [
      { id: 'row-1', code: 'BS600205001', name: 'كريموسي 200 ( 1كجم )', qty: 10, unit: '1kg', price: 360, total: 3600 },
      { id: 'row-2', code: '', name: '', qty: 1, unit: '1kg', price: 0, total: 0 },
      { id: 'row-3', code: '', name: '', qty: 1, unit: '1kg', price: 0, total: 0 }
    ];
    renderEditableTable();
    calculateInvoiceTotals();
  }

  async function handlePdfUpload(file) {
    showNotification('جاري قراءة ملف الفاتورة واستخراج البنود بالذكاء الاصطناعي...', 'info');
    try {
      const extracted = await MIFAD_PDF.extractMifadInvoiceFromPdf(file);
      populateInvoiceFormWithExtractedData(extracted);
      showNotification('تم استخراج الفاتورة بنجاح! يمكنك الآن تعديل أي بند بحرية تامة.', 'success');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء قراءة ملف الـ PDF: ' + err.message);
    }
  }

  function loadSampleDemoInvoice() {
    showNotification('جاري تحميل نموذج فاتورة عادل مصباح الرسمية...', 'info');
    const sampleInv = MIFAD_DB.getInvoices()[0];
    if (sampleInv) {
      document.getElementById('inv-number').value = sampleInv.invoiceNumber;
      document.getElementById('inv-date').value = sampleInv.invoiceDate;
      document.getElementById('inv-sales-person').value = sampleInv.salesPerson;
      document.getElementById('inv-po-number').value = sampleInv.poNumber || '';
      document.getElementById('inv-customer-code').value = sampleInv.customerCode;
      document.getElementById('inv-customer-name').value = sampleInv.customerName;
      document.getElementById('inv-customer-address').value = sampleInv.customerAddress;
      document.getElementById('inv-doc-code').value = sampleInv.docCode;

      document.getElementById('inv-discount-type').value = sampleInv.discountType || 'amount';
      document.getElementById('inv-discount-value').value = sampleInv.discountValue || 0;
      document.getElementById('inv-returns-amount').value = sampleInv.returnsAmount || 0;
      document.getElementById('inv-returns-notes').value = sampleInv.returnsNotes || '';

      currentInvoiceItems = JSON.parse(JSON.stringify(sampleInv.items)).map((it, idx) => ({
        ...it,
        id: 'row-' + (idx + 1)
      }));

      renderEditableTable();
      calculateInvoiceTotals();
      showNotification('تم تحميل فاتورة عادل مصباح بالكامل! كل الأعمدة والأسعار متاحة للتعديل المباشر.', 'success');
    }
  }

  function populateInvoiceFormWithExtractedData(data) {
    const meta = data.metadata;
    if (meta.invoiceNumber) document.getElementById('inv-number').value = meta.invoiceNumber;
    if (meta.invoiceDate) document.getElementById('inv-date').value = meta.invoiceDate;
    if (meta.salesPerson) document.getElementById('inv-sales-person').value = meta.salesPerson;
    if (meta.poNumber) document.getElementById('inv-po-number').value = meta.poNumber;
    if (meta.customerCode) document.getElementById('inv-customer-code').value = meta.customerCode;
    if (meta.customerName) document.getElementById('inv-customer-name').value = meta.customerName;
    if (meta.customerAddress) document.getElementById('inv-customer-address').value = meta.customerAddress;
    if (meta.docCode) document.getElementById('inv-doc-code').value = meta.docCode;

    // Check if customer exists or notify
    if (meta.customerName) {
      const existing = MIFAD_DB.getCustomerByName(meta.customerName);
      if (!existing) {
        showNotification(`تم التعرف على عميل جديد: ${meta.customerName}. سيتم حفظه تلقائياً في دليل العملاء.`, 'info');
      }
    }

    currentInvoiceItems = data.items.map((it, idx) => ({
      ...it,
      id: 'row-' + (idx + 1)
    }));

    renderEditableTable();
    calculateInvoiceTotals();
  }

  // Render Editable Table Grid
  function renderEditableTable() {
    const tbody = document.getElementById('invoice-table-body');
    if (!tbody) return;

    const products = MIFAD_DB.getProducts();

    // Ensure autocomplete datalists exist
    let prodsCodeDatalist = document.getElementById('products-code-datalist');
    if (!prodsCodeDatalist) {
      prodsCodeDatalist = document.createElement('datalist');
      prodsCodeDatalist.id = 'products-code-datalist';
      document.body.appendChild(prodsCodeDatalist);
    }
    prodsCodeDatalist.innerHTML = products.map(p => `<option value="${p.code}">${p.name} [${p.weight || p.unit}] - ${p.price} ج.م</option>`).join('');

    let prodsNameDatalist = document.getElementById('products-name-datalist');
    if (!prodsNameDatalist) {
      prodsNameDatalist = document.createElement('datalist');
      prodsNameDatalist.id = 'products-name-datalist';
      document.body.appendChild(prodsNameDatalist);
    }
    prodsNameDatalist.innerHTML = products.map(p => `<option value="${p.name}">[${p.code}] - ${p.weight || p.unit} - ${p.price} ج.م</option>`).join('');

    tbody.innerHTML = currentInvoiceItems.map((item, index) => `
      <tr data-row-id="${item.id}">
        <td style="text-align: center; width: 40px; font-weight: bold; color: var(--text-muted);">${index + 1}</td>
        <td style="width: 150px;">
          <input type="text" class="table-input item-code" list="products-code-datalist" value="${escapeHtml(item.code || '')}" 
                 placeholder="كود الصنف" onchange="MIFAD_APP.onRowCodeChange('${item.id}', this.value)">
        </td>
        <td>
          <div style="display: flex; gap: 4px; align-items: center;">
            <input type="text" class="table-input item-name" list="products-name-datalist" value="${escapeHtml(item.name || '')}" 
                   placeholder="اسم الصنف والمواصفات" onchange="MIFAD_APP.onRowNameChange('${item.id}', this.value)" style="flex: 1;">
            <select class="form-control" style="width: 32px; padding: 2px; height: 28px;" title="اختيار صنف من الكتالوج (444 صنف)" 
                    onchange="MIFAD_APP.onSelectCatalogProduct('${item.id}', this.value)">
              <option value="">📋</option>
              ${products.map(p => `<option value="${p.code}">${p.name} - ${p.code} [${p.weight || p.unit}] (${p.price} ج.م)</option>`).join('')}
            </select>
          </div>
        </td>
        <td style="width: 90px;">
          <input type="number" step="any" class="table-input item-qty" value="${item.qty}" 
                 style="text-align: center; font-weight: bold;" oninput="MIFAD_APP.onRowQtyChange('${item.id}', this.value)">
        </td>
        <td style="width: 110px;">
          <input type="text" class="table-input item-unit" value="${escapeHtml(item.unit || '1kg')}" 
                 style="text-align: center;" oninput="MIFAD_APP.onRowUnitChange('${item.id}', this.value)">
        </td>
        <td style="width: 110px;">
          <input type="number" step="any" class="table-input item-price" value="${item.price}" 
                 style="text-align: center;" oninput="MIFAD_APP.onRowPriceChange('${item.id}', this.value)">
        </td>
        <td style="width: 120px;">
          <input type="number" step="any" class="table-input item-total" value="${item.total}" 
                 style="text-align: center; font-weight: bold; color: var(--primary);" 
                 oninput="MIFAD_APP.onRowTotalManualChange('${item.id}', this.value)">
        </td>
        <td style="text-align: center; width: 60px;">
          <button class="btn btn-sm btn-outline" style="color: var(--danger); padding: 4px 8px;" title="حذف هذا البند" 
                  onclick="MIFAD_APP.deleteTableRow('${item.id}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  function addNewTableRow() {
    const newId = 'row-' + Date.now();
    currentInvoiceItems.push({
      id: newId,
      code: '',
      name: '',
      qty: 1,
      unit: '1kg',
      price: 0,
      total: 0
    });
    renderEditableTable();
    calculateInvoiceTotals();
  }

  function deleteTableRow(rowId) {
    if (currentInvoiceItems.length <= 1) {
      showNotification('يجب أن تحتوي الفاتورة على بند واحد على الأقل', 'danger');
      return;
    }
    currentInvoiceItems = currentInvoiceItems.filter(r => r.id !== rowId);
    renderEditableTable();
    calculateInvoiceTotals();
  }

  function onRowCodeChange(rowId, val) {
    const row = currentInvoiceItems.find(r => r.id === rowId);
    if (!row) return;
    row.code = val.trim();
    // Auto lookup from catalog if matching
    const prod = MIFAD_DB.getProducts().find(p => p.code.toLowerCase() === val.trim().toLowerCase());
    if (prod) {
      row.name = prod.name;
      row.unit = prod.unit || prod.weight || '1kg';
      row.price = prod.price || 0;
      row.total = Math.round((row.qty * row.price) * 100) / 100;
      renderEditableTable();
    }
    calculateInvoiceTotals();
  }

  function onRowNameChange(rowId, val) {
    const row = currentInvoiceItems.find(r => r.id === rowId);
    if (!row) return;
    row.name = val;
    // Auto lookup from catalog by name
    const prod = MIFAD_DB.getProducts().find(p => p.name.trim().toLowerCase() === val.trim().toLowerCase());
    if (prod) {
      row.code = prod.code;
      row.unit = prod.unit || prod.weight || '1kg';
      row.price = prod.price || 0;
      row.total = Math.round((row.qty * row.price) * 100) / 100;
      renderEditableTable();
    }
    calculateInvoiceTotals();
  }

  function onRowUnitChange(rowId, val) {
    const row = currentInvoiceItems.find(r => r.id === rowId);
    if (row) row.unit = val;
  }

  function onRowQtyChange(rowId, val) {
    const row = currentInvoiceItems.find(r => r.id === rowId);
    if (!row) return;
    row.qty = parseFloat(val) || 0;
    row.total = Math.round((row.qty * row.price) * 100) / 100;
    // Update total cell directly
    const rowEl = document.querySelector(`tr[data-row-id="${rowId}"] .item-total`);
    if (rowEl) rowEl.value = row.total;
    calculateInvoiceTotals();
  }

  function onRowPriceChange(rowId, val) {
    const row = currentInvoiceItems.find(r => r.id === rowId);
    if (!row) return;
    row.price = parseFloat(val) || 0;
    row.total = Math.round((row.qty * row.price) * 100) / 100;
    const rowEl = document.querySelector(`tr[data-row-id="${rowId}"] .item-total`);
    if (rowEl) rowEl.value = row.total;
    calculateInvoiceTotals();
  }

  function onRowTotalManualChange(rowId, val) {
    const row = currentInvoiceItems.find(r => r.id === rowId);
    if (!row) return;
    row.total = parseFloat(val) || 0;
    calculateInvoiceTotals();
  }

  function onSelectCatalogProduct(rowId, prodCode) {
    if (!prodCode) return;
    const prod = MIFAD_DB.getProducts().find(p => p.code === prodCode);
    const row = currentInvoiceItems.find(r => r.id === rowId);
    if (prod && row) {
      row.code = prod.code;
      row.name = prod.name;
      row.unit = prod.unit || prod.weight || '1kg';
      row.price = prod.price || 0;
      row.total = Math.round((row.qty * row.price) * 100) / 100;
      renderEditableTable();
      calculateInvoiceTotals();
    }
  }

  // Calculate Subtotals, Discounts, Returns, and Arabic Tafqeet
  function calculateInvoiceTotals() {
    const subtotal = currentInvoiceItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0);

    const discountType = document.getElementById('inv-discount-type').value;
    const discountVal = parseFloat(document.getElementById('inv-discount-value').value) || 0;
    let discountAmount = 0;
    if (discountType === 'percent') {
      discountAmount = Math.round(((subtotal * discountVal) / 100) * 100) / 100;
    } else {
      discountAmount = discountVal;
    }

    const returnsAmount = parseFloat(document.getElementById('inv-returns-amount').value) || 0;

    let netAmount = subtotal - discountAmount - returnsAmount;
    if (netAmount < 0) netAmount = 0;

    // Update UI elements
    document.getElementById('calc-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('calc-discount-display').textContent = formatCurrency(discountAmount);
    document.getElementById('calc-returns-display').textContent = formatCurrency(returnsAmount);
    document.getElementById('calc-net-total').textContent = formatCurrency(netAmount);

    // Update Arabic Tafqeet Text
    const tafqeetText = tafqeet(netAmount);
    document.getElementById('tafqeet-preview-text').textContent = tafqeetText;

    return {
      subtotal,
      discountType,
      discountVal,
      discountAmount,
      returnsAmount,
      netAmount,
      tafqeetText
    };
  }

  function saveCurrentInvoice() {
    const invNumber = document.getElementById('inv-number').value.trim();
    const invDate = document.getElementById('inv-date').value;
    const customerName = document.getElementById('inv-customer-name').value.trim();
    let customerCode = document.getElementById('inv-customer-code').value.trim();
    const customerAddress = document.getElementById('inv-customer-address').value.trim();
    const salesPerson = document.getElementById('inv-sales-person').value.trim();
    const poNumber = document.getElementById('inv-po-number').value.trim();
    const docCode = document.getElementById('inv-doc-code').value.trim() || 'SM/FM/09';

    if (!invNumber) {
      alert('يرجى إدخال رقم الفاتورة');
      return;
    }
    if (!customerName) {
      alert('يرجى إدخال اسم العميل');
      return;
    }
    if (currentInvoiceItems.length === 0) {
      alert('يرجى إضافة بند واحد على الأقل في الفاتورة');
      return;
    }

    // Auto-generate customer code if blank
    if (!customerCode) {
      customerCode = 'CUST-' + Math.floor(1000000000 + Math.random() * 9000000000);
      document.getElementById('inv-customer-code').value = customerCode;
    }

    const totals = calculateInvoiceTotals();
    const paymentType = document.getElementById('inv-payment-type') ? document.getElementById('inv-payment-type').value : 'credit';

    const invoiceObj = {
      id: 'inv-' + Date.now(),
      invoiceNumber: invNumber,
      invoiceDate: invDate,
      printDateTime: new Date().toLocaleDateString('ar-EG') + ' ' + new Date().toLocaleTimeString('ar-EG'),
      poNumber: poNumber,
      paymentType: paymentType,
      customerCode: customerCode,
      customerName: customerName,
      customerAddress: customerAddress,
      salesPerson: salesPerson,
      docCode: docCode,
      items: JSON.parse(JSON.stringify(currentInvoiceItems)),
      subtotal: totals.subtotal,
      discountType: totals.discountType,
      discountValue: totals.discountVal,
      discountAmount: totals.discountAmount,
      returnsAmount: totals.returnsAmount,
      returnsNotes: document.getElementById('inv-returns-notes').value.trim(),
      netAmount: totals.netAmount,
      tafqeetText: totals.tafqeetText,
      sourceIssuer: 'خدمة العملاء',
      reviewer: 'محمود جمال',
      status: 'معتمدة',
      notes: 'تم الإنشاء عبر سيستم ميفاد للفواتير'
    };

    MIFAD_DB.addInvoice(invoiceObj);

    // Refresh datalists to include any newly typed sales person
    populateCustomerDropdown();

    const payTypeText = paymentType === 'cash' ? 'نقدي / كاش' : 'آجل / كريديت';
    showNotification(`تم حفظ الفاتورة رقم ${invNumber} (${payTypeText}) بنجاح وترحيلها لحساب العميل! (التحصيل وسداد الفاتورة يتم تسجيله عبر كشف الحساب)`, 'success');

    // Switch to invoices list or show options
    switchTab('invoices');
    printOfficialInvoice(invoiceObj.id);
  }

  // =========================================================
  // INVOICES LIST & ARCHIVE
  // =========================================================
  function initInvoicesList() {
    const searchInput = document.getElementById('invoices-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderInvoicesList(e.target.value);
      });
    }
  }

  function renderInvoicesList(filter = '') {
    const tbody = document.getElementById('invoices-list-body');
    if (!tbody) return;

    let invoices = MIFAD_DB.getInvoices();
    if (filter) {
      const q = filter.trim().toLowerCase();
      invoices = invoices.filter(i => 
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q) ||
        (i.customerCode && i.customerCode.toLowerCase().includes(q))
      );
    }

    if (invoices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 24px; color: #94a3b8;">لا توجد فواتير مطابقة للبحث</td></tr>`;
      return;
    }

    tbody.innerHTML = invoices.map(inv => `
      <tr>
        <td style="font-weight: bold; color: var(--primary);">${inv.invoiceNumber}</td>
        <td>${inv.invoiceDate}</td>
        <td>
          <span class="${inv.paymentType === 'cash' ? 'badge-cash' : 'badge-credit'}">
            ${inv.paymentType === 'cash' ? '💵 نقدي (Cash)' : '🔵 آجل (Credit)'}
          </span>
        </td>
        <td style="font-weight: 700;">${inv.customerName}</td>
        <td style="color: var(--text-muted);">${inv.customerCode || '-'}</td>
        <td style="font-weight: 800; color: var(--secondary);">${formatCurrency(inv.netAmount)}</td>
        <td>
          ${inv.returnsAmount > 0 ? `<span class="badge-return" title="إجمالي المرتجع">🔄 مرتجع ${formatCurrency(inv.returnsAmount)}</span> ` : ''}
          <span class="brand-badge" style="background:#e8f5ee; color:var(--primary);">${inv.status || 'معتمدة'}</span>
        </td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-sm btn-primary" onclick="MIFAD_APP.printOfficialInvoice('${inv.id}')" title="طباعة فاتورة رسمية معتمدة">🖨️ فاتورة</button>
            <button class="btn btn-sm btn-success" onclick="MIFAD_APP.printDeliveryReceipt('${inv.id}')" title="طباعة إذن استلام بضاعة">🚚 استلام</button>
            <button class="btn btn-sm btn-danger" onclick="MIFAD_APP.openCreateReturnModal('${inv.invoiceNumber}')" title="تسجيل إذن مرتجع على هذه الفاتورة">🔄 مرتجع</button>
            <button class="btn btn-sm btn-outline" onclick="MIFAD_APP.editInvoice('${inv.id}')" title="تعديل الفاتورة">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="MIFAD_APP.deleteInvoice('${inv.id}')" title="حذف الفاتورة">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function editInvoice(invId) {
    const inv = MIFAD_DB.getInvoiceById(invId);
    if (!inv) return;

    switchTab('new-invoice');
    document.getElementById('inv-number').value = inv.invoiceNumber;
    document.getElementById('inv-date').value = inv.invoiceDate;
    const payTypeEl = document.getElementById('inv-payment-type');
    if (payTypeEl) payTypeEl.value = inv.paymentType || 'credit';
    document.getElementById('inv-sales-person').value = inv.salesPerson || '';
    document.getElementById('inv-po-number').value = inv.poNumber || '';
    document.getElementById('inv-customer-code').value = inv.customerCode || '';
    document.getElementById('inv-customer-name').value = inv.customerName || '';
    document.getElementById('inv-customer-address').value = inv.customerAddress || '';
    document.getElementById('inv-doc-code').value = inv.docCode || 'SM/FM/09';

    document.getElementById('inv-discount-type').value = inv.discountType || 'amount';
    document.getElementById('inv-discount-value').value = inv.discountValue || 0;
    document.getElementById('inv-returns-amount').value = inv.returnsAmount || 0;
    document.getElementById('inv-returns-notes').value = inv.returnsNotes || '';

    currentInvoiceItems = JSON.parse(JSON.stringify(inv.items || [])).map((it, idx) => ({
      ...it,
      id: it.id || ('row-' + (idx + 1))
    }));

    renderEditableTable();
    calculateInvoiceTotals();
    showNotification(`تم فتح الفاتورة ${inv.invoiceNumber} في وضع التعديل الكامل.`, 'info');
  }

  function deleteInvoice(invId) {
    if (confirm('هل أنت متأكد من حذف هذه الفاتورة؟ سيتم تحديث حساب العميل والداشبورد تلقائياً.')) {
      MIFAD_DB.deleteInvoice(invId);
      renderInvoicesList();
      renderDashboard();
      showNotification('تم حذف الفاتورة بنجاح', 'success');
    }
  }

  // =========================================================
  // OFFICIAL MIFAD INVOICE PRINT VIEW
  // =========================================================
  function printOfficialInvoice(invId) {
    const inv = MIFAD_DB.getInvoiceById(invId);
    if (!inv) return;
    currentViewingInvoice = inv;

    const modal = document.getElementById('official-invoice-modal');
    const container = document.getElementById('official-invoice-render-target');
    const logoSrc = window.MIFAD_LOGO_BASE64 || 'assets/mifad_logo.png';

    // Build items HTML
    const itemsHtml = (inv.items || []).map((it, idx) => `
      <tr>
        <td class="text-right" style="font-weight: bold;">${it.code || '-'}</td>
        <td class="text-right">${it.name || ''}</td>
        <td>${it.qty}</td>
        <td>${it.unit || '1kg'}</td>
        <td>${formatNumber(it.price)}</td>
        <td class="text-left" style="font-weight: bold;">${formatNumber(it.total)}</td>
      </tr>
    `).join('');

    const html = `
      <div class="official-invoice-sheet">
        <!-- Top Header Box -->
        <div class="sheet-top">
          <div class="sheet-logo-box">
            <div class="sheet-logo-title">شركة مصر للمستحضرات الغذائية - ميفاد</div>
            <img src="${logoSrc}" class="sheet-logo-img" alt="MIFAD Logo">
          </div>
          <div class="sheet-top-meta">
            <div>صفحه 1</div>
            <div>تاريخ و وقت الطباعه ${inv.printDateTime || (new Date().toLocaleDateString('en-GB') + ' 09:30:AM')}</div>
            <div class="sheet-doc-code">${inv.docCode || 'SM/FM/09'}</div>
          </div>
        </div>

        <!-- Center Title -->
        <div class="sheet-invoice-title">فـــــــاتــــــورة</div>

        <!-- Meta Grid -->
        <div class="sheet-meta-grid">
          <div class="sheet-meta-col">
            <div class="meta-row"><span class="meta-label">كود العميل:</span> <span class="meta-val">${inv.customerCode || '-'}</span></div>
            <div class="meta-row"><span class="meta-label">المطلوب من:</span> <span class="meta-val">${inv.customerName}</span></div>
            <div class="meta-row"><span class="meta-label">العنوان:</span> <span class="meta-val">${inv.customerAddress || 'الاسكندرية'}</span></div>
            <div class="meta-row"><span class="meta-label">أمر التوريد:</span> <span class="meta-val">${inv.poNumber || ''}</span></div>
          </div>
          <div class="sheet-meta-col" style="text-align: left;">
            <div class="meta-row" style="justify-content: flex-end;"><span class="meta-label">طريقة السداد -:</span> <span class="meta-val" style="font-weight: 800; color: ${inv.paymentType === 'cash' ? '#15803d' : '#1e3a8a'};">${inv.paymentType === 'cash' ? 'نقدي / كاش (Cash)' : 'آجل / كريديت (Credit)'}</span></div>
            <div class="meta-row" style="justify-content: flex-end;"><span class="meta-label">مسئول البيع -:</span> <span class="meta-val">${inv.salesPerson || '-'}</span></div>
            <div class="meta-row" style="justify-content: flex-end;"><span class="meta-label">رقم الفاتوره -:</span> <span class="meta-val" style="font-weight: 800;">${inv.invoiceNumber}</span></div>
            <div class="meta-row" style="justify-content: flex-end;"><span class="meta-label">تاريخ الفاتوره -:</span> <span class="meta-val">${formatDateDisplay(inv.invoiceDate)}</span></div>
          </div>
        </div>

        <!-- Official Table -->
        <table class="sheet-table">
          <thead>
            <tr>
              <th style="width: 130px;">كود الصنف</th>
              <th>أسم الصنف</th>
              <th style="width: 60px;">الكميه</th>
              <th style="width: 65px;">الوحده</th>
              <th style="width: 80px;">سعر الوحده</th>
              <th style="width: 95px;">القيمه</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Subtotal Row -->
        <div class="sheet-subtotal-row">
          <span>الإجمالي</span>
          <span>${formatNumber(inv.subtotal)}</span>
        </div>

        <!-- Effects Box (المؤثرات علي الفاتورة) -->
        <div class="sheet-effects-box">
          <div class="sheet-effects-header">المؤثرات علي الفاتوره</div>
          ${inv.discountAmount > 0 ? `
            <div class="sheet-effects-row">
              <span>الخصم ${inv.discountType === 'percent' ? `(${inv.discountValue}%)` : ''}</span>
              <span style="color: #dc2626;">- ${formatNumber(inv.discountAmount)}</span>
            </div>
          ` : ''}
          ${inv.returnsAmount > 0 ? `
            <div class="sheet-effects-row">
              <span>مرتجع بضاعة ${inv.returnsNotes ? `(${inv.returnsNotes})` : ''}</span>
              <span style="color: #dc2626;">- ${formatNumber(inv.returnsAmount)}</span>
            </div>
          ` : ''}
          <div class="sheet-effects-row" style="font-size: 10pt; background: #f8fafc;">
            <span>صافي القيمة</span>
            <span style="font-weight: 900;">${formatNumber(inv.netAmount)}</span>
          </div>
        </div>

        <!-- Tafqeet Line -->
        <div class="sheet-tafqeet-line">
          ${inv.tafqeetText || tafqeet(inv.netAmount)}
        </div>

        <!-- Legal Disclaimer -->
        <div class="sheet-legal-warning">
          للشركة الحق في الرجوع علي العميل في حاله حدوث خطأ حسابي في الفاتوره
        </div>

        <!-- Dual Signatures -->
        <div class="sheet-signatures">
          <div class="sig-block">
            <div>مصدر الفاتوره</div>
            <div class="sig-name">${inv.sourceIssuer || 'خدمة العملاء'}</div>
          </div>
          <div class="sig-block">
            <div>مراجعه</div>
            <div class="sig-name">${inv.reviewer || 'محمود جمال'}</div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    modal.classList.add('active');
  }

  // =========================================================
  // DELIVERY RECEIPT (إذن استلام بضاعة)
  // =========================================================
  function printDeliveryReceipt(invId) {
    const inv = MIFAD_DB.getInvoiceById(invId);
    if (!inv) return;

    const modal = document.getElementById('delivery-receipt-modal');
    const container = document.getElementById('delivery-receipt-render-target');
    const logoSrc = window.MIFAD_LOGO_BASE64 || 'assets/mifad_logo.png';

    const itemsHtml = (inv.items || []).map((it, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-weight: bold;">${it.code || '-'}</td>
        <td style="text-align: right;">${it.name || ''}</td>
        <td>${it.unit || '1kg'}</td>
        <td style="font-weight: bold; font-size: 11pt;">${it.qty}</td>
        <td>${it.qty}</td>
        <td>سليم ومطابق</td>
      </tr>
    `).join('');

    const html = `
      <div class="receipt-sheet">
        <!-- Top Header -->
        <div class="sheet-top">
          <div class="sheet-logo-box">
            <div class="sheet-logo-title">شركة مصر للمستحضرات الغذائية - ميفاد</div>
            <img src="${logoSrc}" class="sheet-logo-img" alt="MIFAD Logo">
          </div>
          <div class="sheet-top-meta">
            <div>رقم الإذن: REC-DEL-${inv.invoiceNumber.replace(/[^0-9]/g, '').slice(-5)}</div>
            <div>التاريخ: ${inv.invoiceDate}</div>
            <div>كود النموذج: SM/DL/01</div>
          </div>
        </div>

        <!-- Title -->
        <div class="receipt-title-box">
          <h2>إذن استلام وتسليم بضاعة (Delivery Receipt)</h2>
          <div style="font-size: 9.5pt; font-weight: bold; margin-top: 4px;">مربوط بالفاتورة رقم: ${inv.invoiceNumber}</div>
        </div>

        <!-- Client & Shipping Details -->
        <div class="sheet-meta-grid" style="background: #f8fafc; padding: 10px; border: 1px solid #000; margin-bottom: 16px;">
          <div class="sheet-meta-col">
            <div class="meta-row"><span class="meta-label">اسم العميل:</span> <span class="meta-val">${inv.customerName}</span></div>
            <div class="meta-row"><span class="meta-label">كود العميل:</span> <span class="meta-val">${inv.customerCode || '-'}</span></div>
            <div class="meta-row"><span class="meta-label">عنوان التسليم:</span> <span class="meta-val">${inv.customerAddress || 'الاسكندرية'}</span></div>
          </div>
          <div class="sheet-meta-col" style="text-align: left;">
            <div class="meta-row" style="justify-content: flex-end;"><span class="meta-label">مسؤول البيع:</span> <span class="meta-val">${inv.salesPerson || '-'}</span></div>
            <div class="meta-row" style="justify-content: flex-end;"><span class="meta-label">رقم أمر التوريد:</span> <span class="meta-val">${inv.poNumber || 'طلب مباشر'}</span></div>
            <div class="meta-row" style="justify-content: flex-end;"><span class="meta-label">طريقة النقل:</span> <span class="meta-val">سيارة الشركة</span></div>
          </div>
        </div>

        <!-- Items Table -->
        <table class="receipt-table" style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
          <thead>
            <tr style="background: #e2e8f0;">
              <th style="width: 35px;">م</th>
              <th style="width: 120px;">كود الصنف</th>
              <th>بيان الصنف والمواصفات</th>
              <th style="width: 60px;">الوحدة</th>
              <th style="width: 70px;">الكمية المطلوبة</th>
              <th style="width: 70px;">الكمية المسلمة</th>
              <th style="width: 100px;">حالة الاستلام</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Acknowledgment Declaration -->
        <div class="receipt-declaration">
          <strong>إقرار استلام بضاعة:</strong><br>
          أقر أنا الموقع أدناه بأنني قد استلمت كامل الأصناف والكميات الموضحة بعاليه بحالة سليمة تماماً ومطابقة لجميع المواصفات وخالية من أي عيوب ظاهرية أو تلفيات، وتعتبر الفاتورة المرفقة رقم (${inv.invoiceNumber}) معتمدة وواجبة السداد وفقاً للشروط المتفق عليها.
        </div>

        <!-- Triple Signatures -->
        <div class="receipt-signatures">
          <div class="receipt-sig-box">
            <div>أمين المخزن / مسؤول الصرف</div>
            <div style="margin-top: 40px; font-weight: normal;">التوقيع: ....................</div>
          </div>
          <div class="receipt-sig-box">
            <div>السائق / مندوب التوصيل</div>
            <div style="margin-top: 40px; font-weight: normal;">التوقيع: ....................</div>
          </div>
          <div class="receipt-sig-box">
            <div>المستلم / العميل</div>
            <div style="margin-top: 20px; font-weight: normal; font-size: 8pt; text-align: right;">الاسم: ....................<br>الرقم القومي: ............<br>التوقيع: ....................</div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    modal.classList.add('active');
  }

  // =========================================================
  // RETURNS MODULE (إدارة وسجل المرتجعات وإشعارات الخصم)
  // =========================================================
  function initReturnsModule() {
    const btnOpenCreate = document.getElementById('btn-open-create-return');
    const searchInput = document.getElementById('returns-search-input');
    const invSelect = document.getElementById('return-invoice-select');
    const btnSaveReturn = document.getElementById('btn-save-return-action');

    if (btnOpenCreate) {
      btnOpenCreate.addEventListener('click', () => {
        openCreateReturnModal();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderReturnsList(e.target.value);
      });
    }

    if (invSelect) {
      invSelect.addEventListener('change', onReturnInvoiceSelected);
    }

    if (btnSaveReturn) {
      btnSaveReturn.addEventListener('click', saveReturnFromModal);
    }
  }

  function renderReturnsList(filter = '') {
    const tbody = document.getElementById('returns-list-body');
    if (!tbody) return;

    let returns = MIFAD_DB.getReturns();
    if (filter) {
      const q = filter.trim().toLowerCase();
      returns = returns.filter(r =>
        (r.returnNumber && r.returnNumber.toLowerCase().includes(q)) ||
        (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(q)) ||
        (r.customerName && r.customerName.toLowerCase().includes(q))
      );
    }

    // Update KPI cards
    const allReturns = MIFAD_DB.getReturns();
    const totalReturnsVal = allReturns.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    const kpiTotal = document.getElementById('returns-kpi-total-amount');
    const kpiCount = document.getElementById('returns-kpi-count');
    if (kpiTotal) kpiTotal.textContent = formatCurrency(totalReturnsVal);
    if (kpiCount) kpiCount.textContent = allReturns.length;

    if (returns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 24px; color: #94a3b8;">لا توجد أذون مرتجعات مسجلة حتى الآن</td></tr>`;
      return;
    }

    tbody.innerHTML = returns.map(ret => {
      const itemsCount = (ret.items || []).length;
      const itemsBrief = (ret.items || []).map(it => `${it.name} (${it.returnQty} ${it.unit})`).join('، ');

      return `
        <tr>
          <td style="font-weight: bold; color: var(--danger);">${ret.returnNumber}</td>
          <td>${ret.date}</td>
          <td style="font-weight: bold; color: var(--primary);">${ret.invoiceNumber}</td>
          <td style="font-weight: 700;">${ret.customerName}</td>
          <td><span title="${escapeHtml(itemsBrief)}">${itemsCount} صنف (${itemsBrief.slice(0, 35)}${itemsBrief.length > 35 ? '...' : ''})</span></td>
          <td style="font-weight: 900; color: var(--danger);">${formatCurrency(ret.totalAmount)}</td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">${ret.notes || '-'}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-sm btn-primary" onclick="MIFAD_APP.printReturnVoucher('${ret.id}')" title="طباعة إذن المرتجع">🖨️ طباعة الإذن</button>
              <button class="btn btn-sm btn-outline" onclick="MIFAD_APP.openCustomerStatement('${ret.customerCode}')" title="عرض كشف حساب العميل">📑 كشف الحساب</button>
              <button class="btn btn-sm btn-danger" onclick="MIFAD_APP.deleteReturn('${ret.id}')" title="حذف إذن المرتجع">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openCreateReturnModal(preselectedInvoiceNumber = null) {
    const modal = document.getElementById('return-create-modal');
    if (!modal) return;

    const invoices = MIFAD_DB.getInvoices();
    const invSelect = document.getElementById('return-invoice-select');
    if (invSelect) {
      invSelect.innerHTML = '<option value="">-- اختر الفاتورة المراد عمل مرتجع عليها --</option>' +
        invoices.map(inv => `<option value="${inv.invoiceNumber}">${inv.invoiceNumber} - ${inv.customerName} (${formatCurrency(inv.netAmount)})</option>`).join('');
      if (preselectedInvoiceNumber) {
        invSelect.value = preselectedInvoiceNumber;
      }
    }

    document.getElementById('return-date').value = new Date().toISOString().split('T')[0];
    const seq = String(MIFAD_DB.getReturns().length + 1).padStart(4, '0');
    document.getElementById('return-number').value = `RET-${new Date().getFullYear()}-${seq}`;
    document.getElementById('return-general-notes').value = '';

    onReturnInvoiceSelected();
    modal.classList.add('active');
  }

  function onReturnInvoiceSelected() {
    const invSelect = document.getElementById('return-invoice-select');
    const invNum = invSelect ? invSelect.value : '';
    const infoCard = document.getElementById('return-invoice-info-card');
    const tbody = document.getElementById('return-items-table-body');

    if (!invNum) {
      if (infoCard) infoCard.style.display = 'none';
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 16px; color: #94a3b8;">اختر فاتورة من القائمة بالأعلى لعرض بنودها</td></tr>`;
      calculateReturnTotals();
      return;
    }

    const inv = MIFAD_DB.getInvoices().find(i => i.invoiceNumber === invNum);
    if (!inv) return;

    if (infoCard) {
      infoCard.style.display = 'block';
      document.getElementById('return-cust-name').textContent = inv.customerName;
      document.getElementById('return-cust-code').textContent = inv.customerCode || '-';
      document.getElementById('return-sales-person').textContent = inv.salesPerson || '-';
      document.getElementById('return-inv-date').textContent = inv.invoiceDate;
      document.getElementById('return-inv-net').textContent = formatCurrency(inv.netAmount);
    }

    if (tbody) {
      if (!inv.items || inv.items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 16px; color: #94a3b8;">هذه الفاتورة لا تحتوي على بنود</td></tr>`;
      } else {
        tbody.innerHTML = inv.items.map((it, idx) => `
          <tr data-idx="${idx}">
            <td style="font-weight: bold; color: var(--primary);">${it.code || '-'}</td>
            <td style="font-weight: 700;">${it.name || ''}</td>
            <td>${it.unit || '1kg'}</td>
            <td style="font-family: monospace;">${formatNumber(it.price)}</td>
            <td style="font-weight: bold; color: var(--secondary);">${it.qty}</td>
            <td>
              <input type="number" min="0" max="${it.qty}" step="any" class="form-control return-qty-input"
                     data-idx="${idx}" data-price="${it.price}" data-max="${it.qty}" value="0"
                     style="width: 100px; text-align: center; font-weight: bold; color: #dc2626; border-color: #fca5a5;">
            </td>
            <td style="font-weight: bold; color: #dc2626;" id="return-row-total-${idx}">0.00 ج.م</td>
            <td>
              <select class="form-control return-reason-input" data-idx="${idx}" style="font-size: 0.85rem;">
                <option value="تالف / معيب">تالف / معيب</option>
                <option value="غير مطابق للمواصفات">غير مطابق للمواصفات</option>
                <option value="انتهاء أو قرب الصلاحية">انتهاء أو قرب الصلاحية</option>
                <option value="زيادة عن طلب العميل">زيادة عن طلب العميل</option>
                <option value="خطأ في التوريد">خطأ في التوريد</option>
                <option value="أخرى">أخرى</option>
              </select>
            </td>
          </tr>
        `).join('');

        // Attach listeners
        tbody.querySelectorAll('.return-qty-input').forEach(input => {
          input.addEventListener('input', () => {
            const idx = input.getAttribute('data-idx');
            const price = parseFloat(input.getAttribute('data-price')) || 0;
            const max = parseFloat(input.getAttribute('data-max')) || 0;
            let qty = parseFloat(input.value) || 0;
            if (qty < 0) { qty = 0; input.value = 0; }
            if (qty > max) {
              alert(`الكمية المرتجعة لا يمكن أن تتجاوز الكمية الأصلية بالفاتورة (${max})`);
              qty = max;
              input.value = max;
            }
            const rowTot = Math.round((qty * price) * 100) / 100;
            const rowTotEl = document.getElementById(`return-row-total-${idx}`);
            if (rowTotEl) rowTotEl.textContent = formatCurrency(rowTot);
            calculateReturnTotals();
          });
        });
      }
    }

    calculateReturnTotals();
  }

  function calculateReturnTotals() {
    let total = 0;
    const qtyInputs = document.querySelectorAll('.return-qty-input');
    qtyInputs.forEach(input => {
      const price = parseFloat(input.getAttribute('data-price')) || 0;
      const qty = parseFloat(input.value) || 0;
      total += (qty * price);
    });

    total = Math.round(total * 100) / 100;
    const calcTotalEl = document.getElementById('return-calc-total');
    const calcTafqeetEl = document.getElementById('return-calc-tafqeet');
    if (calcTotalEl) calcTotalEl.textContent = formatCurrency(total);
    if (calcTafqeetEl) calcTafqeetEl.textContent = (typeof tafqeet === 'function') ? tafqeet(total) : (total + ' ج.م');

    return total;
  }

  function saveReturnFromModal() {
    const invSelect = document.getElementById('return-invoice-select');
    const invNum = invSelect ? invSelect.value : '';
    if (!invNum) {
      alert('يرجى اختيار الفاتورة أولاً');
      return;
    }

    const inv = MIFAD_DB.getInvoices().find(i => i.invoiceNumber === invNum);
    if (!inv) {
      alert('الفاتورة غير موجودة');
      return;
    }

    const returnedItems = [];
    const rows = document.querySelectorAll('#return-items-table-body tr');
    rows.forEach(row => {
      const idx = row.getAttribute('data-idx');
      if (idx !== null) {
        const item = inv.items[idx];
        const qtyInput = row.querySelector('.return-qty-input');
        const reasonSelect = row.querySelector('.return-reason-input');
        const returnQty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
        if (returnQty > 0) {
          returnedItems.push({
            code: item.code,
            name: item.name,
            unit: item.unit || '1kg',
            price: item.price,
            originalQty: item.qty,
            returnQty: returnQty,
            total: Math.round((returnQty * item.price) * 100) / 100,
            reason: reasonSelect ? reasonSelect.value : 'تالف / معيب'
          });
        }
      }
    });

    if (returnedItems.length === 0) {
      alert('يرجى تحديد كمية المرتجع لصنف واحد على الأقل (أكبر من صفر)');
      return;
    }

    const totalAmount = returnedItems.reduce((acc, it) => acc + it.total, 0);
    const returnNumber = document.getElementById('return-number').value.trim();
    const returnDate = document.getElementById('return-date').value || new Date().toISOString().split('T')[0];
    const notes = document.getElementById('return-general-notes').value.trim();

    const returnObj = {
      returnNumber,
      invoiceNumber: inv.invoiceNumber,
      invoiceId: inv.id,
      customerCode: inv.customerCode,
      customerName: inv.customerName,
      salesPerson: inv.salesPerson,
      date: returnDate,
      items: returnedItems,
      totalAmount: totalAmount,
      tafqeetText: (typeof tafqeet === 'function') ? tafqeet(totalAmount) : (totalAmount + ' ج.م'),
      notes: notes,
      createdAt: new Date().toISOString()
    };

    const saved = MIFAD_DB.saveReturn(returnObj);
    document.getElementById('return-create-modal').classList.remove('active');

    // Refresh views
    renderReturnsList();
    renderInvoicesList();
    renderDashboard();

    showNotification(`تم اعتماد إذن المرتجع ${saved.returnNumber} وتنزيل قيمته (${formatCurrency(saved.totalAmount)}) من كشف حساب العميل!`, 'success');

    // Prompt to print
    setTimeout(() => {
      if (confirm(`تم حفظ المرتجع بنجاح.\nهل تريد طباعة إذن المرتجع الرسمي المعتمد الآن؟`)) {
        printReturnVoucher(saved.id);
      }
    }, 400);
  }

  function printReturnVoucher(returnId) {
    const ret = MIFAD_DB.getReturnById(returnId);
    if (!ret) return;

    const modal = document.getElementById('return-print-modal');
    const container = document.getElementById('return-print-render-target');
    const logoSrc = window.MIFAD_LOGO_BASE64 || 'assets/mifad_logo.png';

    const itemsHtml = (ret.items || []).map((it, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-weight: bold;">${it.code || '-'}</td>
        <td style="text-align: right; font-weight: 700;">${it.name || ''}</td>
        <td>${it.unit || '1kg'}</td>
        <td style="font-weight: bold; color: #dc2626; font-size: 11pt;">${it.returnQty}</td>
        <td>${formatNumber(it.price)}</td>
        <td style="font-weight: bold; color: #dc2626;">${formatNumber(it.total)}</td>
        <td style="font-size: 8.5pt;">${it.reason || 'تالف'}</td>
      </tr>
    `).join('');

    const html = `
      <div class="return-voucher-sheet">
        <!-- Top Header -->
        <div class="sheet-top">
          <div class="sheet-logo-box">
            <div class="sheet-logo-title">شركة مصر للمستحضرات الغذائية - ميفاد</div>
            <img src="${logoSrc}" class="sheet-logo-img" alt="MIFAD Logo">
          </div>
          <div class="sheet-top-meta">
            <div>رقم الإذن: ${ret.returnNumber}</div>
            <div>تاريخ المرتجع: ${formatDateDisplay(ret.date)}</div>
            <div class="sheet-doc-code">SM/FM/12</div>
          </div>
        </div>

        <!-- Title -->
        <div class="receipt-title-box" style="border-color: #dc2626;">
          <h2 style="color: #991b1b;">إشعار إضافة / إذن استلام مرتجع مبيعات (Sales Return Note)</h2>
          <div style="font-size: 9.5pt; font-weight: bold; margin-top: 4px;">مرتجع على الفاتورة رقم: ${ret.invoiceNumber}</div>
        </div>

        <!-- Meta Details -->
        <div class="sheet-meta-grid" style="background: #fff1f2; padding: 10px; border: 1px solid #fecdd3; margin-bottom: 16px;">
          <div class="sheet-meta-col">
            <div class="meta-row"><span class="meta-label">اسم العميل:</span> <span class="meta-val">${ret.customerName}</span></div>
            <div class="meta-row"><span class="meta-label">كود العميل:</span> <span class="meta-val">${ret.customerCode || '-'}</span></div>
            <div class="meta-row"><span class="meta-label">الفاتورة الأصلية:</span> <span class="meta-val" style="font-weight: bold;">${ret.invoiceNumber}</span></div>
          </div>
          <div class="sheet-meta-col" style="text-align: left;">
            <div class="meta-row" style="justify-content: flex-end;"><span class="meta-label">مسؤول البيع:</span> <span class="meta-val">${ret.salesPerson || '-'}</span></div>
            <div class="meta-row" style="justify-content: flex-end;"><span class="meta-label">تاريخ الحركة:</span> <span class="meta-val">${formatDateDisplay(ret.date)}</span></div>
            <div class="meta-row" style="justify-content: flex-end;"><span class="meta-label">حالة القيد:</span> <span class="meta-val" style="color: #15803d; font-weight: bold;">تم التنزيل من كشف الحساب ✅</span></div>
          </div>
        </div>

        <!-- Items Table -->
        <table class="sheet-table" style="font-size: 8.5pt;">
          <thead>
            <tr style="background: #fee2e2;">
              <th style="width: 30px;">م</th>
              <th style="width: 110px;">كود الصنف</th>
              <th>اسم الصنف والمواصفات</th>
              <th style="width: 60px;">الوحدة</th>
              <th style="width: 70px; background: #fecdd3; color: #9f1239;">كمية المرتجع</th>
              <th style="width: 80px;">سعر الوحدة</th>
              <th style="width: 90px;">القيمة</th>
              <th style="width: 140px;">سبب الإرجاع</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Totals & Tafqeet -->
        <div style="background: #f8fafc; border: 1px solid #000; padding: 12px; margin: 12px 0; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: bold; font-size: 9.5pt;">التفقيط بالعربي:</div>
            <div style="font-size: 9.5pt; color: var(--secondary); font-weight: 800;">${ret.tafqeetText || tafqeet(ret.totalAmount)}</div>
          </div>
          <div style="text-align: left;">
            <div style="font-size: 9pt; color: #475569;">إجمالي قيمة المرتجع المستحقة للعميل</div>
            <div style="font-size: 14pt; font-weight: 900; color: #b91c1c;">${formatCurrency(ret.totalAmount)}</div>
          </div>
        </div>

        ${ret.notes ? `<div style="font-size: 8.5pt; margin-bottom: 12px;"><strong>ملاحظات:</strong> ${ret.notes}</div>` : ''}

        <!-- Signatures Block -->
        <div class="sheet-signatures" style="margin-top: 30px;">
          <div class="sig-block">
            <div>أمين المخزن المستلم</div>
            <div class="sig-name">....................</div>
          </div>
          <div class="sig-block">
            <div>مراقب الجودة / الفحص</div>
            <div class="sig-name">....................</div>
          </div>
          <div class="sig-block">
            <div>مسؤول المبيعات</div>
            <div class="sig-name">${ret.salesPerson || '....................'}</div>
          </div>
          <div class="sig-block">
            <div>إدارة الحسابات</div>
            <div class="sig-name">محمود جمال</div>
          </div>
          <div class="sig-block">
            <div>توقيع العميل / المندوب</div>
            <div class="sig-name">....................</div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    modal.classList.add('active');
  }

  function deleteReturn(returnId) {
    if (confirm('هل أنت متأكد من حذف إذن المرتجع هذا؟ سيتم إلغاء خصمه وإرجاع قيمة الفاتورة وحساب العميل كما كانت.')) {
      MIFAD_DB.deleteReturn(returnId);
      renderReturnsList();
      renderInvoicesList();
      renderDashboard();
      showNotification('تم حذف إذن المرتجع وتحديث الحسابات بنجاح.', 'info');
    }
  }

  // =========================================================
  // CUSTOMERS & ACCOUNT STATEMENTS (كشوف الحسابات)
  // =========================================================
  function initCustomersPage() {
    const searchInput = document.getElementById('customers-search-input');
    const salesFilter = document.getElementById('customers-sales-filter');
    const btnAddCust = document.getElementById('btn-add-customer');
    const btnSaveCust = document.getElementById('btn-save-customer-modal');
    const btnSavePayment = document.getElementById('btn-save-payment-modal');
    const btnReseedExcel = document.getElementById('btn-reseed-excel');

    if (salesFilter) {
      const salesPersons = MIFAD_DB.getSalesPersons();
      salesFilter.innerHTML = '<option value="">-- كل مسؤولي البيع (Col E) --</option>' +
        salesPersons.map(sp => `<option value="${sp}">${sp}</option>`).join('');
      salesFilter.addEventListener('change', () => {
        renderCustomersList();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        renderCustomersList();
      });
    }

    if (btnAddCust) {
      btnAddCust.addEventListener('click', () => {
        openCustomerModal();
      });
    }

    if (btnSaveCust) {
      btnSaveCust.addEventListener('click', saveCustomerFromModal);
    }

    if (btnSavePayment) {
      btnSavePayment.addEventListener('click', savePaymentFromModal);
    }

    if (btnReseedExcel) {
      btnReseedExcel.addEventListener('click', () => {
        const res = MIFAD_DB.reloadExcelSeed();
        if (res) {
          showNotification(`تمت استعادة ${res.customersCount} عميل و ${res.productsCount} صنف و ${res.salesPersonsCount} مسؤول بيع من الإكسيل بنجاح!`, 'success');
          renderCustomersList();
          populateCustomerDropdown();
          renderProductsList();
          renderDashboard();
        }
      });
    }
  }

  function renderCustomersList(customQuery = null) {
    const tbody = document.getElementById('customers-list-body');
    if (!tbody) return;

    const searchInput = document.getElementById('customers-search-input');
    const salesFilter = document.getElementById('customers-sales-filter');
    const q = (customQuery !== null ? customQuery : (searchInput ? searchInput.value : '')).trim().toLowerCase();
    const selectedSp = salesFilter ? salesFilter.value : '';

    let customers = MIFAD_DB.getCustomers();

    // Update count badge
    const badge = document.getElementById('customers-badge-count');
    if (badge) badge.textContent = `${customers.length} عميل معتمد`;

    if (q) {
      customers = customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.territory && c.territory.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.accountNumber && c.accountNumber.includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.salesPerson && c.salesPerson.toLowerCase().includes(q))
      );
    }

    if (selectedSp) {
      customers = customers.filter(c => c.salesPerson === selectedSp);
    }

    if (customers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; color: #94a3b8;">لا يوجد عملاء يطابقون البحث</td></tr>`;
      return;
    }

    tbody.innerHTML = customers.map(c => {
      const stmt = MIFAD_DB.getCustomerStatement(c.code);
      const balColor = stmt.balance > 0 ? 'var(--accent)' : (stmt.balance < 0 ? 'var(--success)' : 'var(--text-muted)');

      return `
        <tr>
          <td style="font-weight: bold; color: var(--primary);">${c.code}</td>
          <td style="font-weight: 700;">${c.name}</td>
          <td>${c.territory || c.address || '-'}</td>
          <td style="font-family: monospace; font-weight: bold; color: #0284c7;">${c.accountNumber || c.phone || '-'}</td>
          <td style="font-weight: 600;">${c.salesPerson || '-'}</td>
          <td style="font-weight: 800; color: ${balColor};">${formatCurrency(stmt.balance)}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-sm btn-primary" onclick="MIFAD_APP.openCustomerStatement('${c.code}')">📑 كشف حساب</button>
              <button class="btn btn-sm btn-success" onclick="MIFAD_APP.openPaymentModal('${c.code}')">💵 تحصيل</button>
              <button class="btn btn-sm btn-outline" onclick="MIFAD_APP.editCustomer('${c.id}')">✏️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openCustomerModal(cust = null) {
    document.getElementById('modal-customer-id').value = cust ? cust.id : '';
    document.getElementById('modal-customer-code').value = cust ? cust.code : ('CUST-' + Math.floor(1000000000 + Math.random() * 9000000000));
    document.getElementById('modal-customer-name').value = cust ? cust.name : '';
    document.getElementById('modal-customer-address').value = cust ? cust.address : '';
    document.getElementById('modal-customer-phone').value = cust ? cust.phone : '';
    document.getElementById('modal-customer-opening').value = cust ? cust.openingBalance : 0;
    document.getElementById('modal-customer-notes').value = cust ? cust.notes : '';

    document.getElementById('customer-edit-modal').classList.add('active');
  }

  function editCustomer(custId) {
    const cust = MIFAD_DB.getCustomers().find(c => c.id === custId);
    if (cust) openCustomerModal(cust);
  }

  function saveCustomerFromModal() {
    const id = document.getElementById('modal-customer-id').value;
    const code = document.getElementById('modal-customer-code').value.trim();
    const name = document.getElementById('modal-customer-name').value.trim();
    const address = document.getElementById('modal-customer-address').value.trim();
    const phone = document.getElementById('modal-customer-phone').value.trim();
    const openingBalance = parseFloat(document.getElementById('modal-customer-opening').value) || 0;
    const notes = document.getElementById('modal-customer-notes').value.trim();

    if (!name) {
      alert('يرجى إدخال اسم العميل');
      return;
    }

    MIFAD_DB.addCustomer({
      id: id || ('cust-' + Date.now()),
      code: code || ('CUST-' + Math.floor(1000000000 + Math.random() * 9000000000)),
      name,
      address,
      phone,
      openingBalance,
      notes
    });

    document.getElementById('customer-edit-modal').classList.remove('active');
    renderCustomersList();
    populateCustomerDropdown();
    showNotification('تم حفظ بيانات العميل بنجاح', 'success');
  }

  function openPaymentModal(custCode) {
    const cust = MIFAD_DB.getCustomerByCode(custCode);
    if (!cust) return;

    const stmt = MIFAD_DB.getCustomerStatement(custCode);

    document.getElementById('modal-payment-cust-code').value = cust.code;
    document.getElementById('modal-payment-cust-name').textContent = cust.name;
    document.getElementById('modal-payment-cust-balance').textContent = formatCurrency(stmt.balance);
    document.getElementById('modal-payment-amount').value = stmt.balance > 0 ? stmt.balance : '';
    document.getElementById('modal-payment-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-payment-method').value = 'تحويل بنكي';
    document.getElementById('modal-payment-ref').value = '';
    document.getElementById('modal-payment-notes').value = '';

    document.getElementById('payment-record-modal').classList.add('active');
  }

  function savePaymentFromModal() {
    const custCode = document.getElementById('modal-payment-cust-code').value;
    const cust = MIFAD_DB.getCustomerByCode(custCode);
    const amount = parseFloat(document.getElementById('modal-payment-amount').value);
    const date = document.getElementById('modal-payment-date').value;
    const method = document.getElementById('modal-payment-method').value;
    const reference = document.getElementById('modal-payment-ref').value.trim();
    const notes = document.getElementById('modal-payment-notes').value.trim();

    if (isNaN(amount) || amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح للدفعة');
      return;
    }

    MIFAD_DB.addPayment({
      id: 'pay-' + Date.now(),
      receiptNumber: 'REC-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
      customerCode: custCode,
      customerName: cust ? cust.name : '',
      amount: amount,
      date: date,
      method: method,
      reference: reference,
      notes: notes
    });

    document.getElementById('payment-record-modal').classList.remove('active');
    renderCustomersList();
    renderDashboard();
    showNotification(`تم تسجيل سداد بمبلغ ${formatCurrency(amount)} لحساب العميل بنجاح!`, 'success');
  }

  // Statement View Modal
  function openCustomerStatement(custCode) {
    const stmt = MIFAD_DB.getCustomerStatement(custCode);
    if (!stmt.customer) return;

    const modal = document.getElementById('statement-modal');
    const container = document.getElementById('statement-render-target');
    const logoSrc = window.MIFAD_LOGO_BASE64 || 'assets/mifad_logo.png';

    const trHtml = stmt.transactions.map((t, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${t.date}</td>
        <td style="font-weight: 600;">${t.type}</td>
        <td style="color: var(--primary); font-weight: bold;">${t.ref}</td>
        <td style="text-align: right;">${t.description}</td>
        <td style="font-weight: bold; color: ${t.debit > 0 ? '#b91c1c' : '#000'};">${t.debit > 0 ? formatNumber(t.debit) : '-'}</td>
        <td style="font-weight: bold; color: ${t.credit > 0 ? '#15803d' : '#000'};">${t.credit > 0 ? formatNumber(t.credit) : '-'}</td>
        <td style="font-weight: 900; background: #f8fafc;">${formatNumber(t.balance)}</td>
      </tr>
    `).join('');

    const html = `
      <div class="official-invoice-sheet" style="max-width: 900px;">
        <div class="sheet-top">
          <div class="sheet-logo-box">
            <div class="sheet-logo-title">شركة مصر للمستحضرات الغذائية - ميفاد</div>
            <img src="${logoSrc}" class="sheet-logo-img" alt="MIFAD Logo">
          </div>
          <div class="sheet-top-meta">
            <div>كشف حساب عميل تفصيلي</div>
            <div>تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}</div>
            <div class="sheet-doc-code">MIFAD-STMT-01</div>
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 12px 16px; border: 1px solid #000; margin: 12px 0 16px 0; display: flex; justify-content: space-between;">
          <div>
            <div style="font-size: 11pt; font-weight: 800;">العميل: ${stmt.customer.name}</div>
            <div style="font-size: 9pt;">كود العميل: ${stmt.customer.code} | هاتف: ${stmt.customer.phone || '-'}</div>
            <div style="font-size: 9pt;">العنوان: ${stmt.customer.address || '-'}</div>
          </div>
          <div style="text-align: left;">
            <div style="font-size: 9pt; color: #475569;">الرصيد المستحق الحالي</div>
            <div style="font-size: 15pt; font-weight: 900; color: ${stmt.balance > 0 ? '#b91c1c' : '#15803d'};">${formatCurrency(stmt.balance)}</div>
          </div>
        </div>

        <table class="sheet-table" style="font-size: 8.5pt;">
          <thead>
            <tr style="background: #e2e8f0;">
              <th style="width: 30px;">م</th>
              <th style="width: 75px;">التاريخ</th>
              <th style="width: 90px;">نوع الحركة</th>
              <th style="width: 110px;">رقم المرجع</th>
              <th>البيان والملاحظات</th>
              <th style="width: 80px;">مدين (لنا)</th>
              <th style="width: 80px;">دائن (سدد)</th>
              <th style="width: 90px;">الرصيد التراكمي</th>
            </tr>
          </thead>
          <tbody>
            ${trHtml.length > 0 ? trHtml : `<tr><td colspan="8" class="text-center" style="padding: 16px;">لا توجد حركات مسجلة لهذا العميل حتى الآن</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="background: #e2e8f0; font-weight: bold; font-size: 9pt;">
              <td colspan="5" style="text-align: left; padding-left: 10px;">إجمالي الحركات</td>
              <td style="color: #b91c1c;">${formatNumber(stmt.totalDebit)}</td>
              <td style="color: #15803d;">${formatNumber(stmt.totalCredit)}</td>
              <td style="font-size: 10pt; font-weight: 900;">${formatNumber(stmt.balance)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 16px; font-size: 9pt; text-align: center; font-weight: bold;">
          صافي الرصيد المستحق: ${tafqeet(stmt.balance)}
        </div>

        <div class="sheet-signatures" style="margin-top: 36px;">
          <div class="sig-block">
            <div>إدارة الحسابات</div>
            <div class="sig-name">محمود جمال</div>
          </div>
          <div class="sig-block">
            <div>اعتماد المدير المالي</div>
            <div class="sig-name">....................</div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    modal.classList.add('active');
  }

  // =========================================================
  // PRODUCTS CATALOG & EXCEL IMPORT (كتالوج الأصناف)
  // =========================================================
  function initProductsPage() {
    const searchInput = document.getElementById('products-search-input');
    const btnAddProduct = document.getElementById('btn-add-product');
    const btnSaveProduct = document.getElementById('btn-save-product-modal');
    const excelFileInput = document.getElementById('excel-products-file');
    const btnImportExcel = document.getElementById('btn-import-excel-products');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderProductsList(e.target.value);
      });
    }

    if (btnAddProduct) {
      btnAddProduct.addEventListener('click', () => {
        openProductModal();
      });
    }

    if (btnSaveProduct) {
      btnSaveProduct.addEventListener('click', saveProductFromModal);
    }

    // Excel file import
    if (btnImportExcel && excelFileInput) {
      btnImportExcel.addEventListener('click', () => excelFileInput.click());

      excelFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleExcelProductsImport(e.target.files[0]);
        }
      });
    }
  }

  function renderProductsList(filter = '') {
    const tbody = document.getElementById('products-list-body');
    if (!tbody) return;

    let products = MIFAD_DB.getProducts();
    if (filter) {
      const q = filter.trim().toLowerCase();
      products = products.filter(p => 
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
      );
    }

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; color: #94a3b8;">لا توجد أصناف مسجلة مطابقة للبحث</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map((p, idx) => `
      <tr>
        <td style="text-align: center; width: 40px;">${idx + 1}</td>
        <td style="font-weight: bold; color: var(--primary); font-family: monospace;">${p.code}</td>
        <td style="font-weight: 700;">${p.name}</td>
        <td style="text-align: center;">${p.raw_uom || p.unit || '-'}</td>
        <td style="text-align: center; font-weight: bold; color: #0284c7;">${p.weight || p.unit || '-'}</td>
        <td style="text-align: center; font-weight: bold; color: var(--secondary);">${formatCurrency(p.price)}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="MIFAD_APP.editProduct('${p.code}')">✏️ تعديل</button>
        </td>
      </tr>
    `).join('');
  }

  function openProductModal(prod = null) {
    document.getElementById('modal-prod-code').value = prod ? prod.code : '';
    document.getElementById('modal-prod-name').value = prod ? prod.name : '';
    document.getElementById('modal-prod-unit').value = prod ? (prod.raw_uom || prod.unit) : '1kg';
    document.getElementById('modal-prod-price').value = prod ? prod.price : '';
    document.getElementById('modal-prod-weight').value = prod ? prod.weight : '';

    document.getElementById('product-edit-modal').classList.add('active');
  }

  function editProduct(code) {
    const prod = MIFAD_DB.getProducts().find(p => p.code === code);
    if (prod) openProductModal(prod);
  }

  function saveProductFromModal() {
    const code = document.getElementById('modal-prod-code').value.trim();
    const name = document.getElementById('modal-prod-name').value.trim();
    const unit = document.getElementById('modal-prod-unit').value.trim() || '1kg';
    const price = parseFloat(document.getElementById('modal-prod-price').value) || 0;
    const weight = document.getElementById('modal-prod-weight').value.trim();

    if (!code || !name) {
      alert('يرجى إدخال كود واسم الصنف');
      return;
    }

    MIFAD_DB.addProduct({
      code,
      name,
      unit,
      price,
      weight: weight || unit
    });

    document.getElementById('product-edit-modal').classList.remove('active');
    renderProductsList();
    showNotification('تم حفظ الصنف في الكتالوج بنجاح', 'success');
  }

  // Weight matching helper based on Mahmoud's rules
  function matchProductWeightHelper(code, name, uom) {
    code = (code || '').toString().trim();
    name = (name || '').toString().trim();
    uom = (uom || '').toString().trim();

    // 1. From code (Col A): check last 3 digits
    let codeWt = null;
    const mCode = code.match(/(\d{3})$/);
    if (mCode) {
      const val = parseInt(mCode[1], 10);
      if ([1, 2, 3, 5, 10, 12, 14, 15, 20, 25, 30, 50, 100, 200].includes(val)) {
        codeWt = val;
      } else if (val === 500 || val === 800) {
        codeWt = val + ' جم';
      }
    }

    // 2. From name (Col B): check ( X كجم ) or ( X kg ) or X جم
    let nameWt = null;
    const mNameKg = name.match(/(\d+)\s*(?:كجم|ك|kg|kilo)\b/i);
    if (mNameKg) {
      nameWt = parseInt(mNameKg[1], 10);
    } else {
      const mNameGm = name.match(/(\d+)\s*(?:جم|جرام|gm|g)\b/i);
      if (mNameGm) {
        nameWt = mNameGm[1] + ' جم';
      }
    }

    // 3. From UOM (Col I/J):
    let uomWt = null;
    const isSK = /SK/i.test(uom);
    const mUomKg = uom.match(/(\d+)\s*KG/i);
    if (mUomKg) {
      uomWt = parseInt(mUomKg[1], 10);
    } else if (/800\s*GM/i.test(uom)) {
      uomWt = '800 جم';
    } else if (/500\s*GM/i.test(uom)) {
      uomWt = '500 جم';
    }

    // Harmonize matched weight
    let finalWt = null;
    if (uomWt !== null) finalWt = uomWt;
    else if (nameWt !== null) finalWt = nameWt;
    else if (codeWt !== null) finalWt = codeWt;

    let weightStr = '1 كجم';
    if (finalWt !== null) {
      weightStr = typeof finalWt === 'number' ? `${finalWt} كجم` : String(finalWt);
    }

    let unitStr = weightStr;
    if (isSK) {
      unitStr = finalWt ? `كيس ${weightStr} (SK)` : 'كيس (SK)';
    } else if (uom) {
      unitStr = uom;
    }

    return { weight: weightStr, unit: unitStr, isSK, rawUom: uom };
  }

  function handleExcelProductsImport(file) {
    if (typeof XLSX === 'undefined') {
      alert('مكتبة استيراد Excel غير جاهزة');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (json.length < 2) {
          alert('الملف فارغ أو لا يحتوي على صفوف بيانات كافية');
          return;
        }

        // Try to identify columns by inspecting header row
        const header = json[0].map(h => (h || '').toString().trim());
        let codeIdx = header.findIndex(h => /item\s*code|كود\s*الصنف|كود/i.test(h));
        let nameIdx = header.findIndex(h => /item\s*name|اسم\s*الصنف|اسم/i.test(h));
        let custCodeIdx = header.findIndex(h => /^customer$|كود\s*العميل/i.test(h));
        let custNameIdx = header.findIndex(h => /customer\s*name|اسم\s*العميل/i.test(h));
        let salesIdx = header.findIndex(h => /sales\s*person|سيلز|مسئول\s*البيع/i.test(h));
        let accIdx = header.findIndex(h => /receivable\s*account|رقم\s*الحساب|رقم\s*العميل/i.test(h));
        let terrIdx = header.findIndex(h => /territory|مكان|عنوان|منطقة/i.test(h));
        let rateIdx = header.findIndex(h => /^rate$|سعر|price/i.test(h));
        let uomIdx = header.findIndex(h => /^uom$|وحدة|unit|وزن/i.test(h));

        // Fallbacks to user's layout: A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8
        if (codeIdx === -1) codeIdx = 0;
        if (nameIdx === -1) nameIdx = 1;
        if (custCodeIdx === -1 && header.length > 2) custCodeIdx = 2;
        if (custNameIdx === -1 && header.length > 3) custNameIdx = 3;
        if (salesIdx === -1 && header.length > 4) salesIdx = 4;
        if (accIdx === -1 && header.length > 5) accIdx = 5;
        if (terrIdx === -1 && header.length > 6) terrIdx = 6;
        if (rateIdx === -1) {
          rateIdx = header.findIndex(h => /rate|price/i.test(h));
          if (rateIdx === -1) rateIdx = 7;
        }
        if (uomIdx === -1) {
          uomIdx = header.findIndex(h => /uom|unit/i.test(h));
          if (uomIdx === -1) uomIdx = 8;
        }

        const productsMap = {};
        const customersMap = {};
        const salesPersonsSet = new Set();

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;

          const code = (row[codeIdx] || '').toString().trim();
          const name = (row[nameIdx] || '').toString().trim();
          const custCode = custCodeIdx !== -1 ? (row[custCodeIdx] || '').toString().trim() : '';
          const custName = custNameIdx !== -1 ? (row[custNameIdx] || '').toString().trim() : '';
          const salesP = salesIdx !== -1 ? (row[salesIdx] || '').toString().trim() : '';
          const account = accIdx !== -1 ? (row[accIdx] || '').toString().trim() : '';
          const territory = terrIdx !== -1 ? (row[terrIdx] || '').toString().trim() : '';
          const rateVal = rateIdx !== -1 ? (parseFloat(row[rateIdx]) || 0) : 0;
          const uomVal = uomIdx !== -1 ? (row[uomIdx] || '').toString().trim() : '';

          if (salesP) salesPersonsSet.add(salesP);

          // Customer parsing
          if (custCode) {
            // Extract number only from account:
            let accDigits = '';
            const mAcc = account.match(/\d+/);
            if (mAcc) accDigits = mAcc[0];

            if (!customersMap[custCode]) {
              customersMap[custCode] = {
                id: 'cust-' + custCode,
                code: custCode,
                name: custName || custCode,
                accountNumber: accDigits,
                address: territory,
                territory: territory,
                salesPerson: salesP,
                phone: accDigits,
                openingBalance: 0,
                notes: `حساب: ${accDigits} | سيلز: ${salesP} | المنطقة: ${territory}`
              };
            }
          }

          // Product parsing with weight matching
          if (code) {
            const wtInfo = matchProductWeightHelper(code, name, uomVal);
            if (!productsMap[code]) {
              productsMap[code] = {
                code: code,
                name: name || code,
                price: rateVal,
                unit: wtInfo.unit,
                weight: wtInfo.weight,
                raw_uom: uomVal,
                rates: [rateVal]
              };
            } else if (rateVal > 0) {
              productsMap[code].price = rateVal;
              if (!productsMap[code].rates.includes(rateVal)) {
                productsMap[code].rates.push(rateVal);
              }
            }
          }
        }

        const prodsList = Object.values(productsMap);
        const custsList = Object.values(customersMap);

        if (prodsList.length > 0) {
          MIFAD_DB.bulkAddProducts(prodsList);
        }

        if (custsList.length > 0) {
          custsList.forEach(c => MIFAD_DB.addCustomer(c));
        }

        renderProductsList();
        renderCustomersList();
        populateCustomerDropdown();

        showNotification(`تم استيراد ${prodsList.length} صنف و ${custsList.length} عميل مع مطابقة الأوزان بنجاح!`, 'success');
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء قراءة ملف الإكسيل: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // =========================================================
  // SETTINGS & BACKUP MODULE
  // =========================================================
  function initSettingsPage() {
    const btnExport = document.getElementById('btn-export-backup');
    const btnImport = document.getElementById('btn-import-backup');
    const importFileInput = document.getElementById('import-backup-file');
    const btnReset = document.getElementById('btn-reset-defaults');

    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const json = MIFAD_DB.exportDatabase();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MIFAD_System_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('تم تصدير النسخة الاحتياطية بنجاح!', 'success');
      });
    }

    if (btnImport && importFileInput) {
      btnImport.addEventListener('click', () => importFileInput.click());
      importFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = function(evt) {
            if (MIFAD_DB.importDatabase(evt.target.result)) {
              showNotification('تم استعادة النسخة الاحتياطية بنجاح!', 'success');
              renderDashboard();
              renderInvoicesList();
              renderCustomersList();
              renderProductsList();
            } else {
              alert('الملف غير صالح للاستعادة');
            }
          };
          reader.readAsText(file);
        }
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('هل أنت متأكد من إعادة ضبط المصنع؟ سيتم استعادة نموذج عادل مصباح والبيانات الأساسية لميفاد.')) {
          localStorage.clear();
          MIFAD_DB.init();
          location.reload();
        }
      });
    }
  }

  // =========================================================
  // MODALS INITIALIZATION & HELPERS
  // =========================================================
  function initModals() {
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = btn.closest('.modal-overlay');
        if (modal) modal.classList.remove('active');
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });
  }

  function showNotification(msg, type = 'info') {
    let notif = document.getElementById('app-notification');
    if (!notif) {
      notif = document.createElement('div');
      notif.id = 'app-notification';
      notif.style.position = 'fixed';
      notif.style.bottom = '24px';
      notif.style.left = '24px';
      notif.style.zIndex = '9999';
      notif.style.padding = '14px 24px';
      notif.style.borderRadius = '10px';
      notif.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
      notif.style.fontWeight = '700';
      notif.style.fontSize = '0.95rem';
      notif.style.transition = 'all 0.3s ease';
      document.body.appendChild(notif);
    }

    notif.textContent = msg;
    if (type === 'success') {
      notif.style.background = '#0a7044';
      notif.style.color = '#ffffff';
    } else if (type === 'danger') {
      notif.style.background = '#dc2626';
      notif.style.color = '#ffffff';
    } else {
      notif.style.background = '#0284c7';
      notif.style.color = '#ffffff';
    }

    notif.style.opacity = '1';
    notif.style.transform = 'translateY(0)';

    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transform = 'translateY(10px)';
    }, 4000);
  }

  // Formatting Helpers
  function formatCurrency(num) {
    if (isNaN(num)) return '0 ج.م';
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ج.م';
  }

  function formatNumber(num) {
    if (isNaN(num)) return '0';
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDateDisplay(dStr) {
    if (!dStr) return '';
    if (dStr.includes('/')) return dStr;
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Expose Global App API
  window.MIFAD_APP = {
    switchTab,
    addNewTableRow,
    deleteTableRow,
    onRowCodeChange,
    onRowNameChange,
    onRowUnitChange,
    onRowQtyChange,
    onRowPriceChange,
    onRowTotalManualChange,
    onSelectCatalogProduct,
    calculateInvoiceTotals,
    printOfficialInvoice,
    printDeliveryReceipt,
    editInvoice,
    deleteInvoice,
    openCustomerStatement,
    openPaymentModal,
    editCustomer,
    editProduct,
    applyCustomerToInvoice,
    populateCustomerDropdown,
    renderCustomersList,
    renderReturnsList,
    openCreateReturnModal,
    printReturnVoucher,
    deleteReturn,
    viewInvoice: printOfficialInvoice
  };

})();
