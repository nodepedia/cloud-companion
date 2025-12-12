import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Plus, Trash2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  createdAt: string;
}

const ApiKeys = () => {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKey, setNewKey] = useState({ name: "", key: "" });
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: "1",
      name: "API Key Produksi",
      key: "dop_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      isActive: true,
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      name: "API Key Cadangan",
      key: "dop_v1_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
      isActive: false,
      createdAt: "2024-01-10",
    },
  ]);

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.name || !newKey.key) return;

    const key: ApiKey = {
      id: Date.now().toString(),
      name: newKey.name,
      key: newKey.key,
      isActive: apiKeys.length === 0,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setApiKeys([...apiKeys, key]);
    setNewKey({ name: "", key: "" });
    setShowAddForm(false);
    
    toast({
      title: "API Key Ditambahkan",
      description: "API key baru Anda berhasil ditambahkan.",
    });
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
    toast({
      title: "API Key Dihapus",
      description: "API key telah dihapus.",
    });
  };

  const handleSetActive = (id: string) => {
    setApiKeys(
      apiKeys.map((k) => ({
        ...k,
        isActive: k.id === id,
      }))
    );
    toast({
      title: "API Key Diaktifkan",
      description: "API key ini sekarang menjadi key aktif untuk pembuatan droplet.",
    });
  };

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (key: string) => {
    return key.substring(0, 12) + "..." + key.substring(key.length - 4);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">API Key</h1>
            <p className="text-muted-foreground">Kelola API key DigitalOcean Anda</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4" />
            Tambah API Key
          </Button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="animate-fade-up">
            <CardHeader>
              <CardTitle className="text-lg">Tambah API Key Baru</CardTitle>
              <CardDescription>
                Masukkan API key DigitalOcean Anda. Ini akan digunakan untuk membuat dan mengelola droplet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddKey} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Nama Key</Label>
                    <Input
                      id="keyName"
                      placeholder="contoh: API Key Produksi"
                      value={newKey.name}
                      onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="dop_v1_..."
                      value={newKey.key}
                      onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Simpan API Key</Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    Batal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* API Keys List */}
        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Belum Ada API Key</h3>
                <p className="text-muted-foreground mb-4">
                  Tambahkan API key DigitalOcean pertama Anda untuk mulai membuat droplet
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4" />
                  Tambah API Key
                </Button>
              </CardContent>
            </Card>
          ) : (
            apiKeys.map((apiKey) => (
              <Card key={apiKey.id} className={apiKey.isActive ? "border-primary" : ""}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        apiKey.isActive ? "bg-primary/10" : "bg-accent"
                      }`}>
                        <Key className={`w-5 h-5 ${apiKey.isActive ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{apiKey.name}</h3>
                          {apiKey.isActive && (
                            <span className="inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Aktif
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded">
                            {showKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                          </code>
                          <button
                            onClick={() => toggleShowKey(apiKey.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {showKeys[apiKey.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Ditambahkan pada {apiKey.createdAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-14 lg:ml-0">
                      {!apiKey.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetActive(apiKey.id)}
                        >
                          Jadikan Aktif
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteKey(apiKey.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Info Box */}
        <Card className="bg-accent/50 border-accent">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground">Cara mendapatkan API Key DigitalOcean</h4>
                <ol className="mt-2 text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Masuk ke DigitalOcean Control Panel</li>
                  <li>Navigasi ke API → Tokens/Keys</li>
                  <li>Klik "Generate New Token"</li>
                  <li>Beri nama dan pilih scope "Read & Write"</li>
                  <li>Salin token dan tempel di sini</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ApiKeys;
