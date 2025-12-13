import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Server, 
  Users, 
  Key, 
  Activity,
  ArrowUpRight,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDigitalOcean, Droplet } from "@/hooks/useDigitalOcean";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

interface DropletWithUser extends Droplet {
  profiles?: {
    username: string;
    email: string;
  };
}

const AdminDashboard = () => {
  const [droplets, setDroplets] = useState<DropletWithUser[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { adminListDroplets } = useDigitalOcean();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load droplets
        const dropletsData = await adminListDroplets();
        setDroplets(dropletsData as DropletWithUser[]);

        // Load user count
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        setUserCount(count || 0);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const runningCount = droplets.filter(d => d.status === 'active').length;

  const stats = [
    { label: "Total Droplet", value: loading ? "-" : droplets.length.toString(), icon: Server, change: `${runningCount} aktif` },
    { label: "User Terdaftar", value: loading ? "-" : userCount.toString(), icon: Users, change: "Total" },
    { label: "API Key", value: "1", icon: Key, change: "Aktif" },
    { label: "Uptime", value: "99.9%", icon: Activity, change: "30 hari terakhir" },
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

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "text-success";
      case "off":
        return "text-muted-foreground";
      case "new":
        return "text-warning";
      default:
        return "text-warning";
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

  const formatCreatedAt = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: id });
    } catch {
      return date;
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>
          <p className="text-muted-foreground">Kelola infrastruktur cloud dan user</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">{stat.change}</span>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Konfigurasi API Key</CardTitle>
              <CardDescription>Kelola API key DigitalOcean untuk pembuatan droplet</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/admin/settings">
                  Konfigurasi API Key
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manajemen User</CardTitle>
              <CardDescription>Lihat dan kelola semua user terdaftar</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" asChild>
                <Link to="/admin/users">
                  Kelola User
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Droplets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Droplet Terbaru</CardTitle>
              <CardDescription>Droplet terakhir yang dibuat oleh user</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/droplets">Lihat Semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : droplets.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Belum ada droplet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nama</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Region</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Dibuat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {droplets.slice(0, 5).map((droplet) => (
                      <tr key={droplet.id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Server className="w-4 h-4 text-primary" />
                            <span className="font-medium">{droplet.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {droplet.profiles?.username || 'Unknown'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(droplet.status)}
                            <span className={`${getStatusText(droplet.status)}`}>
                              {getStatusLabel(droplet.status)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{droplet.region}</td>
                        <td className="py-3 px-4 text-muted-foreground">{formatCreatedAt(droplet.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
