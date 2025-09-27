import { createClient } from "@supabase/supabase-js";
import {
  createBrowserClient,
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DATABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-for-build';

// Only throw error at runtime, not during build
if (typeof window !== 'undefined' && (!supabaseUrl || supabaseAnonKey === 'dummy-key-for-build')) {
  console.warn("Supabase environment variables not configured properly");
}

// Client-side Supabase client
export const createClientComponentClient = () => {
  if (!supabaseUrl || supabaseAnonKey === 'dummy-key-for-build') {
    return null; // Return null during build time
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// Server-side Supabase client for Server Components
export const createServerComponentClient = () => {
  if (!supabaseUrl || supabaseAnonKey === 'dummy-key-for-build') {
    return null; // Return null during build time
  }
  
  const { cookies } = require("next/headers");

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookies().get(name)?.value;
      },
    },
  });
};

// Server-side Supabase client for Route Handlers
export const createRouteHandlerClient = (request: NextRequest) => {
  if (!supabaseUrl || supabaseAnonKey === 'dummy-key-for-build') {
    return null; // Return null during build time
  }
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: "",
          ...options,
        });
      },
    },
  });
};

// Server-side Supabase client for Middleware
export const createMiddlewareClient = (
  request: NextRequest,
  response: NextResponse
) => {
  if (!supabaseUrl || supabaseAnonKey === 'dummy-key-for-build') {
    return null; // Return null during build time
  }
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({
          name,
          value: "",
          ...options,
        });
      },
    },
  });
};

// Admin client with service role key for privileged operations
export const createAdminClient = () => {
  if (!supabaseUrl || supabaseAnonKey === 'dummy-key-for-build') {
    return null; // Return null during build time
  }
  
  const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-key';

  if (!serviceKey || serviceKey === 'dummy-service-key') {
    // Use anon key as fallback during build or when service key is missing
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export { supabaseUrl, supabaseAnonKey };
