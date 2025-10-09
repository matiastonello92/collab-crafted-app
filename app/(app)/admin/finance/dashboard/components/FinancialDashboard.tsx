"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Calendar, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import { SalesRecordsDashboard } from "./SalesRecordsDashboard";
import { useTranslation } from "@/lib/i18n";

interface FinancialDashboardProps {
  orgId: string;
  locationId: string | null;
}

export function FinancialDashboard({ orgId, locationId }: FinancialDashboardProps) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<string>("");
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [orgId, locationId]);

  const loadDashboardData = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let query = supabase
      .from("cash_closures")
      .select("*")
      .eq("org_id", orgId)
      .gte("closure_date", thirtyDaysAgo.toISOString().split('T')[0])
      .order("closure_date", { ascending: true });

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data: closures, error } = await query;

    if (error) {
      toast.error(t('finance.dashboard.errorLoading'));
      return;
    }

    if (!closures || closures.length === 0) {
      setStats({
        total: 0,
        average: 0,
        count: 0,
        trend: 0
      });
      setChartData([]);
      return;
    }

    const total = closures.reduce((sum, c) => sum + Number(c.total_amount), 0);
    const average = total / closures.length;
    
    const lastWeek = closures.slice(-7);
    const prevWeek = closures.slice(-14, -7);
    const lastWeekAvg = lastWeek.reduce((sum, c) => sum + Number(c.total_amount), 0) / lastWeek.length;
    const prevWeekAvg = prevWeek.length > 0 ? prevWeek.reduce((sum, c) => sum + Number(c.total_amount), 0) / prevWeek.length : lastWeekAvg;
    const trend = prevWeekAvg > 0 ? ((lastWeekAvg - prevWeekAvg) / prevWeekAvg) * 100 : 0;

    setStats({
      total,
      average,
      count: closures.length,
      trend
    });

    const chartFormatted = closures.map(c => ({
      date: new Date(c.closure_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      amount: Number(c.total_amount)
    }));

    setChartData(chartFormatted);
  };

  const generateAIInsights = async () => {
    if (chartData.length === 0) {
      toast.error(t('finance.dashboard.notEnoughData'));
      return;
    }

    setIsLoadingInsights(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-financial-data", {
        body: { 
          closures: chartData,
          stats
        }
      });

      if (error) throw error;

      setAiInsights(data.insights);
      toast.success(t('finance.dashboard.aiAnalysisComplete'));
    } catch (error) {
      console.error(error);
      toast.error(t('finance.dashboard.aiAnalysisError'));
    } finally {
      setIsLoadingInsights(false);
    }
  };

  if (!stats) {
    return <div className="text-center py-12">{t('finance.dashboard.loading')}</div>;
  }

  return (
    <Tabs defaultValue="imported" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="imported">
          <FileText className="w-4 h-4 mr-2" />
          {t('finance.dashboard.tabs.imported')}
        </TabsTrigger>
        <TabsTrigger value="closures">
          <DollarSign className="w-4 h-4 mr-2" />
          {t('finance.dashboard.tabs.closures')}
        </TabsTrigger>
        <TabsTrigger value="combined">
          <Sparkles className="w-4 h-4 mr-2" />
          {t('finance.dashboard.tabs.combined')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="imported" className="space-y-6">
        <SalesRecordsDashboard orgId={orgId} locationId={locationId} />
      </TabsContent>

      <TabsContent value="closures" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('finance.dashboard.manualClosures')}</h2>
            <p className="text-muted-foreground mt-2">
              {t('finance.dashboard.analysisLast30Days')}
            </p>
          </div>
          <Button onClick={generateAIInsights} disabled={isLoadingInsights}>
            <Sparkles className="w-4 h-4 mr-2" />
            {isLoadingInsights ? t('finance.dashboard.analyzing') : t('finance.dashboard.generateAIInsights')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('finance.dashboard.stats.totalRevenue')}</p>
                <p className="text-2xl font-bold">€{stats.total.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('finance.dashboard.stats.dailyAverage')}</p>
                <p className="text-2xl font-bold">€{stats.average.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('finance.dashboard.stats.weeklyTrend')}</p>
                <p className={`text-2xl font-bold ${stats.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.trend >= 0 ? '+' : ''}{stats.trend.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">{t('finance.dashboard.charts.revenueTitle')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {aiInsights && (
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-primary mt-1" />
              <div>
                <h4 className="text-lg font-semibold mb-2">{t('finance.dashboard.aiInsightsTitle')}</h4>
                <p className="text-muted-foreground whitespace-pre-line">{aiInsights}</p>
              </div>
            </div>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="combined" className="space-y-6">
        <Card className="p-8 text-center">
          <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('finance.dashboard.combinedViewTitle')}</h3>
          <p className="text-muted-foreground">
            {t('finance.dashboard.combinedViewDesc')}
          </p>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
