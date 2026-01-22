import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SKINS } from '../../constants/colors';
import { useOnboarding } from '../../context/OnboardingContext';
import { useApp } from '../../context/AppContext';

export default function MetricsOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { updateData, onboardingData, goToNextStep, goToPreviousStep } = useOnboarding();
  const { weightUnit, toggleWeightUnit } = useApp();

  const [weight, setWeight] = useState(onboardingData.startingMetrics?.weight?.toString() || '');
  const [height, setHeight] = useState(onboardingData.startingMetrics?.height?.toString() || '');
  const [age, setAge] = useState(onboardingData.startingMetrics?.age?.toString() || '');

  const isValidWeight = () => !weight || (parseFloat(weight) > 0 && parseFloat(weight) <= (weightUnit === 'kg' ? 300 : 660));
  const isValidHeight = () => !height || (parseInt(height) > 0 && parseInt(height) <= 300);
  const isValidAge = () => !age || (parseInt(age) >= 13 && parseInt(age) <= 100);

  const handleNext = async () => {
    await updateData({
      startingMetrics: {
        weight: weight ? parseFloat(weight) : null,
        weightUnit,
        height: height ? parseInt(height) : null,
        heightUnit: 'cm',
        age: age ? parseInt(age) : null,
      },
    });
    goToNextStep();
  };

  const handleSkip = async () => {
    await updateData({
      startingMetrics: {
        weight: null,
        weightUnit: 'kg',
        height: null,
        heightUnit: 'cm',
        age: null,
      },
      skipMetrics: true,
    });
    goToNextStep();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgDeep }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={goToPreviousStep}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textMain} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.textMain }]}>Starting Metrics</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Optional: Record your starting point
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: `${theme.primary}08`, borderColor: theme.primary }]}>
          <Ionicons name="information-circle-outline" size={22} color={theme.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.textMain }]}>This is completely optional</Text>
            <Text style={[styles.infoText, { color: theme.textMuted }]}>
              Recording your starting metrics helps track your progress over time. You can add these later if you prefer.
            </Text>
          </View>
        </View>

        {/* Weight Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: theme.textMain }]}>Weight</Text>

          <View style={styles.unitToggleContainer}>
            <TouchableOpacity
              onPress={toggleWeightUnit}
              style={[styles.unitToggleButton, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.unitToggleText, { color: theme.textMain }]}>
                {weightUnit === 'kg' ? 'Use KG' : 'Use LBS'}
              </Text>
              <Ionicons name="swap-horizontal" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.inputWrapper,
              {
                borderColor: weight && !isValidWeight() ? theme.danger : theme.border,
                backgroundColor: theme.bgCard,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.textMain }]}
              placeholder={`Enter weight in ${weightUnit.toUpperCase()}`}
              placeholderTextColor={theme.textMuted}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <Text style={[styles.inputSuffix, { color: theme.textMuted }]}>{weightUnit.toUpperCase()}</Text>
          </View>

          {weight && !isValidWeight() && (
            <Text style={[styles.errorText, { color: theme.danger }]}>
              Please enter a valid weight
            </Text>
          )}

          {/* Weight Ranges */}
          <View style={styles.weightRanges}>
            {['50kg', '70kg', '90kg', '110kg'].map((rangeWeight) => {
              const weightInUnit = weightUnit === 'kg' ? parseInt(rangeWeight) : Math.round(parseInt(rangeWeight) * 2.20462);
              return (
                <TouchableOpacity
                  key={rangeWeight}
                  onPress={() => setWeight(weightInUnit.toString())}
                  style={[styles.quickAddButton, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickAddText, { color: theme.textMuted }]}>
                    {weightUnit === 'kg' ? rangeWeight : `${weightInUnit}${weightUnit}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Height Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: theme.textMain }]}>Height</Text>

          <View
            style={[
              styles.inputWrapper,
              {
                borderColor: height && !isValidHeight() ? theme.danger : theme.border,
                backgroundColor: theme.bgCard,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.textMain }]}
              placeholder="Enter height in cm"
              placeholderTextColor={theme.textMuted}
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
              returnKeyType="done"
            />
            <Text style={[styles.inputSuffix, { color: theme.textMuted }]}>CM</Text>
          </View>

          {height && !isValidHeight() && (
            <Text style={[styles.errorText, { color: theme.danger }]}>
              Please enter a valid height (1-300 cm)
            </Text>
          )}
        </View>

        {/* Age Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: theme.textMain }]}>Age</Text>

          <View
            style={[
              styles.inputWrapper,
              {
                borderColor: age && !isValidAge() ? theme.danger : theme.border,
                backgroundColor: theme.bgCard,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.textMain }]}
              placeholder="Enter your age"
              placeholderTextColor={theme.textMuted}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={3}
            />
            <Text style={[styles.inputSuffix, { color: theme.textMuted }]}>years</Text>
          </View>

          {age && !isValidAge() && (
            <Text style={[styles.errorText, { color: theme.danger }]}>
              You must be at least 13 years old
            </Text>
          )}
        </View>

        {/* Privacy Notice */}
        <View style={[styles.privacyCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Ionicons name="lock-closed-outline" size={18} color={theme.primary} />
          <Text style={[styles.privacyText, { color: theme.textMuted }]}>
            Your metrics are private and only visible to you
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip this step</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          disabled={weight && !isValidWeight()}
          activeOpacity={0.85}
          style={[
            styles.continueButton,
            { backgroundColor: theme.primary },
            weight && !isValidWeight() && styles.continueButtonDisabled,
          ]}
        >
          <Text style={[styles.continueButtonText, { color: isDark ? theme.bgDeep : '#fff' }]}>
            Continue
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isDark ? theme.bgDeep : '#fff'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  infoBanner: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  unitToggleContainer: {
    marginBottom: 10,
  },
  unitToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 13,
    marginTop: 8,
  },
  weightRanges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  quickAddButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickAddText: {
    fontSize: 13,
    fontWeight: '500',
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 8,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
