import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cloud, ArrowLeft, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isRegister = searchParams.get("mode") === "register";
  const [mode, setMode] = useState<"login" | "register">(isRegister ? "register" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate auth - in real app this would connect to Supabase
    setTimeout(() => {
      setIsLoading(false);
      
      // Demo: check if admin login
      if (formData.email === "admin@demo.com" && formData.password === "admin123") {
        toast({
          title: "Welcome Admin!",
          description: "Redirecting to admin dashboard...",
        });
        navigate("/admin");
      } else {
        toast({
          title: mode === "login" ? "Welcome back!" : "Account created!",
          description: "Redirecting to your dashboard...",
        });
        navigate("/dashboard");
      }
    }, 1000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Back Link */}
      <div className="container mx-auto px-4 py-4">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Auth Card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md animate-fade-up">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                <Cloud className="w-6 h-6 text-primary-foreground" />
              </div>
            </Link>
            <h1 className="mt-4 text-2xl font-bold text-foreground">CloudManager</h1>
            <p className="text-muted-foreground">Cloud Learning Platform</p>
          </div>

          <Card className="border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription>
                {mode === "login" 
                  ? "Sign in to manage your cloud servers" 
                  : "Start your cloud learning journey"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  variant="hero" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => setMode(mode === "login" ? "register" : "login")}
                    className="text-primary font-medium hover:underline"
                  >
                    {mode === "login" ? "Sign up" : "Sign in"}
                  </button>
                </p>
              </div>

              {/* Demo credentials hint */}
              <div className="mt-6 p-4 rounded-lg bg-accent/50 border">
                <p className="text-xs text-center text-muted-foreground">
                  <strong>Demo:</strong> Use <code className="bg-secondary px-1 rounded">admin@demo.com</code> / <code className="bg-secondary px-1 rounded">admin123</code> for admin access
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
