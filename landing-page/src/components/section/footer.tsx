import Link from "next/link";

export function Footer() {
    return (
        <footer className="w-full">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 md:p-8">
                <p className="text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} vibe-check. MIT License.
                </p>
                <div className="flex items-center gap-6">
                    <Link
                        href="https://github.com/rodneymanor/vibe-check-mcp"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        GitHub
                    </Link>
                    <Link
                        href="https://www.npmjs.com/package/mcp-vibe-check"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        npm
                    </Link>
                    <Link
                        href="https://github.com/rodneymanor/vibe-check-mcp/issues"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Issues
                    </Link>
                </div>
            </div>
        </footer>
    );
}
