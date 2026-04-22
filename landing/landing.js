/* =========================================================
   AirPool Landing — landing.js
   Handles: sticky nav, smooth scroll, reveal animations,
   stats counter, FAQ accordion (one open at a time).
   ========================================================= */

(function () {
  'use strict';

  // ---------- Sticky nav background on scroll ----------
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 100) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Smooth scroll for anchor links ----------
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const offset = 72; // account for fixed nav
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ---------- Reveal on scroll (IntersectionObserver) ----------
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            // small stagger within the same "batch"
            const delay = Math.min(i * 60, 240);
            setTimeout(() => entry.target.classList.add('in'), delay);
            revealObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => revealObs.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // ---------- Animated stats counter ----------
  const counters = document.querySelectorAll('.counter');
  const formatNum = (n) => {
    // add thousand separators for values >= 1000
    return n >= 1000 ? n.toLocaleString('ko-KR') : String(n);
  };
  const animateCounter = (el) => {
    const target = parseInt(el.dataset.target, 10) || 0;
    const duration = 1500;
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      el.textContent = formatNum(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = formatNum(target);
      }
    };
    requestAnimationFrame(step);
  };

  if ('IntersectionObserver' in window) {
    const counterObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((el) => counterObs.observe(el));
  } else {
    counters.forEach((el) => animateCounter(el));
  }

  // ---------- FAQ: one open at a time ----------
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const summary = item.querySelector('summary');
    if (!summary) return;
    summary.addEventListener('click', (e) => {
      // If this one is already open, allow the browser default to close it.
      // If it's closed, close all others first.
      if (!item.open) {
        faqItems.forEach((other) => {
          if (other !== item) other.removeAttribute('open');
        });
      }
    });
  });

  // ---------- Subtle parallax on hero phone ----------
  const phone = document.querySelector('.phone');
  if (phone && window.matchMedia('(min-width: 1024px)').matches) {
    const heroEl = document.querySelector('.hero');
    if (heroEl) {
      heroEl.addEventListener('mousemove', (e) => {
        const rect = heroEl.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const dx = (e.clientX - rect.left - cx) / cx;
        const dy = (e.clientY - rect.top - cy) / cy;
        phone.style.transform =
          `perspective(1200px) rotateY(${-8 + dx * 4}deg) rotateX(${3 - dy * 3}deg) translateY(${dy * -6}px)`;
      });
      heroEl.addEventListener('mouseleave', () => {
        phone.style.transform = '';
      });
    }
  }
})();
