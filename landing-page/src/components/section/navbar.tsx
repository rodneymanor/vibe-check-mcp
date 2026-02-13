"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { siteConfig } from "@/lib/config";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu";

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

function DesktopNav() {
  return (
    <NavigationMenu className="hidden md:flex">
      <NavigationMenuList className="gap-1">
        {siteConfig.nav.links.map((link) => (
          <NavigationMenuItem key={link.id}>
            <NavigationMenuLink
              asChild
              className="border border-transparent hover:border-border text-foreground rounded-full h-8 w-fit px-2 bg-transparent"
            >
              <Link
                href={link.href}
                className="group inline-flex h-8 w-fit items-center justify-center rounded-full bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
              >
                {link.name}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
      <NavigationMenuViewport className="shadow-2xl border border-border" />
    </NavigationMenu>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 bottom-0 z-50 w-full bg-background shadow-2xl md:hidden overflow-y-auto"
          >
            <div className="flex h-full flex-col">
              <nav className="flex-1 px-6 py-8 pb-32">
                <div className="grid grid-cols-1 gap-4">
                  {siteConfig.nav.links.map((link, index) => (
                    <motion.div
                      key={link.id}
                      initial={{
                        opacity: 0,
                        y: -30,
                        filter: "blur(10px)",
                        clipPath: "inset(100% 0% 0% 0%)",
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                        clipPath: "inset(0% 0% 0% 0%)",
                      }}
                      transition={{
                        delay: index * 0.1,
                        duration: 0.6,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <Link
                          href={link.href}
                          onClick={onClose}
                          className="block px-0 py-3 text-xl font-medium uppercase transition-colors hover:text-accent-foreground"
                        >
                          {link.name}
                        </Link>
                    </motion.div>
                  ))}
                </div>
              </nav>
              <div className="sticky bottom-0 w-full p-6 bg-background border-t border-border">
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 30,
                    filter: "blur(10px)",
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                  }}
                  transition={{
                    delay: 0.1,
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Button
                    onClick={onClose}
                    className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {siteConfig.cta}
                  </Button>
                </motion.div>
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 30,
                    filter: "blur(10px)",
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                  }}
                  transition={{
                    delay: 0.2,
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="mt-4 w-full px-0 py-3 text-center"
                >
                  <p className="text-sm text-muted-foreground">
                    Looking for a custom solution?{" "}
                    <Link
                      href="/contact"
                      onClick={onClose}
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      Let&apos;s talk
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </p>
                </motion.div>
              </div>
            </div>
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
          <span className="text-xl font-bold tracking-tight">vibe-check</span>
        </Link>

        <DesktopNav />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button className="hidden md:flex rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {siteConfig.cta}
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
