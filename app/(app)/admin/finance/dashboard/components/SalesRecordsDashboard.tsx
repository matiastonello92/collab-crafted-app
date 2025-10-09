"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, Legend 
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, Receipt } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface SalesRecordsDashboardProps {
  orgId: string;
  locationId: string | null;
}

export function SalesRecordsDashboard({ orgId, locationId }: SalesRecordsDashboardProps) {
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCovers: 0,
    avgOrderValue: 0,
    trend: 0
  });

  useEffect(() => {
    loadSalesData();
  }, [orgId, locationId]);

  const loadSalesData = async () => {
    try {
      setLoading(true);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let query = supabase
        .from('sales_records')
        .select('*')
        .eq('org_id', orgId)
        .gte('record_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('record_date', { ascending: true });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setSalesData(data || []);

      // Calculate stats
      const totalRevenue = data?.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0) || 0;
      const totalOrders = data?.reduce((sum, r) => sum + (r.orders || 0), 0) || 0;
      const totalCovers = data?.reduce((sum, r) => sum + (r.covers || 0), 0) || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate trend (last 7 days vs previous 7 days)
      const last7Days = data?.filter(r => {
        const recordDate = new Date(r.record_date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return recordDate >= sevenDaysAgo;
      }) || [];

      const previous7Days = data?.filter(r => {
        const recordDate = new Date(r.record_date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        return recordDate >= fourteenDaysAgo && recordDate < sevenDaysAgo;
      }) || [];

      const last7Total = last7Days.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
      const prev7Total = previous7Days.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
      const trend = prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total) * 100 : 0;

      setStats({
        totalRevenue,
        totalOrders,
        totalCovers,
        avgOrderValue,
        trend
      });

    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento dati vendite...</p>
        </div>
      </div>
    );
  }

  if (salesData.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Receipt className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nessun dato disponibile</h3>
        <p className="text-muted-foreground">
          Importa dati CSV per visualizzare statistiche e grafici
        </p>
      </Card>
    );
  }

  const chartData = salesData.map(record => ({
    date: format(new Date(record.record_date), 'dd MMM', { locale: it }),
    revenue: parseFloat(record.total_amount) || 0,
    netSales: parseFloat(record.net_sales_amount) || 0,
    orders: record.orders || 0,
    covers: record.covers || 0
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Fatturato Totale</span>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold">
            €{stats.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {stats.trend >= 0 ? (
              <>
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">+{stats.trend.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-600">{stats.trend.toFixed(1)}%</span>
              </>
            )}
            <span className="text-xs text-muted-foreground">vs 7 giorni fa</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Ordini Totali</span>
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold">{stats.totalOrders.toLocaleString('it-IT')}</div>
          <div className="text-sm text-muted-foreground mt-2">
            Ultimi 30 giorni
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Coperti Totali</span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold">{stats.totalCovers.toLocaleString('it-IT')}</div>
          <div className="text-sm text-muted-foreground mt-2">
            Clienti serviti
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Scontrino Medio</span>
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold">
            €{stats.avgOrderValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Per ordine
          </div>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Fatturato</TabsTrigger>
          <TabsTrigger value="orders">Ordini & Coperti</TabsTrigger>
          <TabsTrigger value="breakdown">Dettaglio</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Andamento Fatturato (30 giorni)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Fatturato Totale" />
                <Bar dataKey="netSales" fill="hsl(var(--accent))" name="Vendite Nette" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Ordini e Coperti</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Ordini"
                />
                <Line 
                  type="monotone" 
                  dataKey="covers" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="Coperti"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Dettaglio Finanziario</h3>
            <div className="space-y-3">
              {salesData.slice(0, 10).map((record, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">
                      {format(new Date(record.record_date), 'dd MMM yyyy', { locale: it })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {record.orders || 0} ordini • {record.covers || 0} coperti
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      €{parseFloat(record.total_amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {record.tips_amount > 0 && (
                        <Badge variant="secondary">Mance: €{record.tips_amount}</Badge>
                      )}
                      {record.refunds_amount > 0 && (
                        <Badge variant="destructive">Rimborsi: €{record.refunds_amount}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
