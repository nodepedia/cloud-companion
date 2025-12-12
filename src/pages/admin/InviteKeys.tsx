import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ticket, Plus, Copy, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InviteKey {
  id: string;
  key: string;
  is_active: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  used_by_username?: string;
}

const InviteKeys = () => {
  const [inviteKeys, setInviteKeys] = useState<InviteKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const fetchInviteKeys = async () => {
    const { data, error } = await supabase
      .from('invite_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Gagal memuat invite keys",
        variant: "destructive",
      });
      return;
    }

    // Fetch usernames for used keys
    const keysWithUsernames = await Promise.all(
      (data || []).map(async (key) => {
        if (key.used_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', key.used_by)
            .maybeSingle();
          return { ...key, used_by_username: profile?.username };
        }
        return key;
      })
    );

    setInviteKeys(keysWithUsernames);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInviteKeys();
  }, []);

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
    setIsCreating(true);
    const newKey = generateKey();

    const { data: userData } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('invite_keys')
      .insert({
        key: newKey,
        created_by: userData.user?.id,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Gagal membuat invite key",
        variant: "destructive",
      });
      setIsCreating(false);
      return;
    }

    toast({
      title: "Berhasil",
      description: "Invite key baru berhasil dibuat",
    });

    fetchInviteKeys();
    setIsCreating(false);
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Disalin!",
      description: "Invite key berhasil disalin ke clipboard",
    });
  };

  const deleteInviteKey = async (id: string) => {
    const { error } = await supabase
      .from('invite_keys')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus invite key",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Berhasil",
      description: "Invite key berhasil dihapus",
    });

    fetchInviteKeys();
  };

  const activeKeys = inviteKeys.filter(k => k.is_active && !k.used_by);
  const usedKeys = inviteKeys.filter(k => k.used_by);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Invite Keys</h1>
            <p className="text-muted-foreground">Kelola invite key untuk registrasi user baru</p>
          </div>
          <Button onClick={createInviteKey} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Buat Key Baru
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Key Tersedia</CardTitle>
              <Ticket className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{activeKeys.length}</div>
              <p className="text-xs text-muted-foreground">Belum digunakan</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Key Terpakai</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usedKeys.length}</div>
              <p className="text-xs text-muted-foreground">Sudah digunakan</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Keys Table */}
        <Card>
          <CardHeader>
            <CardTitle>Key Tersedia</CardTitle>
            <CardDescription>Key yang masih bisa digunakan untuk registrasi</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada invite key tersedia. Klik "Buat Key Baru" untuk membuat.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>
                        <code className="bg-secondary px-2 py-1 rounded font-mono text-sm">
                          {key.key}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(key.created_at).toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(key.key)}
                          >
                            <Copy className="w-4 h-4" />
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

        {/* Used Keys Table */}
        {usedKeys.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key Terpakai</CardTitle>
              <CardDescription>Riwayat invite key yang sudah digunakan</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Digunakan Oleh</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usedKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>
                        <code className="bg-secondary px-2 py-1 rounded font-mono text-sm text-muted-foreground">
                          {key.key}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{key.used_by_username || 'Unknown'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.used_at ? new Date(key.used_at).toLocaleDateString('id-ID') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InviteKeys;
