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
      title: "Easy Droplet Management",
      description: "Create and manage cloud servers with just a few clicks. No complex configurations needed.",
    },
    {
      icon: Shield,
      title: "Secure by Default",
      description: "All droplets come with security best practices pre-configured for your peace of mind.",
    },
    {
      icon: Zap,
      title: "Instant Deployment",
      description: "Deploy your servers in seconds with our optimized infrastructure.",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Perfect for learning communities. Manage and monitor all team members' resources.",
    },
    {
      icon: Globe,
      title: "Multiple Regions",
      description: "Choose from multiple DigitalOcean data centers around the world.",
    },
    {
      icon: Cloud,
      title: "Pre-built Templates",
      description: "Start quickly with pre-configured OS images and application templates.",
    },
  ];

  const plans = [
    { name: "Basic", specs: "1 vCPU, 1GB RAM, 25GB SSD", price: "$6/mo" },
    { name: "Standard", specs: "2 vCPU, 2GB RAM, 50GB SSD", price: "$12/mo" },
    { name: "Premium", specs: "4 vCPU, 8GB RAM, 160GB SSD", price: "$48/mo" },
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
              <span>Cloud Learning Platform</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              Learn Cloud Computing
              <span className="block text-primary">The Easy Way</span>
            </h1>
            
            <p className="text-lg lg:text-xl text-muted-foreground mb-8 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              Create and manage your own cloud servers with DigitalOcean. 
              Perfect for students and communities learning about server administration.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <Button variant="hero" size="xl" asChild>
                <Link to="/auth?mode=register">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/#features">Learn More</Link>
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
                  {plans.map((plan, index) => (
                    <div 
                      key={plan.name}
                      className="p-4 rounded-lg bg-accent/50 border border-border"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-primary" />
                        <span className="font-medium">{plan.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{plan.specs}</p>
                      <p className="text-lg font-semibold text-primary">{plan.price}</p>
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
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete platform for learning cloud infrastructure and server management
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
                Built for Learning
              </h2>
              <p className="text-lg text-muted-foreground">
                Our platform is designed to help communities learn cloud computing together
              </p>
            </div>

            <Card>
              <CardContent className="p-8">
                <div className="space-y-4">
                  {[
                    "Create real cloud servers with actual DigitalOcean infrastructure",
                    "Learn server administration in a safe, managed environment",
                    "Choose from various operating systems and templates",
                    "Admin oversight for community-based learning",
                    "Simple interface designed for beginners",
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
                      Start Learning Today
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
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Cloud className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">CloudManager</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 CloudManager. Built for learning communities.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
