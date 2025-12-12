import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DIGITALOCEAN_API_KEY = Deno.env.get('DIGITALOCEAN_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function doRequest(endpoint: string, method: string = 'GET', body?: object) {
  const response = await fetch(`https://api.digitalocean.com/v2${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${DIGITALOCEAN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('DigitalOcean API error:', error);
    throw new Error(error.message || `API error: ${response.status}`);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, ...params } = await req.json();
    console.log(`Action: ${action}, User: ${user.id}, Params:`, params);

    let result;

    switch (action) {
      case 'get-regions': {
        const data = await doRequest('/regions');
        result = data.regions.filter((r: any) => r.available);
        break;
      }

      case 'get-sizes': {
        const data = await doRequest('/sizes');
        result = data.sizes.filter((s: any) => s.available);
        break;
      }

      case 'get-images': {
        const data = await doRequest('/images?type=distribution&per_page=100');
        result = data.images;
        break;
      }

      case 'get-apps': {
        const data = await doRequest('/images?type=application&per_page=100');
        result = data.images;
        break;
      }

      case 'create-droplet': {
        const { name, region, size, image, password } = params;
        
        if (!name || !region || !size || !image || !password) {
          throw new Error('Missing required fields');
        }

        // Create droplet in DigitalOcean
        const doData = await doRequest('/droplets', 'POST', {
          name,
          region,
          size,
          image,
          user_data: `#!/bin/bash\necho "root:${password}" | chpasswd\nsed -i 's/PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config\nsed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config\nservice ssh restart || systemctl restart sshd`,
        });

        const droplet = doData.droplet;

        // Save to database
        const { data: dbDroplet, error: dbError } = await supabase
          .from('droplets')
          .insert({
            user_id: user.id,
            digitalocean_id: droplet.id,
            name: droplet.name,
            status: droplet.status,
            region: droplet.region.slug,
            size: droplet.size_slug,
            image: params.image,
          })
          .select()
          .single();

        if (dbError) {
          console.error('DB Error:', dbError);
          throw new Error('Failed to save droplet to database');
        }

        result = { droplet: dbDroplet, doDroplet: droplet };
        break;
      }

      case 'list-droplets': {
        // Get user's droplets from database
        const { data: droplets, error } = await supabase
          .from('droplets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Sync status with DigitalOcean
        for (const droplet of droplets || []) {
          if (droplet.digitalocean_id) {
            try {
              const doData = await doRequest(`/droplets/${droplet.digitalocean_id}`);
              const doDroplet = doData.droplet;
              
              // Get IP address
              const ipv4 = doDroplet.networks?.v4?.find((n: any) => n.type === 'public');
              
              if (doDroplet.status !== droplet.status || ipv4?.ip_address !== droplet.ip_address) {
                await supabase
                  .from('droplets')
                  .update({ 
                    status: doDroplet.status,
                    ip_address: ipv4?.ip_address || null,
                  })
                  .eq('id', droplet.id);
                
                droplet.status = doDroplet.status;
                droplet.ip_address = ipv4?.ip_address || null;
              }
            } catch (e) {
              console.error(`Failed to sync droplet ${droplet.id}:`, e);
            }
          }
        }

        result = droplets;
        break;
      }

      case 'droplet-action': {
        const { dropletId, actionType } = params;
        
        // Get droplet from database
        const { data: droplet, error } = await supabase
          .from('droplets')
          .select('*')
          .eq('id', dropletId)
          .eq('user_id', user.id)
          .single();

        if (error || !droplet) {
          throw new Error('Droplet not found');
        }

        if (actionType === 'delete') {
          // Delete from DigitalOcean
          await doRequest(`/droplets/${droplet.digitalocean_id}`, 'DELETE');
          
          // Delete from database
          await supabase.from('droplets').delete().eq('id', dropletId);
          
          result = { success: true, message: 'Droplet deleted' };
        } else {
          // Power actions
          const doAction = await doRequest(`/droplets/${droplet.digitalocean_id}/actions`, 'POST', {
            type: actionType,
          });
          
          result = { success: true, action: doAction.action };
        }
        break;
      }

      case 'admin-list-droplets': {
        // Check if user is admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData?.role !== 'admin') {
          throw new Error('Unauthorized - Admin only');
        }

        // Get all droplets with user info
        const { data: droplets, error } = await supabase
          .from('droplets')
          .select(`
            *,
            profiles:user_id (username, email)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Sync status with DigitalOcean
        for (const droplet of droplets || []) {
          if (droplet.digitalocean_id) {
            try {
              const doData = await doRequest(`/droplets/${droplet.digitalocean_id}`);
              const doDroplet = doData.droplet;
              const ipv4 = doDroplet.networks?.v4?.find((n: any) => n.type === 'public');
              
              if (doDroplet.status !== droplet.status || ipv4?.ip_address !== droplet.ip_address) {
                await supabase
                  .from('droplets')
                  .update({ 
                    status: doDroplet.status,
                    ip_address: ipv4?.ip_address || null,
                  })
                  .eq('id', droplet.id);
                
                droplet.status = doDroplet.status;
                droplet.ip_address = ipv4?.ip_address || null;
              }
            } catch (e) {
              console.error(`Failed to sync droplet ${droplet.id}:`, e);
            }
          }
        }

        result = droplets;
        break;
      }

      case 'admin-droplet-action': {
        const { dropletId, actionType } = params;
        
        // Check if user is admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData?.role !== 'admin') {
          throw new Error('Unauthorized - Admin only');
        }

        // Get droplet from database
        const { data: droplet, error } = await supabase
          .from('droplets')
          .select('*')
          .eq('id', dropletId)
          .single();

        if (error || !droplet) {
          throw new Error('Droplet not found');
        }

        if (actionType === 'delete') {
          await doRequest(`/droplets/${droplet.digitalocean_id}`, 'DELETE');
          await supabase.from('droplets').delete().eq('id', dropletId);
          result = { success: true, message: 'Droplet deleted' };
        } else {
          const doAction = await doRequest(`/droplets/${droplet.digitalocean_id}/actions`, 'POST', {
            type: actionType,
          });
          result = { success: true, action: doAction.action };
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});