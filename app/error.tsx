'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center bg-background p-6 text-foreground">
      <main className="w-full max-w-xl space-y-3 text-center">
        <h1 className="text-2xl font-semibold">Si è verificato un errore</h1>
        <p className="text-sm text-muted-foreground">Riprova più tardi.</p>
        {process.env.NODE_ENV !== 'production' && (
          <pre className="mt-4 whitespace-pre-wrap text-left text-sm text-muted-foreground/80">
            {error.message}
          </pre>
        )}
      </main>
    </div>
  );
}

