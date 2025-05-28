/**
 * @typedef {Object} Environment
 * @property {string} TELEGRAM_BOT_TOKEN
 * @property {string} CLOUDFLARE_API_TOKEN
 * @property {string} CLOUDFLARE_ACCOUNT_ID
 * @property {string} [ALLOWED_TELEGRAM_USER_ID]
 */

// --- Constants ---
const ZONES_PER_PAGE = 5;
const DNS_RECORDS_PER_PAGE = 8;

// --- Helper Functions ---

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || !bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function sendTelegramMessage(chatId, text, replyMarkup = null, env) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const responseData = await response.json();
    if (!response.ok) {
      console.error(`Telegram API error (sendMessage): ${response.status} ${response.statusText}`, JSON.stringify(responseData));
      return null;
    }
    return responseData;
  } catch (error) {
    console.error('Failed to send Telegram message:', error.message, error.stack);
    return null;
  }
}

async function editTelegramMessage(chatId, messageId, text, replyMarkup = null, env) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/editMessageText`;
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Telegram API error (editMessageText): ${response.status} ${response.statusText}`, JSON.stringify(errorData));
    }
  } catch (error) {
    console.error('Failed to edit Telegram message:', error.message, error.stack);
  }
}

async function answerCallbackQuery(callbackQueryId, env, text = null) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  const payload = { callback_query_id: callbackQueryId };
  if (text) {
    payload.text = text;
  }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Failed to answer callback query:', error.message, error.stack);
  }
}

async function getCloudflareZones(env) {
  if (!env.CLOUDFLARE_ACCOUNT_ID) {
    console.error('Cloudflare Account ID is not configured.');
    return [];
  }
  const url = `https://api.cloudflare.com/client/v4/zones?account.id=${env.CLOUDFLARE_ACCOUNT_ID}&per_page=100&status=active`;
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to get error text');
      console.error(`Cloudflare API error (getZones): ${response.status} ${response.statusText}`, errorText);
      return [];
    }
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('Error fetching Cloudflare zones:', error.message, error.stack);
    return [];
  }
}

let zoneCache = {
    timestamp: 0,
    zones: []
};
const ZONE_CACHE_TTL = 5 * 60 * 1000; 

async function getZoneNameById(zoneId, env) {
    const now = Date.now();
    if (now - zoneCache.timestamp > ZONE_CACHE_TTL || zoneCache.zones.length === 0) {
        console.log("Fetching zones for cache...");
        zoneCache.zones = await getCloudflareZones(env);
        zoneCache.timestamp = now;
    }
    const zone = zoneCache.zones.find(z => z.id === zoneId);
    return zone ? zone.name : `(ID: ${zoneId})`;
}

async function getCloudflareDnsRecords(zoneId, env) {
  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=100`;
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to get error text');
      console.error(`Cloudflare API error (getDnsRecords for zone ${zoneId}): ${response.status} ${response.statusText}`, errorText);
      return [];
    }
    const data = await response.json();
    const records = data.result || [];
    records.sort((a, b) => {
        if (a.type < b.type) return -1;
        if (a.type > b.type) return 1;
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    });
    return records;
  } catch (error) {
    console.error(`Error fetching DNS records for zone ${zoneId}:`, error.message, error.stack);
    return [];
  }
}

async function getZoneAnalytics(zoneId, env) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

  const query = `
    query GetZoneAnalyticsSimplified($zoneTag: String!, $since: Time!, $until: Time!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          totalRequestsAndBytes: httpRequestsAdaptiveGroups(
            filter: { datetime_geq: $since, datetime_lt: $until },
            limit: 1 
          ) {
            count
            sum {
              edgeResponseBytes 
            }
          }
          cachedRequestsAndBytes: httpRequestsAdaptiveGroups(
            filter: { datetime_geq: $since, datetime_lt: $until, cacheStatus: "hit" },
            limit: 1
          ) {
            count 
            sum {
              edgeResponseBytes 
            }
          }
        }
      }
    }`;

  const variables = {
    zoneTag: zoneId,
    since: twentyFourHoursAgo.toISOString(),
    until: now.toISOString()
  };

  try {
    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: query, variables: variables }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Failed to get error text from GraphQL");
      console.error(`GraphQL API error (getZoneAnalytics - simplified): ${response.status} ${response.statusText}`, errText);
      return null;
    }
    const jsonResponse = await response.json();

    if (jsonResponse.errors) {
      console.error('GraphQL query errors (getZoneAnalytics - simplified):', JSON.stringify(jsonResponse.errors));
      return null;
    }

    const zoneData = jsonResponse.data?.viewer?.zones[0];
    if (!zoneData) {
      console.error('No zone data found in GraphQL response for analytics (simplified query).');
      return null;
    }

    const totalSummary = zoneData.totalRequestsAndBytes && zoneData.totalRequestsAndBytes.length > 0 ? zoneData.totalRequestsAndBytes[0] : null;
    const cachedSummary = zoneData.cachedRequestsAndBytes && zoneData.cachedRequestsAndBytes.length > 0 ? zoneData.cachedRequestsAndBytes[0] : null;
    
    return {
      totalRequests: totalSummary?.count || 0,
      cachedRequests: cachedSummary?.count || 0, 
      totalBytes: totalSummary?.sum?.edgeResponseBytes || 0, 
      cachedBytes: cachedSummary?.sum?.edgeResponseBytes || 0, 
      threatsBlocked: 0, 
    };

  } catch (error) {
    console.error('Error fetching zone analytics (simplified query - catch block):', error.message, error.stack);
    return null;
  }
}

/**
 * Adds a new DNS record (A or AAAA).
 * @param {string} zoneId Cloudflare Zone ID.
 * @param {string} type 'A' or 'AAAA'.
 * @param {string} name Record name (e.g., www, @ for root).
 * @param {string} content IP address.
 * @param {boolean} proxied Proxy status.
 * @param {Environment} env Environment variables.
 * @returns {Promise<object|null>} The created record object on success, or null on failure.
 */
async function addDnsRecord(zoneId, type, name, content, proxied, env) {
  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
  const body = {
    type: type.toUpperCase(),
    name: name,
    content: content,
    ttl: 1, 
    proxied: proxied,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (response.ok && data.success && data.result) {
      return data.result; // Return the created record object
    } else {
      const errorMessages = data.errors && data.errors.length > 0 ? data.errors.map(e => `(کد: ${e.code}) ${e.message}`).join(', ') : `خطای ${response.status}`;
      console.error('Cloudflare API error (addDnsRecord):', JSON.stringify(data.errors || data));
      throw new Error(`خطا در افزودن رکورد: ${errorMessages}`);
    }
  } catch (error) {
    console.error('Error adding DNS record:', error.message, error.stack);
    throw error;
  }
}

// --- Main Handler ---
export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST' && request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }
    
    if (request.method === 'GET') {
        const url = new URL(request.url);
        if (url.pathname.endsWith('/webhook')) {
             return new Response('Cloudflare Worker for Telegram Bot is running. Webhook is active if configured.', {
                headers: { 'Content-Type': 'text/plain' },
             });
        }
        return new Response('Not found.', { status: 404 });
    }

    let payload;
    try {
        payload = await request.json();
    } catch (e) {
        console.error("Failed to parse JSON payload:", e);
        return new Response('Bad Request: Invalid JSON', { status: 400 });
    }

    let chatId;
    let userId;
    let text = '';
    let callbackData;
    let messageId;

    if (payload.message) {
      chatId = payload.message.chat.id;
      userId = payload.message.from.id.toString();
      text = payload.message.text || '';
      messageId = payload.message.message_id;
    } else if (payload.callback_query) {
      chatId = payload.callback_query.message.chat.id;
      userId = payload.callback_query.from.id.toString();
      callbackData = payload.callback_query.data;
      messageId = payload.callback_query.message.message_id;
      ctx.waitUntil(answerCallbackQuery(payload.callback_query.id, env));
    } else {
      return new Response('OK', { status: 200 });
    }

    if (env.ALLOWED_TELEGRAM_USER_ID && env.ALLOWED_TELEGRAM_USER_ID.trim() !== "" && env.ALLOWED_TELEGRAM_USER_ID !== userId) {
      await sendTelegramMessage(chatId, '⛔️ شما مجاز به استفاده از این ربات نیستید.', null, env);
      return new Response('OK', { status: 200 });
    }

    try {
        if (callbackData) {
          const parts = callbackData.split('_');
          const action = parts[0];
          const param1 = parts[1] || null; // zoneId or page number
          const param2 = parts[2] || null; // pageNumber or recordType or pageOfRecord
          const param3 = parts[3] || null; // indexOfRecordOnPage

          if (action === 'listzones') {
            const page = parseInt(param1 || '0', 10);
            await handleListZonesWithButtons(chatId, page, env, messageId);
          }
          else if (action === 'domain' && param1) { // param1 is zoneId
            const zoneName = await getZoneNameById(param1, env);
            const messageText = `دامنه: ${zoneName}\nچه عملیاتی مد نظر شماست؟`;
            const keyboard = {
              inline_keyboard: [
                [{ text: '🛡️ مدیریت DNS', callback_data: `dnsmenu_${param1}` }],
                [{ text: '📊 گزارش‌ها', callback_data: `analytics_${param1}` }],
                [{ text: '↩️ بازگشت به لیست دامنه‌ها', callback_data: 'listzones_0' }]
              ]
            };
            await editTelegramMessage(chatId, messageId, messageText, keyboard, env);
          }
          else if (action === 'analytics' && param1) { // param1 is zoneId
            const zoneName = await getZoneNameById(param1, env);
            await editTelegramMessage(chatId, messageId, `⏳ در حال دریافت گزارش‌های آماری برای دامنه ${zoneName}...`, null, env);
            const analytics = await getZoneAnalytics(param1, env);
            let analyticsMessage = `📊 گزارش آماری دامنه ${zoneName} (۲۴ ساعت گذشته):\n\n`;
            if (analytics) {
              const cachePercentage = analytics.totalRequests > 0 ? ((analytics.cachedRequests / analytics.totalRequests) * 100).toFixed(1) : "N/A";
              analyticsMessage += `کل درخواست‌ها: ${analytics.totalRequests.toLocaleString()}\n`;
              analyticsMessage += `درخواست‌های کش شده: ${analytics.cachedRequests.toLocaleString()} (${cachePercentage}%)\n`;
              analyticsMessage += `کل داده منتقل شده: ${formatBytes(analytics.totalBytes)}\n`;
              analyticsMessage += `داده از کش: ${formatBytes(analytics.cachedBytes)}\n`;
              analyticsMessage += `تهدیدهای متوقف شده: ${analytics.threatsBlocked.toLocaleString()} (داده‌های فایروال در این نسخه نمایش داده نمی‌شود)\n`;
            } else {
              analyticsMessage += "❌ اطلاعات آماری در دسترس نیست یا در دریافت آن‌ها خطایی رخ داده است.\n(توجه: دسترسی `Analytics:Read` برای توکن API کلودفلر شما لازم است. ممکن است برای دامنه‌های جدید اطلاعاتی موجود نباشد یا پلن حساب شما اجازه دسترسی به داده‌های خاص را ندهد. لطفاً لاگ‌های ورکر را برای جزئیات بیشتر بررسی کنید.)";
            }
            const keyboard = {
              inline_keyboard: [
                [{ text: `↩️ بازگشت به عملیات دامنه`, callback_data: `domain_${param1}` }]
              ]
            };
            await editTelegramMessage(chatId, messageId, analyticsMessage, keyboard, env);
          }
          else if (action === 'dnsmenu' && param1) { // param1 is zoneId
            const zoneName = await getZoneNameById(param1, env);
            const messageText = `مدیریت DNS برای دامنه: ${zoneName}\nلطفاً انتخاب کنید:`;
            const keyboard = {
              inline_keyboard: [
                [{ text: '📄 مشاهده رکوردها', callback_data: `dnsrecords_${param1}_0` }],
                [{ text: '➕ افزودن رکورد جدید', callback_data: `dnsaddtype_${param1}` }],
                [{ text: `↩️ بازگشت به عملیات دامنه`, callback_data: `domain_${param1}` }]
              ]
            };
            await editTelegramMessage(chatId, messageId, messageText, keyboard, env);
          }
          else if (action === 'dnsrecords' && param1) { // param1 is zoneId
            const page = parseInt(param2 || '0', 10);
            await handleListDnsRecordsWithButtons(chatId, param1, page, env, messageId);
          }
          else if (action === 'dnsdetail' && param1) { // param1 is zoneId
            const pageOfRecord = parseInt(param2, 10);
            const indexOfRecordOnPage = parseInt(param3, 10);
            await handleViewDnsRecordDetail(chatId, param1, pageOfRecord, indexOfRecordOnPage, env, messageId);
          }
          else if (action === 'dnsaddtype' && param1) { // param1 is zoneId
            const zoneName = await getZoneNameById(param1, env);
            const messageText = `افزودن رکورد جدید برای دامنه: ${zoneName}\nلطفاً نوع رکورد را انتخاب کنید:`;
            const keyboard = {
              inline_keyboard: [
                [{ text: '🅰️ رکورد A (IPv4)', callback_data: `dnsaddparams_${param1}_A` }],
                [{ text: '💠 رکورد AAAA (IPv6)', callback_data: `dnsaddparams_${param1}_AAAA` }],
                [{ text: `↩️ بازگشت به مدیریت DNS`, callback_data: `dnsmenu_${param1}` }]
              ]
            };
            await editTelegramMessage(chatId, messageId, messageText, keyboard, env);
          }
          else if (action === 'dnsaddparams' && param1) { // param1 is zoneId
            const recordType = param2; // 'A' or 'AAAA'
            const zoneName = await getZoneNameById(param1, env);
            let instructionMessage = `برای افزودن رکورد ${recordType} به دامنه ${zoneName}:\n\n`;
            instructionMessage += `یک پیام با فرمت زیر ارسال کنید (نام دامنه را هم در دستور وارد کنید):\n`;
            if (recordType === 'A') {
              instructionMessage += "`/set_a_record ${zoneName} <نام ساب‌دامین> <آدرس IPv4> <on|off>`\n\n";
              instructionMessage += `مثال: \`/set_a_record ${zoneName} www 1.2.3.4 on\`\n`;
              instructionMessage += `یا برای دامنه اصلی: \`/set_a_record ${zoneName} @ 1.2.3.4 off\``;
            } else if (recordType === 'AAAA') {
              instructionMessage += "`/set_aaaa_record ${zoneName} <نام ساب‌دامین> <آدرس IPv6> <on|off>`\n\n";
              instructionMessage += `مثال: \`/set_aaaa_record ${zoneName} mail 2001:db8::1 on\``;
            }
            const keyboard = {
              inline_keyboard: [
                [{ text: `↩️ بازگشت به انتخاب نوع رکورد`, callback_data: `dnsaddtype_${param1}` }]
              ]
            };
            await editTelegramMessage(chatId, messageId, instructionMessage, keyboard, env);
          }

        } else if (text) {
          if (text.startsWith('/start') || text.startsWith('/help')) {
            const helpMessage = `👋 به ربات مدیریت دامنه کلودفلر خوش آمدید!\n\n` +
                                `برای شروع، روی دکمه زیر کلیک کنید یا دستور /domains را ارسال نمایید.`;
            const keyboard = {
              inline_keyboard: [
                [{ text: '🗂️ مدیریت دامنه‌ها (My Domains)', callback_data: 'listzones_0' }]
              ]
            };
            await sendTelegramMessage(chatId, helpMessage, keyboard, env);
          }
          else if (text.startsWith('/domains')) {
            await handleListZonesWithButtons(chatId, 0, env, null);
          }
          else if (text.startsWith('/set_a_record')) {
            const parts = text.split(' ');
            if (parts.length === 5) { // /set_a_record <domain_name> <record_name> <ipv4_address> <on|off>
                const domainName = parts[1];
                const recordName = parts[2];
                const ipAddress = parts[3];
                const proxyState = parts[4].toLowerCase();

                const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
                if (!ipRegex.test(ipAddress)) {
                    await sendTelegramMessage(chatId, "⚠️ فرمت آدرس IPv4 نامعتبر است.", null, env);
                    return new Response('OK');
                }
                if (proxyState !== 'on' && proxyState !== 'off') {
                    await sendTelegramMessage(chatId, "⚠️ وضعیت پروکسی باید 'on' یا 'off' باشد.", null, env);
                    return new Response('OK');
                }
                
                const zones = await getCloudflareZones(env);
                const targetZone = zones.find(z => z.name === domainName);
                if (!targetZone) {
                    await sendTelegramMessage(chatId, `⚠️ دامنه ${domainName} یافت نشد.`, null, env);
                    return new Response('OK');
                }

                await sendTelegramMessage(chatId, `⏳ در حال افزودن رکورد A برای ${recordName === '@' ? domainName : recordName + '.' + domainName}...`, null, env);
                try {
                    const newRecord = await addDnsRecord(targetZone.id, 'A', recordName, ipAddress, proxyState === 'on', env);
                    let successMessage = `✅ رکورد A برای ${newRecord.name} با موفقیت افزوده شد.\n\n`;
                    successMessage += `جزئیات رکورد جدید:\n`;
                    successMessage += `🔸 نام: ${newRecord.name}\n`;
                    successMessage += `🔹 نوع: ${newRecord.type}\n`;
                    successMessage += `🎯 محتوا: ${newRecord.content}\n`;
                    successMessage += `☁️ پروکسی: ${newRecord.proxied ? 'روشن ✅' : 'خاموش ❌'}\n`;
                    successMessage += `⏱️ TTL: ${newRecord.ttl === 1 ? 'Auto' : newRecord.ttl}\n\n`;
                    successMessage += "لطفاً انتخاب کنید:";

                    const keyboard = {
                        inline_keyboard: [
                            [{ text: '↩️ بازگشت به منوی DNS', callback_data: `dnsmenu_${targetZone.id}` }],
                            [{ text: '🚪 خروج به لیست دامنه‌ها', callback_data: `listzones_0` }]
                        ]
                    };
                    await sendTelegramMessage(chatId, successMessage, keyboard, env);

                } catch (e) {
                     await sendTelegramMessage(chatId, `❌ ${e.message}`, null, env);
                }
            } else {
                await sendTelegramMessage(chatId, "⚠️ استفاده نادرست از دستور.\nفرمت صحیح: `/set_a_record <domain_name> <record_name> <ipv4_address> <on|off>`", null, env);
            }
          }
          else if (text.startsWith('/set_aaaa_record')) {
            const parts = text.split(' ');
            if (parts.length === 5) { // /set_aaaa_record <domain_name> <record_name> <ipv6_address> <on|off>
                const domainName = parts[1];
                const recordName = parts[2];
                const ipv6Address = parts[3];
                const proxyState = parts[4].toLowerCase();
                
                // Basic IPv6 validation - consider a robust library for production
                if (ipv6Address.split(':').length < 2 || ipv6Address.length < 3) { 
                    await sendTelegramMessage(chatId, "⚠️ فرمت آدرس IPv6 نامعتبر به نظر می‌رسد.", null, env);
                    return new Response('OK');
                }
                 if (proxyState !== 'on' && proxyState !== 'off') {
                    await sendTelegramMessage(chatId, "⚠️ وضعیت پروکسی باید 'on' یا 'off' باشد.", null, env);
                    return new Response('OK');
                }

                const zones = await getCloudflareZones(env);
                const targetZone = zones.find(z => z.name === domainName);
                if (!targetZone) {
                    await sendTelegramMessage(chatId, `⚠️ دامنه ${domainName} یافت نشد.`, null, env);
                    return new Response('OK');
                }
                
                await sendTelegramMessage(chatId, `⏳ در حال افزودن رکورد AAAA برای ${recordName === '@' ? domainName : recordName + '.' + domainName}...`, null, env);
                try {
                    const newRecord = await addDnsRecord(targetZone.id, 'AAAA', recordName, ipv6Address, proxyState === 'on', env);
                    let successMessage = `✅ رکورد AAAA برای ${newRecord.name} با موفقیت افزوده شد.\n\n`;
                    successMessage += `جزئیات رکورد جدید:\n`;
                    successMessage += `🔸 نام: ${newRecord.name}\n`;
                    successMessage += `🔹 نوع: ${newRecord.type}\n`;
                    successMessage += `🎯 محتوا: ${newRecord.content}\n`;
                    successMessage += `☁️ پروکسی: ${newRecord.proxied ? 'روشن ✅' : 'خاموش ❌'}\n`;
                    successMessage += `⏱️ TTL: ${newRecord.ttl === 1 ? 'Auto' : newRecord.ttl}\n\n`;
                    successMessage += "لطفاً انتخاب کنید:";

                    const keyboard = {
                        inline_keyboard: [
                            [{ text: '↩️ بازگشت به منوی DNS', callback_data: `dnsmenu_${targetZone.id}` }],
                            [{ text: '🚪 خروج به لیست دامنه‌ها', callback_data: `listzones_0` }]
                        ]
                    };
                    await sendTelegramMessage(chatId, successMessage, keyboard, env);
                } catch (e) {
                    await sendTelegramMessage(chatId, `❌ ${e.message}`, null, env);
                }
            } else {
                await sendTelegramMessage(chatId, "⚠️ استفاده نادرست از دستور.\nفرمت صحیح: `/set_aaaa_record <domain_name> <record_name> <ipv6_address> <on|off>`", null, env);
            }
          }
        }
    } catch (err) {
        console.error("Unhandled error in fetch handler:", err.message, err.stack);
        if (chatId) {
            try {
                await sendTelegramMessage(chatId, "😕 متاسفانه یک خطای پیش‌بینی نشده در ربات رخ داده است. لطفاً بعداً دوباره تلاش کنید یا با ادمین تماس بگیرید.", null, env);
            } catch (e2) {
                console.error("Failed to send error message to user:", e2);
            }
        }
    }
    return new Response('OK', { status: 200 });
  }
};

async function handleListZonesWithButtons(chatId, pageNumber, env, messageIdToEdit = null) {
    const loadingMessage = messageIdToEdit ? "در حال به‌روزرسانی لیست دامنه‌ها..." : "⏳ در حال دریافت لیست دامنه‌ها...";
    let currentMessageId = messageIdToEdit;

    if (messageIdToEdit) {
        await editTelegramMessage(chatId, messageIdToEdit, loadingMessage, null, env);
    } else {
        const sentMsg = await sendTelegramMessage(chatId, loadingMessage, null, env);
        if (sentMsg && sentMsg.ok) {
            currentMessageId = sentMsg.result.message_id;
        } else {
            console.error("Could not send loading message for zones. Ensure TELEGRAM_BOT_TOKEN is correct.");
            if(!messageIdToEdit) await sendTelegramMessage(chatId, "خطا: امکان ارسال پیام اولیه وجود ندارد. توکن ربات را بررسی کنید.", null, env);
            return; 
        }
    }
    
    const now = Date.now();
    if (now - zoneCache.timestamp > ZONE_CACHE_TTL || zoneCache.zones.length === 0) {
        console.log("Zone cache stale or empty, fetching zones...");
        zoneCache.zones = await getCloudflareZones(env);
        zoneCache.timestamp = now;
    }
    const zones = zoneCache.zones;

    if (!zones || zones.length === 0) {
        await editTelegramMessage(chatId, currentMessageId, '⚠️ دامنه‌ای در حساب شما یافت نشد.', null, env);
        return;
    }

    const startIndex = pageNumber * ZONES_PER_PAGE;
    const paginatedZones = zones.slice(startIndex, startIndex + ZONES_PER_PAGE);

    const inline_keyboard_rows = paginatedZones.map(zone => ([{
        text: zone.name,
        callback_data: `domain_${zone.id}`
    }]));

    const paginationRow = [];
    if (pageNumber > 0) {
        paginationRow.push({ text: '⬅️ صفحه قبل', callback_data: `listzones_${pageNumber - 1}` });
    }
    if (startIndex + ZONES_PER_PAGE < zones.length) {
        paginationRow.push({ text: '➡️ صفحه بعد', callback_data: `listzones_${pageNumber + 1}` });
    }
    if (paginationRow.length > 0) {
        inline_keyboard_rows.push(paginationRow);
    }
    
    const messageText = paginatedZones.length > 0 ? 'لطفاً دامنه مورد نظر را انتخاب کنید:' : 'دامنه‌ای برای نمایش در این صفحه وجود ندارد.';
    const keyboard = { inline_keyboard: inline_keyboard_rows };
    
    if (currentMessageId) { // Only edit if we have a message ID (either original or from loading message)
        await editTelegramMessage(chatId, currentMessageId, messageText, keyboard, env);
    } else { // Fallback if somehow currentMessageId is null (should not happen if loading message sent successfully)
        await sendTelegramMessage(chatId, messageText, keyboard, env);
    }
}

async function handleListDnsRecordsWithButtons(chatId, zoneId, pageNumber, env, messageIdToEdit) {
    const zoneName = await getZoneNameById(zoneId, env);
    await editTelegramMessage(chatId, messageIdToEdit, `⏳ در حال دریافت رکوردهای DNS برای دامنه ${zoneName}...`, null, env);

    const records = await getCloudflareDnsRecords(zoneId, env);

    if (!records || records.length === 0) {
        const keyboard = { inline_keyboard: [[{ text: `↩️ بازگشت به مدیریت DNS`, callback_data: `dnsmenu_${zoneId}` }]] };
        await editTelegramMessage(chatId, messageIdToEdit, `⚠️ رکوردی برای دامنه ${zoneName} یافت نشد.`, keyboard, env);
        return;
    }
    
    const startIndex = pageNumber * DNS_RECORDS_PER_PAGE;
    const paginatedRecords = records.slice(startIndex, startIndex + DNS_RECORDS_PER_PAGE);

    const inline_keyboard_rows = paginatedRecords.map((record, index) => ([{
        text: `${record.name} (${record.type})`,
        callback_data: `dnsdetail_${zoneId}_${pageNumber}_${index}`
    }]));

    const paginationRow = [];
    if (pageNumber > 0) {
        paginationRow.push({ text: '⬅️ صفحه قبل', callback_data: `dnsrecords_${zoneId}_${pageNumber - 1}` });
    }
    if (startIndex + DNS_RECORDS_PER_PAGE < records.length) {
        paginationRow.push({ text: '➡️ صفحه بعد', callback_data: `dnsrecords_${zoneId}_${pageNumber + 1}` });
    }
    if (paginationRow.length > 0) {
        inline_keyboard_rows.push(paginationRow);
    }

    inline_keyboard_rows.push([{ text: `↩️ بازگشت به مدیریت DNS`, callback_data: `dnsmenu_${zoneId}` }]);
    
    const totalPages = Math.ceil(records.length / DNS_RECORDS_PER_PAGE);
    const messageText = paginatedRecords.length > 0 ? `رکوردهای DNS برای ${zoneName} (صفحه ${pageNumber + 1} از ${totalPages}):` : 'رکوردی برای نمایش در این صفحه وجود ندارد.';
    const keyboard = { inline_keyboard: inline_keyboard_rows };
    
    await editTelegramMessage(chatId, messageIdToEdit, messageText, keyboard, env);
}

async function handleViewDnsRecordDetail(chatId, zoneId, pageOfRecord, indexOfRecordOnPage, env, messageIdToEdit) {
    const zoneName = await getZoneNameById(zoneId, env);
    await editTelegramMessage(chatId, messageIdToEdit, `⏳ در حال دریافت جزئیات رکورد برای دامنه ${zoneName}...`, null, env);

    const allRecords = await getCloudflareDnsRecords(zoneId, env);
    
    const startIndex = pageOfRecord * DNS_RECORDS_PER_PAGE;
    const record = allRecords[startIndex + indexOfRecordOnPage];

    let detailMessage = `جزئیات رکورد DNS برای ${zoneName}:\n\n`;
    if (record) {
        detailMessage += `🔸 نام (Name): ${record.name}\n`;
        detailMessage += `🔹 نوع (Type): ${record.type}\n`;
        detailMessage += `🎯 محتوا (Content): ${record.content}\n`;
        detailMessage += `☁️ وضعیت پروکسی (Proxy): ${record.proxied ? 'روشن ✅' : 'خاموش ❌'}\n`;
        detailMessage += `⏱️ TTL: ${record.ttl === 1 ? 'Auto' : record.ttl}\n\n`;
        detailMessage += "🔒 توجه: از طریق این ربات امکان حذف یا تغییر وضعیت پروکسی رکوردهای موجود وجود ندارد.";
    } else {
        detailMessage = "❌ رکورد مورد نظر یافت نشد. ممکن است لیست رکوردها تغییر کرده باشد یا اندیس نامعتبر باشد.";
    }

    const keyboard = {
        inline_keyboard: [[{ text: `↩️ بازگشت به لیست رکوردها`, callback_data: `dnsrecords_${zoneId}_${pageOfRecord}` }]]
    };
    await editTelegramMessage(chatId, messageIdToEdit, detailMessage, keyboard, env);
}
