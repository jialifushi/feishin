import { closeAllModals, openModal } from '@mantine/modals';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import packageJson from '../../package.json';

import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { useLocalStorage } from '/@/shared/hooks/use-local-storage';

interface ReleaseNotesContentProps {
    onDismiss: () => void;
    version: string;
}

const ReleaseNotesContent = ({ onDismiss, version }: ReleaseNotesContentProps) => {
    const { t } = useTranslation();

    return (
        <Stack gap="md">
            <Text size="md">
                Current version: {version}
            </Text>
            <Text size="sm" c="dimmed">
                You are running the latest version of the application. All features are up to date.
            </Text>
            <Group justify="flex-end">
                <Button onClick={onDismiss} variant="filled">
                    {t('common.dismiss')}
                </Button>
            </Group>
        </Stack>
    );
};

const WAIT_FOR_LOCAL_STORAGE = 1000 * 2;

interface ReleaseNotesModalContentWrapperProps {
    setDismissRef?: (fn: (() => void) | undefined) => void;
}

const ReleaseNotesModalContentWrapper = ({
    setDismissRef,
}: ReleaseNotesModalContentWrapperProps) => {
    const { version } = packageJson;
    const [, setValue] = useLocalStorage({ key: 'version' });

    const handleDismiss = useCallback(() => {
        setValue(version);
        closeAllModals();
    }, [setValue, version]);

    useEffect(() => {
        setDismissRef?.(handleDismiss);
        return () => setDismissRef?.(undefined);
    }, [handleDismiss, setDismissRef]);

    return <ReleaseNotesContent onDismiss={handleDismiss} version={version} />;
};

export const openReleaseNotesModal = (title: string) => {
    const dismissRef = { current: null as (() => void) | null };

    openModal({
        children: (
            <ReleaseNotesModalContentWrapper
                setDismissRef={(fn) => {
                    dismissRef.current = fn ?? null;
                }}
            />
        ),
        onClose: () => dismissRef.current?.(),
        size: 'md',
        title,
    });
};

export const ReleaseNotesModal = () => {
    const { version } = packageJson;
    const { t } = useTranslation();
    const dismissRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const valueFromLocalStorage = localStorage.getItem('version');
            const versionString = `"${version}"`;

            // Only show modal if the stored version is different from current version
            if (valueFromLocalStorage !== versionString) {
                openModal({
                    children: (
                        <ReleaseNotesModalContentWrapper
                            setDismissRef={(fn) => {
                                dismissRef.current = fn ?? null;
                            }}
                        />
                    ),
                    onClose: () => dismissRef.current?.(),
                    size: 'md',
                    title: t('common.newVersion', { version }) as string,
                });
            }
        }, WAIT_FOR_LOCAL_STORAGE);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [t, version]);

    return null;
};
