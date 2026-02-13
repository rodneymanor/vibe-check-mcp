import { cn } from "@/lib/utils";

export function Logo({ className, size = "sm" }: { className?: string; size?: "sm" | "lg" }) {
    const sizeClasses = size === "lg" ? "size-12 rounded-xl" : "size-8 rounded-lg";
    const textSize = size === "lg" ? "text-lg" : "text-sm";

    return (
        <div
            className={cn(
                "inline-flex items-center justify-center bg-foreground text-background font-mono font-bold shrink-0",
                sizeClasses,
                className,
            )}
        >
            <span className={textSize}>&gt;_</span>
        </div>
    );
}
