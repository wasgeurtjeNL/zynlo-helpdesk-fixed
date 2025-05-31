/**
 * Query options for different types of data
 * Use these presets to optimize caching behavior
 */

// For frequently changing data like messages and tickets
export const realtimeQueryOptions = {
  staleTime: 30 * 1000, // 30 seconds
  gcTime: 5 * 60 * 1000, // 5 minutes
  refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
}

// For semi-static data like users and teams
export const staticQueryOptions = {
  staleTime: 30 * 60 * 1000, // 30 minutes
  gcTime: 60 * 60 * 1000, // 1 hour
}

// For rarely changing data like settings
export const permanentQueryOptions = {
  staleTime: Infinity,
  gcTime: Infinity,
}

// For dashboard counts and statistics
export const dashboardQueryOptions = {
  staleTime: 60 * 1000, // 1 minute
  gcTime: 5 * 60 * 1000, // 5 minutes
  refetchInterval: 60 * 1000, // Auto-refetch every minute
} 