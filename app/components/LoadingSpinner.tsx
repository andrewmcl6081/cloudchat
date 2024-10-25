import { Loader2 } from "lucide-react";

type SpinnerSize = "small" | "default" | "large";

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size = "default", fullScreen = false }: LoadingSpinnerProps) {
  const sizeClasses: Record<SpinnerSize, string> = {
    small: "w-4 h-4",
    default: "w-8 h-8",
    large: "w-12 h-12"
  };

  const containerClasses = fullScreen
    ? "flex min-h-screen items-center justify-center"
    : "flex items-center justify-center p-4";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    </div>
  );
};

