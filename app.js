const employees = [
  { id: 1, name: "Sara (ሳራ)", role: "ማናጀር / ቀለም" },
  { id: 2, name: "Kitrubel(ክሩቤል)", role: "ፀጉር አስተካካይ" },
  { id: 3, name: "Yonas (ዮናስ)", role: "ፀጉር አስተካካይ" },
  { id: 4, name: "Beti Black (ቤቲ ጥቁሯ)", role: "ቁጥርጥር / ሹሩባ" },
  { id: 5, name: "Beti White (ቤቲ ነጯ)", role: "ቁጥርጥር / ሹሩባ" },
  { id: 6, name: "Barch (ባርች)", role: "ቁጥርጥር / ሹሩባ" },
  { id: 7, name: "Meri (ሜሪ)", role: "ሹሩባ / ሞሮኮ ባዝ" },
  { id: 8, name: "Helen (ሄለን)", role: "ቁጥርጥር / ሹሩባ" },
  { id: 9, name: "Mekdes (መቅደስ)", role: "ጥፍር አሰራር" },
  { id: 10, name: "Selam (ሰላም)", role: "ጥፍር / ፀጉር አጣቢ" },
  { id: 11, name: "Christi (ክርስቲ)", role: "ጥፍር አሰራር" },
  { id: 12, name: "Seble (ሰብለ)", role: "ጥፍር አሰራር" },
  { id: 13, name: "Meseret (መሰረት)", role: "ጥፍር / ሽፋሽፍት" },
  { id: 14, name: "Hiwot (ህይወት)", role: "ሞሮኮ ባዝ" },
  { id: 15, name: "Mamaru (ማማሩ)", role: "ሞሮኮ ባዝ" }
];

const ADMIN_PIN = "1234";

let auditLogs = JSON.parse(localStorage.getItem('minish_logs_v4')) || [];
let inventory = JSON.parse(localStorage.getItem('minish_inventory_v1')) || [];
let isAdminAuthenticated = false;

function saveData() {
  localStorage.setItem('minish_logs_v4', JSON.stringify(auditLogs));
  localStorage.setItem('minish_inventory_v1', JSON.stringify(inventory));
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const targetId = e.currentTarget.getAttribute('data-target');
    if (typeof closeMobileMenu === 'function') closeMobileMenu();
    if ((targetId === 'manager-view' || targetId === 'inventory-view') && !isAdminAuthenticated) {
      // Pass along the target to switch after auth
      document.getElementById('btn-admin-login').dataset.pendingTarget = targetId;
      document.getElementById('btn-admin-login').dataset.pendingBtnId = e.currentTarget.id;
      document.getElementById('login-modal').classList.remove('hidden');
      return; 
    }
    switchView(targetId, e.currentTarget);
  });
});

function switchView(targetId, btnElement) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btnElement.classList.add('active');
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  document.getElementById(targetId).classList.add('active');
  if(targetId === 'manager-view') updateLeaderboard();
}

document.getElementById('btn-admin-login').addEventListener('click', (e) => {
  const code = document.getElementById('manager-password').value;
  if(code === ADMIN_PIN) {
    isAdminAuthenticated = true;
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('manager-password').value = '';
    
    const pendingTarget = e.currentTarget.dataset.pendingTarget || 'manager-view';
    const pendingBtnId = e.currentTarget.dataset.pendingBtnId || 'nav-manager';
    const btnManager = document.getElementById(pendingBtnId);
    switchView(pendingTarget, btnManager);
  } else {
    alert("የተሳሳተ ኮድ ነው! እባክዎ እንደገና ይሞክሩ (Incorrect PIN).");
    document.getElementById('manager-password').value = '';
  }
});
document.getElementById('btn-admin-cancel').addEventListener('click', () => {
  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('manager-password').value = '';
});

const mobileMenuBtn = document.getElementById('floating-menu-btn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');

function closeMobileMenu() {
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

if (mobileMenuBtn && sidebar && overlay) {
  mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });

  overlay.addEventListener('click', closeMobileMenu);
}


function triggerConfetti() {
  if (typeof confetti !== 'undefined') {
    const duration = 2000; const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#D4AF37', '#10B981'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#D4AF37', '#10B981'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  }
}

function populateSelects() {
  const employeeSelect = document.getElementById('active-employee-select');
  employeeSelect.innerHTML = '<option value="">-- ሰራተኛውን ይምረጡ --</option>';
  employees.forEach(emp => { employeeSelect.innerHTML += `<option value="${emp.id}">${emp.name} - ${emp.role}</option>`; });

  const soldSelect = document.getElementById('product-sold-select');
  const usedSelect = document.getElementById('product-used-select');
  
  soldSelect.innerHTML = '<option value="">-- ምንም አልተሸጠም --</option>';
  usedSelect.innerHTML = '<option value="">-- ምንም ዕቃ አልወጣም --</option>';

  inventory.forEach(item => {
    const outOfStockStr = item.qty <= 0 ? " (አልቋል)" : ` (${item.qty} ቀሪ)`;
    const opt = `<option value="${item.id}" ${item.qty <= 0 ? 'disabled' : ''}>${item.name}${outOfStockStr} - ${item.sellPrice || 0} ብር</option>`;
    if(item.type === 'Retail') soldSelect.innerHTML += opt;
    else usedSelect.innerHTML += opt;
  });
}

document.getElementById('product-sold-select').addEventListener('change', (e) => {
  document.getElementById('product-qty-group').classList.toggle('hidden', e.target.value === "");
});
document.getElementById('product-used-select').addEventListener('change', (e) => {
  document.getElementById('product-used-qty-group').classList.toggle('hidden', e.target.value === "");
});

// --- CASHIER POS LOGIC ---
document.getElementById('btn-log-service').addEventListener('click', () => {
  const empIdVal = document.getElementById('active-employee-select').value;
  if(!empIdVal) {
    alert("እባክዎ የተገለገሉበትን ሰራተኛ ስም ይምረጡ! (Please select an employee)");
    return;
  }

  const empId = parseInt(empIdVal);
  const emp = employees.find(e => e.id === empId);

  const customerName = document.getElementById('customer-name').value || 'ስም የሌለው';
  const serviceTypeElem = document.getElementById('service-type');
  const serviceType = serviceTypeElem.options[serviceTypeElem.selectedIndex].text;
  
  const paymentMethod = document.getElementById('payment-method').value; // Cash or Bank
  const servicePrice = parseFloat(document.getElementById('service-price').value) || 0;
  
  const soldId = document.getElementById('product-sold-select').value;
  let productName = "";
  let productPrice = 0;
  let productSoldQty = 0;
  
  const usedId = document.getElementById('product-used-select').value;
  let usedName = "";
  let productUsedQty = 0;

  if(soldId) {
    const itemInfo = inventory.find(i => i.id === soldId);
    if(itemInfo) {
      productSoldQty = parseInt(document.getElementById('product-sold-qty').value) || 1;
      if(productSoldQty > itemInfo.qty) return alert("በስቶክ ውስጥ በቂ ዕቃ የለም! (Not enough retail stock)");
      productName = itemInfo.name;
      productPrice = itemInfo.sellPrice * productSoldQty;
      
      // Deduct stock
      itemInfo.qty -= productSoldQty;
    }
  }

  if(usedId) {
    const itemInfo = inventory.find(i => i.id === usedId);
    if(itemInfo) {
      productUsedQty = parseInt(document.getElementById('product-used-qty').value) || 1;
      if(productUsedQty > itemInfo.qty) return alert("በስቶክ ውስጥ በቂ መገልገያ ዕቃ የለም! (Not enough internal stock)");
      usedName = itemInfo.name;
      
      // Deduct stock
      itemInfo.qty -= productUsedQty;
    }
  }

  const totalRevenue = servicePrice + productPrice;

  if (totalRevenue <= 0 && !usedId) {
    alert("እባክዎ ክፍያውን ያስገቡ ወይንም መገልገያ ዕቃ መውጣቱን ያሳውቁ! (Enter amount or select used item)");
    return;
  }

  const isTaxed = document.getElementById('tax-receipt-toggle').checked;

  const newLog = {
    customerName: customerName,
    employeeId: emp.id,
    employeeName: emp.name,
    service: serviceType,
    servicePrice: servicePrice,
    productName: productName,
    productSoldQty: productSoldQty,
    productPrice: productPrice,
    usedName: usedName,
    productUsedQty: productUsedQty,
    revenue: totalRevenue,
    paymentMethod: paymentMethod,
    isTaxed: isTaxed,
    timestamp: new Date().getTime()
  };
  
  auditLogs.push(newLog);

  document.getElementById('customer-name').value = '';
  document.getElementById('service-price').value = '';
  document.getElementById('product-sold-select').value = '';
  document.getElementById('product-sold-qty').value = '1';
  document.getElementById('product-qty-group').classList.add('hidden');
  document.getElementById('product-used-select').value = '';
  document.getElementById('product-used-qty').value = '1';
  document.getElementById('product-used-qty-group').classList.add('hidden');
  document.getElementById('active-employee-select').value = '';
  document.getElementById('tax-receipt-toggle').checked = false;

  saveData();
  populateSelects(); // Rebuild select options with new qty
  renderInventory(); // Update inventory table
  renderCashierLogs();
  updateLeaderboard();
  triggerConfetti();
  
  setTimeout(() => {
    alert(`የ ${totalRevenue} ብር ክፍያ በ${paymentMethod === 'Cash' ? 'ጥሬ ገንዘብ' : 'ባንክ'} በተሳካ ሁኔታ ተመዝግቧል!`);
  }, 100);
});

document.getElementById('btn-print-last').addEventListener('click', () => {
  if(auditLogs.length === 0) return alert("እስካሁን ምንም ሪከርድ የለም (No record recorded to print)");
  const last = auditLogs[auditLogs.length - 1]; // get latest
  
  const pArea = document.getElementById('print-receipt-area');
  document.getElementById('print-date').innerText = new Date(last.timestamp).toLocaleString();
  let itemsHtml = `<b>Service:</b> ${last.service} (${last.servicePrice} ETB) <br/>`;
  if(last.productName) itemsHtml += `<b>Product:</b> ${last.productName} (${last.productPrice} ETB) <br/>`;
  itemsHtml += `<h4 style="margin:5px 0;">TOTAL: ${last.revenue} ETB</h4>`;
  itemsHtml += `<div><b>Paid:</b> ${last.paymentMethod}</div>`;
  itemsHtml += `<div><b>Stylist:</b> ${last.employeeName}</div>`;
  
  document.getElementById('print-content').innerHTML = itemsHtml;
  pArea.style.display = 'block'; // Make it available to DOM before print
  window.print();
  pArea.style.display = 'none'; // hide it back so screen stays clean
});

function renderCashierLogs() {
  const tbody = document.getElementById('today-logs-list');
  tbody.innerHTML = '';
  if(auditLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">በአሁኑ ሰዓት ማንም የተከፈለለት ደንበኛ የለም.</td></tr>`;
    return;
  }
  
  const recentLogs = [...auditLogs].sort((a,b) => b.timestamp - a.timestamp).slice(0, 50);
  
  recentLogs.forEach((q, idx) => {
    const delay = idx * 0.05;
    const dateStr = new Date(q.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const actionsStr = [q.service, q.productName].filter(Boolean).join(" ተገዝቷል፣ ");
    const paymentBadgeColor = q.paymentMethod === 'Bank' ? '#3B82F6' : '#10B981';
    const taxBadge = q.isTaxed 
      ? '<span class="status-badge" style="background:#059669; color:white;">✓ አለው</span>'
      : '<span class="status-badge" style="background:#DC2626; color:white;">✕ አላረፈም</span>';

    tbody.innerHTML += `
      <tr class="slide-in-right" style="animation-delay: ${delay}s">
        <td style="color: var(--text-muted);">${dateStr}</td>
        <td><span class="status-badge" style="background:${paymentBadgeColor}; color:white;">${q.paymentMethod === 'Bank' ? 'ባንክ' : 'ጥሬ'}</span></td>
        <td style="font-weight: bold; color: var(--accent-gold);">${q.employeeName}</td>
        <td style="font-size:0.9em">${actionsStr}</td>
        <td style="color: var(--success); font-weight:bold;">ብር ${q.revenue}</td>
        <td>${taxBadge}</td>
      </tr>
    `;
  });
}

// --- MANAGER LOGIC / HISTORY FILTERING ---
document.getElementById('manager-date-filter').addEventListener('change', updateLeaderboard);

function getFilteredLogs() {
  const filter = document.getElementById('manager-date-filter').value;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayOfWeek = now.getDay() || 7; 
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

  return auditLogs.filter(log => {
    if(filter === 'today') return log.timestamp >= startOfDay;
    if(filter === 'week') return log.timestamp >= startOfWeek;
    if(filter === 'month') return log.timestamp >= startOfMonth;
    if(filter === 'year') return log.timestamp >= startOfYear;
    return true; // "all"
  });
}

function updateLeaderboard() {
  const logsToProcess = getFilteredLogs();
  
  let totalRevenueReal = 0;
  let taxedRevenue = 0;
  let internalRevenue = 0;
  let cashRevenue = 0;
  let bankRevenue = 0;

  const stats = {};
  employees.forEach(e => { stats[e.id] = { name: e.name, role: e.role, score: 0, revenue: 0 }; });
  
  logsToProcess.forEach(log => { 
    totalRevenueReal += (log.revenue || 0);

    if (log.isTaxed) taxedRevenue += (log.revenue || 0);
    else internalRevenue += (log.revenue || 0);

    if (log.paymentMethod === 'Bank') bankRevenue += (log.revenue || 0);
    else cashRevenue += (log.revenue || 0);

    if(stats[log.employeeId]) {
      stats[log.employeeId].score += 1; 
      stats[log.employeeId].revenue += (log.revenue || 0);
    }
  });

  document.getElementById('stat-total-revenue').innerText = "ብር " + totalRevenueReal.toLocaleString(); 
  document.getElementById('stat-taxed-revenue').innerText = "ብር " + taxedRevenue.toLocaleString(); 
  document.getElementById('stat-internal-revenue').innerText = "ብር " + internalRevenue.toLocaleString(); 
  document.getElementById('stat-cash-revenue').innerText = "ብር " + cashRevenue.toLocaleString(); 
  document.getElementById('stat-bank-revenue').innerText = "ብር " + bankRevenue.toLocaleString(); 
  
  const sortedStats = Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  
  const lbUI = document.getElementById('leaderboard-list');
  lbUI.innerHTML = '';
  sortedStats.slice(0, 10).forEach((emp, index) => {
    const delay = index * 0.05;
    const isRankClass = index < 3 ? `rank-${index + 1}` : '';
    lbUI.innerHTML += `<li class="${isRankClass} slide-in-right" style="animation-delay: ${delay}s"><span class="rank-idx">#${index + 1}</span><div class="rank-name">${emp.name}<span class="rank-role">${emp.role} (የሰራው: ${emp.score})</span></div><div class="rank-score">★ ብር ${emp.revenue.toLocaleString()}</div></li>`;
  });

  const auditUI = document.getElementById('manager-audit-log-list');
  auditUI.innerHTML = '';
  if (logsToProcess.length === 0) {
    auditUI.innerHTML = `<tr><td colspan="5" class="empty-state">ምንም የተመዘገበ ስራ የለም (No entries for selected filter).</td></tr>`;
  } else {
    const recentLogs = [...logsToProcess].sort((a,b) => b.timestamp - a.timestamp);
    recentLogs.forEach((log, idx) => {
      const delay = idx * 0.05;
      const dateStr = new Date(log.timestamp).toLocaleDateString() + ' ' + new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const taxStatus = log.isTaxed ? "✓" : "✕";
      const taxColor = log.isTaxed ? "color: var(--success);" : "color: var(--danger);";
      const payStatus = log.paymentMethod === 'Bank' ? "ባንክ" : "ጥሬ ገንዘብ";
      const payColor = log.paymentMethod === 'Bank' ? "#3B82F6" : "#10B981";

      auditUI.innerHTML += `<tr class="slide-in-right" style="animation-delay: ${delay}s"><td style="color: var(--text-muted);">${dateStr}</td><td>${log.employeeName}</td><td><span style="color:${payColor}; border:1px solid ${payColor}; border-radius:12px; padding:2px 8px; font-size:0.8em">${payStatus}</span></td><td style="color: var(--success); font-weight:bold;">ብር ${log.revenue}</td><td style="${taxColor}">${taxStatus}</td></tr>`;
    });
  }
}

// CSV EXPORT LOGIC
document.getElementById('btn-export-csv').addEventListener('click', () => {
  const logsToProcess = getFilteredLogs();
  if(logsToProcess.length === 0) return alert("ኤክስፖርት የሚደረግ ምንም የተመዘገበ ሪከርድ የለም (No data to export).");
  
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
  csvContent += "Date,Time,Customer Name,Employee,Service,Retail Product,Retail Qty,Used Internal Product,Used Qty,Service Fee,Product Fee,Total Paid,Payment Method,Is Official Receipt(Taxed)\n";
  
  logsToProcess.forEach(row => {
    let d = new Date(row.timestamp);
    let dateStr = d.toLocaleDateString('en-GB'); 
    let timeStr = d.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
    let pMethod = row.paymentMethod || "Cash";
    let isTaxedStr = row.isTaxed ? "Taxed (Official)" : "Internal (Untaxed)";
    
    let safeCustomerName = row.customerName ? row.customerName.replace(/,/g, "") : "";
    let safeService = row.service ? row.service.replace(/,/g, "-") : "";
    let safeProduct = row.productName ? row.productName.replace(/,/g, "-") : "";
    let safeUsed = row.usedName ? row.usedName.replace(/,/g, "-") : "";
    
    csvContent += `"${dateStr}","${timeStr}","${safeCustomerName}","${row.employeeName}","${safeService}","${safeProduct}",${row.productSoldQty||0},"${safeUsed}",${row.productUsedQty||0},${row.servicePrice||0},${row.productPrice||0},${row.revenue},"${pMethod}","${isTaxedStr}"\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Minish_Salon_Report_${new Date().toLocaleDateString('en-GB').replace(/\//g,'-')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Remove destructive Clear Data button completely!
const btnClear = document.getElementById('btn-clear-data');
if(btnClear) btnClear.remove();

document.getElementById('inv-type').addEventListener('change', (e) => {
  const isRetail = e.target.value === 'Retail';
  document.getElementById('inv-sell-group').style.display = isRetail ? 'block' : 'none';
});

document.getElementById('btn-add-inventory').addEventListener('click', () => {
  const name = document.getElementById('inv-name').value.trim();
  const type = document.getElementById('inv-type').value;
  const qty = parseInt(document.getElementById('inv-qty').value) || 0;
  const buyPrice = parseFloat(document.getElementById('inv-buy').value) || 0;
  const sellPrice = type === 'Retail' ? (parseFloat(document.getElementById('inv-sell').value) || 0) : 0;

  if(!name || qty <= 0 || buyPrice <= 0) return alert("እባክዎ ሙሉ መረጃ ያስገቡ! (Please enter valid details)");

  inventory.push({ 
    id: "item_" + new Date().getTime(), 
    name, type, qty, buyPrice, sellPrice, 
    addedAt: new Date().getTime() 
  });

  document.getElementById('inv-name').value = '';
  document.getElementById('inv-qty').value = '';
  document.getElementById('inv-buy').value = '';
  document.getElementById('inv-sell').value = '';

  saveData();
  renderInventory();
  populateSelects();
  alert("እቃው በተሳካ ሁኔታ ተመዝግቧል! (Item added successfully!)");
});

function deleteInventory(id) {
  if(confirm("ይህ እቃ ይሰረዝ? (Delete this item?)")) {
    inventory = inventory.filter(i => i.id !== id);
    saveData();
    renderInventory();
    populateSelects();
  }
}

// Ensure this function is globally accessible
window.deleteInventory = deleteInventory;

function renderInventory() {
  const list = document.getElementById('inventory-list');
  if(!list) return;
  list.innerHTML = '';
  if(inventory.length === 0) {
    list.innerHTML = `<tr><td colspan="6" class="empty-state">ምንም የተመዘገበ ዕቃ የለም (No items in inventory).</td></tr>`;
    return;
  }
  
  inventory.forEach(item => {
    let warningStyle = item.qty < 5 ? 'color: var(--danger); font-weight: bold;' : 'color: var(--success);';
    let typeBadge = item.type === 'Retail' 
      ? '<span class="status-badge" style="background:var(--accent-gold); color:#000;">ለሽያጭ</span>'
      : '<span class="status-badge" style="background:#3B82F6; color:#fff;">መገልገያ</span>';
      
    list.innerHTML += `
      <tr>
        <td style="font-weight:bold;">${item.name}</td>
        <td>${typeBadge}</td>
        <td style="${warningStyle}">${item.qty} ፍሬ</td>
        <td>ብር ${item.buyPrice}</td>
        <td>${item.type === 'Retail' ? 'ብር ' + item.sellPrice : '-'}</td>
        <td><button onclick="window.deleteInventory('${item.id}')" class="btn-danger" style="padding: 5px 10px; width:auto; font-size:0.8rem;">ሰርዝ (X)</button></td>
      </tr>
    `;
  });
}

populateSelects();
renderCashierLogs();
updateLeaderboard();
renderInventory();
