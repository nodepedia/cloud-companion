import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Globe, Image, Upload, Loader2, ExternalLink, Check, Server, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GeneralSettings {
  favicon_url: string;
  custom_domain: string;
  server_ip: string;
}

const GeneralSettingsTab = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<GeneralSettings>({
    favicon_url: "",
    custom_domain: "",
    server_ip: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_settings" as any)
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        const settingsData = data as any;
        setSettings({
          favicon_url: settingsData.favicon_url || "",
          custom_domain: settingsData.custom_domain || "",
          server_ip: settingsData.server_ip || "",
        });
        if (settingsData.favicon_url) {
          setFaviconPreview(settingsData.favicon_url);
        }
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/x-icon", "image/png", "image/jpeg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Format file tidak valid. Gunakan ICO, PNG, JPG, atau SVG.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      toast({
        title: "Error",
        description: "Ukuran file maksimal 500KB.",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileName = `favicon-${Date.now()}.${file.name.split('.').pop()}`;
      
      const { data, error } = await supabase.storage
        .from("site-assets")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("site-assets")
        .getPublicUrl(fileName);

      setSettings(prev => ({ ...prev, favicon_url: urlData.publicUrl }));
      setFaviconPreview(urlData.publicUrl);

      toast({
        title: "Berhasil",
        description: "Favicon berhasil diupload",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal mengupload favicon",
        variant: "destructive",
      });
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from("site_settings" as any)
        .select("id")
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("site_settings" as any)
          .update({
            favicon_url: settings.favicon_url,
            custom_domain: settings.custom_domain,
            server_ip: settings.server_ip,
            updated_at: new Date().toISOString(),
          })
          .eq("id", (existing as any).id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("site_settings" as any)
          .insert({
            favicon_url: settings.favicon_url,
            custom_domain: settings.custom_domain,
            server_ip: settings.server_ip,
          });

        if (error) throw error;
      }

      toast({
        title: "Berhasil",
        description: "Pengaturan berhasil disimpan",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menyimpan pengaturan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Disalin",
      description: "Teks berhasil disalin ke clipboard",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const serverIp = settings.server_ip || "YOUR_SERVER_IP";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Kelola pengaturan umum website Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Server IP Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-muted-foreground" />
              <Label className="text-base font-medium">Server IP Address</Label>
            </div>

            <div className="space-y-3">
              <Input
                type="text"
                value={settings.server_ip}
                onChange={(e) => setSettings(prev => ({ ...prev, server_ip: e.target.value }))}
                placeholder="138.197.222.11"
              />
              <p className="text-sm text-muted-foreground">
                IP address server tempat aplikasi di-deploy. Digunakan untuk konfigurasi DNS domain.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Favicon Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-muted-foreground" />
              <Label className="text-base font-medium">Favicon</Label>
            </div>
            
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                  {faviconPreview ? (
                    <img 
                      src={faviconPreview} 
                      alt="Favicon preview" 
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <Image className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={settings.favicon_url}
                    onChange={(e) => {
                      setSettings(prev => ({ ...prev, favicon_url: e.target.value }));
                      setFaviconPreview(e.target.value);
                    }}
                    placeholder="https://example.com/favicon.ico"
                    className="flex-1"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept=".ico,.png,.jpg,.jpeg,.svg"
                      onChange={handleFaviconUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Button variant="outline" size="icon">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload file (ICO, PNG, JPG, SVG, max 500KB) atau masukkan URL favicon.
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Custom Domain Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <Label className="text-base font-medium">Custom Domain</Label>
            </div>

            <div className="space-y-3">
              <Input
                type="text"
                value={settings.custom_domain}
                onChange={(e) => setSettings(prev => ({ ...prev, custom_domain: e.target.value }))}
                placeholder="example.com"
              />
              <p className="text-sm text-muted-foreground">
                Masukkan domain kustom Anda. Konfigurasi DNS di registrar domain Anda.
              </p>

              {(settings.custom_domain || settings.server_ip) && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                  <p className="text-sm font-medium">Konfigurasi DNS di Registrar Domain:</p>
                  
                  <div className="space-y-3">
                    {/* A Record for root */}
                    <div className="flex items-center justify-between p-3 rounded-md bg-background border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">A</code>
                          <span className="text-sm font-medium">Root Domain</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Name: <code className="px-1 bg-muted rounded">@</code> → Value: <code className="px-1 bg-muted rounded">{serverIp}</code>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(serverIp, "a-root")}
                      >
                        {copiedField === "a-root" ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* A Record for www */}
                    <div className="flex items-center justify-between p-3 rounded-md bg-background border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">A</code>
                          <span className="text-sm font-medium">WWW Subdomain</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Name: <code className="px-1 bg-muted rounded">www</code> → Value: <code className="px-1 bg-muted rounded">{serverIp}</code>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(serverIp, "a-www")}
                      >
                        {copiedField === "a-www" ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* A Record for API */}
                    <div className="flex items-center justify-between p-3 rounded-md bg-background border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">A</code>
                          <span className="text-sm font-medium">API Subdomain</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Name: <code className="px-1 bg-muted rounded">api</code> → Value: <code className="px-1 bg-muted rounded">{serverIp}</code>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(serverIp, "a-api")}
                      >
                        {copiedField === "a-api" ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* A Record for Studio */}
                    <div className="flex items-center justify-between p-3 rounded-md bg-background border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">A</code>
                          <span className="text-sm font-medium">Studio Subdomain</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Name: <code className="px-1 bg-muted rounded">studio</code> → Value: <code className="px-1 bg-muted rounded">{serverIp}</code>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(serverIp, "a-studio")}
                      >
                        {copiedField === "a-studio" ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {settings.custom_domain && (
                    <div className="pt-3 border-t border-border space-y-2">
                      <p className="text-sm font-medium">URL Setelah Konfigurasi:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-background border">
                          <span className="text-muted-foreground">Frontend:</span>
                          <code className="ml-2 text-primary">https://{settings.custom_domain}</code>
                        </div>
                        <div className="p-2 rounded bg-background border">
                          <span className="text-muted-foreground">API:</span>
                          <code className="ml-2 text-primary">https://api.{settings.custom_domain}</code>
                        </div>
                        <div className="p-2 rounded bg-background border">
                          <span className="text-muted-foreground">Studio:</span>
                          <code className="ml-2 text-primary">https://studio.{settings.custom_domain}</code>
                        </div>
                        <div className="p-2 rounded bg-background border">
                          <span className="text-muted-foreground">WWW:</span>
                          <code className="ml-2 text-primary">https://www.{settings.custom_domain}</code>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      💡 Setelah menambahkan DNS records, jalankan <code className="px-1 bg-muted rounded">sudo certbot --nginx</code> di server untuk mendapatkan SSL certificate.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-border">
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Simpan Pengaturan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralSettingsTab;
