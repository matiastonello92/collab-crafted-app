'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="min-h-[100svh] bg-background px-6 py-12 text-foreground">
      <main className="mx-auto flex max-w-xl flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-semibold">Si è verificato un errore</h1>
          <p className="mt-2 text-sm text-muted-foreground">Riprova più tardi.</p>
        </div>
        {process.env.NODE_ENV !== 'production' && (
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{error.message}</pre>
        )}
      </main>
    </div>
  );
}

