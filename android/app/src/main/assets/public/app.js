const employees = [
  { id: 1, name: "Sara (ሳራ)", role: "ማናጀር / ቀለም" },
  { id: 17, name: "Minish (ሚኒሽ)", role: "የሳሎኑ ባለቤት / ዋና ባለሙያ" },
  { id: 2, name: "Kitrubel(ክሩቤል)", role: "ፀጉር አስተካካይ / ቅንድብ (Eyebrow)" },
  { id: 3, name: "Yonas (ዮናስ)", role: "ፀጉር አስተካካይ / ቅንድብ (Eyebrow)" },
  { id: 4, name: "Beti Black (ቤቲ ጥቁር)", role: "ቁጥርጥር / ሹሩባ" },
  { id: 5, name: "Beti White (ቤቲ ነጭ)", role: "ቁጥርጥር / ሹሩባ" },
  { id: 6, name: "Barch (ባርች)", role: "ቁጥርጥር / ሹሩባ" },
  { id: 7, name: "Meri (ሜሪ)", role: "ሹሩባ / ሞሮኮ ባዝ" },
  { id: 8, name: "Helen (ሄለን)", role: "ቁጥርጥር / ሹሩባ" },
  { id: 9, name: "Mekdes (መቅደስ)", role: "ጥፍር አሰራር" },
  { id: 10, name: "Selam (ሰላም)", role: "ጥፍር / ፀጉር አጣቢ" },
  { id: 11, name: "Christi (ክርስቲ)", role: "ጥፍር አሰራር" },
  { id: 12, name: "Seble (ሰብለ)", role: "ጥፍር አሰራር" },
  { id: 13, name: "Meseret (መሰረት)", role: "ጥፍር / ሽፋሽፍት" },
  { id: 14, name: "Hiwot (ህይወት)", role: "ሞሮኮ ባዝ" },
  { id: 15, name: "Mamaru (ማማሩ)", role: "ሞሮኮ ባዝ" },
  { id: 16, name: "New Employee (ኒው ኢምፕሎይ)", role: "ሹሩባ / ፀጉር ማጠቢያ" },
  { id: 18, name: "Bemnet (ቤምነት)", role: "ቁጥርጥር / ሹሩባ" }
];

// --- Direct Supabase Connection (No PC server needed) ---
const SUPABASE_URL = 'https://yvoqsgbiaihksdafryiw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2b3FzZ2JpYWloa3NkYWZyeWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDY2OTksImV4cCI6MjA5MTUyMjY5OX0.rfNbcEwy1jrBVE2WNrhxeaZUIHbbKN5BVQpRZAEV6e0';
const SB_HEADERS = { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { ...SB_HEADERS, ...(options.headers || {}) } });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

let auditLogs = [];
let expensesList = [];
let isAdminAuthenticated = false;
let currentSession = [];

async function loadData() {
  try {
    const [txRows, expRows] = await Promise.all([
      sbFetch('transactions?order=timestamp.desc&select=*'),
      sbFetch('expenses?order=timestamp.desc&select=*')
    ]);

    auditLogs = (txRows || []).map(t => ({
      id: t.id, timestamp: new Date(t.timestamp).getTime(),
      employeeId: t.employee_id, employeeName: t.employee_name,
      service: t.service_desc, revenue: parseFloat(t.revenue) || 0,
      paymentMethod: t.payment_method, customerName: t.customer_name,
      points: t.points
    }));

    expensesList = (expRows || []).map(e => ({
      id: e.id, amount: parseFloat(e.amount) || 0, description: e.description,
      expense_type: e.expense_type, timestamp: new Date(e.timestamp).getTime()
    }));

    const dbStatus = document.getElementById('db-status');
    if (dbStatus) dbStatus.innerHTML = '<span style="color: #10b981;">መረጃው ተገናኝቷል (Cloud Active)</span>';

    populateSelects();
    renderCashierLogs();
    if (isAdminAuthenticated) updateLeaderboard();
  } catch (err) {
    console.error("Failed to load data:", err);
    if (document.getElementById('db-status'))
      document.getElementById('db-status').innerHTML = '<span style="color: #ef4444;">ግንኙነት የለም</span>';
  }
}

window.addEventListener('DOMContentLoaded', loadData);

// Mobile Sidebar Toggle
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}
document.getElementById('floating-menu-btn').addEventListener('click', openSidebar);
document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

// Navigation Logic
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    closeSidebar();
    const targetId = e.currentTarget.getAttribute('data-target');
    if (targetId === 'manager-view' && !isAdminAuthenticated) {
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
  if (targetId === 'manager-view') updateLeaderboard();
}

// Admin Auth (Supabase Secure)
document.getElementById('btn-admin-login').addEventListener('click', async (e) => {
  const loginBtn = document.getElementById('btn-admin-login');
  const user = document.getElementById('login-user').value;
  const password = document.getElementById('manager-password').value;
  if (!password) return;

  loginBtn.innerText = "በመግባት ላይ...";
  loginBtn.disabled = true;

  try {
    const hash = await sha256(String(password));
    const rows = await sbFetch(`users?username=eq.${encodeURIComponent(user)}&select=password_hash`);
    const success = rows && rows.length > 0 && rows[0].password_hash === hash;
    if (success) {
      isAdminAuthenticated = true;
      document.getElementById('login-modal').classList.add('hidden');
      document.getElementById('manager-password').value = '';
      switchView('manager-view', document.getElementById('nav-manager'));
    } else {
      alert("ስህተት የይለፍ ቃል!");
    }
  } catch (err) { console.error(err); alert("ግንኙነት አልተሳካም!"); }
  finally { loginBtn.innerText = "Login"; loginBtn.disabled = false; }
});

document.getElementById('btn-admin-cancel').addEventListener('click', () => {
  document.getElementById('login-modal').classList.add('hidden');
});

// POS Logic
function populateSelects() {
  const employeeSelect = document.getElementById('active-employee-select');
  const washerSelect = document.getElementById('washer-employee-select');
  if (employeeSelect) employeeSelect.innerHTML = '<option value="">-- ሰራተኛውን ይምረጡ --</option>';
  if (washerSelect) washerSelect.innerHTML = '<option value="">-- ካለ ይምረጡ --</option>';
  
  employees.forEach(emp => { 
    const opt = `<option value="${emp.id}">${emp.name}</option>`;
    if (employeeSelect) employeeSelect.innerHTML += opt; 
    if (washerSelect) washerSelect.innerHTML += opt;
  });
}

const SERVICE_OPTIONS = {
  HAIR: [
    { text: "Haircut (መቁረጥ)", value: "Haircut", price: 500 },
    { text: "Simple Styling (ማበጠር)", value: "Styling", price: 300 },
    { text: "Wave (ዌቭ)", value: "Wave", price: 500 },
    { text: "Pubis (ፑቢስ)", value: "Pubis", price: 500 },
    { text: "Sab Sab (ሳብ ሳብ)", value: "SabSab", price: 500 },
    { text: "Peystra (ፔይስትራ)", value: "Peystra", price: 500 },
    { text: "ካስክ (Kask)", value: "Kask", price: 400 }
  ],
  NAILS: [
    { text: "Gel / Acrylic (ጄል)", value: "Gel", price: 1500 },
    { text: "Litef (ሊጠፍ)", value: "Litef", price: 1000 },
    { text: "Shilak (ሽላክ መቀባት)", value: "Shilak", price: 500 },
    { text: "Normal Shilak (ኖርማል ሽላክ)", value: "NormalShilak", price: 500 },
    { text: "Refill Shilak (ሽላክ ሪፊል)", value: "RefillShilak", price: 1200 },
    { text: "Removing Shilak (ሽላክ ማንሳት)", value: "RemovingShilak", price: 200 },
    { text: "Removing Gel (ጄል ማንሳት)", value: "RemovingGel", price: 300 },
    { text: "Normal Polish (ኖርማል)", value: "NormalPolish", price: 200 },
    { text: "Pedicure (የእግር ጥፍር)", value: "Pedicure", price: 1000 },
    { text: "Special Pedicure", value: "SpecialPedicure", price: 1500 },
    { text: "Manicure (የእጅ ጥፍር)", value: "Manicure", price: 500 }
  ],
  FACE: [
    { text: "EYE BROW OMBRE (ሚኒሽ ስፔሻል)", value: "Ombre", price: 7000 },
    { text: "Eyebrow Razor (በምላጭ)", value: "Razor", price: 100 },
    { text: "Eyebrow Thread (በክር)", value: "Thread", price: 200 },
    { text: "Eyebrow Heena (በሂና)", value: "Heena", price: 500 },
    { text: "Eyebrow Wax (በዋክስ)", value: "Wax", price: 300 },
    { text: "Facial Massage (የፊት ማሳጅ)", value: "Facial", price: 300 },
    { text: "Make up with eyelash", value: "MakeupLash", price: 3000 },
    { text: "Make up (ሜካፕ)", value: "Makeup", price: 2500 },
    { text: "Eyelash Extension (ሽፋሽፍት)", value: "Eyelash", price: 2000 }
  ],
  SPA: [
    { text: "Minish Special Moroccan Bath", value: "MinishMorocco", price: 3800 },
    { text: "Special Moroccan Bath", value: "SpecialMorocco", price: 3000 },
    { text: "Normal Moroccan Bath", value: "NormalMorocco", price: 2500 },
    { text: "Full Body Massage", value: "FullMassage", price: 1500 },
    { text: "Normal Steam", value: "Steam", price: 1000 }
  ],
  BRAID: [
    { text: "Cornrow with 1 wig", value: "CornrowWig", price: 800 },
    { text: "Box Braid with 1 wig", value: "BoxBraidWig", price: 800 },
    { text: "Cornrows (ቁጥርጥር)", value: "Cornrows", price: 500 },
    { text: "Box Braids (ሹሩባ)", value: "BoxBraids", price: 500 }
  ],
  COLOR_WASH: [
    { text: "Hair Color - Full (ሙሉ)", value: "ColorFull", price: 8000 },
    { text: "Hair Color - Roots (ቁርጭምጭሚት)", value: "ColorRoots", price: 1000 },
    { text: "Black Shampoo", value: "BlackShampoo", price: 400 },
    { text: "Washing (ፀጉር ማጠብ)", value: "Washing", price: 200 },
    { text: "Special Treatment (ቅባት)", value: "Treatment", price: 900 }
  ],
  SPECIAL: [
    { text: "Bridal Package", value: "Bridal", price: 10000 },
    { text: "Bridal work (Mother)", value: "BridalMom", price: 1000 },
    { text: "Full Body wax", value: "FullBodyWax", price: 4000 },
    { text: "Brazillian Wax", value: "BrazillianWax", price: 1500 },
    { text: "Full Hand wax", value: "HandWax", price: 1000 },
    { text: "Miniskrit wax", value: "MiniWax", price: 1500 },
    { text: "Armpit wax", value: "ArmpitWax", price: 400 },
    { text: "Upper lip wax", value: "LipWax", price: 300 }
  ]
};

document.getElementById('active-employee-select').addEventListener('change', (e) => {
  const empId = parseInt(e.target.value);
  const emp = employees.find(emp => emp.id === empId);
  const serviceSelect = document.getElementById('service-type');
  serviceSelect.innerHTML = '<option value="">-- አገልግሎት ይምረጡ --</option>';
  if (!emp) return;

  let opts = [];
  if (emp.id === 17 || emp.name.includes("Minish")) {
    opts = [...Object.values(SERVICE_OPTIONS).flat()];
  } else {
    const role = emp.role.toLowerCase();
    if (role.includes("ጥፍር")) opts.push(...SERVICE_OPTIONS.NAILS);
    if (role.includes("ሹሩባ") || role.includes("ቁጥርጥር")) opts.push(...SERVICE_OPTIONS.BRAID);
    if (role.includes("ሞሮኮ") || role.includes("ማሳጅ")) opts.push(...SERVICE_OPTIONS.SPA);
    if (role.includes("ቀለም")) opts.push(...SERVICE_OPTIONS.COLOR_WASH);
    if (role.includes("ፀጉር") || role.includes("መቁረጥ") || role.includes("አስተካካይ")) opts.push(...SERVICE_OPTIONS.HAIR);
    if (role.includes("ቅንድብ") || role.includes("ፊት") || role.includes("ሽፋሽፍት") || role.includes("makeup")) opts.push(...SERVICE_OPTIONS.FACE);
    if (role.includes("wax") || role.includes("body") || role.includes("bridal")) opts.push(...SERVICE_OPTIONS.SPECIAL);
    
    // Fallback for general washers or others
    if (role.includes("አጣቢ") || role.includes("ማጠቢያ") || role.includes("wash")) {
      if (!opts.some(o => o.value === "Washing")) {
        opts.push(...SERVICE_OPTIONS.COLOR_WASH);
      }
    }
    
    // Default fallback if no specific traits matched
    if (opts.length === 0) {
      opts = [...SERVICE_OPTIONS.HAIR, ...SERVICE_OPTIONS.COLOR_WASH, ...SERVICE_OPTIONS.FACE];
    }
  }

  // Remove duplicates
  const seen = new Set();
  const uniqueOpts = opts.filter(o => {
    if (seen.has(o.value)) return false;
    seen.add(o.value);
    return true;
  });

  uniqueOpts.forEach(opt => {
    serviceSelect.innerHTML += `<option value="${opt.value}" data-price="${opt.price || ''}">${opt.text}</option>`;
  });
  serviceSelect.innerHTML += `<option value="Custom" data-price="">-- ሌላ ተጨማሪ ስራ (Custom) --</option>`;
});

document.getElementById('service-type').addEventListener('change', (e) => {
  const price = e.target.options[e.target.selectedIndex].getAttribute('data-price');
  if (price) {
    document.getElementById('service-price').value = price;
  } else {
    document.getElementById('service-price').value = '';
  }
  
  const customGroup = document.getElementById('custom-service-group');
  if (customGroup) {
      if (e.target.value === 'Custom') {
          customGroup.style.display = 'block';
      } else {
          customGroup.style.display = 'none';
      }
  }
});

// Session Management
function renderSessionList() {
  const container = document.getElementById('session-list-container');
  const list = document.getElementById('session-items');
  const totalDisplay = document.getElementById('session-total');
  if (currentSession.length === 0) { container.classList.add('hidden'); return; }
  container.classList.remove('hidden');
  list.innerHTML = '';
  let total = 0;
  currentSession.forEach((item, index) => {
    total += item.revenue;
    const div = document.createElement('div');
    div.className = 'session-item fade-in';
    div.innerHTML = `
      <div class="session-info"><strong>${item.service}</strong><br/><small>${item.employeeName} | ${item.revenue} ብር</small></div>
      <div class="session-remove" onclick="removeFromSession(${index})">X</div>
    `;
    list.appendChild(div);
  });
  totalDisplay.innerText = total.toLocaleString() + " ብር";
}
window.removeFromSession = (idx) => { currentSession.splice(idx, 1); renderSessionList(); };

document.getElementById('btn-add-to-session').addEventListener('click', () => {
    const empIdVal = document.getElementById('active-employee-select').value;
    const price = parseFloat(document.getElementById('service-price').value) || 0;
    if (!empIdVal) return alert("ሰራተኛ ይምረጡ");
    const emp = employees.find(e => e.id === parseInt(empIdVal));
    
    let service = document.getElementById('service-type').options[document.getElementById('service-type').selectedIndex].text;
    if (document.getElementById('service-type').value === 'Custom') {
        service = document.getElementById('custom-service-name').value;
        if (!service) return alert("እባክዎ መጀመሪያ የልዩ ስራውን ስም ይፃፉ (Please enter the custom service name)");
    }

    // Extras
    let final = price; let extras = [];
    if (document.getElementById('use-shampoo').checked) { final += 50; extras.push("ሻምፖ"); }
    if (document.getElementById('use-conditioner').checked) { final += 50; extras.push("ኮንዲሽነር"); }
    const pg = parseInt(document.getElementById('placenta-glass-qty').value) || 0;
    if (document.getElementById('use-placenta-glass').checked && pg > 0) { final += 100 * pg; extras.push(`ፕላሴንታ(ብ) x${pg}`); }
    const wig = parseInt(document.getElementById('salon-wig-qty').value) || 0;
    if (wig > 0) { final += 300 * wig; extras.push(`ዊግ x${wig}`); }

    currentSession.push({
        employeeId: emp.id, employeeName: emp.name, revenue: final, points: 100,
        service: service + (extras.length ? ` (+${extras.join(", ")})` : "")
    });

    const washerId = document.getElementById('washer-employee-select').value;
    if (washerId) {
        const washer = employees.find(e => e.id === parseInt(washerId));
        currentSession.push({ employeeId: washer.id, employeeName: washer.name, revenue: 0, points: 50, service: "ጥበቃ (Credit)" });
    }

    renderSessionList();
    document.getElementById('service-price').value = '';
    [...document.querySelectorAll('input[type="checkbox"]')].forEach(el => el.checked = false);
});

document.getElementById('btn-add-custom').addEventListener('click', () => {
  const name = document.getElementById('custom-item-name').value;
  const price = parseFloat(document.getElementById('custom-item-price').value) || 0;
  if (!name || price <= 0) return;
  currentSession.push({ employeeId: 0, employeeName: "ሽያጭ", service: name, revenue: price, points: 0 });
  document.getElementById('custom-item-name').value = '';
  document.getElementById('custom-item-price').value = '';
  renderSessionList();
});

document.getElementById('btn-finish-session').addEventListener('click', async () => {
    if (currentSession.length === 0) return;
    const customer = document.getElementById('customer-name').value || "ደባሪያ";
    const payment = document.getElementById('payment-method').value;
    const tip = parseFloat(document.getElementById('tip-amount').value) || 0;
    const ts = Date.now();

    const logs = currentSession.map(item => ({ ...item, customerName: customer, paymentMethod: payment, timestamp: ts }));
    if (tip > 0) logs.push({ employeeId: 0, employeeName: "ሳሎን", service: "Tip (ጉርሻ)", revenue: tip, customerName: customer, paymentMethod: payment, timestamp: ts });

    try {
        const rows = logs.map(item => ({
            employee_id: item.employeeId, employee_name: item.employeeName,
            service_desc: item.service, revenue: item.revenue,
            payment_method: item.paymentMethod, customer_name: item.customerName,
            points: item.points || 0,
            timestamp: new Date(item.timestamp).toISOString()
        }));
        await sbFetch('transactions', { method: 'POST', body: JSON.stringify(rows), headers: { 'Prefer': 'return=minimal' } });
        currentSession = []; document.getElementById('customer-name').value = ''; document.getElementById('tip-amount').value = '0';
        renderSessionList(); loadData(); alert("ተመዝግቧል!");
    } catch (e) { console.error(e); alert("መመዝገብ አልተቻለም"); }
});

// Manager & Financial Restoration
function updateLeaderboard() {
    const filter = document.getElementById('manager-date-filter').value;
    const now = new Date();
    const filteredLogs = auditLogs.filter(log => {
        const d = new Date(log.timestamp);
        if (filter === 'today') return d.toDateString() === now.toDateString();
        
        if (filter === 'yesterday') {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            return d.toDateString() === yesterday.toDateString();
        }

        if (filter === 'specific') {
            const specDate = document.getElementById('manager-specific-date').value;
            return d.toISOString().split('T')[0] === specDate;
        }

        if (filter === 'week') return (now - d) < (7 * 24 * 3600 * 1000);
        if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
    });

    const filteredExpenses = expensesList.filter(e => {
        const d = new Date(e.timestamp);
        if (filter === 'today') return d.toDateString() === now.toDateString();
        
        if (filter === 'yesterday') {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            return d.toDateString() === yesterday.toDateString();
        }

        if (filter === 'specific') {
            const specDate = document.getElementById('manager-specific-date').value;
            return d.toISOString().split('T')[0] === specDate;
        }

        if (filter === 'week') return (now - d) < (7 * 24 * 3600 * 1000);
        if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
    });

    let totalRev = 0; let cashRev = 0; let bankRev = 0;
    filteredLogs.forEach(l => {
        totalRev += l.revenue;
        if (l.paymentMethod === 'Bank') bankRev += l.revenue; else cashRev += l.revenue;
    });

    const totalExp = filteredExpenses.reduce((a, c) => a + (parseFloat(c.amount) || 0), 0);
    const netProfit = (totalRev / 1.15) - totalExp;

    document.getElementById('stat-total-revenue').innerText = "ብር " + totalRev.toLocaleString();
    document.getElementById('stat-net-profit').innerText = "ብር " + Math.round(netProfit).toLocaleString();
    document.getElementById('stat-cash-revenue').innerText = "ብር " + (cashRev - totalExp).toLocaleString();
    document.getElementById('stat-bank-revenue').innerText = "ብር " + bankRev.toLocaleString();

    // Dual Leaderboards
    const earners = {}; const workers = {};
    employees.forEach(e => { earners[e.id] = { name: e.name, val: 0 }; workers[e.id] = { name: e.name, val: 0 }; });

    filteredLogs.forEach(l => {
        if (earners[l.employeeId]) earners[l.employeeId].val += l.revenue;
        if (workers[l.employeeId]) workers[l.employeeId].val += (l.points || 0);
    });

    const earnersUI = document.getElementById('leaderboard-list-earners');
    const workersUI = document.getElementById('leaderboard-list-workers');
    earnersUI.innerHTML = ''; workersUI.innerHTML = '';

    Object.values(earners).sort((a,b)=>b.val - a.val).slice(0, 5).forEach((s, i) => {
        earnersUI.innerHTML += `<li><span class="rank-idx">#${i+1}</span> ${s.name} - ${s.val} ብር</li>`;
    });
    Object.values(workers).sort((a,b)=>b.val - a.val).slice(0, 5).forEach((s, i) => {
        workersUI.innerHTML += `<li><span class="rank-idx">#${i+1}</span> ${s.name} - ${s.val} Pts</li>`;
    });

    // History Table
    const historyUI = document.getElementById('manager-audit-log-list');
    historyUI.innerHTML = '';
    filteredLogs.sort((a,b)=>b.timestamp - a.timestamp).slice(0, 50).forEach(l => {
        const vat = Math.round(l.revenue - (l.revenue / 1.15));
        historyUI.innerHTML += `<tr>
            <td>${new Date(l.timestamp).toLocaleDateString()}</td>
            <td>${l.employeeName}</td>
            <td>${l.paymentMethod==='Bank'?'ባንክ':'ጥሬ'}</td>
            <td>${l.revenue}</td>
            <td>${vat}</td>
            <td><button onclick="deleteLogEntry(${l.timestamp})" class="btn-danger" style="padding:2px 8px;">X</button></td>
        </tr>`;
    });

    // Simple Expense List
    const expUI = document.getElementById('expense-list-mini');
    expUI.innerHTML = '';
    filteredExpenses.slice(0, 5).forEach(e => {
        expUI.innerHTML += `<tr><td>${e.description}</td><td>${e.expense_type}</td><td>${e.amount}</td></tr>`;
    });
}

// Expense (Wechi) Actions
document.getElementById('btn-add-expense').addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const desc = document.getElementById('expense-description').value;
    const type = document.getElementById('expense-type').value;
    if (!amount || !desc) return alert("መረጃ ይሙሉ");

    try {
        await sbFetch('expenses', {
            method: 'POST',
            body: JSON.stringify({ amount, description: desc, expense_type: type }),
            headers: { 'Prefer': 'return=minimal' }
        });
        document.getElementById('expense-amount').value = '';
        document.getElementById('expense-description').value = '';
        loadData(); alert("ወጪ ተመዝግቧል");
    } catch(e) { console.error(e); alert("መመዝገብ አልተቻለም"); }
});

async function deleteLogEntry(ts) {
    if (confirm("ይሰረዝ?")) {
        const isoTs = new Date(ts).toISOString();
        await sbFetch(`transactions?timestamp=eq.${encodeURIComponent(isoTs)}`, { method: 'DELETE', headers: { 'Prefer': 'return=minimal' } });
        loadData();
    }
}
window.deleteLogEntry = deleteLogEntry;

function renderCashierLogs() {
    const tbody = document.getElementById('today-logs-list');
    tbody.innerHTML = '';
    auditLogs.sort((a,b)=>b.timestamp-a.timestamp).slice(0, 15).forEach(log => {
        const time = new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        tbody.innerHTML += `<tr><td>${time}</td><td>${log.paymentMethod==='Bank'?'ባንክ':'ጥሬ'}</td><td>${log.employeeName}</td><td>${log.revenue}</td></tr>`;
    });
}

// Export & Print
document.getElementById('btn-export-csv').addEventListener('click', () => {
    let csv = "Date,Employee,Method,Revenue,VAT\n";
    auditLogs.forEach(l => csv += `${new Date(l.timestamp).toLocaleDateString()},${l.employeeName},${l.paymentMethod},${l.revenue},${Math.round(l.revenue*0.13)}\n`);
    const link = document.createElement("a"); link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8,\uFEFF" + csv)); link.setAttribute("download", "Minish_Report.csv"); link.click();
});

document.getElementById('btn-print-last').addEventListener('click', () => {
    if (auditLogs.length === 0) return;
    const l = auditLogs[auditLogs.length - 1];
    document.getElementById('print-date').innerText = new Date(l.timestamp).toLocaleString();
    document.getElementById('print-content').innerHTML = `
        <div style="border-bottom: 1px dashed #000; padding: 10px 0;">
            <b>Employee:</b> ${l.employeeName}<br/>
            <b>Client:</b> ${l.customerName}<br/>
            <b>Service:</b> ${l.service}
        </div>
        <div style="font-size: 1.2rem; text-align: right; margin-top: 10px;">
            <b>TOTAL: ${l.revenue} ብር</b>
        </div>
    `;
    const area = document.getElementById('print-receipt-area');
    area.style.display = 'block'; window.print(); area.style.display = 'none';
});

// Filter & Specific Date Listeners
document.getElementById('manager-date-filter').addEventListener('change', (e) => {
    const specInput = document.getElementById('manager-specific-date');
    if (e.target.value === 'specific') {
        specInput.classList.remove('hidden');
    } else {
        specInput.classList.add('hidden');
        updateLeaderboard();
    }
});

document.getElementById('manager-specific-date').addEventListener('change', () => {
    updateLeaderboard();
});
