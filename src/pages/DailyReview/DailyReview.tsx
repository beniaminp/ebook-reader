/**
 * Daily Review Page
 *
 * Wrapper page for the spaced repetition daily review of highlights.
 */

import React from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import DailyReviewComponent from '../../components/DailyReview';

const DailyReview: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/statistics" />
          </IonButtons>
          <IonTitle>Daily Review</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <DailyReviewComponent />
      </IonContent>
    </IonPage>
  );
};

export default DailyReview;
