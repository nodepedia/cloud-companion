import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Get active API key from database
async function getActiveApiKey(supabase: any): Promise<{ id: string; api_key: string } | null> {
  const { data, error } = await supabase
    .from('digitalocean_api_keys')
    .select('id, api_key')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching API key:', error);
    return null;
  }
  return data;
}

// Mark API key as failed and deactivate it
async function markKeyAsFailed(supabase: any, keyId: string, errorMessage: string) {
  console.log(`Deactivating API key ${keyId} due to error: ${errorMessage}`);
  await supabase
    .from('digitalocean_api_keys')
    .update({
      is_active: false,
      last_error: errorMessage,
      last_checked_at: new Date().toISOString(),
    })
    .eq('id', keyId);
}

// Make request to DigitalOcean API
async function doRequest(
  endpoint: string,
  apiKey: string,
  method: string = 'GET',
  body?: object
): Promise<{ data: any; error?: string; isAuthError?: boolean }> {
  try {
    const response = await fetch(`https://api.digitalocean.com/v2${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `API error: ${response.status}`;
      
      // Check if it's an authentication error
      const isAuthError = response.status === 401 || response.status === 403;
      
      return { data: null, error: errorMessage, isAuthError };
    }

    if (response.status === 204) {
      return { data: null };
    }

    const data = await response.json();
    return { data };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Session expired or invalid. Please login again.');
    }

    const { action, ...params } = await req.json();
    console.log(`Action: ${action}, User: ${user.id}, Params:`, params);

    // Get active API key
    const activeKey = await getActiveApiKey(supabase);
    
    // Actions that don't need DO API key
    const noKeyActions = ['admin-list-api-keys', 'admin-add-api-key', 'admin-update-api-key', 'admin-delete-api-key', 'admin-check-api-key-balance'];
    
    if (!noKeyActions.includes(action) && !activeKey) {
      throw new Error('No active DigitalOcean API key configured. Please add one in admin settings.');
    }

    let result;

    switch (action) {
      // ==================== API KEY MANAGEMENT ====================
      case 'admin-list-api-keys': {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData?.role !== 'admin') {
          throw new Error('Unauthorized - Admin only');
        }

        const { data: keys, error } = await supabase
          .from('digitalocean_api_keys')
          .select('id, name, api_key, is_active, last_checked_at, last_balance, last_error, created_at')
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Mask API keys for security
        result = keys?.map(k => ({
          ...k,
          api_key_masked: k.api_key.substring(0, 12) + '...' + k.api_key.substring(k.api_key.length - 4),
        }));
        break;
      }

      case 'admin-add-api-key': {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData?.role !== 'admin') {
          throw new Error('Unauthorized - Admin only');
        }

        const { name, apiKey } = params;
        if (!name || !apiKey) {
          throw new Error('Name and API key are required');
        }

        // Test the API key first
        const testResult = await doRequest('/account', apiKey);
        if (testResult.error) {
          throw new Error(`Invalid API key: ${testResult.error}`);
        }

        // Get balance
        const balanceResult = await doRequest('/customers/my/balance', apiKey);
        
        // Get credits from billing history
        const billingResult = await doRequest('/customers/my/billing_history?per_page=50', apiKey);
        let totalCredits = 0;
        if (billingResult.data?.billing_history) {
          for (const entry of billingResult.data.billing_history) {
            if (entry.type === 'Credit' || entry.type === 'credit') {
              // Credits are stored as negative amounts typically
              totalCredits += Math.abs(parseFloat(entry.amount || '0'));
            }
          }
        }

        const balanceWithCredits = {
          ...balanceResult.data,
          credits_available: totalCredits,
        };

        const { data: newKey, error } = await supabase
          .from('digitalocean_api_keys')
          .insert({
            name,
            api_key: apiKey,
            is_active: true,
            last_balance: balanceWithCredits,
            last_checked_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        result = {
          ...newKey,
          api_key_masked: newKey.api_key.substring(0, 12) + '...' + newKey.api_key.substring(newKey.api_key.length - 4),
        };
        break;
      }

      case 'admin-update-api-key': {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData?.role !== 'admin') {
          throw new Error('Unauthorized - Admin only');
        }

        const { keyId, name, isActive } = params;
        if (!keyId) {
          throw new Error('Key ID is required');
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (isActive !== undefined) {
          updateData.is_active = isActive;
          if (isActive) updateData.last_error = null; // Clear error when reactivating
        }

        const { data: updatedKey, error } = await supabase
          .from('digitalocean_api_keys')
          .update(updateData)
          .eq('id', keyId)
          .select()
          .single();

        if (error) throw error;

        result = {
          ...updatedKey,
          api_key_masked: updatedKey.api_key.substring(0, 12) + '...' + updatedKey.api_key.substring(updatedKey.api_key.length - 4),
        };
        break;
      }

      case 'admin-delete-api-key': {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData?.role !== 'admin') {
          throw new Error('Unauthorized - Admin only');
        }

        const { keyId } = params;
        if (!keyId) {
          throw new Error('Key ID is required');
        }

        const { error } = await supabase
          .from('digitalocean_api_keys')
          .delete()
          .eq('id', keyId);

        if (error) throw error;

        result = { success: true };
        break;
      }

      case 'admin-check-api-key-balance': {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData?.role !== 'admin') {
          throw new Error('Unauthorized - Admin only');
        }

        const { keyId } = params;
        if (!keyId) {
          throw new Error('Key ID is required');
        }

        // Get the key
        const { data: keyData, error: keyError } = await supabase
          .from('digitalocean_api_keys')
          .select('api_key')
          .eq('id', keyId)
          .single();

        if (keyError || !keyData) {
          throw new Error('API key not found');
        }

        // Check balance
        const balanceResult = await doRequest('/customers/my/balance', keyData.api_key);
        
        if (balanceResult.error) {
          // Update with error
          await supabase
            .from('digitalocean_api_keys')
            .update({
              last_error: balanceResult.error,
              last_checked_at: new Date().toISOString(),
              is_active: balanceResult.isAuthError ? false : true,
            })
            .eq('id', keyId);
          
          throw new Error(balanceResult.error);
        }

        // Get credits from billing history
        const billingResult = await doRequest('/customers/my/billing_history?per_page=50', keyData.api_key);
        let totalCredits = 0;
        if (billingResult.data?.billing_history) {
          for (const entry of billingResult.data.billing_history) {
            if (entry.type === 'Credit' || entry.type === 'credit') {
              totalCredits += Math.abs(parseFloat(entry.amount || '0'));
            }
          }
        }

        const balanceWithCredits = {
          ...balanceResult.data,
          credits_available: totalCredits,
        };

        // Update with balance
        await supabase
          .from('digitalocean_api_keys')
          .update({
            last_balance: balanceWithCredits,
            last_checked_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', keyId);

        result = balanceWithCredits;
        break;
      }

      // ==================== DIGITALOCEAN API ====================
      case 'get-regions': {
        const response = await doRequest('/regions', activeKey!.api_key);
        if (response.error) {
          if (response.isAuthError) {
            await markKeyAsFailed(supabase, activeKey!.id, response.error);
          }
          throw new Error(response.error);
        }
        result = response.data.regions.filter((r: any) => r.available);
        break;
      }

      case 'get-sizes': {
        const response = await doRequest('/sizes', activeKey!.api_key);
        if (response.error) {
          if (response.isAuthError) {
            await markKeyAsFailed(supabase, activeKey!.id, response.error);
          }
          throw new Error(response.error);
        }
        result = response.data.sizes.filter((s: any) => s.available);
        break;
      }

      case 'get-images': {
        const response = await doRequest('/images?type=distribution&per_page=100', activeKey!.api_key);
        if (response.error) {
          if (response.isAuthError) {
            await markKeyAsFailed(supabase, activeKey!.id, response.error);
          }
          throw new Error(response.error);
        }
        result = response.data.images;
        break;
      }

      case 'get-apps': {
        const response = await doRequest('/images?type=application&per_page=100', activeKey!.api_key);
        if (response.error) {
          if (response.isAuthError) {
            await markKeyAsFailed(supabase, activeKey!.id, response.error);
          }
          throw new Error(response.error);
        }
        result = response.data.images;
        break;
      }

      case 'create-droplet': {
        const { name, region, size, image, password } = params;
        
        if (!name || !region || !size || !image || !password) {
          throw new Error('Missing required fields');
        }

        const response = await doRequest('/droplets', activeKey!.api_key, 'POST', {
          name,
          region,
          size,
          image,
          user_data: `#!/bin/bash\necho "root:${password}" | chpasswd\nsed -i 's/PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config\nsed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config\nservice ssh restart || systemctl restart sshd`,
        });

        if (response.error) {
          if (response.isAuthError) {
            await markKeyAsFailed(supabase, activeKey!.id, response.error);
          }
          throw new Error(response.error);
        }

        const droplet = response.data.droplet;

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
              const response = await doRequest(`/droplets/${droplet.digitalocean_id}`, activeKey!.api_key);
              if (response.error) {
                if (response.isAuthError) {
                  await markKeyAsFailed(supabase, activeKey!.id, response.error);
                }
                continue;
              }
              
              const doDroplet = response.data.droplet;
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
          const response = await doRequest(`/droplets/${droplet.digitalocean_id}`, activeKey!.api_key, 'DELETE');
          if (response.error) {
            if (response.isAuthError) {
              await markKeyAsFailed(supabase, activeKey!.id, response.error);
            }
            throw new Error(response.error);
          }
          
          await supabase.from('droplets').delete().eq('id', dropletId);
          result = { success: true, message: 'Droplet deleted' };
        } else {
          const response = await doRequest(`/droplets/${droplet.digitalocean_id}/actions`, activeKey!.api_key, 'POST', {
            type: actionType,
          });
          if (response.error) {
            if (response.isAuthError) {
              await markKeyAsFailed(supabase, activeKey!.id, response.error);
            }
            throw new Error(response.error);
          }
          
          result = { success: true, action: response.data.action };
        }
        break;
      }

      case 'admin-list-droplets': {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData?.role !== 'admin') {
          throw new Error('Unauthorized - Admin only');
        }

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
          if (droplet.digitalocean_id && activeKey) {
            try {
              const response = await doRequest(`/droplets/${droplet.digitalocean_id}`, activeKey.api_key);
              if (response.error) {
                if (response.isAuthError) {
                  await markKeyAsFailed(supabase, activeKey.id, response.error);
                }
                continue;
              }
              
              const doDroplet = response.data.droplet;
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
        
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData?.role !== 'admin') {
          throw new Error('Unauthorized - Admin only');
        }

        const { data: droplet, error } = await supabase
          .from('droplets')
          .select('*')
          .eq('id', dropletId)
          .single();

        if (error || !droplet) {
          throw new Error('Droplet not found');
        }

        if (actionType === 'delete') {
          const response = await doRequest(`/droplets/${droplet.digitalocean_id}`, activeKey!.api_key, 'DELETE');
          if (response.error) {
            if (response.isAuthError) {
              await markKeyAsFailed(supabase, activeKey!.id, response.error);
            }
            throw new Error(response.error);
          }
          
          await supabase.from('droplets').delete().eq('id', dropletId);
          result = { success: true, message: 'Droplet deleted' };
        } else {
          const response = await doRequest(`/droplets/${droplet.digitalocean_id}/actions`, activeKey!.api_key, 'POST', {
            type: actionType,
          });
          if (response.error) {
            if (response.isAuthError) {
              await markKeyAsFailed(supabase, activeKey!.id, response.error);
            }
            throw new Error(response.error);
          }
          
          result = { success: true, action: response.data.action };
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
