// الخريطة + الضباب + الاكتشاف
const R = 70, CELL = 0.0004, AREA = 0.01; // نصف قطر الكشف بالمتر / خلية الخطوة / خلية المنطقة
const TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'; // بدون مفتاح، والثيمات الداكنة بفلتر CSS
let ac;
export function beep(f = 660, t = .18) {
  try {
    ac = ac || new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime;
    o.frequency.setValueAtTime(f, n); o.frequency.exponentialRampToValueAtTime(f * 2, n + t);
    g.gain.setValueAtTime(.12, n); g.gain.exponentialRampToValueAtTime(.001, n + t);
    o.connect(g).connect(ac.destination); o.start(); o.stop(n + t);
  } catch (e) {}
}

// h: { add(n), toast(sub,name,txt), changed() }
export function createGame(h) {
  const P = { cells: new Set(), areas: {}, shops: {} }, demo = new Set();
  let map, me, tiles, shopLayer, cv, cx, sim = false, wid, first = true;
  const ck = (la, lo) => Math.round(la / CELL) + ',' + Math.round(lo / CELL);

  function fog() {
    if (!map) return;
    const s = map.getSize(), d = devicePixelRatio || 1;
    cv.width = s.x * d; cv.height = s.y * d; cv.style.width = s.x + 'px'; cv.style.height = s.y + 'px';
    cx.setTransform(d, 0, 0, d, 0, 0);
    cx.globalCompositeOperation = 'source-over';
    cx.fillStyle = getComputedStyle(document.body).getPropertyValue('--fog'); cx.fillRect(0, 0, s.x, s.y);
    cx.globalCompositeOperation = 'destination-out';
    const z = map.getZoom(), b = map.getBounds().pad(.3);
    for (const set of [P.cells, demo]) for (const k of set) {
      const [i, j] = k.split(',').map(Number), la = i * CELL, lo = j * CELL;
      if (!b.contains([la, lo])) continue;
      const p = map.latLngToContainerPoint([la, lo]);
      const r = R / (156543.03 * Math.cos(la * Math.PI / 180) / 2 ** z);
      const g = cx.createRadialGradient(p.x, p.y, r * .4, p.x, p.y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, r, 0, 7); cx.fill();
    }
  }

  function addShop(s) {
    const m = L.marker([s.la, s.lo], { icon: L.divIcon({ className: '', html: '<div class="shop"></div>', iconSize: null }) }).addTo(shopLayer);
    m.getElement().firstChild.textContent = s.n; // textContent: أمان من الـ XSS
  }

  async function areaName(la, lo) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&accept-language=ar&zoom=14&lat=${la}&lon=${lo}`);
      const a = (await r.json()).address || {};
      return a.suburb || a.neighbourhood || a.city_district || a.town || a.city || 'منطقة جديدة';
    } catch (e) { return 'منطقة جديدة'; }
  }
  async function shopsNear(la, lo) {
    try {
      const q = `[out:json][timeout:10];node(around:${R * 1.6},${la},${lo})[name][~"^(shop|amenity)$"~"."];out 30;`;
      const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q) });
      let n = 0;
      for (const e of (await r.json()).elements) {
        const id = String(e.id); if (P.shops[id]) continue;
        const s = P.shops[id] = { la: e.lat, lo: e.lon, n: e.tags['name:ar'] || e.tags.name };
        addShop(s); n++;
      }
      if (n) { h.add(20 * n); beep(880, .25); h.changed(); }
    } catch (e) {}
  }

  async function visit(la, lo) {
    me.setLatLng([la, lo]);
    const k = ck(la, lo);
    if (P.cells.has(k) || demo.has(k)) return;
    if (sim) { demo.add(k); fog(); return; }   // وضع التجربة: كشف بس بدون نقط
    P.cells.add(k); fog(); h.add(1); beep(520, .1);
    const ak = Math.round(la / AREA) + ',' + Math.round(lo / AREA);
    if (!P.areas[ak]) {
      P.areas[ak] = '…'; h.add(50); beep(440, .5);
      const n = P.areas[ak] = await areaName(la, lo);
      h.toast('منطقة جديدة', n, '+50 نقطة');
    }
    h.changed();
    shopsNear(la, lo);
  }

  return {
    P,
    init() {
      if (map) { map.invalidateSize(); fog(); return; }
      map = L.map('map', { zoomControl: false }).setView([30.0444, 31.2357], 16);
      tiles = L.tileLayer(TILE, { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
      shopLayer = L.layerGroup().addTo(map);
      me = L.marker([30.0444, 31.2357], { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [20, 20] }) }).addTo(map);
      cv = document.getElementById('fog'); cx = cv.getContext('2d');
      map.on('move zoom resize', fog);
      map.on('click', e => { if (sim) visit(e.latlng.lat, e.latlng.lng); });
      this.startGPS();
    },
    startGPS() {
      if (!navigator.geolocation) return this.setSim(true);
      wid = navigator.geolocation.watchPosition(p => {
        if (sim || p.coords.accuracy > 100) return;
        const { latitude: la, longitude: lo } = p.coords;
        if (first) { map.setView([la, lo], 17); first = false; }
        visit(la, lo);
      }, () => this.setSim(true), { enableHighAccuracy: true, maximumAge: 3000 });
    },
    setSim(v) {
      sim = v; document.getElementById('bMode').textContent = v ? 'تجربة (اضغط الخريطة)' : 'GPS';
    },
    toggleSim() { this.setSim(!sim); },
    load(d) {
      P.cells = new Set(d.cells || []); P.areas = d.areas || {}; P.shops = d.shops || {};
      shopLayer.clearLayers(); Object.values(P.shops).forEach(addShop); fog();
    },
    data() { return { cells: [...P.cells], areas: P.areas, shops: P.shops }; },
    setDark(dark) { document.getElementById('map').classList.toggle('dark', dark); fog(); },
    refresh: fog,
    center() { map.panTo(me.getLatLng()); },
    reset() { P.cells = new Set(); P.areas = {}; P.shops = {}; demo.clear(); shopLayer && shopLayer.clearLayers(); fog(); },
  };
}
