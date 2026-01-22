import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SKINS } from '../../constants/colors';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingContainer } from '../../components/onboarding/OnboardingContainer';

export default function SignUpOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { updateData, onboardingData, goToNextStep, goToPreviousStep } = useOnboarding();

  const [mode, setMode] = useState('signup'); // 'signup' or 'signin'
  const [email, setEmail] = useState(onboardingData.email || '');
  const [username, setUsername] = useState(onboardingData.username || '');
  const [password, setPassword] = useState(onboardingData.password || '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle'); // 'idle', 'checking', 'available', 'taken'

  // Email validation
  const [emailError, setEmailError] = useState('');
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password strength
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { strength: 1, label: 'Weak', color: '#EF4444' };
    if (score <= 2) return { strength: 2, label: 'Fair', color: '#F59E0B' };
    if (score <= 3) return { strength: 3, label: 'Good', color: '#3B82F6' };
    return { strength: 4, label: 'Strong', color: '#10B981' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Validate form
  const isFormValid = () => {
    if (!isValidEmail(email)) return false;
    if (password.length < 8) return false;
    if (mode === 'signup') {
      if (username.length < 3 || username.length > 20) return false;
      if (password !== confirmPassword) return false;
    }
    return true;
  };

  const handleNext = async () => {
    setError('');
    setEmailError('');

    // Validate email
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Validate password
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    // Validate username for signup
    if (mode === 'signup') {
      if (username.length < 3 || username.length > 20) {
        setError('Username must be 3-20 characters');
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError('Username can only contain letters, numbers, and underscores');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Check username availability
      setIsCheckingUsername(true);
      setUsernameStatus('checking');
      // In a real app, you'd check with the API here
      setIsCheckingUsername(false);
      setUsernameStatus('available');
    }

    // Save data and continue
    await updateData({
      email,
      username: mode === 'signup' ? username : '',
      password,
    });

    goToNextStep();
  };

  const handleContinueWithoutAccount = () => {
    updateData({ email: '', username: '', password: '' });
    goToNextStep();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bgDeep }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
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
          <Text style={[styles.title, { color: theme.textMain }]}>
            {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {mode === 'signup'
              ? 'Join thousands of athletes competing daily'
              : 'Sign in to continue your journey'}
          </Text>
        </View>
      </View>

      {/* Mode Toggle */}
      <View style={[styles.modeToggle, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            mode === 'signin' && [styles.modeButtonActive, { backgroundColor: theme.primary }],
          ]}
          onPress={() => setMode('signin')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.modeButtonText,
              mode === 'signin' && { color: isDark ? theme.bgDeep : '#fff' },
              mode === 'signup' && { color: theme.textMuted },
            ]}
          >
            Sign In
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            mode === 'signup' && [styles.modeButtonActive, { backgroundColor: theme.primary }],
          ]}
          onPress={() => setMode('signup')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.modeButtonText,
              mode === 'signup' && { color: isDark ? theme.bgDeep : '#fff' },
              mode === 'signin' && { color: theme.textMuted },
            ]}
          >
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      <View style={[styles.form, { paddingBottom: insets.bottom + 20 }]}>
        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textMain }]}>Email</Text>
          <View
            style={[
              styles.inputWrapper,
              { borderColor: emailError ? theme.danger : theme.border },
              emailError && styles.inputWrapperError,
            ]}
          >
            <Ionicons name="mail-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textMain }]}
              placeholder="your@email.com"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />
            {email.length > 0 && (
              <Ionicons
                name={isValidEmail(email) ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={isValidEmail(email) ? '#10B981' : theme.danger}
              />
            )}
          </View>
          {emailError ? <Text style={[styles.errorText, { color: theme.danger }]}>{emailError}</Text> : null}
        </View>

        {/* Username Input (Signup only) */}
        {mode === 'signup' && (
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMain }]}>Username</Text>
            <View
              style={[
                styles.inputWrapper,
                { borderColor: theme.border },
              ]}
            >
              <Ionicons name="at-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.textMain }]}
                placeholder="username"
                placeholderTextColor={theme.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                textContentType="username"
                autoComplete="username"
                maxLength={20}
              />
              {isCheckingUsername && (
                <ActivityIndicator size="small" color={theme.primary} />
              )}
              {!isCheckingUsername && username.length > 0 && (
                <Ionicons
                  name={usernameStatus === 'available' ? 'checkmark-circle' : 'help-circle'}
                  size={20}
                  color={usernameStatus === 'available' ? '#10B981' : theme.textMuted}
                />
              )}
            </View>
            <Text style={[styles.hintText, { color: theme.textMuted }]}>
              3-20 characters, letters, numbers, underscores only
            </Text>
          </View>
        )}

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textMain }]}>Password</Text>
          <View
            style={[
              styles.inputWrapper,
              { borderColor: theme.border },
            ]}
          >
            <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textMain }]}
              placeholder="At least 8 characters"
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              autoComplete={mode === 'signup' ? 'password-new' : 'password'}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={theme.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Password Strength Indicator */}
          {mode === 'signup' && password.length > 0 && (
            <View style={styles.passwordStrengthContainer}>
              <View style={styles.passwordStrengthBar}>
                {[1, 2, 3, 4].map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.strengthSegment,
                      {
                        backgroundColor:
                          level <= passwordStrength.strength
                            ? passwordStrength.color
                            : theme.border,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                Password strength: {passwordStrength.label}
              </Text>
            </View>
          )}

          {/* Password Requirements */}
          {mode === 'signup' && (
            <View style={styles.requirements}>
              <Text style={[styles.requirementText, { color: theme.textMuted }]}>
                {password.length >= 8 ? (
                  <Ionicons name="checkmark" size={14} color="#10B981" />
                ) : (
                  <Ionicons name="ellipse-outline" size={14} color={theme.textMuted} />
                )}{' '}
                At least 8 characters
              </Text>
            </View>
          )}
        </View>

        {/* Confirm Password (Signup only) */}
        {mode === 'signup' && (
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textMain }]}>Confirm Password</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor:
                    confirmPassword && password !== confirmPassword
                      ? theme.danger
                      : theme.border,
                },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.textMain }]}
                placeholder="Confirm your password"
                placeholderTextColor={theme.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                textContentType="newPassword"
              />
              {confirmPassword.length > 0 && (
                <Ionicons
                  name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={password === confirmPassword ? '#10B981' : theme.danger}
                />
              )}
            </View>
          </View>
        )}

        {/* Error Message */}
        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: `${theme.danger}15` }]}>
            <Ionicons name="warning-outline" size={16} color={theme.danger} />
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          </View>
        ) : null}

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={!isFormValid() || isCheckingUsername}
          activeOpacity={0.85}
          style={[
            styles.continueButton,
            { backgroundColor: theme.primary },
            (!isFormValid() || isCheckingUsername) && styles.continueButtonDisabled,
          ]}
        >
          {isCheckingUsername ? (
            <ActivityIndicator color={isDark ? theme.bgDeep : '#fff'} />
          ) : (
            <Text style={[styles.continueButtonText, { color: isDark ? theme.bgDeep : '#fff' }]}>
              Continue
            </Text>
          )}
        </TouchableOpacity>

        {/* Skip Option */}
        <TouchableOpacity
          onPress={handleContinueWithoutAccount}
          style={styles.skipButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipButtonText, { color: theme.textMuted }]}>
            Continue without account (Demo mode)
          </Text>
        </TouchableOpacity>

        {/* Social Auth Placeholder */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textMuted }]}>Or continue with</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#fff', borderColor: theme.border }]}
            activeOpacity={0.8}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#000', borderColor: theme.border }]}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-apple" size={20} color="#fff" />
            <Text style={[styles.socialButtonText, { color: '#fff' }]}>Apple</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  modeToggle: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  inputWrapperError: {
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  eyeButton: {
    padding: 4,
  },
  hintText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  passwordStrengthContainer: {
    marginTop: 8,
  },
  passwordStrengthBar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirements: {
    marginTop: 8,
    gap: 4,
  },
  requirementText: {
    fontSize: 13,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
