import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { nanoid } from 'nanoid';

import { api } from '/@/renderer/api';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { toast } from '/@/shared/components/toast/toast';
import { useAuthStore, useAuthStoreActions } from '/@/renderer/store';
import { AuthenticationResponse, ServerListItemWithCredential } from '/@/shared/types/domain-types';
import { toServerType } from '/@/shared/types/types';

export const AutoLoginDispatcher = () => {
    const navigate = useNavigate();
    const { addServer, setCurrentServer, setAuthenticated } = useAuthStoreActions();
    const [status, setStatus] = useState('Initializing...');
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    useEffect(() => {
        if (isAuthenticated) {
            // If user is already authenticated (e.g. from a successful manual login),
            // navigate away immediately to prevent re-running auth logic.
            navigate('/home');
            return;
        }

        const performAutoLogin = async () => {
            setStatus('Authenticating...');
            // @ts-ignore
            const { USERNAME, PASSWORD, SERVER_URL, SERVER_TYPE, SERVER_NAME, ALLOW_CODE } = window;
            try {
                const authFunction = api.controller.authenticate;
                if (!authFunction) throw new Error('Authentication controller not available.');
                
                const serverType = toServerType(SERVER_TYPE);
                if (!serverType || !SERVER_URL) throw new Error('Server URL or Type is not configured.');

                const data: AuthenticationResponse | undefined = await authFunction(
                    SERVER_URL,
                    { legacy: false, password: PASSWORD, username: USERNAME },
                    serverType,
                );

                if (!data) throw new Error('Authentication failed. Please check credentials.');

                setStatus('Login successful. Finalizing...');
                const serverItem: ServerListItemWithCredential = {
                    credential: data.credential,
                    id: nanoid(),
                    name: SERVER_NAME || 'Auto-Login Server',
                    type: serverType,
                    url: SERVER_URL.replace(/\/$/, ''),
                    userId: data.userId,
                    username: data.username,
                };
                if (data.ndCredential !== undefined) serverItem.ndCredential = data.ndCredential;

                addServer(serverItem);
                setCurrentServer(serverItem);

                if (ALLOW_CODE) {
                    navigate('/auth-code');
                } else {
                    setAuthenticated(true);
                    navigate('/home'); // Navigate to home on success
                }
            } catch (error: any) {
                console.error('Auto-login failed:', error);
                navigate('/maintenance');
            }
        };
        
        const handleSettingsLoaded = () => {
            // @ts-ignore
            if (window.USERNAME && window.PASSWORD) {
                performAutoLogin();
            } else {
                // No pre-defined credentials, proceed to normal login
                navigate('/login');
            }
        }

        // Listen for the custom event that settings.js dispatches
        window.addEventListener('settings-loaded', handleSettingsLoaded);
        
        // Also check if settings are already loaded (e.g. from a cached script)
        // @ts-ignore
        if (window.USERNAME !== undefined) {
            handleSettingsLoaded();
        }

        return () => {
            window.removeEventListener('settings-loaded', handleSettingsLoaded);
        };

    }, [isAuthenticated, navigate, addServer, setCurrentServer, setAuthenticated]);

    return (
        <Center h="100vh">
            <Stack align="center">
                <Loader />
                <Text>{status}</Text>
            </Stack>
        </Center>
    );
};