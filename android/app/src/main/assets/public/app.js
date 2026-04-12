const employees = [
  { id: 1, name: "Sara (ሳራ)", role: "ማናጀር / ቀለም" },
  { id: 17, name: "Minish (ሚኒሽ)", role: "የሳሎኑ ባለቤት / ዋና ባለሙያ" },
  { id: 2, name: "Kitrubel(ክሩቤል)", role: "ፀጉር አስተካካይ / ቅንድብ (Eyebrow)" },
  { id: 3, name: "Yonas (ዮናስ)", role: "ፀጉር አስተካካይ / ቅንድብ (Eyebrow)" },
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
  { id: 15, name: "Mamaru (ማማሩ)", role: "ሞሮኮ ባዝ" },
  { id: 16, name: "New Employee (ኒው ኢምፕሎይ)", role: "ሹሩባ / ፀጉር ማጠቢያ" },
  { id: 18, name: "Bemnet (ቤምነት)", role: "ቁጥርጥር / ሹሩባ" }
];

// Dynamic API URL: Use relative path if in browser, fallback to IP for Electron
const API_URL = (window.location.protocol === 'file:') 
  ? 'http://127.0.0.1:3000/api' 
  : '/api';

// Robust fetch with timeout (10 seconds)
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 20000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}


let auditLogs = [];
let expensesList = [];
let isAdminAuthenticated = false;
let currentSession = [];

async function loadData() {
  try {
    const [logsRes, expensesRes] = await Promise.all([
      fetchWithTimeout(`${API_URL}/logs`),
      fetchWithTimeout(`${API_URL}/expenses`)
    ]);
    
    const logsData = await logsRes.json();
    const expensesData = await expensesRes.json();
    
    auditLogs = Array.isArray(logsData) ? logsData : [];
    expensesList = Array.isArray(expensesData) ? expensesData : [];

    const dbStatus = document.getElementById('db-status');
    if (dbStatus) dbStatus.innerHTML = '<span style="color: var(--success);">መረጃው በሰላም ተገናኝቷል (Online Cloud DB Ready)</span>';

    // Initial UI render
    populateSelects();
    renderCashierLogs();
    updateLeaderboard();

    // Check for migration
    checkMigration();
  } catch (err) {
    console.error("Failed to load data:", err);
  }
}

async function saveData() {
  // Inventory autosave removed
}

async function checkMigration() {
  const localLogs = JSON.parse(localStorage.getItem('minish_logs_v4'));
  const localInv = JSON.parse(localStorage.getItem('minish_inventory_v1'));

  if ((localLogs && localLogs.length > 0) || (localInv && localInv.length > 0)) {
    if (confirm("You have data saved in your browser from today. Move it to the permanent SQL Database?")) {
      if (localLogs) await fetch(`${API_URL}/logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(localLogs) });
      if (localInv) {
        for (const item of localInv) {
          await fetch(`${API_URL}/inventory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
        }
      }
      localStorage.removeItem('minish_logs_v4');
      localStorage.removeItem('minish_inventory_v1');
      alert("Migration complete! Today's work is now safe in SQL.");
      loadData();
    }
  }
}

// Replace initial sync with load call
window.addEventListener('DOMContentLoaded', loadData);

// Navigation Logic
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const targetId = e.currentTarget.getAttribute('data-target');
    if (typeof closeMobileMenu === 'function') closeMobileMenu();
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

// Admin Auth
document.getElementById('btn-admin-login').addEventListener('click', async (e) => {
  const loginBtn = document.getElementById('btn-admin-login');
  const userSelect = document.getElementById('login-user');
  const passwordInput = document.getElementById('manager-password');
  const user = userSelect.value;
  const password = passwordInput.value;
  
  if (!password) return;

  const pendingTarget = loginBtn.dataset.pendingTarget || 'manager-view';
  const pendingBtnId = loginBtn.dataset.pendingBtnId || 'nav-manager';

  const originalText = loginBtn.innerText;
  loginBtn.innerText = "በመግባት ላይ... (Logging in...)";
  loginBtn.disabled = true;

  try {
    const res = await fetchWithTimeout(`${API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password })
    });

    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    
    if (data.success) {
      isAdminAuthenticated = true;
      document.getElementById('login-modal').classList.add('hidden');
      passwordInput.value = '';
      
      const targetBtn = document.getElementById(pendingBtnId);
      switchView(pendingTarget, targetBtn || document.getElementById('nav-manager'));
    } else {
      alert("ስህተት የይለፍ ቃል:: (Incorrect password.)");
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (err) {
    console.error('Auth connection error:', err);
    alert(`የግንኙነት ስህተት ተከስቷል። (Connection Error): ${err.message}`);
  } finally {
    loginBtn.innerText = originalText;
    loginBtn.disabled = false;
  }
});

document.getElementById('btn-admin-cancel').addEventListener('click', () => {
  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('manager-password').value = '';
});

// Allow Enter key to submit PIN
document.getElementById('manager-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-admin-login').click();
});

// Mobile Sidebar
const mobileMenuBtn = document.getElementById('floating-menu-btn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
function closeMobileMenu() {
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}
if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay.addEventListener('click', closeMobileMenu);
}

// UI Utilities
function triggerConfetti() {
  if (typeof confetti !== 'undefined') {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  }
}

function populateSelects() {
  const employeeSelect = document.getElementById('active-employee-select');
  const washerSelect = document.getElementById('washer-employee-select');
  employeeSelect.innerHTML = '<option value="">-- ሰራተኛውን ይምረጡ --</option>';
  if (washerSelect) washerSelect.innerHTML = '<option value="">-- ካለ ይምረጡ --</option>';
  
  employees.forEach(emp => { 
    const opt = `<option value="${emp.id}">${emp.name}</option>`;
    employeeSelect.innerHTML += opt; 
    if (washerSelect) washerSelect.innerHTML += opt;
  });

  const soldSelect = document.getElementById('product-sold-select');
  const usedSelect = document.getElementById('product-used-select');
  if (soldSelect) soldSelect.innerHTML = '<option value="">-- Inventory Disabled --</option>';
  if (usedSelect) usedSelect.innerHTML = '<option value="">-- Inventory Disabled --</option>';
}

document.getElementById('product-sold-select').addEventListener('change', (e) => {
  document.getElementById('product-qty-group').classList.toggle('hidden', e.target.value === "");
});
document.getElementById('product-used-select').addEventListener('change', (e) => {
  document.getElementById('product-used-qty-group').classList.toggle('hidden', e.target.value === "");
});

const SERVICE_OPTIONS = {
  HAIR: [
    { text: "Haircut (መቁረጥ)", value: "Haircut", price: 500 },
    { text: "Simple Styling (ማበጠር)", value: "Styling", price: 300 },
    { text: "Wave (ዌቭ)", value: "Wave", price: 500 },
    { text: "Pubis (ፑብሊስ)", value: "Pubis", price: 500 },
    { text: "Sab Sab (ሳብ ሳብ)", value: "SabSab", price: 500 },
    { text: "Sab Sab with Wig (ሳብ ሳብ ከዊግ ጋር)", value: "SabSabWig", price: 600 },
    { text: "Peystra (ፔይስትራ)", value: "Peystra", price: 500 },
    { text: "ካስክ (Kask)", value: "Kask", price: 400 },
    { text: "Pubis with Wig (ፑብሊስ ከዊግ ጋር)", value: "PubisWig", price: 600 },
    { text: "Wave with Wig (ዌቭ ከዊግ ጋር)", value: "WaveWig", price: 600 },
    { text: "Peystra with Wig (ፔይስትራ ከዊግ ጋር)", value: "PeystraWig", price: 600 },
    { text: "Peystra Short Hair (ፔይስትራ አጭር ፀጉር)", value: "PeystraShort", price: 400 }
  ],
  NAILS: [
    { text: "Gel by Shilak (ጄል በሽላክ)", value: "GelShilak", price: 1500 },
    { text: "Litef by Shilak (ሊጠፍ በሽላክ)", value: "LitefShilak", price: 1200 },
    { text: "Litef by Normal (ኖርማል ሊጠፍ)", value: "LitefNormal", price: 1000 },
    { text: "Refill by Shilak (ሪፊል በሽላክ)", value: "RefillShilak", price: 1200 },
    { text: "Normal Polish (ኖርማል)", value: "Normal Polish", price: 200 },
    { text: "Pedicure (የእግር ጥፍር)", value: "Pedicure", price: 1000 },
    { text: "Special Pedicure", value: "SpecialPedicure", price: 1500 },
    { text: "Manicure (የእጅ ጥፍር)", value: "Manicure", price: 500 },
    { text: "Normal Shilak (ኖርማል ሽላክ)", value: "NormalShilak", price: 500 },
    { text: "Removing Shilak (ሽላክ ማነሳት)", value: "RemovingShilak", price: 200 }
  ],
  FACE: [
    { text: "EYE BROW OMBRE (ሚኒሽ ስፔሻል)", value: "Ombre", price: 7000 },
    { text: "Eyebrow Heena (ቅንድብ ሂና)", value: "EyebrowHeena", price: 500 },
    { text: "Eyebrow Razor (በምላጭ)", value: "Razor", price: 100 },
    { text: "Eyebrow Thread (በክር)", value: "Thread", price: 200 },
    { text: "Eyebrow Wax (በዋክስ)", value: "Wax", price: 300 },
    { text: "Facial Massage (የፊት ማሳጅ)", value: "Facial", price: 300 },
    { text: "Make up with eyelash", value: "MakeupLash", price: 3000 },
    { text: "Make up (ሜካፕ)", value: "Makeup", price: 2500 },
    { text: "Eyelash 1 by 1 (ሽፋሽፍት 1 በ 1)", value: "EyelashOneByOne", price: 2500 },
    { text: "Eyelash Meletef (ሽፋሽፍት መለጠፍ)", value: "EyelashMeletef", price: 1000 }
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
    { text: "Box Braids (ሹሩባ)", value: "BoxBraids", price: 500 },
    { text: "Normal Sifet (ኖርማል ስፌት)", value: "NormalSifet", price: 700 },
    { text: "Sigsig Sifet (ስግስግ ስፌት)", value: "SigsigSifet", price: 800 },
    { text: "Front Shuruba + Back Sifet", value: "ShurubaBackSifet", price: 1400 },
    { text: "Front + Back Sifet (Own Wig) (በራሷ ዊግ)", value: "ShurubaBackSifetOwn", price: 1050 },
    { text: "Cornrow for Sifet (የስፌት ቁጥርጥር)", value: "CornrowSifet", price: 300 },
    { text: "Ponytail No Wig (ፖኒ ዊግ ሳይጨምር)", value: "PonytailNoWig", price: 700 },
    { text: "Ponytail Extension (ፖኒ ኤክስቴንሽን)", value: "PonytailExtension", price: 600 },
    { text: "Ponytail with Sifet (ፖኒ ከስፌት ጋር)", value: "PonytailSifet", price: 1500 },
    { text: "Front Shuruba + Back Peystra (ፊት ሹሩባ + ኋላ ፔይስትራ)", value: "FrontShurubaBackPeystra", price: 500 }
  ],
  COLOR_WASH: [
    { text: "Hair Color - Full (ሙሉ)", value: "ColorFull", price: 8000 },
    { text: "Hair Color - Roots (ቁርጭምጭሚት)", value: "ColorRoots", price: 1000 },
    { text: "Black Shampoo", value: "BlackShampoo", price: 400 },
    { text: "Washing (ፀጉር ማጠብ)", value: "Washing", price: 200 },
    { text: "Washing (Included / In Package)", value: "WashingIncluded", price: 0 },
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

  let availableOptions = [];
  const eyelashOptions = SERVICE_OPTIONS.FACE.filter(f => f.value.includes("Eyelash") || f.value === "MakeupLash");
  const washingOption = SERVICE_OPTIONS.COLOR_WASH.filter(f => f.value.includes("Washing"));

  // Mom's Logic: Everything EXCEPT Spa and Nails.
  if (emp.name.includes("Minish") || emp.id === 17) {
    availableOptions = [
      ...SERVICE_OPTIONS.HAIR,
      ...SERVICE_OPTIONS.FACE,
      ...SERVICE_OPTIONS.COLOR_WASH,
      ...SERVICE_OPTIONS.BRAID,
      ...SERVICE_OPTIONS.SPECIAL
    ];
  }
  // Hair Stylists + Eyebrows (Razor, Thread, Wax, Heena)
  else if (emp.name.match(/ዮናስ|Yonas|ክሩቤል|Kitrubel/)) {
    const hairExceptKask = SERVICE_OPTIONS.HAIR.filter(f => f.value !== "Kask");
    const eyebrowOnly = SERVICE_OPTIONS.FACE.filter(f => f.text.includes("Eyebrow") && !f.text.includes("OMBRE"));
    const colorWashExceptWashing = SERVICE_OPTIONS.COLOR_WASH.filter(f => !f.value.includes("Washing"));
    availableOptions = [...hairExceptKask, ...colorWashExceptWashing, ...eyebrowOnly];
  }
  // Nail Techs
  else if (emp.role.includes("ጥፍር") || emp.name.match(/መቅደስ|Mekdes|ክርስቲ|Christi|ሰብለ|Seble|መሰረት|Meseret/)) {
    availableOptions = [...SERVICE_OPTIONS.NAILS];
    if (emp.name.match(/መሰረት|Meseret/)) {
      availableOptions.push(...eyelashOptions);
    }
  }
  // Braid / Shuruhba / Cornrow Workers
  else if (emp.role.includes("ሹሩባ") || emp.role.includes("ቁጥርጥር") || emp.name.match(/ቤቲ ጥቁሯ|Beti Black|ቤቲ ነጯ|Beti White|ባርች|Barch|ሄለን|Helen|ቤምነት|Bemnet|ኒው ኢምፕሎይ|New Employee/)) {
    availableOptions = [...SERVICE_OPTIONS.BRAID];
  }
  // Spa Specialists
  else if (emp.role.includes("ሞሮኮ") || emp.name.match(/ህይወት|Hiwot|ማማሩ|Mamaru|ሜሪ|Meri/)) {
    availableOptions = [...SERVICE_OPTIONS.SPA];
    if (emp.name.match(/ህይወት|Hiwot/)) {
      availableOptions.push(...eyelashOptions);
    }
    if (emp.name.match(/ሜሪ|Meri/)) {
      availableOptions.push(...SERVICE_OPTIONS.BRAID);
      const kaskOption = SERVICE_OPTIONS.HAIR.filter(f => f.value === "Kask");
      const heenaOption = SERVICE_OPTIONS.FACE.filter(f => f.value === "EyebrowHeena");
      availableOptions.push(...kaskOption, ...heenaOption);
    }
  }
  // Default for others
  else {
    availableOptions = [
      ...SERVICE_OPTIONS.HAIR,
      ...SERVICE_OPTIONS.NAILS,
      ...SERVICE_OPTIONS.FACE,
      ...SERVICE_OPTIONS.SPA,
      ...SERVICE_OPTIONS.BRAID,
      ...SERVICE_OPTIONS.COLOR_WASH,
      ...SERVICE_OPTIONS.SPECIAL
    ];
  }

  // All employees can do washing, except Yonas and Kirubel
  if (!emp.name.match(/ዮናስ|Yonas|ክሩቤል|Kitrubel/)) {
    // Add Washing
    washingOption.forEach(wOpt => {
      if (!availableOptions.some(o => o.value === wOpt.value)) {
        availableOptions.push(wOpt);
      }
    });
    // Add Kask
    const kaskOption = SERVICE_OPTIONS.HAIR.filter(f => f.value === "Kask");
    kaskOption.forEach(kOpt => {
      if (!availableOptions.some(o => o.value === kOpt.value)) {
        availableOptions.push(kOpt);
      }
    });
  }

  availableOptions.forEach(opt => {
    serviceSelect.innerHTML += `<option value="${opt.value}" data-price="${opt.price || ''}">${opt.text}</option>`;
  });
});


document.getElementById('service-type').addEventListener('change', (e) => {
  const selectedOpt = e.target.options[e.target.selectedIndex];
  const price = selectedOpt.getAttribute('data-price');
  if (price) document.getElementById('service-price').value = price;
});

// --- MULTI-SERVICE SESSION LOGIC ---

function renderSessionList() {
  const container = document.getElementById('session-list-container');
  const list = document.getElementById('session-items');
  const totalDisplay = document.getElementById('session-total');

  if (currentSession.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  list.innerHTML = '';
  let total = 0;

  currentSession.forEach((item, index) => {
    total += item.revenue;
    const div = document.createElement('div');
    div.className = 'session-item fade-in';
    div.innerHTML = `
      <div class="session-info">
        <strong>${item.service}</strong><br/>
        <small>${item.employeeName} | ብር ${item.revenue}</small>
      </div>
      <div class="session-remove" onclick="removeFromSession(${index})">ሰርዝ (X)</div>
    `;
    list.appendChild(div);
  });

  totalDisplay.innerText = total.toLocaleString() + " ብር";
}

window.removeFromSession = (index) => {
  const item = currentSession[index];
  // Restore inventory levels
  if (item.productSoldId) {
    const invItem = inventory.find(i => i.id === item.productSoldId);
    if (invItem) invItem.qty += item.productSoldQty;
  }
  if (item.productUsedId) {
    const invItem = inventory.find(i => i.id === item.productUsedId);
    if (invItem) invItem.qty += item.productUsedQty;
  }
  currentSession.splice(index, 1);
  renderSessionList();
  populateSelects();
};

document.getElementById('btn-add-to-session').addEventListener('click', () => {
  const empIdVal = document.getElementById('active-employee-select').value;
  const serviceTypeElem = document.getElementById('service-type');
  const soldId = document.getElementById('product-sold-select').value;
  const servicePrice = parseFloat(document.getElementById('service-price').value) || 0;

  if (!empIdVal && !soldId) {
    return alert("እባክዎ ሰራተኛ ይምረጡ ወይንም የሚሸጥ ዕቃ ይምረጡ! (Please select a worker OR a retail item)");
  }

  let empName = "መጋዘን (Retail Store)";
  let empId = 0;
  let serviceType = "የዕቃ ሽያጭ (Retail Sale)";

  if (empIdVal) {
    const emp = employees.find(e => e.id === parseInt(empIdVal));
    if (emp) {
      empName = emp.name;
      empId = emp.id;
    }
    if (serviceTypeElem.selectedIndex >= 0) {
      serviceType = serviceTypeElem.options[serviceTypeElem.selectedIndex].text;
    }
  }

  // Products
  let productName = ""; let productPrice = 0; let productSoldQty = 0;
  if (soldId) {
    const item = inventory.find(i => i.id === soldId);
    if (item) {
      productSoldQty = parseInt(document.getElementById('product-sold-qty').value) || 1;
      if (productSoldQty > item.qty) return alert("በቂ እቃ የለም!");
      item.qty -= productSoldQty;
      productName = item.name;
      productPrice = item.sellPrice * productSoldQty;
    }
  }

  const usedId = document.getElementById('product-used-select').value;
  let usedName = ""; let productUsedQty = 0;
  if (usedId) {
    const item = inventory.find(i => i.id === usedId);
    if (item) {
      productUsedQty = parseInt(document.getElementById('product-used-qty').value) || 1;
      if (productUsedQty > item.qty) return alert("በቂ መገልገያ እቃ የለም!");
      item.qty -= productUsedQty;
      usedName = item.name;
    }
  }

  // Extras
  const useShampoo = document.getElementById('use-shampoo').checked;
  const useConditioner = document.getElementById('use-conditioner').checked;
  const usePlacentaGlass = document.getElementById('use-placenta-glass').checked;
  const usePlacentaPlastic = document.getElementById('use-placenta-plastic').checked;
  const useHalfFreeze = document.getElementById('use-half-freeze').checked;
  const useFullFreeze = document.getElementById('use-full-freeze').checked;
  const useGel = document.getElementById('use-gel').checked;
  const useWigWashing = document.getElementById('use-wig-washing').checked;
  const placentaGlassQty = parseInt(document.getElementById('placenta-glass-qty').value) || 1;
  const placentaPlasticQty = parseInt(document.getElementById('placenta-plastic-qty').value) || 1;
  const gelQty = parseInt(document.getElementById('gel-qty').value) || 1;
  const wigWashingQty = parseInt(document.getElementById('wig-washing-qty').value) || 1;
  const salonWigQty = parseInt(document.getElementById('salon-wig-qty').value) || 0;

  let finalServicePrice = servicePrice;
  let usageDetails = [];
  if (useShampoo) { finalServicePrice += 50; usageDetails.push("ሻምፑ"); }
  if (useConditioner) { finalServicePrice += 50; usageDetails.push("ኮንዲሽነር"); }
  if (usePlacentaGlass) { finalServicePrice += 100 * placentaGlassQty; usageDetails.push(`ፕላሴንታ ብርጭቆ x${placentaGlassQty}`); }
  if (usePlacentaPlastic) { finalServicePrice += 50 * placentaPlasticQty; usageDetails.push(`ፕላሴንታ ፕላስቲክ x${placentaPlasticQty}`); }
  if (useHalfFreeze) { finalServicePrice += 200; usageDetails.push("ሃፍ ፍሪዝ (Half Freeze)"); }
  if (useFullFreeze) { finalServicePrice += 400; usageDetails.push("ፉል ፍሪዝ (Full Freeze)"); }
  if (useGel) { finalServicePrice += 500 * gelQty; usageDetails.push(`ጄል (Gel) x${gelQty}`); }
  if (useWigWashing) { finalServicePrice += 200 * wigWashingQty; usageDetails.push(`ዊግ ማጠቢያ (Wig Washing) x${wigWashingQty}`); }
  if (salonWigQty > 0) { finalServicePrice += 300 * salonWigQty; usageDetails.push(`የሳሎን ዊግ x${salonWigQty} (+${300 * salonWigQty} ብር)`); }

  const totalRevenue = finalServicePrice + productPrice;

  // Add primary service
  currentSession.push({
    employeeId: empId,
    employeeName: empName,
    service: serviceType + (usageDetails.length ? ` (${usageDetails.join(", ")})` : ""),
    servicePrice: finalServicePrice,
    productName, productSoldId: soldId, productSoldQty, productPrice,
    usedName, productUsedId: usedId, productUsedQty,
    revenue: totalRevenue,
    points: empId > 0 ? 100 : 0 // No points for standalone retail sale
  });

  // Handle Washing Points (50 points credit for washer)
  const washerIdVal = document.getElementById('washer-employee-select').value;
  const serviceVal = serviceTypeElem.value;
  const isEligibleForWashPoints = (serviceVal !== 'Kask' && serviceVal !== 'WashingOnly');
  
  if (washerIdVal && isEligibleForWashPoints) {
    const washer = employees.find(e => e.id === parseInt(washerIdVal));
    if (washer) {
      currentSession.push({
        employeeId: washer.id,
        employeeName: washer.name,
        service: "Washing Points (የመታጠቢያ ነጥብ)",
        servicePrice: 0,
        productName: "", productSoldId: "", productSoldQty: 0, productPrice: 0,
        usedName: "", productUsedId: "", productUsedQty: 0,
        revenue: 0,
        points: 50 // Points requested for washing
      });
    }
  }

  // Clear form but KEEP customer name
  document.getElementById('service-price').value = '';
  document.getElementById('active-employee-select').value = '';
  document.getElementById('washer-employee-select').value = '';
  document.getElementById('use-shampoo').checked = false;
  document.getElementById('use-conditioner').checked = false;
  document.getElementById('use-placenta-glass').checked = false;
  document.getElementById('use-placenta-plastic').checked = false;
  document.getElementById('use-half-freeze').checked = false;
  document.getElementById('use-full-freeze').checked = false;
  document.getElementById('use-gel').checked = false;
  document.getElementById('use-wig-washing').checked = false;
  document.getElementById('placenta-glass-qty').value = '1';
  document.getElementById('placenta-plastic-qty').value = '1';
  document.getElementById('gel-qty').value = '1';
  document.getElementById('wig-washing-qty').value = '1';
  document.getElementById('salon-wig-qty').value = '0';
  document.getElementById('product-sold-select').value = '';
  document.getElementById('product-used-select').value = '';
  document.getElementById('active-employee-select').value = '';

  renderSessionList();
  populateSelects();

  // Custom Item Logic
  const btnCustomAdd = document.getElementById('btn-add-custom');
  if (btnCustomAdd) {
    btnCustomAdd.addEventListener('click', () => {
      const name = document.getElementById('custom-item-name').value;
      const qty = parseInt(document.getElementById('custom-item-qty').value) || 1;
      const price = parseFloat(document.getElementById('custom-item-price').value) || 0;

      if (!name || price <= 0) {
        return alert("እባክዎ ስም እና ዋጋ ያስገቡ! (Please enter name and price)");
      }

      currentSession.push({
        employeeId: 0,
        employeeName: "Custom (ተጨማሪ)",
        service: `${name} x${qty}`,
        servicePrice: price,
        productName: "", productSoldId: "", productSoldQty: 0, productPrice: 0,
        usedName: "", productUsedId: "", productUsedQty: 0,
        revenue: price * qty,
        points: 0
      });

      document.getElementById('custom-item-name').value = '';
      document.getElementById('custom-item-qty').value = '1';
      document.getElementById('custom-item-price').value = '';
      renderSessionList();
    });
  }

  // UX Feedback: Scroll to the session list and show a brief success signal
  const sessionList = document.getElementById('session-list-container');
  if (sessionList) {
    sessionList.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Visual feedback on the session list
    sessionList.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
    setTimeout(() => sessionList.style.boxShadow = '', 1000);
  }
});

document.getElementById('btn-finish-session').addEventListener('click', async () => {
  if (currentSession.length === 0) return;

  try {
    const customerName = document.getElementById('customer-name').value || 'ስም የሌለው';
    const paymentMethod = document.getElementById('payment-method').value;
    const timestamp = Date.now();

    let totalSessionRevenue = 0;

    const newLogs = currentSession.map(item => {
      const grossRevenue = item.revenue;
      const netRevenue = grossRevenue / 1.15;
      const vatAmount = grossRevenue - netRevenue;
      totalSessionRevenue += grossRevenue;

      return {
        ...item,
        customerName,
        paymentMethod,
        netRevenue: parseFloat(netRevenue.toFixed(2)),
        vatAmount: parseFloat(vatAmount.toFixed(2)),
        timestamp
      };
    });

    // Add Tip if provided
    const tipAmount = parseFloat(document.getElementById('tip-amount').value) || 0;
    if (tipAmount > 0) {
      totalSessionRevenue += tipAmount;
      newLogs.push({
        employeeId: 0,
        employeeName: "ሳሎን (Tip/Gursha)",
        service: "Tip / Gursha (ጉርሻ)",
        servicePrice: tipAmount,
        revenue: tipAmount,
        netRevenue: tipAmount, // Tips are usually non-VAT or handled differently, keeping it simple
        vatAmount: 0,
        customerName,
        paymentMethod,
        timestamp,
        isTip: true
      });
    }

    // Save to SQL
    const [logRes] = await Promise.all([
      fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLogs)
      }),
      saveData() // Save inventory updates
    ]);

    if (!logRes.ok) throw new Error(`Server returned log error: ${logRes.status}`);

    loadData(); // Reload all state from SQL
    currentSession = [];
    renderSessionList();

    // Clear everything
    document.getElementById('customer-name').value = '';
    document.getElementById('tip-amount').value = '0';
    populateSelects();
    renderCashierLogs();
    updateLeaderboard();
    checkLowStock();
    renderInventory();
    triggerConfetti();

    alert(`ጠቅላላ ${totalSessionRevenue.toLocaleString()} ብር በተሳካ ሁኔታ ተመዝግቧል!`);
  } catch (error) {
    console.error("Checkout Error:", error);
    alert("ይቅርታ፣ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።");
  }
});

// History & Leaderboard Logic
function renderCashierLogs() {
  const tbody = document.getElementById('today-logs-list');
  tbody.innerHTML = '';
  const recentLogs = [...auditLogs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  recentLogs.forEach((q, idx) => {
    const dateStr = new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    tbody.innerHTML += `
      <tr class="slide-in-right" style="animation-delay: ${idx * 0.05}s">
        <td>${dateStr}</td>
        <td><span class="status-badge" style="background:${q.paymentMethod === 'Bank' ? '#3B82F6' : '#10B981'}; color:white;">${q.paymentMethod === 'Bank' ? 'ባንክ' : 'ጥሬ'}</span></td>
        <td style="font-weight: bold; color: var(--accent-gold);">${q.employeeName}</td>
        <td>${q.service}</td>
        <td style="color:var(--success); font-weight:bold;">ብር ${q.revenue}</td>
        <td style="color:var(--text-muted); font-size: 0.9rem;">ብር ${q.vatAmount || (q.revenue * 0.15).toFixed(2)}</td>
      </tr>
    `;
  });
}

function updateLeaderboard() {
  const filter = document.getElementById('manager-date-filter').value;
  const specificDateStr = document.getElementById('manager-specific-date').value;
  const now = new Date();
  const todayStr = now.toLocaleDateString();

  // Show/Hide specific date picker
  document.getElementById('manager-specific-date').classList.toggle('hidden', filter !== 'specific');

  const logs = auditLogs.filter(log => {
    const logDate = new Date(log.timestamp);
    const logDateStr = logDate.toLocaleDateString();

    if (filter === 'today') return logDateStr === todayStr;

    if (filter === 'specific' && specificDateStr) {
      const sel = new Date(specificDateStr);
      return logDateStr === sel.toLocaleDateString();
    }

    if (filter === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      return log.timestamp >= weekStart.getTime();
    }

    if (filter === 'month') {
      return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    }

    if (filter === 'year') {
      return logDate.getFullYear() === now.getFullYear();
    }

    return true; // "all"
  });

  let totalRev = 0; let totalCost = 0; let cash = 0; let bank = 0;
  const stats = {}; 
  const staffWork = {}; 

  employees.forEach(e => {
    stats[e.id] = { name: e.name, revenue: 0, count: 0, points: 0, washPoints: 0 };
    staffWork[e.id] = { name: e.name, items: [] };
  });

  logs.forEach(log => {
    totalRev += log.revenue;
    if (log.paymentMethod === 'Bank') bank += log.revenue; else cash += log.revenue;
    
    if (stats[log.employeeId]) { 
      stats[log.employeeId].revenue += log.revenue; 
      stats[log.employeeId].count++; 
      // Add points (default to 100 if not specified for reverse compatibility)
      const pointsToAdd = log.points || 100;
      stats[log.employeeId].points += pointsToAdd;
      if (pointsToAdd === 50) {
        stats[log.employeeId].washPoints += 50;
      }
    }

    if (staffWork[log.employeeId]) {
      staffWork[log.employeeId].items.push(log);
    }

    if (log.productSoldId) {
      const item = inventory.find(i => i.id === log.productSoldId);
      if (item) totalCost += (item.buyPrice * log.productSoldQty);
    }
  });

  // Calculate Expenses (Wechi)
  let totalExpenses = 0;
  const filteredExpenses = expensesList.filter(e => {
    const logDate = new Date(e.timestamp);
    if (filter === 'today') return logDate.toLocaleDateString() === now.toLocaleDateString();
    if (filter === 'specific' && specificDateVal) return logDate.toLocaleDateString() === new Date(specificDateVal).toLocaleDateString();
    if (filter === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      return e.timestamp >= weekStart.getTime();
    }
    if (filter === 'month') return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    if (filter === 'year') return logDate.getFullYear() === now.getFullYear();
    return true; // "all"
  });

  const wechiListUI = document.getElementById('wechi-list');
  if (wechiListUI) {
    wechiListUI.innerHTML = '';
    filteredExpenses.forEach(e => {
      totalExpenses += parseFloat(e.amount);
      wechiListUI.innerHTML += `<tr>
        <td>${new Date(e.timestamp).toLocaleDateString()}</td>
        <td>${e.type}</td>
        <td>${e.desc || '-'}</td>
        <td style="color:#ef4444; font-weight:bold;">- ${e.amount} ብር</td>
        <td><button onclick="deleteWechi('${e.id}')" class="btn-danger" style="width:auto; padding:2px 8px;">X</button></td>
      </tr>`;
    });
  }

  document.getElementById('stat-total-revenue').innerText = "ብር " + totalRev.toLocaleString();
  document.getElementById('stat-net-profit').innerText = "ብር " + ((totalRev - totalCost) - totalExpenses).toLocaleString();
  document.getElementById('stat-stock-value').innerText = "ብር " + inventory.reduce((a, c) => a + (c.qty * c.buyPrice), 0).toLocaleString();
  document.getElementById('stat-cash-revenue').innerText = "ብር " + (cash - totalExpenses).toLocaleString();
  document.getElementById('stat-bank-revenue').innerText = "ብር " + bank.toLocaleString();

  // Top Earners (Money)
  const earnersSorted = Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  const earnersUI = document.getElementById('leaderboard-list-earners');
  if (earnersUI) {
    earnersUI.innerHTML = '';
    earnersSorted.slice(0, 10).forEach((s, i) => {
      earnersUI.innerHTML += `<li class="${i === 0 ? 'rank-1' : ''} slide-in-right" style="animation-delay: ${i * 0.05}s"><span class="rank-idx" style="background:var(--accent-gold); color:var(--bg-primary);">#${i + 1}</span><div class="rank-name">${s.name}</div><div class="rank-score">ብር ${s.revenue.toLocaleString()}</div></li>`;
    });
  }

  // Top Workers (Points) - Expanded to all staff
  const workersSorted = Object.values(stats).sort((a, b) => b.points - a.points);
  const workersUI = document.getElementById('leaderboard-list-workers');
  if (workersUI) {
    workersUI.innerHTML = '';
    // Show all employees who have points
    workersSorted.filter(s => s.points > 0).forEach((s, i) => {
      const washDisplay = s.washPoints > 0 ? `<span style="font-size:0.75rem; opacity:0.8; margin-left:8px;">(Wash: ${s.washPoints})</span>` : '';
      workersUI.innerHTML += `
        <li class="${i === 0 ? 'rank-worker-top' : ''} slide-in-right" style="animation-delay: ${i * 0.05}s">
          <span class="rank-idx" style="background:#3B82F6; color:white;">#${i + 1}</span>
          <div class="rank-name">${s.name}</div>
          <div class="rank-score" style="color:#60A5FA; display:flex; align-items:center; gap:4px;">
            <span>${s.points} Pts</span>
            ${washDisplay}
          </div>
        </li>`;
    });
  }

  const auditUI = document.getElementById('manager-audit-log-list');
  auditUI.innerHTML = '';
  logs.slice(0, 100).forEach(log => {
    const vat = log.vatAmount || (log.revenue * 0.15).toFixed(2);
    auditUI.innerHTML += `<tr><td>${new Date(log.timestamp).toLocaleDateString()}</td><td>${log.employeeName}</td><td>${log.paymentMethod}</td><td>ብር ${log.revenue}</td><td style="color:var(--text-muted);">ብር ${vat}</td><td><button onclick="deleteLogEntry(${log.timestamp})" class="btn-danger" style="width:auto; padding:2px 8px;">X</button></td></tr>`;
  });

  // --- Render Staff Detailed Report (Checklist) ---
  const reportContainer = document.getElementById('staff-report-container');
  if (reportContainer) {
    const workedStaff = Object.values(staffWork).filter(s => s.items.length > 0);
    
    if (workedStaff.length === 0) {
      reportContainer.innerHTML = '<div class="empty-state">ምንም የተመዘገበ ስራ የለም።</div>';
    } else {
      reportContainer.innerHTML = '';
      workedStaff.forEach(s => {
        const totalStaffRev = s.items.reduce((acc, curr) => acc + curr.revenue, 0);
        let itemsHtml = '';
        
        // Sort items by time (newest first)
        const sortedItems = [...s.items].sort((a,b) => b.timestamp - a.timestamp);
        
        sortedItems.forEach(item => {
          const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          itemsHtml += `
            <li class="staff-work-item">
              <span class="check-icon">✓</span>
              <span class="work-time">${time}</span>
              <span class="work-service">${item.service}</span>
              <span class="work-price">${item.revenue} ብር</span>
            </li>
          `;
        });

        reportContainer.innerHTML += `
          <div class="staff-report-item slide-in-right">
            <div class="staff-report-header">
              <h4>${s.name}</h4>
              <span class="staff-total-badge">${totalStaffRev.toLocaleString()} ብር</span>
            </div>
            <ul class="staff-work-list">
              ${itemsHtml}
            </ul>
          </div>
        `;
      });
    }
  }
}

document.getElementById('btn-clear-data').addEventListener('click', async () => {
  if (!isAdminAuthenticated) return;
  if (confirm("Are you sure? This will delete all transaction history!")) {
    await fetch(`${API_URL}/logs-reset`, { method: 'DELETE' });
    loadData();
  }
});

async function deleteLogEntry(ts) {
  if (!isAdminAuthenticated) return;
  if (confirm("Delete?")) {
    await fetch(`${API_URL}/logs/${ts}`, { method: 'DELETE' });
    loadData();
  }
}
window.deleteLogEntry = deleteLogEntry;

// Inventory Logic
document.getElementById('inv-type').addEventListener('change', (e) => {
  document.getElementById('inv-sell-group').style.display = e.target.value === 'Retail' ? 'block' : 'none';
});

document.getElementById('btn-add-inventory').addEventListener('click', async () => {
  const name = document.getElementById('inv-name').value;
  const type = document.getElementById('inv-type').value;
  const qty = parseInt(document.getElementById('inv-qty').value) || 0;
  const buy = parseFloat(document.getElementById('inv-buy').value) || 0;
  const sell = parseFloat(document.getElementById('inv-sell').value) || 0;
  if (!name || qty <= 0) return;
  const newItem = { id: "item_" + Date.now(), name, type, qty, buyPrice: buy, sellPrice: sell };
  await fetch(`${API_URL}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newItem)
  });
  loadData();
  populateSelects();
});

function renderInventory() {
  const list = document.getElementById('inventory-list');
  if (!list) return; list.innerHTML = '';
  inventory.forEach(i => {
    list.innerHTML += `<tr><td>${i.name}</td><td>${i.type}</td><td>${i.qty}</td><td>${i.buyPrice}</td><td>${i.sellPrice || '-'}</td><td><button onclick="deleteInventory('${i.id}')" class="btn-danger" style="width:auto; padding:2px 8px;">X</button></td></tr>`;
  });
}
window.deleteInventory = async (id) => {
  if (confirm("Delete?")) {
    await fetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
    loadData();
    populateSelects();
  }
}

function checkLowStock() {
  const low = inventory.filter(i => i.qty < 5);
  const container = document.getElementById('low-stock-alert-container');
  if (container) container.innerHTML = low.length ? `<div class="alert-banner"><div class="alert-dot"></div><span>${low.length} እቃዎች እያለቁ ነው!</span></div>` : '';
}

document.getElementById('customer-search').addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll('#manager-audit-log-list tr').forEach(r => r.style.display = r.innerText.toLowerCase().includes(term) ? '' : 'none');
});

// CSV Export
document.getElementById('btn-export-csv').addEventListener('click', () => {
  let csv = "data:text/csv;charset=utf-8,\uFEFFDate,Employee,Price\n";
  auditLogs.forEach(l => csv += `${new Date(l.timestamp).toLocaleDateString()},${l.employeeName},${l.revenue}\n`);
  const link = document.createElement("a"); link.setAttribute("href", encodeURI(csv)); link.setAttribute("download", "Report.csv"); link.click();
});

// Print logic
document.getElementById('btn-print-last').addEventListener('click', () => {
  if (auditLogs.length === 0) return alert("እስካሁን ምንም ሪከርድ የለም");

  const latest = auditLogs[auditLogs.length - 1];
  const sessionLogs = auditLogs.filter(l => l.timestamp === latest.timestamp);

  const pArea = document.getElementById('print-receipt-area');
  document.getElementById('print-date').innerText = new Date(latest.timestamp).toLocaleString();

  let itemsHtml = `<b>Customer:</b> ${latest.customerName}<br/><hr style="border:1px dashed #ccc; margin:10px 0;">`;
  let grandTotal = 0;
  let totalVAT = 0;

  sessionLogs.forEach(log => {
    const currentVAT = log.vatAmount || (log.revenue * 0.15);
    grandTotal += log.revenue;
    totalVAT += currentVAT;
    itemsHtml += `
      <div style="margin-bottom: 8px;">
        <div><b>${log.service}</b></div>
        <div style="display:flex; justify-content:space-between; font-size: 0.85em;">
          <span>${log.employeeName}</span>
          <span>${log.revenue} ብር</span>
        </div>
      </div>
    `;
  });

  itemsHtml += `<hr style="border:1px dashed #ccc; margin:10px 0;">`;
  itemsHtml += `<div style="text-align:right; font-size: 0.9em; color: #555;">Net Total: ${(grandTotal - totalVAT).toFixed(2)} ብር</div>`;
  itemsHtml += `<div style="text-align:right; font-size: 0.9em; color: #555;">VAT (15%): ${totalVAT.toFixed(2)} ብር</div>`;
  itemsHtml += `<h3 style="margin:5px 0; text-align:right;">TOTAL: ${grandTotal.toLocaleString()} ብር</h3>`;
  itemsHtml += `<div><b>Paid:</b> ${latest.paymentMethod}</div>`;

  document.getElementById('print-content').innerHTML = itemsHtml;
  pArea.style.display = 'block';
  window.print();
  pArea.style.display = 'none';
});

// Manager Filter Events
document.getElementById('manager-date-filter').addEventListener('change', updateLeaderboard);
document.getElementById('manager-specific-date').addEventListener('change', updateLeaderboard);

// Wechi (Expenses) Logic
document.getElementById('wechi-type').addEventListener('change', (e) => {
  const type = e.target.value;
  const amountGroup = document.getElementById('wechi-amount-group');
  if (type === 'Water Packed' || type === 'Juice') {
    amountGroup.style.display = 'none';
  } else {
    amountGroup.style.display = 'block';
  }
});

document.getElementById('btn-add-wechi').addEventListener('click', async () => {
  const type = document.getElementById('wechi-type').value;
  let desc = document.getElementById('wechi-desc').value;
  const qtyInput = document.getElementById('wechi-qty');
  const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
  const tipInput = document.getElementById('wechi-tip');
  const tip = parseFloat(tipInput ? tipInput.value : 0) || 0;
  let amount = 0;

  if (type === 'Water Packed') amount = 300 * qty;
  else if (type === 'Juice') amount = 180 * qty;
  else amount = parseFloat(document.getElementById('wechi-amount').value) * qty;

  amount += tip;

  if (qty > 1 || tip > 0) {
    let extraDesc = `x${qty}`;
    if (tip > 0) extraDesc += ` + ${tip} ጉርሻ`;
    desc = desc ? `${desc} (${extraDesc})` : extraDesc;
  }

  if (!amount || amount <= 0) return alert("እባክዎ የተክክለኛ ወጪ መጠን ያስገቡ (Please enter a valid amount)");

  const newWechi = {
    id: 'wechi_' + Date.now(),
    timestamp: Date.now(),
    type: type,
    desc: desc,
    amount: amount
  };

  try {
    const res = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWechi)
    });
    if (res.ok) {
      document.getElementById('wechi-amount').value = '';
      document.getElementById('wechi-desc').value = '';
      alert("ወጪው በትክክል ተመዝግቧል!");
      loadData();
    } else {
      throw new Error(`Server returned ${res.status}`);
    }
  } catch (err) {
    console.error(err);
    alert("ወጪውን መመዝገብ አልተቻለም። (Failed to save expense)");
  }
});

window.deleteWechi = async (id) => {
  if (confirm("ይህንን ወጪ መሰረዝ ይፈልጋሉ? (Delete Expense?)")) {
    await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
    loadData();
  }
};

// Initialization
populateSelects(); renderCashierLogs(); updateLeaderboard(); renderInventory(); checkLowStock();
