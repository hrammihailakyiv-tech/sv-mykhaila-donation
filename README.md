# Храм святителя Михаїла — сторінка пожертв

Vite + React + TypeScript + Tailwind + Supabase (БД, Auth, Edge Functions).

- `/` — публічна сторінка пожертв (варіанти беруться з бази)
- `/admin` — адмін-панель (вхід через Supabase Auth)

Без налаштованого Supabase сторінка `/` працює в **демо-режимі** з тестовими даними, а оплата не виконується.

## 1. Встановлення і запуск

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint
npm run build
```

## 2. Створення проєкту Supabase

1. Зареєструйтесь на https://supabase.com і створіть проєкт.
2. **Project Settings → API**: скопіюйте `Project URL` і `anon public key`.
3. Скопіюйте `.env.example` у `.env.local` і заповніть:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```
   `service_role` ключ у цей файл **не вставляйте** ніколи.

## 3. Міграції

Встановіть [Supabase CLI](https://supabase.com/docs/guides/cli), потім:

```bash
supabase login
supabase link --project-ref <ваш-project-ref>
supabase db push
```

Буде створено таблиці `donation_options`, `donation_payment_methods`, `donation_audit_log`, `admin_users`, політики RLS та демо-дані (4 варіанти, вигадані реквізити `0000 0000 0000 0000`).
Якщо не хочете CLI — виконайте файли з `supabase/migrations/` по черзі в **SQL Editor**.

## 4. Supabase Auth і перший адміністратор

1. **Authentication → Providers**: увімкніть Email. Реєстрацію для всіх краще вимкнути (**Sign In / Providers → Allow new users to sign up = off**) після створення адміністратора.
2. **Authentication → Users → Add user**: створіть користувача з поштою та паролем (Auto Confirm).
3. У **SQL Editor** зробіть його адміном:
   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'admin@example.com';
   ```
4. Відкрийте `/admin` і увійдіть. Користувач без запису в `admin_users` доступу не має (RLS).

## 5. Edge Function і платіжний провайдер

```bash
supabase functions deploy create-payment
```

Секрети (лише на сервері):

```bash
supabase secrets set SITE_URL=https://ваш-домен
supabase secrets set PAYMENT_HOST_ALLOWLIST=www.liqpay.ua,liqpay.ua
# коли з'являться дані мерчанта LiqPay / ПриватБанк:
supabase secrets set LIQPAY_PUBLIC_KEY=... LIQPAY_PRIVATE_KEY=...
```

| Secret | Призначення |
|---|---|
| `LIQPAY_PUBLIC_KEY`, `LIQPAY_PRIVATE_KEY` | Ключі мерчанта. Без них онлайн-оплата працює в демо-режимі |
| `SITE_URL` | Адреса сайту: CORS і `result_url` |
| `PAYMENT_HOST_ALLOWLIST` | Дозволені домени для `payment_url` |
| `ALLOW_STATIC_PAYMENT_URL` | `true` — без ключів редіректити на збережене `payment_url` (**сума не передається**) |

`SUPABASE_URL` і `SUPABASE_SERVICE_ROLE_KEY` Supabase додає до функції автоматично.

Локально: `supabase functions serve create-payment --env-file supabase/functions/.env` (файл у `.gitignore`).

## 6. Як працює оплата

1. Сайт надсилає лише `donation_option_id`, `amount`, `payment_method` у функцію `create-payment`.
2. Функція перевіряє UUID, що варіант і спосіб активні, суму (число, 10–100 000 ₴) і сама бере налаштування з бази.
3. `card` — повертає реквізити **отримувача** (карту користувача сайт не збирає).
4. `online` — формує підписаний запит LiqPay (`data` + `signature`), браузер відправляє POST на `https://www.liqpay.ua/api/3/checkout`. Довільні URL із браузера не приймаються, відкритих redirect немає.

Поки що **не реалізовано**: webhook підтвердження оплати (`server_url`) і таблиця платежів — це наступний етап.

## 7. Перевірка потоку

1. Відкрийте `/` — мають з'явитися варіанти з бази; за замовчуванням вибрано «Оплата за посиланням» і 300 ₴.
2. Оберіть «Переказ на картку» — з'являться реквізити та кнопка «Скопіювати номер».
3. Натисніть «ПОЖЕРТВУВАТИ →». Без ключів LiqPay буде повідомлення про демо-режим.
4. У `/admin` змініть назву/порядок/активність — оновіть `/` і перевірте зміни. Історію змін видно внизу адмін-панелі (`donation_audit_log`).

## Безпека

- RLS: анонімний користувач читає лише активні варіанти/способи; `payment_url` йому недоступний (права на рівні колонок).
- Запис — лише для користувачів із `admin_users`.
- `.env*` у `.gitignore`; у git потрапляє тільки `.env.example`.
