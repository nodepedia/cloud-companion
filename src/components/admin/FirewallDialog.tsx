import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Shield, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FirewallRule {
  protocol: string;
  ports: string;
  sources?: { addresses: string[] };
  destinations?: { addresses: string[] };
}

interface Firewall {
  id: string;
  name: string;
  status: string;
  inbound_rules: FirewallRule[];
  outbound_rules: FirewallRule[];
  droplet_ids: number[];
}

interface FirewallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropletId: string;
  dropletName: string;
  digitaloceanId: number;
}

const FirewallDialog = ({
  open,
  onOpenChange,
  dropletId,
  dropletName,
  digitaloceanId,
}: FirewallDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [firewalls, setFirewalls] = useState<Firewall[]>([]);
  const [assignedFirewall, setAssignedFirewall] = useState<Firewall | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // New rule form
  const [newRule, setNewRule] = useState({
    direction: "inbound" as "inbound" | "outbound",
    protocol: "tcp",
    ports: "",
    addresses: "0.0.0.0/0,::/0",
  });

  const loadFirewalls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("digitalocean", {
        body: { action: "list-firewalls" },
      });
      
      if (error) throw error;
      
      setFirewalls(data || []);
      
      // Find firewall assigned to this droplet
      const assigned = data?.find((fw: Firewall) => 
        fw.droplet_ids?.includes(digitaloceanId)
      );
      setAssignedFirewall(assigned || null);
    } catch (error: any) {
      toast({
        title: "Gagal memuat firewall",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadFirewalls();
    }
  }, [open]);

  const handleCreateFirewall = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("digitalocean", {
        body: {
          action: "create-firewall",
          name: `firewall-${dropletName}`,
          dropletIds: [digitaloceanId],
          inboundRules: [
            { protocol: "tcp", ports: "22", sources: { addresses: ["0.0.0.0/0", "::/0"] } },
            { protocol: "icmp", ports: "0", sources: { addresses: ["0.0.0.0/0", "::/0"] } },
          ],
          outboundRules: [
            { protocol: "tcp", ports: "all", destinations: { addresses: ["0.0.0.0/0", "::/0"] } },
            { protocol: "udp", ports: "all", destinations: { addresses: ["0.0.0.0/0", "::/0"] } },
            { protocol: "icmp", ports: "0", destinations: { addresses: ["0.0.0.0/0", "::/0"] } },
          ],
        },
      });

      if (error) throw error;

      toast({ title: "Firewall berhasil dibuat" });
      loadFirewalls();
      setShowCreateForm(false);
    } catch (error: any) {
      toast({
        title: "Gagal membuat firewall",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!assignedFirewall || !newRule.ports) return;
    
    setLoading(true);
    try {
      const rule = {
        protocol: newRule.protocol,
        ports: newRule.protocol === "icmp" ? "0" : newRule.ports,
        ...(newRule.direction === "inbound" 
          ? { sources: { addresses: newRule.addresses.split(",").map(a => a.trim()) } }
          : { destinations: { addresses: newRule.addresses.split(",").map(a => a.trim()) } }
        ),
      };

      const { error } = await supabase.functions.invoke("digitalocean", {
        body: {
          action: "add-firewall-rules",
          firewallId: assignedFirewall.id,
          inboundRules: newRule.direction === "inbound" ? [rule] : [],
          outboundRules: newRule.direction === "outbound" ? [rule] : [],
        },
      });

      if (error) throw error;

      toast({ title: "Rule berhasil ditambahkan" });
      setNewRule({ direction: "inbound", protocol: "tcp", ports: "", addresses: "0.0.0.0/0,::/0" });
      loadFirewalls();
    } catch (error: any) {
      toast({
        title: "Gagal menambah rule",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRule = async (direction: "inbound" | "outbound", rule: FirewallRule) => {
    if (!assignedFirewall) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("digitalocean", {
        body: {
          action: "remove-firewall-rules",
          firewallId: assignedFirewall.id,
          inboundRules: direction === "inbound" ? [rule] : [],
          outboundRules: direction === "outbound" ? [rule] : [],
        },
      });

      if (error) throw error;

      toast({ title: "Rule berhasil dihapus" });
      loadFirewalls();
    } catch (error: any) {
      toast({
        title: "Gagal menghapus rule",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignFirewall = async (firewallId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("digitalocean", {
        body: {
          action: "assign-firewall",
          firewallId,
          dropletIds: [digitaloceanId],
        },
      });

      if (error) throw error;

      toast({ title: "Firewall berhasil di-assign" });
      loadFirewalls();
    } catch (error: any) {
      toast({
        title: "Gagal assign firewall",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignFirewall = async () => {
    if (!assignedFirewall) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("digitalocean", {
        body: {
          action: "unassign-firewall",
          firewallId: assignedFirewall.id,
          dropletIds: [digitaloceanId],
        },
      });

      if (error) throw error;

      toast({ title: "Firewall berhasil di-unassign" });
      loadFirewalls();
    } catch (error: any) {
      toast({
        title: "Gagal unassign firewall",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPorts = (ports: string) => {
    if (ports === "0" || ports === "all") return "All";
    return ports;
  };

  const formatAddresses = (rule: FirewallRule, direction: "inbound" | "outbound") => {
    const addrs = direction === "inbound" 
      ? rule.sources?.addresses 
      : rule.destinations?.addresses;
    if (!addrs || addrs.length === 0) return "Any";
    if (addrs.includes("0.0.0.0/0") || addrs.includes("::/0")) return "Any";
    return addrs.join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Firewall - {dropletName}
          </DialogTitle>
        </DialogHeader>

        {loading && !assignedFirewall ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !assignedFirewall ? (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Tidak ada firewall</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Droplet ini belum memiliki firewall. Buat baru atau assign firewall yang sudah ada.
              </p>
            </div>

            {firewalls.length > 0 && (
              <div className="space-y-2">
                <Label>Assign Firewall yang Sudah Ada</Label>
                <Select onValueChange={handleAssignFirewall}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih firewall..." />
                  </SelectTrigger>
                  <SelectContent>
                    {firewalls.map((fw) => (
                      <SelectItem key={fw.id} value={fw.id}>
                        {fw.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-center">
              <Button onClick={handleCreateFirewall} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Buat Firewall Baru
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Firewall Info */}
            <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-success" />
                <span className="font-medium">{assignedFirewall.name}</span>
                <Badge variant="outline">{assignedFirewall.status}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleUnassignFirewall} disabled={loading}>
                Unassign
              </Button>
            </div>

            {/* Inbound Rules */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full"></span>
                Inbound Rules
              </h4>
              <div className="space-y-2">
                {assignedFirewall.inbound_rules?.map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{rule.protocol.toUpperCase()}</Badge>
                      <span>Port: {formatPorts(rule.ports)}</span>
                      <span className="text-muted-foreground">From: {formatAddresses(rule, "inbound")}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveRule("inbound", rule)}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {(!assignedFirewall.inbound_rules || assignedFirewall.inbound_rules.length === 0) && (
                  <p className="text-muted-foreground text-sm">Tidak ada inbound rules</p>
                )}
              </div>
            </div>

            {/* Outbound Rules */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                Outbound Rules
              </h4>
              <div className="space-y-2">
                {assignedFirewall.outbound_rules?.map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{rule.protocol.toUpperCase()}</Badge>
                      <span>Port: {formatPorts(rule.ports)}</span>
                      <span className="text-muted-foreground">To: {formatAddresses(rule, "outbound")}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveRule("outbound", rule)}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {(!assignedFirewall.outbound_rules || assignedFirewall.outbound_rules.length === 0) && (
                  <p className="text-muted-foreground text-sm">Tidak ada outbound rules</p>
                )}
              </div>
            </div>

            {/* Add Rule Form */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Tambah Rule Baru</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Direction</Label>
                  <Select 
                    value={newRule.direction} 
                    onValueChange={(v) => setNewRule({ ...newRule, direction: v as "inbound" | "outbound" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbound">Inbound</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Protocol</Label>
                  <Select 
                    value={newRule.protocol} 
                    onValueChange={(v) => setNewRule({ ...newRule, protocol: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tcp">TCP</SelectItem>
                      <SelectItem value="udp">UDP</SelectItem>
                      <SelectItem value="icmp">ICMP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Ports</Label>
                  <Input
                    placeholder="22 atau 80-443"
                    value={newRule.ports}
                    onChange={(e) => setNewRule({ ...newRule, ports: e.target.value })}
                    disabled={newRule.protocol === "icmp"}
                  />
                </div>
                <div>
                  <Label className="text-xs">Addresses</Label>
                  <Input
                    placeholder="0.0.0.0/0"
                    value={newRule.addresses}
                    onChange={(e) => setNewRule({ ...newRule, addresses: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleAddRule} disabled={loading || (!newRule.ports && newRule.protocol !== "icmp")}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Tambah Rule
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FirewallDialog;
