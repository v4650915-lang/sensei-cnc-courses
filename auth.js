// auth.js — Supabase Auth + Vanish Input

console.log('[Auth] НАЧАЛО ЗАГРУЗКИ ФАЙЛА auth.js');

// ── ИНИЦИАЛИЗАЦИЯ SUPABASE ─────────────────────────────────────────────────
;(function initSupabase() {
    try {
        const SUPABASE_URL = 'https://vvrtzaduazxoualvtayy.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_NXcx4-Xg3q67UTU0eSX8kA_wwgzPULz';
        if (window.supabase && window.supabase.createClient) {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log('[Auth] Supabase клиент создан.');
        } else {
            // Ждём загрузки CDN-скрипта
            window.addEventListener('load', () => {
                if (window.supabase && window.supabase.createClient) {
                    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                    console.log('[Auth] Supabase клиент создан (отложенно).');
                } else {
                    console.error('[Auth] Supabase SDK не загружен!');
                }
            });
        }
    } catch (e) {
        console.error('[Auth] Ошибка инициализации Supabase:', e);
    }
})();

function initAuthModal() {
    const modal = document.getElementById('authModal');
    if (!modal) {
        console.warn('[Auth] Модальное окно не найдено в HTML');
        return;
    }

    const closeBtn = document.getElementById('authModalClose');
    const form = document.getElementById('authForm');
    const submitBtn = document.getElementById('authSubmitBtn');
    const successEl = document.getElementById('authSuccess');

    // Элементы Vanish Input
    const input = document.getElementById('authEmail');
    const canvas = document.getElementById('vanishCanvas');
    const placeholderEl = document.getElementById('vanishPlaceholder');
    let ctx = null;
    if (canvas) {
        ctx = canvas.getContext('2d', { willReadFrequently: true });
    }

    // --- ЛОГИКА АНИМАЦИИ ПЛЕЙСХОЛДЕРА ---
    const placeholders = [
        "ваша@почта.ru",
        "cnc@master.pro",
        "ivan@yandex.ru",
        "student@takumi.site"
    ];
    let currentPlaceholder = 0;
    let currentChar = 0;
    let isTyping = true;
    let placeholderTimer;
    let isAnimating = false;

    function typePlaceholder() {
        if (!placeholderEl || isAnimating) return;

        // Если инпут не пустой, плейсхолдер скрыт, ставим на паузу
        if (input && input.value.trim().length > 0) {
            placeholderTimer = setTimeout(typePlaceholder, 500);
            return;
        }

        const text = placeholders[currentPlaceholder];

        if (isTyping) {
            placeholderEl.innerText = text.substring(0, currentChar + 1);
            currentChar++;
            if (currentChar > text.length) {
                isTyping = false;
                placeholderTimer = setTimeout(typePlaceholder, 2000); // Пауза после полного слова
            } else {
                placeholderTimer = setTimeout(typePlaceholder, 40 + Math.random() * 40); // Скорость печати
            }
        } else {
            placeholderEl.innerText = text.substring(0, currentChar - 1);
            currentChar--;
            if (currentChar <= 0) {
                isTyping = true;
                currentPlaceholder = (currentPlaceholder + 1) % placeholders.length;
                placeholderTimer = setTimeout(typePlaceholder, 500); // Пауза перед новым словом
            } else {
                placeholderTimer = setTimeout(typePlaceholder, 20); // Стирание
            }
        }
    }

    // Запускаем печать
    typePlaceholder();

    // Слушатель ввода для скрытия плейсхолдера и разблокировки кнопки
    if (input) {
        input.addEventListener('input', () => {
            if (input.value.length > 0) {
                if (placeholderEl) placeholderEl.style.opacity = '0';
                if (submitBtn) submitBtn.disabled = !input.value.includes('@');
            } else {
                if (placeholderEl) placeholderEl.style.opacity = '1';
                if (submitBtn) submitBtn.disabled = true;
            }
        });
    }

    // --- ЛОГИКА VANISH (РАСПАД ТЕКСТА НА ЧАСТИЦЫ) ---
    let particles = [];
    let animationFrame;

    function drawTextOnCanvas() {
        if (!input || !canvas || !ctx) return;
        const computedStyle = window.getComputedStyle(input);

        // Получаем размеры инпута
        const rect = input.getBoundingClientRect();

        // Учет Retina-экранов для высокой четкости частиц
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // Скейлим контекст, чтобы рисовать в обычных CSS-пикселях
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Точное копирование стилей
        ctx.font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;
        ctx.fillStyle = computedStyle.color || '#ffffff';
        ctx.textBaseline = 'middle';

        // Отступ слева должен полностью совпадать с инпутом
        const paddingLeft = parseFloat(computedStyle.paddingLeft);

        // Рисуем текст в центре по вертикали
        ctx.fillText(input.value, paddingLeft, rect.height / 2 + 1);

        return { width: rect.width, height: rect.height, dpr };
    }

    function createParticles() {
        if (!canvas || !ctx) return;

        const metrics = drawTextOnCanvas();
        if (!metrics) return;

        // Забираем сырые пиксели с холста (в реальном Retina-разрешении)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        particles = [];

        // Размер захватываемого блока. Чем меньше, тем больше частиц.
        const step = 2 * metrics.dpr;

        for (let y = 0; y < canvas.height; y += step) {
            for (let x = 0; x < canvas.width; x += step) {
                const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
                const alpha = data[index + 3];

                if (alpha > 50) { // Берём только видимые пиксели
                    // Переводим координаты обратно в CSS-пространство
                    const cssX = x / metrics.dpr;
                    const cssY = y / metrics.dpr;

                    // Логика направления разлета
                    // Имитируем эффект "растяжения" — частицы отталкиваются от центра
                    const centerX = metrics.width / 2;
                    const centerY = metrics.height / 2;
                    let dx = cssX - centerX;
                    let dy = cssY - centerY;

                    // Нормализация вектора
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const dirX = dx / dist;
                    const dirY = dy / dist;

                    particles.push({
                        initialX: cssX,
                        initialY: cssY,
                        x: cssX,
                        y: cssY,
                        color: `rgba(${data[index]}, ${data[index + 1]}, ${data[index + 2]}, ${alpha / 255})`,
                        // Скорость = Направление от центра * Сила + Небольшой случайный шум
                        vx: dirX * (Math.random() * 3 + 1) + (Math.random() - 0.5) * 2,
                        // По Y делаем разлет чуть сильнее вверх (как дым)
                        vy: dirY * (Math.random() * 2 + 0.5) + (Math.random() - 0.8) * 3,
                        life: 1,
                        // Затухание. Зависит от дистанции до центра: края затухают быстрее
                        decay: Math.random() * 0.015 + 0.01,
                        // Размер от 0.5 до 1.5 пикселя
                        size: Math.random() * 1.5 + 0.5
                    });
                }
            }
        }
    }

    function animateParticles() {
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        // Очищаем в CSS-пикселях, так как ранее мы сделали ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, rect.width, rect.height);

        let active = false;

        particles.forEach(p => {
            if (p.life > 0) {
                active = true;

                // Перемещение
                p.x += p.vx;
                p.y += p.vy;

                // Трение (сопротивление воздуха)
                p.vx *= 0.93;
                p.vy *= 0.93;
                // Легкая гравитация (почти нет, чтобы частицы парили)
                p.vy -= 0.02; // Частицы медленно поднимаются вверх

                // Уменьшение жизни
                p.life -= p.decay;

                // Отрисовка круглой частицы (Framer Motion стиль)
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;

                // Плавное квадратичное затухание прозрачности для "дымности"
                ctx.globalAlpha = Math.max(0, p.life * p.life);
                ctx.fill();
            }
        });

        ctx.globalAlpha = 1;

        if (active) {
            animationFrame = requestAnimationFrame(animateParticles);
        } else {
            finishSubmit();
        }
    }

    function vanishAndSubmit() {
        if (isAnimating) return;
        isAnimating = true;

        // Скрываем плейсхолдер
        if (placeholderEl) placeholderEl.style.display = 'none';

        // 1. Сначала создаём частицы — рисуем текст на Canvas (пока он ещё видим в input)
        createParticles();

        // 2. МГНОВЕННО скрываем текст в инпуте (убираем transition, чтобы не было плавности)
        if (input) {
            input.style.transition = 'none'; // Отключаем любые CSS-переходы у цвета
            input.style.color = 'transparent';
            input.style.caretColor = 'transparent'; // Прячем и курсор
            input.disabled = true;
        }
        if (submitBtn) {
            submitBtn.style.opacity = '0';
        }

        // 3. Запускаем анимацию Canvas — на следующем кадре браузера, чтобы
        //    гарантированно сначала применилось скрытие текста (шаг 2)
        requestAnimationFrame(() => {
            animateParticles();
        });
    }

    const finishSubmit = () => {
        if (form && successEl) {
            form.style.display = 'none';
            successEl.hidden = false;
        }
    };

    // --- ЛОГИКА ОТКРЫТИЯ / ЗАКРЫТИЯ МОДАЛА ---
    const resetForm = () => {
        isAnimating = false;
        if (form && successEl) {
            form.style.display = 'flex';
            successEl.hidden = true;
        }
        if (input) {
            input.value = '';
            input.style.color = '';
            input.disabled = false;
        }
        if (placeholderEl) {
            placeholderEl.style.display = 'flex';
            placeholderEl.style.opacity = '1';
            placeholderEl.innerText = '';
        }
        if (submitBtn) {
            submitBtn.style.opacity = '1';
            submitBtn.disabled = true;
        }
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    const openModal = () => {
        resetForm();
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(() => { input?.focus(); }, 100);
    };

    const closeModal = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    };

    document.addEventListener('click', (e) => {
        const loginBtn = e.target.closest('#loginBtn');
        if (loginBtn || (e.target.tagName === 'A' && e.target.textContent.trim() === 'Войти')) {
            e.preventDefault();
            e.stopPropagation();
            openModal();
        }
    });

    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!input || isAnimating) return;
        const email = input.value.trim();

        if (!email || !email.includes('@')) {
            input.focus();
            return;
        }

        console.log(`[Auth] Отправляем Magic Link на: ${email}`);

        // Запускаем эффект распада немедленно (UX: не ждём ответа сервера)
        vanishAndSubmit();

        // Параллельно — реальный вызов Supabase
        if (window.supabaseClient) {
            try {
                const { error } = await window.supabaseClient.auth.signInWithOtp({
                    email,
                    options: {
                        emailRedirectTo: window.location.origin + '/dashboard.html',
                    }
                });
                if (error) {
                    console.error('[Auth] Ошибка Magic Link:', error.message);
                } else {
                    console.log('[Auth] Magic Link отправлен успешно.');
                }
            } catch (err) {
                console.error('[Auth] Ошибка запроса:', err);
            }
        } else {
            console.warn('[Auth] supabaseClient не готов — режим демо.');
        }
    });
}

function setupAuth() {
    console.log('[Auth] Инициализация модала с Vanish Input...');
    initAuthModal();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAuth);
} else {
    setupAuth();
}
