import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
  Server, 
  MapPin, 
  Cpu, 
  HardDrive,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Search,
  AlertTriangle,
  Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDigitalOcean, DORegion, DOSize, DOImage } from "@/hooks/useDigitalOcean";
import { formatRegion, formatSize, formatImage } from "@/lib/dropletFormatters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CreateDropletProps {
  role?: "admin" | "user";
}

interface UserLimits {
  max_droplets: number;
  allowed_sizes: string[];
  auto_destroy_days: number;
}

// OS Logo mapping based on distribution
const getOSLogo = (distribution: string | undefined, name: string): string => {
  const distro = (distribution || name || '').toLowerCase();
  
  if (distro.includes('ubuntu')) return '🟠';
  if (distro.includes('debian')) return '🔴';
  if (distro.includes('centos')) return '🟣';
  if (distro.includes('fedora')) return '🔵';
  if (distro.includes('rocky')) return '🪨';
  if (distro.includes('alma')) return '🟢';
  if (distro.includes('freebsd')) return '😈';
  if (distro.includes('windows')) return '🪟';
  if (distro.includes('arch')) return '🔷';
  if (distro.includes('opensuse') || distro.includes('suse')) return '🦎';
  
  // For apps/templates
  if (distro.includes('docker')) return '🐳';
  if (distro.includes('wordpress')) return '📝';
  if (distro.includes('node')) return '💚';
  if (distro.includes('lamp')) return '💡';
  if (distro.includes('mysql')) return '🐬';
  if (distro.includes('postgres')) return '🐘';
  if (distro.includes('redis')) return '🔺';
  if (distro.includes('mongo')) return '🍃';
  if (distro.includes('nginx')) return '🌐';
  if (distro.includes('apache')) return '🪶';
  
  return '💿';
};

const CreateDroplet = ({ role = "user" }: CreateDropletProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading, getRegions, getSizes, getImages, getApps, createDroplet, listDroplets } = useDigitalOcean();
  const isAdmin = role === "admin";
  const basePath = isAdmin ? "/admin" : "/dashboard";
  
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [imageSearch, setImageSearch] = useState("");

  const [regions, setRegions] = useState<DORegion[]>([]);
  const [sizes, setSizes] = useState<DOSize[]>([]);
  const [images, setImages] = useState<DOImage[]>([]);
  const [apps, setApps] = useState<DOImage[]>([]);
  
  // User limits state
  const [userLimits, setUserLimits] = useState<UserLimits | null>(null);
  const [currentDropletCount, setCurrentDropletCount] = useState(0);
  const [limitExceeded, setLimitExceeded] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    password: "",
    region: "",
    size: "",
    image: "",
    useApp: false,
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const [regionsData, sizesData, imagesData, appsData, dropletsData] = await Promise.all([
          getRegions(),
          getSizes(),
          getImages(),
          getApps(),
          listDroplets(),
        ]);
        setRegions(regionsData);
        setSizes(sizesData);
        setImages(imagesData);
        setApps(appsData);
        setCurrentDropletCount(dropletsData.length);
        
        // Fetch user limits
        if (user) {
          const { data: limitsData } = await supabase
            .from('user_limits')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (limitsData) {
            setUserLimits(limitsData as UserLimits);
            // Check if limit exceeded
            if (dropletsData.length >= limitsData.max_droplets) {
              setLimitExceeded(true);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.password || !formData.region || !formData.size || !formData.image) {
      return;
    }

    // Check if limit exceeded
    if (limitExceeded) {
      toast.error(`Anda sudah mencapai batas maksimal ${userLimits?.max_droplets} droplet`);
      return;
    }

    // Check if selected size is allowed
    if (userLimits && !userLimits.allowed_sizes.includes(formData.size)) {
      toast.error('Spesifikasi yang dipilih tidak diizinkan. Hubungi admin untuk akses.');
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmCreate = async () => {
    setShowConfirmDialog(false);
    setIsCreating(true);

    try {
      await createDroplet({
        name: formData.name,
        region: formData.region,
        size: formData.size,
        image: formData.image,
        password: formData.password,
      });
      navigate(`${basePath}/droplets`);
    } catch (error) {
      console.error('Failed to create droplet:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const selectedSize = sizes.find((s) => s.slug === formData.size);
  
  // Default allowed size slugs (fallback if no user limits)
  const defaultAllowedSizes = [
    's-1vcpu-512mb-10gb',
    's-1vcpu-1gb',
    's-1vcpu-2gb',
    's-2vcpu-2gb',
    's-2vcpu-4gb',
    's-4vcpu-8gb',
    's-8vcpu-16gb',
  ];
  
  // Use user limits if available, otherwise use defaults
  const allowedSizes = userLimits?.allowed_sizes || defaultAllowedSizes;
  
  // Filter sizes available in region, show all but mark disallowed ones
  const availableSizes = sizes.filter(s => {
    const isInRegion = !formData.region || s.regions.includes(formData.region);
    // Only filter by region, show all sizes but disable ones not allowed
    return isInRegion && defaultAllowedSizes.includes(s.slug);
  });

  // Check if size is allowed for current user
  const isSizeAllowedForUser = (sizeSlug: string) => {
    if (!userLimits) return true; // No limits set, allow all
    return userLimits.allowed_sizes.includes(sizeSlug);
  };

  const regionFlags: Record<string, string> = {
    'nyc1': '🇺🇸', 'nyc2': '🇺🇸', 'nyc3': '🇺🇸',
    'sfo1': '🇺🇸', 'sfo2': '🇺🇸', 'sfo3': '🇺🇸',
    'ams2': '🇳🇱', 'ams3': '🇳🇱',
    'sgp1': '🇸🇬',
    'lon1': '🇬🇧',
    'fra1': '🇩🇪',
    'tor1': '🇨🇦',
    'blr1': '🇮🇳',
    'syd1': '🇦🇺',
  };

  const formatMemory = (mb: number) => {
    if (mb >= 1024) return `${mb / 1024} GB`;
    return `${mb} MB`;
  };

  // Sort regions in proper order
  const sortedRegions = useMemo(() => {
    const regionOrder = [
      'nyc1', 'nyc2', 'nyc3',
      'sfo1', 'sfo2', 'sfo3',
      'tor1',
      'ams2', 'ams3',
      'lon1',
      'fra1',
      'sgp1',
      'blr1',
      'syd1',
    ];
    return [...regions].sort((a, b) => {
      const aIndex = regionOrder.indexOf(a.slug);
      const bIndex = regionOrder.indexOf(b.slug);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [regions]);

  // Group and filter OS/Apps
  const filteredImages = useMemo(() => {
    let allItems = formData.useApp ? [...apps] : [...images];
    
    // Filter out GPU images
    allItems = allItems.filter(img => {
      const name = (img.name || '').toLowerCase();
      const slug = (img.slug || '').toLowerCase();
      return !name.includes('gpu') && !slug.includes('gpu') && 
             !name.includes('h100') && !slug.includes('h100');
    });
    
    // Add Ant Media if in apps mode and not already present
    if (formData.useApp) {
      const hasAntMedia = allItems.some(img => 
        img.name.toLowerCase().includes('ant media') || 
        (img.slug && img.slug.toLowerCase().includes('antmedia'))
      );
      if (!hasAntMedia) {
        allItems.push({
          id: 999999,
          name: 'Ant Media Server Enterprise',
          distribution: 'Ubuntu',
          slug: 'antmedia',
          public: true,
          regions: regions.map(r => r.slug),
          min_disk_size: 50,
          type: 'app',
          description: 'Ant Media Server',
        } as unknown as DOImage);
      }
    }
    
    // Group by distribution and sort
    allItems.sort((a, b) => {
      const distA = (a.distribution || a.name || '').toLowerCase();
      const distB = (b.distribution || b.name || '').toLowerCase();
      
      // Order: Ubuntu, Debian, CentOS, Fedora, Rocky, Alma, FreeBSD, others
      const distOrder = ['ubuntu', 'debian', 'centos', 'fedora', 'rocky', 'alma', 'freebsd'];
      const getDistIndex = (d: string) => {
        for (let i = 0; i < distOrder.length; i++) {
          if (d.includes(distOrder[i])) return i;
        }
        return 99;
      };
      
      const indexA = getDistIndex(distA);
      const indexB = getDistIndex(distB);
      
      if (indexA !== indexB) return indexA - indexB;
      return distA.localeCompare(distB);
    });
    
    if (!imageSearch.trim()) return allItems;
    
    const search = imageSearch.toLowerCase();
    return allItems.filter(img => 
      img.name.toLowerCase().includes(search) ||
      (img.distribution && img.distribution.toLowerCase().includes(search)) ||
      (img.slug && img.slug.toLowerCase().includes(search))
    );
  }, [formData.useApp, apps, images, imageSearch, regions]);

  const selectedImage = useMemo(() => {
    const allItems = formData.useApp ? apps : images;
    return allItems.find(img => (img.slug || img.id.toString()) === formData.image);
  }, [formData.image, formData.useApp, apps, images]);

  if (isLoadingData) {
    return (
      <DashboardLayout role={role}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Limit Warning */}
        {limitExceeded && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Batas Droplet Tercapai</p>
                <p className="text-sm text-muted-foreground">
                  Anda sudah memiliki {currentDropletCount} dari {userLimits?.max_droplets} droplet maksimal. 
                  Hapus droplet yang ada atau hubungi admin untuk meningkatkan limit.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div>
          <Link 
            to={`${basePath}/droplets`} 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Droplet
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Buat Droplet</h1>
          <p className="text-muted-foreground">Deploy cloud server baru</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Informasi Dasar
              </CardTitle>
              <CardDescription>Beri nama droplet dan atur root password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Droplet</Label>
                  <Input
                    id="name"
                    placeholder="contoh: web-server-ku"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Hanya huruf kecil, angka, dan tanda hubung
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Root Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukkan password yang kuat"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimal 8 karakter untuk akses SSH
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Region */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Region
              </CardTitle>
              <CardDescription>Pilih lokasi data center</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {sortedRegions.map((region) => (
                  <button
                    key={region.slug}
                    type="button"
                    onClick={() => setFormData({ ...formData, region: region.slug, size: '' })}
                    className={`relative p-2 rounded-lg border-2 text-center transition-all ${
                      formData.region === region.slug
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {formData.region === region.slug && (
                      <CheckCircle className="absolute top-1 right-1 w-3 h-3 text-primary" />
                    )}
                    <span className="text-lg">{regionFlags[region.slug] || '🌐'}</span>
                    <p className="font-medium text-foreground text-xs mt-1">{formatRegion(region.slug)}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Size / Spesifikasi */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                Spesifikasi
              </CardTitle>
              <CardDescription>Pilih spesifikasi CPU, RAM, dan Storage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {availableSizes.map((size) => {
                  const isAllowed = isSizeAllowedForUser(size.slug);
                  return (
                    <button
                      key={size.slug}
                      type="button"
                      onClick={() => isAllowed && setFormData({ ...formData, size: size.slug })}
                      disabled={!isAllowed}
                      className={`relative p-2 rounded-lg border-2 text-left transition-all ${
                        !isAllowed
                          ? "opacity-50 cursor-not-allowed border-border bg-muted"
                          : formData.size === size.slug
                          ? "border-primary bg-accent"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {!isAllowed && (
                        <Lock className="absolute top-1 right-1 w-3 h-3 text-muted-foreground" />
                      )}
                      {isAllowed && formData.size === size.slug && (
                        <CheckCircle className="absolute top-1 right-1 w-3 h-3 text-primary" />
                      )}
                      <p className={`font-semibold text-sm ${isAllowed ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {size.vcpus} vCPU
                      </p>
                      <p className="text-xs text-muted-foreground">{formatMemory(size.memory)} RAM</p>
                      <p className="text-xs text-muted-foreground">{size.disk} GB SSD</p>
                      {!isAllowed && (
                        <p className="text-[10px] text-muted-foreground mt-1 italic">
                          Hubungi admin untuk akses
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* OS / Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-primary" />
                Sistem Operasi / Template
              </CardTitle>
              <CardDescription>Pilih image sistem operasi atau aplikasi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={!formData.useApp ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFormData({ ...formData, useApp: false, image: '' });
                    setImageSearch("");
                  }}
                >
                  Sistem Operasi
                </Button>
                <Button
                  type="button"
                  variant={formData.useApp ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFormData({ ...formData, useApp: true, image: '' });
                    setImageSearch("");
                  }}
                >
                  Aplikasi (Template)
                </Button>
              </div>
              
              {/* Search Input */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={formData.useApp ? "Cari aplikasi..." : "Cari sistem operasi..."}
                  value={imageSearch}
                  onChange={(e) => setImageSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Image Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
                {filteredImages.map((img) => {
                  const imgValue = img.slug || img.id.toString();
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, image: imgValue })}
                      className={`relative p-2 rounded-lg border-2 text-left transition-all ${
                        formData.image === imgValue
                          ? "border-primary bg-accent"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {formData.image === imgValue && (
                        <CheckCircle className="absolute top-1 right-1 w-3 h-3 text-primary" />
                      )}
                      <span className="text-lg">{getOSLogo(img.distribution, img.name)}</span>
                      <p className="font-medium text-foreground text-xs mt-1 pr-4 truncate">
                        {formatImage(img.slug || img.name)}
                      </p>
                    </button>
                  );
                })}
                {filteredImages.length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground py-4">
                    Tidak ada hasil untuk "{imageSearch}"
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary & Submit */}
          <Card className="bg-accent/50">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Spesifikasi Terpilih</p>
                  {selectedSize ? (
                    <p className="text-lg font-semibold text-foreground">
                      {selectedSize.vcpus} vCPU, {formatMemory(selectedSize.memory)} RAM, {selectedSize.disk} GB SSD
                    </p>
                  ) : (
                    <p className="text-lg font-semibold text-foreground">Belum dipilih</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  variant="hero" 
                  size="lg"
                  disabled={isCreating || loading || !formData.name || !formData.password || !formData.region || !formData.size || !formData.image}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Membuat...
                    </>
                  ) : (
                    "Buat Droplet"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Pembuatan Droplet</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Anda akan membuat droplet dengan spesifikasi berikut:</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li><strong>Nama:</strong> {formData.name}</li>
                  <li><strong>Region:</strong> {formatRegion(formData.region)}</li>
                  <li><strong>Spesifikasi:</strong> {selectedSize ? `${selectedSize.vcpus} vCPU, ${formatMemory(selectedSize.memory)} RAM, ${selectedSize.disk} GB SSD` : '-'}</li>
                  <li><strong>Image:</strong> {selectedImage ? formatImage(selectedImage.slug || selectedImage.name) : '-'}</li>
                </ul>
                <p className="mt-4">Lanjutkan pembuatan droplet?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmCreate}>Ya, Buat Droplet</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default CreateDroplet;