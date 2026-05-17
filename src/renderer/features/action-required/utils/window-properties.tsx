export const isLegacyAuth = () =>
    window.LEGACY_AUTHENTICATION === true || window.LEGACY_AUTHENTICATION === 'true';

export const isServerLock = () => window.SERVER_LOCK === true || window.SERVER_LOCK === 'true';

export const isMultiServerEnabled = () => window.MULTI_SERVER === true || window.MULTI_SERVER === 'true';

export interface MultiServerConfig {
    password: string;
    type: string;
    url: string;
    webTitle: string;
    username: string;
}

export const getMultiServerConfigs = (): MultiServerConfig[] => {
    const rawConfigs: Array<{ url: string; type: string; webTitle: string; username: string; password: string; nodeIndex: number }> = [];
    const userSuffix = sessionStorage.getItem('user_suffix');
    const suffix = userSuffix && userSuffix !== 'default' ? `ALLOW_CODE_${userSuffix}_` : '';
    
    const isReal = (val: any) => {
        if (!val || typeof val !== 'string') return false;
        if (val.includes('${') || val.includes('}')) return false;
        if (val === 'http://127.0.0.1') return false;
        if (val === 'undefined' || val === 'null' || val.trim() === '') return false;
        return true;
    };

    // 1. Collect all real configs
    if (isReal(window.SERVER_URL)) {
        // @ts-ignore
        const username = isReal(window[`${suffix}USERNAME`]) ? window[`${suffix}USERNAME`] : window.USERNAME;
        // @ts-ignore
        const password = isReal(window[`${suffix}PASSWORD`]) ? window[`${suffix}PASSWORD`] : window.PASSWORD;
        if (isReal(username) && isReal(password)) {
            rawConfigs.push({ 
                url: window.SERVER_URL, 
                type: window.SERVER_TYPE || 'jellyfin', 
                webTitle: window.WEB_TITLE || 'HMusic', 
                username, 
                password,
                nodeIndex: 1 
            });
        }
    }

    for (let i = 1; i <= 5; i++) {
        // @ts-ignore
        const url = window[`SERVER_URL${i}`];
        if (isReal(url)) {
            // @ts-ignore
            const username = isReal(window[`${suffix}USERNAME${i}`]) ? window[`${suffix}USERNAME${i}`] : window[`USERNAME${i}`];
            // @ts-ignore
            const password = isReal(window[`${suffix}PASSWORD${i}`]) ? window[`${suffix}PASSWORD${i}`] : window[`PASSWORD${i}`];
            // @ts-ignore
            const type = window[`SERVER_TYPE${i}`];
            // @ts-ignore
            const webTitle = window[`WEB_TITLE${i}`];

            if (isReal(username) && isReal(password)) {
                rawConfigs.push({ 
                    url, 
                    type: type || 'jellyfin', 
                    webTitle: webTitle || 'HMusic', 
                    username, 
                    password,
                    nodeIndex: i 
                });
            }
        }
    }

    // 2. Deduplicate by URL and Map to Proxy Paths
    const seenUrls = new Set<string>();
    const finalConfigs: MultiServerConfig[] = [];

    for (const raw of rawConfigs) {
        const normalizedUrl = raw.url.replace(/\/$/, '');
        if (seenUrls.has(normalizedUrl)) continue;
        
        seenUrls.add(normalizedUrl);
        finalConfigs.push({
            password: raw.password,
            type: raw.type,
            url: `/api/server${raw.nodeIndex}`, // Use clean proxy path
            username: raw.username,
            webTitle: raw.webTitle
        });
    }

    return finalConfigs;
};
