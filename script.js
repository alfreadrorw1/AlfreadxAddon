// ===== FIREBASE IMPORTS =====
import {
  db, storage,
  collection, getDocs, doc, updateDoc, onSnapshot,
  query, orderBy, limit, startAfter, increment,
  ref, getDownloadURL
} from './firebase.js';

// ===== STATE =====
let allAddons = [];
let filteredAddons = [];
let lastDoc = null;
let loading = false;
let noMore = false;
let searchQuery = '';
let likedSet = new Set(JSON.parse(localStorage.getItem('ax_likes') || '[]'));
let currentAddon = null;
let descExpanded = false;
const PAGE_SIZE = 6;

// ===== DOM =====
const loadingScreen = document.getElementById('loading-screen');
const loadingVideo = document.getElementById('loading-video');
const loadingFallback = document.getElementById('loading-fallback');
const addonList = document.getElementById('addon-list');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const loadMoreBtn = document.getElementById('load-more-btn');
const modalOverlay = document.getElementById('modal-overlay');
const detailSheet = document.getElementById('detail-sheet');
const themeSheet = document.getElementById('theme-sheet');
const toastContainer = document.getElementById('toast-container');
const scrollTopBtn = document.getElementById('scroll-top');
const offlineBanner = document.getElementById('offline-banner');
const countEl = document.getElementById('addon-count');

// ===== LOADING SCREEN =====
function hideLoading() {
  setTimeout(() => {
    loadingScreen.classList.add('hidden');
  }, 2200);
}

if (loadingVideo) {
  loadingVideo.addEventListener('error', () => {
    loadingVideo.style.display = 'none';
    loadingFallback?.classList.add('active');
  });
  loadingVideo.addEventListener('loadeddata', hideLoading);
  // Fallback in case video doesn't trigger
  setTimeout(hideLoading, 3000);
} else {
  hideLoading();
}

// ===== THEME =====
const COLORS = [
  '#00e5ff','#00ff9d','#ff4757','#ffa502','#a29bfe',
  '#fd79a8','#fdcb6e','#55efc4','#74b9ff','#e17055'
];

function applyAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-dim', hexToRgba(color, 0.15));
  document.documentElement.style.setProperty('--accent-glow', hexToRgba(color, 0.3));
  document.documentElement.style.setProperty('--border-accent', hexToRgba(color, 0.25));
  document.documentElement.style.setProperty('--shadow-accent', `0 0 20px ${hexToRgba(color, 0.3)}`);
  localStorage.setItem('ax_accent', color);
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function initTheme() {
  const saved = localStorage.getItem('ax_accent') || '#00e5ff';
  applyAccent(saved);
  const swatches = document.querySelectorAll('.color-swatch');
  swatches.forEach((sw, i) => {
    const c = COLORS[i];
    sw.style.background = c;
    sw.dataset.color = c;
    if (c === saved) sw.classList.add('active');
    sw.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      applyAccent(c);
    });
  });
  const customColor = document.getElementById('custom-color');
  if (customColor) {
    customColor.value = saved;
    customColor.addEventListener('input', (e) => {
      applyAccent(e.target.value);
      swatches.forEach(s => s.classList.remove('active'));
    });
  }
}

initTheme();

// ===== OFFLINE =====
window.addEventListener('offline', () => offlineBanner?.classList.add('active'));
window.addEventListener('online', () => offlineBanner?.classList.remove('active'));

// ===== TOAST =====
function showToast(msg, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ===== RIPPLE =====
function addRipple(el, e) {
  const rect = el.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  const size = Math.max(rect.width, rect.height);
  const x = (e.clientX - rect.left) - size / 2;
  const y = (e.clientY - rect.top) - size / 2;
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  el.style.position = 'relative';
  el.style.overflow = 'hidden';
  el.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

// ===== FORMAT DATE =====
function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ===== FORMAT VIEWS =====
function formatNum(n) {
  if (!n) return '0';
  if (n >= 1000) return (n/1000).toFixed(1) + 'K';
  return String(n);
}

// ===== SKELETON CARDS =====
function renderSkeletons(n = 3) {
  addonList.innerHTML = '';
  for (let i = 0; i < n; i++) {
    addonList.innerHTML += `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-desc"></div>
        <div class="skeleton skeleton-desc2"></div>
        <div class="skeleton-btns">
          <div class="skeleton skeleton-btn"></div>
          <div class="skeleton skeleton-btn"></div>
        </div>
      </div>
    </div>`;
  }
}

// ===== RENDER CARD =====
function createCard(addon, index) {
  const isLiked = likedSet.has(addon.id);
  const card = document.createElement('div');
  card.className = 'addon-card card-appear';
  card.style.animationDelay = `${index * 60}ms`;
  card.dataset.id = addon.id;
  card.innerHTML = `
    <div class="addon-card-img-wrap">
      <img src="${addon.imageUrl || 'assets/placeholder.png'}" alt="${addon.title}" loading="lazy"
        onerror="this.src='assets/placeholder.png'">
      <div class="addon-card-badge">Addon</div>
    </div>
    <div class="addon-card-body">
      <div class="addon-card-title">${escHtml(addon.title)}</div>
      <div class="addon-card-desc">${escHtml(addon.description || '')}</div>
      <div class="addon-card-meta">
        <div class="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>${formatNum(addon.views)}</span>
        </div>
        <div class="meta-item">
          <svg viewBox="0 0 24 24" fill="${isLiked ? '#ff4757' : 'none'}" stroke="${isLiked ? '#ff4757' : 'currentColor'}" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span id="likes-${addon.id}">${formatNum(addon.likes)}</span>
        </div>
        <div class="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>${formatDate(addon.createdAt)}</span>
        </div>
      </div>
      <div class="addon-card-actions">
        <button class="btn btn-primary" onclick="handleDownload(event, '${addon.id}', '${escAttr(addon.downloadUrl)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download
        </button>
        <button class="btn btn-secondary" onclick="handleDonate(event, '${escAttr(addon.donateUrl)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          Donate
        </button>
        <button class="btn btn-icon like-btn ${isLiked ? 'liked' : ''}"
          id="like-btn-${addon.id}"
          onclick="handleLike(event, '${addon.id}')">
          <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
    </div>`;

  // Click to open detail (not on buttons)
  card.addEventListener('click', (e) => {
    if (e.target.closest('.addon-card-actions')) return;
    openDetail(addon);
    addRipple(card, e);
  });

  return card;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(str) {
  return String(str || '').replace(/'/g, "\\'");
}

// ===== LOAD ADDONS =====
async function loadAddons(isLoadMore = false) {
  if (loading || noMore) return;
  loading = true;
  if (!isLoadMore) renderSkeletons(3);

  try {
    let q;
    if (isLoadMore && lastDoc) {
      q = query(collection(db, 'addons'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
    } else {
      q = query(collection(db, 'addons'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    }

    const snap = await getDocs(q);
    const docs = snap.docs;

    if (docs.length < PAGE_SIZE) {
      noMore = true;
      loadMoreBtn?.classList.add('hidden');
    } else {
      loadMoreBtn?.classList.remove('hidden');
    }

    if (docs.length > 0) {
      lastDoc = docs[docs.length - 1];
    }

    const newAddons = docs.map(d => ({ id: d.id, ...d.data() }));

    if (!isLoadMore) {
      allAddons = newAddons;
      if (!isLoadMore) addonList.innerHTML = '';
    } else {
      allAddons = [...allAddons, ...newAddons];
    }

    filteredAddons = searchQuery
      ? allAddons.filter(a => a.title?.toLowerCase().includes(searchQuery) || a.description?.toLowerCase().includes(searchQuery))
      : allAddons;

    renderAddonList(newAddons, isLoadMore);

    if (countEl) countEl.textContent = `${allAddons.length} addon`;

    if (allAddons.length === 0 && !isLoadMore) {
      addonList.innerHTML = `
        <div class="empty-state fade-in">
          <div class="empty-state-icon">📦</div>
          <h3>Belum ada addon</h3>
          <p>Admin belum upload addon apapun.</p>
        </div>`;
    }
  } catch (err) {
    console.error(err);
    if (!isLoadMore) {
      addonList.innerHTML = `
        <div class="empty-state fade-in">
          <div class="empty-state-icon">⚠️</div>
          <h3>Gagal memuat data</h3>
          <p>Periksa koneksi internet kamu.</p>
        </div>`;
    }
    showToast('Gagal memuat addon. Cek koneksi.', 'error');
  }

  loading = false;
}

function renderAddonList(addons, append = false) {
  if (!append) addonList.innerHTML = '';
  addons.forEach((addon, i) => {
    const card = createCard(addon, i);
    addonList.appendChild(card);
  });
}

// ===== REALTIME =====
function setupRealtime() {
  const q = query(collection(db, 'addons'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snap) => {
    // Only update if minor change (like count, views)
    snap.docChanges().forEach(change => {
      if (change.type === 'modified') {
        const data = { id: change.doc.id, ...change.doc.data() };
        const idx = allAddons.findIndex(a => a.id === data.id);
        if (idx !== -1) {
          allAddons[idx] = data;
          // Update likes count in DOM
          const likesEl = document.getElementById(`likes-${data.id}`);
          if (likesEl) likesEl.textContent = formatNum(data.likes);
        }
      }
    });
  });
}

// ===== SEARCH =====
let searchTimer;
searchInput?.addEventListener('input', (e) => {
  const val = e.target.value.trim().toLowerCase();
  searchClear?.classList.toggle('visible', val.length > 0);
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = val;
    if (!val) {
      renderAddonList(allAddons);
      countEl && (countEl.textContent = `${allAddons.length} addon`);
    } else {
      filteredAddons = allAddons.filter(a =>
        a.title?.toLowerCase().includes(val) ||
        a.description?.toLowerCase().includes(val)
      );
      renderAddonList(filteredAddons);
      countEl && (countEl.textContent = `${filteredAddons.length} ditemukan`);
      if (filteredAddons.length === 0) {
        addonList.innerHTML = `
          <div class="empty-state fade-in">
            <div class="empty-state-icon">🔍</div>
            <h3>Tidak ditemukan</h3>
            <p>Coba kata kunci lain.</p>
          </div>`;
      }
    }
  }, 300);
});

searchClear?.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  searchClear.classList.remove('visible');
  renderAddonList(allAddons);
  countEl && (countEl.textContent = `${allAddons.length} addon`);
});

// ===== ACTIONS =====
window.handleDownload = function(e, id, url) {
  e.stopPropagation();
  addRipple(e.currentTarget, e);
  if (!url || url === 'undefined') { showToast('Link download belum tersedia', 'warning'); return; }
  // Increment views
  updateDoc(doc(db, 'addons', id), { views: increment(1) }).catch(() => {});
  window.open(url, '_blank');
  showToast('Membuka link download...', 'success');
};

window.handleDonate = function(e, url) {
  e.stopPropagation();
  addRipple(e.currentTarget, e);
  if (!url || url === 'undefined') { showToast('Link donasi belum tersedia', 'warning'); return; }
  window.open(url, '_blank');
  showToast('Makasih udah support! 💙', 'success');
};

window.handleLike = async function(e, id) {
  e.stopPropagation();
  addRipple(e.currentTarget, e);
  const btn = document.getElementById(`like-btn-${id}`);
  const likesEl = document.getElementById(`likes-${id}`);
  const addon = allAddons.find(a => a.id === id);
  if (!addon) return;

  const isLiked = likedSet.has(id);
  if (isLiked) {
    likedSet.delete(id);
    btn?.classList.remove('liked');
    btn?.querySelector('svg')?.setAttribute('fill', 'none');
    await updateDoc(doc(db, 'addons', id), { likes: increment(-1) }).catch(() => {});
    addon.likes = Math.max(0, (addon.likes || 1) - 1);
  } else {
    likedSet.add(id);
    btn?.classList.add('liked');
    btn?.querySelector('svg')?.setAttribute('fill', 'currentColor');
    await updateDoc(doc(db, 'addons', id), { likes: increment(1) }).catch(() => {});
    addon.likes = (addon.likes || 0) + 1;
    // Bounce animation
    btn.style.transform = 'scale(1.3)';
    setTimeout(() => btn.style.transform = '', 200);
  }
  if (likesEl) likesEl.textContent = formatNum(addon.likes);
  localStorage.setItem('ax_likes', JSON.stringify([...likedSet]));
};

// ===== DETAIL SHEET =====
function openDetail(addon) {
  currentAddon = addon;
  descExpanded = false;

  // Increment views
  updateDoc(doc(db, 'addons', addon.id), { views: increment(1) }).catch(() => {});

  document.getElementById('sheet-img').src = addon.imageUrl || 'assets/placeholder.png';
  document.getElementById('sheet-title').textContent = addon.title;
  document.getElementById('sheet-views').textContent = formatNum(addon.views);
  document.getElementById('sheet-likes').textContent = formatNum(addon.likes);
  document.getElementById('sheet-date').textContent = formatDate(addon.createdAt);

  const descEl = document.getElementById('sheet-desc');
  descEl.textContent = addon.description || 'Tidak ada deskripsi.';
  descEl.className = 'sheet-desc collapsed';

  const toggleEl = document.getElementById('toggle-desc');
  if (addon.description && addon.description.length > 200) {
    toggleEl.style.display = 'inline-block';
    toggleEl.textContent = 'Baca Selengkapnya ↓';
  } else {
    toggleEl.style.display = 'none';
  }

  document.getElementById('sheet-dl').onclick = () => handleDownload({ stopPropagation: () => {}, currentTarget: document.getElementById('sheet-dl') }, addon.id, addon.downloadUrl);
  document.getElementById('sheet-donate').onclick = () => handleDonate({ stopPropagation: () => {}, currentTarget: document.getElementById('sheet-donate') }, addon.donateUrl);

  // Share buttons
  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent(`Cek addon Minecraft ini: ${addon.title}`);
  document.getElementById('share-wa').href = `https://wa.me/?text=${shareText}%20${shareUrl}`;
  document.getElementById('share-ig').href = `https://www.instagram.com/`;
  document.getElementById('share-tg').href = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;

  modalOverlay.classList.add('active');
  detailSheet.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  modalOverlay.classList.remove('active');
  detailSheet.classList.remove('active');
  document.body.style.overflow = '';
}

document.getElementById('toggle-desc')?.addEventListener('click', () => {
  const descEl = document.getElementById('sheet-desc');
  const toggleEl = document.getElementById('toggle-desc');
  descExpanded = !descExpanded;
  descEl.classList.toggle('collapsed', !descExpanded);
  toggleEl.textContent = descExpanded ? 'Tutup ↑' : 'Baca Selengkapnya ↓';
});

document.getElementById('share-copy')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showToast('Link disalin!', 'success');
  } catch {
    showToast('Gagal menyalin link', 'error');
  }
});

modalOverlay?.addEventListener('click', closeDetail);

// Swipe down to close
let startY = 0;
detailSheet?.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
detailSheet?.addEventListener('touchend', (e) => {
  const delta = e.changedTouches[0].clientY - startY;
  if (delta > 80) closeDetail();
}, { passive: true });

// ===== LOAD MORE =====
loadMoreBtn?.addEventListener('click', () => loadAddons(true));

// ===== SCROLL TO TOP =====
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    scrollTopBtn?.classList.add('visible');
  } else {
    scrollTopBtn?.classList.remove('visible');
  }
}, { passive: true });

scrollTopBtn?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== THEME SHEET =====
document.getElementById('open-theme')?.addEventListener('click', () => {
  themeSheet?.classList.add('active');
  modalOverlay?.classList.add('active');
});

document.getElementById('close-theme')?.addEventListener('click', () => {
  themeSheet?.classList.remove('active');
  modalOverlay?.classList.remove('active');
});

modalOverlay?.addEventListener('click', () => {
  themeSheet?.classList.remove('active');
});

// ===== BOTTOM NAV =====
document.querySelectorAll('.bottom-nav-item').forEach(item => {
  item.addEventListener('click', function() {
    document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
    this.classList.add('active');
  });
});

// ===== INIT =====
loadAddons();
setupRealtime();
