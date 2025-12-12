import { useState } from "react";
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
  ArrowRight
} from "lucide-react";

const UserDashboard = () => {
  const stats = [
    { label: "My Droplets", value: "2", icon: Server },
    { label: "Running", value: "1", icon: CheckCircle, color: "text-success" },
    { label: "Stopped", value: "1", icon: AlertCircle, color: "text-muted-foreground" },
  ];

  const droplets = [
    {
      id: "1",
      name: "my-web-server",
      status: "running",
      region: "Singapore",
      size: "1 vCPU, 1GB RAM",
      ip: "143.198.xxx.xxx",
    },
    {
      id: "2",
      name: "dev-environment",
      status: "stopped",
      region: "Amsterdam",
      size: "1 vCPU, 2GB RAM",
      ip: "178.62.xxx.xxx",
    },
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

  return (
    <DashboardLayout role="user">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Manage your cloud servers.</p>
          </div>
          <Button asChild>
            <Link to="/dashboard/droplets/create">
              <Plus className="w-4 h-4" />
              Create Droplet
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
                    <p className="text-2xl font-bold">{stat.value}</p>
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
                  <h3 className="font-semibold text-foreground">Create a New Droplet</h3>
                  <p className="text-sm text-muted-foreground">
                    Deploy your own cloud server in minutes
                  </p>
                </div>
              </div>
              <Button variant="hero" asChild>
                <Link to="/dashboard/droplets/create">
                  Get Started
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
              <CardTitle className="text-lg">My Droplets</CardTitle>
              <CardDescription>Your cloud servers</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/droplets">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {droplets.length === 0 ? (
              <div className="py-8 text-center">
                <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Droplets Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first droplet to get started
                </p>
                <Button asChild>
                  <Link to="/dashboard/droplets/create">
                    <Plus className="w-4 h-4" />
                    Create Droplet
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {droplets.map((droplet) => (
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
                            <span className="capitalize">{droplet.status}</span>
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {droplet.region} • {droplet.size}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-foreground">{droplet.ip}</p>
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
