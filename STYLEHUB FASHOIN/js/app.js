// ============================================
// StyleHub — App Router & Global State
// ============================================

// Global state
let state = {
  cart: [],
  wishlist: []
};

// Load state from localStorage
function loadState() {
  try {
    const saved = localStorage.getItem('stylehub_state');
    if (saved) {
      state = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load state:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem('stylehub_state', JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
}

// Cart helpers
function getCartCount() {
  return state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function getWishlistCount() {
  return state.wishlist.length;
}

function addToCart(productId, size, color) {
  const existing = state.cart.find(
    item => item.productId === productId && item.size === size && item.color === color
  );

  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ productId, size, color, qty: 1 });
  }

  saveState();
  updateNavbarBadges();

  // Bag pulse animation on navbar
  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) {
    cartBtn.classList.add('bag-added-anim');
    setTimeout(() => cartBtn.classList.remove('bag-added-anim'), 500);
  }

  showToast('🛍️ Added to bag!');
}

function toggleWishlist(productId) {
  const idx = state.wishlist.indexOf(productId);
  if (idx >= 0) {
    state.wishlist.splice(idx, 1);
    showToast('Removed from wishlist');
  } else {
    state.wishlist.push(productId);
    showToast('❤️ Added to wishlist!');
  }
  saveState();
  updateNavbarBadges();

  // Update wishlist button appearance
  const wishBtn = document.querySelector(`#card-${productId} .product-card-wishlist`);
  if (wishBtn) {
    wishBtn.classList.toggle('active');
    wishBtn.innerHTML = state.wishlist.includes(productId) ? '❤️' : '♡';
  }
}

function updateNavbarBadges() {
  const cartBtn = document.getElementById('cart-btn');
  const wishlistBtn = document.getElementById('wishlist-btn');
  const cartCount = getCartCount();
  const wishlistCount = getWishlistCount();

  if (cartBtn) {
    const existing = cartBtn.querySelector('.badge');
    if (existing) existing.remove();
    if (cartCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = cartCount;
      cartBtn.appendChild(badge);
    }
  }

  if (wishlistBtn) {
    const existing = wishlistBtn.querySelector('.badge');
    if (existing) existing.remove();
    if (wishlistCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = wishlistCount;
      wishlistBtn.appendChild(badge);
    }
  }
}

// Navigation
function navigate(path) {
  window.location.hash = path;
}

// Router
function getRoute() {
  const hash = window.location.hash.slice(1) || '/';
  return hash;
}

function renderApp() {
  const route = getRoute();
  const app = document.getElementById('app');
  const navbarContainer = document.getElementById('navbar-container');
  const footerContainer = document.getElementById('footer-container');

  // Render navbar and footer
  if (navbarContainer) navbarContainer.innerHTML = renderNavbar();
  if (footerContainer) footerContainer.innerHTML = renderFooter();

  // Parse route
  let pageContent = '';
  let activePage = '';

  if (route === '/' || route === '') {
    pageContent = renderHomePage();
    activePage = 'home';
  } else if (route.startsWith('/shop')) {
    const params = route.includes('?') ? route.split('?')[1] : '';
    pageContent = renderShopPage(params);
    activePage = 'shop';
    if (params.includes('sale=true')) activePage = 'sale';
    if (params.includes('new=true')) activePage = 'new';
    if (params.includes('category=')) activePage = 'categories';
  } else if (route.startsWith('/product/')) {
    const id = route.split('/product/')[1];
    pageContent = renderProductPage(id);
    activePage = 'shop';
  } else if (route === '/cart') {
    pageContent = renderCartPage();
    activePage = '';
  } else if (route === '/checkout') {
    pageContent = renderCheckoutPage();
    activePage = '';
  } else if (route === '/orders') {
    pageContent = renderOrdersPage();
    activePage = '';
  } else {
    pageContent = `
      <div class="container" style="text-align:center; padding:120px 24px;">
        <h1 style="font-family:var(--font-heading); font-size:72px; font-weight:900; margin-bottom:16px;">404</h1>
        <p style="font-size:18px; color:var(--text-secondary); margin-bottom:32px;">Page not found</p>
        <button class="btn btn-dark btn-lg" onclick="navigate('/')">Back to Home</button>
      </div>
    `;
  }

  // Inject page content
  if (app) {
    app.innerHTML = pageContent;
  }

  // Update active nav link
  updateNavActive(activePage);

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Initialize scroll animations
  requestAnimationFrame(() => {
    initScrollAnimations();
    // Start countdown if sale page
    if (route.includes('sale=true')) {
      startCountdown();
    }
  });
}

// Scroll animations
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
  });
}

// Toast notifications
function showToast(message) {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Scroll to top button
function initScrollToTop() {
  const btn = document.getElementById('scroll-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ─── Cart Drawer ───
function renderCartDrawer() {
  const subtotal = getCartSubtotal();
  const itemsHtml = state.cart.map((item, i) => {
    const p = PRODUCTS.find(pr => pr.id === item.productId);
    if (!p) return '';
    return `
      <div class="cart-drawer-item">
        <img src="${p.image}" alt="${p.name}" onclick="closeCartDrawer(); navigate('/product/${p.id}')">
        <div class="cart-drawer-item-info">
          <div class="cart-drawer-item-name">${p.name}</div>
          <div class="cart-drawer-item-variant">${item.size} · ${item.color} · Qty: ${item.qty}</div>
          <div class="cart-drawer-item-bottom">
            <span class="cart-drawer-item-price">₹${(p.price * item.qty).toLocaleString('en-IN')}</span>
            <button class="cart-drawer-item-remove" onclick="removeFromCartDrawer(${i})" title="Remove">✕</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="cart-drawer-overlay" id="cart-drawer-overlay" onclick="closeCartDrawer()"></div>
    <div class="cart-drawer" id="cart-drawer">
      <div class="cart-drawer-header">
        <h3>🛍️ Your Bag <span class="drawer-count">${getCartCount()}</span></h3>
        <button class="cart-drawer-close" onclick="closeCartDrawer()">✕</button>
      </div>
      <div class="cart-drawer-items">
        ${state.cart.length === 0 ? `
          <div class="cart-drawer-empty">
            <div class="empty-bag-icon">🛍️</div>
            <p>Your bag is empty</p>
          </div>
        ` : itemsHtml}
      </div>
      ${state.cart.length > 0 ? `
        <div class="cart-drawer-footer">
          <div class="cart-drawer-total">
            <span>Subtotal</span>
            <span>₹${subtotal.toLocaleString('en-IN')}</span>
          </div>
          <button class="btn btn-orange btn-full" onclick="closeCartDrawer(); navigate('/checkout')">
            Checkout → ₹${subtotal.toLocaleString('en-IN')}
          </button>
          <button class="btn btn-outline-dark btn-full" onclick="closeCartDrawer(); navigate('/cart')">
            View Bag
          </button>
          ${subtotal >= 999 ? '<p class="free-ship-note">✓ You qualify for free shipping!</p>' : `<p class="free-ship-note">Add ₹${(999 - subtotal).toLocaleString('en-IN')} more for free shipping</p>`}
        </div>
      ` : ''}
    </div>
  `;
}

function openCartDrawer() {
  // Inject drawer HTML
  let drawerContainer = document.getElementById('cart-drawer-container');
  if (!drawerContainer) {
    drawerContainer = document.createElement('div');
    drawerContainer.id = 'cart-drawer-container';
    document.body.appendChild(drawerContainer);
  }
  drawerContainer.innerHTML = renderCartDrawer();

  // Animate open
  requestAnimationFrame(() => {
    document.getElementById('cart-drawer-overlay')?.classList.add('active');
    document.getElementById('cart-drawer')?.classList.add('active');
  });
}

function closeCartDrawer() {
  document.getElementById('cart-drawer-overlay')?.classList.remove('active');
  document.getElementById('cart-drawer')?.classList.remove('active');
  setTimeout(() => {
    const container = document.getElementById('cart-drawer-container');
    if (container) container.innerHTML = '';
  }, 400);
}

function removeFromCartDrawer(index) {
  state.cart.splice(index, 1);
  saveState();
  updateNavbarBadges();
  // Re-render drawer
  const container = document.getElementById('cart-drawer-container');
  if (container) {
    container.innerHTML = renderCartDrawer();
    requestAnimationFrame(() => {
      document.getElementById('cart-drawer-overlay')?.classList.add('active');
      document.getElementById('cart-drawer')?.classList.add('active');
    });
  }
}

// Initialize
function init() {
  loadState();
  renderApp();
  initNavbarScroll();
  initScrollToTop();

  // Listen for hash changes
  window.addEventListener('hashchange', renderApp);
}

// Run on load
document.addEventListener('DOMContentLoaded', init);

