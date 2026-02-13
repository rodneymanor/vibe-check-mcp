"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const navLinks = [
    { name: "Tools", href: "#tools" },
    { name: "Install", href: "#install" },
    { name: "GitHub", href: "https://github.com/rodneymanor/vibe-check-mcp" },
];

function HamburgerButton({
    isOpen,
    onClick,
}: {
    isOpen: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="md:hidden relative z-50 flex size-8 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-accent"
            aria-label="Toggle menu"
        >
            <div className="relative size-5 flex items-center justify-center">
                <motion.span
                    className="absolute h-0.5 w-4 bg-foreground"
                    initial={false}
                    animate={
                        isOpen
                            ? { rotate: 45, y: 0 }
                            : { rotate: 0, y: -4 }
                    }
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                />
                <motion.span
                    className="absolute h-0.5 w-4 bg-foreground"
                    initial={false}
                    animate={
                        isOpen
                            ? { rotate: -45, y: 0 }
                            : { rotate: 0, y: 4 }
                    }
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                />
            </div>
        </button>
    );
}

function MobileNav({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
                        style={{ top: "64px" }}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-16 left-0 right-0 z-50 bg-background border-b border-border shadow-lg md:hidden"
                    >
                        <nav className="flex flex-col p-6 gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={onClose}
                                    className="px-3 py-3 text-base font-medium text-foreground hover:text-accent-foreground transition-colors"
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </nav>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export function Navbar() {
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY < 10) {
                setIsVisible(true);
            } else if (currentScrollY > lastScrollY) {
                setIsVisible(false);
            } else if (currentScrollY < lastScrollY) {
                setIsVisible(true);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isMobileMenuOpen]);

    return (
        <motion.header
            initial={{ y: 0 }}
            animate={{ y: isVisible ? 0 : -100 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed top-0 left-0 right-0 z-50 border-b bg-background"
        >
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                <Link
                    href="/"
                    className="flex items-center gap-2.5 text-lg font-semibold"
                >
                    <Logo size="sm" />
                    <span className="text-xl font-bold tracking-tight">vibe-check</span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="inline-flex h-8 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button
                        asChild
                        className="hidden md:flex rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        <a href="https://github.com/rodneymanor/vibe-check-mcp">
                            Star on GitHub
                        </a>
                    </Button>
                    <HamburgerButton
                        isOpen={isMobileMenuOpen}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    />
                </div>
            </div>

            <MobileNav
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />
        </motion.header>
    );
}
