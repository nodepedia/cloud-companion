import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Server, 
  Plus,
  MoreVertical,
  Power,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Terminal,
  Copy
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Droplet {
  id: string;
  name: string;
  status: "running" | "stopped" | "creating";
  region: string;
  size: string;
  os: string;
  ip: string;
  created: string;
}

const UserDroplets = () => {
  const { toast } = useToast();

  const [droplets] = useState<Droplet[]>([
    {
      id: "1",
      name: "my-web-server",
      status: "running",
      region: "Singapore",
      size: "s-1vcpu-1gb",
      os: "Ubuntu 22.04",
      ip: "143.198.123.45",
      created: "2024-01-15",
    },
    {
      id: "2",
      name: "dev-environment",
      status: "stopped",
      region: "Amsterdam",
      size: "s-1vcpu-2gb",
      os: "Debian 11",
      ip: "178.62.234.56",
      created: "2024-01-13",
    },
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "stopped":
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
      case "creating":
        return <Clock className="w-4 h-4 text-warning animate-pulse" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      running: "bg-success/10 text-success",
      stopped: "bg-muted text-muted-foreground",
      creating: "bg-warning/10 text-warning",
    };
    return styles[status as keyof typeof styles] || "";
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "running":
        return "Berjalan";
      case "stopped":
        return "Berhenti";
      case "creating":
        return "Membuat";
      default:
        return status;
    }
  };

  const handleAction = (action: string, dropletName: string) => {
    toast({
      title: `${action} dimulai`,
      description: `Aksi ${action} pada ${dropletName}`,
    });
  };

  const handleCopyIP = (ip: string) => {
    navigator.clipboard.writeText(ip);
    toast({
      title: "IP Disalin",
      description: "Alamat IP berhasil disalin ke clipboard",
    });
  };

  return (
    <DashboardLayout role="user">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Droplet Saya</h1>
            <p className="text-muted-foreground">Kelola cloud server Anda</p>
          </div>
          <Button asChild>
            <Link to="/dashboard/droplets/create">
              <Plus className="w-4 h-4" />
              Buat Droplet
            </Link>
          </Button>
        </div>

        {/* Droplets Grid */}
        {droplets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Belum Ada Droplet</h3>
              <p className="text-muted-foreground mb-4">
                Buat cloud server pertama Anda untuk memulai
              </p>
              <Button asChild>
                <Link to="/dashboard/droplets/create">
                  <Plus className="w-4 h-4" />
                  Buat Droplet
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {droplets.map((droplet) => (
              <Card key={droplet.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                        <Server className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{droplet.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${getStatusBadge(droplet.status)}`}>
                            {getStatusIcon(droplet.status)}
                            <span>{getStatusLabel(droplet.status)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopyIP(droplet.ip)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Salin IP
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction("SSH Console", droplet.name)}>
                          <Terminal className="w-4 h-4 mr-2" />
                          Console
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction("Power toggle", droplet.name)}>
                          <Power className="w-4 h-4 mr-2" />
                          {droplet.status === "running" ? "Matikan" : "Nyalakan"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction("Reboot", droplet.name)}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reboot
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleAction("Hapus", droplet.name)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Region</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {droplet.region}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ukuran</p>
                      <p className="font-medium">{droplet.size}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">OS</p>
                      <p className="font-medium">{droplet.os}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Alamat IP</p>
                      <button 
                        onClick={() => handleCopyIP(droplet.ip)}
                        className="font-medium font-mono hover:text-primary transition-colors"
                      >
                        {droplet.ip}
                      </button>
                    </div>
                  </div>

                  {/* SSH Command */}
                  <div className="mt-4 p-3 rounded-lg bg-secondary">
                    <p className="text-xs text-muted-foreground mb-1">Perintah SSH</p>
                    <code className="text-sm font-mono text-foreground">
                      ssh root@{droplet.ip}
                    </code>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserDroplets;
