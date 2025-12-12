import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Server, 
  MapPin, 
  Cpu, 
  HardDrive,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const CreateDroplet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    password: "",
    region: "",
    size: "",
    os: "",
    template: "",
  });

  const regions = [
    { value: "sgp1", label: "Singapore", flag: "🇸🇬" },
    { value: "nyc1", label: "New York 1", flag: "🇺🇸" },
    { value: "lon1", label: "London", flag: "🇬🇧" },
    { value: "ams3", label: "Amsterdam 3", flag: "🇳🇱" },
    { value: "fra1", label: "Frankfurt 1", flag: "🇩🇪" },
    { value: "blr1", label: "Bangalore", flag: "🇮🇳" },
  ];

  const sizes = [
    { value: "s-1vcpu-1gb", label: "Basic", specs: "1 vCPU, 1GB RAM, 25GB SSD" },
    { value: "s-1vcpu-2gb", label: "Standard", specs: "1 vCPU, 2GB RAM, 50GB SSD" },
    { value: "s-2vcpu-2gb", label: "Professional", specs: "2 vCPU, 2GB RAM, 60GB SSD" },
    { value: "s-2vcpu-4gb", label: "Advanced", specs: "2 vCPU, 4GB RAM, 80GB SSD" },
    { value: "s-4vcpu-8gb", label: "Premium", specs: "4 vCPU, 8GB RAM, 160GB SSD" },
  ];

  const operatingSystems = [
    { value: "ubuntu-22-04", label: "Ubuntu 22.04 LTS", icon: "🐧" },
    { value: "ubuntu-20-04", label: "Ubuntu 20.04 LTS", icon: "🐧" },
    { value: "debian-11", label: "Debian 11", icon: "🐧" },
    { value: "debian-12", label: "Debian 12", icon: "🐧" },
    { value: "centos-9", label: "CentOS Stream 9", icon: "🐧" },
    { value: "rocky-9", label: "Rocky Linux 9", icon: "🐧" },
    { value: "fedora-39", label: "Fedora 39", icon: "🐧" },
  ];

  const templates = [
    { value: "none", label: "Tanpa Template (Clean Install)" },
    { value: "lamp", label: "LAMP Stack (Linux, Apache, MySQL, PHP)" },
    { value: "lemp", label: "LEMP Stack (Linux, Nginx, MySQL, PHP)" },
    { value: "docker", label: "Docker" },
    { value: "nodejs", label: "Node.js" },
    { value: "wordpress", label: "WordPress" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.password || !formData.region || !formData.size || !formData.os) {
      toast({
        title: "Field Belum Lengkap",
        description: "Mohon isi semua field yang wajib",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    // Simulate API call
    setTimeout(() => {
      setIsCreating(false);
      toast({
        title: "Droplet Berhasil Dibuat!",
        description: `${formData.name} sedang di-deploy. Proses ini membutuhkan beberapa menit.`,
      });
      navigate("/dashboard/droplets");
    }, 2000);
  };

  const selectedSize = sizes.find((s) => s.value === formData.size);

  return (
    <DashboardLayout role="user">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link 
            to="/dashboard/droplets" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Droplet
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Buat Droplet</h1>
          <p className="text-muted-foreground">Deploy cloud server baru</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Informasi Dasar
              </CardTitle>
              <CardDescription>Beri nama droplet dan atur root password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Droplet</Label>
                <Input
                  id="name"
                  placeholder="contoh: web-server-ku"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Hanya huruf kecil, angka, dan tanda hubung yang diperbolehkan
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Root Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password yang kuat"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pr-10"
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
                <p className="text-xs text-muted-foreground">
                  Ini akan digunakan untuk mengakses droplet via SSH
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Region */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Region
              </CardTitle>
              <CardDescription>Pilih lokasi data center</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {regions.map((region) => (
                  <button
                    key={region.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, region: region.value })}
                    className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                      formData.region === region.value
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {formData.region === region.value && (
                      <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-primary" />
                    )}
                    <span className="text-2xl">{region.flag}</span>
                    <p className="font-medium text-foreground mt-1">{region.label}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Size */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                Ukuran
              </CardTitle>
              <CardDescription>Pilih spesifikasi untuk droplet Anda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sizes.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, size: size.value })}
                    className={`relative w-full p-4 rounded-lg border-2 text-left transition-all ${
                      formData.size === size.value
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {formData.size === size.value && (
                      <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-primary" />
                    )}
                    <div className="pr-8">
                      <p className="font-semibold text-foreground">{size.label}</p>
                      <p className="text-sm text-muted-foreground">{size.specs}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* OS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-primary" />
                Sistem Operasi
              </CardTitle>
              <CardDescription>Pilih image sistem operasi</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.os}
                onValueChange={(value) => setFormData({ ...formData, os: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih sistem operasi" />
                </SelectTrigger>
                <SelectContent>
                  {operatingSystems.map((os) => (
                    <SelectItem key={os.value} value={os.value}>
                      <span className="flex items-center gap-2">
                        <span>{os.icon}</span>
                        <span>{os.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Template */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template (Opsional)</CardTitle>
              <CardDescription>Pre-install aplikasi dan konfigurasi</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.template}
                onValueChange={(value) => setFormData({ ...formData, template: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih template (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Summary & Submit */}
          <Card className="bg-accent/50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Spesifikasi Terpilih</p>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedSize?.label || "Belum dipilih"} {selectedSize && `- ${selectedSize.specs}`}
                  </p>
                </div>
                <Button 
                  type="submit" 
                  variant="hero" 
                  size="lg"
                  disabled={isCreating}
                >
                  {isCreating ? "Membuat..." : "Buat Droplet"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateDroplet;
