import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Globe, Image, Upload, Loader2, ExternalLink, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GeneralSettings {
  favicon_url: string;
  custom_domain: string;
}

const GeneralSettingsTab = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<GeneralSettings>({
    favicon_url: "",
    custom_domain: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                Masukkan domain kustom Anda. Pastikan DNS sudah dikonfigurasi dengan benar.
              </p>

              {settings.custom_domain && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <p className="text-sm font-medium">Konfigurasi DNS:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 rounded bg-background text-xs">A Record</code>
                      <span className="text-muted-foreground">→</span>
                      <code className="px-2 py-1 rounded bg-background text-xs">@ → 185.158.133.1</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 rounded bg-background text-xs">A Record</code>
                      <span className="text-muted-foreground">→</span>
                      <code className="px-2 py-1 rounded bg-background text-xs">www → 185.158.133.1</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 rounded bg-background text-xs">TXT Record</code>
                      <span className="text-muted-foreground">→</span>
                      <code className="px-2 py-1 rounded bg-background text-xs">_lovable → lovable_verify=...</code>
                    </div>
                  </div>
                  <a 
                    href="https://docs.lovable.dev/features/custom-domain" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Lihat dokumentasi lengkap
                    <ExternalLink className="w-3 h-3" />
                  </a>
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
