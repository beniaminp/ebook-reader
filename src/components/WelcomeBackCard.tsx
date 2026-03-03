import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IonIcon, IonButton } from '@ionic/react';
import { bookOutline, closeOutline, arrowForwardOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import type { Book } from '../types/index';
import { databaseService } from '../services/database';
import './WelcomeBackCard.css';

/** Threshold in milliseconds for showing the welcome back prompt (24 hours) */
const BREAK_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** localStorage key for tracking when the welcome back card was last dismissed */
const LAST_DISMISS_KEY = 'ebook_welcome_back_dismissed_at';
/** localStorage key for tracking last app visit */
const LAST_VISIT_KEY = 'ebook_last_visit_at';

interface WelcomeBackCardProps {
  books: Book[];
}

const WelcomeBackCard: React.FC<WelcomeBackCardProps> = ({ books }) => {
  const history = useHistory();
  const [dismissed, setDismissed] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [chapterInfo, setChapterInfo] = useState<Record<string, string>>({});

  // Find the most recently read book that is in progress
  const lastReadBook = useMemo(() => {
    const inProgressBooks = books
      .filter((b) => b.progress > 0 && b.progress < 1)
      .sort((a, b) => {
        const aTime = a.lastRead instanceof Date ? a.lastRead.getTime() : 0;
        const bTime = b.lastRead instanceof Date ? b.lastRead.getTime() : 0;
        return bTime - aTime;
      });

    return inProgressBooks[0] || null;
  }, [books]);

  // Determine if we should show the welcome back card
  useEffect(() => {
    const now = Date.now();
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    const lastDismiss = localStorage.getItem(LAST_DISMISS_KEY);

    // Always update last visit time
    localStorage.setItem(LAST_VISIT_KEY, String(now));

    if (!lastReadBook) {
      setShouldShow(false);
      return;
    }

    // Check if user has been away long enough
    if (lastVisit) {
      const timeSinceVisit = now - parseInt(lastVisit, 10);
      if (timeSinceVisit < BREAK_THRESHOLD_MS) {
        setShouldShow(false);
        return;
      }
    } else {
      // First visit ever -- don't show welcome back
      setShouldShow(false);
      return;
    }

    // Check if the card was recently dismissed (within last 2 hours)
    if (lastDismiss) {
      const timeSinceDismiss = now - parseInt(lastDismiss, 10);
      if (timeSinceDismiss < 2 * 60 * 60 * 1000) {
        setShouldShow(false);
        return;
      }
    }

    setShouldShow(true);
  }, [lastReadBook]);

  // Load chapter info for the book
  useEffect(() => {
    if (!lastReadBook) return;

    const loadProgress = async () => {
      try {
        const progress = await databaseService.getReadingProgress(
          lastReadBook.id
        );
        if (progress?.chapterTitle) {
          setChapterInfo((prev) => ({
            ...prev,
            [lastReadBook.id]: progress.chapterTitle!,
          }));
        }
      } catch (err) {
        console.error('Failed to load reading progress for welcome back:', err);
      }
    };

    loadProgress();
  }, [lastReadBook]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(LAST_DISMISS_KEY, String(Date.now()));
  }, []);

  const handleContinueReading = useCallback(() => {
    if (lastReadBook) {
      history.push(`/reader/${lastReadBook.id}`);
    }
  }, [lastReadBook, history]);

  // Format time since last read
  const timeSinceLastRead = useMemo(() => {
    if (!lastReadBook?.lastRead) return '';

    const lastReadTime =
      lastReadBook.lastRead instanceof Date
        ? lastReadBook.lastRead.getTime()
        : 0;
    if (lastReadTime === 0) return '';

    const diffMs = Date.now() - lastReadTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    return 'recently';
  }, [lastReadBook]);

  if (!shouldShow || dismissed || !lastReadBook) {
    return null;
  }

  const chapterTitle = chapterInfo[lastReadBook.id];
  const progressPercent = Math.min(
    100,
    Math.round(lastReadBook.progress * 100)
  );

  return (
    <div className="welcome-back-card">
      <button className="welcome-back-dismiss" onClick={handleDismiss}>
        <IonIcon icon={closeOutline} />
      </button>

      <div className="welcome-back-greeting">
        <h3>Welcome back!</h3>
        <p>You were last reading {timeSinceLastRead}</p>
      </div>

      <div className="welcome-back-book" onClick={handleContinueReading}>
        <div className="welcome-back-cover">
          {lastReadBook.coverPath ? (
            <img src={lastReadBook.coverPath} alt={lastReadBook.title} />
          ) : (
            <div className="welcome-back-cover-placeholder">
              <IonIcon icon={bookOutline} />
            </div>
          )}
        </div>

        <div className="welcome-back-info">
          <h4 className="welcome-back-title">{lastReadBook.title}</h4>
          <p className="welcome-back-author">{lastReadBook.author}</p>

          {chapterTitle && (
            <p className="welcome-back-chapter">{chapterTitle}</p>
          )}

          <div className="welcome-back-progress">
            <div className="welcome-back-progress-bar">
              <div
                className="welcome-back-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="welcome-back-progress-text">
              {progressPercent}%
            </span>
          </div>
        </div>
      </div>

      <IonButton
        expand="block"
        className="welcome-back-button"
        onClick={handleContinueReading}
      >
        Continue Reading
        <IonIcon slot="end" icon={arrowForwardOutline} />
      </IonButton>
    </div>
  );
};

export default WelcomeBackCard;
