import { Center, Stack, Text, Title } from '@mantine/core';
import { FaTools } from 'react-icons/fa';

export const MaintenancePage = () => (
    <Center h="100vh">
        <Stack align="center">
            <FaTools color="gray" size={64} />
            <Title order={1}>Service Unavailable</Title>
            <Text c="dimmed" size="lg">
                The service is currently being upgraded and maintained.
            </Text>
            <Text c="dimmed" size="lg">
                Please contact the service provider.
            </Text>
        </Stack>
    </Center>
);
