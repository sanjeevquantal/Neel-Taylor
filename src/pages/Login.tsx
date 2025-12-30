import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiClient, fetchUserCredits } from "@/lib/api";
import { writeCache, CACHE_KEYS } from "@/lib/cache";
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

// Email validation function
const validateEmail = (email: string): boolean => {
  // RFC 5322 compliant email regex (simplified but comprehensive)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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
  const [emailError, setEmailError] = useState<string>("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const forgotPasswordEmailRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmNewPasswordRef = useRef<HTMLInputElement>(null);
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

  // Auto-focus on forgot password email field when dialog opens
  useEffect(() => {
    if (showForgotPassword && !resetEmailSent) {
      setTimeout(() => {
        forgotPasswordEmailRef.current?.focus();
      }, 100);
    }
  }, [showForgotPassword, resetEmailSent]);

  // Password validation function matching backend requirements
  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/\d/.test(password)) {
      return "Password must contain at least one digit";
    }
    return "";
  };

  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSignUpEmail(value);
    
    if (emailTouched) {
      if (!value.trim()) {
        setEmailError("Email is required");
      } else if (!validateEmail(value)) {
        setEmailError("Please enter a valid email address");
      } else {
        setEmailError("");
      }
    }
  };

  // Handle email blur
  const handleEmailBlur = () => {
    setEmailTouched(true);
    if (!signUpEmail.trim()) {
      setEmailError("Email is required");
    } else if (!validateEmail(signUpEmail)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

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
        // Fetch credits after successful login
        fetchUserCredits()
          .then(data => writeCache(CACHE_KEYS.CREDITS, data))
          .catch(err => {
            console.error('Failed to fetch credits on login:', err);
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
    
    // Validate email
    setEmailTouched(true);
    if (!signUpEmail.trim()) {
      setEmailError("Email is required");
      signUpEmailRef.current?.focus();
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    if (!validateEmail(signUpEmail)) {
      setEmailError("Please enter a valid email address");
      signUpEmailRef.current?.focus();
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    setEmailError("");
    
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
      setEmailError("");
      setEmailTouched(false);
      
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (!forgotPasswordEmail.trim()) {
      forgotPasswordEmailRef.current?.focus();
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    if (!validateEmail(forgotPasswordEmail)) {
      forgotPasswordEmailRef.current?.focus();
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    // Validate new password
    if (!newPassword.trim()) {
      newPasswordRef.current?.focus();
      toast({
        title: "Password required",
        description: "Please enter your new password",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    const passwordValidationError = validatePassword(newPassword);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      newPasswordRef.current?.focus();
      toast({
        title: "Invalid password",
        description: passwordValidationError,
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    // Validate password confirmation
    if (!confirmNewPassword.trim()) {
      confirmNewPasswordRef.current?.focus();
      toast({
        title: "Password confirmation required",
        description: "Please confirm your new password",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      confirmNewPasswordRef.current?.focus();
      toast({
        title: "Passwords don't match",
        description: "Please make sure both password fields are the same",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    setIsSendingReset(true);
    setPasswordError("");
    try {
      // Call the backend forgot password endpoint with email and new_password
      const response = await apiClient.post<{ message: string; success: boolean }>('/auth/forgot-password', {
        email: forgotPasswordEmail.trim().toLowerCase(),
        new_password: newPassword,
      });
      
      setResetEmailSent(true);
      toast({
        title: "Password reset successful! ✅",
        description: response.message || "Your password has been successfully reset. You can now sign in with your new password.",
        duration: 5000,
      });
      
      // Clear form fields
      setForgotPasswordEmail("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordError("");
    } catch (error: any) {
      const friendlyMessage = getErrorMessage(error);
      toast({
        title: "Password reset failed",
        description: friendlyMessage || "An error occurred while resetting your password. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail("");
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordError("");
    setResetEmailSent(false);
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
            <Tabs value={tab} onValueChange={(v) => {
              setTab(v as 'signin' | 'signup');
              // Reset email validation state when switching tabs
              if (v === 'signin') {
                setEmailError("");
                setEmailTouched(false);
              }
            }} className="w-full">
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
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password" className="text-sm font-medium text-foreground">
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
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
                        onChange={handleEmailChange}
                        onBlur={handleEmailBlur}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            signUpPasswordRef.current?.focus();
                          }
                        }}
                        className={`h-11 px-4 bg-background/60 border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-smooth placeholder:text-muted-foreground/70 ${
                          emailError ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''
                        }`}
                        aria-invalid={emailError ? 'true' : 'false'}
                        aria-describedby={emailError ? 'signup-email-error' : undefined}
                      />
                      {emailError && (
                        <p 
                          id="signup-email-error"
                          className="text-sm text-destructive font-medium"
                          role="alert"
                        >
                          {emailError}
                        </p>
                      )}
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

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={(open) => {
        if (!open) {
          handleCloseForgotPassword();
        } else {
          setShowForgotPassword(true);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              {resetEmailSent 
                ? "Your password has been successfully reset. You can now sign in with your new password."
                : "Enter your registered email address and a new password to reset your account password."}
            </DialogDescription>
          </DialogHeader>
          {!resetEmailSent ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-password-email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  ref={forgotPasswordEmailRef}
                  id="forgot-password-email"
                  type="email"
                  placeholder="Enter your registered email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      newPasswordRef.current?.focus();
                    }
                  }}
                  className="h-11"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium">
                  New Password
                </Label>
                <Input
                  ref={newPasswordRef}
                  id="new-password"
                  type="password"
                  placeholder="Enter new password (min. 8 chars, uppercase, lowercase, digit)"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordError) {
                      setPasswordError("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      confirmNewPasswordRef.current?.focus();
                    }
                  }}
                  className={`h-11 ${passwordError ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''}`}
                />
                {passwordError && (
                  <p className="text-sm text-destructive font-medium" role="alert">
                    {passwordError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters and include uppercase, lowercase, and a digit.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="text-sm font-medium">
                  Confirm New Password
                </Label>
                <Input
                  ref={confirmNewPasswordRef}
                  id="confirm-new-password"
                  type="password"
                  placeholder="Re-enter your new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleForgotPassword(e as any);
                    }
                  }}
                  className="h-11"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForgotPassword}
                  disabled={isSendingReset}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSendingReset}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  {isSendingReset ? "Resetting..." : "Reset Password"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <DialogFooter>
              <Button
                onClick={handleCloseForgotPassword}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                Close
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;