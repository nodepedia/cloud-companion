import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Terminal, ExternalLink, Copy, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DropletConsoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropletId: string;
  dropletName: string;
  dropletStatus: string;
  ipAddress?: string | null;
  digitaloceanId?: number | null;
}

const DropletConsoleDialog = ({
  open,
  onOpenChange,
  dropletName,
  dropletStatus,
  ipAddress,
  digitaloceanId,
}: DropletConsoleDialogProps) => {
  const { toast } = useToast();

  const handleCopySSH = () => {
    if (ipAddress) {
      navigator.clipboard.writeText(`ssh root@${ipAddress}`);
      toast({
        title: "Disalin!",
        description: "Perintah SSH berhasil disalin ke clipboard",
      });
    }
  };

  const handleOpenDOConsole = () => {
    if (digitaloceanId) {
      window.open(
        `https://cloud.digitalocean.com/droplets/${digitaloceanId}/console`,
        '_blank',
        'width=1024,height=768'
      );
      toast({
        title: "Console Dibuka",
        description: "Console DigitalOcean dibuka di tab baru (membutuhkan login DO)",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Akses Console
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

          {!ipAddress && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning border border-warning/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">
                IP Address belum tersedia. Tunggu beberapa saat.
              </p>
            </div>
          )}

          {/* SSH Access */}
          <div className="p-4 rounded-lg bg-secondary space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">SSH Access</p>
                <p className="text-sm text-muted-foreground">
                  Akses via terminal lokal
                </p>
              </div>
            </div>

            {ipAddress && (
              <div className="p-3 rounded-md bg-background border font-mono text-sm flex items-center justify-between gap-2">
                <code>ssh root@{ipAddress}</code>
                <Button variant="ghost" size="icon" onClick={handleCopySSH}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Gunakan password yang Anda buat saat membuat droplet
            </p>
          </div>

          {/* DO Console Link */}
          {digitaloceanId && (
            <div className="p-4 rounded-lg bg-secondary space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ExternalLink className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Web Console</p>
                  <p className="text-sm text-muted-foreground">
                    Akses via DigitalOcean Dashboard
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleOpenDOConsole}
                variant="outline"
                className="w-full"
                disabled={dropletStatus !== 'active'}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Buka DO Console
              </Button>

              <p className="text-xs text-muted-foreground">
                Membutuhkan login ke akun DigitalOcean
              </p>
            </div>
          )}

          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DropletConsoleDialog;
