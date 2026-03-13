// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Initialize Lenis for smooth scrolling
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

// Integrate Lenis with GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

// --- Animations ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Video Zoom Effect on Scroll
    const heroVideo = document.getElementById('heroVideo');
    if (heroVideo) {
        gsap.to(heroVideo, {
            scale: 1.3, // Zoom in
            opacity: 0.8, // Slightly increase opacity
            ease: "none",
            scrollTrigger: {
                trigger: ".hero",
                start: "top top",
                end: "bottom top",
                scrub: 1.5, // Smooth scrubbing
            }
        });

        // Parallax for heroism text
        gsap.to(".hero-content", {
            y: 150,
            opacity: 0,
            ease: "none",
            scrollTrigger: {
                trigger: ".hero",
                start: "top top",
                end: "bottom top",
                scrub: 1,
            }
        });
    }

    // Fade in sections
    const sections = gsap.utils.toArray('.section');
    sections.forEach(section => {
        gsap.fromTo(section,
            { y: 50, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 1,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: section,
                    start: "top 80%",
                    toggleActions: "play none none reset",
                    invalidateOnRefresh: true,
                }
            }
        );
    });

    // Fade in feature cards sequentially
    const cards = gsap.utils.toArray('.feature-card');
    if (cards.length > 0) {
        gsap.fromTo(cards,
            { y: 30, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.15,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: ".features-grid",
                    start: "top 85%",
                    toggleActions: "play none none reset",
                    invalidateOnRefresh: true,
                }
            }
        );
    }

    // ── HISTORY SECTION ANIMATION ──────────────────────────────────────
    // Пин + многофазная анимация: Zoom видео → возврат → цитата → фото
    const historySection = document.querySelector('.history-section');
    if (historySection) {
        const videoWrap  = historySection.querySelector('.hs-video-wrap');
        const quoteWrap  = historySection.querySelector('.hs-quote-wrap');
        const photoWrap  = historySection.querySelector('.hs-photo-wrap');

        // Timeline, которую будет «крутить» скролл
        const hsTl = gsap.timeline({
            scrollTrigger: {
                trigger: historySection,
                start: 'top top',
                // 4 * 100vh — каждый этап занимает ~1 экран скролла
                end: '+=400%',
                pin: true,
                scrub: 1.2,
                anticipatePin: 1,
            }
        });

        // Фаза 1 (0% → 25%): видео зумится к центру
        // ВАЖНО: getBoundingClientRect() при загрузке даёт позицию вне viewport
        // Используем offsetWidth + CSS-значения позиции внутри секции
        // При пине секция стоит на top:0 viewport, поэтому CSS-coords = viewport-coords
        const hsZoomX = (() => {
            const vw        = window.innerWidth;
            const videoLeft = vw * 0.05;                     // CSS: left: 5%
            const videoW    = videoWrap.offsetWidth;          // реальная ширина в px
            const scaledHalfW = (videoW * 1.65) / 2;
            return (vw / 2) - scaledHalfW - videoLeft;
        })();
        const hsZoomY = (() => {
            const vh        = window.innerHeight;
            const videoTop  = 80 + 40;                        // CSS: top: calc(80px + 40px)
            const videoH    = videoWrap.offsetHeight;         // реальная высота в px
            const scaledHalfH = (videoH * 1.65) / 2;
            return (vh / 2) - scaledHalfH - videoTop;
        })();

        hsTl.to(videoWrap, {
            scale: 1.65,
            x: hsZoomX,
            y: hsZoomY,
            transformOrigin: 'top left',
            ease: 'power2.inOut',
            duration: 1,
        }, 0);

        // Фаза 2 (25% → 50%): видео возвращается в угол
        hsTl.to(videoWrap, {
            scale: 1,
            x: 0,
            y: 0,
            ease: 'power2.inOut',
            duration: 1,
        }, 1);

        // Фаза 3 (50% → 75%): появляется цитата снизу + typewriter-эффект
        hsTl.fromTo(quoteWrap,
            { opacity: 0, y: 40 },
            {
                opacity: 1,
                y: 0,
                ease: 'power3.out',
                duration: 1,
                onStart: () => {
                    // Запускаем typewriter-анимацию через CSS-класс
                    quoteWrap.classList.add('hs-typing-active');
                },
                onReverseComplete: () => {
                    // Сбрасываем при прокрутке назад
                    quoteWrap.classList.remove('hs-typing-active');
                },
            },
        2);

        // Фаза 4 (75% → 100%): появляется фото
        hsTl.fromTo(photoWrap,
            { opacity: 0, x: 30 },
            { opacity: 1, x: 0, ease: 'power3.out', duration: 1 },
        3);
    }
    // ── КОНЕЦ HISTORY ANIMATION ────────────────────────────────────────
});

// --- Theme Toggle ---
const themeToggleBtn = document.getElementById('themeToggle');
const htmlEl = document.documentElement;
const toggleIcon = themeToggleBtn.querySelector('.toggle-icon');

// Check local storage or system preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    htmlEl.setAttribute('data-theme', savedTheme);
    updateToggleIcon(savedTheme);
}

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = htmlEl.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    htmlEl.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateToggleIcon(newTheme);
});

function updateToggleIcon(theme) {
    if (theme === 'dark') {
        toggleIcon.textContent = '☀'; // Show sun to signify switching to light
    } else {
        toggleIcon.textContent = '☾'; // Show moon to signify switching to dark
    }
}

// --- Sakura Petals Animation ---
window.addEventListener('load', function initSakura() {
    const canvas = document.getElementById('sakura-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let petals = [];

    function resize() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function drawPetal(x, y, r, angle, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.8, r * 1.0, 0, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
        grad.addColorStop(0, 'rgba(255, 200, 210, 0.95)');
        grad.addColorStop(0.5, 'rgba(255, 170, 190, 0.7)');
        grad.addColorStop(1, 'rgba(255, 150, 175, 0)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
    }

    function createPetal() {
        return {
            x: Math.random() * canvas.width,
            y: -20,
            r: 4 + Math.random() * 6,
            speed: 0.5 + Math.random() * 1.2,
            drift: (Math.random() - 0.5) * 0.6,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.04,
            alpha: 0.6 + Math.random() * 0.4,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: 0.01 + Math.random() * 0.02,
        };
    }

    for (let i = 0; i < 40; i++) {
        const p = createPetal();
        p.y = Math.random() * canvas.height;
        petals.push(p);
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (petals.length < 60 && Math.random() < 0.04) {
            petals.push(createPetal());
        }

        for (let i = petals.length - 1; i >= 0; i--) {
            const p = petals[i];
            p.sway += p.swaySpeed;
            p.x += p.drift + Math.sin(p.sway) * 0.5;
            p.y += p.speed;
            p.angle += p.spin;
            drawPetal(p.x, p.y, p.r, p.angle, p.alpha);
            if (p.y > canvas.height + 30) petals.splice(i, 1);
        }

        requestAnimationFrame(animate);
    }

    animate();
});
