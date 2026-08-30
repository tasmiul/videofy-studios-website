/* ==========================================================================
   Videofy Studios - Site scripts (vanilla JavaScript)
   1.  Navigation (scroll state)
   2.  Reveal-on-scroll
   3.  Hero stat counters
   4.  Hero particle canvas
   5.  Hero parallax / tilt
   6.  Portfolio filtering
   7.  Shared video modal
   8.  Contact form validation
   9.  Footer year
   ========================================================================== */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

  /* ------------------------------------------------------------------------
     1. Navigation - add a scrolled style once the page is scrolled
     ------------------------------------------------------------------------ */
  function initNavbar() {
    const header = document.getElementById('siteHeader');
    if (!header) return;

    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 40);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------------
     1b. Mobile menu - close the offcanvas when a navigation link is tapped
     ------------------------------------------------------------------------ */
  function initMobileMenu() {
    const offcanvas = document.getElementById('mobileMenu');
    if (!offcanvas || typeof bootstrap === 'undefined') return;

    offcanvas.addEventListener('click', (event) => {
      const link = event.target.closest('.nav-link, .nav-cta');
      if (!link) return;
      const instance = bootstrap.Offcanvas.getInstance(offcanvas);
      if (instance) instance.hide();
    });
  }

  /* ------------------------------------------------------------------------
     2. Reveal-on-scroll - fade/slide elements into view once
     ------------------------------------------------------------------------ */
  function initReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------------
     3. Hero stat counters - animate numbers when the hero is in view
     ------------------------------------------------------------------------ */
  function initCounters() {
    const counters = document.querySelectorAll('.stat-number');
    const hero = document.getElementById('home');
    if (!counters.length || !hero) return;

    const animate = (el) => {
      const target = parseInt(el.dataset.count, 10) || 0;
      const useLocale = el.dataset.format === 'locale';
      const format = (n) => (useLocale ? n.toLocaleString('en-US') : String(n));

      if (prefersReducedMotion.matches) {
        el.textContent = format(target);
        return;
      }

      const duration = 2000;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = format(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    let started = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !started) {
          started = true;
          counters.forEach(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(hero);
  }

  /* ------------------------------------------------------------------------
     4. Hero particle canvas
     ------------------------------------------------------------------------ */
  function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let particles = [];
    let rafId = null;

    const createParticles = () => {
      const count = Math.min(90, Math.max(30, Math.floor((width * height) / 18000)));
      particles = [];
      for (let i = 0; i < count; i += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 2.2 + 0.6,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5,
          color:
            'rgba(' +
            (155 + Math.floor(Math.random() * 100)) +
            ', ' +
            (155 + Math.floor(Math.random() * 100)) +
            ', ' +
            Math.floor(Math.random() * 255) +
            ', ' +
            (Math.random() * 0.45 + 0.12).toFixed(2) +
            ')',
        });
      }
    };

    const resize = () => {
      const hero = canvas.parentElement;
      width = hero.clientWidth;
      height = hero.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createParticles();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;
        if (p.y > height) p.y = 0;
        if (p.y < 0) p.y = height;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
    };

    const loop = () => {
      draw();
      if (!prefersReducedMotion.matches) {
        rafId = requestAnimationFrame(loop);
      }
    };

    resize();
    loop();
    window.addEventListener('resize', resize);
  }

  /* ------------------------------------------------------------------------
     5. Hero parallax + demo card tilt (fine pointers only)
     ------------------------------------------------------------------------ */
  function initParallax() {
    const hero = document.getElementById('home');
    if (!hero) return;

    const isFinePointer = window.matchMedia(
      '(hover: hover) and (pointer: fine)'
    ).matches;
    if (!isFinePointer || prefersReducedMotion.matches) return;

    const layers = Array.prototype.slice.call(
      hero.querySelectorAll('.parallax')
    );
    const tiltCard = hero.querySelector('.demo-card-wrap');
    let rafId = null;

    const onMouseMove = (event) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const nx = event.clientX / window.innerWidth - 0.5;
        const ny = event.clientY / window.innerHeight - 0.5;

        layers.forEach((layer) => {
          const depth = parseFloat(layer.dataset.depth || '0');
          layer.style.transform =
            'translate3d(' + nx * depth + 'px, ' + ny * depth + 'px, 0)';
        });

        if (tiltCard) {
          tiltCard.style.transform =
            'perspective(1200px) rotateX(' +
            -ny * 7 +
            'deg) rotateY(' +
            nx * 7 +
            'deg)';
        }

        rafId = null;
      });
    };

    hero.addEventListener('mousemove', onMouseMove, { passive: true });
  }

  /* ------------------------------------------------------------------------
     6. Portfolio filtering
     ------------------------------------------------------------------------ */
  function initPortfolioFilter() {
    const buttons = document.querySelectorAll('.filter-btn');
    if (!buttons.length) return;

    const cards = document.querySelectorAll('.portfolio-card');

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        buttons.forEach((btn) => {
          const active = btn === button;
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-pressed', String(active));
        });

        const filter = button.dataset.filter;
        cards.forEach((card) => {
          const show = filter === 'all' || card.dataset.category === filter;
          card.classList.toggle('d-none', !show);
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     7. Shared video modal (YouTube)
     ------------------------------------------------------------------------ */
  function initVideoModal() {
    const modal = document.getElementById('videoModal');
    if (!modal || typeof bootstrap === 'undefined') return;

    const frame = document.getElementById('videoModalFrame');
    const titleEl = document.getElementById('videoModalTitle');
    const catEl = document.getElementById('videoModalCat');

    modal.addEventListener('show.bs.modal', (event) => {
      const trigger = event.relatedTarget;
      if (!trigger) return;

      const videoId = trigger.dataset.videoId;
      const title = trigger.dataset.videoTitle;
      const category = trigger.dataset.videoCategory;

      if (title) titleEl.textContent = title;
      if (category) {
        catEl.textContent = category;
        catEl.style.display = '';
      } else {
        catEl.style.display = 'none';
      }

      if (videoId) {
        frame.src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1';
      }
    });

    modal.addEventListener('hidden.bs.modal', () => {
      frame.src = 'about:blank';
    });
  }

  /* ------------------------------------------------------------------------
     8. Contact form - client-side validation + submission
     ------------------------------------------------------------------------ */
  function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const status = document.getElementById('formStatus');

    const rules = {
      name: {
        test: (value) => value.length >= 2,
        message: 'Please enter your name (at least 2 characters).',
      },
      email: {
        test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: 'Please enter a valid email address.',
      },
      subject: {
        test: (value) => value.length >= 2,
        message: 'Please enter a subject (at least 2 characters).',
      },
      message: {
        test: (value) => value.length >= 10,
        message: 'Please enter a message (at least 10 characters).',
      },
    };

    const setStatus = (type, message) => {
      status.className = 'form-status show ' + type;
      status.textContent = message;
    };

    const setError = (input, message) => {
      input.classList.add('is-invalid');
      const feedback = document.getElementById(input.id + '-feedback');
      if (feedback) feedback.textContent = message;
    };

    const clearError = (input) => {
      input.classList.remove('is-invalid');
    };

    const validateField = (name) => {
      const input = form.elements[name];
      const value = input.value.trim();
      if (!rules[name].test(value)) {
        setError(input, rules[name].message);
        return false;
      }
      clearError(input);
      return true;
    };

    Object.keys(rules).forEach((name) => {
      const input = form.elements[name];
      input.addEventListener('blur', () => {
        if (input.value.trim()) validateField(name);
      });
      input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) validateField(name);
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.className = 'form-status';

      let isValid = true;
      let firstInvalid = null;

      Object.keys(rules).forEach((name) => {
        if (!validateField(name)) {
          if (!firstInvalid) firstInvalid = form.elements[name];
          isValid = false;
        }
      });

      if (!isValid) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const payload = Object.fromEntries(new FormData(form).entries());

      /*
       * Real backend hook: set CONTACT_ENDPOINT to your API URL to send the
       * message server-side (e.g. "/api/contact"). While it stays empty the
       * form gracefully confirms without a network request.
       */
      const CONTACT_ENDPOINT = '';

      try {
        if (CONTACT_ENDPOINT) {
          const response = await fetch(CONTACT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!response.ok) throw new Error('Request failed');
        }
        setStatus(
          'success',
          'Thank you for your message! We will get back to you soon.'
        );
        form.reset();
      } catch (error) {
        setStatus(
          'error',
          'Sorry, there was a problem sending your message. Please try again or email us directly at contact@videofystudios.com.'
        );
      }
    });
  }

  /* ------------------------------------------------------------------------
     9. Footer year
     ------------------------------------------------------------------------ */
  function initFooterYear() {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initMobileMenu();
    initReveal();
    initCounters();
    initHeroCanvas();
    initParallax();
    initPortfolioFilter();
    initVideoModal();
    initContactForm();
    initFooterYear();
  });
})();
