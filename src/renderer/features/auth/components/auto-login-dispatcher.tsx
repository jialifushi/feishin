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

const MAX_RETRIES_PER_SERVER = 3;
const FAILED_ALL_SERVERS_KEY = 'hmusic_all_servers_failed';

const AutoLoginDispatcher = () => {
    const navigate = useNavigate();
    const { addServer, setCurrentServer, setAuthenticated } = useAuthStoreActions();
    const [logs, setLog] = useState<string[]>(['[SYSTEM] Booting kernel...', '[SYSTEM] Verifying security layers...']);
    const logEndRef = useRef<HTMLDivElement>(null);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const currentServer = useAuthStore((s) => s.currentServer);
    const isConnectingRef = useRef(false);
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
        // Handle cache clearing logic if all servers failed previously
        if (localStorage.getItem(FAILED_ALL_SERVERS_KEY)) {
            addLog('[CRITICAL] System failure detected. Forced purge initiated.');
            localStorage.clear();
            localStorage.removeItem(FAILED_ALL_SERVERS_KEY);
            addLog('[SUCCESS] Cache purged. Restarting sequence...');
            setTimeout(() => window.location.reload(), 1500);
            return;
        }

        if (isAuthenticated) {
            navigate(AppRoute.HOME);
            return;
        }

        const checkAuthAndStart = () => {
            // @ts-ignore
            const allowCode = window.ALLOW_CODE;
            const pinVerified = sessionStorage.getItem('pin_verified') === 'true';

            if (allowCode && !pinVerified) {
                navigate('/auth-code');
                return;
            }

            // If we reach here, we either don't need a PIN or it's already verified
            setShowTerminal(true);
            performAutoLogin();
        };

        const performAutoLogin = async () => {
            if (isConnectingRef.current) return;
            isConnectingRef.current = true;

            const configs = getMultiServerConfigs();
            const multiEnabled = isMultiServerEnabled();

            if (configs.length === 0) {
                addLog('[ERROR] No valid uplink nodes defined. Switching to manual...');
                setTimeout(() => navigate(AppRoute.LOGIN), 2000);
                return;
            }

            addLog(`[SYSTEM] Syncing with ${configs.length} uplink(s). Mode: ${multiEnabled ? 'PARALLEL_FAILOVER' : 'SINGLE'}`);

            let success = false;

            for (let i = 0; i < configs.length; i++) {
                const config = configs[i];
                addLog(`[NODE 0x0${i + 1}] Handshaking with ${config.url}...`);
                
                for (let retry = 1; retry <= MAX_RETRIES_PER_SERVER; retry++) {
                    addLog(`[NODE 0x0${i + 1}] Link attempt ${retry}/${MAX_RETRIES_PER_SERVER}...`);
                    
                    try {
                        const authFunction = api.controller.authenticate;
                        if (!authFunction) throw new Error('Kernel module 0xF1 offline.');

                        const serverType = toServerType(config.type);
                        if (!serverType) throw new Error('Protocol mismatch.');

                        addLog(`[NODE 0x0${i + 1}] Injecting tokens for ${config.username}...`);
                        
                        const data: AuthenticationResponse | undefined = await authFunction(
                            config.url,
                            { legacy: false, password: config.password, username: config.username },
                            serverType,
                        );

                        if (!data) throw new Error('Node rejected decryption keys.');

                        addLog(`[SUCCESS] Encryption tunnel established with NODE 0x0${i + 1}.`);
                        addLog(`[SYSTEM] Initializing profile: ${config.webTitle}...`);
                        
                        // Update WEB_TITLE dynamically
                        // @ts-ignore
                        window.WEB_TITLE = config.webTitle;
                        document.title = config.webTitle;

                        const serverItem: ServerListItemWithCredential = {
                            credential: data.credential,
                            id: nanoid(),
                            name: config.webTitle || 'Remote Node',
                            type: serverType,
                            url: config.url.replace(/\/$/, ''),
                            userId: data.userId,
                            username: data.username,
                        };
                        if (data.ndCredential !== undefined) serverItem.ndCredential = data.ndCredential;

                        addServer(serverItem);
                        setCurrentServer(serverItem);

                        addLog('[SYSTEM] System check: PASSED. Loading UI...');
                        setAuthenticated(true);
                        setTimeout(() => navigate(AppRoute.HOME), 1500);
                        
                        success = true;
                        break;
                    } catch (error: any) {
                        addLog(`[WARNING] Connection dropped: ${error.message || 'Packet Loss'}`);
                        if (retry < MAX_RETRIES_PER_SERVER) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }

                if (success) break;
                addLog(`[NODE 0x0${i + 1}] Signal lost. Switching to backup frequency...`);
            }

            if (!success) {
                addLog('[CRITICAL] TOTAL SYSTEM FAILURE. EMERGENCY LOCKDOWN.');
                localStorage.setItem(FAILED_ALL_SERVERS_KEY, 'true');
                addLog('[ACTION] Hardware reset recommended. Refresh page to purge memory.');
                isConnectingRef.current = false;
            }
        };

        const handleSettingsLoaded = () => {
            checkAuthAndStart();
        }

        // Listen for the custom event that settings.js dispatches
        window.addEventListener('settings-loaded', handleSettingsLoaded);
        
        // @ts-ignore
        if (window.USERNAME !== undefined || window.SERVER_URL1 !== undefined) {
            handleSettingsLoaded();
        }

        return () => {
            window.removeEventListener('settings-loaded', handleSettingsLoaded);
        };

    }, [isAuthenticated, currentServer, navigate, addServer, setCurrentServer, setAuthenticated]);

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
