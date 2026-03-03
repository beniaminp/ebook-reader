import React, { useEffect, useState } from 'react';
import { IonIcon, IonToast } from '@ionic/react';
import { flameOutline, flame, trophyOutline, timeOutline } from 'ionicons/icons';
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
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress * circumference);

  return (
    <>
      <div className={`streak-card${goalMet ? ' streak-card--completed' : ''}`}>
        {/* Left: Streak info */}
        <div className="streak-card__streak">
          <div className={`streak-card__flame${currentStreak > 0 ? ' streak-card__flame--active' : ''}`}>
            <IonIcon icon={currentStreak > 0 ? flame : flameOutline} />
          </div>
          <div className="streak-card__streak-info">
            <span className="streak-card__streak-count">{currentStreak}</span>
            <span className="streak-card__streak-label">
              day{currentStreak !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Center: Circular progress */}
        <div className="streak-card__progress">
          <svg
            className="streak-card__ring"
            viewBox="0 0 68 68"
            width="68"
            height="68"
          >
            {/* Background circle */}
            <circle
              className="streak-card__ring-bg"
              cx="34"
              cy="34"
              r={radius}
              fill="none"
              strokeWidth="5"
            />
            {/* Progress arc */}
            <circle
              className={`streak-card__ring-fill${goalMet ? ' streak-card__ring-fill--done' : ''}`}
              cx="34"
              cy="34"
              r={radius}
              fill="none"
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 34 34)"
            />
          </svg>
          <div className="streak-card__progress-text">
            {goalMet ? (
              <IonIcon icon={trophyOutline} className="streak-card__check" />
            ) : (
              <span className="streak-card__progress-mins">
                {Math.round(todayMinutes)}
              </span>
            )}
          </div>
        </div>

        {/* Right: Today's stats */}
        <div className="streak-card__details">
          <div className="streak-card__today">
            <IonIcon icon={timeOutline} />
            <span>
              {formatMinutes(todayMinutes)} / {formatMinutes(dailyGoalMinutes)}
            </span>
          </div>
          {longestStreak > 0 && (
            <div className="streak-card__best">
              Best: {longestStreak} day{longestStreak !== 1 ? 's' : ''}
            </div>
          )}
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
