import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, withAuth } from "./hooks/use-auth";
import { queryClient } from "./lib/queryClient";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import DataEntry from "./pages/data-entry";
import Admin from "./pages/admin";
import NotFound from "./pages/not-found";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { 
  BarChart3, 
  Database, 
  Settings, 
  User, 
  LogOut, 
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

// Protected Dashboard page
const ProtectedDashboard = withAuth(Dashboard);
const ProtectedDataEntry = withAuth(DataEntry);
const ProtectedAdmin = withAuth(Admin);

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Data Entry', href: '/data-entry', icon: Database },
    ...(user?.role === 'ADMIN' ? [{ name: 'Administration', href: '/admin', icon: Settings }] : []),
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location === '/' || location === '/dashboard';
    }
    return location === href;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 rounded-lg p-2">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">KPI Scorecard</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);
              
              return (
                <Link key={item.name} href={item.href}>
                  <a className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}>
                    <Icon className={`
                      mr-3 h-5 w-5 transition-colors
                      ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'}
                    `} />
                    {item.name}
                  </a>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            {user?.role === 'ADMIN' && (
              <Badge variant="outline" className="text-xs">Admin</Badge>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="hidden lg:block">
          <h1 className="text-lg font-semibold text-slate-900">Marketing KPI Scorecard</h1>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="w-[200px] truncate text-sm text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-slate-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
      </Route>

      {/* Protected routes */}
      <Route path="/">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <Redirect to="/dashboard" />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/dashboard">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedDashboard />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/data-entry">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedDataEntry />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/admin">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedAdmin />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      {/* 404 route */}
      <Route>
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <NotFound />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
