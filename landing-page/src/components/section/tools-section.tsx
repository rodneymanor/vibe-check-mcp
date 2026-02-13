const tools = [
    {
        name: "pre_check",
        description: "Validates your plan before coding starts. Flags unauthorized files, forbidden patterns, and scope creep.",
    },
    {
        name: "spec",
        description: "Generates a structured feature spec with user stories, acceptance criteria, and edge cases.",
    },
    {
        name: "diff_review",
        description: "Compares your implementation against the original plan. Catches scope drift after coding.",
    },
    {
        name: "memory_bank_init",
        description: "Creates a persistent project memory with architecture decisions, tech context, and progress tracking.",
    },
    {
        name: "memory_bank_read",
        description: "Reads project context so your agent knows what was built yesterday. No more starting from scratch.",
    },
    {
        name: "memory_bank_update",
        description: "Updates project memory as you build. Keeps your agent aligned across sessions.",
    },
];

export function ToolsSection() {
    return (
        <section id="tools" className="w-full">
            <div className="p-8 md:p-14 space-y-2 border-b border-border">
                <h2 className="text-3xl md:text-4xl font-medium tracking-tighter">
                    6 tools. Zero LLM calls.
                </h2>
                <p className="text-muted-foreground text-balance">
                    Pure deterministic logic. No API keys, no token costs, no latency.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 divide-border">
                {tools.map((tool, i) => (
                    <div
                        key={tool.name}
                        className={cn(
                            "p-8 space-y-3",
                            i < 3 && "md:border-b md:border-border",
                            i % 3 !== 2 && "lg:border-r lg:border-border",
                            i % 2 === 0 && i < 4 && "md:border-r md:border-border",
                        )}
                    >
                        <h3 className="font-mono text-sm font-semibold text-foreground">
                            {tool.name}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {tool.description}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(" ");
}
