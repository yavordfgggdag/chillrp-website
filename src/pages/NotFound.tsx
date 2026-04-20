import { useLocation, Link } from "react-router-dom";

const NotFound = () => {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-heading font-black text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground font-body">Страницата не е намерена.</p>
        {pathname && pathname !== "/" && <p className="mb-4 text-sm text-muted-foreground/80 font-mono">{pathname}</p>}
        <Link to="/" className="inline-block px-6 py-3 rounded-xl bg-primary/20 border border-primary/40 text-primary font-heading font-bold hover:bg-primary/30 transition-colors">
          Към началната
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
