// live.js — Модуль управления прямым эфиром SENSEI CNC
// Зависимости: window.supabaseClient (из auth.js), window.JitsiMeetExternalAPI (CDN meet.jit.si)

const JAAS_APP_ID  = 'vpaas-magic-cookie-ca80f03cabc14177ba79e6a00bfccd93';
const JITSI_ROOM   = `${JAAS_APP_ID}/Sensei_CNC_Masterclass_2026`; // формат JaaS
const JITSI_HOST   = '8x8.vc';
const STREAM_TABLE = 'stream_status';
const STREAM_ROW_ID = 1;

let jitsiApi = null;        // экземпляр Jitsi
let realtimeChannel = null; // канал Supabase Realtime
let isLiveNow = false;      // текущее состояние трансляции

// ── ИНИЦИАЛИЗАЦИЯ ────────────────────────────────────────────────────────────
/**
 * Точка входа. Вызывается из dashboard.html после проверки сессии.
 * @param {object} supabase  - window.supabaseClient
 * @param {object} profile   - { display_name, is_admin }
 */
async function initLiveSection(supabase, profile) {
    console.log('[Live] Инициализация секции прямого эфира...');
    console.log('[Live] is_admin =', profile?.is_admin, '| display_name =', profile?.display_name);

    // Показываем кнопку администратора только для is_admin = true
    const adminPanel = document.getElementById('admin-live-panel');
    if (profile?.is_admin === true) {
        if (adminPanel) {
            adminPanel.style.display = 'flex';
            console.log('[Live] ✅ Панель администратора показана');
        } else {
            console.warn('[Live] ❌ Элемент #admin-live-panel не найден в DOM');
        }
    } else {
        console.log('[Live] Пользователь не администратор (is_admin =', profile?.is_admin, ')');
    }

    // Подписываем кнопку переключения
    const toggleBtn = document.getElementById('btn-live-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => toggleLive(supabase));
        console.log('[Live] Кнопка переключения трансляции привязана');
    }

    // Запрашиваем текущее состояние из БД
    await fetchCurrentStatus(supabase, profile);

    // Включаем Realtime-слушатель
    subscribeToLiveStatus(supabase, profile);
}

// ── ЗАПРОС ТЕКУЩЕГО СОСТОЯНИЯ ─────────────────────────────────────────────────
async function fetchCurrentStatus(supabase, profile) {
    try {
        const { data, error } = await supabase
            .from(STREAM_TABLE)
            .select('is_live')
            .eq('id', STREAM_ROW_ID)
            .single();

        if (error) {
            console.warn('[Live] Таблица stream_status не найдена или ошибка:', error.message);
            showStandby();
            return;
        }

        isLiveNow = data.is_live;
        updateUI(data.is_live, profile);
    } catch (err) {
        console.error('[Live] Ошибка запроса статуса:', err);
        showStandby();
    }
}

// ── REALTIME-ПОДПИСКА ──────────────────────────────────────────────────────────
function subscribeToLiveStatus(supabase, profile) {
    // Отписываемся от старого канала, если был
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);

    realtimeChannel = supabase
        .channel('stream-status-channel')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: STREAM_TABLE,
                filter: `id=eq.${STREAM_ROW_ID}`,
            },
            (payload) => {
                console.log('[Live] Realtime: статус изменён →', payload.new);
                isLiveNow = payload.new.is_live;
                updateUI(payload.new.is_live, profile);
            }
        )
        .subscribe((status) => {
            console.log('[Live] Канал Realtime:', status);
        });
}

// ── ПЕРЕКЛЮЧАТЕЛЬ (КРАСНАЯ КНОПКА) ───────────────────────────────────────────
async function toggleLive(supabase) {
    const newState = !isLiveNow;
    const btn = document.getElementById('btn-live-toggle');
    if (btn) btn.disabled = true;

    try {
        const { error } = await supabase
            .from(STREAM_TABLE)
            .update({ is_live: newState })
            .eq('id', STREAM_ROW_ID);

        if (error) {
            console.error('[Live] Ошибка обновления статуса:', error.message);
            alert('Ошибка: ' + error.message);
        } else {
            console.log('[Live] Статус обновлён на', newState);
            // UI обновится через Realtime автоматически
        }
    } catch (err) {
        console.error('[Live] Ошибка запроса:', err);
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ── УПРАВЛЕНИЕ UI ─────────────────────────────────────────────────────────────
function updateUI(isLive, profile) {
    updateAdminButton(isLive);

    if (isLive) {
        // Активная трансляция → запускаем Jitsi
        showLiveBadge(true);
        const userName = profile?.display_name || profile?.email || 'Ученик';
        showJitsi(userName);
    } else {
        // Трансляция остановлена → заглушка
        showLiveBadge(false);
        hideJitsi();
        showStandby();
    }
}

function updateAdminButton(isLive) {
    const btn = document.getElementById('btn-live-toggle');
    if (!btn) return;
    if (isLive) {
        btn.textContent = '⏹ Завершить трансляцию';
        btn.classList.add('is-live');
    } else {
        btn.textContent = '🔴 Начать трансляцию';
        btn.classList.remove('is-live');
    }
}

function showLiveBadge(show) {
    const badge = document.getElementById('live-badge');
    if (badge) badge.style.display = show ? 'flex' : 'none';

    const standbyStatus = document.getElementById('monitor-status-text');
    if (standbyStatus) {
        standbyStatus.textContent = show ? 'В ЭФИРЕ' : 'ОЖИДАНИЕ';
        standbyStatus.style.color   = show ? '#ff4040' : '#888';
    }

    // Обновляем сигнальный индикатор TV-экрана
    const signalDot = document.getElementById('tv-signal-dot');
    if (signalDot) {
        if (show) {
            signalDot.classList.add('is-live');
        } else {
            signalDot.classList.remove('is-live');
        }
    }

    console.log('[Live] Статус трансляции:', show ? '🔴 В ЭФИРЕ' : '⏸ ОЖИДАНИЕ');
}

// ── JITSI ────────────────────────────────────────────────────────────────────
function showJitsi(userName) {
    const stanby = document.getElementById('tv-standby');
    const jitsiEl = document.getElementById('jitsi-container');

    if (!jitsiEl) return;

    // Скрываем заглушку
    if (stanby) stanby.style.display = 'none';
    jitsiEl.style.display = 'block';

    // Уничтожаем предыдущий экземпляр
    if (jitsiApi) {
        try { jitsiApi.dispose(); } catch(_) {}
        jitsiApi = null;
    }

    if (typeof JitsiMeetExternalAPI === 'undefined') {
        console.error('[Live] JitsiMeetExternalAPI не загружен!');
        showStandby();
        return;
    }

    jitsiApi = new JitsiMeetExternalAPI(JITSI_HOST, {
        roomName: JITSI_ROOM,
        width: '100%',
        height: '100%',
        parentNode: jitsiEl,
        configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            // Первый вошедший в комнату автоматически становится модератором (JaaS)
        },
        interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            DEFAULT_BACKGROUND: '#0d0d0d',
            TOOLBAR_BUTTONS: ['microphone', 'camera', 'desktop', 'chat', 'tileview', 'hangup'],
        },
        userInfo: {
            displayName: userName,
        },
    });

    jitsiApi.on('errorOccurred', (err) => {
        console.error('[Live] Ошибка Jitsi:', err);
    });

    console.log('[Live] Jitsi инициализирован для:', userName);
}

function hideJitsi() {
    const jitsiEl = document.getElementById('jitsi-container');
    if (jitsiEl) jitsiEl.style.display = 'none';

    if (jitsiApi) {
        try { jitsiApi.dispose(); } catch(_) {}
        jitsiApi = null;
        console.log('[Live] Jitsi уничтожен.');
    }
}

function showStandby() {
    const standby = document.getElementById('tv-standby');
    if (standby) standby.style.display = 'flex';

    const jitsiEl = document.getElementById('jitsi-container');
    if (jitsiEl) jitsiEl.style.display = 'none';
}

// ── ЭКСПОРТ ──────────────────────────────────────────────────────────────────
window.liveModule = { initLiveSection };
