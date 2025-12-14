import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Terminal, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DropletConsoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropletId: string;
  dropletName: string;
  dropletStatus: string;
  isAdmin?: boolean;
}

const DropletConsoleDialog = ({
  open,
  onOpenChange,
  dropletId,
  dropletName,
  dropletStatus,
  isAdmin = false,
}: DropletConsoleDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [consoleUrl, setConsoleUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpenConsole = async () => {
    if (dropletStatus !== 'active') {
      setError('Droplet harus dalam status aktif untuk mengakses console');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const action = isAdmin ? 'admin-get-console' : 'get-console';
      const response = await supabase.functions.invoke('digitalocean', {
        body: { action, dropletId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Gagal mendapatkan console URL');
      }

      if (response.data?.console_url) {
        setConsoleUrl(response.data.console_url);
        // Open in new window
        window.open(response.data.console_url, '_blank', 'width=1024,height=768');
        toast({
          title: "Console Dibuka",
          description: "Console web telah dibuka di tab baru",
        });
      } else {
        throw new Error('Console URL tidak tersedia');
      }
    } catch (err: any) {
      console.error('Console error:', err);
      setError(err.message || 'Gagal membuka console');
      toast({
        title: "Gagal Membuka Console",
        description: err.message || 'Terjadi kesalahan',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (consoleUrl) {
      window.open(consoleUrl, '_blank', 'width=1024,height=768');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Web Console
          </DialogTitle>
          <DialogDescription>
            Akses terminal untuk droplet <strong>{dropletName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {dropletStatus !== 'active' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning border border-warning/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">
                Droplet harus dalam status aktif untuk mengakses console
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="p-4 rounded-lg bg-secondary space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Console Interaktif</p>
                <p className="text-sm text-muted-foreground">
                  Akses langsung ke terminal droplet
                </p>
              </div>
            </div>

            <ul className="text-sm text-muted-foreground space-y-1 ml-13">
              <li>• Login dengan kredensial root Anda</li>
              <li>• Jalankan perintah langsung di browser</li>
              <li>• Session berlaku selama 1 jam</li>
            </ul>
          </div>

          <div className="flex gap-2">
            {consoleUrl ? (
              <Button onClick={handleOpenInNewTab} className="flex-1">
                <ExternalLink className="w-4 h-4 mr-2" />
                Buka Kembali Console
              </Button>
            ) : (
              <Button 
                onClick={handleOpenConsole} 
                disabled={loading || dropletStatus !== 'active'}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memuat...
                  </>
                ) : (
                  <>
                    <Terminal className="w-4 h-4 mr-2" />
                    Buka Console
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DropletConsoleDialog;
