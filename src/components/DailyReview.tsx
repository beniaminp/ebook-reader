import React, { useState, useEffect, useCallback } from 'react';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonProgressBar,
} from '@ionic/react';
import {
  checkmarkCircleOutline,
  bookOutline,
  refreshOutline,
} from 'ionicons/icons';
import {
  getCardsForReview,
  rateCard,
  getReviewStats,
  type ReviewCard,
  type ReviewRating,
} from '../services/spacedRepetitionService';
import './DailyReview.css';

const DailyReview: React.FC = () => {
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [totalReviewed, setTotalReviewed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [totalDue, setTotalDue] = useState(0);

  const loadCards = useCallback(() => {
    const due = getCardsForReview();
    const stats = getReviewStats();
    setCards(due);
    setTotalDue(due.length + stats.reviewed);
    setTotalReviewed(stats.reviewed);
    setCurrentIndex(0);
    setRevealed(false);
    setFinished(due.length === 0 && stats.reviewed > 0);
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const currentCard = cards[currentIndex] ?? null;
  const progress =
    totalDue > 0 ? (totalReviewed + currentIndex) / totalDue : 0;

  const handleRate = (rating: ReviewRating) => {
    if (!currentCard) return;

    rateCard(currentCard.highlightId, rating);
    setRevealed(false);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setTotalReviewed((prev) => prev + currentIndex + 1);
      setFinished(true);
    }
  };

  const handleReveal = () => {
    setRevealed(true);
  };

  // Empty state: no cards at all
  if (cards.length === 0 && !finished) {
    return (
      <div className="daily-review">
        <IonCard className="daily-review__empty-card">
          <IonCardContent className="daily-review__empty-content">
            <IonIcon
              icon={bookOutline}
              className="daily-review__empty-icon"
            />
            <h2 className="daily-review__empty-title">No Reviews Due</h2>
            <p className="daily-review__empty-text">
              Add highlights to your review deck from any book to start
              building your knowledge with spaced repetition.
            </p>
          </IonCardContent>
        </IonCard>
      </div>
    );
  }

  // Finished state: all cards reviewed
  if (finished) {
    const stats = getReviewStats();
    return (
      <div className="daily-review">
        <IonCard className="daily-review__done-card">
          <IonCardContent className="daily-review__done-content">
            <IonIcon
              icon={checkmarkCircleOutline}
              className="daily-review__done-icon"
            />
            <h2 className="daily-review__done-title">All Done!</h2>
            <p className="daily-review__done-text">
              {stats.reviewed} {stats.reviewed === 1 ? 'card' : 'cards'}{' '}
              reviewed today
            </p>
            <IonButton
              fill="outline"
              size="small"
              onClick={loadCards}
              className="daily-review__restart-btn"
            >
              <IonIcon slot="start" icon={refreshOutline} />
              Check Again
            </IonButton>
          </IonCardContent>
        </IonCard>
      </div>
    );
  }

  return (
    <div className="daily-review">
      {/* Progress */}
      <div className="daily-review__progress-row">
        <span className="daily-review__progress-label">
          {currentIndex + 1} of {cards.length}
        </span>
        <IonProgressBar
          value={progress}
          className="daily-review__progress-bar"
        />
      </div>

      {/* Flashcard */}
      <IonCard
        className={`daily-review__card ${revealed ? 'daily-review__card--revealed' : ''}`}
        onClick={!revealed && currentCard?.note ? handleReveal : undefined}
        style={
          {
            '--highlight-accent': currentCard?.color || '#ffd54f',
          } as React.CSSProperties
        }
      >
        <div className="daily-review__accent-bar" />
        <IonCardContent className="daily-review__card-body">
          <blockquote className="daily-review__highlight-text">
            {currentCard?.text}
          </blockquote>

          <div className="daily-review__book-info">
            <IonIcon icon={bookOutline} className="daily-review__book-icon" />
            <div className="daily-review__book-meta">
              <span className="daily-review__book-title">
                {currentCard?.bookTitle}
              </span>
              {currentCard?.author && (
                <span className="daily-review__book-author">
                  {currentCard.author}
                </span>
              )}
            </div>
          </div>

          {/* Note reveal area */}
          {currentCard?.note && (
            <div
              className={`daily-review__note-section ${revealed ? 'daily-review__note-section--visible' : ''}`}
            >
              {!revealed ? (
                <button
                  className="daily-review__reveal-btn"
                  onClick={handleReveal}
                >
                  Tap to reveal note
                </button>
              ) : (
                <div className="daily-review__note">
                  <span className="daily-review__note-label">Your note:</span>
                  <p className="daily-review__note-text">{currentCard.note}</p>
                </div>
              )}
            </div>
          )}
        </IonCardContent>
      </IonCard>

      {/* Rating buttons */}
      <div className="daily-review__rating-row">
        <IonButton
          className="daily-review__rate-btn daily-review__rate-btn--again"
          fill="solid"
          size="small"
          onClick={() => handleRate('again')}
        >
          Again
        </IonButton>
        <IonButton
          className="daily-review__rate-btn daily-review__rate-btn--hard"
          fill="solid"
          size="small"
          onClick={() => handleRate('hard')}
        >
          Hard
        </IonButton>
        <IonButton
          className="daily-review__rate-btn daily-review__rate-btn--good"
          fill="solid"
          size="small"
          onClick={() => handleRate('good')}
        >
          Good
        </IonButton>
        <IonButton
          className="daily-review__rate-btn daily-review__rate-btn--easy"
          fill="solid"
          size="small"
          onClick={() => handleRate('easy')}
        >
          Easy
        </IonButton>
      </div>
    </div>
  );
};

export default DailyReview;
