import Link from "next/link";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

export function AppShell({
  title,
  subtitle,
  userName,
  userMeta,
  navItems,
  currentPath,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  userName: string;
  userMeta: string;
  navItems: NavItem[];
  currentPath: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col bg-surface-container-low px-4 py-6 lg:flex">
        <div className="px-4">
          <h1 className="font-headline text-lg font-black uppercase tracking-[0.24em] text-primary">{title}</h1>
          <p className="mt-1 text-xs text-on-secondary-container">{subtitle}</p>
        </div>

        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={cn(
                "rounded-lg px-4 py-3 text-sm font-medium transition",
                currentPath === item.href
                  ? "bg-surface-container-lowest font-bold text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-highest",
              )}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="institutional-card mt-auto p-4">
          <p className="text-sm font-bold text-primary">{userName}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{userMeta}</p>
        </div>
      </aside>

      <main className="lg:ml-72">
        <header className="glass-panel sticky top-0 z-20 flex items-center justify-between px-6 py-4 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">{title}</p>
            <h2 className="font-headline text-2xl font-extrabold tracking-tight text-primary">{subtitle}</h2>
          </div>
          {actions}
        </header>
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
