import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { databaseService } from '../../services/database';

interface DailyStats {
  date: number;
  pages_read: number;
  time_spent: number;
  session_count: number;
  books_active: number;
}

interface Summary {
  totalBooksRead: number;
  totalPagesRead: number;
  totalTimeSpent: number;
  averageSessionTime: number;
}

type Period = '7' | '30' | '90';

const formatMinutes = (seconds: number): string => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Statistics: React.FC = () => {
  const [period, setPeriod] = useState<Period>('30');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalBooksRead: 0,
    totalPagesRead: 0,
    totalTimeSpent: 0,
    averageSessionTime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(period, 10);
      const [global, totals] = await Promise.all([
        databaseService.getGlobalReadingStats(days),
        databaseService.getTotalReadingSummary(),
      ]);
      setDailyStats(global as DailyStats[]);
      setSummary(totals);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = dailyStats.map(row => ({
    date: formatDate(row.date),
    pages: row.pages_read,
    minutes: Math.round(row.time_spent / 60),
  }));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Reading Statistics</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60%' }}>
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <>
            <IonGrid style={{ padding: '8px' }}>
              <IonRow>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent style={{ textAlign: 'center', padding: '12px' }}>
                      <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--ion-color-primary)' }}>
                        {summary.totalBooksRead}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>Books Read</div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent style={{ textAlign: 'center', padding: '12px' }}>
                      <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--ion-color-success)' }}>
                        {summary.totalPagesRead.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>Pages Read</div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent style={{ textAlign: 'center', padding: '12px' }}>
                      <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--ion-color-tertiary)' }}>
                        {formatMinutes(summary.totalTimeSpent)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>Total Time</div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent style={{ textAlign: 'center', padding: '12px' }}>
                      <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--ion-color-warning)' }}>
                        {formatMinutes(summary.averageSessionTime)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>Avg Session</div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>

            <div style={{ padding: '0 16px 8px' }}>
              <IonSegment
                value={period}
                onIonChange={(e) => setPeriod(e.detail.value as Period)}
              >
                <IonSegmentButton value="7">
                  <IonLabel>7 Days</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="30">
                  <IonLabel>30 Days</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="90">
                  <IonLabel>90 Days</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>

            <IonCard style={{ margin: '0 16px 16px' }}>
              <IonCardHeader>
                <IonCardTitle style={{ fontSize: '16px' }}>Pages Read Per Day</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {chartData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ion-color-medium)' }}>
                    No reading data for this period.
                    <br />
                    Start reading to see your stats!
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ion-color-light-shade)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value: number | undefined) => [`${value ?? 0} pages`, 'Pages']}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Bar dataKey="pages" fill="var(--ion-color-primary)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </IonCardContent>
            </IonCard>

            <IonCard style={{ margin: '0 16px 16px' }}>
              <IonCardHeader>
                <IonCardTitle style={{ fontSize: '16px' }}>Reading Time Per Day (min)</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {chartData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ion-color-medium)' }}>
                    No reading data for this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ion-color-light-shade)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value: number | undefined) => [`${value ?? 0} min`, 'Time']}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Bar dataKey="minutes" fill="var(--ion-color-success)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </IonCardContent>
            </IonCard>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Statistics;
