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
    const configs: MultiServerConfig[] = [];
    
    // Check main config first if multi-server is disabled or as a fallback
    if (window.SERVER_URL && window.USERNAME && window.PASSWORD) {
        configs.push({
            password: window.PASSWORD,
            type: window.SERVER_TYPE || 'jellyfin',
            url: window.SERVER_URL,
            username: window.USERNAME,
            webTitle: window.WEB_TITLE || 'HMusic',
        });
    }

    // Check numbered configs
    for (let i = 1; i <= 5; i++) {
        // @ts-ignore
        const url = window[`SERVER_URL${i}`];
        // @ts-ignore
        const username = window[`USERNAME${i}`];
        // @ts-ignore
        const password = window[`PASSWORD${i}`];
        // @ts-ignore
        const type = window[`SERVER_TYPE${i}`];
        // @ts-ignore
        const webTitle = window[`WEB_TITLE${i}`];

        if (url && username && password) {
            configs.push({
                password,
                type: type || 'jellyfin',
                url,
                username,
                webTitle: webTitle || 'HMusic',
            });
        }
    }

    return configs;
};
