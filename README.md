# ربات تلگرامی مدیریت کلودفلر (Cloudflare Telegram Bot)
  <div align="center">
  <img src="Logo.jpg" alt="Docker Logo" width="50%">
</div>

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/deploy?repo=https://github.com/RamakMKH/cloudflare-telegram-bot)
[![Cloudflare Worker](https://img.shields.io/badge/Cloudflare-Worker-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ESModules-F7DF1E?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

یک ربات تلگرام که با استفاده از Cloudflare Workers ساخته شده و به شما امکان می‌دهد دامنه‌های خود در کلودفلر را مستقیماً از طریق تلگرام با استفاده از یک رابط کاربری دکمه‌ای مدیریت کنید.

## 🌟 نمای کلی

این پروژه با هدف فراهم آوردن راهی آسان، سریع و تعاملی برای انجام برخی از تنظیمات رایج Cloudflare بدون نیاز به ورود به داشبورد کلودفلر ایجاد شده است. با استفاده از Cloudflare Workers، این ربات دارای تاخیر کم بوده و با اشتراک رایگان کلودفلر به خوبی سازگار است.

## ✨ ویژگی‌ها

* **رابط کاربری تعاملی:** مدیریت آسان از طریق دکمه‌های درون‌خطی تلگرام.
* **مدیریت دامنه‌ها:**
    * نمایش لیست دامنه‌ها (Zones) با قابلیت صفحه‌بندی.
    * انتخاب دامنه برای عملیات بیشتر.
* **مدیریت DNS (برای هر دامنه):**
    * **مشاهده رکوردها:** لیست رکوردهای DNS با قابلیت صفحه‌بندی.
    * **جزئیات رکورد:** نمایش جزئیات کامل هر رکورد DNS (نوع، محتوا، وضعیت پروکسی، TTL).
    * **افزودن رکورد جدید:** قابلیت افزودن رکوردهای `A` و `AAAA` با راهنمایی ربات برای وارد کردن نام، آدرس IP و وضعیت پروکسی.
    * **محدودیت‌های امنیتی:** امکان حذف یا ویرایش رکوردهای موجود (از جمله تغییر وضعیت پروکسی آن‌ها) از طریق ربات وجود ندارد (فقط مشاهده و افزودن ساب دامین جدید).
* **گزارش‌های آماری ساده (Analytics):**
    * نمایش آمار ۲۴ ساعت گذشته برای هر دامنه شامل:
        * کل درخواست‌ها
        * درخواست‌های کش شده (و درصد کش)
        * کل داده منتقل شده
        * داده ارائه شده از کش
* **امنیت:** امکان محدود کردن دسترسی به ربات برای شناسه‌های کاربری خاص تلگرام.
* **سرورلس و بهینه:** اجرا روی Cloudflare Workers، بدون نیاز به مدیریت سرور و سازگار با اشتراک رایگان.

## 🛠️ پشته فناوری (Tech Stack)

* Cloudflare Workers
* Telegram Bot API
* JavaScript (ES Modules)
* Wrangler CLI (برای توسعه محلی)

## 📋 اطلاعات مورد نیاز (قبل از شروع استقرار)

قبل از استقرار، اطمینان حاصل کنید که اطلاعات زیر را آماده کرده‌اید:

1.  یک **حساب کاربری Cloudflare** (سطح رایگان کافی است) و دامنه‌های اضافه شده به آن.
2.  **توکن API ربات تلگرام:** از طریق ربات `@BotFather`.
3.  **توکن API کلودفلر:** از داشبورد کلودفلر خود یک توکن با دسترسی محدود (Scoped API Token) با **دسترسی‌های دقیق زیر** ایجاد کنید:
    * `Zone` > `Zone` > **Read** (برای خواندن اطلاعات کلی دامنه‌ها)
    * `Zone` > `DNS` > **Edit** (برای افزودن رکوردهای DNS جدید)
    * `Zone` > `Analytics` > **Read** (برای خواندن اطلاعات آماری)
4.  **شناسه حساب کلودفلر (Cloudflare Account ID):** از صفحه Overview یکی از دامنه‌هایتان در داشبورد کلودفلر قابل مشاهده است.
5.  **شناسه کاربری مجاز تلگرام (ALLOWED_TELEGRAM_USER_ID):** دریافت از طریق ربات @userinfobot.

## 🚀 استقرار (Deployment)

دو روش اصلی برای استقرار این ربات وجود دارد:

### روش ۱: استفاده از دکمه "Deploy to Cloudflare" (ساده‌ترین راه)

1.  **روی دکمه زیر کلیک کنید:**
    [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/deploy?repo=https://github.com/RamakMKH/cloudflare-telegram-bot)

    *(مطمئن شوید که اگر این ریپازیتوری را Fork کرده‌اید، آدرس بالا به ریپازیتوری Fork شده شما اشاره می‌کند).*

3.  **اتصال به کلودفلر و گیت‌هاب:** مراحل را در رابط کاربری کلودفلر دنبال کنید. این فرآیند ممکن است شامل Fork کردن ریپازیتوری به حساب گیت‌هاب شما و اتصال آن به پروژه جدیدی در Cloudflare Workers باشد. نام پروژه ورکر خود را انتخاب کنید.

4.  **مرحله حیاتی - افزودن دستی متغیرهای محیطی (Secrets):**
    * پس از اینکه ساختار اولیه پروژه در کلودفلر ایجاد شد (اولین استقرار ممکن است به دلیل نبود سکرت‌ها ناموفق باشد یا ربات کار نکند)، به داشبورد کلودفلر بروید:
        * Workers & Pages > پروژه ورکر خود را انتخاب کنید.
        * Settings > Environment Variables (در بخش "Variables").
    * متغیرهای زیر را با مقادیر واقعی خود **دستی اضافه کنید** ("Add variable"). برای توکن‌ها، گزینه **"Encrypt"** را فعال کنید:
        * `TELEGRAM_BOT_TOKEN`
        * `CLOUDFLARE_API_TOKEN`
        * `CLOUDFLARE_ACCOUNT_ID`
        * `ALLOWED_TELEGRAM_USER_ID` 
5.  **استقرار مجدد (Redeploy):**
    * پس از افزودن تمام متغیرهای محیطی، به تب "Deployments" پروژه خود در کلودفلر رفته و آخرین استقرار را **"Retry deployment"** کنید تا ورکر با سکرت‌های جدید شما فعال شود.

6.  **دریافت URL ورکر و تنظیم وبهوک:** مراحل بعدی را از بخش "تنظیم وبهوک تلگرام" دنبال کنید.

### روش ۲: اتصال مستقیم گیت از طریق داشبورد کلودفلر

1.  به داشبورد کلودفلر بروید -> Workers & Pages -> "Create application" -> "Connect to Git".
2.  ریپازیتوری `RamakMKH/cloudflare-telegram-bot` (یا Fork خودتان) را انتخاب کنید.
3.  شاخه `main` را انتخاب کنید.
4.  **تنظیمات ساخت (Build settings):**
    * **Framework preset:** روی "**None**" تنظیم کنید.
    * **Build command:** **خالی (Blank)** بگذارید.
    * **Deploy command (مهم):** اگر رابط کاربری کلودفلر شما را ملزم به پر کردن این فیلد می‌کند، آن را روی `npx wrangler deploy` تنظیم کنید. در غیر این صورت، این فیلد را نیز **خالی** بگذارید تا کلودفلر از منطق پیش‌فرض خود استفاده کند. (توجه: فایل `wrangler.toml` این پروژه دیگر شامل بخش `[vars]` نیست).
    * **Root directory:** `/` (ریشه ریپازیتوری).
5.  **افزودن متغیرهای محیطی (Secrets):**
    * در همین مرحله یا پس از ایجاد پروژه، به بخش Settings > Environment Variables بروید و متغیرهای `TELEGRAM_BOT_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, و `ALLOWED_TELEGRAM_USER_ID` (اختیاری) را با مقادیر واقعی خود اضافه و برای موارد حساس Encrypt کنید.
6.  **ذخیره و استقرار (Save and Deploy):** پروژه را مستقر کنید. اگر متغیرها را بعد از اولین استقرار اضافه کردید، یک استقرار مجدد انجام دهید.

### تنظیم وبهوک تلگرام

1.  **دریافت URL ورکر:** پس از استقرار موفقیت‌آمیز، URL ورکر شما نمایش داده می‌شود (مثلاً: `https://your-project-name.your-cf-subdomain.workers.dev`). این URL را کپی کنید.
2.  **تنظیم وبهوک:** دستور `curl` زیر را در ترمینال خود اجرا کنید (مقادیر را جایگزین کنید):
    ```bash
    curl -F "url=https://YOUR_WORKER_URL/webhook" \
         [https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook](https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook)
    ```
    * `YOUR_WORKER_URL` را با آدرس ورکر خود جایگزین کنید.
    * `YOUR_TELEGRAM_BOT_TOKEN` را با توکن ربات تلگرام خود جایگزین کنید.
    * مسیر `/webhook` در انتهای URL ورکر مهم است.

پس از این مراحل، ربات شما آماده استفاده است!

## 💬 نحوه استفاده (تعامل با ربات)

1.  ربات را در تلگرام پیدا کرده و دستور `/start` یا `/help` را ارسال کنید، یا روی دکمه "🗂️ مدیریت دامنه‌ها (My Domains)" کلیک کنید.
2.  لیست دامنه‌های شما (با قابلیت صفحه‌بندی) نمایش داده می‌شود. روی نام دامنه مورد نظر کلیک کنید.
3.  منوی عملیات برای آن دامنه ظاهر می‌شود: "🛡️ مدیریت DNS" و "📊 گزارش‌ها".
    * **گزارش‌ها:** آمار ۲۴ ساعت گذشته دامنه (تعداد درخواست، کش، حجم داده) را نمایش می‌دهد.
    * **مدیریت DNS:**
        * **📄 مشاهده رکوردها:** لیست رکوردهای DNS دامنه (با قابلیت صفحه‌بندی) نمایش داده می‌شود. با کلیک روی هر رکورد، جزئیات آن را مشاهده خواهید کرد.
        * **➕ افزودن رکورد جدید:**
            1.  نوع رکورد (`A` یا `AAAA`) را انتخاب کنید.
            2.  ربات از شما می‌خواهد که اطلاعات رکورد را با یک دستور متنی خاص ارسال کنید. فرمت دستور به شما نمایش داده خواهد شد.
                * برای رکورد A: `/set_a_record <نام دامنه> <نام ساب‌دامین> <آدرس IPv4> <on|off>`
                    * مثال: `/set_a_record example.com www 1.2.3.4 on`
                    * (برای دامنه اصلی از `@` به عنوان نام ساب‌دامین استفاده کنید).
                * برای رکورد AAAA: `/set_aaaa_record <نام دامنه> <نام ساب‌دامین> <آدرس IPv6> <on|off>`
                    * مثال: `/set_aaaa_record example.com mail 2001:db8::1 off`
            3.  پس از ارسال دستور، ربات نتیجه عملیات را به شما اطلاع می‌دهد.

## 🛠️ برای توسعه‌دهندگان (توسعه محلی و سفارشی‌سازی)

اگر می‌خواهید کد ربات را تغییر دهید یا قابلیت‌های جدیدی به آن اضافه کنید:

1.  **کلون کردن ریپازیتوری:**
    ```bash
    git clone [https://github.com/RamakMKH/cloudflare-telegram-bot.git](https://github.com/RamakMKH/cloudflare-telegram-bot.git)
    cd cloudflare-telegram-bot
    ```
2.  **نصب وابستگی‌ها (شامل Wrangler):**
    ```bash
    npm install
    ```
3.  **ورود به حساب Cloudflare (اگر برای اولین بار از Wrangler استفاده می‌کنید):**
    ```bash
    npx wrangler login
    ```
4.  **پیکربندی محلی:**
    * یک فایل `.dev.vars` در ریشه پروژه ایجاد کرده و متغیرهای محیطی خود (توکن‌ها و شناسه‌ها) را در آن قرار دهید:
        ```
        TELEGRAM_BOT_TOKEN="your_actual_bot_token"
        CLOUDFLARE_API_TOKEN="your_actual_cf_api_token"
        CLOUDFLARE_ACCOUNT_ID="your_actual_cf_account_id"
        ALLOWED_TELEGRAM_USER_ID="your_telegram_id" # اختیاری
        ```
        (فایل `.dev.vars` در `.gitignore` لیست شده و کامیت نمی‌شود).
    * سپس برای اجرای سرور توسعه محلی:
        ```bash
        npm start 
        # یا npx wrangler dev
        ```
5.  **استقرار دستی تغییرات:**
    ```bash
    npm run deploy
    # یا npx wrangler deploy src/index.js (اگر main در package.json را برای wrangler dev استفاده می‌کنید)
    ```

## 🛡️ نکات امنیتی

* **هرگز** از توکن API سراسری (Global API Key) کلودفلر استفاده نکنید.
* توکن‌های خود را محرمانه نگه دارید.
* از متغیر `ALLOWED_TELEGRAM_USER_ID` برای محدود کردن دسترسی به ربات استفاده کنید.

## ⚙️ عیب‌یابی

* لاگ‌های ورکر را از طریق داشبورد Cloudflare Workers (بخش Logs پروژه شما) بررسی کنید.
* برای توسعه محلی، از `npx wrangler tail YOUR_WORKER_NAME` استفاده کنید.
* صحت توکن‌ها، شناسه‌ها و تنظیمات وبهوک را بررسی نمایید.

## 🌱 بهبودهای آینده

* افزودن انواع رکوردهای DNS بیشتر (MX, CNAME, TXT).
* ویرایش رکوردهای موجود (با احتیاط).
* مدیریت سایر ویژگی‌های کلودفلر (مانند Page Rules, Purge Cache, Development Mode).
* استفاده از Cloudflare KV برای ذخیره‌سازی تنظیمات کاربر یا وضعیت‌های پیچیده‌تر.
* بهبود بیشتر رابط کاربری و پیام‌ها.

## 🤝 مشارکت (Contributing)

از مشارکت شما استقبال می‌شود! اگر ایده‌ای برای بهبود دارید یا باگی پیدا کرده‌اید، لطفاً یک Issue باز کنید یا یک Pull Request ارسال نمایید.

## 📄 لایسنس

این پروژه تحت لایسنس [MIT](LICENSE) منتشر شده است.
