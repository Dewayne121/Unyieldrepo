import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TIERS } from '../constants/tiers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tutorial topics - can be expanded with more topics later
const TUTORIAL_TOPICS = {
  xp: {
    title: 'XP SYSTEM',
    slides: [
      {
        icon: 'trophy',
        title: 'WELCOME TO UNYIELD',
        message: 'Your journey to greatness starts here. Learn how to earn XP and rise through the ranks.',
      },
      {
        icon: 'videocam',
        title: 'EARN XP THROUGH COMPETITION',
        message: 'Submit workout videos through the Compete tab to earn XP.\n\nPersonal logs in the Calendar track training but do not award XP.\n\nVideo verification ensures honest progression.',
      },
      {
        icon: 'analytics',
        title: 'HOW XP IS CALCULATED',
        message: 'XP is based on exercise intensity, reps performed, and weight lifted.\n\nDaily streaks add up to +50 bonus XP per workout.\n\nHarder exercises and heavier weights equal more XP.',
      },
      {
        icon: 'flame',
        title: 'STREAK BONUS',
        message: 'Train consistently to build your streak.\n\nEarn up to +50 bonus XP per competition workout.\n\nMaintain your streak for maximum rewards.',
      },
      {
        icon: 'ribbon',
        title: 'PROGRESSION',
        message: 'BRONZE 0 XP  SILVER 2,000 XP  GOLD 5,000 XP\nPLATINUM 10,000 XP  DIAMOND 25,000 XP\nCHAMPION 50,000 XP  UNYIELD 100,000 XP\n\nEarn XP through competition to climb the ranks.',
      },
      {
        icon: 'checkmark-circle',
        title: 'VERIFICATION',
        message: 'Competition videos are reviewed by admins before XP is awarded.\n\nKeep your submissions honest and accurate.',
      },
    ],
  },
};

const STORAGE_KEY = 'unyield_tutorial_seen_';

/**
 * TutorialModal - Generic tutorial modal system
 * @param {string} topic - Tutorial topic key (e.g., 'xp')
 * @param {boolean} visible - Whether modal is visible
 * @param {function} onClose - Called when tutorial is completed
 */
const TutorialModal = ({ topic = 'xp', visible = false, onClose = () => {} }) => {
  const insets = useSafeAreaInsets();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hasSeen, setHasSeen] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const tutorialData = TUTORIAL_TOPICS[topic] || TUTORIAL_TOPICS.xp;
  const slides = tutorialData.slides;
  const isLastSlide = currentSlide === slides.length - 1;

  useEffect(() => {
    if (visible) {
      // Check if user has seen this tutorial
      AsyncStorage.getItem(STORAGE_KEY + topic).then((seen) => {
        setHasSeen(seen === 'true');
      });

      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      setCurrentSlide(0);
    }
  }, [visible]);

  const handleNext = () => {
    if (isLastSlide) {
      handleClose();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleClose = async () => {
    // Mark as seen
    await AsyncStorage.setItem(STORAGE_KEY + topic, 'true');
    onClose();
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(STORAGE_KEY + topic, 'true');
    onClose();
  };

  if (!slides || slides.length === 0) return null;

  const slide = slides[currentSlide];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              paddingBottom: insets.bottom,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Handle bar for visual cue */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.topicTitle}>{tutorialData.title}</Text>
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>SKIP</Text>
            </TouchableOpacity>
          </View>

          {/* Progress dots */}
          <View style={styles.progressContainer}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentSlide && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          {/* Slide content */}
          {slide.title === 'PROGRESSION' ? (
            // Custom rank progression display
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Ionicons name={slide.icon} size={40} color="#9b2c2c" />
              </View>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <View style={styles.ranksGrid}>
                {TIERS.map((tier) => (
                  <View key={tier.name} style={styles.rankCard}>
                    <Image
                      source={tier.image}
                      style={styles.rankEmblem}
                      resizeMode="contain"
                    />
                    <Text style={[styles.rankName, { color: tier.color }]}>
                      {tier.name}
                    </Text>
                    <Text style={styles.rankXP}>
                      {tier.minPoints.toLocaleString()} XP
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Ionicons name={slide.icon} size={64} color="#9b2c2c" />
              </View>

              <Text style={styles.slideTitle}>{slide.title}</Text>

              <Text style={styles.slideMessage}>{slide.message}</Text>
            </View>
          )}

          {/* Navigation */}
          <View style={styles.navigation}>
            {currentSlide > 0 && (
              <TouchableOpacity
                onPress={handlePrevious}
                style={[styles.navButton, styles.navButtonSecondary]}
              >
                <Text style={styles.navButtonText}>BACK</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleNext}
              style={[
                styles.navButton,
                isLastSlide && styles.navButtonPrimary,
              ]}
            >
              <Text style={[styles.navButtonText, isLastSlide && styles.navButtonTextPrimary]}>
                {isLastSlide ? 'GOT IT' : 'NEXT'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Page indicator */}
          <Text style={styles.pageIndicator}>
            {currentSlide + 1} / {slides.length}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#161616',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#666',
    letterSpacing: 2,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
    justifyContent: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressDotActive: {
    backgroundColor: '#9b2c2c',
    width: 24,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 16,
    minHeight: 280,
    justifyContent: 'flex-start',
    width: '100%',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(155, 44, 44, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  slideMessage: {
    fontSize: 15,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  navigation: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  navButtonSecondary: {
    flex: 0,
    paddingHorizontal: 20,
    minWidth: 100,
  },
  navButtonPrimary: {
    backgroundColor: '#9b2c2c',
    borderColor: '#9b2c2c',
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  navButtonTextPrimary: {
    color: '#fff',
  },
  pageIndicator: {
    fontSize: 11,
    color: '#444',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
  },
  // Rank progression styles
  ranksGrid: {
    flexDirection: 'column',
    gap: 4,
    width: '100%',
    marginTop: 8,
  },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 4,
    paddingHorizontal: 8,
    gap: 8,
  },
  rankEmblem: {
    width: 24,
    height: 24,
  },
  rankName: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rankXP: {
    fontSize: 9,
    fontWeight: '700',
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default TutorialModal;
