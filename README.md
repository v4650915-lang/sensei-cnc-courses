# 匠 SENSEI CNC

> **Мастерство не сертифицируется. Оно передаётся.**

Авторский онлайн-курс по программированию станков с ЧПУ Fanuc.

## Стек

- **HTML/CSS/JS** — без фреймворков
- **GSAP 3.12** + **ScrollTrigger** — анимации
- **Lenis** — плавный скролл
- **Supabase** — авторизация (Magic Link) + Realtime
- **JaaS 8x8** (Jitsi) — Live-трансляции

## Структура

```
📁 sensei-cnc-courses/
├── index.html          # Главная страница
├── about.html          # Об авторе
├── program.html        # Программа курса
├── schedule.html       # Расписание
├── contacts.html       # Контакты
├── dashboard.html      # Личный кабинет (Supabase Auth)
├── login.html          # Страница входа
├── auth.js             # Авторизация + Vanish-анимация
├── live.js             # Live-трансляция (Jitsi + Realtime)
├── main.js             # GSAP анимации
├── style.css           # Все стили
└── img/                # Изображения
```

## Supabase

Таблицы:
- `profiles` — `id`, `display_name`, `has_access`, `is_admin`
- `stream_status` — `id`, `is_live`

## Контакты автора

- Telegram: https://t.me/+Jj6Uy-wDMfk1NGIy
- VK: https://vk.com/club228382060
- YouTube: https://www.youtube.com/@Vladimir.rabota.vahta-cnc
