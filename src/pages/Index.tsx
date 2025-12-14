import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/layout/Navbar";
import { 
  Cloud, 
  Server, 
  Shield, 
  Zap, 
  Users, 
  Globe,
  ArrowRight,
  CheckCircle
} from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: Server,
      title: "Kelola Droplet dengan Mudah",
      description: "Buat dan kelola cloud server hanya dengan beberapa klik. Tanpa konfigurasi rumit.",
    },
    {
      icon: Shield,
      title: "Keamanan Terjamin",
      description: "Semua droplet sudah dikonfigurasi dengan best practice keamanan untuk ketenangan Anda.",
    },
    {
      icon: Zap,
      title: "Deploy Instan",
      description: "Deploy server Anda dalam hitungan detik dengan infrastruktur yang teroptimasi.",
    },
    {
      icon: Users,
      title: "Kolaborasi Tim",
      description: "Sempurna untuk komunitas belajar. Kelola dan pantau resource semua anggota tim.",
    },
    {
      icon: Globe,
      title: "Berbagai Region",
      description: "Pilih dari berbagai data center DigitalOcean di seluruh dunia.",
    },
    {
      icon: Cloud,
      title: "Template Siap Pakai",
      description: "Mulai dengan cepat menggunakan OS image dan template aplikasi yang sudah dikonfigurasi.",
    },
  ];

  const specs = [
    { name: "Basic", specs: "1 vCPU, 1GB RAM, 25GB SSD" },
    { name: "Standard", specs: "2 vCPU, 2GB RAM, 50GB SSD" },
    { name: "Premium", specs: "4 vCPU, 8GB RAM, 160GB SSD" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 gradient-hero">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-up">
              <Cloud className="w-4 h-4" />
              <span>Platform Belajar Cloud</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              Belajar Cloud Computing
              <span className="block text-primary">dengan Cara Mudah</span>
            </h1>
            
            <p className="text-lg lg:text-xl text-muted-foreground mb-8 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              Buat dan kelola cloud server sendiri dengan DigitalOcean. 
              Sempurna untuk pelajar dan komunitas yang ingin belajar administrasi server.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <Button variant="hero" size="xl" asChild>
                <Link to="/auth?mode=register">
                  Mulai Sekarang
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/#features">Pelajari Lebih Lanjut</Link>
              </Button>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-16 max-w-4xl mx-auto animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <Card className="overflow-hidden border-2">
              <div className="bg-secondary/50 px-4 py-3 flex items-center gap-2 border-b">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
                <span className="ml-2 text-sm text-muted-foreground">CloudManager Dashboard</span>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {specs.map((plan) => (
                    <div 
                      key={plan.name}
                      className="p-4 rounded-lg bg-accent/50 border border-border"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-primary" />
                        <span className="font-medium">{plan.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.specs}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Semua yang Kamu Butuhkan
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Platform lengkap untuk belajar infrastruktur cloud dan manajemen server
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title}
                className="group hover:border-primary/50 transition-colors animate-fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 lg:py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Dibuat untuk Belajar
              </h2>
              <p className="text-lg text-muted-foreground">
                Platform kami dirancang untuk membantu komunitas belajar cloud computing bersama
              </p>
            </div>

            <Card>
              <CardContent className="p-8">
                <div className="space-y-4">
                  {[
                    "Buat cloud server nyata dengan infrastruktur DigitalOcean",
                    "Belajar administrasi server dalam lingkungan yang aman dan terkelola",
                    "Pilih dari berbagai sistem operasi dan template",
                    "Pengawasan admin untuk pembelajaran berbasis komunitas",
                    "Antarmuka sederhana yang dirancang untuk pemula",
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t">
                  <Button variant="hero" size="lg" className="w-full" asChild>
                    <Link to="/auth?mode=register">
                      Mulai Belajar Sekarang
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              © 2024 CloudManager. Dibuat untuk komunitas belajar.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
