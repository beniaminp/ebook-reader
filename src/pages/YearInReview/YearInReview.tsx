/**
 * Year in Review Page
 *
 * Wrapper page that fetches stats and renders the YearInReview component.
 */

import React, { useEffect, useState } from 'react';
import { IonPage, IonContent, IonSpinner } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import YearInReviewComponent from '../../components/YearInReview';
import { databaseService } from '../../services/database';
import { useAppStore } from '../../stores/useAppStore';
import { useReadingGoalsStore } from '../../stores/useReadingGoalsStore';

const YearInReview: React.FC = () => {
  const history = useHistory();
  const books = useAppStore((s) => s.books);
  const { longestStreak } = useReadingGoalsStore();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    loadYearStats();
  }, []);

  const loadYearStats = async () => {
    try {
      const [totals, yearlyStats] = await Promise.all([
        databaseService.getTotalReadingSummary(),
        databaseService.getGlobalReadingStats(365),
      ]);

      // Count books per month
      const booksPerMonth = new Array(12).fill(0);
      books.forEach((book) => {
        if (book.progress >= 0.95 && book.lastRead) {
          const readDate = book.lastRead instanceof Date ? book.lastRead : new Date(book.lastRead);
          if (readDate.getFullYear() === year) {
            booksPerMonth[readDate.getMonth()]++;
          }
        }
      });

      // Top genres
      const genreMap = new Map<string, number>();
      books.forEach((book) => {
        const genre = book.genre || book.metadata?.genre;
        if (genre) genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
      });
      const topGenres = Array.from(genreMap.entries())
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Top authors
      const authorMap = new Map<string, number>();
      books.forEach((book) => {
        if (book.author && book.author !== 'Unknown') {
          authorMap.set(book.author, (authorMap.get(book.author) || 0) + 1);
        }
      });
      const topAuthors = Array.from(authorMap.entries())
        .map(([author, count]) => ({ author, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Average rating
      const ratedBooks = books.filter((b) => b.metadata?.rating && b.metadata.rating > 0);
      const averageRating = ratedBooks.length > 0
        ? ratedBooks.reduce((sum, b) => sum + (b.metadata?.rating || 0), 0) / ratedBooks.length
        : 0;

      setStats({
        totalBooks: totals.totalBooksRead,
        totalPages: totals.totalPagesRead,
        totalMinutes: Math.round(totals.totalTimeSpent / 60),
        longestStreak,
        booksPerMonth,
        topGenres,
        topAuthors,
        averageRating,
      });
    } catch (err) {
      console.error('Error loading year stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `My ${year} Reading Year in Review`,
        text: `I read ${stats?.totalBooks || 0} books and ${stats?.totalPages || 0} pages in ${year}!`,
      });
    }
  };

  if (isLoading) {
    return (
      <IonPage>
        <IonContent>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!stats) {
    return (
      <IonPage>
        <IonContent>
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ion-color-medium)' }}>
            No reading data available.
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <YearInReviewComponent
      year={year}
      stats={stats}
      onClose={() => history.goBack()}
      onShare={handleShare}
    />
  );
};

export default YearInReview;
