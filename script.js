const header = document.getElementById('header');
const hamburger = document.querySelector('.hamburger');
const mobileNav = document.getElementById('mobileNav');
const form = document.querySelector('.contact-form');
const logoLink = document.querySelector('.logo');
const logoImg = logoLink ? logoLink.querySelector('img') : null;
const NAV_CLICK_GAP = 0; // reset: no extra gap reduction on nav click

function updateHeaderHeight() {
  if (!header) return;
  const h = header.offsetHeight;
  document.documentElement.style.setProperty('--header-height', `${h}px`);
}

function updateLogoHeight() {
  let h = 0;
  if (logoImg) {
    h = logoImg.offsetHeight || logoImg.clientHeight || logoImg.naturalHeight || 0;
  }
  if (!h && logoLink) {
    h = logoLink.offsetHeight || 0;
  }
  if (!h) h = 150; // sensible fallback
  document.documentElement.style.setProperty('--logo-height', `${h}px`);
}

if (header) {
  window.addEventListener('resize', () => {
    updateLogoHeight();
    updateHeaderHeight();
    ensureBodyTopPadding();
  });
  window.addEventListener('load', () => {
    updateLogoHeight();
    updateHeaderHeight();
    ensureBodyTopPadding();
  });
  // initialize immediately
  updateLogoHeight();
  updateHeaderHeight();
  ensureBodyTopPadding();

  // update when logo image finishes loading (helps when images are cached/slow)
  if (logoImg) {
    if (logoImg.complete) {
      updateLogoHeight();
    } else {
      logoImg.addEventListener('load', () => {
        updateLogoHeight();
        updateHeaderHeight();
        ensureBodyTopPadding();
      });
    }
  }
}

// When header becomes fixed, ensure document body has top padding equal to header height
function ensureBodyTopPadding() {
  const h = header ? header.offsetHeight : 0;
  document.body.style.paddingTop = `${h}px`;
}

window.addEventListener('load', ensureBodyTopPadding);
window.addEventListener('resize', ensureBodyTopPadding);

// Smoothly scroll a section so it's centered between the header and bottom of viewport
function scrollSectionIntoViewCentered(el) {
  if (!el) return;
  const headerHeight = header ? header.offsetHeight : parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;
  const viewportHeight = window.innerHeight;
  const availableHeight = Math.max(0, viewportHeight - headerHeight);
  const rect = el.getBoundingClientRect();
  const elHeight = rect.height;
  let targetTop;

  if (elHeight >= availableHeight) {
    // If element is taller than available space, align its top just below header
    targetTop = window.scrollY + rect.top - headerHeight - NAV_CLICK_GAP;
  } else {
    // Center element within remaining viewport below header
    const rawOffset = Math.round((availableHeight - elHeight) / 2);
    const offsetWithin = Math.max(0, rawOffset - NAV_CLICK_GAP);
    targetTop = window.scrollY + rect.top - headerHeight - offsetWithin;
  }

  // Clamp targetTop to document bounds
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
  if (targetTop < 0) targetTop = 0;
  if (targetTop > maxScroll) targetTop = maxScroll;

  window.scrollTo({ top: targetTop, behavior: 'smooth' });

  // Wait for scroll to settle, then move keyboard focus into the section for accessibility
  const start = Date.now();
  const timeout = 1400; // ms
  const thresh = 2; // px

  const checkInterval = 50;
  const intervalId = setInterval(() => {
    const current = window.scrollY || window.pageYOffset;
    if (Math.abs(current - targetTop) <= thresh || Date.now() - start > timeout) {
      clearInterval(intervalId);

      // find first focusable element inside el
      const focusable = el.querySelector('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      let toFocus = focusable || el;

      // If using the container, ensure it can receive focus temporarily
      let addedTabindex = false;
      if (toFocus === el) {
        const prev = el.getAttribute('tabindex');
        if (prev === null) {
          el.setAttribute('tabindex', '-1');
          addedTabindex = true;
        }
      }

      try {
        toFocus.focus({ preventScroll: true });
      } catch (err) {
        // ignore
      }

      // clean up temporary tabindex
      if (addedTabindex) {
        el.removeAttribute('tabindex');
      }
    }
  }, checkInterval);
}

// Intercept internal anchor clicks and apply centered scroll behavior
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (!href || href === '#') return;
    if (!href.startsWith('#')) return;
    const id = href.slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();

    // Close mobile nav if open
    if (mobileNav && mobileNav.classList.contains('active')) {
      mobileNav.classList.remove('active');
      if (hamburger) hamburger.classList.remove('active');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
    }

    scrollSectionIntoViewCentered(target);
    // update URL without jumping
    history.pushState(null, '', href);
  });
});

if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('active');
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('no-scroll', isOpen);
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('active');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
    });
  });

  // Close menu on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
      mobileNav.classList.remove('active');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
    }
  });

  // Close menu when clicking outside the mobile nav content
  document.addEventListener('click', (e) => {
    if (!mobileNav.classList.contains('active')) return;
    const target = e.target;
    if (target === hamburger || hamburger.contains(target)) return;
    if (mobileNav.contains(target)) return;
    mobileNav.classList.remove('active');
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  });
}

if (form) {
  form.addEventListener('submit', function (event) {
    const name = form.querySelector('input[name="name"]').value.trim();
    const email = form.querySelector('input[name="email"]').value.trim();
    const message = form.querySelector('textarea[name="message"]').value.trim();
    const status = form.querySelector('.form-status');

    if (!name || !email || !message) {
      event.preventDefault();
      status.textContent = 'Please fill in all fields before sending.';
      return;
    }

    status.textContent = 'Sending your message...';
  });
}
