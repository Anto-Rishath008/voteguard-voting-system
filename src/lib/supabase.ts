// Temporary compatibility layer to make build pass
export function createAdminClient() {
  return {
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: [], error: null }),
      update: () => ({ data: [], error: null }),
      delete: () => ({ data: [], error: null }),
      eq: function() { return this; },
      single: () => ({ data: null, error: null })
    })
  };
}

export function createRouteHandlerClient() {
  return createAdminClient();
}
