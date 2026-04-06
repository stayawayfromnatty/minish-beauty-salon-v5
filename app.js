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
let isAdminAuthenticated = false;

function saveData() {
  localStorage.setItem('minish_logs_v4', JSON.stringify(auditLogs));
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const targetId = e.currentTarget.getAttribute('data-target');
    if (targetId === 'manager-view' && !isAdminAuthenticated) {
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

document.getElementById('btn-admin-login').addEventListener('click', () => {
  const code = document.getElementById('manager-password').value;
  if(code === ADMIN_PIN) {
    isAdminAuthenticated = true;
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('manager-password').value = '';
    const btnManager = document.getElementById('nav-manager');
    switchView('manager-view', btnManager);
  } else {
    alert("የተሳሳተ ኮድ ነው! እባክዎ እንደገና ይሞክሩ (Incorrect PIN).");
    document.getElementById('manager-password').value = '';
  }
});
document.getElementById('btn-admin-cancel').addEventListener('click', () => {
  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('manager-password').value = '';
});

function populateSelects() {
  const employeeSelect = document.getElementById('active-employee-select');
  let options = '';
  employees.forEach(emp => { options += `<option value="${emp.id}">${emp.name} - ${emp.role}</option>`; });
  employeeSelect.innerHTML += options;
}

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
  const productName = document.getElementById('product-name').value.trim();
  const productPrice = parseFloat(document.getElementById('product-price').value) || 0;
  const totalRevenue = servicePrice + productPrice;

  if (totalRevenue <= 0) {
    alert("እባክዎ ክፍያውን ያስገቡ! ዋጋው ከዜሮ መብለጥ አለበት።");
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
    productPrice: productPrice,
    revenue: totalRevenue,
    paymentMethod: paymentMethod,
    isTaxed: isTaxed,
    timestamp: new Date().getTime()
  };
  
  auditLogs.push(newLog);

  document.getElementById('customer-name').value = '';
  document.getElementById('service-price').value = '';
  document.getElementById('product-name').value = '';
  document.getElementById('product-price').value = '';
  document.getElementById('active-employee-select').value = '';
  document.getElementById('tax-receipt-toggle').checked = false;

  saveData();
  renderCashierLogs();
  updateLeaderboard();
  
  alert(`የ ${totalRevenue} ብር ክፍያ በ${paymentMethod === 'Cash' ? 'ጥሬ ገንዘብ' : 'ባንክ'} በተሳካ ሁኔታ ተመዝግቧል!`);
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
  
  recentLogs.forEach(q => {
    const dateStr = new Date(q.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const actionsStr = [q.service, q.productName].filter(Boolean).join(" ተገዝቷል፣ ");
    const paymentBadgeColor = q.paymentMethod === 'Bank' ? '#3B82F6' : '#10B981';
    const taxBadge = q.isTaxed 
      ? '<span class="status-badge" style="background:#059669; color:white;">✓ አለው</span>'
      : '<span class="status-badge" style="background:#DC2626; color:white;">✕ አላረፈም</span>';

    tbody.innerHTML += `
      <tr>
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

// --- MANAGER LOGIC ---
function updateLeaderboard() {
  let totalRevenueReal = 0;
  let taxedRevenue = 0;
  let internalRevenue = 0;
  let cashRevenue = 0;
  let bankRevenue = 0;

  const stats = {};
  employees.forEach(e => { stats[e.id] = { name: e.name, role: e.role, score: 0, revenue: 0 }; });
  
  auditLogs.forEach(log => { 
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
    const isRankClass = index < 3 ? `rank-${index + 1}` : '';
    lbUI.innerHTML += `<li class="${isRankClass}"><span class="rank-idx">#${index + 1}</span><div class="rank-name">${emp.name}<span class="rank-role">${emp.role} (የሰራው: ${emp.score})</span></div><div class="rank-score">★ ብር ${emp.revenue.toLocaleString()}</div></li>`;
  });

  const auditUI = document.getElementById('manager-audit-log-list');
  auditUI.innerHTML = '';
  if (auditLogs.length === 0) {
    auditUI.innerHTML = `<tr><td colspan="5" class="empty-state">እስካሁን ምንም የተመዘገበ ስራ የለም (No entries).</td></tr>`;
  } else {
    const recentLogs = [...auditLogs].sort((a,b) => b.timestamp - a.timestamp);
    recentLogs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const taxStatus = log.isTaxed ? "✓" : "✕";
      const taxColor = log.isTaxed ? "color: var(--success);" : "color: var(--danger);";
      const payStatus = log.paymentMethod === 'Bank' ? "ባንክ" : "ጥሬ ገንዘብ";
      const payColor = log.paymentMethod === 'Bank' ? "#3B82F6" : "#10B981";

      auditUI.innerHTML += `<tr><td style="color: var(--text-muted);">${dateStr}</td><td>${log.employeeName}</td><td><span style="color:${payColor}; border:1px solid ${payColor}; border-radius:12px; padding:2px 8px; font-size:0.8em">${payStatus}</span></td><td style="color: var(--success); font-weight:bold;">ብር ${log.revenue}</td><td style="${taxColor}">${taxStatus}</td></tr>`;
    });
  }
}

// CSV EXPORT LOGIC
document.getElementById('btn-export-csv').addEventListener('click', () => {
  if(auditLogs.length === 0) return alert("ኤክስፖርት የሚደረግ ምንም የተመዘገበ ሪከርድ የለም (No data to export).");
  
  // Create UTF-8 CSV with BOM for correct character rendering in Excel
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
  csvContent += "Date,Time,Customer Name,Employee,Service,Product,Service Fee,Product Fee,Total Paid,Payment Method,Is Official Receipt(Taxed)\n";
  
  auditLogs.forEach(row => {
    let d = new Date(row.timestamp);
    let dateStr = d.toLocaleDateString('en-GB'); 
    let timeStr = d.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
    let pMethod = row.paymentMethod || "Cash";
    let isTaxedStr = row.isTaxed ? "Taxed (Official)" : "Internal (Untaxed)";
    
    let safeCustomerName = row.customerName ? row.customerName.replace(/,/g, "") : "";
    let safeService = row.service ? row.service.replace(/,/g, "-") : "";
    let safeProduct = row.productName ? row.productName.replace(/,/g, "-") : "";
    
    csvContent += `"${dateStr}","${timeStr}","${safeCustomerName}","${row.employeeName}","${safeService}","${safeProduct}",${row.servicePrice},${row.productPrice},${row.revenue},"${pMethod}","${isTaxedStr}"\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Minish_Salon_Report_${new Date().toLocaleDateString('en-GB').replace(/\//g,'-')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

document.getElementById('btn-clear-data').addEventListener('click', () => {
  if (confirm("እርግጠኛ ነዎት የዕለቱን ስራ ማጥፋት ይፈልጋሉ? ገቢው ሁሉ ይደመሰሳል!")) {
    localStorage.removeItem('minish_logs_v4');
    window.location.reload();
  }
});

populateSelects();
renderCashierLogs();
updateLeaderboard();
