import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check localStorage for existing authentication on app load
    try {
      const savedAuth = localStorage.getItem('campaigner-auth');
      return savedAuth === 'true';
    } catch (error) {
      console.error('Error loading authentication state:', error);
      return false;
    }
  });
  const [isFreshLogin, setIsFreshLogin] = useState(false);

  const handleLogin = () => {
    // Clear any existing chat data when user logs in
    try {
      localStorage.removeItem('campaigner-chat');
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
    } catch (error) {
      console.error('Error clearing authentication data:', error);
    }
    setIsAuthenticated(false);
    setIsFreshLogin(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/" 
              element={
                isAuthenticated ? <Index onLogout={handleLogout} freshLogin={isFreshLogin} /> : <Login onLogin={handleLogin} />
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
