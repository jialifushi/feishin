/**
 * Notification Service for Webhook and Telegram
 */

export const sendLoginNotification = async (userName: string, serverName: string, status: 'success' | 'failure' = 'success') => {
    // @ts-ignore
    const webhookUrl = window.WEBHOOK_URL;
    // @ts-ignore
    const botToken = window.BOT_TOKEN;
    // @ts-ignore
    const chatId = window.CHAT_ID;

    // Helper to check if a string is a valid value (not empty and not an unreplaced placeholder)
    const isValid = (val: string, key: string) => val && val !== `\${${key}}` && val !== 'undefined';

    if (!isValid(webhookUrl, 'WEBHOOK_URL') && (!isValid(botToken, 'BOT_TOKEN') || !isValid(chatId, 'CHAT_ID'))) {
        console.log('[NOTIFY] No valid notification channels configured. (Check ENV variables)');
        return;
    }

    const now = new Date().toLocaleString('zh-CN', { hour12: false });
    const platform = navigator.userAgentData?.platform || navigator.platform || 'Unknown';
    const browser = getBrowserName();
    
    let icon = status === 'success' ? '✅' : '🚨';
    let noteText = status === 'success' 
        ? 'Connected successfully. Service is now available.' 
        : 'Connection failed for all backend nodes. Manual inspection required.';

    const message = `${icon} **HMusic Login ${status === 'success' ? 'Success' : 'Failure'}**\n\nTime: ${now}\nUser: ${userName}\nPlatform: ${platform} (${browser})\nService: ${serverName}\nNote: ${noteText}`;

    console.log(`[NOTIFY] [${status.toUpperCase()}] Sending notification...`, { webhookUrl, hasTelegram: !!botToken });

    // 1. Send Webhook
    if (isValid(webhookUrl, 'WEBHOOK_URL')) {
        try {
            // @ts-ignore
            const method = window.WEBHOOK_METHOD || 'POST';
            // @ts-ignore
            const headersStr = window.WEBHOOK_HEADERS || '{"Content-Type":"application/json"}';
            // @ts-ignore
            const templateStr = window.WEBHOOK_TEMPLATE || '{"content":"{{message}}"}';

            const headers = JSON.parse(headersStr);
            // Securely replace message in template
            const body = templateStr.split('{{message}}').join(message.replace(/\n/g, '\\n').replace(/"/g, '\\"'));

            // Use Nginx proxy instead of direct URL to avoid CORS issues
            const proxyUrl = '/api/notify/webhook';

            fetch(proxyUrl, {
                method,
                headers,
                body: method === 'GET' ? undefined : body,
                keepalive: true,
            })
            .then(res => console.log(`[NOTIFY] Webhook status: ${res.status}`))
            .catch(e => console.error('[NOTIFY] Webhook proxy error:', e));
        } catch (e) {
            console.error('[NOTIFY] Webhook logic error', e);
        }
    }

    // 2. Send Telegram
    if (isValid(botToken, 'BOT_TOKEN') && isValid(chatId, 'CHAT_ID')) {
        // Use Nginx proxy for TG
        const tgProxyUrl = `/api/notify/telegram/bot${botToken}/sendMessage`;
        fetch(tgProxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
            }),
            keepalive: true,
        })
        .then(res => console.log(`[NOTIFY] TG status: ${res.status}`))
        .catch(e => console.error('[NOTIFY] Telegram proxy error', e));
    }
};

function getBrowserName() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    return 'Unknown Browser';
}
