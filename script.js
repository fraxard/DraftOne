// ==========================================================================
// GSAP & SMOOTH SCROLLING SETUP
// ==========================================================================
let smoother = null;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (typeof gsap !== 'undefined') {
  // Register plugins that are available
  const plugins = [];
  if (typeof ScrollTrigger !== 'undefined') plugins.push(ScrollTrigger);
  if (typeof ScrollSmoother !== 'undefined') plugins.push(ScrollSmoother);
  if (typeof ScrollToPlugin !== 'undefined') plugins.push(ScrollToPlugin);
  if (plugins.length > 0) gsap.registerPlugin(...plugins);

  // Initialize ScrollSmoother only if user has not requested reduced motion
  if (!prefersReducedMotion && typeof ScrollSmoother !== 'undefined' && document.getElementById('smooth-wrapper') && document.getElementById('smooth-content')) {
    try {
      smoother = ScrollSmoother.create({
        wrapper: '#smooth-wrapper',
        content: '#smooth-content',
        smooth: 1, // natural, gentle smooth scroll duration
        effects: false, // preserve all existing CSS and DOM animations
        smoothTouch: 0, // 0 = native touch scrolling on mobile to avoid jitter/lag
        normalizeScroll: false // do NOT hijack trackpad/touch gestures
      });
    } catch (e) {
      console.warn('ScrollSmoother initialization skipped:', e);
    }
  }
}

const menuToggle = document.querySelector('.menu-toggle');
const body = document.body;

if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    const isOpen = body.classList.toggle('menu-open');
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (smoother) {
      smoother.paused(isOpen);
    }
  });

  // Close menu when clicking a link
  document.querySelectorAll('.fullscreen-menu a').forEach(link => {
    link.addEventListener('click', () => {
      body.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      if (smoother) {
        smoother.paused(false);
      }
    });
  });
}

// HOW WE WORK section interactions
const processItems = document.querySelectorAll('.process-item');
const processTitle = document.getElementById('process-title');
const processDescription = document.getElementById('process-description');
const processDetail = document.querySelector('.process-detail');

// make sure initial state is visible
if (processDetail) {
  processDetail.classList.add('visible');
}

processItems.forEach(item => {
  item.addEventListener('mouseenter', () => {
    const title = item.getAttribute('data-title');
    const desc = item.getAttribute('data-description');

    // update active state on list
    processItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    // smooth text change
    processDetail.classList.remove('visible');
    setTimeout(() => {
      processTitle.textContent = title;
      processDescription.textContent = desc;
      processDetail.classList.add('visible');
    }, 150);
  });

  // keyboard focus support
  item.addEventListener('focus', () => {
    item.dispatchEvent(new Event('mouseenter'));
  });
});

// Smooth anchor link scrolling for all internal targets
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (!href || href === '#') return;

    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();

    if (prefersReducedMotion) {
      target.scrollIntoView();
      return;
    }

    if (smoother) {
      smoother.scrollTo(target, true, 'top top');
    } else if (typeof gsap !== 'undefined' && typeof ScrollToPlugin !== 'undefined') {
      gsap.to(window, {
        duration: 1,
        scrollTo: { y: target, autoKill: true },
        ease: 'power2.out'
      });
    } else {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Back to Top smooth scroll with GSAP
const backToTop = document.getElementById('back-to-top');
if (backToTop) {
  backToTop.addEventListener('click', (e) => {
    e.preventDefault();

    if (prefersReducedMotion) {
      window.scrollTo(0, 0);
      return;
    }

    if (smoother) {
      smoother.scrollTo(0, true);
    } else if (typeof gsap !== 'undefined' && typeof ScrollToPlugin !== 'undefined') {
      gsap.to(window, {
        duration: 1.2,
        scrollTo: { y: 0, autoKill: true },
        ease: 'power3.inOut'
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  });
}

// if (contactForm) {
//   contactForm.addEventListener("submit", async (e) => {
//     e.preventDefault();

//     const form = e.target;

//     const data = {
//       name: form.name.value.trim(),
//       email: form.email.value.trim(),
//       message: form.message.value.trim()
//     };

//     try {
//       const response = await fetch(
//         "https://script.google.com/macros/s/AKfycbyDSEcGS6UI7Pc3RsZgCZu6iip-Vikzku_cxooYXW9rzBFudcTvEl9L0Z3jCTjkTH_l/exec",
//         {
//           method: "POST",
//           body: new URLSearchParams(data)
//         }
//       );

//       const text = await response.text();
//       let result;

//       try {
//         result = JSON.parse(text);
//       } catch (parseError) {
//         throw new Error(`Invalid server response: ${text}`);
//       }

//       if (!response.ok) {
//         throw new Error(result.error || `Network error: ${response.status}`);
//       }

//       if (result.success) {
//         alert("Message sent! Thank you for reaching out.");
//         form.reset();
//       } else {
//         throw new Error(result.error || "Failed to send message.");
//       }
//     } catch (error) {
//       alert(`Unable to send message. Please try again later.\n${error.message}`);
//       console.error("Contact form submit error:", error);
//     }
//   });
// }

