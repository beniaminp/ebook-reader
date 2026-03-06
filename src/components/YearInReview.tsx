import React from 'react';
import { IonIcon } from '@ionic/react';
import {
  closeOutline,
  shareOutline,
  flameOutline,
  rocketOutline,
  star,
  starHalf,
  starOutline,
} from 'ionicons/icons';
import './YearInReview.css';

interface YearInReviewProps {
  year: number;
  stats: {
    totalBooks: number;
    totalPages: number;
    totalMinutes: number;
    longestStreak: number;
    booksPerMonth: number[]; // 12 elements, jan-dec
    topGenres: Array<{ genre: string; count: number }>;
    topAuthors: Array<{ author: string; count: number }>;
    averageRating: number;
    fastestBook?: { title: string; days: number };
  };
  onClose: () => void;
  onShare: () => void;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  if (hours >= 1000) {
    return `${(hours / 1000).toFixed(1)}k`;
  }
  return hours.toLocaleString();
}

function renderStars(rating: number): React.ReactNode {
  const stars: React.ReactNode[] = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const totalFull = hasHalf ? fullStars : Math.round(rating);

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <IonIcon
          key={i}
          icon={star}
          className="year-in-review__star--filled"
        />
      );
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <IonIcon
          key={i}
          icon={starHalf}
          className="year-in-review__star--half"
        />
      );
    } else if (i < totalFull) {
      stars.push(
        <IonIcon
          key={i}
          icon={star}
          className="year-in-review__star--filled"
        />
      );
    } else {
      stars.push(
        <IonIcon
          key={i}
          icon={starOutline}
          className="year-in-review__star--empty"
        />
      );
    }
  }

  return stars;
}

const YearInReview: React.FC<YearInReviewProps> = ({
  year,
  stats,
  onClose,
  onShare,
}) => {
  const maxBooksInMonth = Math.max(...stats.booksPerMonth, 1);
  const maxGenreCount =
    stats.topGenres.length > 0
      ? Math.max(...stats.topGenres.map((g) => g.count), 1)
      : 1;

  return (
    <div className="year-in-review">
      <button className="year-in-review__close" onClick={onClose}>
        <IonIcon icon={closeOutline} />
      </button>

      <div className="year-in-review__inner">
        {/* Header */}
        <div className="year-in-review__header">
          <h1>{year} Year in Review</h1>
          <p>Your reading journey this year</p>
        </div>

        {/* Total Books - Hero Card */}
        <div className="year-in-review__card year-in-review__card--highlight">
          <p className="year-in-review__card-title">Books Completed</p>
          <p className="year-in-review__big-number">{stats.totalBooks}</p>
          <p className="year-in-review__big-label">
            {stats.totalBooks === 1 ? 'book' : 'books'} read
          </p>
        </div>

        {/* Pages and Hours */}
        <div className="year-in-review__stats-row">
          <div className="year-in-review__stat-item">
            <p className="year-in-review__stat-value">
              {stats.totalPages.toLocaleString()}
            </p>
            <p className="year-in-review__stat-label">Pages</p>
          </div>
          <div className="year-in-review__stat-item">
            <p className="year-in-review__stat-value">
              {formatHours(stats.totalMinutes)}
            </p>
            <p className="year-in-review__stat-label">Hours</p>
          </div>
        </div>

        {/* Reading Streak */}
        <div className="year-in-review__card">
          <p className="year-in-review__card-title">Longest Reading Streak</p>
          <div className="year-in-review__streak-icon">
            <IonIcon icon={flameOutline} />
            <span className="year-in-review__stat-value">
              {stats.longestStreak}
            </span>
          </div>
          <p className="year-in-review__stat-label">
            {stats.longestStreak === 1 ? 'day' : 'days'} in a row
          </p>
        </div>

        {/* Monthly Chart */}
        <div className="year-in-review__card">
          <p className="year-in-review__card-title">Books Per Month</p>
          <div className="year-in-review__chart">
            {stats.booksPerMonth.map((count, index) => {
              const heightPercent = (count / maxBooksInMonth) * 100;
              return (
                <div key={index} className="year-in-review__chart-bar-wrapper">
                  {count > 0 && (
                    <span className="year-in-review__chart-count">{count}</span>
                  )}
                  <div
                    className={`year-in-review__chart-bar ${
                      count === 0 ? 'year-in-review__chart-bar--zero' : ''
                    }`}
                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                  />
                  <span className="year-in-review__chart-label">
                    {MONTH_LABELS[index]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Genres */}
        {stats.topGenres.length > 0 && (
          <div className="year-in-review__card">
            <p className="year-in-review__card-title">Top Genres</p>
            <div className="year-in-review__genre-list">
              {stats.topGenres.map((genre, index) => (
                <div key={index} className="year-in-review__genre-item">
                  <div className="year-in-review__genre-info">
                    <span className="year-in-review__genre-name">
                      {genre.genre}
                    </span>
                    <span className="year-in-review__genre-count">
                      {genre.count} {genre.count === 1 ? 'book' : 'books'}
                    </span>
                  </div>
                  <div className="year-in-review__genre-bar-bg">
                    <div
                      className="year-in-review__genre-bar-fill"
                      style={{
                        width: `${(genre.count / maxGenreCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Authors */}
        {stats.topAuthors.length > 0 && (
          <div className="year-in-review__card">
            <p className="year-in-review__card-title">Top Authors</p>
            <div className="year-in-review__author-list">
              {stats.topAuthors.map((author, index) => (
                <div key={index} className="year-in-review__author-item">
                  <span className="year-in-review__author-rank">
                    {index + 1}
                  </span>
                  <span className="year-in-review__author-name">
                    {author.author}
                  </span>
                  <span className="year-in-review__author-count">
                    {author.count} {author.count === 1 ? 'book' : 'books'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Average Rating */}
        <div className="year-in-review__card">
          <p className="year-in-review__card-title">Average Rating</p>
          <div className="year-in-review__stars">
            {renderStars(stats.averageRating)}
            <span className="year-in-review__rating-value">
              {stats.averageRating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Fastest Book */}
        {stats.fastestBook && (
          <div className="year-in-review__card">
            <p className="year-in-review__card-title">Fastest Read</p>
            <div className="year-in-review__fastest">
              <div className="year-in-review__fastest-icon">
                <IonIcon icon={rocketOutline} />
              </div>
              <div>
                <p className="year-in-review__fastest-title">
                  {stats.fastestBook.title}
                </p>
                <p className="year-in-review__fastest-days">
                  Finished in {stats.fastestBook.days}{' '}
                  {stats.fastestBook.days === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Share Button */}
        <button className="year-in-review__share" onClick={onShare}>
          <IonIcon icon={shareOutline} />
          Share Your Year in Review
        </button>
      </div>
    </div>
  );
};

export default YearInReview;
