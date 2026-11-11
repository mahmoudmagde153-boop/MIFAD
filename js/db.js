/**
 * Database & Persistence Layer for MIFAD System
 * شركة مصر للمستحضرات الغذائية - ميفاد (MIFAD)
 * يستخدم localStorage مع هيكلة بيانات متكاملة ودعم النسخ الاحتياطي
 */

(function(global) {
  'use strict';

  const STORAGE_KEYS = {
    CUSTOMERS: 'mifad_customers_v1',
    PRODUCTS: 'mifad_products_v1',
    INVOICES: 'mifad_invoices_v1',
    PAYMENTS: 'mifad_payments_v1',
    RETURNS: 'mifad_returns_v1',
    SETTINGS: 'mifad_settings_v1'
  };

  const DEFAULT_SETTINGS = {
    companyNameAr: 'شركة مصر للمستحضرات الغذائية - ميفاد',
    companyNameEn: 'MISR FOOD ADDITIVES - MIFAD',
    companySlogan: 'We add little, to change a lot',
    docCode: 'SM/FM/09',
    defaultSalesPerson: '',
    defaultReviewer: 'محمود جمال',
    defaultIssuer: 'خدمة العملاء',
    legalNotice: 'للشركة الحق في الرجوع علي العميل في حاله حدوث خطأ حسابي في الفاتوره'
  };

  const DEFAULT_CUSTOMERS = [
    {
      id: 'cust-1',
      code: 'CUST-1000011296',
      name: 'م/عادل مصباح',
      address: 'منطقة 45 الاسكندرية',
      phone: '01001234567',
      openingBalance: 0,
      notes: 'عميل رئيسي - إسكندرية',
      createdAt: '2026-10-20'
    },
    {
      id: 'cust-2',
      code: 'CUST-1000011450',
      name: 'شركة الأهرام للصناعات الغذائية',
      address: 'المنطقة الصناعية - برج العرب',
      phone: '01223456789',
      openingBalance: 0,
      notes: 'توريدات مصانع',
      createdAt: '2026-10-22'
    },
    {
      id: 'cust-3',
      code: 'CUST-1000011890',
      name: 'سوبر ماركت السلام',
      address: 'سموحة - الإسكندرية',
      phone: '01112223344',
      openingBalance: 0,
      notes: 'سلاسل تجارية',
      createdAt: '2026-10-25'
    }
  ];

  const DEFAULT_PRODUCTS = [
    { code: 'BS600205001', name: 'كريموسي 200 ( 1كجم )', unit: '1kg', price: 360, weight: '1 كجم' },
    { code: 'BS600203010', name: 'كريموسي 120 ( 10كجم )', unit: '10KG', price: 3600, weight: '10 كجم' },
    { code: 'BF110084001', name: 'CHEESE(P)NESTO)144377', unit: '1kg', price: 390, weight: '1 كجم' },
    { code: 'BF110085001', name: 'CHEESE(P)KIRI)144378', unit: '1kg', price: 470, weight: '1 كجم' },
    { code: 'BF110109601', name: 'CHEESE EDAM ( P ) 681724', unit: '1kg', price: 890, weight: '1 كجم' },
    { code: 'BF110109801', name: 'BLUE CHEESE ( P ) 498017', unit: '1kg', price: 990, weight: '1 كجم' },
    { code: 'BF110108701', name: 'Cream Milk ( P ) 821095 -1kg', unit: '1kg', price: 585, weight: '1 كجم' },
    { code: 'BF110109301', name: 'OLIVE BLACK ( L ) 765564', unit: '1kg', price: 970, weight: '1 كجم' },
    { code: 'BF110089001', name: 'CHEESE EMMENTAL ( P )643151', unit: '1kg', price: 785, weight: '1 كجم' }
  ];

  const DEFAULT_INVOICES = [
    {
      id: 'inv-1',
      invoiceNumber: 'B2B-SINV-2026-04360',
      invoiceDate: '2026-10-28',
      printDateTime: '26/10/2026 09:30:AM',
      poNumber: '',
      customerCode: 'CUST-1000011296',
      customerName: 'م/عادل مصباح',
      customerAddress: 'منطقة 45 الاسكندرية',
      salesPerson: 'م /خالد حسين',
      docCode: 'SM/FM/09',
      items: [
        { code: 'BS600205001', name: 'كريموسي 200 ( 1كجم )', qty: 1000, unit: '1kg', price: 360, total: 360000 },
        { code: 'BS600203010', name: 'كريموسي 120 ( 10كجم )', qty: 185, unit: '10KG', price: 3600, total: 666000 },
        { code: 'BS600203010', name: 'كريموسي 120 ( 10كجم )', qty: 90, unit: '10KG', price: 0, total: 0 },
        { code: 'BF110084001', name: 'CHEESE(P)NESTO)144377', qty: 500, unit: '1kg', price: 390, total: 195000 },
        { code: 'BF110085001', name: 'CHEESE(P)KIRI)144378', qty: 500, unit: '1kg', price: 470, total: 235000 },
        { code: 'BF110109601', name: 'CHEESE EDAM ( P ) 681724', qty: 12, unit: '1kg', price: 890, total: 10680 },
        { code: 'BF110109801', name: 'BLUE CHEESE ( P ) 498017', qty: 12, unit: '1kg', price: 990, total: 11880 },
        { code: 'BF110108701', name: 'Cream Milk ( P ) 821095 -1kg', qty: 16, unit: '1kg', price: 585, total: 9360 },
        { code: 'BF110109301', name: 'OLIVE BLACK ( L ) 765564', qty: 12, unit: '1kg', price: 970, total: 11640 },
        { code: 'BF110089001', name: 'CHEESE EMMENTAL ( P )643151', qty: 50, unit: '1kg', price: 785, total: 39250 }
      ],
      subtotal: 1538810,
      discountType: 'amount', // 'amount' or 'percent'
      discountValue: 0,
      discountAmount: 0,
      returnsAmount: 0,
      returnsNotes: '',
      netAmount: 1538810,
      tafqeetText: 'مليون وخمسمائة وثمانية وثلاثون ألفاً وثمانمائة وعشرة جنيهات فقط لا غير',
      sourceIssuer: 'خدمة العملاء',
      reviewer: 'محمود جمال',
      status: 'معتمدة', // معتمدة, مسودة, ملغاة
      notes: 'تم الاستخراج المباشر من نموذج فاتورة PDF عادل مصباح',
      createdAt: '2026-10-28T09:30:00'
    }
  ];

  const DEFAULT_PAYMENTS = [
    {
      id: 'pay-1',
      receiptNumber: 'REC-2026-001',
      customerCode: 'CUST-1000011296',
      customerName: 'م/عادل مصباح',
      amount: 538810,
      date: '2026-10-30',
      method: 'تحويل بنكي', // نقدي, شيك, تحويل بنكي
      reference: 'TRX-994821',
      notes: 'دفعة تحت حساب فاتورة B2B-SINV-2026-04360'
    }
  ];

  const DB = {
    init() {
      if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        this.saveSettings(DEFAULT_SETTINGS);
      }

      const seedData = (typeof window !== 'undefined' && window.MIFAD_EXCEL_SEED) ? window.MIFAD_EXCEL_SEED : null;

      // Seed customers and products from Excel dataset (367 customers, 444 products)
      const SEED_VERSION = 'v2_excel_367_customers_444_products';
      const isSeeded = localStorage.getItem('mifad_seeded_version') === SEED_VERSION;
      const currentCusts = this.getCustomers();
      const currentProds = this.getProducts();

      if (!isSeeded || currentCusts.length < 50) {
        if (seedData && seedData.customers && seedData.customers.length > 0) {
          this.saveCustomers(seedData.customers);
        } else if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
          this.saveCustomers(DEFAULT_CUSTOMERS);
        }
        if (seedData && seedData.products && seedData.products.length > 0) {
          this.saveProducts(seedData.products);
        } else if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
          this.saveProducts(DEFAULT_PRODUCTS);
        }
        localStorage.setItem('mifad_seeded_version', SEED_VERSION);
      }

      if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
        this.saveInvoices(DEFAULT_INVOICES);
      }
      if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
        this.savePayments(DEFAULT_PAYMENTS);
      }
    },

    reloadExcelSeed() {
      const seedData = (typeof window !== 'undefined' && window.MIFAD_EXCEL_SEED) ? window.MIFAD_EXCEL_SEED : null;
      if (seedData) {
        if (seedData.customers && seedData.customers.length > 0) {
          this.saveCustomers(seedData.customers);
        }
        if (seedData.products && seedData.products.length > 0) {
          this.saveProducts(seedData.products);
        }
        localStorage.setItem('mifad_seeded_version', 'v2_excel_367_customers_444_products');
        return {
          customersCount: seedData.customers.length,
          productsCount: seedData.products.length,
          salesPersonsCount: seedData.sales_persons ? seedData.sales_persons.length : 0
        };
      }
      return null;
    },

    getSalesPersons() {
      const list = new Set();
      const seedData = (typeof window !== 'undefined' && window.MIFAD_EXCEL_SEED) ? window.MIFAD_EXCEL_SEED : null;
      if (seedData && seedData.sales_persons && seedData.sales_persons.length > 0) {
        seedData.sales_persons.forEach(s => {
          if (s && s.toLowerCase() !== 'test') list.add(s.trim());
        });
      }
      try {
        const invoices = this.getInvoices();
        invoices.forEach(i => {
          if (i.salesPerson && i.salesPerson.trim()) list.add(i.salesPerson.trim());
        });
      } catch (e) {}
      if (list.size === 0) {
        ['Khaled Hussein', 'Saied El Shafey', 'Asem Khalil', 'Mahmoud Gamal',
         'Mohamed Soltan', 'Walid Shedid', 'Ahmed Kamal', 'Haidy Salem'].forEach(s => list.add(s));
      }
      return Array.from(list);
    },

    // Settings
    getSettings() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || DEFAULT_SETTINGS;
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    },
    saveSettings(settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    },

    // Customers
    getCustomers() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) || [];
      } catch (e) {
        return [];
      }
    },
    saveCustomers(customers) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    },
    addCustomer(customer) {
      const customers = this.getCustomers();
      if (!customer.id) customer.id = 'cust-' + Date.now();
      if (!customer.createdAt) customer.createdAt = new Date().toISOString().split('T')[0];
      // Check if code or name exists
      const existingIdx = customers.findIndex(c => c.code === customer.code || (c.name.trim() === customer.name.trim() && customer.name.trim() !== ''));
      if (existingIdx >= 0) {
        customers[existingIdx] = { ...customers[existingIdx], ...customer };
      } else {
        customers.push(customer);
      }
      this.saveCustomers(customers);
      return customer;
    },
    getCustomerByCode(code) {
      const customers = this.getCustomers();
      return customers.find(c => c.code === code) || null;
    },
    getCustomerByName(name) {
      if (!name) return null;
      const cleanName = name.replace(/^(م\s*\/|السيد\s*\/)/, '').trim().toLowerCase();
      const customers = this.getCustomers();
      return customers.find(c => {
        const cName = c.name.replace(/^(م\s*\/|السيد\s*\/)/, '').trim().toLowerCase();
        return cName === cleanName || c.name.trim() === name.trim();
      }) || null;
    },

    // Products
    getProducts() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || [];
      } catch (e) {
        return [];
      }
    },
    saveProducts(products) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    },
    addProduct(prod) {
      const products = this.getProducts();
      const idx = products.findIndex(p => p.code === prod.code);
      if (idx >= 0) {
        products[idx] = { ...products[idx], ...prod };
      } else {
        products.push(prod);
      }
      this.saveProducts(products);
      return prod;
    },
    bulkAddProducts(prodsList) {
      const products = this.getProducts();
      prodsList.forEach(p => {
        const idx = products.findIndex(item => item.code === p.code);
        if (idx >= 0) {
          products[idx] = { ...products[idx], ...p };
        } else {
          products.push(p);
        }
      });
      this.saveProducts(products);
    },

    // Invoices
    getInvoices() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES)) || [];
      } catch (e) {
        return [];
      }
    },
    saveInvoices(invoices) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    },
    addInvoice(inv) {
      const invoices = this.getInvoices();
      if (!inv.id) inv.id = 'inv-' + Date.now();
      if (!inv.createdAt) inv.createdAt = new Date().toISOString();
      
      const idx = invoices.findIndex(i => i.invoiceNumber === inv.invoiceNumber || i.id === inv.id);
      if (idx >= 0) {
        invoices[idx] = { ...invoices[idx], ...inv };
      } else {
        invoices.unshift(inv);
      }
      this.saveInvoices(invoices);

      // Auto update customer if not existing
      if (inv.customerName) {
        this.addCustomer({
          code: inv.customerCode || ('CUST-' + Math.floor(1000000000 + Math.random() * 9000000000)),
          name: inv.customerName,
          address: inv.customerAddress || '',
          phone: '',
          openingBalance: 0
        });
      }

      return inv;
    },
    getInvoiceById(id) {
      return this.getInvoices().find(i => i.id === id || i.invoiceNumber === id);
    },
    deleteInvoice(id) {
      let invoices = this.getInvoices();
      invoices = invoices.filter(i => i.id !== id && i.invoiceNumber !== id);
      this.saveInvoices(invoices);
    },

    // Payments
    getPayments() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS)) || [];
      } catch (e) {
        return [];
      }
    },
    savePayments(payments) {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    },
    addPayment(pay) {
      const payments = this.getPayments();
      if (!pay.id) pay.id = 'pay-' + Date.now();
      if (!pay.date) pay.date = new Date().toISOString().split('T')[0];
      payments.unshift(pay);
      this.savePayments(payments);
      return pay;
    },
    savePayment(pay) {
      return this.addPayment(pay);
    },
    deletePayment(id) {
      let payments = this.getPayments();
      payments = payments.filter(p => p.id !== id);
      this.savePayments(payments);
    },

    // =========================================================
    // Returns Module Storage (المرتجعات وإشعارات الخصم)
    // =========================================================
    getReturns() {
      const data = localStorage.getItem(STORAGE_KEYS.RETURNS);
      return data ? JSON.parse(data) : [];
    },
    saveReturns(returns) {
      localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(returns));
    },
    getReturnById(id) {
      return this.getReturns().find(r => r.id === id);
    },
    saveReturn(ret) {
      const returns = this.getReturns();
      if (!ret.id) ret.id = 'ret-' + Date.now();
      if (!ret.returnNumber) {
        const seq = String(returns.length + 1).padStart(4, '0');
        ret.returnNumber = `RET-${new Date().getFullYear()}-${seq}`;
      }
      if (!ret.createdAt) ret.createdAt = new Date().toISOString();
      if (!ret.date) ret.date = new Date().toISOString().split('T')[0];

      // Update the original invoice if exists
      const invoices = this.getInvoices();
      const inv = invoices.find(i => i.invoiceNumber === ret.invoiceNumber);
      if (inv) {
        inv.hasReturns = true;
        inv.returnsAmount = (Number(inv.returnsAmount) || 0) + Number(ret.totalAmount || 0);
        inv.netAmount = Math.max(0, Number(inv.subtotal) - Number(inv.discountAmount || 0) - Number(inv.returnsAmount));
        if (typeof tafqeet === 'function') {
          inv.tafqeetText = tafqeet(inv.netAmount);
        }
        inv.returnsNotes = (inv.returnsNotes ? (inv.returnsNotes + ' | ') : '') + (ret.notes || `إذن مرتجع ${ret.returnNumber}`);
        this.saveInvoices(invoices);
      }

      const existingIdx = returns.findIndex(r => r.id === ret.id);
      if (existingIdx >= 0) {
        returns[existingIdx] = ret;
      } else {
        returns.unshift(ret);
      }
      this.saveReturns(returns);
      return ret;
    },
    deleteReturn(id) {
      const returns = this.getReturns();
      const target = returns.find(r => r.id === id);
      if (target) {
        // Reverse from original invoice
        const invoices = this.getInvoices();
        const inv = invoices.find(i => i.invoiceNumber === target.invoiceNumber);
        if (inv) {
          inv.returnsAmount = Math.max(0, (Number(inv.returnsAmount) || 0) - Number(target.totalAmount || 0));
          inv.netAmount = Math.max(0, Number(inv.subtotal) - Number(inv.discountAmount || 0) - Number(inv.returnsAmount));
          if (typeof tafqeet === 'function') {
            inv.tafqeetText = tafqeet(inv.netAmount);
          }
          inv.hasReturns = (Number(inv.returnsAmount) > 0);
          this.saveInvoices(invoices);
        }
        const filtered = returns.filter(r => r.id !== id);
        this.saveReturns(filtered);
        return true;
      }
      return false;
    },

    // Customer Statement / Ledger Calculation
    getCustomerStatement(customerCode) {
      const customer = this.getCustomerByCode(customerCode);
      const invoices = this.getInvoices().filter(i => i.customerCode === customerCode || (customer && i.customerName && i.customerName.trim() === customer.name.trim()));
      const payments = this.getPayments().filter(p => p.customerCode === customerCode || (customer && p.customerName && p.customerName.trim() === customer.name.trim()));
      const returns = this.getReturns().filter(r => r.customerCode === customerCode || (customer && r.customerName && r.customerName.trim() === customer.name.trim()));

      let transactions = [];

      // Opening balance
      const opBal = customer ? Number(customer.openingBalance || 0) : 0;
      if (opBal !== 0) {
        transactions.push({
          date: customer.createdAt || '2026-01-01',
          type: 'رصيد افتتاحي',
          ref: 'OPENING',
          debit: opBal > 0 ? opBal : 0,
          credit: opBal < 0 ? Math.abs(opBal) : 0,
          description: 'رصيد افتتاحي سابق'
        });
      }

      // Invoices (Debit)
      invoices.forEach(inv => {
        // Base invoice amount before returns
        const baseInvAmount = Number(inv.subtotal || 0) - Number(inv.discountAmount || 0);
        transactions.push({
          date: inv.invoiceDate,
          type: inv.paymentType === 'cash' ? 'فاتورة مبيعات (نقدي)' : 'فاتورة مبيعات (آجل)',
          ref: inv.invoiceNumber,
          debit: baseInvAmount,
          credit: 0,
          description: `فاتورة مبيعات رقم ${inv.invoiceNumber} (${(inv.items || []).length} بنود)${inv.paymentType === 'cash' ? ' [معاملة نقدية]' : ' [كريديت / آجل]'}`
        });

        // If invoice recorded inline return that is NOT from the returns module
        if (Number(inv.returnsAmount || 0) > 0 && !inv.hasReturns) {
          transactions.push({
            date: inv.invoiceDate,
            type: 'مرتجع بضاعة (مباشر)',
            ref: 'RET-' + inv.invoiceNumber,
            debit: 0,
            credit: Number(inv.returnsAmount || 0),
            description: `مرتجع على فاتورة ${inv.invoiceNumber}: ${inv.returnsNotes || 'مرتجع أصناف'}`
          });
        }
      });

      // Returns from Returns Module (Credit - تخفيض وتنزيل من حساب العميل)
      returns.forEach(ret => {
        transactions.push({
          date: ret.date,
          type: 'إذن مرتجع (إشعار دائن)',
          ref: ret.returnNumber,
          debit: 0,
          credit: Number(ret.totalAmount || 0),
          description: `إذن مرتجع بضاعة رقم ${ret.returnNumber} على فاتورة ${ret.invoiceNumber} (${(ret.items || []).length} صنف مرتجع)`
        });
      });

      // Payments (Credit - سداد وتخفيض من حساب العميل)
      payments.forEach(pay => {
        transactions.push({
          date: pay.date,
          type: `سند قبض [${pay.method || 'نقدي'}]`,
          ref: pay.receiptNumber || 'REC-' + pay.id,
          debit: 0,
          credit: Number(pay.amount || 0),
          description: `سداد بواسطة [${pay.method || 'نقدي'}] ${pay.reference ? `(مرجع/تحويل: ${pay.reference})` : ''} ${pay.notes ? `- ${pay.notes}` : ''}`
        });
      });

      // Sort by date
      transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate running balance
      let runningBalance = 0;
      transactions.forEach(t => {
        runningBalance += (t.debit - t.credit);
        t.balance = runningBalance;
      });

      const totalDebit = transactions.reduce((acc, t) => acc + t.debit, 0);
      const totalCredit = transactions.reduce((acc, t) => acc + t.credit, 0);
      const balance = totalDebit - totalCredit;

      return {
        customer,
        transactions,
        totalDebit,
        totalCredit,
        balance
      };
    },

    // Overall Financial Summary for Dashboard
    getDashboardStats() {
      const invoices = this.getInvoices();
      const payments = this.getPayments();
      const customers = this.getCustomers();

      // Total Sales
      const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.netAmount || 0), 0);
      
      // Total Paid / Collected
      const totalPaid = payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);

      // Total Opening Balances
      const totalOpening = customers.reduce((sum, c) => sum + Number(c.openingBalance || 0), 0);

      // Total Outstanding (لينا كام برة)
      const totalOutstanding = (totalSales + totalOpening) - totalPaid;

      // Returns
      const totalReturns = invoices.reduce((sum, inv) => sum + Number(inv.returnsAmount || 0), 0);

      return {
        totalSales,
        totalPaid,
        totalOutstanding,
        totalReturns,
        invoicesCount: invoices.length,
        customersCount: customers.length,
        recentInvoices: invoices.slice(0, 5),
        recentPayments: payments.slice(0, 5)
      };
    },

    // Backup & Restore
    exportDatabase() {
      const data = {
        settings: this.getSettings(),
        customers: this.getCustomers(),
        products: this.getProducts(),
        invoices: this.getInvoices(),
        payments: this.getPayments(),
        returns: this.getReturns(),
        exportedAt: new Date().toISOString()
      };
      return JSON.stringify(data, null, 2);
    },
    importDatabase(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (data.settings) this.saveSettings(data.settings);
        if (data.customers) this.saveCustomers(data.customers);
        if (data.products) this.saveProducts(data.products);
        if (data.invoices) this.saveInvoices(data.invoices);
        if (data.payments) this.savePayments(data.payments);
        if (data.returns) this.saveReturns(data.returns);
        return true;
      } catch (e) {
        console.error('Import error:', e);
        return false;
      }
    }
  };

  DB.init();
  global.MIFAD_DB = DB;

})(typeof window !== 'undefined' ? window : this);
