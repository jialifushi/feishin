import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Center, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { toast } from '/@/shared/components/toast/toast';
import { useAuthStoreActions } from '/@/renderer/store';
import { FaKey } from 'react-icons/fa';

export const AuthCodePage = () => {
    const [code, setCode] = useState('');
    const [error, setError] = useState(false);
    const navigate = useNavigate();
    const { setAuthenticated } = useAuthStoreActions();

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            // @ts-ignore
            const allowCode = window.ALLOW_CODE;
            if (code === allowCode) {
                setAuthenticated(true);
                toast.success({ message: 'Authentication successful!' });
                navigate('/home'); // Corrected navigation
            } else {
                setError(true);
                toast.error({ message: 'Invalid authentication code.' });
            }
        }
    };

    return (
        <Center h="100vh">
            <Stack align="center" maw={400}>
                <FaKey color="gray" size={64} />
                <Title order={1}>Authentication Required</Title>
                <Text c="dimmed" size="lg" ta="center">
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
                />
            </Stack>
        </Center>
    );
};