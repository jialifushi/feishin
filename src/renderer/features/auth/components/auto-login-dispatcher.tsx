import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { nanoid } from 'nanoid';

import { api } from '/@/renderer/api';
import { Center, Stack, Text, Box, ScrollArea } from '@mantine/core';
import { useAuthStore, useAuthStoreActions } from '/@/renderer/store';
import { AuthenticationResponse, ServerListItemWithCredential } from '/@/shared/types/domain-types';
import { toServerType } from '/@/shared/types/types';
import { AppRoute } from '/@/renderer/router/routes';
import { getMultiServerConfigs, isMultiServerEnabled } from '/@/renderer/features/action-required/utils/window-properties';
import { sendLoginNotification } from '/@/renderer/utils/notification-service';

const MAX_RETRIES_PER_SERVER = 3;
const FAILED_ALL_SERVERS_KEY = 'hmusic_all_servers_failed';

const AutoLoginDispatcher = () => {
    const navigate = useNavigate();
    const { addServer, setCurrentServer, setAuthenticated } = useAuthStoreActions();
    const [logs, setLog] = useState<string[]>(['[SYSTEM] Booting kernel...', '[SYSTEM] Verifying security layers...']);
    const logEndRef = useRef<HTMLDivElement>(null);
    
    // Use ref to track internal state and prevent re-renders from triggering logic
    const bootSequenceStarted = useRef(false);
    const [showTerminal, setShowTerminal] = useState(false);

    const addLog = (message: string) => {
        setLog((prev) => [...prev, `> ${message}`]);
    };

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    useEffect(() => {
        // --- CORE BOOT LOGIC ---
        const runBootSequence = async () => {
            if (bootSequenceStarted.current) return;
            
            // Wait for window properties to be ready
            // @ts-ignore
            if (window.SERVER_LOCK === undefined || window.SERVER_LOCK.includes('${')) {
                console.log('[AUTH] System environment not ready...');
                return;
            }

            bootSequenceStarted.current = true;
            console.log('[AUTH] Boot Sequence Started.');

            // 1. Handle Critical Failure Recovery
            if (localStorage.getItem(FAILED_ALL_SERVERS_KEY)) {
                addLog('[CRITICAL] System failure detected. Forced purge initiated.');
                localStorage.clear();
                localStorage.removeItem(FAILED_ALL_SERVERS_KEY);
                addLog('[SUCCESS] Cache purged. Restarting...');
                setTimeout(() => window.location.reload(), 1000);
                return;
            }

            // 2. PIN Verification Layer
            const allowCodeKeys = Object.keys(window).filter(key => key.startsWith('ALLOW_CODE'));
            const hasAllowCode = allowCodeKeys.some(key => {
                const val = (window as any)[key];
                return val && val !== `\${${key}}` && val !== 'undefined';
            });
            const pinVerified = sessionStorage.getItem('pin_verified') === 'true';

            if (hasAllowCode && !pinVerified) {
                console.log('[AUTH] Gateway locked. PIN required.');
                navigate('/auth-code');
                return;
            }

            // 3. Authenticated State Check
            // Only skip sequence if we have BOTH authentication AND a selected server
            const isAlreadyAuth = useAuthStore.getState().isAuthenticated;
            const hasServer = useAuthStore.getState().currentServer;

            if (isAlreadyAuth && hasServer) {
                console.log('[AUTH] Active session with server found. Proceeding...');
                if (pinVerified && sessionStorage.getItem('login_notified') !== 'true') {
                    const configs = getMultiServerConfigs();
                    const config = configs[0] || { username: 'Cached User', webTitle: 'HMusic' };
                    sendLoginNotification(config.username, config.webTitle, 'success');
                    sessionStorage.setItem('login_notified', 'true');
                }
                navigate(AppRoute.HOME);
                return;
            }

            console.log('[AUTH] No active session or server. Starting auto-login sequence...');

            // 4. Perform Auto Login Sequence
            setShowTerminal(true);
            const configs = getMultiServerConfigs();
            const multiEnabled = isMultiServerEnabled();

            if (configs.length === 0) {
                addLog('[ERROR] No valid uplink nodes. Switching to manual...');
                setTimeout(() => navigate(AppRoute.LOGIN), 2000);
                return;
            }

            addLog(`[SYSTEM] Syncing with ${configs.length} nodes. Mode: ${multiEnabled ? 'FAILOVER' : 'SINGLE'}`);

            let sequenceSuccess = false;
            for (let i = 0; i < configs.length; i++) {
                const config = configs[i];
                addLog(`[NODE 0x0${i + 1}] Handshaking with [${config.webTitle}]...`);
                
                for (let retry = 1; retry <= MAX_RETRIES_PER_SERVER; retry++) {
                    addLog(`[NODE 0x0${i + 1}] Link attempt ${retry}/${MAX_RETRIES_PER_SERVER} [user: ${config.username}]...`);
                    
                    try {
                        const authFunction = api.controller.authenticate;
                        if (!authFunction) throw new Error('Kernel offline.');

                        const serverType = toServerType(config.type);
                        if (!serverType) throw new Error('Protocol mismatch.');

                        const data: AuthenticationResponse | undefined = await authFunction(
                            config.url,
                            { legacy: false, password: config.password, username: config.username },
                            serverType,
                        );

                        if (!data) throw new Error('Keys rejected.');

                        addLog(`[SUCCESS] Established tunnel with [${config.webTitle}].`);
                        
                        // Update environment
                        // @ts-ignore
                        window.WEB_TITLE = config.webTitle;
                        document.title = config.webTitle;

                        const serverItem: ServerListItemWithCredential = {
                            credential: data.credential,
                            id: nanoid(),
                            name: config.webTitle || 'Remote Node',
                            type: serverType,
                            url: config.url,
                            userId: data.userId,
                            username: data.username,
                        };
                        if (data.ndCredential !== undefined) serverItem.ndCredential = data.ndCredential;

                        addServer(serverItem);
                        setCurrentServer(serverItem);
                        setAuthenticated(true);
                        
                        if (sessionStorage.getItem('login_notified') !== 'true') {
                            sendLoginNotification(config.username, config.webTitle || 'HMusic Node', 'success');
                            sessionStorage.setItem('login_notified', 'true');
                        }
                        
                        addLog('[SYSTEM] System check: PASSED.');
                        setTimeout(() => navigate(AppRoute.HOME), 1000);
                        sequenceSuccess = true;
                        break;
                    } catch (error: any) {
                        let geekCode = 'ERR_SIG_LOSS';
                        if (error.message?.includes('504')) geekCode = 'ERR_TIMEOUT';
                        else if (error.message?.includes('401')) geekCode = 'ERR_AUTH_DENIED';
                        addLog(`[WARNING] Fail to link node [${config.webTitle}] -> ${geekCode}`);
                        if (retry < MAX_RETRIES_PER_SERVER) await new Promise(r => setTimeout(r, 800));
                    }
                }
                if (sequenceSuccess) break;
            }

            if (!sequenceSuccess) {
                addLog('[CRITICAL] TOTAL SYSTEM FAILURE.');
                const userSuffix = sessionStorage.getItem('user_suffix') || 'default';
                sendLoginNotification(`Suffix: ${userSuffix}`, 'ALL_NODES', 'failure');
                localStorage.setItem(FAILED_ALL_SERVERS_KEY, 'true');
                isConnectingRef.current = false;
            }
        };

        const handleSettingsLoaded = () => runBootSequence();
        window.addEventListener('settings-loaded', handleSettingsLoaded);
        runBootSequence();

        return () => window.removeEventListener('settings-loaded', handleSettingsLoaded);
    }, []); // Empty dependencies ensure this only runs once on mount

    if (!showTerminal) {
        return <Box style={{ background: '#000', height: '100vh', width: '100vw' }} />;
    }

    return (
        <Center h="100vh" style={{ background: '#000', color: '#00ff00', fontFamily: 'monospace' }}>
            <Box style={{ 
                width: '85%', 
                maxWidth: '900px', 
                height: '75vh', 
                border: '1px solid #00ff00', 
                padding: '25px',
                position: 'relative',
                boxShadow: '0 0 30px rgba(0, 255, 0, 0.15)',
                overflow: 'hidden'
            }}>
                <Box style={{ 
                    position: 'absolute', 
                    top: '-12px', 
                    left: '20px', 
                    background: '#000', 
                    padding: '0 10px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    letterSpacing: '2px'
                }}>
                    HMUSIC_TERMINAL_V2.1
                </Box>
                <ScrollArea h="100%" type="never">
                    <Stack gap="xs">
                        {logs.map((log, i) => (
                            <Text key={i} size="sm" style={{ 
                                wordBreak: 'break-all', 
                                textShadow: '0 0 4px #00ff00',
                                opacity: i === logs.length - 1 ? 1 : 0.8,
                                transition: 'opacity 0.3s'
                            }}>
                                {log}
                            </Text>
                        ))}
                        <Box ref={logEndRef} h={1} />
                    </Stack>
                </ScrollArea>
                <Box style={{ 
                    position: 'absolute', 
                    bottom: '10px', 
                    right: '20px',
                    fontSize: '11px',
                    opacity: 0.5,
                    fontStyle: 'italic'
                }}>
                    SECURE_UPLINK_ESTABLISHED // PID_{Math.floor(Math.random() * 9000) + 1000}
                </Box>
            </Box>
        </Center>
    );
};

export default AutoLoginDispatcher;
