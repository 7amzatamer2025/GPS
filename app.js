import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { createGame, beep } from "./game.js";

const $ = id => document.getElementById(id);
const fb = initializeApp(firebaseConfig), auth = getAuth(fb), db = getFirestore(fb);
const EMAIL = u => `${u.toLowerCase()}@explorer.app`; // اسم المستخدم بيتحول لإيميل داخلي

let me = null, U = null, mode = 'login', timer;
const lvOf = p => Math.floor(p / 200) + 1;

// ---------- اللعبة ----------
let tt;
const game = createGame({
  add(n) { U.pts += n; hud(); },
  toast(sub, name, txt) {
    $('tSub').textContent = sub; $('tName').textContent = name; $('tPts').textContent = txt;
    $('toast').classList.add('on'); clearTimeout(tt); tt = setTimeout(() => $('toast').classList.remove('on'), 3500);
  },
  changed() { clearTimeout(timer); timer = setTimeout(saveAll, 4000); }
});
function hud() { $('lvl').textContent = lvOf(U.pts); $('pts').textContent = U.pts; $('xp').style.width = (U.pts % 200) / 2 + '%'; }
function theme(t) {
  document.body.className = t; U.theme = t;
  document.querySelector('meta[name=theme-color]').content = getComputedStyle(document.body).getPropertyValue('--bg').trim();
  if (me) game.setDark(t !== 'parchment');
}

// ---------- الحفظ ----------
async function saveAll() {
  if (!me) return; clearTimeout(timer);
  const P = game.P;
  try {
    await setDoc(doc(db, 'users', me.uid), { ...U, cells: P.cells.size, areas: Object.keys(P.areas).length, shops: Object.keys(P.shops).length }, { merge: true });
    await setDoc(doc(db, 'users', me.uid, 'data', 'progress'), game.data());
  } catch (e) { console.error('save failed', e); }
}
addEventListener('visibilitychange', () => { if (document.hidden) saveAll(); });
addEventListener('pagehide', saveAll);

// ---------- الدخول ----------
const ERR = {
  'auth/email-already-in-use': 'الاسم ده مستخدم، جرّب اسم تاني.',
  'auth/invalid-credential': 'الاسم أو الباسورد غلط.',
  'auth/weak-password': 'الباسورد لازم 6 حروف على الأقل.',
  'auth/too-many-requests': 'محاولات كتير، استنى شوية وجرّب تاني.',
  'auth/network-request-failed': 'مفيش اتصال بالإنترنت.',
  'auth/wrong-password': 'الباسورد الحالي غلط.'
};
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  mode = b.dataset.mode;
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  $('aGo').textContent = mode === 'login' ? 'دخول' : 'إنشاء الحساب';
  $('aPass').autocomplete = mode === 'login' ? 'current-password' : 'new-password'; $('aErr').textContent = '';
});
$('authForm').onsubmit = async e => {
  e.preventDefault(); $('aErr').textContent = ''; $('aGo').disabled = true;
  const u = $('aUser').value.trim(), p = $('aPass').value;
  try {
    if (!/^[a-z0-9_]{3,20}$/i.test(u)) throw { code: 'x', message: 'الاسم حروف إنجليزي وأرقام و _ فقط (3 إلى 20).' };
    if (mode === 'register') {
      const c = await createUserWithEmailAndPassword(auth, EMAIL(u), p);
      await setDoc(doc(db, 'users', c.user.uid), { username: u.toLowerCase(), name: u, avatar: '', theme: 'night', pts: 0, cells: 0, areas: 0, shops: 0 });
    } else await signInWithEmailAndPassword(auth, EMAIL(u), p);
  } catch (err) { $('aErr').textContent = ERR[err.code] || err.message; }
  $('aGo').disabled = false;
};

onAuthStateChanged(auth, async user => {
  if (!user) { me = null; $('game').hidden = true; $('auth').hidden = false; document.body.className = 'night'; return; }
  me = user;
  const s = await getDoc(doc(db, 'users', user.uid));
  U = { name: user.email.split('@')[0], avatar: '', theme: 'night', pts: 0, ...(s.exists() ? s.data() : {}) };
  $('auth').hidden = true; $('game').hidden = false;
  game.init(); theme(U.theme);
  const p = await getDoc(doc(db, 'users', user.uid, 'data', 'progress'));
  game.load(p.exists() ? p.data() : {}); hud();
});

// ---------- الأزرار ----------
$('bMode').onclick = () => game.toggleSim();
$('bCenter').onclick = () => game.center();
$('bOut').onclick = async () => { await saveAll(); $('profile').close(); game.reset(); signOut(auth); };

// ---------- الحساب ----------
const BADGES = [
  ['أول خطوة', s => s.cells >= 1], ['رحّالة (5 مناطق)', s => s.areas >= 5], ['صيّاد محلات (10)', s => s.shops >= 10],
  ['ألف نقطة', s => s.pts >= 1000], ['مستوى 5', s => lvOf(s.pts) >= 5]
];
$('bProfile').onclick = () => {
  const P = game.P, s = { pts: U.pts, cells: P.cells.size, areas: Object.keys(P.areas).length, shops: Object.keys(P.shops).length };
  $('fName').value = U.name; $('fTheme').value = U.theme; $('avatar').src = U.avatar || '';
  $('avatar').alt = U.name; $('pMsg').textContent = '';
  $('stats').textContent = `${s.cells} خطوة · ${s.areas} منطقة · ${s.shops} محل`;
  $('badges').replaceChildren(...BADGES.map(([n, f]) => Object.assign(document.createElement('span'), { textContent: n, className: f(s) ? 'got' : '' })));
  $('profile').showModal();
};
$('bClose').onclick = () => $('profile').close();
$('fTheme').onchange = e => theme(e.target.value);
$('fAv').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { const i = new Image(); i.onload = () => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const m = Math.min(i.width, i.height);
    c.getContext('2d').drawImage(i, (i.width - m) / 2, (i.height - m) / 2, m, m, 0, 0, 128, 128);
    U.avatar = c.toDataURL('image/jpeg', .8); $('avatar').src = U.avatar;
  }; i.src = r.result; };
  r.readAsDataURL(f);
};
$('bSave').onclick = async () => {
  U.name = $('fName').value.trim().slice(0, 24) || U.name;
  await saveAll(); $('pMsg').textContent = 'تم الحفظ.';
};
$('bPass').onclick = async () => {
  try {
    if ($('pNew').value.length < 6) throw { code: 'auth/weak-password' };
    await reauthenticateWithCredential(me, EmailAuthProvider.credential(me.email, $('pOld').value));
    await updatePassword(me, $('pNew').value);
    $('pOld').value = $('pNew').value = ''; $('pMsg').textContent = 'تم تغيير الباسورد.';
  } catch (e) { $('pMsg').textContent = ERR[e.code === 'auth/invalid-credential' ? 'auth/wrong-password' : e.code] || 'حصلت مشكلة، جرّب تاني.'; }
};

// ---------- المتصدرين ----------
$('bBoard').onclick = async () => {
  await saveAll();
  const ol = $('list'); ol.replaceChildren(); $('board').showModal();
  try {
    const q = await getDocs(query(collection(db, 'users'), orderBy('pts', 'desc'), limit(20)));
    q.forEach((d, i) => {
      const u = d.data(), li = document.createElement('li'); if (d.id === me.uid) li.className = 'me';
      const img = Object.assign(document.createElement('img'), { alt: '', src: u.avatar || '' });
      const n = Object.assign(document.createElement('span'), { className: 'n', textContent: `${ol.children.length + 1}. ${u.name} · م${lvOf(u.pts || 0)}` });
      const p = Object.assign(document.createElement('span'), { className: 'p', textContent: u.pts || 0 });
      li.append(img, n, p); ol.append(li);
    });
  } catch (e) { ol.textContent = 'مقدرناش نحمّل المتصدرين.'; }
};
$('bBoardClose').onclick = () => $('board').close();
