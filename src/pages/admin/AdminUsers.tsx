import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  Search, 
  MoreVertical,
  Server,
  Mail,
  Calendar,
  Ban,
  UserCheck,
  Settings,
  Ticket,
  Plus,
  Copy,
  Trash2,
  Loader2,
  Check,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserWithLimits {
  id: string;
  username: string;
  email: string | null;
  created_at: string;
  dropletsCount: number;
  is_suspended: boolean;
  limits?: {
    max_droplets: number;
    allowed_sizes: string[];
    auto_destroy_days: number;
  };
}

interface InviteKey {
  id: string;
  key: string;
  is_active: boolean;
  max_uses: number;
  current_uses: number;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  preset_max_droplets: number;
  preset_allowed_sizes: string[];
  preset_auto_destroy_days: number;
}

const AVAILABLE_SIZES = [
  { slug: 's-1vcpu-512mb-10gb', label: '1vCPU 512MB 10GB' },
  { slug: 's-1vcpu-1gb', label: '1vCPU 1GB 25GB' },
  { slug: 's-1vcpu-2gb', label: '1vCPU 2GB 50GB' },
  { slug: 's-2vcpu-2gb', label: '2vCPU 2GB 60GB' },
  { slug: 's-2vcpu-4gb', label: '2vCPU 4GB 80GB' },
  { slug: 's-4vcpu-8gb', label: '4vCPU 8GB 160GB' },
  { slug: 's-8vcpu-16gb', label: '8vCPU 16GB 320GB' },
];

const AdminUsers = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserWithLimits[]>([]);
  const [inviteKeys, setInviteKeys] = useState<InviteKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithLimits | null>(null);
  const [showLimitsDialog, setShowLimitsDialog] = useState(false);
  const [limitsForm, setLimitsForm] = useState({
    max_droplets: 3,
    allowed_sizes: AVAILABLE_SIZES.map(s => s.slug),
    auto_destroy_days: 0,
  });
  const [savingLimits, setSavingLimits] = useState(false);
  const [newKeyMaxUses, setNewKeyMaxUses] = useState(1);
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [newKeyForm, setNewKeyForm] = useState({
    customKey: "",
    useRandomKey: true,
    maxUses: 1,
    maxDroplets: 3,
    allowedSizes: AVAILABLE_SIZES.map(s => s.slug),
    autoDestroyDays: 0,
  });

  const fetchUsers = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast({ title: "Error", description: "Gagal memuat users", variant: "destructive" });
      return;
    }

    const usersWithData = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { count } = await supabase
          .from('droplets')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        const { data: limits } = await supabase
          .from('user_limits')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle() as { data: { max_droplets: number; allowed_sizes: string[]; auto_destroy_days: number } | null };

        return {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          created_at: profile.created_at,
          dropletsCount: count || 0,
          is_suspended: (profile as any).is_suspended || false,
          limits: limits || undefined,
        };
      })
    );

    setUsers(usersWithData);
  };

  const fetchInviteKeys = async () => {
    const { data, error } = await supabase
      .from('invite_keys')
      .select('*')
      .order('created_at', { ascending: false }) as { data: InviteKey[] | null; error: any };

    if (error) {
      toast({ title: "Error", description: "Gagal memuat invite keys", variant: "destructive" });
      return;
    }

    setInviteKeys(data || []);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchUsers(), fetchInviteKeys()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const openLimitsDialog = (user: UserWithLimits) => {
    setSelectedUser(user);
    setLimitsForm({
      max_droplets: user.limits?.max_droplets ?? 3,
      allowed_sizes: user.limits?.allowed_sizes ?? AVAILABLE_SIZES.map(s => s.slug),
      auto_destroy_days: user.limits?.auto_destroy_days ?? 0,
    });
    setShowLimitsDialog(true);
  };

  const saveLimits = async () => {
    if (!selectedUser) return;
    setSavingLimits(true);

    const { error } = await supabase
      .from('user_limits')
      .upsert({
        user_id: selectedUser.id,
        max_droplets: limitsForm.max_droplets,
        allowed_sizes: limitsForm.allowed_sizes,
        auto_destroy_days: limitsForm.auto_destroy_days,
      }, { onConflict: 'user_id' }) as { error: any };

    if (error) {
      toast({ title: "Error", description: "Gagal menyimpan limitasi", variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Limitasi user berhasil disimpan" });
      await fetchUsers();
      setShowLimitsDialog(false);
    }
    setSavingLimits(false);
  };

  const generateKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let key = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) key += '-';
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const createInviteKey = async () => {
    setIsCreatingKey(true);
    
    let keyToUse = newKeyForm.customKey.trim().toUpperCase();
    if (newKeyForm.useRandomKey || !keyToUse) {
      keyToUse = generateKey();
    }
    
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('invite_keys')
      .insert({
        key: keyToUse,
        created_by: userData.user?.id,
        max_uses: newKeyForm.maxUses,
        preset_max_droplets: newKeyForm.maxDroplets,
        preset_allowed_sizes: newKeyForm.allowedSizes,
        preset_auto_destroy_days: newKeyForm.autoDestroyDays,
      } as any);

    if (error) {
      if (error.code === '23505') {
        toast({ title: "Error", description: "Invite key sudah ada, gunakan key lain", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Gagal membuat invite key", variant: "destructive" });
      }
    } else {
      toast({ title: "Berhasil", description: "Invite key baru berhasil dibuat" });
      await fetchInviteKeys();
      setShowCreateKeyDialog(false);
      // Reset form
      setNewKeyForm({
        customKey: "",
        useRandomKey: true,
        maxUses: 1,
        maxDroplets: 3,
        allowedSizes: AVAILABLE_SIZES.map(s => s.slug),
        autoDestroyDays: 0,
      });
    }
    setIsCreatingKey(false);
  };

  const toggleKeyActive = async (key: InviteKey) => {
    const { error } = await supabase
      .from('invite_keys')
      .update({ is_active: !key.is_active })
      .eq('id', key.id);

    if (error) {
      toast({ title: "Error", description: "Gagal mengubah status key", variant: "destructive" });
    } else {
      await fetchInviteKeys();
    }
  };

  const deleteInviteKey = async (id: string) => {
    const { error } = await supabase
      .from('invite_keys')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: "Gagal menghapus invite key", variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Invite key berhasil dihapus" });
      await fetchInviteKeys();
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Disalin!", description: "Invite key berhasil disalin" });
  };

  const toggleUserSuspend = async (user: UserWithLimits) => {
    const newStatus = !user.is_suspended;
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: newStatus } as any)
      .eq('id', user.id);

    if (error) {
      toast({ title: "Error", description: "Gagal mengubah status user", variant: "destructive" });
    } else {
      toast({ 
        title: "Berhasil", 
        description: newStatus ? "User berhasil di-suspend" : "User berhasil diaktifkan kembali" 
      });
      await fetchUsers();
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    setIsDeletingUser(true);

    try {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Session not found");
      }

      // Call edge function to delete user from auth.users
      const response = await fetch(
        `https://hmxhuemjueznudjigozo.supabase.co/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId: selectedUser.id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      toast({ title: "Berhasil", description: "User berhasil dihapus" });
      setShowDeleteDialog(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: "Gagal menghapus user: " + error.message, variant: "destructive" });
    } finally {
      setIsDeletingUser(false);
    }
  };

  const activeKeys = inviteKeys.filter(k => k.is_active && k.current_uses < k.max_uses);

  if (isLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">User</h1>
          <p className="text-muted-foreground">Kelola semua user terdaftar</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total User</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Server className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.reduce((sum, u) => sum + u.dropletsCount, 0)}</p>
                  <p className="text-sm text-muted-foreground">Total Droplet</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeKeys.length}</p>
                  <p className="text-sm text-muted-foreground">Key Tersedia</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inviteKeys.length - activeKeys.length}</p>
                  <p className="text-sm text-muted-foreground">Key Terpakai</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari user berdasarkan nama atau email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Daftar User</h2>
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{user.username}</h3>
                        {user.is_suspended && (
                          <Badge variant="destructive" className="text-xs">
                            Suspended
                          </Badge>
                        )}
                        {user.limits && (
                          <Badge variant="outline" className="text-xs">
                            Max {user.limits.max_droplets} droplet
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email || '-'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Server className="w-3 h-3" />
                          {user.dropletsCount} droplet
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(user.created_at).toLocaleDateString('id-ID')}
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
                      <DropdownMenuItem onClick={() => openLimitsDialog(user)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Atur Limitasi
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleUserSuspend(user)}>
                        {user.is_suspended ? (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Aktifkan User
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4 mr-2" />
                            Suspend User
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Server className="w-4 h-4 mr-2" />
                        Lihat Droplet
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Hapus User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Tidak Ada User Ditemukan</h3>
              <p className="text-muted-foreground">
                Tidak ada user yang sesuai dengan pencarian Anda.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Invite Keys Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Invite Keys</h2>
              <p className="text-sm text-muted-foreground">Kelola invite key untuk registrasi user baru</p>
            </div>
            <Button onClick={() => setShowCreateKeyDialog(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Buat Key
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {inviteKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Belum ada invite key
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Penggunaan</TableHead>
                      <TableHead>Preset Limit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dibuat</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inviteKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell>
                          <code className="bg-secondary px-2 py-1 rounded font-mono text-xs">
                            {key.key}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {key.current_uses} / {key.max_uses}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            <p>Max: {(key as any).preset_max_droplets || 3} droplet</p>
                            <p>Destroy: {(key as any).preset_auto_destroy_days || 0} hari</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {key.current_uses >= key.max_uses ? (
                            <Badge variant="secondary">Habis</Badge>
                          ) : key.is_active ? (
                            <Badge className="bg-success/10 text-success hover:bg-success/20">Aktif</Badge>
                          ) : (
                            <Badge variant="outline">Nonaktif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(key.created_at).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(key.key)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toggleKeyActive(key)}>
                              {key.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteInviteKey(key.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Limits Dialog */}
      <Dialog open={showLimitsDialog} onOpenChange={setShowLimitsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atur Limitasi - {selectedUser?.username}</DialogTitle>
            <DialogDescription>Atur batasan untuk user ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Maksimal Droplet</Label>
              <Select value={String(limitsForm.max_droplets)} onValueChange={(v) => setLimitsForm({ ...limitsForm, max_droplets: Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 10, 15, 20].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} droplet</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Spesifikasi yang Diizinkan</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {AVAILABLE_SIZES.map((size) => (
                  <div key={size.slug} className="flex items-center gap-2">
                    <Checkbox
                      id={size.slug}
                      checked={limitsForm.allowed_sizes.includes(size.slug)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setLimitsForm({ ...limitsForm, allowed_sizes: [...limitsForm.allowed_sizes, size.slug] });
                        } else {
                          setLimitsForm({ ...limitsForm, allowed_sizes: limitsForm.allowed_sizes.filter(s => s !== size.slug) });
                        }
                      }}
                    />
                    <label htmlFor={size.slug} className="text-sm cursor-pointer">{size.label}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Auto Destroy Droplet</Label>
              <Select value={String(limitsForm.auto_destroy_days)} onValueChange={(v) => setLimitsForm({ ...limitsForm, auto_destroy_days: Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Tidak ada (permanen)</SelectItem>
                  <SelectItem value="1">1 hari</SelectItem>
                  <SelectItem value="2">2 hari</SelectItem>
                  <SelectItem value="3">3 hari</SelectItem>
                  <SelectItem value="7">7 hari</SelectItem>
                  <SelectItem value="14">14 hari</SelectItem>
                  <SelectItem value="30">30 hari</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Droplet akan otomatis dihapus setelah waktu yang ditentukan</p>
            </div>

            <Button onClick={saveLimits} disabled={savingLimits} className="w-full">
              {savingLimits && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Limitasi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invite Key Dialog */}
      <Dialog open={showCreateKeyDialog} onOpenChange={setShowCreateKeyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Invite Key Baru</DialogTitle>
            <DialogDescription>Atur invite key dan limitasi untuk user yang mendaftar</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Key Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Invite Key</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="useRandomKey"
                    checked={newKeyForm.useRandomKey}
                    onCheckedChange={(checked) => setNewKeyForm({ ...newKeyForm, useRandomKey: !!checked })}
                  />
                  <label htmlFor="useRandomKey" className="text-sm cursor-pointer">Generate acak</label>
                </div>
              </div>
              {!newKeyForm.useRandomKey && (
                <Input
                  placeholder="Masukkan invite key custom..."
                  value={newKeyForm.customKey}
                  onChange={(e) => setNewKeyForm({ ...newKeyForm, customKey: e.target.value.toUpperCase() })}
                  className="font-mono"
                />
              )}
              {newKeyForm.useRandomKey && (
                <p className="text-sm text-muted-foreground">Key akan di-generate secara acak saat dibuat</p>
              )}
            </div>

            {/* Max Uses */}
            <div className="space-y-2">
              <Label>Jumlah Penggunaan</Label>
              <Select value={String(newKeyForm.maxUses)} onValueChange={(v) => setNewKeyForm({ ...newKeyForm, maxUses: Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}x pakai</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preset Max Droplets */}
            <div className="space-y-2">
              <Label>Maksimal Droplet</Label>
              <Select value={String(newKeyForm.maxDroplets)} onValueChange={(v) => setNewKeyForm({ ...newKeyForm, maxDroplets: Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 10, 15, 20].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} droplet</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preset Allowed Sizes */}
            <div className="space-y-2">
              <Label>Spesifikasi yang Diizinkan</Label>
              <div className="space-y-2 max-h-36 overflow-y-auto border rounded-md p-3">
                {AVAILABLE_SIZES.map((size) => (
                  <div key={size.slug} className="flex items-center gap-2">
                    <Checkbox
                      id={`new-${size.slug}`}
                      checked={newKeyForm.allowedSizes.includes(size.slug)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewKeyForm({ ...newKeyForm, allowedSizes: [...newKeyForm.allowedSizes, size.slug] });
                        } else {
                          setNewKeyForm({ ...newKeyForm, allowedSizes: newKeyForm.allowedSizes.filter(s => s !== size.slug) });
                        }
                      }}
                    />
                    <label htmlFor={`new-${size.slug}`} className="text-sm cursor-pointer">{size.label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Preset Auto Destroy */}
            <div className="space-y-2">
              <Label>Auto Destroy Droplet</Label>
              <Select value={String(newKeyForm.autoDestroyDays)} onValueChange={(v) => setNewKeyForm({ ...newKeyForm, autoDestroyDays: Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Tidak ada (permanen)</SelectItem>
                  <SelectItem value="1">1 hari</SelectItem>
                  <SelectItem value="2">2 hari</SelectItem>
                  <SelectItem value="3">3 hari</SelectItem>
                  <SelectItem value="7">7 hari</SelectItem>
                  <SelectItem value="14">14 hari</SelectItem>
                  <SelectItem value="30">30 hari</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Droplet user akan otomatis dihapus setelah waktu yang ditentukan</p>
            </div>

            <Button onClick={createInviteKey} disabled={isCreatingKey} className="w-full">
              {isCreatingKey && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Buat Invite Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus user <strong>{selectedUser?.username}</strong>? 
              Semua data termasuk droplet, limitasi, dan role akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingUser}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteUser} 
              disabled={isDeletingUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingUser && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default AdminUsers;