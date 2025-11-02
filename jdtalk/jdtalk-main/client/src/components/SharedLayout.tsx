import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  Kanban, 
  LogOut, 
  Menu, 
  ChevronDown,
  FileText,
  Users,
  Database,
  Plug
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Helmet } from 'react-helmet';

type SharedLayoutProps = {
  title: string;
  children: React.ReactNode;
  activeTab?: string;
  tabs?: Array<{id: string, label: string}>;
  onTabChange?: (value: string) => void;
};

/**
 * Layout compartilhado entre todas as páginas do sistema
 * Garante navegação consistente com sidebar e header
 */
export default function SharedLayout({ 
  title, 
  children, 
  activeTab, 
  tabs, 
  onTabChange 
}: SharedLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Helper para verificar rota ativa
  const isRouteActive = (path: string) => {
    if (path === '/') {
      return location === path;
    }
    return location.startsWith(path);
  };

  // Toggle sidebar on mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Detectar se estamos em mobile baseado na largura da tela
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="h-screen flex flex-col bg-background">
      <Helmet>
        <title>{title} - JDTalk</title>
      </Helmet>
      
      {/* Top Navigation */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-white shadow-sm z-10">
        <div className="flex items-center">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-7 w-7 fill-primary transition-all duration-500 hover:scale-110">
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
              </svg>
              <span className="absolute -bottom-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
            </div>
            <h1 className="ml-2 font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              JDTalk
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Link href="/conversations">
            <Button variant="outline" size="sm" className={isRouteActive('/conversations') ? 'bg-primary/10 border-primary/30' : ''}>
              <MessageSquare className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
          </Link>
          
          <Link href="/pipeline">
            <Button variant="outline" size="sm" className={isRouteActive('/pipeline') ? 'bg-primary/10 border-primary/30' : ''}>
              <Kanban className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Pipeline</span>
            </Button>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                  {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline-block font-medium">{user?.displayName || 'Usuário'}</span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-bold">Minha Conta</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account" className="flex items-center cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  Meus Dados
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Main Content with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`
          w-64 bg-background border-r shadow-sm transition-all duration-300 flex flex-col
          ${isMobile ? (sidebarOpen ? 'fixed inset-y-0 left-0 z-20 h-full' : '-translate-x-full hidden') : ''}
        `}>
          {/* Sidebar Navigation */}
          <div className="p-4 space-y-6 flex-1 overflow-y-auto">
            {/* Principal Navigation */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-medium text-muted-foreground px-2 mb-2">PRINCIPAL</h3>
              
              <Link href="/">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${isRouteActive('/') && !isRouteActive('/dashboard') ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              
              <Link href="/conversations">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${isRouteActive('/conversations') ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Conversas
                </Button>
              </Link>
              
              <Link href="/pipeline">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${isRouteActive('/pipeline') ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  <Kanban className="mr-2 h-4 w-4" />
                  Pipeline de Crédito
                </Button>
              </Link>
            </div>
            
            {/* CMS Navigation */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-medium text-muted-foreground px-2 mb-2">CMS</h3>
              
              <Link href="/cms/pages">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${isRouteActive('/cms/pages') ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Páginas
                </Button>
              </Link>
              
              <Link href="/cms/templates">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${isRouteActive('/cms/templates') ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
                  Templates
                </Button>
              </Link>
              
              <Link href="/cms/editor">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${isRouteActive('/cms/editor') ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
                  Editor
                </Button>
              </Link>
            </div>
            
            {/* System Navigation */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-medium text-muted-foreground px-2 mb-2">SISTEMA</h3>
              
              <Link href="/plugins">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${isRouteActive('/plugins') ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  <Plug className="mr-2 h-4 w-4" />
                  Plugins
                </Button>
              </Link>
              
              <Link href="/settings">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${isRouteActive('/settings') ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </Button>
              </Link>
              
              <Link href="/database">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${isRouteActive('/database') ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Banco de Dados
                </Button>
              </Link>
            </div>
            
            {/* Logout button at bottom */}
            <div className="mt-auto">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Optional tabs */}
          {tabs && (
            <div className="bg-white border-b">
              <div className="container mx-auto">
                <Tabs 
                  value={activeTab} 
                  onValueChange={onTabChange} 
                  className="w-full"
                >
                  <TabsList className="w-full justify-start bg-transparent h-12 border-b-0">
                    {tabs.map((tab) => (
                      <TabsTrigger 
                        key={tab.id} 
                        value={tab.id}
                        className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
      
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10" 
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}