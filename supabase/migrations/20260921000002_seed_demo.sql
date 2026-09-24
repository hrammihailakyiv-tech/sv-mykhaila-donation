-- Демонстраційні дані. Реквізити ВИГАДАНІ — замініть в адмін-панелі.
with o as (
  insert into public.donation_options (title, description, icon, sort_order) values
    ('На потреби храму', 'На утримання та розвиток храму', 'church', 1),
    ('На благодійні обіди', 'Щоб ми могли годувати людей, які потребують допомоги', 'bowl', 2),
    ('На допомогу нужденним', 'Продукти, необхідні речі, підтримка', 'people', 3),
    ('На свічки і молитви', 'На богослужіння, свічки та духовні потреби', 'candle', 4)
  returning id, title
)
insert into public.donation_payment_methods
  (donation_option_id, method, payment_url, card_number, recipient_name, payment_description)
select o.id, m.method,
  case when m.method = 'online' then 'https://www.liqpay.ua/' end,
  case when m.method = 'card' then '0000 0000 0000 0000' end,
  case when m.method = 'card' then 'Храм святителя Михаїла' end,
  case when m.method = 'card' then 'Пожертва: ' || o.title end
from o cross join (values ('online'), ('card')) as m(method);
