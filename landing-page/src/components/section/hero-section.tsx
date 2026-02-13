"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Copy to clipboard"
        >
            {copied ? (
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )}
        </button>
    );
}

export function HeroSection() {
    return (
        <section className="relative flex flex-col items-center justify-center px-6 py-20 md:py-28">
            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-6 max-w-3xl mx-auto">
                {/* Badge */}
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full shadow-badge bg-card text-sm font-medium">
                    <span className="text-green-500">●</span>
                    Free &amp; open source &middot; MIT License
                </div>

                {/* Tool name */}
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">
                    vibe-check
                </h1>

                {/* One-line description */}
                <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl">
                    An MCP server that keeps AI coding agents focused.
                    <br className="hidden md:block" />
                    {" "}Zero LLM calls. Zero API keys. Pure guardrails.
                </p>

                {/* Install command */}
                <div className="w-full max-w-md">
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm">
                        <span className="text-muted-foreground select-none">$</span>
                        <code className="flex-1 text-foreground select-all">npx -y vibe-check-mcp</code>
                        <CopyButton text="npx -y vibe-check-mcp" />
                    </div>
                </div>

                {/* CTAs */}
                <div className="flex items-center gap-3 pt-2">
                    <Button
                        asChild
                        size="lg"
                        className={cn(
                            "rounded-full px-8 py-6 text-base font-medium text-primary-foreground",
                            "bg-linear-to-b from-sky-500 to-sky-600",
                            "shadow-[0px_1px_2px_0px_#00000016,0px_2px_4px_0px_#00000006,inset_0px_0px_1.5px_#0084D1,inset_0px_2.5px_0px_#ffffff16,inset_0px_0px_2.5px_#ffffff08]",
                            "ring-2 ring-sky-600 hover:from-sky-600 hover:to-sky-700",
                        )}
                    >
                        <a href="https://github.com/rodneymanor/vibe-check-mcp">
                            View on GitHub
                        </a>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="rounded-full px-8 py-6 text-base font-medium"
                    >
                        <a href="https://github.com/rodneymanor/vibe-check-mcp#quick-start">
                            Get Started
                        </a>
                    </Button>
                </div>
            </div>
        </section>
    );
}
