-- Schedule auto-destroy-droplets cron job to run daily at midnight UTC
SELECT cron.schedule(
  'auto-destroy-droplets-daily',
  '0 0 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://hmxhuemjueznudjigozo.supabase.co/functions/v1/auto-destroy-droplets',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhteGh1ZW1qdWV6bnVkamlnb3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTU2MTcsImV4cCI6MjA4MTEzMTYxN30.y9MOWk_AUKixwUsq8Ed6ZFoLa2SgMhVL8nP4b-BKuSo"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);