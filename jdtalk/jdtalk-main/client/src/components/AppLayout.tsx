import React from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Helmet } from 'react-helmet';

// Ícones
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  Kanban,
  User,
  Menu,
  ChevronDown,
  LogOut
} from 'lucide-react';

interface AppLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(!isMobile);

  // Alternar a barra lateral no modo móvel
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Verificar se uma rota está ativa
  const isRouteActive = (path: string) => {
    if (path === '/') {
      return location === path;
    }
    return location.startsWith(path);
  };
  
  return (
    <div className="h-screen flex flex-col bg-background">
      <Helmet>
        <title>{title} - JDTalk</title>
      </Helmet>
      
      {/* Top Navigation - Mobile only */}
      {isMobile && (
        <div className="h-14 border-b flex items-center justify-between px-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="ml-2 flex items-center">
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-7 w-7 fill-primary transition-all duration-500 hover:scale-110">
                  <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                </svg>
                <span className="absolute -bottom-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              </div>
              <h1 className="ml-2 font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">JDTalk</h1>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 transition-all duration-300 hover:bg-primary/10">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-sm">
                  {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline-block font-medium">{user?.displayName || 'Usuário'}</span>
                <ChevronDown className="h-4 w-4 text-primary/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-secondary/30">
              <DropdownMenuLabel className="font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Minha Conta</DropdownMenuLabel>
              <DropdownMenuItem asChild className="focus:bg-secondary/20 focus:text-primary">
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />
              <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-700 focus:bg-red-50/30">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      
      {/* Main Content with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`
          w-60 bg-background border-r transition-all duration-300 
          ${isMobile ? (sidebarOpen ? 'absolute z-20 h-full' : '-translate-x-full hidden') : ''}
        `}>
          {/* Sidebar Header - Desktop only */}
          {!isMobile && (
            <div className="h-14 border-b flex items-center px-4">
              <div className="flex items-center">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-8 w-8 fill-primary transition-all duration-500 hover:scale-110">
                    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                  </svg>
                  <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                </div>
                <h1 className="ml-3 font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">JDTalk</h1>
              </div>
            </div>
          )}
          
          {/* Sidebar Navigation */}
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground px-2">Principal</h3>
              <nav className="space-y-1">
                <Link href="/">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start group jd-sidebar-item ${isRouteActive('/') && location === '/' ? 'active' : ''}`}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4 jd-icon" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/conversations">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start group jd-sidebar-item ${isRouteActive('/conversations') ? 'active' : ''}`}
                  >
                    <MessageSquare className="mr-2 h-4 w-4 jd-icon" />
                    Conversas
                  </Button>
                </Link>
                <Link href="/pipeline">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start group jd-sidebar-item ${isRouteActive('/pipeline') ? 'active' : ''}`}
                  >
                    <Kanban className="mr-2 h-4 w-4 jd-icon" />
                    Pipeline de Crédito
                  </Button>
                </Link>
              </nav>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground px-2">Sistema</h3>
              <nav className="space-y-1">
                <Link href="/plugins">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start group jd-sidebar-item ${isRouteActive('/plugins') ? 'active' : ''}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 jd-icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                    Plugins
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start group jd-sidebar-item ${isRouteActive('/settings') ? 'active' : ''}`}
                  >
                    <Settings className="mr-2 h-4 w-4 jd-icon" />
                    Configurações
                  </Button>
                </Link>
                <Link href="/cms">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start group jd-sidebar-item ${isRouteActive('/cms') ? 'active' : ''}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 jd-icon"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
                    Editor CMS
                  </Button>
                </Link>
                <div className="jd-divider mt-2 mb-2"></div>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start group text-red-600 hover:text-red-700 hover:bg-red-100/20"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </nav>
            </div>
          </div>
        </div>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}