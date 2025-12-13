import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Key, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Wallet, 
  Loader2,
  RefreshCw,
  XCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

interface ApiKeyBalance {
  month_to_date_balance: string;
  account_balance: string;
  month_to_date_usage: string;
  generated_at: string;
}

interface ApiKey {
  id: string;
  name: string;
  api_key_masked: string;
  is_active: boolean;
  last_checked_at: string | null;
  last_balance: ApiKeyBalance | null;
  last_error: string | null;
  created_at: string;
}

const ApiKeysTab = () => {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState({ name: "", apiKey: "" });
  const [addingKey, setAddingKey] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState(false);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('digitalocean', {
        body: { action: 'admin-list-api-keys' },
      });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (err: any) {
      console.error('Failed to load API keys:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Gagal memuat API keys",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.name || !newKey.apiKey) return;

    setAddingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke('digitalocean', {
        body: { 
          action: 'admin-add-api-key',
          name: newKey.name,
          apiKey: newKey.apiKey,
        },
      });

      if (error) throw error;

      setApiKeys(prev => [...prev, data]);
      setNewKey({ name: "", apiKey: "" });
      setShowAddForm(false);
      
      toast({
        title: "API Key Ditambahkan",
        description: "API key baru berhasil ditambahkan dan diverifikasi.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menambah API Key",
        description: err.message || "Terjadi kesalahan",
      });
    } finally {
      setAddingKey(false);
    }
  };

  const handleCheckBalance = async (keyId: string) => {
    setCheckingBalance(keyId);
    try {
      const { data, error } = await supabase.functions.invoke('digitalocean', {
        body: { action: 'admin-check-api-key-balance', keyId },
      });

      if (error) throw error;

      // Update local state with new balance
      setApiKeys(prev => prev.map(k => 
        k.id === keyId 
          ? { ...k, last_balance: data, last_checked_at: new Date().toISOString(), last_error: null }
          : k
      ));
      
      toast({
        title: "Balance Diperbarui",
        description: "Informasi saldo berhasil diperbarui.",
      });
    } catch (err: any) {
      // Update with error
      setApiKeys(prev => prev.map(k => 
        k.id === keyId 
          ? { ...k, last_error: err.message, last_checked_at: new Date().toISOString() }
          : k
      ));
      
      toast({
        variant: "destructive",
        title: "Gagal Cek Balance",
        description: err.message || "Terjadi kesalahan",
      });
    } finally {
      setCheckingBalance(null);
    }
  };

  const handleToggleActive = async (keyId: string, currentActive: boolean) => {
    setTogglingKey(keyId);
    try {
      const { data, error } = await supabase.functions.invoke('digitalocean', {
        body: { 
          action: 'admin-update-api-key',
          keyId,
          isActive: !currentActive,
        },
      });

      if (error) throw error;

      setApiKeys(prev => prev.map(k => 
        k.id === keyId ? { ...k, is_active: !currentActive, last_error: !currentActive ? null : k.last_error } : k
      ));
      
      toast({
        title: currentActive ? "API Key Dinonaktifkan" : "API Key Diaktifkan",
        description: currentActive 
          ? "API key tidak akan digunakan untuk request."
          : "API key siap digunakan untuk request.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Update API Key",
        description: err.message || "Terjadi kesalahan",
      });
    } finally {
      setTogglingKey(null);
    }
  };

  const handleDeleteKey = async () => {
    if (!deleteKeyId) return;
    
    setDeletingKey(true);
    try {
      const { error } = await supabase.functions.invoke('digitalocean', {
        body: { action: 'admin-delete-api-key', keyId: deleteKeyId },
      });

      if (error) throw error;

      setApiKeys(prev => prev.filter(k => k.id !== deleteKeyId));
      
      toast({
        title: "API Key Dihapus",
        description: "API key berhasil dihapus.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Hapus API Key",
        description: err.message || "Terjadi kesalahan",
      });
    } finally {
      setDeletingKey(false);
      setDeleteKeyId(null);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(num));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID');
  };

  const activeCount = apiKeys.filter(k => k.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Key DigitalOcean</h2>
          <p className="text-sm text-muted-foreground">
            Kelola API key untuk membuat dan mengelola droplet. 
            {activeCount > 0 && <span className="text-success ml-1">({activeCount} aktif)</span>}
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} size="sm">
          <Plus className="w-4 h-4" />
          Tambah
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="animate-fade-up">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Tambah API Key Baru</CardTitle>
            <CardDescription className="text-sm">
              API key akan diverifikasi sebelum disimpan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddKey} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Nama Key</Label>
                  <Input
                    id="keyName"
                    placeholder="contoh: API Key Utama"
                    value={newKey.name}
                    onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                    required
                    disabled={addingKey}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="dop_v1_..."
                    value={newKey.apiKey}
                    onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                    required
                    disabled={addingKey}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={addingKey}>
                  {addingKey && <Loader2 className="w-4 h-4 animate-spin" />}
                  {addingKey ? 'Memverifikasi...' : 'Simpan'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)} disabled={addingKey}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Key className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium text-foreground mb-1">Belum Ada API Key</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Tambahkan API key DigitalOcean pertama Anda
            </p>
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="w-4 h-4" />
              Tambah API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id} className={apiKey.is_active ? "border-primary" : apiKey.last_error ? "border-destructive/50" : ""}>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        apiKey.is_active ? "bg-primary/10" : apiKey.last_error ? "bg-destructive/10" : "bg-accent"
                      }`}>
                        <Key className={`w-4 h-4 ${
                          apiKey.is_active ? "text-primary" : apiKey.last_error ? "text-destructive" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground text-sm">{apiKey.name}</h3>
                          {apiKey.is_active ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Aktif
                            </span>
                          ) : apiKey.last_error ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" />
                              Error
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              Nonaktif
                            </span>
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded mt-1 inline-block">
                          {apiKey.api_key_masked}
                        </code>
                        {apiKey.last_error && (
                          <p className="text-xs text-destructive mt-1">
                            Error: {apiKey.last_error}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-12 lg:ml-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckBalance(apiKey.id)}
                        disabled={checkingBalance === apiKey.id}
                      >
                        {checkingBalance === apiKey.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Refresh
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(apiKey.id, apiKey.is_active)}
                        disabled={togglingKey === apiKey.id}
                      >
                        {togglingKey === apiKey.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : apiKey.is_active ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                        {apiKey.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteKeyId(apiKey.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Balance Info */}
                  {apiKey.last_balance && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t">
                      <div className={`p-3 rounded-lg ${parseFloat(apiKey.last_balance.account_balance) < 0 ? 'bg-success/10' : 'bg-accent/50'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Wallet className={`w-4 h-4 ${parseFloat(apiKey.last_balance.account_balance) < 0 ? 'text-success' : 'text-primary'}`} />
                          <p className="text-xs text-muted-foreground">
                            {parseFloat(apiKey.last_balance.account_balance) < 0 ? 'Kredit Tersedia' : 'Tagihan'}
                          </p>
                        </div>
                        <p className={`text-lg font-bold ${parseFloat(apiKey.last_balance.account_balance) < 0 ? 'text-success' : 'text-foreground'}`}>
                          {formatCurrency(apiKey.last_balance.account_balance)}
                        </p>
                        {parseFloat(apiKey.last_balance.account_balance) < 0 && (
                          <p className="text-xs text-success">GitHub Student Pack / Promo</p>
                        )}
                      </div>
                      <div className="p-3 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground mb-1">Penggunaan Bulan Ini</p>
                        <p className="text-lg font-bold text-foreground">
                          {formatCurrency(apiKey.last_balance.month_to_date_usage)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground mb-1">Terakhir Dicek</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatDate(apiKey.last_checked_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Box */}
      <Card className="bg-accent/50 border-accent">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground text-sm">Tentang Multi API Key</h4>
              <ul className="mt-1 text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Anda dapat menambahkan beberapa API key sekaligus</li>
                <li>Sistem akan menggunakan key aktif paling awal sebagai primary</li>
                <li>Jika key gagal (auth error), otomatis dinonaktifkan dan request berikutnya menggunakan key lain</li>
                <li>Key yang dinonaktifkan otomatis bisa diaktifkan kembali secara manual</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              API key akan dihapus permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingKey}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKey}
              disabled={deletingKey}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingKey && <Loader2 className="w-4 h-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ApiKeysTab;
