import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Server, 
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2
} from "lucide-react";
import { useDigitalOcean, Droplet } from "@/hooks/useDigitalOcean";

const UserDashboard = () => {
  const [droplets, setDroplets] = useState<Droplet[]>([]);
  const [loading, setLoading] = useState(true);
  const { listDroplets } = useDigitalOcean();

  useEffect(() => {
    const loadDroplets = async () => {
      try {
        const data = await listDroplets();
        setDroplets(data);
      } catch (error) {
        console.error('Failed to load droplets:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDroplets();
  }, []);

  const runningCount = droplets.filter(d => d.status === 'active').length;
  const stoppedCount = droplets.filter(d => d.status === 'off').length;

  const stats = [
    { label: "Droplet Saya", value: droplets.length.toString(), icon: Server },
    { label: "Berjalan", value: runningCount.toString(), icon: CheckCircle, color: "text-success" },
    { label: "Berhenti", value: stoppedCount.toString(), icon: AlertCircle, color: "text-muted-foreground" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "off":
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
      case "new":
        return <Clock className="w-4 h-4 text-warning" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Berjalan";
      case "off":
        return "Berhenti";
      case "new":
        return "Membuat";
      default:
        return status;
    }
  };

  return (
    <DashboardLayout role="user">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Selamat datang! Kelola cloud server Anda.</p>
          </div>
          <Button asChild>
            <Link to="/dashboard/droplets/create">
              <Plus className="w-4 h-4" />
              Buat Droplet
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <stat.icon className={`w-5 h-5 ${stat.color || "text-primary"}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{loading ? "-" : stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Create */}
        <Card className="bg-accent/30 border-dashed border-2 border-primary/30 hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                  <Server className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Buat Droplet Baru</h3>
                  <p className="text-sm text-muted-foreground">
                    Deploy cloud server Anda sendiri dalam hitungan menit
                  </p>
                </div>
              </div>
              <Button variant="hero" asChild>
                <Link to="/dashboard/droplets/create">
                  Mulai
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* My Droplets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Droplet Saya</CardTitle>
              <CardDescription>Cloud server Anda</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/droplets">Lihat Semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : droplets.length === 0 ? (
              <div className="py-8 text-center">
                <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Belum Ada Droplet</h3>
                <p className="text-muted-foreground mb-4">
                  Buat droplet pertama Anda untuk memulai
                </p>
                <Button asChild>
                  <Link to="/dashboard/droplets/create">
                    <Plus className="w-4 h-4" />
                    Buat Droplet
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {droplets.slice(0, 5).map((droplet) => (
                  <div
                    key={droplet.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
                        <Server className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{droplet.name}</h4>
                          <span className="flex items-center gap-1 text-xs">
                            {getStatusIcon(droplet.status)}
                            <span>{getStatusLabel(droplet.status)}</span>
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {droplet.region} • {droplet.size}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-foreground">{droplet.ip_address || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserDashboard;
