import { Center, Stack, Text, Title, Image, Paper } from '@mantine/core';
import authIcon from '/@/renderer/assets/auth/brand-logo.png';

const MaintenancePage = () => {
    return (
        <Center h="100vh" style={{ background: 'var(--mantine-color-body)', color: 'var(--mantine-color-text)' }}>
            <Paper p="xl" radius="md" withBorder shadow="md" style={{ maxWidth: 500, width: '90%' }}>
                <Stack align="center" gap="lg">
                    <Image src={authIcon} w={120} h={120} radius="md" fallbackSrc="https://placehold.co/120x120?text=Maintenance" />
                    <Title order={2} ta="center">System Maintenance</Title>
                    <Text ta="center" size="lg">
                        We are currently performing scheduled maintenance. 
                    </Text>
                    <Text ta="center" c="dimmed">
                        Please check back later. If you believe this is an error, please contact your administrator.
                    </Text>
                </Stack>
            </Paper>
        </Center>
    );
};

export default MaintenancePage;
