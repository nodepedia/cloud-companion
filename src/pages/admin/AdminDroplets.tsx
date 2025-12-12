import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Server, 
  Search, 
  MoreVertical, 
  Power, 
  RefreshCw, 
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin
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
  user: string;
  userEmail: string;
  status: "running" | "stopped" | "creating";
  region: string;
  size: string;
  os: string;
  ip: string;
  created: string;
}

const AdminDroplets = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  const [droplets] = useState<Droplet[]>([
    {
      id: "1",
      name: "web-server-01",
      user: "John Doe",
      userEmail: "john@example.com",
      status: "running",
      region: "Singapore",
      size: "s-1vcpu-1gb",
      os: "Ubuntu 22.04",
      ip: "143.198.xxx.xxx",
      created: "2024-01-15",
    },
    {
      id: "2",
      name: "database-prod",
      user: "Jane Smith",
      userEmail: "jane@example.com",
      status: "running",
      region: "New York",
      size: "s-2vcpu-2gb",
      os: "Ubuntu 22.04",
      ip: "167.172.xxx.xxx",
      created: "2024-01-14",
    },
    {
      id: "3",
      name: "dev-environment",
      user: "Mike Wilson",
      userEmail: "mike@example.com",
      status: "stopped",
      region: "Amsterdam",
      size: "s-1vcpu-1gb",
      os: "Debian 11",
      ip: "178.62.xxx.xxx",
      created: "2024-01-13",
    },
    {
      id: "4",
      name: "test-server",
      user: "Sarah Lee",
      userEmail: "sarah@example.com",
      status: "creating",
      region: "London",
      size: "s-1vcpu-2gb",
      os: "CentOS 9",
      ip: "pending",
      created: "2024-01-15",
    },
  ]);

  const users = [...new Set(droplets.map((d) => d.user))];

  const filteredDroplets = droplets.filter((droplet) => {
    const matchesSearch = 
      droplet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      droplet.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      droplet.ip.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || droplet.status === statusFilter;
    const matchesUser = userFilter === "all" || droplet.user === userFilter;
    return matchesSearch && matchesStatus && matchesUser;
  });

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

  const handleAction = (action: string, dropletName: string) => {
    toast({
      title: `${action} initiated`,
      description: `${action} action on ${dropletName}`,
    });
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Droplets</h1>
          <p className="text-muted-foreground">Manage all user droplets</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, user, or IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="stopped">Stopped</SelectItem>
                  <SelectItem value="creating">Creating</SelectItem>
                </SelectContent>
              </Select>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user} value={user}>
                      {user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Droplets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredDroplets.map((droplet) => (
            <Card key={droplet.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                      <Server className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{droplet.name}</h3>
                      <p className="text-sm text-muted-foreground">{droplet.user}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${getStatusBadge(droplet.status)}`}>
                          {getStatusIcon(droplet.status)}
                          <span className="capitalize">{droplet.status}</span>
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
                      <DropdownMenuItem onClick={() => handleAction("Power toggle", droplet.name)}>
                        <Power className="w-4 h-4 mr-2" />
                        {droplet.status === "running" ? "Power Off" : "Power On"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction("Reboot", droplet.name)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reboot
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleAction("Delete", droplet.name)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
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
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium">{droplet.size}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">OS</p>
                    <p className="font-medium">{droplet.os}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">IP Address</p>
                    <p className="font-medium font-mono">{droplet.ip}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDroplets.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Droplets Found</h3>
              <p className="text-muted-foreground">
                No droplets match your current filters.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDroplets;
