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
      name: "Production API Key",
      key: "dop_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      isActive: true,
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      name: "Backup API Key",
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
      title: "API Key Added",
      description: "Your new API key has been added successfully.",
    });
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
    toast({
      title: "API Key Deleted",
      description: "The API key has been removed.",
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
      title: "API Key Activated",
      description: "This API key is now the active key for droplet creation.",
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
            <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
            <p className="text-muted-foreground">Manage your DigitalOcean API keys</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4" />
            Add API Key
          </Button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="animate-fade-up">
            <CardHeader>
              <CardTitle className="text-lg">Add New API Key</CardTitle>
              <CardDescription>
                Enter your DigitalOcean API key. This will be used for creating and managing droplets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddKey} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., Production API Key"
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
                  <Button type="submit">Save API Key</Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
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
                <h3 className="text-lg font-medium text-foreground mb-2">No API Keys</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first DigitalOcean API key to start creating droplets
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4" />
                  Add API Key
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
                              Active
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
                          Added on {apiKey.createdAt}
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
                          Set Active
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
                <h4 className="font-medium text-foreground">How to get your DigitalOcean API Key</h4>
                <ol className="mt-2 text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to your DigitalOcean Control Panel</li>
                  <li>Navigate to API → Tokens/Keys</li>
                  <li>Click "Generate New Token"</li>
                  <li>Give it a name and select "Read & Write" scope</li>
                  <li>Copy the token and paste it here</li>
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
