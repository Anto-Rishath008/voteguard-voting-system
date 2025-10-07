"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import {
  Menu,
  X,
  Vote,
  Users,
  Settings,
  BarChart3,
  Shield,
  Home,
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut, isAdmin, isSuperAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Navigation items based on user role
  const getNavigationItems = () => {
    const items = [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: Home,
        current: pathname === "/dashboard",
      },
    ];

    // Add voter-specific items
    if (user) {
      items.push(
        {
          name: "Elections",
          href: "/elections",
          icon: Vote,
          current: pathname.startsWith("/elections"),
        },
        {
          name: "Profile",
          href: "/profile",
          icon: User,
          current: pathname === "/profile",
        }
      );
    }

    // Add admin-specific items
    if (isAdmin || isSuperAdmin) {
      items.push(
        {
          name: "Elections",
          href: "/admin/elections",
          icon: BarChart3,
          current: pathname.startsWith("/admin/elections"),
        },
        {
          name: "Users",
          href: "/admin/users",
          icon: Users,
          current: pathname.startsWith("/admin/users"),
        },
        {
          name: "Audit Logs",
          href: "/admin/audit",
          icon: Shield,
          current: pathname.startsWith("/admin/audit"),
        }
      );
    }

    // Add super admin-specific items
    if (isSuperAdmin) {
      items.push({
        name: "System Settings",
        href: "/super-admin/settings",
        icon: Settings,
        current: pathname.startsWith("/super-admin/settings"),
      });
    }

    return items;
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 flex z-40 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Mobile sidebar */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <Vote className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  VoteGuard
                </span>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      item.current
                        ? "bg-blue-100 text-blue-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                      "group flex items-center px-2 py-2 text-base font-medium rounded-md"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon
                      className={cn(
                        item.current
                          ? "text-blue-500"
                          : "text-gray-400 group-hover:text-gray-500",
                        "mr-4 h-6 w-6"
                      )}
                    />
                    {item.name}
                  </Link>
                ))}
              </nav>
              
              {/* Mobile logout button */}
              {user && (
                <div className="mt-6 px-2">
                  <button
                    onClick={() => {
                      setSidebarOpen(false);
                      handleSignOut();
                    }}
                    className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-red-600 hover:bg-red-50 hover:text-red-900 w-full"
                  >
                    <LogOut className="mr-4 h-6 w-6 text-red-400 group-hover:text-red-500" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <Vote className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                VoteGuard
              </span>
            </div>
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    item.current
                      ? "bg-blue-100 text-blue-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md"
                  )}
                >
                  <item.icon
                    className={cn(
                      item.current
                        ? "text-blue-500"
                        : "text-gray-400 group-hover:text-gray-500",
                      "mr-3 h-6 w-6"
                    )}
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
            
            {/* Desktop logout button */}
            {user && (
              <div className="px-2 pb-4">
                <button
                  onClick={handleSignOut}
                  className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 hover:text-red-900 w-full"
                >
                  <LogOut className="mr-3 h-6 w-6 text-red-400 group-hover:text-red-500" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <button
                  type="button"
                  className="border-r border-gray-200 pr-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </button>
              </div>

              <div className="flex items-center space-x-4">
                {user && (
                  <>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-700">
                        Welcome, {user.firstName} {user.lastName}
                      </span>
                      {user.roles && user.roles.length > 0 && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {user.roles.join(", ")}
                        </span>
                      )}
                    </div>
                    <Link href="/profile">
                      <Button variant="ghost" size="sm">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
