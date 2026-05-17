import { useEffect, useMemo } from 'react';
import { Navigate, Outlet } from 'react-router';
import { shallow } from 'zustand/shallow';

import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import { AppRoute } from '/@/renderer/router/routes';
import { useAuthStore, useAuthStoreActions } from '/@/renderer/store';

const normalizeUrl = (url: string) => url.replace(/\/$/, '');

export const AppOutlet = () => {
    const { currentServer, isAuthenticated } = useAuthStore(
        (state) => ({
            currentServer: state.currentServer
                ? {
                      id: state.currentServer.id,
                      url: state.currentServer.url,
                  }
                : null,
            isAuthenticated: state.isAuthenticated,
        }),
        shallow,
    );
    const { deleteServer, setCurrentServer } = useAuthStoreActions();

    const hasServerLockMismatch = useMemo(() => {
        // Skip lock check if multi-server is enabled or not locked
        // @ts-ignore
        if (window.MULTI_SERVER === 'true' || !isServerLock() || !currentServer || !window.SERVER_URL) {
            return false;
        }

        const configuredUrl = normalizeUrl(window.SERVER_URL);
        const persistedUrl = normalizeUrl(currentServer.url);

        return configuredUrl !== persistedUrl;
    }, [currentServer]);

    useEffect(() => {
        if (hasServerLockMismatch && currentServer) {
            deleteServer(currentServer.id);
            setCurrentServer(null);
        }
    }, [currentServer, deleteServer, hasServerLockMismatch, setCurrentServer]);

    const isActionsRequired = !currentServer || hasServerLockMismatch || !isAuthenticated;

    if (isActionsRequired) {
        // Redirect to / so the AutoLoginDispatcher can handle the routing to login, maintenance, or auth-code
        return <Navigate replace to="/" />;
    }

    return <Outlet />;
};
