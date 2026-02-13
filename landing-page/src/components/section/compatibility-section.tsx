import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const clients = [
    { name: "Claude Code", detail: "CLI" },
    { name: "Claude Desktop", detail: "App" },
    { name: "Cursor", detail: "IDE" },
    { name: "Windsurf", detail: "IDE" },
    { name: "Codex CLI", detail: "CLI" },
    { name: "Any MCP Client", detail: "Protocol" },
];

export function CompatibilitySection() {
    return (
        <section id="install" className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-border">
                {/* Left: install steps */}
                <div className="col-span-4 p-8 md:p-14 space-y-8">
                    <div className="space-y-2">
                        <h2 className="text-3xl md:text-4xl font-medium tracking-tighter">
                            Install in 30 seconds
                        </h2>
                        <p className="text-muted-foreground">
                            Works with any MCP-compatible client. Pick your setup.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Claude Code */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-foreground">Claude Code (recommended)</h3>
                            <div className="rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm text-muted-foreground">
                                claude mcp add vibe-check -- npx -y vibe-check-mcp
                            </div>
                        </div>

                        {/* npx */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-foreground">npx (any MCP client)</h3>
                            <div className="rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm text-muted-foreground">
                                npx -y vibe-check-mcp
                            </div>
                        </div>

                        {/* JSON config */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-foreground">MCP config (JSON)</h3>
                            <div className="rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm text-muted-foreground whitespace-pre">{`{
  "mcpServers": {
    "vibe-check": {
      "command": "npx",
      "args": ["-y", "vibe-check-mcp"]
    }
  }
}`}</div>
                        </div>
                    </div>

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
                </div>

                {/* Right: compatible clients */}
                <div className="col-span-2 p-8 md:p-14 space-y-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Works with
                    </h3>
                    <div className="space-y-4">
                        {clients.map((client) => (
                            <div key={client.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                <span className="text-sm font-medium text-foreground">{client.name}</span>
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{client.detail}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
