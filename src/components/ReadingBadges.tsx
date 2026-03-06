import React from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonProgressBar } from '@ionic/react';
import type { EarnedBadge } from '../services/badgesService';
import './ReadingBadges.css';

interface ReadingBadgesProps {
  badges: EarnedBadge[];
}

const ReadingBadges: React.FC<ReadingBadgesProps> = ({ badges }) => {
  const earned = badges.filter((b) => b.progress >= 1);
  const inProgress = badges.filter((b) => b.progress < 1);

  const formatDate = (date: Date): string => {
    if (date.getTime() === 0) return '';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatProgress = (badge: EarnedBadge): string => {
    const pct = Math.round(badge.progress * 100);
    return `${pct}%`;
  };

  return (
    <div className="reading-badges">
      {/* ─── Earned Badges ─────────────────────────────── */}
      {earned.length > 0 && (
        <IonCard className="reading-badges__section">
          <IonCardHeader>
            <IonCardTitle className="reading-badges__section-title">
              Earned
            </IonCardTitle>
          </IonCardHeader>
          <div className="reading-badges__grid">
            {earned.map((badge) => (
              <div key={badge.id} className="reading-badges__item reading-badges__item--earned">
                <span className="reading-badges__icon">{badge.icon}</span>
                <span className="reading-badges__name">{badge.name}</span>
                <span className="reading-badges__date">{formatDate(badge.earnedAt)}</span>
              </div>
            ))}
          </div>
        </IonCard>
      )}

      {/* ─── In Progress ──────────────────────────────── */}
      {inProgress.length > 0 && (
        <IonCard className="reading-badges__section">
          <IonCardHeader>
            <IonCardTitle className="reading-badges__section-title">
              In Progress
            </IonCardTitle>
          </IonCardHeader>
          <div className="reading-badges__grid">
            {inProgress.map((badge) => (
              <div key={badge.id} className="reading-badges__item reading-badges__item--locked">
                <span className="reading-badges__icon">{badge.icon}</span>
                <span className="reading-badges__name">{badge.name}</span>
                <span className="reading-badges__progress-label">{formatProgress(badge)}</span>
                <IonProgressBar
                  value={badge.progress}
                  className="reading-badges__progress-bar"
                />
              </div>
            ))}
          </div>
        </IonCard>
      )}

      {badges.length === 0 && (
        <IonCard className="reading-badges__section">
          <IonCardHeader>
            <IonCardTitle className="reading-badges__section-title">
              No badges yet
            </IonCardTitle>
          </IonCardHeader>
          <p className="reading-badges__empty">
            Start reading to earn your first badge!
          </p>
        </IonCard>
      )}
    </div>
  );
};

export default ReadingBadges;
