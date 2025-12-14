import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Server, 
  Plus,
  MoreVertical,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Copy,
  Loader2,
  Shield
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useDigitalOcean, Droplet } from "@/hooks/useDigitalOcean";
import DropletIPCountdown from "@/components/DropletIPCountdown";
import FirewallDialog from "@/components/admin/FirewallDialog";
import { formatRegion, formatSize, formatImage } from "@/lib/dropletFormatters";

const UserDroplets = () => {
  const { toast } = useToast();
  const { loading, listDroplets, dropletAction } = useDigitalOcean();
  
  const [droplets, setDroplets] = useState<Droplet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; droplet: Droplet | null }>({
    open: false,
    droplet: null,
  });
  const [powerDialog, setPowerDialog] = useState<{ open: boolean; droplet: Droplet | null; action: 'power_on' | 'power_off' | null }>({
    open: false,
    droplet: null,
    action: null,
  });
  const [rebootDialog, setRebootDialog] = useState<{ open: boolean; droplet: Droplet | null }>({
    open: false,
    droplet: null,
  });
  const [firewallDialog, setFirewallDialog] = useState<{ open: boolean; droplet: Droplet | null }>({
    open: false,
    droplet: null,
  });

  const loadDroplets = async () => {
    try {
      const data = await listDroplets();
      setDroplets(data);
    } catch (error) {
      console.error('Failed to load droplets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDroplets();
    // Refresh every 30 seconds
    const interval = setInterval(loadDroplets, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "off":
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
      case "new":
      case "archive":
        return <Clock className="w-4 h-4 text-warning animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-success/10 text-success",
      off: "bg-muted text-muted-foreground",
      new: "bg-warning/10 text-warning",
      archive: "bg-warning/10 text-warning",
    };
    return styles[status] || "bg-muted text-muted-foreground";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Berjalan",
      off: "Mati",
      new: "Membuat...",
      archive: "Mengarsip...",
    };
    return labels[status] || status;
  };

  const handleAction = async (droplet: Droplet, action: string) => {
    if (action === 'delete') {
      setDeleteDialog({ open: true, droplet });
      return;
    }
    
    if (action === 'power_on' || action === 'power_off') {
      setPowerDialog({ open: true, droplet, action });
      return;
    }
    
    if (action === 'reboot') {
      setRebootDialog({ open: true, droplet });
      return;
    }

    setActionLoading(droplet.id);
    try {
      await dropletAction(droplet.id, action);
      setTimeout(loadDroplets, 2000);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmPower = async () => {
    if (!powerDialog.droplet || !powerDialog.action) return;
    
    setActionLoading(powerDialog.droplet.id);
    setPowerDialog({ open: false, droplet: null, action: null });
    
    try {
      await dropletAction(powerDialog.droplet.id, powerDialog.action);
      setTimeout(loadDroplets, 2000);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmReboot = async () => {
    if (!rebootDialog.droplet) return;
    
    setActionLoading(rebootDialog.droplet.id);
    setRebootDialog({ open: false, droplet: null });
    
    try {
      await dropletAction(rebootDialog.droplet.id, 'reboot');
      setTimeout(loadDroplets, 2000);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog.droplet) return;
    
    setActionLoading(deleteDialog.droplet.id);
    setDeleteDialog({ open: false, droplet: null });
    
    try {
      await dropletAction(deleteDialog.droplet.id, 'delete');
      setDroplets(prev => prev.filter(d => d.id !== deleteDialog.droplet!.id));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyIP = (ip: string) => {
    navigator.clipboard.writeText(ip);
    toast({
      title: "IP Disalin",
      description: "Alamat IP berhasil disalin ke clipboard",
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout role="user">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

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
                    
                    {/* Power Toggle, Reboot, and Actions */}
                    <div className="flex items-center gap-3">
                      {/* Power Toggle */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-medium">Power</span>
                        <Switch
                          checked={droplet.status === 'active'}
                          onCheckedChange={() => 
                            handleAction(droplet, droplet.status === 'active' ? 'power_off' : 'power_on')
                          }
                          disabled={actionLoading === droplet.id || droplet.status === 'new'}
                        />
                      </div>
                      
                      {/* Reboot Button */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-medium">Reboot</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleAction(droplet, 'reboot')}
                          disabled={actionLoading === droplet.id || droplet.status !== 'active'}
                        >
                          {actionLoading === droplet.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      
                      {/* More Actions Menu */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-medium">Menu</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading === droplet.id}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {droplet.ip_address && (
                              <DropdownMenuItem onClick={() => handleCopyIP(droplet.ip_address!)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Salin IP
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setFirewallDialog({ open: true, droplet })}>
                              <Shield className="w-4 h-4 mr-2" />
                              Firewall
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleAction(droplet, 'delete')}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Region</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {formatRegion(droplet.region)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ukuran</p>
                      <p className="font-medium">{formatSize(droplet.size)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Image</p>
                      <p className="font-medium">{formatImage(droplet.image)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Alamat IP</p>
                      <DropletIPCountdown 
                        ipAddress={droplet.ip_address}
                        createdAt={droplet.created_at}
                        onCopyIP={handleCopyIP}
                      />
                    </div>
                  </div>

                  {/* SSH Command - only show after countdown */}
                  {droplet.ip_address && (Date.now() - new Date(droplet.created_at).getTime() > 3 * 60 * 1000) && (
                    <div className="mt-4 p-3 rounded-lg bg-secondary">
                      <p className="text-xs text-muted-foreground mb-1">Perintah SSH</p>
                      <code className="text-sm font-mono text-foreground">
                        ssh root@{droplet.ip_address}
                      </code>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, droplet: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Droplet?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus droplet <strong>{deleteDialog.droplet?.name}</strong>? 
              Tindakan ini tidak dapat dibatalkan dan semua data akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Power Confirmation Dialog */}
      <AlertDialog open={powerDialog.open} onOpenChange={(open) => setPowerDialog({ open, droplet: null, action: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {powerDialog.action === 'power_on' ? 'Nyalakan' : 'Matikan'} Droplet?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin {powerDialog.action === 'power_on' ? 'menyalakan' : 'mematikan'} droplet <strong>{powerDialog.droplet?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPower}>
              Ya, {powerDialog.action === 'power_on' ? 'Nyalakan' : 'Matikan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reboot Confirmation Dialog */}
      <AlertDialog open={rebootDialog.open} onOpenChange={(open) => setRebootDialog({ open, droplet: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reboot Droplet?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin me-reboot droplet <strong>{rebootDialog.droplet?.name}</strong>? 
              Semua proses yang berjalan akan dihentikan sementara.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReboot}>
              Ya, Reboot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Firewall Dialog */}
      {firewallDialog.droplet && (
        <FirewallDialog
          open={firewallDialog.open}
          onOpenChange={(open) => setFirewallDialog({ open, droplet: open ? firewallDialog.droplet : null })}
          dropletId={firewallDialog.droplet.id}
          dropletName={firewallDialog.droplet.name}
          digitaloceanId={firewallDialog.droplet.digitalocean_id}
        />
      )}
    </DashboardLayout>
  );
};

export default UserDroplets;
