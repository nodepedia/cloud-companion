import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUpDown, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Droplet, DOSize } from "@/hooks/useDigitalOcean";

interface ResizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  droplet: Droplet;
  onSuccess: () => void;
  isAdmin?: boolean;
}

const ResizeDialog = ({
  open,
  onOpenChange,
  droplet,
  onSuccess,
  isAdmin = false,
}: ResizeDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sizes, setSizes] = useState<DOSize[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [resizeType, setResizeType] = useState<"disk" | "cpu">("cpu");

  const loadSizes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("digitalocean", {
        body: { action: "get-sizes" },
      });
      
      if (error) throw error;
      
      // Filter sizes that are available in the droplet's region
      const availableSizes = (data || []).filter((size: DOSize) => 
        size.regions.includes(droplet.region) && size.available
      );
      setSizes(availableSizes);
    } catch (error: any) {
      toast({
        title: "Gagal memuat ukuran",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSizes();
      setSelectedSize("");
    }
  }, [open]);

  const handleResize = async () => {
    if (!selectedSize) return;
    
    setLoading(true);
    try {
      const action = isAdmin ? "admin-resize-droplet" : "resize-droplet";
      const { error } = await supabase.functions.invoke("digitalocean", {
        body: {
          action,
          dropletId: droplet.id,
          size: selectedSize,
          disk: resizeType === "disk",
        },
      });

      if (error) throw error;

      toast({ 
        title: "Resize dimulai",
        description: "Droplet sedang di-resize. Proses ini membutuhkan beberapa menit.",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Gagal resize droplet",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (size: DOSize) => {
    const memory = size.memory >= 1024 ? `${size.memory / 1024} GB` : `${size.memory} MB`;
    return `${size.vcpus} vCPU, ${memory} RAM, ${size.disk} GB SSD`;
  };

  const currentSize = sizes.find(s => s.slug === droplet.size);
  const isCurrentSize = (slug: string) => slug === droplet.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5" />
            Resize Droplet - {droplet.name}
          </DialogTitle>
        </DialogHeader>

        {loading && sizes.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">Perhatian</p>
                <p className="text-muted-foreground mt-1">
                  Droplet harus dalam keadaan <strong>mati (off)</strong> untuk melakukan resize. 
                  Pastikan data penting sudah di-backup.
                </p>
              </div>
            </div>

            {/* Current Size */}
            {currentSize && (
              <div className="p-4 bg-accent/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Ukuran Saat Ini</p>
                <p className="font-medium">{formatSize(currentSize)}</p>
                <p className="text-sm text-muted-foreground">${currentSize.price_monthly}/bulan</p>
              </div>
            )}

            {/* Resize Type */}
            <div className="space-y-3">
              <Label>Tipe Resize</Label>
              <RadioGroup value={resizeType} onValueChange={(v) => setResizeType(v as "disk" | "cpu")}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="cpu" id="cpu" />
                  <Label htmlFor="cpu" className="flex-1 cursor-pointer">
                    <div className="font-medium">CPU & RAM Only</div>
                    <p className="text-sm text-muted-foreground">
                      Bisa di-downgrade kembali. Disk tidak berubah.
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="disk" id="disk" />
                  <Label htmlFor="disk" className="flex-1 cursor-pointer">
                    <div className="font-medium">CPU, RAM & Disk</div>
                    <p className="text-sm text-muted-foreground">
                      Tidak bisa di-downgrade. Disk akan diperbesar.
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Size Selection */}
            <div className="space-y-3">
              <Label>Pilih Ukuran Baru</Label>
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {sizes.map((size) => (
                  <div
                    key={size.slug}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSize === size.slug
                        ? "border-primary bg-primary/5"
                        : isCurrentSize(size.slug)
                        ? "border-muted bg-muted/50 cursor-not-allowed opacity-60"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => !isCurrentSize(size.slug) && setSelectedSize(size.slug)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {formatSize(size)}
                          {isCurrentSize(size.slug) && (
                            <Badge variant="secondary" className="text-xs">Saat ini</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ${size.price_monthly}/bulan • {size.transfer} TB transfer
                        </p>
                      </div>
                      {selectedSize === size.slug && (
                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button 
            onClick={handleResize} 
            disabled={loading || !selectedSize || droplet.status === 'active'}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Memproses...
              </>
            ) : droplet.status === 'active' ? (
              "Matikan droplet dulu"
            ) : (
              "Resize Droplet"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResizeDialog;
