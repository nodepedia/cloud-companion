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
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const stats = [
    { label: "Total Droplets", value: "24", icon: Server, change: "+3 this week" },
    { label: "Active Users", value: "12", icon: Users, change: "+2 this week" },
    { label: "API Keys", value: "2", icon: Key, change: "Active" },
    { label: "Uptime", value: "99.9%", icon: Activity, change: "Last 30 days" },
  ];

  const recentDroplets = [
    { id: 1, name: "web-server-01", user: "John Doe", status: "running", region: "Singapore", created: "2 hours ago" },
    { id: 2, name: "database-prod", user: "Jane Smith", status: "running", region: "New York", created: "5 hours ago" },
    { id: 3, name: "dev-environment", user: "Mike Wilson", status: "stopped", region: "Amsterdam", created: "1 day ago" },
    { id: 4, name: "test-server", user: "Sarah Lee", status: "creating", region: "London", created: "Just now" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "stopped":
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
      case "creating":
        return <Clock className="w-4 h-4 text-warning" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "running":
        return "text-success";
      case "stopped":
        return "text-muted-foreground";
      case "creating":
        return "text-warning";
      default:
        return "";
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your cloud infrastructure and users</p>
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
              <CardTitle className="text-lg">API Key Configuration</CardTitle>
              <CardDescription>Manage DigitalOcean API keys for droplet creation</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/admin/api-keys">
                  Configure API Keys
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Management</CardTitle>
              <CardDescription>View and manage all registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" asChild>
                <Link to="/admin/users">
                  Manage Users
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
              <CardTitle className="text-lg">Recent Droplets</CardTitle>
              <CardDescription>Latest droplets created by users</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/droplets">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Region</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDroplets.map((droplet) => (
                    <tr key={droplet.id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-primary" />
                          <span className="font-medium">{droplet.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{droplet.user}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(droplet.status)}
                          <span className={`capitalize ${getStatusText(droplet.status)}`}>
                            {droplet.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{droplet.region}</td>
                      <td className="py-3 px-4 text-muted-foreground">{droplet.created}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
