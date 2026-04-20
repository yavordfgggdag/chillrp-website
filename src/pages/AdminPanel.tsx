import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const AdminPanelFull = lazy(() => import("./AdminPanelFull"));

export default function AdminPanel() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background pt-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Зареждане на админ панела...</p>
        </div>
      }
    >
      <AdminPanelFull />
    </Suspense>
  );
}
