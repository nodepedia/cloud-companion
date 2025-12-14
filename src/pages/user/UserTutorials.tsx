import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayCircle, ExternalLink, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Tutorial {
  id: string;
  title: string;
  youtube_url: string;
  category: string;
  created_at: string;
}

const UserTutorials = () => {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadTutorials = async () => {
      try {
        const { data, error } = await supabase
          .from('tutorials')
          .select('*')
          .order('category', { ascending: true })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTutorials(data || []);
      } catch (err) {
        console.error('Failed to load tutorials:', err);
      } finally {
        setLoading(false);
      }
    };
    loadTutorials();
  }, []);

  const categories = ["Semua", ...Array.from(new Set(tutorials.map(t => t.category)))];
  
  const filteredTutorials = useMemo(() => {
    let result = tutorials;
    if (activeCategory !== "Semua") {
      result = result.filter(t => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      result = result.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result;
  }, [tutorials, activeCategory, searchQuery]);

  const getYoutubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  return (
    <DashboardLayout role="user">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tutorial</h1>
          <p className="text-muted-foreground">Video panduan untuk membantu Anda menggunakan layanan</p>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tutorials.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <PlayCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Belum Ada Tutorial</h3>
              <p className="text-muted-foreground">
                Tutorial akan segera tersedia
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Search and Category Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari tutorial..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {filteredTutorials.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Tidak Ditemukan</h3>
                  <p className="text-muted-foreground">
                    Tidak ada tutorial yang cocok dengan pencarian Anda
                  </p>
                </CardContent>
              </Card>
            ) : (

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutorials.map((tutorial) => {
              const videoId = getYoutubeId(tutorial.youtube_url);
              return (
                <Card key={tutorial.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                  <a href={tutorial.youtube_url} target="_blank" rel="noopener noreferrer" className="block">
                    {videoId ? (
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        <img
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                          alt={tutorial.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <PlayCircle className="w-16 h-16 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <PlayCircle className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </a>
                  <CardContent className="p-4">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{tutorial.category}</span>
                    <h3 className="font-medium text-foreground mb-3 mt-1 line-clamp-2">{tutorial.title}</h3>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={tutorial.youtube_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        Tonton di YouTube
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserTutorials;
