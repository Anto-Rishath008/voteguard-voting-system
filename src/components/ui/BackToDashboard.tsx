"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

interface BackToDashboardProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  className?: string;
}

export function BackToDashboardButton({ variant = "outline", className = "" }: BackToDashboardProps) {
  const router = useRouter();
  const { getDashboardPath } = useAuth();

  const handleClick = () => {
    const dashboardPath = getDashboardPath();
    router.push(dashboardPath);
  };

  return (
    <Button onClick={handleClick} variant={variant} className={className}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back to Dashboard
    </Button>
  );
}
