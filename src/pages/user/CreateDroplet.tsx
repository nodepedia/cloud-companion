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
  Search
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDigitalOcean, DORegion, DOSize, DOImage } from "@/hooks/useDigitalOcean";
import { formatRegion, formatSize, formatImage } from "@/lib/dropletFormatters";

interface CreateDropletProps {
  role?: "admin" | "user";
}

const CreateDroplet = ({ role = "user" }: CreateDropletProps) => {
  const navigate = useNavigate();
  const { loading, getRegions, getSizes, getImages, getApps, createDroplet } = useDigitalOcean();
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
        const [regionsData, sizesData, imagesData, appsData] = await Promise.all([
          getRegions(),
          getSizes(),
          getImages(),
          getApps(),
        ]);
        setRegions(regionsData);
        setSizes(sizesData);
        setImages(imagesData);
        setApps(appsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.password || !formData.region || !formData.size || !formData.image) {
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
  const availableSizes = sizes.filter(s => 
    !formData.region || s.regions.includes(formData.region)
  );

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

  // Combined and filtered OS/App list
  const filteredImages = useMemo(() => {
    const allItems = formData.useApp ? apps : images;
    if (!imageSearch.trim()) return allItems;
    
    const search = imageSearch.toLowerCase();
    return allItems.filter(img => 
      img.name.toLowerCase().includes(search) ||
      (img.distribution && img.distribution.toLowerCase().includes(search)) ||
      (img.slug && img.slug.toLowerCase().includes(search))
    );
  }, [formData.useApp, apps, images, imageSearch]);

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
      <div className="max-w-3xl mx-auto space-y-6">
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
                  Hanya huruf kecil, angka, dan tanda hubung yang diperbolehkan
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
                  Minimal 8 karakter. Ini akan digunakan untuk mengakses droplet via SSH.
                </p>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {regions.map((region) => (
                  <button
                    key={region.slug}
                    type="button"
                    onClick={() => setFormData({ ...formData, region: region.slug, size: '' })}
                    className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                      formData.region === region.slug
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {formData.region === region.slug && (
                      <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-primary" />
                    )}
                    <span className="text-2xl">{regionFlags[region.slug] || '🌐'}</span>
                    <p className="font-medium text-foreground mt-1">{formatRegion(region.slug)}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Size */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                Ukuran
              </CardTitle>
              <CardDescription>Pilih spesifikasi untuk droplet Anda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                {availableSizes.slice(0, 15).map((size) => (
                  <button
                    key={size.slug}
                    type="button"
                    onClick={() => setFormData({ ...formData, size: size.slug })}
                    className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                      formData.size === size.slug
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {formData.size === size.slug && (
                      <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-primary" />
                    )}
                    <p className="font-semibold text-foreground">{size.vcpus} vCPU</p>
                    <p className="text-sm text-muted-foreground">{formatMemory(size.memory)} RAM</p>
                    <p className="text-sm text-muted-foreground">{size.disk} GB SSD</p>
                  </button>
                ))}
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!formData.useApp ? "default" : "outline"}
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
                  onClick={() => {
                    setFormData({ ...formData, useApp: true, image: '' });
                    setImageSearch("");
                  }}
                >
                  Aplikasi (Template)
                </Button>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={formData.useApp ? "Cari aplikasi..." : "Cari sistem operasi..."}
                  value={imageSearch}
                  onChange={(e) => setImageSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Image Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                {filteredImages.map((img) => {
                  const imgValue = img.slug || img.id.toString();
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, image: imgValue })}
                      className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                        formData.image === imgValue
                          ? "border-primary bg-accent"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {formData.image === imgValue && (
                        <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-primary" />
                      )}
                      <span className="text-xl">🐧</span>
                      <p className="font-medium text-foreground text-sm mt-1 pr-5">
                        {formatImage(img.slug || img.name)}
                      </p>
                      {img.distribution && (
                        <p className="text-xs text-muted-foreground">{img.distribution}</p>
                      )}
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
            <CardContent className="p-6">
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
                  <li><strong>Ukuran:</strong> {selectedSize ? `${selectedSize.vcpus} vCPU, ${formatMemory(selectedSize.memory)} RAM, ${selectedSize.disk} GB SSD` : '-'}</li>
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