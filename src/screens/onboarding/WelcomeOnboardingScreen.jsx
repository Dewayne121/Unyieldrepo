import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  NativeModules,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SKINS } from '../../constants/colors';
import { useOnboarding } from '../../context/OnboardingContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WELCOME_SLIDES = [
  {
    id: '1',
    title: 'Compete. Conquer. Repeat.',
    subtitle: 'Join thousands of athletes pushing their limits every day',
    description: 'UNYIELD is where fitness meets competition. Log workouts, earn points, climb leaderboards, and prove your dedication.',
    icon: 'trophy-outline',
    iconColor: '#F59E0B',
  },
  {
    id: '2',
    title: 'Every Rep Counts',
    subtitle: 'Turn your effort into achievements',
    description: 'Track your progress with precision. From bench press to burpees, every exercise earns you points based on intensity and effort.',
    icon: 'barbell-outline',
    iconColor: '#EF4444',
  },
  {
    id: '3',
    title: 'Rise Through the Ranks',
    subtitle: 'From Initiate to Legend',
    description: 'Start as an Initiate and work your way up through 7 ranks. Compete locally in your region or globally for ultimate glory.',
    icon: 'medal-outline',
    iconColor: '#3B82F6',
  },
  {
    id: '4',
    title: 'Join The Arena',
    subtitle: 'Your journey to greatness starts now',
    description: 'Ready to prove what you\'re made of? Create your account and enter the arena.',
    icon: 'rocket-outline',
    iconColor: '#10B981',
  },
];

export default function WelcomeOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { goToNextStep, startOnboarding } = useOnboarding();

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const isLastSlide = currentIndex === WELCOME_SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      startOnboarding();
      goToNextStep();
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const handleSkip = () => {
    startOnboarding();
    goToNextStep();
  };

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${item.iconColor}15` }]}>
        <Ionicons name={item.icon} size={80} color={item.iconColor} />
      </View>

      {/* Title */}
      <Text style={[styles.slideTitle, { color: theme.textMain }]}>{item.title}</Text>

      {/* Subtitle */}
      <Text style={[styles.slideSubtitle, { color: theme.primary }]}>{item.subtitle}</Text>

      {/* Description */}
      <Text style={[styles.slideDescription, { color: theme.textMuted }]}>{item.description}</Text>
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
      {/* Skip Button */}
      {!isLastSlide && (
        <TouchableOpacity
          onPress={handleSkip}
          style={[styles.skipButton, { paddingTop: insets.top + 20 }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Slides */}
      <View style={styles.slidesContainer}>
        <FlatList
          ref={flatListRef}
          data={WELCOME_SLIDES}
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
        {WELCOME_SLIDES.map((_, index) => renderDot(index))}
      </View>

      {/* CTA Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={[styles.nextButton, { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.nextButtonText, { color: isDark ? theme.bgDeep : '#fff' }]}>
            {isLastSlide ? 'Get Started' : 'Next'}
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
  skipButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
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
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  slideDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
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
