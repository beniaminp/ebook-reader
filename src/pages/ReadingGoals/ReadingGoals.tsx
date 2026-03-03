import React, { useState, useMemo } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonItem,
  IonLabel,
  IonToggle,
  IonRange,
  IonNote,
  IonIcon,
  IonAlert,
  IonButton,
} from '@ionic/react';
import {
  flameOutline,
  bookOutline,
  timeOutline,
  calendarOutline,
  trophyOutline,
  chevronBackOutline,
  chevronForwardOutline,
  trashOutline,
} from 'ionicons/icons';
import { useReadingGoalsStore } from '../../stores/useReadingGoalsStore';
import type { DailyRecord } from '../../stores/useReadingGoalsStore';
import './ReadingGoals.css';

/** Milestone streak counts */
const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatMinutes(minutes: number): string {
  if (minutes < 1) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** SVG progress ring component */
const ProgressRing: React.FC<{
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
}> = ({ progress, size = 120, strokeWidth = 8, color = 'var(--ion-color-primary)', bgColor = 'var(--ion-color-light, #f0f0f0)', children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div className="progress-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="progress-ring-center">
        {children}
      </div>
    </div>
  );
};

const ReadingGoals: React.FC = () => {
  const {
    enabled,
    dailyGoalMinutes,
    currentStreak,
    longestStreak,
    yearlyGoalEnabled,
    setEnabled,
    setDailyGoal,
    resetStreak,
    setYearlyGoalEnabled,
    setYearlyBookTarget,
    removeFinishedBook,
    getTodayMinutes,
    getTodayProgress,
    isTodayGoalMet,
    getWeekRecords,
    getMonthRecords,
    getYearlyGoalData,
    getYearlyProgress,
    getDaysWithGoalMet,
    getTotalMinutesThisWeek,
  } = useReadingGoalsStore();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const todayMinutes = getTodayMinutes();
  const todayProgress = getTodayProgress();
  const todayGoalMet = isTodayGoalMet();
  const weekRecords = getWeekRecords();
  const weekMinutes = getTotalMinutesThisWeek();
  const daysMetThisMonth = getDaysWithGoalMet(30);

  const thisYear = new Date().getFullYear();
  const yearlyData = getYearlyGoalData(thisYear);
  const yearlyProgress = getYearlyProgress(thisYear);

  // Calendar data
  const monthRecords = useMemo(
    () => getMonthRecords(calendarYear, calendarMonth),
    [calendarYear, calendarMonth, getMonthRecords]
  );

  const calendarStartDay = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay();
    // Convert Sunday=0 to Monday-based: Mon=0, Tue=1, ..., Sun=6
    return firstDay === 0 ? 6 : firstDay - 1;
  }, [calendarYear, calendarMonth]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const navigateCalendar = (direction: number) => {
    let newMonth = calendarMonth + direction;
    let newYear = calendarYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
  };

  return (
    <IonPage className="reading-goals-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Reading Goals</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* ─── Streak Hero ───────────────────────────── */}
        {enabled && (
          <div className="goals-section">
            <div className="streak-hero">
              <div className="streak-flame">
                {currentStreak > 0 ? '\uD83D\uDD25' : '\u2744\uFE0F'}
              </div>
              <div className="streak-count">{currentStreak}</div>
              <div className="streak-label">
                day{currentStreak !== 1 ? 's' : ''} streak
              </div>
              {longestStreak > 0 && (
                <div className="streak-best">
                  Best: {longestStreak} day{longestStreak !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Today's Progress ──────────────────────── */}
        {enabled && (
          <div className="goals-section">
            <div className="goals-section-header">
              <div className="goals-section-icon goals-section-icon--clock">
                <IonIcon icon={timeOutline} />
              </div>
              <span className="goals-section-title">Today's Progress</span>
            </div>
            <div className="goals-section-body">
              <ProgressRing
                progress={todayProgress}
                size={140}
                strokeWidth={10}
                color={todayGoalMet ? '#43a047' : 'var(--ion-color-primary)'}
              >
                <div className="progress-ring-value">
                  {formatMinutes(todayMinutes)}
                </div>
                <div className="progress-ring-sublabel">
                  of {dailyGoalMinutes}m goal
                </div>
              </ProgressRing>

              <div className="daily-goal-stats">
                <div className="daily-goal-stat">
                  <div className="daily-goal-stat-value">{formatMinutes(weekMinutes)}</div>
                  <div className="daily-goal-stat-label">This Week</div>
                </div>
                <div className="daily-goal-stat">
                  <div className="daily-goal-stat-value">{daysMetThisMonth}</div>
                  <div className="daily-goal-stat-label">Days Met (30d)</div>
                </div>
                <div className="daily-goal-stat">
                  <div className="daily-goal-stat-value">
                    {todayGoalMet ? 'Done' : `${Math.max(0, Math.round(dailyGoalMinutes - todayMinutes))}m`}
                  </div>
                  <div className="daily-goal-stat-label">
                    {todayGoalMet ? 'Goal Met!' : 'Remaining'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Weekly Overview ───────────────────────── */}
        {enabled && (
          <div className="goals-section">
            <div className="goals-section-header">
              <div className="goals-section-icon goals-section-icon--calendar">
                <IonIcon icon={calendarOutline} />
              </div>
              <span className="goals-section-title">This Week</span>
            </div>
            <div className="goals-section-body">
              <div className="weekly-bars">
                {weekRecords.map((entry, i) => {
                  const record: DailyRecord | null = entry.record;
                  const mins = record?.minutes || 0;
                  const fillPercent = dailyGoalMinutes > 0
                    ? Math.min(100, (mins / dailyGoalMinutes) * 100)
                    : 0;
                  const isToday = entry.date === todayStr;
                  const barClass = record?.goalMet
                    ? 'weekly-bar-fill weekly-bar-fill--met'
                    : mins > 0
                      ? 'weekly-bar-fill weekly-bar-fill--partial'
                      : 'weekly-bar-fill weekly-bar-fill--none';

                  return (
                    <div key={entry.date} className="weekly-bar-item">
                      <div className="weekly-bar-track">
                        <div
                          className={barClass}
                          style={{ height: `${Math.max(mins > 0 ? 4 : 0, fillPercent)}%` }}
                        />
                      </div>
                      <span className={`weekly-bar-day${isToday ? ' weekly-bar-day--today' : ''}`}>
                        {DAY_LABELS[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Streak Calendar ───────────────────────── */}
        {enabled && (
          <div className="goals-section">
            <div className="goals-section-header">
              <div className="goals-section-icon goals-section-icon--flame">
                <IonIcon icon={flameOutline} />
              </div>
              <span className="goals-section-title">Streak Calendar</span>
            </div>
            <div className="goals-section-body">
              <div className="streak-calendar">
                <div className="streak-calendar-header">
                  <span className="streak-calendar-month">
                    {MONTH_NAMES[calendarMonth - 1]} {calendarYear}
                  </span>
                  <div className="streak-calendar-nav">
                    <button onClick={() => navigateCalendar(-1)}>
                      <IonIcon icon={chevronBackOutline} />
                    </button>
                    <button onClick={() => navigateCalendar(1)}>
                      <IonIcon icon={chevronForwardOutline} />
                    </button>
                  </div>
                </div>

                <div className="streak-calendar-weekdays">
                  {DAY_LABELS.map((d) => (
                    <span key={d} className="streak-calendar-weekday">{d}</span>
                  ))}
                </div>

                <div className="streak-calendar-days">
                  {/* Empty cells for offset */}
                  {Array.from({ length: calendarStartDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="streak-calendar-day streak-calendar-day--empty" />
                  ))}

                  {monthRecords.map((entry) => {
                    const dayNum = parseInt(entry.date.split('-')[2], 10);
                    const isFuture = entry.date > todayStr;
                    const isToday = entry.date === todayStr;
                    const record = entry.record;

                    let dayClass = 'streak-calendar-day';
                    if (isFuture) {
                      dayClass += ' streak-calendar-day--future';
                    } else if (record?.goalMet) {
                      dayClass += ' streak-calendar-day--met';
                    } else if (record && record.minutes > 0) {
                      dayClass += ' streak-calendar-day--partial';
                    } else if (!isFuture) {
                      dayClass += ' streak-calendar-day--missed';
                    }
                    if (isToday) {
                      dayClass += ' streak-calendar-day--today';
                    }

                    return (
                      <div key={entry.date} className={dayClass}>
                        {dayNum}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Milestones ────────────────────────────── */}
        {enabled && (
          <div className="goals-section">
            <div className="goals-section-header">
              <div className="goals-section-icon goals-section-icon--trophy">
                <IonIcon icon={trophyOutline} />
              </div>
              <span className="goals-section-title">Milestones</span>
            </div>
            <div className="goals-section-body">
              <div className="milestones-grid">
                {MILESTONES.map((m) => {
                  const achieved = longestStreak >= m;
                  const isActive = currentStreak >= m && longestStreak >= m;
                  let badgeClass = 'milestone-badge';
                  if (isActive) badgeClass += ' milestone-badge--active';
                  else if (achieved) badgeClass += ' milestone-badge--achieved';

                  return (
                    <div key={m} className={badgeClass}>
                      <span className="milestone-badge-icon">
                        {achieved ? '\uD83C\uDFC6' : '\uD83D\uDD12'}
                      </span>
                      <span className="milestone-badge-label">
                        {m}d
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Yearly Book Goal ──────────────────────── */}
        {yearlyGoalEnabled && (
          <div className="goals-section">
            <div className="goals-section-header">
              <div className="goals-section-icon goals-section-icon--book">
                <IonIcon icon={bookOutline} />
              </div>
              <span className="goals-section-title">{thisYear} Reading Challenge</span>
            </div>
            <div className="goals-section-body">
              <div className="yearly-goal-display">
                <ProgressRing
                  progress={yearlyProgress}
                  size={130}
                  strokeWidth={10}
                  color={yearlyProgress >= 1 ? '#43a047' : 'var(--ion-color-primary)'}
                >
                  <div className="progress-ring-value">
                    {yearlyData.booksFinished.length}
                  </div>
                  <div className="progress-ring-sublabel">
                    of {yearlyData.targetBooks} books
                  </div>
                </ProgressRing>

                <div className="yearly-goal-label">
                  {yearlyProgress >= 1
                    ? 'Challenge complete! Keep reading!'
                    : `${yearlyData.targetBooks - yearlyData.booksFinished.length} books to go`}
                </div>

                <div className="yearly-goal-progress-bar">
                  <div
                    className="yearly-goal-progress-fill"
                    style={{ width: `${Math.min(100, yearlyProgress * 100)}%` }}
                  />
                </div>
              </div>

              {yearlyData.booksFinished.length > 0 && (
                <div className="yearly-book-list">
                  {yearlyData.booksFinished.map((book, index) => (
                    <div key={book.bookId} className="yearly-book-entry">
                      <span className="yearly-book-title">
                        {index + 1}. {book.title}
                      </span>
                      <span className="yearly-book-date">
                        {new Date(book.finishedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Goal Settings ─────────────────────────── */}
        <div className="goals-section">
          <div className="goals-section-header">
            <div className="goals-section-icon goals-section-icon--flame">
              <IonIcon icon={flameOutline} />
            </div>
            <span className="goals-section-title">Goal Settings</span>
          </div>

          <IonItem>
            <IonLabel>
              <h3>Daily Reading Streaks</h3>
              <IonNote>Track consecutive days of reading</IonNote>
            </IonLabel>
            <IonToggle
              checked={enabled}
              onIonChange={(e) => setEnabled(e.detail.checked)}
            />
          </IonItem>

          {enabled && (
            <IonItem>
              <IonLabel>Daily Goal</IonLabel>
              <div className="goals-range-row" slot="end" style={{ width: '55%' }}>
                <IonRange
                  min={5}
                  max={120}
                  step={5}
                  value={dailyGoalMinutes}
                  onIonChange={(e) => setDailyGoal(e.detail.value as number)}
                />
                <span className="goals-range-value">{dailyGoalMinutes}m</span>
              </div>
            </IonItem>
          )}

          <IonItem>
            <IonLabel>
              <h3>Yearly Book Goal</h3>
              <IonNote>Set a book count target for the year</IonNote>
            </IonLabel>
            <IonToggle
              checked={yearlyGoalEnabled}
              onIonChange={(e) => setYearlyGoalEnabled(e.detail.checked)}
            />
          </IonItem>

          {yearlyGoalEnabled && (
            <IonItem>
              <IonLabel>{thisYear} Target</IonLabel>
              <div className="goals-range-row" slot="end" style={{ width: '55%' }}>
                <IonRange
                  min={1}
                  max={100}
                  step={1}
                  value={yearlyData.targetBooks}
                  onIonChange={(e) => setYearlyBookTarget(thisYear, e.detail.value as number)}
                />
                <span className="goals-range-value">{yearlyData.targetBooks}</span>
              </div>
            </IonItem>
          )}

          {enabled && (
            <IonItem>
              <IonLabel>
                <IonButton
                  fill="outline"
                  size="small"
                  color="danger"
                  onClick={() => setShowResetConfirm(true)}
                  style={{ '--border-radius': '8px' }}
                >
                  <IonIcon icon={trashOutline} slot="start" />
                  Reset All Streak Data
                </IonButton>
              </IonLabel>
            </IonItem>
          )}
        </div>

        <div style={{ height: '32px' }} />

        <IonAlert
          isOpen={showResetConfirm}
          onDidDismiss={() => setShowResetConfirm(false)}
          header="Reset Streak Data"
          message="This will reset your current streak, longest streak, and all daily reading records. This cannot be undone."
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Reset',
              role: 'destructive',
              handler: () => resetStreak(),
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default ReadingGoals;
