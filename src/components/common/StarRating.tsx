import React from 'react';
import { IonIcon } from '@ionic/react';
import { star, starOutline } from 'ionicons/icons';

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  size?: 'small' | 'medium' | number;
  gap?: string;
  readOnly?: boolean;
}

const sizeMap: Record<string, number> = {
  small: 14,
  medium: 36,
};

const StarRating: React.FC<StarRatingProps> = ({ rating, onRate, size = 'small', gap, readOnly = false }) => {
  const fontSize = typeof size === 'number' ? size : sizeMap[size];
  const defaultGap = size === 'medium' ? '8px' : '1px';

  return (
    <div
      className="star-rating"
      style={{ display: 'flex', gap: gap ?? defaultGap }}
      onClick={(e) => e.stopPropagation()}
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <IonIcon
          key={s}
          icon={s <= rating ? star : starOutline}
          style={{
            fontSize: `${fontSize}px`,
            color: s <= rating ? '#f5a623' : 'var(--ion-color-medium)',
            cursor: readOnly || !onRate ? 'default' : 'pointer',
          }}
          onClick={
            readOnly || !onRate
              ? undefined
              : (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onRate(s === rating ? 0 : s);
                }
          }
        />
      ))}
    </div>
  );
};

export default StarRating;
