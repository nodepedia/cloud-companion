import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cloud, ArrowLeft, Eye, EyeOff, Lock, User, Key, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isRegister = searchParams.get("mode") === "register";
  const [mode, setMode] = useState<"login" | "register">(isRegister ? "register" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, user, role, isLoading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    inviteKey: "",
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && role) {
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, role, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (mode === "login") {
      const { error } = await signIn(formData.username, formData.password);
      
      if (error) {
        toast({
          title: "Login Gagal",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Selamat Datang!",
        description: "Login berhasil",
      });
    } else {
      if (!formData.inviteKey) {
        toast({
          title: "Error",
          description: "Invite key wajib diisi",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error, needsEmailConfirmation } = await signUp(
        formData.username,
        formData.email,
        formData.password,
        formData.inviteKey
      );
      
      if (error) {
        toast({
          title: "Registrasi Gagal",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Akun Berhasil Dibuat!",
        description: needsEmailConfirmation
          ? "Silakan cek email untuk verifikasi sebelum login (inbox/spam)."
          : "Silakan login dengan akun baru Anda",
      });
      
      // Switch to login mode after successful registration
      setMode("login");
      setFormData(prev => ({ ...prev, inviteKey: "", password: "" }));
    }
    
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Back Link */}
      <div className="container mx-auto px-4 py-4">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>

      {/* Auth Card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md animate-fade-up">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                <Cloud className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="mt-2 text-2xl font-bold text-foreground">CloudManager</h1>
              <span className="text-xs text-muted-foreground">by BelajarNode</span>
            </Link>
          </div>

          <Card className="border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {mode === "login" ? "Selamat Datang Kembali" : "Buat Akun"}
              </CardTitle>
              <CardDescription>
                {mode === "login" 
                  ? "Masuk untuk mengelola cloud server Anda" 
                  : "Mulai perjalanan belajar cloud Anda"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                    />
                  </div>
                  {mode === "register" && (
                    <p className="text-xs text-muted-foreground">
                      3-20 karakter, hanya huruf, angka, dan underscore
                    </p>
                  )}
                </div>

                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                )}

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
                      minLength={6}
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

                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="inviteKey">Invite Key</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="inviteKey"
                        name="inviteKey"
                        type="text"
                        placeholder="Masukkan invite key"
                        value={formData.inviteKey}
                        onChange={handleInputChange}
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dapatkan invite key dari admin untuk mendaftar
                    </p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  variant="hero" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Mohon tunggu..." : mode === "login" ? "Masuk" : "Buat Akun"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
                  <button
                    type="button"
                    onClick={() => setMode(mode === "login" ? "register" : "login")}
                    className="text-primary font-medium hover:underline"
                  >
                    {mode === "login" ? "Daftar" : "Masuk"}
                  </button>
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
