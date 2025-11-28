import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minuti
            cacheTime: 1000 * 60 * 30, // 30 minuti
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});
