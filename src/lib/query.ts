import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import * as Network from 'expo-network';
import { AppState, Platform } from 'react-native';

const DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Must outlive the persisted cache, or nothing is restored on launch.
      gcTime: DAY,
      retry: 1,
    },
  },
});

/** What was last seen is on screen at once when the app opens, then refreshed. */
export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: createAsyncStoragePersister({ storage: AsyncStorage, key: 'sevenlights.cache.v1' }),
  maxAge: DAY,
  dehydrateOptions: {
    // Signed file URLs expire and feeds go stale fast; neither is worth keeping.
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' && query.queryKey[0] !== 'explore',
  },
};

// React Query's defaults listen to the browser; teach it about the phone.
if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) => {
    const subscription = Network.addNetworkStateListener((state) => {
      setOnline(state.isConnected !== false);
    });
    return () => subscription.remove();
  });
  AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
}

/** Turns whatever a failed request threw into a line that can be shown. */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}
