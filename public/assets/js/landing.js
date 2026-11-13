/* NovaSport — landing page interactions */
import { enhanceIcons } from "/assets/js/icons.js";

(function () {
  "use strict";

  // Swap emoji icon tiles for animated SVG icons
  enhanceIcons(document);

  // Sticky nav background on scroll
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 30);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile menu
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  toggle?.addEventListener("click", () => nav.classList.toggle("open"));
  links?.addEventListener("click", (e) => {
    if (e.target.tagName === "A") nav.classList.remove("open");
  });

  // Reveal-on-scroll
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (i % 6) * 60 + "ms";
    io.observe(el);
  });

  // Smooth anchor offset for fixed nav
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });
})();
