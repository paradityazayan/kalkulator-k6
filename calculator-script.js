// ===================================================================
// KALKULATOR MANCING MASALAH — full engine
// Calculator + Converter + History + Memory + Gamification + Settings
// No backend, no build tools — everything lives in localStorage.
// ===================================================================

const LS_KEYS = {
  history: 'mancing_calc_history',
  memory: 'mancing_calc_memory',
  gamify: 'mancing_calc_gamify',
  settings: 'mancing_calc_settings'
};

/* ===================================================================
   SETTINGS
   =================================================================== */
const DEFAULT_SETTINGS = {
  theme: 'light',
  sound: 'off',
  animation: 'on',
  vibration: 'on',
  numberFormat: 'plain',
  decimals: 'auto'
};

class SettingsStore {
  constructor() {
    this.state = this.load();
  }
  load() {
    try {
      const raw = localStorage.getItem(LS_KEYS.settings);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  }
  save() {
    try { localStorage.setItem(LS_KEYS.settings, JSON.stringify(this.state)); } catch (e) {}
  }
  set(key, value) {
    this.state[key] = value;
    this.save();
  }
}

/* ===================================================================
   SOUND — Web Audio API, procedural, zero external files
   =================================================================== */
class SoundManager {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
  }
  ensure() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  isOn() { return this.settings.state.sound === 'on'; }
  tone(freq, type, duration, gainValue = 0.1) {
    if (!this.isOn()) return;
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = gainValue;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) { /* fail silently */ }
  }
  click() { this.tone(700, 'sine', 0.05, 0.08); }
  operator() { this.tone(500, 'square', 0.06, 0.07); }
  equals() {
    if (!this.isOn()) return;
    const ctx = this.ensure();
    if (!ctx) return;
    [660, 880].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      gain.gain.value = 0.09;
      osc.connect(gain); gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.07;
      osc.start(t); osc.stop(t + 0.12);
    });
  }
  error() { this.tone(180, 'sawtooth', 0.22, 0.12); }
  achievement() {
    if (!this.isOn()) return;
    const ctx = this.ensure();
    if (!ctx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      gain.gain.value = 0.08;
      osc.connect(gain); gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.08;
      osc.start(t); osc.stop(t + 0.28);
    });
  }
  levelUp() {
    if (!this.isOn()) return;
    const ctx = this.ensure();
    if (!ctx) return;
    [440, 554, 659, 880].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      gain.gain.value = 0.07;
      osc.connect(gain); gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.1;
      osc.start(t); osc.stop(t + 0.18);
    });
  }
}

/* ===================================================================
   GAMIFICATION — XP, Level (fishing ranks), Achievements
   =================================================================== */
const RANK_TITLES = [
  'Pemancing Pemula',
  'Pemburu Kail',
  'Nelayan Kadal',
  'Nelayan Ahli',
  'Kapten Dermaga',
  'Legenda Sungai',
  'Master Kadal Purba',
  'Grandmaster Mancing'
];

const ACHIEVEMENT_DEFS = [
  { id: 'first_calc', name: 'TANGKAPAN PERTAMA', icon: '🏆', desc: 'Melakukan perhitungan pertama.',
    check: (s) => s.totalCalcs >= 1 },
  { id: 'speed_10', name: 'PEMANCING KILAT', icon: '🏆', desc: 'Melakukan 10 perhitungan.',
    check: (s) => s.totalCalcs >= 10 },
  { id: 'math_100', name: 'JAGOAN ANGKA', icon: '🏆', desc: 'Melakukan 100 perhitungan.',
    check: (s) => s.totalCalcs >= 100 },
  { id: 'science', name: 'ILMUWAN KADAL', icon: '🏆', desc: 'Menggunakan mode Presisi (scientific).',
    check: (s) => !!s.usedScientific },
  { id: 'cube_master', name: 'KAPTEN KADAL', icon: '🏆', desc: 'Mencapai Level 10.',
    check: (s) => s.level >= 10 }
];

const DEFAULT_GAMIFY = {
  xp: 0,
  level: 1,
  maxXp: 100,
  totalCalcs: 0,
  usedScientific: false,
  achievements: {}
};

class GamifyStore {
  constructor(onLevelUp, onAchievement) {
    this.state = this.load();
    this.onLevelUp = onLevelUp;
    this.onAchievement = onAchievement;
  }
  load() {
    try {
      const raw = localStorage.getItem(LS_KEYS.gamify);
      return raw ? { ...DEFAULT_GAMIFY, ...JSON.parse(raw) } : { ...DEFAULT_GAMIFY };
    } catch (e) { return { ...DEFAULT_GAMIFY }; }
  }
  save() {
    try { localStorage.setItem(LS_KEYS.gamify, JSON.stringify(this.state)); } catch (e) {}
  }
  rankTitle() {
    const idx = Math.min(this.state.level - 1, RANK_TITLES.length - 1);
    return RANK_TITLES[idx];
  }
  addCalculation() {
    this.state.totalCalcs += 1;
    this.addXp(10);
    this.checkAchievements();
    this.save();
  }
  markScientificUsed() {
    if (!this.state.usedScientific) {
      this.state.usedScientific = true;
      this.checkAchievements();
      this.save();
    }
  }
  addXp(amount) {
    this.state.xp += amount;
    let leveled = false;
    while (this.state.xp >= this.state.maxXp) {
      this.state.xp -= this.state.maxXp;
      this.state.level += 1;
      this.state.maxXp = Math.round(this.state.maxXp * 1.5);
      leveled = true;
    }
    if (leveled && this.onLevelUp) this.onLevelUp(this.state.level);
  }
  checkAchievements() {
    ACHIEVEMENT_DEFS.forEach(def => {
      if (!this.state.achievements[def.id] && def.check(this.state)) {
        this.state.achievements[def.id] = true;
        if (this.onAchievement) this.onAchievement(def);
      }
    });
  }
  reset() {
    this.state = { ...DEFAULT_GAMIFY };
    this.save();
  }
}

/* ===================================================================
   HISTORY (Adventure History)
   =================================================================== */
class HistoryStore {
  constructor() {
    this.items = this.load();
  }
  load() {
    try {
      const raw = localStorage.getItem(LS_KEYS.history);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  save() {
    try { localStorage.setItem(LS_KEYS.history, JSON.stringify(this.items)); } catch (e) {}
  }
  add(expr, result) {
    this.items.unshift({ id: Date.now() + Math.random(), expr, result, ts: Date.now() });
    if (this.items.length > 100) this.items.length = 100;
    this.save();
  }
  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
  }
  clear() {
    this.items = [];
    this.save();
  }
}

/* ===================================================================
   MEMORY (MC / MR / M+ / M- / MS)
   =================================================================== */
class MemoryStore {
  constructor() {
    this.value = this.load();
  }
  load() {
    try {
      const raw = localStorage.getItem(LS_KEYS.memory);
      const n = raw ? parseFloat(raw) : 0;
      return isNaN(n) ? 0 : n;
    } catch (e) { return 0; }
  }
  save() {
    try { localStorage.setItem(LS_KEYS.memory, String(this.value)); } catch (e) {}
  }
  isActive() { return this.value !== 0; }
  set(v) { this.value = v; this.save(); }
  clear() { this.value = 0; this.save(); }
  add(v) { this.value += v; this.save(); }
  subtract(v) { this.value -= v; this.save(); }
}

/* ===================================================================
   CONVERTER — Panjang, Berat, Suhu, Luas, Volume, Waktu,
   Kecepatan, Data Digital, Energi
   =================================================================== */
const CONVERTER_DATA = {
  panjang: {
    label: 'Panjang',
    units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, inch: 0.0254, foot: 0.3048, yard: 0.9144, mile: 1609.344 }
  },
  berat: {
    label: 'Berat',
    units: { mg: 0.000001, g: 0.001, kg: 1, ton: 1000, ons: 0.1, lb: 0.453592, oz: 0.0283495 }
  },
  suhu: { label: 'Suhu', special: true },
  luas: {
    label: 'Luas',
    units: { 'm2': 1, 'km2': 1000000, ha: 10000, 'ft2': 0.092903, acre: 4046.86 }
  },
  volume: {
    label: 'Volume',
    units: { ml: 0.001, l: 1, 'm3': 1000, gallon: 3.78541, cup: 0.24 }
  },
  waktu: {
    label: 'Waktu',
    units: { detik: 1, menit: 60, jam: 3600, hari: 86400, minggu: 604800 }
  },
  kecepatan: {
    label: 'Kecepatan',
    units: { 'm/s': 1, 'km/h': 0.277778, mph: 0.44704, knot: 0.514444 }
  },
  data: {
    label: 'Data Digital',
    units: { bit: 0.125, byte: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }
  },
  energi: {
    label: 'Energi',
    units: { joule: 1, kalori: 4.184, kWh: 3600000, 'watt-hour': 3600 }
  }
};

class Converter {
  constructor(root) {
    this.root = root;
    this.categorySelect = root.querySelector('#conv-category');
    this.fromUnit = root.querySelector('#conv-from-unit');
    this.toUnit = root.querySelector('#conv-to-unit');
    this.fromValue = root.querySelector('#conv-from-value');
    this.toValue = root.querySelector('#conv-to-value');
    this.swapBtn = root.querySelector('#btn-swap');

    Object.keys(CONVERTER_DATA).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = CONVERTER_DATA[key].label;
      this.categorySelect.appendChild(opt);
    });

    this.categorySelect.addEventListener('change', () => this.populateUnits());
    this.fromUnit.addEventListener('change', () => this.convert());
    this.toUnit.addEventListener('change', () => this.convert());
    this.fromValue.addEventListener('input', () => this.convert());
    this.swapBtn.addEventListener('click', () => this.swap());

    this.populateUnits();
  }
  currentUnits() {
    const cat = CONVERTER_DATA[this.categorySelect.value];
    return cat.special ? ['Celsius', 'Fahrenheit', 'Kelvin'] : Object.keys(cat.units);
  }
  populateUnits() {
    const units = this.currentUnits();
    [this.fromUnit, this.toUnit].forEach((sel, idx) => {
      sel.innerHTML = '';
      units.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u;
        opt.textContent = u;
        sel.appendChild(opt);
      });
      sel.selectedIndex = idx === 0 ? 0 : Math.min(1, units.length - 1);
    });
    this.convert();
  }
  convertTemp(value, from, to) {
    let celsius;
    if (from === 'Celsius') celsius = value;
    else if (from === 'Fahrenheit') celsius = (value - 32) * (5 / 9);
    else celsius = value - 273.15;

    if (to === 'Celsius') return celsius;
    if (to === 'Fahrenheit') return celsius * (9 / 5) + 32;
    return celsius + 273.15;
  }
  convert() {
    const value = parseFloat(this.fromValue.value);
    if (isNaN(value)) { this.toValue.value = ''; return; }

    const catKey = this.categorySelect.value;
    const cat = CONVERTER_DATA[catKey];
    let result;
    if (cat.special) {
      result = this.convertTemp(value, this.fromUnit.value, this.toUnit.value);
    } else {
      const base = value * cat.units[this.fromUnit.value];
      result = base / cat.units[this.toUnit.value];
    }
    const rounded = Math.round(result * 1e8) / 1e8;
    this.toValue.value = String(rounded);
  }
  swap() {
    const fi = this.fromUnit.selectedIndex;
    this.fromUnit.selectedIndex = this.toUnit.selectedIndex;
    this.toUnit.selectedIndex = fi;
    const fv = this.fromValue.value;
    this.fromValue.value = this.toValue.value || fv;
    this.convert();
  }
}

/* ===================================================================
   CALCULATOR CORE
   =================================================================== */
class Calculator {
  constructor(app) {
    this.app = app; // reference to the UIApp for hooks (sound, gamify, mascot)
    this.currentValue = '0';
    this.previousValue = '';
    this.operation = null;
    this.shouldResetDisplay = false;
    this.history = '0';
    this.angleMode = 'deg';

    this.displayElement = document.getElementById('display');
    this.historyElement = document.getElementById('history');
    this.basicGrid = document.getElementById('basic-grid');
    this.scientificGrid = document.getElementById('scientific-grid');
    this.btnBasic = document.getElementById('btn-basic');
    this.btnScientific = document.getElementById('btn-scientific');

    this.attachEventListeners();
    this.updateDisplay();
  }

  attachEventListeners() {
    document.querySelectorAll('.calc-btn.number').forEach(btn => {
      btn.addEventListener('click', () => {
        this.app.sound.click();
        this.appendNumber(btn.dataset.value);
      });
    });

    document.querySelectorAll('.calc-btn.operator').forEach(btn => {
      btn.addEventListener('click', () => {
        this.app.sound.operator();
        this.handleOperation(btn.dataset.action);
      });
    });

    document.querySelectorAll('.calc-btn.function').forEach(btn => {
      btn.addEventListener('click', () => {
        this.app.sound.click();
        this.handleFunction(btn.dataset.action);
      });
    });

    document.querySelectorAll('[data-action]').forEach(btn => {
      const action = btn.dataset.action;
      if (!['add', 'subtract', 'multiply', 'divide', 'sin', 'cos', 'tan', 'ln', 'log', 'sqrt', 'power', 'pi'].includes(action)) {
        btn.addEventListener('click', (e) => this.handleAction(action, e));
      }
    });

    document.querySelectorAll('.mem-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleMemory(btn.dataset.mem));
    });

    this.btnBasic.addEventListener('click', () => this.switchMode('basic'));
    this.btnScientific.addEventListener('click', () => this.switchMode('scientific'));

    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  appendNumber(num) {
    if (this.shouldResetDisplay) {
      this.currentValue = '';
      this.shouldResetDisplay = false;
    }
    if (num === '.' && this.currentValue.includes('.')) return;
    if (this.currentValue === '0' && num !== '.') {
      this.currentValue = num;
    } else {
      this.currentValue += num;
    }
    this.updateDisplay();
  }

  handleOperation(op) {
    const operations = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
    if (this.operation && !this.shouldResetDisplay) this.calculate();
    this.previousValue = this.currentValue;
    this.operation = op;
    this.history = `${this.currentValue} ${operations[op]}`;
    this.shouldResetDisplay = true;
    this.updateDisplay();
  }

  calculate() {
    let result;
    const prev = parseFloat(this.previousValue);
    const current = parseFloat(this.currentValue);
    if (isNaN(prev) || isNaN(current)) return;

    const exprStr = `${this.formatResult(prev)} ${({ add: '+', subtract: '−', multiply: '×', divide: '÷' })[this.operation]} ${this.formatResult(current)}`;

    switch (this.operation) {
      case 'add': result = prev + current; break;
      case 'subtract': result = prev - current; break;
      case 'multiply': result = prev * current; break;
      case 'divide':
        if (current === 0) { this.showError('Tidak bisa dibagi 0'); return; }
        result = prev / current;
        break;
      default: return;
    }

    if (!isFinite(result)) { this.showError('Hasil terlalu besar'); return; }

    this.currentValue = this.formatResult(result);
    this.operation = null;
    this.previousValue = '';
    this.history = '0';
    this.shouldResetDisplay = true;
    this.updateDisplay(true);
    this.app.onCalculationComplete(exprStr, this.currentValue);
  }

  handleFunction(func) {
    const value = parseFloat(this.currentValue);
    let result;
    this.app.gamify.markScientificUsed();

    try {
      switch (func) {
        case 'sin': result = Math.sin(this.toRadians(value)); break;
        case 'cos': result = Math.cos(this.toRadians(value)); break;
        case 'tan': result = Math.tan(this.toRadians(value)); break;
        case 'ln':
          if (value <= 0) throw new Error('ln(x) hanya untuk x > 0');
          result = Math.log(value);
          break;
        case 'log':
          if (value <= 0) throw new Error('log(x) hanya untuk x > 0');
          result = Math.log10(value);
          break;
        case 'sqrt':
          if (value < 0) throw new Error('√ tidak bisa untuk angka negatif');
          result = Math.sqrt(value);
          break;
        case 'power': result = Math.pow(value, 2); break;
        case 'pi':
          this.currentValue = Math.PI.toString();
          this.updateDisplay();
          return;
        default: return;
      }
      const exprStr = `${func}(${this.formatResult(value)})`;
      this.currentValue = this.formatResult(result);
      this.shouldResetDisplay = true;
      this.updateDisplay(true);
      this.app.onCalculationComplete(exprStr, this.currentValue);
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleAction(action) {
    switch (action) {
      case 'clear': this.clear(); break;
      case 'delete': this.delete(); break;
      case 'equals': this.calculate(); break;
      case 'percent': this.percent(); break;
      case 'parenthesis': break;
    }
  }

  handleMemory(action) {
    const value = parseFloat(this.currentValue) || 0;
    const mem = this.app.memory;
    this.app.sound.click();
    switch (action) {
      case 'mc': mem.clear(); break;
      case 'mr':
        this.currentValue = this.formatResult(mem.value);
        this.shouldResetDisplay = true;
        this.updateDisplay();
        break;
      case 'mplus': mem.add(value); break;
      case 'mminus': mem.subtract(value); break;
      case 'ms': mem.set(value); break;
    }
    this.app.updateMemoryIndicator();
  }

  clear() {
    this.currentValue = '0';
    this.previousValue = '';
    this.operation = null;
    this.history = '0';
    this.shouldResetDisplay = false;
    this.updateDisplay();
    this.app.sound.click();
    this.app.reactMascot('clear');
  }

  delete() {
    if (this.currentValue.length > 1) {
      this.currentValue = this.currentValue.slice(0, -1);
    } else {
      this.currentValue = '0';
    }
    this.updateDisplay();
    this.app.sound.click();
  }

  percent() {
    const value = parseFloat(this.currentValue);
    this.currentValue = this.formatResult(value / 100);
    this.shouldResetDisplay = true;
    this.updateDisplay();
  }

  switchMode(mode) {
    if (mode === 'basic') {
      this.basicGrid.classList.remove('hidden');
      this.scientificGrid.classList.add('hidden');
      this.btnBasic.classList.add('active');
      this.btnScientific.classList.remove('active');
    } else {
      this.basicGrid.classList.add('hidden');
      this.scientificGrid.classList.remove('hidden');
      this.btnBasic.classList.remove('active');
      this.btnScientific.classList.add('active');
      this.app.gamify.markScientificUsed();
    }
    this.app.sound.click();
  }

  formatForDisplay(str) {
    if (this.app.settings.state.numberFormat !== 'grouped') return str;
    const negative = str.startsWith('-');
    const clean = negative ? str.slice(1) : str;
    const [intPart, decPart] = clean.split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (negative ? '-' : '') + grouped + (decPart !== undefined ? '.' + decPart : '');
  }

  updateDisplay(pulse = false) {
    let displayValue = this.currentValue;
    if (displayValue.length > 12 && !displayValue.includes('e')) {
      const num = parseFloat(displayValue);
      if (!isNaN(num)) displayValue = num.toExponential(6);
    }

    this.displayElement.textContent = this.formatForDisplay(displayValue);
    this.historyElement.textContent = this.history;

    if (pulse && this.app.settings.state.animation === 'on') {
      this.displayElement.classList.remove('pulse');
      void this.displayElement.offsetWidth;
      this.displayElement.classList.add('pulse');
    }
  }

  showError(message) {
    this.displayElement.textContent = message;
    this.displayElement.classList.add('error');
    const container = document.querySelector('.display-container');
    container.classList.add('error');
    this.app.sound.error();
    this.app.reactMascot('error');

    setTimeout(() => {
      this.clear();
      this.displayElement.classList.remove('error');
      container.classList.remove('error');
    }, 2000);
  }

  formatResult(num) {
    if (isNaN(num) || !isFinite(num)) return 'Error';
    const rounded = Math.round(num * 1e10) / 1e10;
    let str = rounded.toString();

    const decSetting = this.app.settings.state.decimals;
    if (decSetting !== 'auto' && str.includes('.')) {
      str = rounded.toFixed(parseInt(decSetting, 10));
      str = parseFloat(str).toString();
    } else if (str.includes('.') && str.split('.')[1].length > 8) {
      str = rounded.toFixed(8);
      str = parseFloat(str).toString();
    }
    return str;
  }

  toRadians(degrees) {
    if (this.angleMode === 'deg') return degrees * (Math.PI / 180);
    return degrees;
  }

  handleKeyboard(e) {
    const relevantKeys = ['0','1','2','3','4','5','6','7','8','9','.','+','-','*','/','Enter','=','Backspace','Escape','%'];
    if (!relevantKeys.includes(e.key)) return;
    // Don't hijack keys while typing inside converter/settings inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    e.preventDefault();

    if (e.key >= '0' && e.key <= '9') this.appendNumber(e.key);
    else if (e.key === '.') this.appendNumber('.');

    switch (e.key) {
      case '+': this.handleOperation('add'); break;
      case '-': this.handleOperation('subtract'); break;
      case '*': this.handleOperation('multiply'); break;
      case '/': this.handleOperation('divide'); break;
      case 'Enter':
      case '=': this.calculate(); break;
      case 'Backspace': this.delete(); break;
      case 'Escape': this.clear(); break;
      case '%': this.percent(); break;
    }
  }
}

/* ===================================================================
   APP — wires everything together (tabs, drawer, modal, mascot, toasts)
   =================================================================== */
class UIApp {
  constructor() {
    this.settings = new SettingsStore();
    this.sound = new SoundManager(this.settings);
    this.history = new HistoryStore();
    this.memory = new MemoryStore();
    this.gamify = new GamifyStore(
      (level) => this.onLevelUp(level),
      (def) => this.onAchievement(def)
    );

    this.applyTheme(this.settings.state.theme, false);
    this.applySettingsUI();

    this.calculator = new Calculator(this);
    this.converter = new Converter(document.getElementById('panel-convert'));

    this.setupTabs();
    this.setupHeaderControls();
    this.setupHistoryDrawer();
    this.setupSettingsModal();

    this.updateMemoryIndicator();
    this.renderGamifyUI();
    this.renderHistoryList();

    this.setMascotSpeech('Siap mancing angka! Ketuk berapa aja buat mulai.');
  }

  /* ---------- THEME ---------- */
  applyTheme(theme, persist = true) {
    document.body.dataset.theme = theme;
    const btn = document.getElementById('btn-theme');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    document.documentElement.style.setProperty('--anim-speed', this.settings.state.animation === 'off' ? '0' : '1');
    if (persist) { this.settings.set('theme', theme); }
  }

  applySettingsUI() {
    document.querySelectorAll('#setting-theme .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === this.settings.state.theme));
    document.querySelectorAll('#setting-sound .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === this.settings.state.sound));
    document.querySelectorAll('#setting-animation .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === this.settings.state.animation));
    document.querySelectorAll('#setting-vibration .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === this.settings.state.vibration));
    document.querySelectorAll('#setting-format .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === this.settings.state.numberFormat));
    document.getElementById('setting-decimals').value = this.settings.state.decimals;

    const soundBtn = document.getElementById('btn-sound');
    if (soundBtn) soundBtn.textContent = this.settings.state.sound === 'on' ? '🔊' : '🔇';
  }

  /* ---------- TABS (Kalkulator / Konversi) ---------- */
  setupTabs() {
    const tabs = document.querySelectorAll('.top-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById(tab.dataset.panel).classList.remove('hidden');
        this.sound.click();
      });
    });
  }

  /* ---------- HEADER CONTROLS ---------- */
  setupHeaderControls() {
    document.getElementById('btn-theme').addEventListener('click', () => {
      const next = this.settings.state.theme === 'dark' ? 'light' : 'dark';
      this.applyTheme(next);
      this.applySettingsUI();
      this.sound.click();
    });

    document.getElementById('btn-sound').addEventListener('click', () => {
      const next = this.settings.state.sound === 'on' ? 'off' : 'on';
      this.settings.set('sound', next);
      this.applySettingsUI();
      this.sound.click();
    });

    document.getElementById('btn-history').addEventListener('click', () => this.openHistory());
    document.getElementById('btn-settings').addEventListener('click', () => this.openSettings());
  }

  /* ---------- HISTORY DRAWER ---------- */
  setupHistoryDrawer() {
    document.getElementById('btn-close-history').addEventListener('click', () => this.closeHistory());
    document.getElementById('history-drawer').addEventListener('click', (e) => {
      if (e.target.id === 'history-drawer') this.closeHistory();
    });
    document.getElementById('btn-clear-history').addEventListener('click', () => {
      this.history.clear();
      this.renderHistoryList();
      this.sound.click();
    });
  }

  openHistory() {
    this.renderHistoryList();
    document.getElementById('history-drawer').classList.remove('hidden');
    this.sound.click();
  }
  closeHistory() {
    document.getElementById('history-drawer').classList.add('hidden');
  }

  renderHistoryList() {
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    list.innerHTML = '';
    if (this.history.items.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    this.history.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item';
      row.innerHTML = `
        <div>
          <div class="hi-expr">${item.expr}</div>
          <div class="hi-result">= ${item.result}</div>
        </div>
        <button class="hi-del" aria-label="Hapus riwayat ini" data-id="${item.id}">✕</button>
      `;
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('hi-del')) return;
        this.calculator.currentValue = String(item.result);
        this.calculator.shouldResetDisplay = true;
        this.calculator.updateDisplay(true);
        this.closeHistory();
        this.sound.click();
      });
      row.querySelector('.hi-del').addEventListener('click', (e) => {
        e.stopPropagation();
        this.history.remove(item.id);
        this.renderHistoryList();
      });
      list.appendChild(row);
    });
  }

  /* ---------- SETTINGS MODAL ---------- */
  setupSettingsModal() {
    document.getElementById('btn-close-settings').addEventListener('click', () => this.closeSettings());
    document.getElementById('settings-modal').addEventListener('click', (e) => {
      if (e.target.id === 'settings-modal') this.closeSettings();
    });

    const wireSegment = (id, key, onChange) => {
      document.querySelectorAll(`#${id} .seg-btn`).forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll(`#${id} .seg-btn`).forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.settings.set(key, btn.dataset.value);
          if (onChange) onChange(btn.dataset.value);
          this.sound.click();
        });
      });
    };

    wireSegment('setting-theme', 'theme', (v) => this.applyTheme(v));
    wireSegment('setting-sound', 'sound', () => { document.getElementById('btn-sound').textContent = this.settings.state.sound === 'on' ? '🔊' : '🔇'; });
    wireSegment('setting-animation', 'animation', (v) => {
      document.documentElement.style.setProperty('--anim-speed', v === 'off' ? '0' : '1');
    });
    wireSegment('setting-vibration', 'vibration');
    wireSegment('setting-format', 'numberFormat', () => this.calculator.updateDisplay());

    document.getElementById('setting-decimals').addEventListener('change', (e) => {
      this.settings.set('decimals', e.target.value);
    });

    document.getElementById('btn-reset-data').addEventListener('click', () => {
      const ok = window.confirm('Reset semua data (riwayat, memori, XP, level, lencana, pengaturan)? Ini tidak bisa dibatalkan.');
      if (!ok) return;
      Object.values(LS_KEYS).forEach(k => localStorage.removeItem(k));
      window.location.reload();
    });
  }

  openSettings() {
    this.applySettingsUI();
    document.getElementById('settings-modal').classList.remove('hidden');
    this.sound.click();
  }
  closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
  }

  /* ---------- MEMORY INDICATOR ---------- */
  updateMemoryIndicator() {
    const indicator = document.getElementById('memory-indicator');
    const valueEl = document.getElementById('memory-value');
    if (this.memory.isActive()) {
      indicator.classList.remove('hidden');
      valueEl.textContent = this.memory.value;
    } else {
      indicator.classList.add('hidden');
    }
    document.querySelectorAll('.mem-btn').forEach(btn => {
      btn.classList.toggle('mem-active', btn.dataset.mem === 'ms' && this.memory.isActive());
    });
  }

  /* ---------- CALCULATION COMPLETE HOOK ---------- */
  onCalculationComplete(exprStr, resultStr) {
    this.history.add(exprStr, resultStr);
    this.renderHistoryList();
    this.gamify.addCalculation();
    this.renderGamifyUI();
    this.floatXp();
    this.reactMascot('success');
    this.sound.equals();
    this.pulseEqualsButton();
    if (this.settings.state.vibration === 'on' && navigator.vibrate) {
      navigator.vibrate(12);
    }
  }

  pulseEqualsButton() {
    if (this.settings.state.animation === 'off') return;
    const btn = document.querySelector('.calc-btn.equals');
    if (!btn) return;
    const ripple = document.createElement('span');
    ripple.className = 'energy-pulse';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 550);
  }

  floatXp() {
    if (this.settings.state.animation === 'off') return;
    const btn = document.querySelector('.calc-btn.equals');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'xp-float';
    el.textContent = '🎣 +10 XP';
    el.style.left = `${rect.left + rect.width / 2 - 30}px`;
    el.style.top = `${rect.top - 6}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  /* ---------- GAMIFY UI ---------- */
  renderGamifyUI() {
    const s = this.gamify.state;
    document.getElementById('rank-level').textContent = s.level;
    document.getElementById('rank-title').textContent = this.gamify.rankTitle();
    document.getElementById('xp-fill').style.width = `${Math.min(100, (s.xp / s.maxXp) * 100)}%`;
    document.getElementById('xp-text').textContent = `${s.xp} / ${s.maxXp} XP`;

    document.getElementById('footer-level').textContent = s.level;
    document.getElementById('footer-xp').textContent = s.xp;
    document.getElementById('footer-calcs').textContent = s.totalCalcs;
    const unlockedCount = Object.keys(s.achievements).length;
    document.getElementById('footer-ach').textContent = `${unlockedCount}/${ACHIEVEMENT_DEFS.length}`;
  }

  onLevelUp(level) {
    this.gamify.save();
    this.showToast(`⭐ LEVEL UP! Sekarang Level ${level} — ${this.gamify.rankTitle()}`, 'levelup');
    this.sound.levelUp();
    this.reactMascot('levelup');
    this.renderGamifyUI();
  }

  onAchievement(def) {
    this.gamify.save();
    this.showToast(`${def.icon} LENCANA: ${def.name}`, 'achievement');
    this.sound.achievement();
    this.renderGamifyUI();
  }

  showToast(message, type = '') {
    const region = document.getElementById('toast-region');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    const tilt = (Math.random() * 4 - 2).toFixed(1);
    toast.style.setProperty('--tilt', `${tilt}deg`);
    region.appendChild(toast);
    setTimeout(() => toast.remove(), 2900);
  }

  /* ---------- MASCOT ---------- */
  setMascotSpeech(text) {
    document.getElementById('mascot-speech').textContent = text;
  }

  reactMascot(kind) {
    const figure = document.getElementById('mascot-figure');
    const mouth = document.getElementById('mascot-mouth');
    figure.classList.remove('reacting');
    void figure.offsetWidth;
    figure.classList.add('reacting');

    const lines = {
      success: ['Tangkapan bagus! Angka masuk keranjang.', 'Perhitungan beres! Lempar lagi?', 'Nih hasilnya, seger kayak ikan baru!'],
      error: ['Waduh, kailnya nyangkut. Coba lagi.', 'Ada yang salah di lemparan itu.'],
      clear: ['Papan tulis bersih, siap mancing lagi!'],
      levelup: ['LEVEL UP! Kail makin jago!'],
    };
    const set = lines[kind] || lines.success;
    this.setMascotSpeech(set[Math.floor(Math.random() * set.length)]);

    if (mouth) {
      mouth.setAttribute('d', kind === 'error' ? 'M50 54 Q60 48 70 54' : 'M50 52 Q60 60 70 52');
      setTimeout(() => mouth.setAttribute('d', 'M50 52 Q60 58 70 52'), 900);
    }
  }
}

/* ===================================================================
   INIT
   =================================================================== */
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new UIApp();

  // Button press micro-interaction shared by every key
  document.querySelectorAll('.calc-btn, .mem-btn, .icon-btn, .top-tab, .mode-btn, .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (app.settings.state.animation === 'off') return;
      btn.style.transform = 'scale(0.92)';
      setTimeout(() => { btn.style.transform = ''; }, 130);
    });
  });

  // Unlock the audio context on first user gesture (autoplay policies)
  const unlock = () => {
    app.sound.ensure();
    ['click', 'keydown', 'touchstart'].forEach(ev => window.removeEventListener(ev, unlock));
  };
  ['click', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock));
});
