import React, { useEffect, useState } from 'react';
import { IonIcon, IonToast } from '@ionic/react';
import { flameOutline, flame, trophyOutline } from 'ionicons/icons';
import { useReadingGoalsStore } from '../stores/useReadingGoalsStore';
import './ReadingStreakCard.css';

const ReadingStreakCard: React.FC = () => {
  const {
    enabled,
    currentStreak,
    longestStreak,
    dailyGoalMinutes,
    getTodayMinutes,
    getTodayProgress,
    isTodayGoalMet,
    getNewMilestone,
    acknowledgeMilestone,
    checkStreak,
  } = useReadingGoalsStore();

  const [milestoneToast, setMilestoneToast] = useState('');

  // Check streak on mount
  useEffect(() => {
    checkStreak();
  }, [checkStreak]);

  // Check for new milestones
  useEffect(() => {
    const milestone = getNewMilestone();
    if (milestone) {
      setMilestoneToast(`${milestone}-day reading streak! Keep it up!`);
      acknowledgeMilestone(milestone);
    }
  }, [currentStreak, getNewMilestone, acknowledgeMilestone]);

  if (!enabled) return null;

  const todayMinutes = getTodayMinutes();
  const progress = getTodayProgress();
  const goalMet = isTodayGoalMet();

  // Format minutes display
  const formatMinutes = (mins: number): string => {
    if (mins < 1) return '0 min';
    if (mins < 60) return `${Math.round(mins)} min`;
    const hours = Math.floor(mins / 60);
    const remaining = Math.round(mins % 60);
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  // Calculate the circumference and dashoffset for the circular progress ring
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress * circumference);
  const progressPercent = Math.min(Math.round(progress * 100), 100);

  return (
    <>
      <div className={`streak-card${goalMet ? ' streak-card--completed' : ''}`}>
        {/* Left: Circular progress with minutes inside */}
        <div className="streak-card__progress">
          <svg
            className="streak-card__ring"
            viewBox="0 0 44 44"
            width="44"
            height="44"
          >
            <circle
              className="streak-card__ring-bg"
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              strokeWidth="4"
            />
            <circle
              className={`streak-card__ring-fill${goalMet ? ' streak-card__ring-fill--done' : ''}`}
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 22 22)"
            />
          </svg>
          <div className="streak-card__progress-text">
            {goalMet ? (
              <IonIcon icon={trophyOutline} className="streak-card__check" />
            ) : (
              <span className="streak-card__progress-mins">
                {progressPercent}
              </span>
            )}
          </div>
        </div>

        {/* Center: Today's reading info */}
        <div className="streak-card__info">
          <span className="streak-card__today-label">
            {goalMet ? 'Goal reached!' : `${formatMinutes(todayMinutes)} of ${formatMinutes(dailyGoalMinutes)}`}
          </span>
          <span className="streak-card__sub">
            {currentStreak > 0 ? (
              <>
                <IonIcon icon={flame} className="streak-card__flame-icon streak-card__flame-icon--active" />
                {currentStreak} day streak
              </>
            ) : (
              <>
                <IonIcon icon={flameOutline} className="streak-card__flame-icon" />
                Start your streak!
              </>
            )}
            {longestStreak > currentStreak && (
              <span className="streak-card__best"> &middot; Best: {longestStreak}d</span>
            )}
          </span>
        </div>
      </div>

      <IonToast
        isOpen={!!milestoneToast}
        message={milestoneToast}
        duration={4000}
        position="top"
        color="warning"
        onDidDismiss={() => setMilestoneToast('')}
      />
    </>
  );
};

export default ReadingStreakCard;
