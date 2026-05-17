import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Center, PasswordInput, Stack, Text, Title, Paper, Image } from '@mantine/core';
import { toast } from '/@/shared/components/toast/toast';
import { useAuthStoreActions } from '/@/renderer/store';
import authIcon from '/@/renderer/assets/auth/brand-logo.png';

const AuthCodePage = () => {
    const [code, setCode] = useState('');
    const [error, setError] = useState(false);
    const navigate = useNavigate();
    const { setAuthenticated } = useAuthStoreActions();

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            let matchedSuffix = null;
            
            // Check for legacy single ALLOW_CODE first
            // @ts-ignore
            if (window.ALLOW_CODE && code === window.ALLOW_CODE) {
                matchedSuffix = 'default';
                console.log('[AUTH] Matched legacy ALLOW_CODE');
            } else {
                // Iterate through all window keys to find matching ALLOW_CODE_x
                // We use find to stop at the first match to prevent overwriting
                const matchedKey = Object.keys(window).find(key => {
                    if (key.startsWith('ALLOW_CODE_')) {
                        // @ts-ignore
                        return window[key] === code;
                    }
                    return false;
                });

                if (matchedKey) {
                    matchedSuffix = matchedKey.replace('ALLOW_CODE_', '');
                    console.log(`[AUTH] Matched user suffix: ${matchedSuffix} (from ${matchedKey})`);
                }
            }

            if (matchedSuffix) {
                console.log(`[AUTH] Verification successful. Suffix: ${matchedSuffix}`);
                sessionStorage.setItem('pin_verified', 'true');
                sessionStorage.setItem('user_suffix', matchedSuffix);
                navigate('/'); 
            } else {
                setError(true);
                toast.error({ message: 'Invalid authentication code.' });
            }
        }
    };

    return (
        <Center h="100vh" style={{ background: 'var(--mantine-color-body)', color: 'var(--mantine-color-text)' }}>
            <Paper p="xl" radius="md" withBorder shadow="md" style={{ maxWidth: 400, width: '90%' }}>
                <Stack align="center" gap="lg">
                    <Image src={authIcon} w={120} h={120} radius="md" fallbackSrc="https://placehold.co/120x120?text=Music" />
                    <Title order={2} ta="center">Authentication Required</Title>
                    <Text c="dimmed" size="sm" ta="center">
                        Please enter the authentication code to continue.
                    </Text>
                    <PasswordInput
                        autoFocus
                        error={error}
                        label="Authentication Code"
                        onChange={(event) => {
                            setCode(event.currentTarget.value);
                            setError(false);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter code and press Enter"
                        value={code}
                        w="100%"
                        size="md"
                    />
                </Stack>
            </Paper>
        </Center>
    );
};

export default AuthCodePage;