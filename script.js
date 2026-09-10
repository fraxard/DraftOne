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

// ==========================================================================
// FULLSCREEN NAVIGATION MENU & ANIMATION CONTROLLER
// ==========================================================================
const menuToggle = document.querySelector('.menu-toggle');
const fullscreenMenu = document.querySelector('.fullscreen-menu');
const body = document.body;

let isMenuOpen = false;
let isMenuAnimating = false;

function openMenu() {
  if (isMenuAnimating || isMenuOpen) return;
  isMenuAnimating = true;
  isMenuOpen = true;

  body.classList.add('menu-open');
  if (menuToggle) {
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close menu');
  }
  if (fullscreenMenu) {
    fullscreenMenu.setAttribute('aria-hidden', 'false');
  }

  if (smoother) {
    smoother.paused(true);
  }

  const menuItems = document.querySelectorAll('.fullscreen-menu li');

  if (prefersReducedMotion || typeof gsap === 'undefined') {
    if (fullscreenMenu) {
      fullscreenMenu.style.visibility = 'visible';
      fullscreenMenu.style.opacity = '1';
      fullscreenMenu.style.pointerEvents = 'auto';
    }
    menuItems.forEach(item => {
      item.style.opacity = '1';
      item.style.transform = 'none';
    });
    isMenuAnimating = false;
    const firstLink = fullscreenMenu ? fullscreenMenu.querySelector('a') : null;
    if (firstLink) firstLink.focus();
    return;
  }

  // Smooth GSAP opening sequence
  gsap.killTweensOf([fullscreenMenu, menuItems]);

  const tl = gsap.timeline({
    onComplete: () => {
      isMenuAnimating = false;
      const firstLink = fullscreenMenu ? fullscreenMenu.querySelector('a') : null;
      if (firstLink) firstLink.focus();
    }
  });

  tl.set(fullscreenMenu, { visibility: 'visible', pointerEvents: 'auto' })
    .fromTo(fullscreenMenu,
      { opacity: 0 },
      { opacity: 1, duration: 0.38, ease: 'power2.out' }
    )
    .fromTo(menuItems,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.36, stagger: 0.05, ease: 'power3.out' },
      '-=0.2'
    );
}

function closeMenu(callback) {
  if (isMenuAnimating && !callback) return;
  if (!isMenuOpen) {
    if (callback) callback();
    return;
  }

  isMenuAnimating = true;
  isMenuOpen = false;

  if (menuToggle) {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
  }
  if (fullscreenMenu) {
    fullscreenMenu.setAttribute('aria-hidden', 'true');
  }

  const menuItems = document.querySelectorAll('.fullscreen-menu li');

  if (prefersReducedMotion || typeof gsap === 'undefined') {
    if (fullscreenMenu) {
      fullscreenMenu.style.visibility = 'hidden';
      fullscreenMenu.style.opacity = '0';
      fullscreenMenu.style.pointerEvents = 'none';
    }
    menuItems.forEach(item => {
      item.style.opacity = '0';
      item.style.transform = 'none';
    });
    body.classList.remove('menu-open');
    if (smoother) {
      smoother.paused(false);
    }
    isMenuAnimating = false;
    if (callback) callback();
    return;
  }

  // Smooth GSAP closing sequence
  gsap.killTweensOf([fullscreenMenu, menuItems]);

  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(fullscreenMenu, { visibility: 'hidden', pointerEvents: 'none' });
      body.classList.remove('menu-open');
      if (smoother) {
        smoother.paused(false);
      }
      isMenuAnimating = false;
      if (callback) callback();
    }
  });

  tl.to(menuItems, {
    opacity: 0,
    y: -14,
    duration: 0.2,
    stagger: 0.03,
    ease: 'power2.in'
  })
  .to(fullscreenMenu, {
    opacity: 0,
    duration: 0.28,
    ease: 'power2.inOut'
  }, '-=0.08');
}

if (menuToggle) {
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });
}

// Close menu with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isMenuOpen) {
    closeMenu();
    if (menuToggle) menuToggle.focus();
  }
});

// Close menu when clicking navigation links (with smooth transition to internal section targets)
document.querySelectorAll('.fullscreen-menu a').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      closeMenu(() => {
        if (target) {
          if (prefersReducedMotion) {
            target.scrollIntoView();
          } else if (smoother) {
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
        }
      });
    } else {
      closeMenu();
    }
  });
});

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

// ==========================================================================
// CONTACT FORM SUBMISSION HANDLER
// ==========================================================================
const contactForm = document.getElementById("contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector("#submitBtn") || form.querySelector("button[type='submit']");
    const buttonText = submitBtn ? submitBtn.querySelector(".button_text") : null;
    const formStatus = document.getElementById("formStatus");

    // Clear previous status
    if (formStatus) {
      formStatus.textContent = "";
      formStatus.className = "form-status";
      formStatus.style.display = "none";
    }

    // Extract inputs
    const nameInput = form.name;
    const emailInput = form.email;
    const messageInput = form.message;
    const websiteInput = form.website; // honeypot

    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const message = messageInput ? messageInput.value.trim() : "";
    const honeypot = websiteInput ? websiteInput.value.trim() : "";

    function showStatus(messageText, isSuccess) {
      if (!formStatus) return;
      formStatus.textContent = messageText;
      formStatus.className = `form-status form-status--${isSuccess ? 'success' : 'error'}`;
      formStatus.style.display = "block";
      if (!isSuccess && formStatus.scrollIntoView) {
        formStatus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // 1. Client-side validation: Name
    if (!name || name.length < 2) {
      showStatus("Please enter your name (at least 2 characters).", false);
      if (nameInput) nameInput.focus();
      return;
    }

    // 2. Client-side validation: Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showStatus("Please enter a valid email address.", false);
      if (emailInput) emailInput.focus();
      return;
    }

    // 3. Client-side validation: Message
    if (!message || message.length < 5) {
      showStatus("Please enter your message (at least 5 characters).", false);
      if (messageInput) messageInput.focus();
      return;
    }

    // Prevent duplicate submissions: disable button & show loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add("is-submitting");
    }
    const originalText = buttonText ? buttonText.textContent : "Submit Now";
    if (buttonText) {
      buttonText.textContent = "Sending...";
    }

    try {
      const response = await fetch('/api/contact', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          message,
          website: honeypot
        })
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result || !result.success) {
        // DO NOT fake success. Display the exact error from server
        const errorMsg = (result && result.error)
          ? result.error
          : `Submission failed (status ${response.status}). Please try again or email admin@draftone.in.`;
        showStatus(errorMsg, false);
      } else {
        // Real success confirmed by server
        showStatus(result.message || "Thank you! Your message has been sent successfully.", true);
        form.reset();
        form.querySelectorAll("input, textarea").forEach(input => {
          input.blur();
        });
      }
    } catch (networkError) {
      console.error("Contact form network error:", networkError);
      showStatus(
        "Unable to reach the server. Please check your connection or email us directly at admin@draftone.in.",
        false
      );
    } finally {
      // Re-enable submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-submitting");
      }
      if (buttonText) {
        buttonText.textContent = originalText;
      }
    }
  });
}

