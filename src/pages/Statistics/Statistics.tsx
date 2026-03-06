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
  IonProgressBar,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonThumbnail,
} from '@ionic/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { flameOutline, chevronForwardOutline, bookOutline, timeOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { databaseService } from '../../services/database';
import { useReadingGoalsStore } from '../../stores/useReadingGoalsStore';

interface TimelineEntry {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  coverPath: string | null;
  startTime: number;
  endTime: number;
  duration: number;
  pagesRead: number;
  startPosition: number;
  endPosition: number;
}

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

const formatGoalMinutes = (minutes: number): string => {
  if (minutes < 1) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Statistics: React.FC = () => {
  const history = useHistory();
  const [period, setPeriod] = useState<Period>('30');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalBooksRead: 0,
    totalPagesRead: 0,
    totalTimeSpent: 0,
    averageSessionTime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const {
    enabled: streakEnabled,
    currentStreak,
    longestStreak,
    dailyGoalMinutes,
    yearlyGoalEnabled,
    getTodayMinutes,
    getTodayProgress,
    isTodayGoalMet,
    getYearlyGoalData,
    getYearlyProgress,
  } = useReadingGoalsStore();

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(period, 10);
      const [global, totals, timelineData] = await Promise.all([
        databaseService.getGlobalReadingStats(days),
        databaseService.getTotalReadingSummary(),
        databaseService.getReadingTimeline(50),
      ]);
      setDailyStats(global as DailyStats[]);
      setSummary(totals);
      setTimeline(timelineData);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = dailyStats.map((row) => ({
    date: formatDate(row.date),
    pages: row.pages_read,
    minutes: Math.round(row.time_spent / 60),
  }));

  const todayMinutes = getTodayMinutes();
  const todayProgress = getTodayProgress();
  const todayGoalMet = isTodayGoalMet();
  const thisYear = new Date().getFullYear();
  const yearlyData = getYearlyGoalData(thisYear);
  const yearlyProgress = getYearlyProgress(thisYear);

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
        {/* ─── Goals & Streak Summary Card ─────────────── */}
        {streakEnabled && (
          <IonCard
            style={{ margin: '12px 16px 8px', cursor: 'pointer' }}
            onClick={() => history.push('/reading-goals')}
          >
            <IonCardContent style={{ padding: '14px 16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon
                    icon={flameOutline}
                    style={{ fontSize: '20px', color: currentStreak > 0 ? '#ff6b35' : 'var(--ion-color-medium)' }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>
                    {currentStreak > 0
                      ? `${currentStreak}-day streak`
                      : 'No active streak'}
                  </span>
                  {longestStreak > 0 && currentStreak < longestStreak && (
                    <span style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                      (best: {longestStreak})
                    </span>
                  )}
                </div>
                <IonIcon
                  icon={chevronForwardOutline}
                  style={{ fontSize: '18px', color: 'var(--ion-color-medium)' }}
                />
              </div>

              {/* Today's daily progress */}
              <div style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: 'var(--ion-color-medium)',
                    marginBottom: '4px',
                  }}
                >
                  <span>Today: {formatGoalMinutes(todayMinutes)} of {dailyGoalMinutes}m</span>
                  <span>
                    {todayGoalMet
                      ? 'Goal met!'
                      : `${Math.max(0, Math.round(dailyGoalMinutes - todayMinutes))}m left`}
                  </span>
                </div>
                <IonProgressBar
                  value={todayProgress}
                  color={todayGoalMet ? 'success' : 'primary'}
                  style={{ height: '6px', borderRadius: '3px' }}
                />
              </div>

              {/* Yearly book goal progress */}
              {yearlyGoalEnabled && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: 'var(--ion-color-medium)',
                      marginBottom: '4px',
                    }}
                  >
                    <span>
                      {thisYear} Challenge: {yearlyData.booksFinished.length} of {yearlyData.targetBooks} books
                    </span>
                    <span>{Math.round(yearlyProgress * 100)}%</span>
                  </div>
                  <IonProgressBar
                    value={yearlyProgress}
                    color={yearlyProgress >= 1 ? 'success' : 'tertiary'}
                    style={{ height: '6px', borderRadius: '3px' }}
                  />
                </div>
              )}
            </IonCardContent>
          </IonCard>
        )}

        {isLoading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '60%',
            }}
          >
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <>
            <IonGrid style={{ padding: '8px' }}>
              <IonRow>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent style={{ textAlign: 'center', padding: '12px' }}>
                      <div
                        style={{
                          fontSize: '28px',
                          fontWeight: 'bold',
                          color: 'var(--ion-color-primary)',
                        }}
                      >
                        {summary.totalBooksRead}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                        Books Read
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent style={{ textAlign: 'center', padding: '12px' }}>
                      <div
                        style={{
                          fontSize: '28px',
                          fontWeight: 'bold',
                          color: 'var(--ion-color-success)',
                        }}
                      >
                        {summary.totalPagesRead.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                        Pages Read
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent style={{ textAlign: 'center', padding: '12px' }}>
                      <div
                        style={{
                          fontSize: '28px',
                          fontWeight: 'bold',
                          color: 'var(--ion-color-tertiary)',
                        }}
                      >
                        {formatMinutes(summary.totalTimeSpent)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                        Total Time
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
                <IonCol size="6">
                  <IonCard>
                    <IonCardContent style={{ textAlign: 'center', padding: '12px' }}>
                      <div
                        style={{
                          fontSize: '28px',
                          fontWeight: 'bold',
                          color: 'var(--ion-color-warning)',
                        }}
                      >
                        {formatMinutes(summary.averageSessionTime)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                        Avg Session
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            </IonGrid>

            <div style={{ padding: '0 16px 8px' }}>
              <IonSegment value={period} onIonChange={(e) => setPeriod(e.detail.value as Period)}>
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
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '32px',
                      color: 'var(--ion-color-medium)',
                    }}
                  >
                    No reading data for this period.
                    <br />
                    Start reading to see your stats!
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ion-color-light-shade)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
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
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '32px',
                      color: 'var(--ion-color-medium)',
                    }}
                  >
                    No reading data for this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ion-color-light-shade)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value: number | undefined) => [`${value ?? 0} min`, 'Time']}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Bar
                        dataKey="minutes"
                        fill="var(--ion-color-success)"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </IonCardContent>
            </IonCard>

            {/* Reading History Timeline */}
            <IonCard style={{ margin: '0 16px 16px' }}>
              <IonCardHeader>
                <IonCardTitle style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={timeOutline} />
                  Reading History
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent style={{ padding: 0 }}>
                {timeline.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ion-color-medium)' }}>
                    No reading sessions recorded yet.
                    <br />
                    Sessions will appear here as you read.
                  </div>
                ) : (
                  <IonList style={{ padding: 0 }}>
                    {timeline.map((entry, i) => {
                      const sessionDate = new Date(entry.startTime * 1000);
                      const durationMin = Math.round(entry.duration / 60);
                      return (
                        <IonItem key={i} lines="inset" style={{ '--min-height': '60px' }}>
                          <IonThumbnail slot="start" style={{ width: 36, height: 52, borderRadius: 3, overflow: 'hidden' }}>
                            {entry.coverPath ? (
                              <img src={entry.coverPath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{
                                width: '100%', height: '100%', background: 'var(--ion-color-light)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <IonIcon icon={bookOutline} style={{ fontSize: 16 }} />
                              </div>
                            )}
                          </IonThumbnail>
                          <IonLabel>
                            <h3 style={{ fontSize: 14, fontWeight: 600 }}>{entry.bookTitle}</h3>
                            <p style={{ fontSize: 12 }}>
                              {sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {' '}at {sessionDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--ion-color-medium)' }}>
                              {durationMin > 0 ? `${formatMinutes(entry.duration)}` : '<1m'}
                              {entry.pagesRead > 0 ? ` · ${entry.pagesRead} pages` : ''}
                            </p>
                          </IonLabel>
                        </IonItem>
                      );
                    })}
                  </IonList>
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
