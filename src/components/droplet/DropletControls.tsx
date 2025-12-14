import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  RefreshCw, 
  Loader2, 
  Copy, 
  Shield, 
  Trash2,
  ArrowUpDown
} from "lucide-react";
import { Droplet } from "@/hooks/useDigitalOcean";

interface DropletControlsProps {
  droplet: Droplet;
  actionLoading: string | null;
  onPowerAction: (droplet: Droplet, action: 'power_on' | 'power_off') => void;
  onReboot: (droplet: Droplet) => void;
  onDelete: (droplet: Droplet) => void;
  onCopyIP: (ip: string) => void;
  onFirewall: (droplet: Droplet) => void;
  onResize: (droplet: Droplet) => void;
}

const DropletControls = ({
  droplet,
  actionLoading,
  onPowerAction,
  onReboot,
  onDelete,
  onCopyIP,
  onFirewall,
  onResize,
}: DropletControlsProps) => {
  const isLoading = actionLoading === droplet.id;
  const isActive = droplet.status === 'active';
  const isNew = droplet.status === 'new';

  return (
    <div className="flex items-end gap-2">
      {/* Power Toggle */}
      <div className="flex flex-col items-center min-w-[44px]">
        <span className="text-[10px] text-muted-foreground font-medium mb-1.5">Power</span>
        <div className="h-8 flex items-center justify-center">
          <Switch
            checked={isActive}
            onCheckedChange={() => 
              onPowerAction(droplet, isActive ? 'power_off' : 'power_on')
            }
            disabled={isLoading || isNew}
          />
        </div>
      </div>
      
      {/* Reboot Button */}
      <div className="flex flex-col items-center min-w-[44px]">
        <span className="text-[10px] text-muted-foreground font-medium mb-1.5">Reboot</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onReboot(droplet)}
          disabled={isLoading || !isActive}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      {/* More Actions Menu */}
      <div className="flex flex-col items-center min-w-[44px]">
        <span className="text-[10px] text-muted-foreground font-medium mb-1.5">Menu</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {droplet.ip_address && (
              <DropdownMenuItem onClick={() => onCopyIP(droplet.ip_address!)}>
                <Copy className="w-4 h-4 mr-2" />
                Salin IP
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onResize(droplet)}>
              <ArrowUpDown className="w-4 h-4 mr-2" />
              Resize
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFirewall(droplet)}>
              <Shield className="w-4 h-4 mr-2" />
              Firewall
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => onDelete(droplet)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default DropletControls;
