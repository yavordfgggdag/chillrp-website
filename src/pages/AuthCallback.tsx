import { Loader2 } from "lucide-react";

/** OAuth return URL; session exchange runs in LoginGate from query params. */
export default function AuthCallback() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
      <Loader2 className="h-8 w-8 text-primary animate-spin" aria-hidden />
      <p className="text-sm text-muted-foreground font-body">Завършване на вход...</p>
    </div>
  );
}
