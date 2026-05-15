import { memo } from 'react';
import { Fragment } from 'react/jsx-runtime';

import { AnalyticsSettings } from '/@/renderer/features/settings/components/advanced/analytics-settings';
import { ExportImportSettings } from '/@/renderer/features/settings/components/advanced/export-import-settings';
import { LoggerSettings } from '/@/renderer/features/settings/components/advanced/logger-settings';
import { CacheSettings } from '/@/renderer/features/settings/components/window/cache-settngs';
import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import { Divider } from '/@/shared/components/divider/divider';
import { Stack } from '/@/shared/components/stack/stack';

export const AdvancedTab = memo(() => {
    const isLocked = isServerLock();
    
    return (
        <Stack gap="md">
            <AnalyticsSettings />
            {!isLocked && (
                <Fragment>
                    <Divider />
                    <ExportImportSettings />
                </Fragment>
            )}
            <Divider />
            <LoggerSettings />
            <Divider />
            <CacheSettings />
        </Stack>
    );
});
