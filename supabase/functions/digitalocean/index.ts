import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Get ALL active API keys from database (for failover)
async function getAllActiveApiKeys(supabase: any): Promise<{ id: string; api_key: string }[]> {
  const { data, error } = await supabase
    .from('digitalocean_api_keys')
    .select('id, api_key')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching API keys:', error);
    return [];
  }
  return data || [];
}

// Mark API key as failed and deactivate it
async function markKeyAsFailed(supabase: any, keyId: string, errorMessage: string) {
  console.log(`Deactivating API key ${keyId.substring(0, 8)}... due to error: ${errorMessage}`);
  await supabase
    .from('digitalocean_api_keys')
    .update({
      is_active: false,
      last_error: errorMessage,
      last_checked_at: new Date().toISOString(),
    })
    .eq('id', keyId);
}

// Make request to DigitalOcean API (single key)
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

// Make request with automatic failover to other API keys
async function doRequestWithFailover(
  supabase: any,
  endpoint: string,
  method: string = 'GET',
  body?: object
): Promise<{ data: any; error?: string; usedKeyId?: string }> {
  const activeKeys = await getAllActiveApiKeys(supabase);
  
  if (activeKeys.length === 0) {
    return { data: null, error: 'No active DigitalOcean API key configured. Please add one in admin settings.' };
  }

  console.log(`Found ${activeKeys.length} active API key(s) for failover`);
  let lastError = '';
  
  for (let i = 0; i < activeKeys.length; i++) {
    const key = activeKeys[i];
    console.log(`[${i + 1}/${activeKeys.length}] Trying API key ${key.id.substring(0, 8)}... for ${method} ${endpoint}`);
    
    const response = await doRequest(endpoint, key.api_key, method, body);
    
    if (response.error) {
      lastError = response.error;
      
      if (response.isAuthError) {
        // Auth error - mark key as failed and try next
        console.log(`[FAILOVER] API key ${key.id.substring(0, 8)}... failed with auth error: ${response.error}. Trying next key...`);
        await markKeyAsFailed(supabase, key.id, response.error);
        continue; // Try next key
      } else {
        // Non-auth error - still return error but don't deactivate key
        console.log(`API key ${key.id.substring(0, 8)}... failed with non-auth error: ${response.error}`);
        return { data: null, error: response.error, usedKeyId: key.id };
      }
    }
    
    // Success!
    console.log(`[SUCCESS] API key ${key.id.substring(0, 8)}... succeeded for ${method} ${endpoint}`);
    return { data: response.data, usedKeyId: key.id };
  }
  
  // All keys failed
  console.log(`[FAILED] All ${activeKeys.length} API keys failed. Last error: ${lastError}`);
  return { data: null, error: `All API keys failed. Last error: ${lastError}` };
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

    // Actions that don't need DO API key
    const noKeyActions = ['admin-list-api-keys', 'admin-add-api-key', 'admin-update-api-key', 'admin-delete-api-key', 'admin-check-api-key-balance'];

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
        const billingResult = await doRequest('/customers/my/billing_history?per_page=200', apiKey);
        let totalCredits = 0;
        if (billingResult.data?.billing_history) {
          for (const entry of billingResult.data.billing_history) {
            const entryType = (entry.type || '').toString().toLowerCase();
            if (entryType === 'credit' || entryType === 'promotion' || entryType === 'promo') {
              const amount = parseFloat(entry.amount || '0');
              if (!Number.isNaN(amount)) {
                totalCredits += Math.abs(amount);
              }
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

      // ==================== DIGITALOCEAN API (WITH FAILOVER) ====================
      case 'get-regions': {
        const response = await doRequestWithFailover(supabase, '/regions');
        if (response.error) {
          throw new Error(response.error);
        }
        result = response.data.regions.filter((r: any) => r.available);
        break;
      }

      case 'get-sizes': {
        const response = await doRequestWithFailover(supabase, '/sizes');
        if (response.error) {
          throw new Error(response.error);
        }
        result = response.data.sizes.filter((s: any) => s.available);
        break;
      }

      case 'get-images': {
        const response = await doRequestWithFailover(supabase, '/images?type=distribution&per_page=100');
        if (response.error) {
          throw new Error(response.error);
        }
        result = response.data.images;
        break;
      }

      case 'get-apps': {
        const response = await doRequestWithFailover(supabase, '/images?type=application&per_page=100');
        if (response.error) {
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

        const response = await doRequestWithFailover(supabase, '/droplets', 'POST', {
          name,
          region,
          size,
          image,
          user_data: `#!/bin/bash\necho "root:${password}" | chpasswd\nsed -i 's/PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config\nsed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config\nservice ssh restart || systemctl restart sshd`,
        });

        if (response.error) {
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

        // Sync status with DigitalOcean using failover
        for (const droplet of droplets || []) {
          if (droplet.digitalocean_id) {
            try {
              const response = await doRequestWithFailover(supabase, `/droplets/${droplet.digitalocean_id}`);
              if (response.error) {
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
          const response = await doRequestWithFailover(supabase, `/droplets/${droplet.digitalocean_id}`, 'DELETE');
          if (response.error) {
            throw new Error(response.error);
          }
          
          await supabase.from('droplets').delete().eq('id', dropletId);
          result = { success: true, message: 'Droplet deleted' };
        } else {
          const response = await doRequestWithFailover(supabase, `/droplets/${droplet.digitalocean_id}/actions`, 'POST', {
            type: actionType,
          });
          if (response.error) {
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

        // Sync status with DigitalOcean using failover
        for (const droplet of droplets || []) {
          if (droplet.digitalocean_id) {
            try {
              const response = await doRequestWithFailover(supabase, `/droplets/${droplet.digitalocean_id}`);
              if (response.error) {
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
          const response = await doRequestWithFailover(supabase, `/droplets/${droplet.digitalocean_id}`, 'DELETE');
          if (response.error) {
            throw new Error(response.error);
          }
          
          await supabase.from('droplets').delete().eq('id', dropletId);
          result = { success: true, message: 'Droplet deleted' };
        } else {
          const response = await doRequestWithFailover(supabase, `/droplets/${droplet.digitalocean_id}/actions`, 'POST', {
            type: actionType,
          });
          if (response.error) {
            throw new Error(response.error);
          }
          
          result = { success: true, action: response.data.action };
        }
        break;
      }

      // ==================== FIREWALL MANAGEMENT ====================
      case 'list-firewalls': {
        const response = await doRequestWithFailover(supabase, '/firewalls');
        if (response.error) {
          throw new Error(response.error);
        }
        result = response.data.firewalls || [];
        break;
      }

      case 'create-firewall': {
        const { name, dropletIds, inboundRules, outboundRules } = params;
        
        if (!name) {
          throw new Error('Firewall name is required');
        }

        const response = await doRequestWithFailover(supabase, '/firewalls', 'POST', {
          name,
          droplet_ids: dropletIds || [],
          inbound_rules: inboundRules || [],
          outbound_rules: outboundRules || [],
        });

        if (response.error) {
          throw new Error(response.error);
        }

        result = response.data.firewall;
        break;
      }

      case 'assign-firewall': {
        const { firewallId, dropletIds } = params;
        
        if (!firewallId || !dropletIds) {
          throw new Error('Firewall ID and droplet IDs are required');
        }

        const response = await doRequestWithFailover(supabase, `/firewalls/${firewallId}/droplets`, 'POST', {
          droplet_ids: dropletIds,
        });

        if (response.error) {
          throw new Error(response.error);
        }

        result = { success: true };
        break;
      }

      case 'unassign-firewall': {
        const { firewallId, dropletIds } = params;
        
        if (!firewallId || !dropletIds) {
          throw new Error('Firewall ID and droplet IDs are required');
        }

        const response = await doRequestWithFailover(supabase, `/firewalls/${firewallId}/droplets`, 'DELETE', {
          droplet_ids: dropletIds,
        });

        if (response.error) {
          throw new Error(response.error);
        }

        result = { success: true };
        break;
      }

      case 'add-firewall-rules': {
        const { firewallId, inboundRules, outboundRules } = params;
        
        if (!firewallId) {
          throw new Error('Firewall ID is required');
        }

        const response = await doRequestWithFailover(supabase, `/firewalls/${firewallId}/rules`, 'POST', {
          inbound_rules: inboundRules || [],
          outbound_rules: outboundRules || [],
        });

        if (response.error) {
          throw new Error(response.error);
        }

        result = { success: true };
        break;
      }

      case 'remove-firewall-rules': {
        const { firewallId, inboundRules, outboundRules } = params;
        
        if (!firewallId) {
          throw new Error('Firewall ID is required');
        }

        const response = await doRequestWithFailover(supabase, `/firewalls/${firewallId}/rules`, 'DELETE', {
          inbound_rules: inboundRules || [],
          outbound_rules: outboundRules || [],
        });

        if (response.error) {
          throw new Error(response.error);
        }

        result = { success: true };
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
