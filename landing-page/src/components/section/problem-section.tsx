export function ProblemSection() {
    return (
        <section className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                {/* Without */}
                <div className="p-8 md:p-14 space-y-6">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center size-6 rounded-full bg-red-500/10 text-red-500 text-xs font-bold">✕</span>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Without vibe-check</h3>
                    </div>
                    <div className="space-y-4">
                        <p className="text-foreground font-medium">&ldquo;Add a login page&rdquo;</p>
                        <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm space-y-2 text-muted-foreground">
                            <p>Creating src/auth/AuthProvider.tsx...</p>
                            <p>Creating src/auth/AuthContext.tsx...</p>
                            <p>Creating src/auth/useAuth.ts...</p>
                            <p>Creating src/auth/AuthGuard.tsx...</p>
                            <p>Creating src/auth/types.ts...</p>
                            <p>Installing next-auth, @auth/prisma-adapter...</p>
                            <p>Refactoring src/app/layout.tsx...</p>
                            <p>Creating src/middleware.ts...</p>
                            <p className="text-red-500">15 files changed, 847 insertions(+)</p>
                        </div>
                        <p className="text-sm text-muted-foreground">You asked for 1 page. You got an enterprise auth system.</p>
                    </div>
                </div>

                {/* With */}
                <div className="p-8 md:p-14 space-y-6">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center size-6 rounded-full bg-green-500/10 text-green-500 text-xs font-bold">✓</span>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">With vibe-check</h3>
                    </div>
                    <div className="space-y-4">
                        <p className="text-foreground font-medium">&ldquo;Add a login page&rdquo;</p>
                        <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm space-y-2 text-muted-foreground">
                            <p><span className="text-sky-500">pre_check:</span> Scanning project...</p>
                            <p><span className="text-yellow-500">⚠ WARNING:</span> 12 files outside scope</p>
                            <p><span className="text-yellow-500">⚠ WARNING:</span> 3 new dependencies flagged</p>
                            <p><span className="text-sky-500">Approved files:</span> src/app/login/page.tsx</p>
                            <p><span className="text-sky-500">Approved files:</span> src/app/login/actions.ts</p>
                            <p className="text-green-500">2 files changed, 94 insertions(+)</p>
                        </div>
                        <p className="text-sm text-muted-foreground">You asked for 1 page. You got 1 page.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
