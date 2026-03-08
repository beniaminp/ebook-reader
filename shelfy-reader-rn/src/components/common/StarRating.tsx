import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface StarRatingProps {
  rating: number; // 0-5, supports half stars (e.g. 3.5)
  onRate?: (rating: number) => void;
  size?: number;
  color?: string;
}

export function StarRating({ rating, onRate, size = 20, color }: StarRatingProps) {
  const { theme } = useTheme();
  const starColor = color ?? theme.warning;
  const emptyColor = theme.textMuted;

  const stars: Array<'star' | 'star-half' | 'star-outline'> = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push('star');
    } else if (rating >= i - 0.5) {
      stars.push('star-half');
    } else {
      stars.push('star-outline');
    }
  }

  return (
    <View style={styles.container}>
      {stars.map((icon, index) => {
        const starValue = index + 1;
        const isFilled = icon !== 'star-outline';

        if (onRate) {
          return (
            <Pressable
              key={index}
              onPress={() => onRate(starValue)}
              hitSlop={4}
              style={styles.starButton}
            >
              <Ionicons
                name={icon}
                size={size}
                color={isFilled ? starColor : emptyColor}
              />
            </Pressable>
          );
        }

        return (
          <Ionicons
            key={index}
            name={icon}
            size={size}
            color={isFilled ? starColor : emptyColor}
            style={styles.starIcon}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    paddingHorizontal: 2,
  },
  starIcon: {
    marginHorizontal: 2,
  },
});

export default StarRating;
