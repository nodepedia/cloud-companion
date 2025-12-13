-- Create tutorials table
CREATE TABLE public.tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  youtube_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;

-- Everyone can view tutorials
CREATE POLICY "Anyone can view tutorials"
ON public.tutorials
FOR SELECT
USING (true);

-- Only admins can manage tutorials
CREATE POLICY "Admins can manage tutorials"
ON public.tutorials
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_tutorials_updated_at
BEFORE UPDATE ON public.tutorials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();