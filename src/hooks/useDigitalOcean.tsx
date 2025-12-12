import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DORegion {
  slug: string;
  name: string;
  available: boolean;
}

export interface DOSize {
  slug: string;
  memory: number;
  vcpus: number;
  disk: number;
  transfer: number;
  price_monthly: number;
  description: string;
  available: boolean;
  regions: string[];
}

export interface DOImage {
  id: number;
  slug: string;
  name: string;
  distribution: string;
  description: string;
  type: string;
}

export interface Droplet {
  id: string;
  user_id: string;
  digitalocean_id: number;
  name: string;
  status: string;
  region: string;
  size: string;
  image: string;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    email: string;
  };
}

export function useDigitalOcean() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const callAPI = useCallback(async (action: string, params: object = {}) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('digitalocean', {
      body: { action, ...params },
    });

    if (response.error) {
      throw new Error(response.error.message || 'API error');
    }

    return response.data;
  }, []);

  const getRegions = useCallback(async (): Promise<DORegion[]> => {
    setLoading(true);
    try {
      return await callAPI('get-regions');
    } finally {
      setLoading(false);
    }
  }, [callAPI]);

  const getSizes = useCallback(async (): Promise<DOSize[]> => {
    setLoading(true);
    try {
      return await callAPI('get-sizes');
    } finally {
      setLoading(false);
    }
  }, [callAPI]);

  const getImages = useCallback(async (): Promise<DOImage[]> => {
    setLoading(true);
    try {
      return await callAPI('get-images');
    } finally {
      setLoading(false);
    }
  }, [callAPI]);

  const getApps = useCallback(async (): Promise<DOImage[]> => {
    setLoading(true);
    try {
      return await callAPI('get-apps');
    } finally {
      setLoading(false);
    }
  }, [callAPI]);

  const createDroplet = useCallback(async (params: {
    name: string;
    region: string;
    size: string;
    image: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      const result = await callAPI('create-droplet', params);
      toast({
        title: 'Droplet Dibuat!',
        description: `${params.name} sedang di-deploy...`,
      });
      return result;
    } catch (error: any) {
      toast({
        title: 'Gagal Membuat Droplet',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [callAPI, toast]);

  const listDroplets = useCallback(async (): Promise<Droplet[]> => {
    setLoading(true);
    try {
      return await callAPI('list-droplets');
    } finally {
      setLoading(false);
    }
  }, [callAPI]);

  const dropletAction = useCallback(async (dropletId: string, actionType: string) => {
    setLoading(true);
    try {
      const result = await callAPI('droplet-action', { dropletId, actionType });
      
      const actionLabels: Record<string, string> = {
        'power_on': 'Nyalakan',
        'power_off': 'Matikan',
        'reboot': 'Reboot',
        'delete': 'Hapus',
      };
      
      toast({
        title: `${actionLabels[actionType] || actionType} Berhasil`,
        description: actionType === 'delete' 
          ? 'Droplet telah dihapus'
          : 'Aksi sedang diproses...',
      });
      
      return result;
    } catch (error: any) {
      toast({
        title: 'Aksi Gagal',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [callAPI, toast]);

  // Admin functions
  const adminListDroplets = useCallback(async (): Promise<Droplet[]> => {
    setLoading(true);
    try {
      return await callAPI('admin-list-droplets');
    } finally {
      setLoading(false);
    }
  }, [callAPI]);

  const adminDropletAction = useCallback(async (dropletId: string, actionType: string) => {
    setLoading(true);
    try {
      const result = await callAPI('admin-droplet-action', { dropletId, actionType });
      
      const actionLabels: Record<string, string> = {
        'power_on': 'Nyalakan',
        'power_off': 'Matikan',
        'reboot': 'Reboot',
        'delete': 'Hapus',
      };
      
      toast({
        title: `${actionLabels[actionType] || actionType} Berhasil`,
        description: actionType === 'delete' 
          ? 'Droplet telah dihapus'
          : 'Aksi sedang diproses...',
      });
      
      return result;
    } catch (error: any) {
      toast({
        title: 'Aksi Gagal',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [callAPI, toast]);

  return {
    loading,
    getRegions,
    getSizes,
    getImages,
    getApps,
    createDroplet,
    listDroplets,
    dropletAction,
    adminListDroplets,
    adminDropletAction,
  };
}