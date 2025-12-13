import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Key, CheckCircle, AlertCircle, Wallet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AccountBalance {
  month_to_date_balance: string;
  account_balance: string;
  month_to_date_usage: string;
  generated_at: string;
}

const ApiKeysTab = () => {
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase.functions.invoke('digitalocean', {
          body: { action: 'get-account-balance' },
        });

        if (error) throw error;
        setBalance(data);
      } catch (err: any) {
        console.error('Failed to load balance:', err);
        setError(err.message || 'Failed to load balance');
      } finally {
        setLoading(false);
      }
    };
    loadBalance();
  }, []);

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(num));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">API Key DigitalOcean</h2>
        <p className="text-sm text-muted-foreground">Status dan informasi API key yang digunakan</p>
      </div>

      {/* Balance Card */}
      <Card className="border-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Saldo Akun DigitalOcean
          </CardTitle>
          <CardDescription>Informasi saldo dan penggunaan bulan ini</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive py-4">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          ) : balance ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-accent/50">
                <p className="text-sm text-muted-foreground">Saldo Akun</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(balance.account_balance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {parseFloat(balance.account_balance) < 0 ? 'Kredit tersisa' : 'Tagihan'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-accent/50">
                <p className="text-sm text-muted-foreground">Penggunaan Bulan Ini</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(balance.month_to_date_usage)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Sampai saat ini</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/50">
                <p className="text-sm text-muted-foreground">Tagihan Bulan Ini</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(balance.month_to_date_balance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Perkiraan</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* API Key Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10">
                <Key className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground text-sm">API Key Produksi</h3>
                  <span className="inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Aktif
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  API key disimpan secara aman di Supabase Secrets
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-accent/50 border-accent">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground text-sm">Tentang API Key</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                API key DigitalOcean disimpan sebagai secret di Supabase dan digunakan oleh edge function 
                untuk berkomunikasi dengan DigitalOcean API. Untuk mengubah API key, silakan update 
                secret <code className="bg-secondary px-1 rounded">DIGITALOCEAN_API_KEY</code> di 
                Supabase Dashboard.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeysTab;
