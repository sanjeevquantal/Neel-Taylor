import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import Campaign from "./pages/Campaign";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { PageLoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { campaignLoader } from "./lib/loaders";
import { isTokenExpired } from "./lib/api";
import { clearSidebarCaches } from "./lib/cache";

const queryClient = new QueryClient();

// Authentication context for the app
const AuthContext = React.createContext<{
  isAuthenticated: boolean;
  isFreshLogin: boolean;
  handleLogin: () => void;
  handleLogout: () => void;
} | null>(null);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check localStorage for existing authentication on app load
    try {
      const savedAuth = localStorage.getItem('campaigner-auth');
      const authToken = localStorage.getItem('auth_token');
      
      // If no auth flag or no token, not authenticated
      if (savedAuth !== 'true' || !authToken) {
        return false;
      }
      
      // Check if token is expired
      if (isTokenExpired(authToken)) {
        // Clear expired authentication data
        localStorage.removeItem('campaigner-auth');
        localStorage.removeItem('auth_token');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error loading authentication state:', error);
      return false;
    }
  });
  const [isFreshLogin, setIsFreshLogin] = useState(false);

  // Listen for auth expiration events from API calls
  useEffect(() => {
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setIsFreshLogin(false);
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const handleLogin = () => {
    // Clear any existing chat data when user logs in
    try {
      localStorage.removeItem('campaigner-chat');
      localStorage.removeItem('neel-taylor-conversation-history');
      localStorage.removeItem('campaigner-chat-display');
      // Clear sidebar caches for fresh start
      clearSidebarCaches();
      localStorage.setItem('campaigner-auth', 'true');
    } catch (error) {
      console.error('Error clearing chat data:', error);
    }
    setIsAuthenticated(true);
    setIsFreshLogin(true);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('campaigner-auth');
      localStorage.removeItem('campaigner-chat');
      localStorage.removeItem('neel-taylor-conversation-history');
      localStorage.removeItem('campaigner-chat-display');
      // Also remove auth token
      localStorage.removeItem('auth_token');
      // Clear sidebar caches to prevent data leakage between users
      clearSidebarCaches();
    } catch (error) {
      console.error('Error clearing authentication data:', error);
    }
    setIsAuthenticated(false);
    setIsFreshLogin(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isFreshLogin, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, handleLogin, handleLogout, isFreshLogin } = useAuth();
  
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }
  
  return <>{children}</>;
};

// Layout component for authenticated routes
const AuthenticatedLayout = () => {
  const { handleLogout, isFreshLogin } = useAuth();
  return <Index onLogout={handleLogout} freshLogin={isFreshLogin} />;
};

// Create the router
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    ),
    children: [
      {
        path: "/",
        element: <ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>
      },
      {
        path: "/conversations/:id",
        element: <ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: "/campaigns",
        element: <ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>
      },
      {
        path: "/campaign-builder",
        element: <ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>
      },
      {
        path: "/campaigns/:id",
        loader: campaignLoader,
        element: <ProtectedRoute><Campaign /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: "/analytics",
        element: <ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>
      },
      {
        path: "/settings",
        element: <ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>
      },
      {
        path: "/conversations",
        element: <ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>
      },
      {
        path: "*",
        element: <NotFound />
      }
    ]
  }
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
