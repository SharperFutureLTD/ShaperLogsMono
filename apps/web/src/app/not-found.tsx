import Link from 'next/link';

export const dynamic = 'force-static';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold font-mono text-primary">404</h1>
        <p className="text-xl text-muted-foreground font-mono">page not found</p>
        <Link
          href="/"
          className="inline-block font-mono text-sm text-primary hover:text-primary/80 underline"
        >
          → return home
        </Link>
      </div>
    </div>
  );
}
