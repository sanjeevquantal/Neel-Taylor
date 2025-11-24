import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface LoginProps {
  onLogin: () => void;
}

// Helper function to extract user-friendly error messages
const getErrorMessage = (error: any): string => {
  try {
    const message = error.message || error.toString();
    
    // Try to parse JSON error messages
    if (message.includes('{"detail"')) {
      const jsonMatch = message.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.detail && Array.isArray(parsed.detail) && parsed.detail.length > 0) {
          // Extract the first error message
          const firstError = parsed.detail[0];
          
          // Provide contextual messages based on which field is missing
          if (firstError.loc && firstError.loc.length > 1) {
            const field = firstError.loc[firstError.loc.length - 1];
            if (field === 'username') {
              return 'Please enter your email address';
            }
            if (field === 'password') {
              return 'Please enter your password';
            }
            if (field === 'email') {
              return 'Please enter your email address';
            }
          }
          
          if (firstError.msg) {
            return firstError.msg.replace('Field required', 'This field is required');
          }
        }
        if (typeof parsed.detail === 'string') {
          return parsed.detail;
        }
      }
    }
    
    // Handle common HTTP status codes
    if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
      return 'Invalid email or password';
    }
    if (message.includes('403') || message.toLowerCase().includes('forbidden')) {
      return 'Access denied. Please contact support';
    }
    if (message.includes('404')) {
      return 'Service not found. Please try again later';
    }
    if (message.includes('422')) {
      return 'Please check your information and try again';
    }
    if (message.includes('500')) {
      return 'Server error. Please try again later';
    }
    if (message.includes('503')) {
      return 'Service temporarily unavailable. Please try again in a moment';
    }
    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
      return 'Connection error. Please check your internet connection';
    }
    
    // If it contains specific error keywords, extract them
    if (message.toLowerCase().includes('email')) {
      return 'Email is already registered';
    }
    if (message.toLowerCase().includes('password')) {
      return 'Password does not meet requirements';
    }
    if (message.toLowerCase().includes('username')) {
      return 'Username is already taken';
    }
    
    // If it's a relatively clean error message, return it
    if (message.length < 100 && !message.includes('Request failed')) {
      return message;
    }
    
    // Default fallback
    return 'Something went wrong. Please try again';
  } catch {
    return 'An unexpected error occurred. Please try again';
  }
};

const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<'signin' | 'signup'>("signin");
  const { toast } = useToast();
  
  // Refs for focusing fields
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const signUpEmailRef = useRef<HTMLInputElement>(null);
  const signUpPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  
  // Auto-focus on the email field when the component mounts
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Custom validation with user-friendly messages and auto-focus
    if (!email.trim()) {
      emailRef.current?.focus();
      toast({
        title: "Email required",
        description: "Please enter your email address to continue",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      emailRef.current?.focus();
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    if (!password.trim()) {
      passwordRef.current?.focus();
      toast({
        title: "Password required",
        description: "Please enter your password to continue",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Login expects application/x-www-form-urlencoded format
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('username', email);
      params.append('password', password);
      params.append('scope', '');
      params.append('client_id', 'string');
      params.append('client_secret', '');
      
      // Use shared API client with new base (no /api) and relative auth path
      const data = await apiClient.post<{ access_token?: string; token?: string }>(
        '/auth/login',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'accept': 'application/json',
          },
        }
      );
      const token = data.access_token || data.token;
      
      if (token) {
        localStorage.setItem("auth_token", token);
        toast({
          title: "Welcome back! 🎉",
          description: "You've been successfully signed in.",
          duration: 3000,
        });
    onLogin();
      }
    } catch (error: any) {
      const friendlyMessage = getErrorMessage(error);
      toast({
        title: "Unable to sign in",
        description: friendlyMessage,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Custom validation with user-friendly messages and auto-focus
    if (!name.trim()) {
      nameRef.current?.focus();
      toast({
        title: "Name required",
        description: "Please enter your full name",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    if (!signUpEmail.trim()) {
      signUpEmailRef.current?.focus();
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    if (!signUpEmail.includes('@') || !signUpEmail.includes('.')) {
      signUpEmailRef.current?.focus();
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    if (!signUpPassword.trim()) {
      signUpPasswordRef.current?.focus();
      toast({
        title: "Password required",
        description: "Please create a password for your account",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    if (signUpPassword.length < 8) {
      signUpPasswordRef.current?.focus();
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    if (!confirmPassword.trim()) {
      confirmPasswordRef.current?.focus();
      toast({
        title: "Password confirmation required",
        description: "Please confirm your password",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    // Validate passwords match
    if (signUpPassword !== confirmPassword) {
      confirmPasswordRef.current?.focus();
      toast({
        title: "Passwords don't match",
        description: "Please make sure both password fields are the same",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post(
        '/auth/register',
        {
          email: signUpEmail,
          password: signUpPassword,
          username: name, // Sending full name as username to backend
          is_active: true,
          is_superuser: false,
          is_verified: false,
        }
      );
      
      toast({
        title: "Account created! 🎊",
        description: "Your account has been successfully created. Please sign in to continue.",
        duration: 4000,
      });
      
      // Clear form
      setSignUpEmail("");
      setSignUpPassword("");
      setConfirmPassword("");
      setName("");
      
      // Redirect to sign in tab and focus email
      setTab('signin');
      setTimeout(() => {
        emailRef.current?.focus();
      }, 0);
    } catch (error: any) {
      const friendlyMessage = getErrorMessage(error);
      toast({
        title: "Registration failed",
        description: friendlyMessage,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Dummy implementation - just redirect to dashboard
    onLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-secondary p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header Section */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome</h1>
          <p className="text-muted-foreground">Access your account or create a new one</p>
        </div>

        <Card className="bg-gradient-card shadow-medium border-border/20 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'signin' | 'signup')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/30">
                <TabsTrigger 
                  value="signin" 
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="mt-6">
                <CardContent className="p-0 space-y-6">
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-sm font-medium text-foreground">
                        Email Address
                      </Label>
                      <Input
                        ref={emailRef}
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            passwordRef.current?.focus();
                          }
                        }}
                        className="h-11 px-4 bg-background/60 border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-smooth placeholder:text-muted-foreground/70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-sm font-medium text-foreground">
                        Password
                      </Label>
                      <Input
                        ref={passwordRef}
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleEmailLogin(e as any);
                          }
                        }}
                        className="h-11 px-4 bg-background/60 border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-smooth placeholder:text-muted-foreground/70"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-smooth font-medium text-base shadow-soft hover:shadow-medium mt-6"
                    >
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="bg-border/50" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-gradient-card px-3 py-1 text-muted-foreground font-medium">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 bg-background/40 border-border/60 hover:bg-background/60 transition-smooth font-medium text-base"
                    onClick={handleGoogleLogin}
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </CardContent>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <CardContent className="p-0 space-y-6">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium text-foreground">
                        Full Name
                      </Label>
                      <Input
                        ref={nameRef}
                        id="signup-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            signUpEmailRef.current?.focus();
                          }
                        }}
                        className="h-11 px-4 bg-background/60 border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-smooth placeholder:text-muted-foreground/70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">
                        Email Address
                      </Label>
                      <Input
                        ref={signUpEmailRef}
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            signUpPasswordRef.current?.focus();
                          }
                        }}
                        className="h-11 px-4 bg-background/60 border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-smooth placeholder:text-muted-foreground/70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                        Password
                      </Label>
                      <Input
                        ref={signUpPasswordRef}
                        id="signup-password"
                        type="password"
                        placeholder="Create a password (min. 8 characters)"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            confirmPasswordRef.current?.focus();
                          }
                        }}
                        className="h-11 px-4 bg-background/60 border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-smooth placeholder:text-muted-foreground/70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                        Confirm Password
                      </Label>
                      <Input
                        ref={confirmPasswordRef}
                        id="confirm-password"
                        type="password"
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSignUp(e as any);
                          }
                        }}
                        className="h-11 px-4 bg-background/60 border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-smooth placeholder:text-muted-foreground/70"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-smooth font-medium text-base shadow-soft hover:shadow-medium mt-6"
                    >
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="bg-border/50" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-gradient-card px-3 py-1 text-muted-foreground font-medium">
                        Or sign up with
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 bg-background/40 border-border/60 hover:bg-background/60 transition-smooth font-medium text-base"
                    onClick={handleGoogleLogin}
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </CardContent>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default Login;