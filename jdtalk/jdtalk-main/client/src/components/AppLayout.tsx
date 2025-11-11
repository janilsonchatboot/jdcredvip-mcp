import React from "react";
import { Link, useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Helmet } from "react-helmet";
import { CRM_BRANDING, CRM_MENU } from "@/config/layout";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  Kanban,
  User,
  Menu,
  ChevronDown,
  LogOut,
  Moon,
  Sun
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface AppLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(!isMobile);
  const { theme, toggleTheme } = useTheme();

  React.useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const isRouteActive = (path?: string) => {
    if (!path) return false;
    return location === path || location.startsWith(`${path}/`);
  };

  const userRole = user?.role ?? "promotor";
  const canAccess = (roles?: string[]) => !roles || roles.includes(userRole);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Helmet>
        <title>{title} - JD CRED VIP CRM</title>
      </Helmet>

      {isMobile && (
        <header className="h-14 border-b flex items-center justify-between px-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="ml-2 flex flex-col leading-tight">
              <span className="font-semibold text-sm text-text-primary">JD CRED VIP CRM</span>
              <span className="text-[11px] uppercase tracking-[0.45em] text-primary font-semibold drop-shadow-sm">
                {CRM_BRANDING.slogan}
              </span>
              <span className="text-xs text-text-secondary">{CRM_BRANDING.version}</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-sm">
                  {user?.displayName?.charAt(0).toUpperCase() || "U"}
                </div>
                <ChevronDown className="h-4 w-4 text-primary/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-secondary/30">
              <DropdownMenuLabel className="font-semibold">Minha conta</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuracoes
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`w-72 border-r border-neutral-medium bg-white flex flex-col ${
            isMobile ? (sidebarOpen ? "absolute inset-y-14 z-20" : "hidden") : ""
          }`}
        >
          <div className="p-4 border-b border-neutral-medium hidden md:flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">JD CRED VIP CRM</h1>
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-primary drop-shadow-sm">
                {CRM_BRANDING.slogan}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
            <div className="space-y-2">
              <h2 className="text-xs font-medium text-muted-foreground px-2 uppercase">CRM</h2>
              <div className="space-y-1">
                {CRM_MENU.map((entry) => {
                  const allowed = canAccess(entry.roles);
                  if (entry.submenu?.length) {
                    const parentActive = isRouteActive(entry.path);
                    const parentButton =
                      entry.path && entry.implemented !== false ? (
                        <Link key={`${entry.label}-parent`} href={entry.path}>
                          <Button
                            variant="ghost"
                            className={`w-full justify-start group jd-sidebar-item ${parentActive ? "active" : ""}`}
                            disabled={!allowed}
                          >
                            {entry.icon ? <entry.icon className="mr-2 h-4 w-4 jd-icon" /> : null}
                            {entry.label}
                            {!allowed && (
                              <Badge variant="outline" className="ml-auto text-[10px] uppercase">
                                Restrito
                              </Badge>
                            )}
                          </Button>
                        </Link>
                      ) : (
                        <div key={`${entry.label}-label`} className="px-2 text-xs uppercase font-medium text-muted-foreground">
                          {entry.label}
                        </div>
                      );

                    return (
                      <div key={entry.label} className="space-y-1">
                        {parentButton}
                        {entry.submenu.map((sub) => {
                          const subAllowed = canAccess(sub.roles);
                          const active = isRouteActive(sub.path);
                          const button = (
                            <Button
                              key={sub.path}
                              variant="ghost"
                              className={`w-full justify-start group jd-sidebar-item ${active ? "active" : ""}`}
                              disabled={!sub.implemented || !subAllowed}
                            >
                              {sub.label}
                              {!subAllowed && (
                                <Badge variant="outline" className="ml-auto text-[10px] uppercase">
                                  Restrito
                                </Badge>
                              )}
                              {!sub.implemented && (
                                <Badge variant="outline" className="ml-auto text-[10px] uppercase">
                                  Em breve
                                </Badge>
                              )}
                            </Button>
                          );

                          return sub.implemented && subAllowed ? (
                            <Link key={sub.path} href={sub.path}>
                              {button}
                            </Link>
                          ) : (
                            <div key={sub.path} title="Em desenvolvimento">
                              {button}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  const active = isRouteActive(entry.path);
                  const Icon = entry.icon;
                  const button = (
                    <Button
                      key={entry.path ?? entry.label}
                      variant="ghost"
                      className={`w-full justify-start group jd-sidebar-item ${active ? "active" : ""}`}
                      disabled={!entry.implemented || !allowed}
                    >
                      {Icon ? <Icon className="mr-2 h-4 w-4 jd-icon" /> : null}
                      {entry.label}
                      {!allowed && (
                        <Badge variant="outline" className="ml-auto text-[10px] uppercase">
                          Restrito
                        </Badge>
                      )}
                      {entry.implemented === false && (
                        <Badge variant="outline" className="ml-auto text-[10px] uppercase">
                          Em breve
                        </Badge>
                      )}
                    </Button>
                  );

                  if (!entry.path || entry.implemented === false) {
                    return (
                      <div key={entry.path ?? entry.label} title="Em desenvolvimento">
                        {button}
                      </div>
                    );
                  }

                  return (
                    <Link key={entry.path} href={entry.path}>
                      {button}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-medium text-muted-foreground px-2 uppercase">Operacoes</h2>
              <div className="space-y-1">
                <Link href="/conversations">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start group jd-sidebar-item ${
                      isRouteActive("/conversations") ? "active" : ""
                    }`}
                  >
                    <MessageSquare className="mr-2 h-4 w-4 jd-icon" />
                    Conversas
                  </Button>
                </Link>
                <Link href="/pipeline">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start group jd-sidebar-item ${isRouteActive("/pipeline") ? "active" : ""}`}
                  >
                    <Kanban className="mr-2 h-4 w-4 jd-icon" />
                    Pipeline de Credito
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-medium text-muted-foreground px-2 uppercase">Sistema</h2>
              <div className="space-y-1">
                <Link href="/plugins">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start group jd-sidebar-item ${isRouteActive("/plugins") ? "active" : ""}`}
                    disabled={!canAccess(["admin"])}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2 h-4 w-4 jd-icon"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                    Plugins
                    {!canAccess(["admin"]) && (
                      <Badge variant="outline" className="ml-auto text-[10px] uppercase">
                        Restrito
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start group jd-sidebar-item ${isRouteActive("/settings") ? "active" : ""}`}
                  >
                    <Settings className="mr-2 h-4 w-4 jd-icon" />
                    Configuracoes
                  </Button>
                </Link>
                <Link href="/cms">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start group jd-sidebar-item ${isRouteActive("/cms") ? "active" : ""}`}
                    disabled={!canAccess(["admin"])}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2 h-4 w-4 jd-icon"
                    >
                      <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                      <path d="M2 2l7.586 7.586"></path>
                      <circle cx="11" cy="11" r="2"></circle>
                    </svg>
                    Editor CMS
                    {!canAccess(["admin"]) && (
                      <Badge variant="outline" className="ml-auto text-[10px] uppercase">
                        Restrito
                      </Badge>
                    )}
                  </Button>
                </Link>
              </div>
            </div>
          </nav>

          <div className="mt-auto border-t border-neutral-medium p-4 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-light">
                <User className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <p className="font-medium">{user?.displayName || "Usuario"}</p>
                <p>{user?.username}</p>
                <p className="uppercase text-[11px] text-primary font-semibold">{userRole}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="mt-3 w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-100/20"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-neutral-medium p-4 text-xs text-center text-text-secondary">
            {CRM_BRANDING.footer}
          </footer>
        </main>
      </div>
    </div>
  );
}
