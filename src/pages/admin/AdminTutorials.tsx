import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  PlayCircle, 
  Plus, 
  Trash2, 
  Loader2,
  ExternalLink,
  Pencil
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

interface Tutorial {
  id: string;
  title: string;
  youtube_url: string;
  created_at: string;
}

const AdminTutorials = () => {
  const { toast } = useToast();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", youtube_url: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTutorials = async () => {
    try {
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTutorials(data || []);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Gagal memuat tutorial",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTutorials();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.youtube_url) return;

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('tutorials')
          .update({ title: formData.title, youtube_url: formData.youtube_url })
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: "Tutorial Diperbarui" });
      } else {
        const { error } = await supabase
          .from('tutorials')
          .insert({ title: formData.title, youtube_url: formData.youtube_url });

        if (error) throw error;
        toast({ title: "Tutorial Ditambahkan" });
      }

      setFormData({ title: "", youtube_url: "" });
      setShowForm(false);
      setEditingId(null);
      loadTutorials();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Gagal menyimpan tutorial",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tutorial: Tutorial) => {
    setFormData({ title: tutorial.title, youtube_url: tutorial.youtube_url });
    setEditingId(tutorial.id);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('tutorials')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast({ title: "Tutorial Dihapus" });
      loadTutorials();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Gagal menghapus tutorial",
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const getYoutubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Kelola Tutorial</h1>
            <p className="text-muted-foreground">Tambah dan kelola video tutorial untuk user</p>
          </div>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ title: "", youtube_url: "" }); }}>
            <Plus className="w-4 h-4" />
            Tambah
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="animate-fade-up">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">{editingId ? 'Edit Tutorial' : 'Tambah Tutorial Baru'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Judul</Label>
                    <Input
                      id="title"
                      placeholder="Cara membuat droplet"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtube_url">Link YouTube</Label>
                    <Input
                      id="youtube_url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={formData.youtube_url}
                      onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }} disabled={saving}>
                    Batal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tutorials List */}
        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tutorials.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <PlayCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium text-foreground mb-1">Belum Ada Tutorial</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Tambahkan tutorial pertama untuk user
              </p>
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus className="w-4 h-4" />
                Tambah Tutorial
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tutorials.map((tutorial) => {
              const videoId = getYoutubeId(tutorial.youtube_url);
              return (
                <Card key={tutorial.id} className="overflow-hidden">
                  {videoId && (
                    <div className="aspect-video bg-muted">
                      <img
                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                        alt={tutorial.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-medium text-foreground mb-2 line-clamp-2">{tutorial.title}</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={tutorial.youtube_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                          Buka
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(tutorial)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(tutorial.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Tutorial?</AlertDialogTitle>
              <AlertDialogDescription>
                Tutorial akan dihapus permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminTutorials;
