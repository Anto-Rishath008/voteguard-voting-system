import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outlined" | "elevated";
}

export function Card({ children, className, variant = "default" }: CardProps) {
  const variantClasses = {
    default: "bg-white border border-gray-200",
    outlined: "bg-white border-2 border-gray-300",
    elevated: "bg-white shadow-lg border border-gray-100",
  };

  return (
    <div className={cn("rounded-lg", variantClasses[variant], className)}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn("px-6 py-4 border-b border-gray-200", className)}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("px-6 py-4", className)}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn("text-lg font-semibold text-gray-900", className)}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn("text-sm text-gray-600 mt-1", className)}>{children}</p>
  );
}

// Election Card - Specialized card for elections
interface ElectionCardProps {
  election: {
    election_id: string;
    election_name: string;
    description?: string;
    start_date: string;
    end_date: string;
    status: string;
  };
  onView?: (electionId: string) => void;
  onEdit?: (electionId: string) => void;
  showActions?: boolean;
}

export function ElectionCard({
  election,
  onView,
  onEdit,
  showActions = true,
}: ElectionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card
      variant="elevated"
      className="hover:shadow-xl transition-shadow duration-200"
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{election.election_name}</CardTitle>
            <CardDescription>{election.description}</CardDescription>
          </div>
          <span
            className={cn(
              "px-2 py-1 text-xs font-medium rounded-full",
              getStatusColor(election.status)
            )}
          >
            {election.status}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium">Start:</span>
            <span className="ml-2">
              {new Date(election.start_date).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium">End:</span>
            <span className="ml-2">
              {new Date(election.end_date).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
      {showActions && (
        <CardFooter>
          <div className="flex items-center gap-2">
            {onView && (
              <button
                onClick={() => onView(election.election_id)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                View Details
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(election.election_id)}
                className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
