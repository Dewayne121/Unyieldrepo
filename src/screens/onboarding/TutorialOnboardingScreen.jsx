import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SKINS } from '../../constants/colors';
import { useOnboarding } from '../../context/OnboardingContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TUTORIAL_SLIDES = [
  {
    id: '1',
    title: 'Log Your Workouts',
    subtitle: 'Earn points for every rep',
    description: 'Tap the center + button to log your workout. Choose from various exercises and earn points based on intensity, reps, and weight.',
    icon: 'add-circle-outline',
      iconColor: '#EF4444',
    },
  {
    id: '2',
    title: 'Track Your Progress',
    subtitle: 'Watch yourself improve',
    description: 'View your activity history, track your streak, and monitor your XP gain over time on the Base tab.',
    icon: 'stats-chart-outline',
    iconColor: '#3B82F6',
  },
  {
    id: '3',
    title: 'Climb the Ranks',
    subtitle: 'Compete in your region',
    description: 'Check the Leagues tab to see where you rank. Compete locally or go global for the ultimate challenge.',
    icon: 'trophy-outline',
    iconColor: '#F59E0B',
  },
  {
    id: '4',
    title: 'Earn Exclusive Hoodies',
    subtitle: 'Unlock rewards',
    description: 'Reach new ranks and earn exclusive digital hoodies. Collect them all and show off your achievements.',
    icon: 'shirt-outline',
    iconColor: '#8B5CF6',
  },
  {
    id: '5',
    title: 'You\'re All Set!',
    subtitle: 'Time to crush it',
    description: 'You now have everything you need to start your journey. Log your first workout and begin your ascent to greatness.',
    icon: 'rocket-outline',
    iconColor: '#10B981',
  },
];

export default function TutorialOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { goToNextStep, completeOnboarding } = useOnboarding();

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const isLastSlide = currentIndex === TUTORIAL_SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      completeOnboardingAndEnter();
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const completeOnboardingAndEnter = async () => {
    await completeOnboarding();
    goToNextStep();
  };

  const handleSkip = () => {
    completeOnboardingAndEnter();
  };

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${item.iconColor}15` }]}>
        <Ionicons name={item.icon} size={70} color={item.iconColor} />
      </View>

      {/* Title */}
      <Text style={[styles.slideTitle, { color: theme.textMain }]}>{item.title}</Text>

      {/* Subtitle */}
      <Text style={[styles.slideSubtitle, { color: theme.primary }]}>{item.subtitle}</Text>

      {/* Description */}
      <Text style={[styles.slideDescription, { color: theme.textMuted }]}>{item.description}</Text>

      {/* Quick Tips for specific slides */}
      {item.id === '1' && (
        <View style={[styles.tipBox, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[styles.tipTitle, { color: theme.textMain }]}>Quick Tip:</Text>
          <Text style={[styles.tipText, { color: theme.textMuted }]}>
            The heavier you lift and the more reps you do, the more points you earn!
          </Text>
        </View>
      )}

      {item.id === '3' && (
        <View style={[styles.tipBox, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[styles.tipTitle, { color: theme.textMain }]}>Regions:</Text>
          <Text style={[styles.tipText, { color: theme.textMuted }]}>
            London, Manchester, Birmingham, Leeds, Glasgow, or Global
          </Text>
        </View>
      )}
    </View>
  );

  const renderDot = (index) => {
    const isActive = index === currentIndex;
    return (
      <View
        key={index}
        style={[
          styles.dot,
          isActive ? styles.dotActive : styles.dotInactive,
          isActive && { backgroundColor: theme.primary },
          !isActive && { backgroundColor: theme.border },
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgDeep }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        {/* Skip Button */}
        {!isLastSlide && (
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipButton}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slides */}
      <View style={styles.slidesContainer}>
        <FlatList
          ref={flatListRef}
          data={TUTORIAL_SLIDES}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40));
            setCurrentIndex(index);
          }}
          contentContainerStyle={styles.slidesContent}
        />
      </View>

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        {TUTORIAL_SLIDES.map((_, index) => renderDot(index))}
      </View>

      {/* Slide Counter */}
      <View style={styles.counterContainer}>
        <Text style={[styles.counterText, { color: theme.textMuted }]}>
          {currentIndex + 1} of {TUTORIAL_SLIDES.length}
        </Text>
      </View>

      {/* CTA Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={[styles.nextButton, { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.nextButtonText, { color: isDark ? theme.bgDeep : '#fff' }]}>
            {isLastSlide ? 'Enter The Arena' : 'Next'}
          </Text>
          {!isLastSlide && (
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isDark ? theme.bgDeep : '#fff'}
            />
          )}
        </TouchableOpacity>

        {/* Swipe Indicator */}
        {!isLastSlide && (
          <View style={styles.swipeIndicator}>
            <View style={[styles.swipeLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.swipeText, { color: theme.textMuted }]}>
              Swipe or tap to continue
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  slidesContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  slidesContent: {
    paddingHorizontal: 20,
  },
  slide: {
    width: SCREEN_WIDTH - 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  slideDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  tipBox: {
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    width: '100%',
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  dotInactive: {
    width: 8,
  },
  counterContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  counterText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 14,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  swipeIndicator: {
    alignItems: 'center',
    marginTop: 16,
  },
  swipeLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  swipeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
