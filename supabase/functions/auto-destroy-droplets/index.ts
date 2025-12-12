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
    console.log('Starting auto-destroy check...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get all user limits with auto_destroy_days > 0
    const { data: userLimits, error: limitsError } = await supabase
      .from('user_limits')
      .select('user_id, auto_destroy_days')
      .gt('auto_destroy_days', 0);

    if (limitsError) {
      console.error('Error fetching user limits:', limitsError);
      throw limitsError;
    }

    console.log(`Found ${userLimits?.length || 0} users with auto-destroy enabled`);

    let destroyedCount = 0;
    const destroyedDroplets: string[] = [];

    for (const limit of userLimits || []) {
      // Calculate the cutoff date for this user
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - limit.auto_destroy_days);

      console.log(`Checking user ${limit.user_id}: auto_destroy_days=${limit.auto_destroy_days}, cutoff=${cutoffDate.toISOString()}`);

      // Get droplets for this user that are older than the cutoff
      const { data: droplets, error: dropletsError } = await supabase
        .from('droplets')
        .select('*')
        .eq('user_id', limit.user_id)
        .lt('created_at', cutoffDate.toISOString());

      if (dropletsError) {
        console.error(`Error fetching droplets for user ${limit.user_id}:`, dropletsError);
        continue;
      }

      console.log(`Found ${droplets?.length || 0} expired droplets for user ${limit.user_id}`);

      for (const droplet of droplets || []) {
        try {
          console.log(`Destroying droplet: ${droplet.name} (ID: ${droplet.id}, DO ID: ${droplet.digitalocean_id})`);
          
          // Delete from DigitalOcean
          if (droplet.digitalocean_id) {
            try {
              await doRequest(`/droplets/${droplet.digitalocean_id}`, 'DELETE');
              console.log(`Successfully deleted droplet ${droplet.digitalocean_id} from DigitalOcean`);
            } catch (doError: any) {
              // If droplet doesn't exist in DO, continue to delete from DB
              console.log(`DigitalOcean deletion error (may already be deleted): ${doError.message}`);
            }
          }
          
          // Delete from database
          const { error: deleteError } = await supabase
            .from('droplets')
            .delete()
            .eq('id', droplet.id);

          if (deleteError) {
            console.error(`Error deleting droplet ${droplet.id} from database:`, deleteError);
            continue;
          }

          destroyedCount++;
          destroyedDroplets.push(`${droplet.name} (user: ${limit.user_id})`);
          console.log(`Successfully destroyed droplet: ${droplet.name}`);
        } catch (e: any) {
          console.error(`Failed to destroy droplet ${droplet.id}:`, e);
        }
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      destroyedCount,
      destroyedDroplets,
      message: destroyedCount > 0 
        ? `Auto-destroyed ${destroyedCount} droplet(s)` 
        : 'No droplets to destroy',
    };

    console.log('Auto-destroy check completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Auto-destroy error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
