import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, withAuth } from "./hooks/use-auth";
import { queryClient } from "./lib/queryClient";
import Login from "./pages/login";
import NotFound from "./pages/not-found";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  LogOut, 
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

// Import the KPI Application Components
import Dashboard from "./pages/dashboard";
import DataEntry from "./pages/data-entry";
import Admin from "./pages/admin";

// Protected page components
const ProtectedDashboard = withAuth(Dashboard);
const ProtectedDataEntry = withAuth(DataEntry);
const ProtectedAdmin = withAuth(Admin);

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: BarChart3,
      description: 'KPI Performance Overview'
    },
    { 
      name: 'Data Entry', 
      href: '/data-entry', 
      icon: Database,
      description: 'Weekly Data Input'
    },
    { 
      name: 'Administration', 
      href: '/admin', 
      icon: Settings,
      description: 'Manage KPIs & Targets'
    },
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
        fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 to-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-2.5">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">KPI Scorecard</h1>
              <p className="text-xs text-slate-300">Marketing Analytics</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-slate-300 hover:text-white hover:bg-slate-700"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);
              
              return (
                <Link key={item.name} href={item.href}>
                  <div className={`
                    group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }
                  `}>
                    <Icon className={`
                      mr-3 h-5 w-5 transition-colors
                      ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                    `} />
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-700/50">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-300 truncate">{user?.email}</p>
            </div>
            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs border-0">
              Admin
            </Badge>
          </div>
        </div>
      </div>
    </>
  );
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden text-slate-600 hover:text-slate-900"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="hidden lg:block">
          <h1 className="text-xl font-bold text-slate-900">Marketing KPI Scorecard</h1>
          <p className="text-sm text-slate-600">Performance Analytics Dashboard</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <div className="flex items-center justify-start gap-3 p-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium text-slate-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-slate-600 truncate">
                  {user?.email}
                </p>
                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs border-0 w-fit">
                  Administrator
                </Badge>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
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
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-0"></div>
          </div>
          <div className="text-center">
            <p className="text-slate-900 font-medium">Loading KPI Dashboard</p>
            <p className="text-slate-600 text-sm">Preparing your analytics...</p>
          </div>
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