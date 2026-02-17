import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import {
  resetOnboardingForNewUser,
  checkOnboardingAbandoned,
  setRefreshUserCallback,
  ONBOARDING_DATA_KEY,
  ONBOARDING_STEP_KEY,
  ONBOARDING_COMPLETED_KEY,
  AUTH_ONBOARDING_KEY,
} from './StreamlinedOnboardingContext';

const LS_HAS_SEEN_ONBOARDING = 'unyield_seen_onboarding';
const LS_USER_DATA = 'unyield_user_data';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const appState = useRef(AppState.currentState);
  const hasHandledBackground = useRef(false);

  // Initialize app and check for existing user
  useEffect(() => {
    loadUserData();
  }, []);

  // Register refreshUser callback for StreamlinedOnboardingContext
  useEffect(() => {
    setRefreshUserCallback(refreshUser);
    return () => setRefreshUserCallback(null);
  }, []);

  // Auto-delete account if onboarding is abandoned mid-process
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // When app goes to background, check if onboarding was abandoned
      if (nextAppState === 'background' && !hasHandledBackground.current) {
        hasHandledBackground.current = true;

        // Only check if user is authenticated AND still in onboarding flow.
        // This prevents false account deletion when opening share sheets or other
        // OS surfaces from the main app.
        if (user && !onboardingCompleted) {
          const isAbandoned = await checkOnboardingAbandoned();
          console.log('App went to background, checking abandoned onboarding:', { isAbandoned, user: user?.username });

          if (isAbandoned) {
            console.log('Onboarding was abandoned, deleting account...');
            try {
              await api.deleteAccount();
              await resetOnboardingForNewUser();
              await AsyncStorage.removeItem(LS_USER_DATA);
              await AsyncStorage.removeItem(LS_HAS_SEEN_ONBOARDING);
              setUser(null);
              setOnboardingCompleted(false);
              console.log('Account deleted due to abandoned onboarding');
            } catch (error) {
              console.error('Failed to delete abandoned account:', error);
            }
          }
        }

        // Reset flag when app comes back to foreground
        setTimeout(() => {
          hasHandledBackground.current = false;
        }, 1000);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [user, onboardingCompleted]);

  const loadUserData = async () => {
    try {
      // Initialize API (load token from storage)
      await api.init();

      // Clear any stale AsyncStorage data to ensure fresh API data is used
      // This prevents old cached data (without weight/height/age) from persisting
      await AsyncStorage.removeItem(LS_USER_DATA);

      // Try to get current user from API
      const token = await api.getToken();
      if (token) {
        try {
          const response = await api.getMe();
          if (response.success && response.data) {
            console.log('AuthContext: User data from API', {
              weight: response.data.weight,
              height: response.data.height,
              age: response.data.age
            });
            setUser(response.data);
            await AsyncStorage.setItem(LS_USER_DATA, JSON.stringify(response.data));

            // Check if user has already completed onboarding (has name, region, goal)
            // If they have these fields, mark onboarding as complete
            const userData = response.data;
            const hasProfile = userData.name && userData.region && userData.goal;

            // Check BOTH onboarding flags to ensure consistency
            const seenOnboarding = await AsyncStorage.getItem(LS_HAS_SEEN_ONBOARDING);
            const onboardingCompletedFlag = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
            const shouldSkipOnboarding = (seenOnboarding === 'true' && onboardingCompletedFlag === 'true') || hasProfile;

            setOnboardingCompleted(shouldSkipOnboarding);

            // If user has profile but flags aren't set, save the flags
            if (hasProfile && seenOnboarding !== 'true') {
              await AsyncStorage.setItem(LS_HAS_SEEN_ONBOARDING, 'true');
              await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
            }
          } else {
            // User not found or invalid response - clear all auth data
            console.log('User not found, clearing auth data');
            await api.clearAllAuthData();
          }
        } catch (error) {
          // Only clear auth data for authentication errors (401/403)
          // For network/timeout errors, keep the token and use cached data
          const errorMessage = error.message || '';
          const isAuthError = errorMessage.includes('401') ||
                             errorMessage.includes('403') ||
                             errorMessage.includes('Unauthorized') ||
                             errorMessage.includes('invalid token') ||
                             errorMessage.includes('not found');

          if (isAuthError) {
            console.log('Auth error, clearing data:', error.message);
            await api.clearAllAuthData();
          } else {
            // Network/timeout error - try to use cached user data
            console.log('Network error, using cached data:', error.message);
            const cachedUserData = await AsyncStorage.getItem(LS_USER_DATA);
            if (cachedUserData) {
              try {
                const parsedUser = JSON.parse(cachedUserData);
                setUser(parsedUser);
                const hasProfile = parsedUser.name && parsedUser.region && parsedUser.goal;
                setOnboardingCompleted(hasProfile);
              } catch (parseError) {
                console.error('Failed to parse cached user data');
                await api.clearAllAuthData();
              }
            } else {
              // No cached data available - clear auth
              await api.clearAllAuthData();
            }
          }
        }
      } else {
        // No token - check BOTH onboarding flags for anonymous/demo
        const seenOnboarding = await AsyncStorage.getItem(LS_HAS_SEEN_ONBOARDING);
        const onboardingCompletedFlag = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        // Only mark as complete if BOTH flags are true
        setOnboardingCompleted(seenOnboarding === 'true' && onboardingCompletedFlag === 'true');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Only clear auth data for critical errors, not network issues
      const errorMessage = error.message || '';
      const isCriticalError = errorMessage.includes('401') ||
                             errorMessage.includes('403') ||
                             errorMessage.includes('Unauthorized') ||
                             errorMessage.includes('SyntaxError') ||
                             errorMessage.includes('parse');

      if (isCriticalError) {
        await api.clearAllAuthData();
      }
      // For other errors (network, timeout), keep auth state and try again later
    } finally {
      setLoading(false);
    }
  };

  const saveUserData = async (userData) => {
    try {
      await AsyncStorage.setItem(LS_USER_DATA, JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const signInWithEmail = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      if (!email || !password) {
        const message = 'Please fill in all fields';
        setAuthError(message);
        return { success: false, error: message };
      }

      if (password.length < 6) {
        const message = 'Password must be at least 6 characters';
        setAuthError(message);
        return { success: false, error: message };
      }

      const response = await api.login(email, password);

      if (response.success && response.data?.user) {
        const userData = response.data.user;

        // Check if user has already completed onboarding (has name, region, goal)
        const hasProfile = userData.name && userData.region && userData.goal;

        // Set loading to true to keep splash screen visible during state transition
        setLoading(true);

        // Update all state atomically before re-render
        if (hasProfile) {
          await AsyncStorage.setItem(LS_HAS_SEEN_ONBOARDING, 'true');
        } else {
          // User doesn't have a complete profile - clear any previous onboarding data
          await resetOnboardingForNewUser();
        }
        await saveUserData(userData);

        // Set onboarding state before clearing loading to prevent flash
        if (hasProfile) {
          setOnboardingCompleted(true);
        }

        // Small delay to ensure state is committed before showing UI
        await new Promise(resolve => setTimeout(resolve, 50));
        setLoading(false);

        return { success: true, user: userData };
      }

      throw new Error('Login failed');
    } catch (error) {
      const message = error.message || 'Authentication failed';
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  const signUpWithEmail = useCallback(
    async function signUpWithEmail(email, password, username, inviteCode) {
      setAuthError(null);
      try {
        if (!email || !password || !username || !inviteCode) {
          const message = 'Please fill in all fields';
          setAuthError(message);
          return { success: false, error: message };
        }

        if (username.length < 3 || username.length > 20) {
          const message = 'Username must be 3-20 characters';
          setAuthError(message);
          return { success: false, error: message };
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          const message = 'Username can only contain letters, numbers, and underscores';
          setAuthError(message);
          return { success: false, error: message };
        }

        if (password.length < 6) {
          const message = 'Password must be at least 6 characters';
          setAuthError(message);
          return { success: false, error: message };
        }

        const response = await api.register(email, password, username, inviteCode);

        if (response.success && response.data?.user) {
          // Clear any previous onboarding data for fresh start
          await resetOnboardingForNewUser();
          await saveUserData(response.data.user);
          return { success: true, user: response.data.user };
        }

        throw new Error('Registration failed');
      } catch (error) {
        const message = error.message || 'Registration failed';
        setAuthError(message);
        return { success: false, error: message };
      }
    },
    []
  );

  const signInWithGoogle = async () => {
    const message = 'Google sign-in is not available yet. Please use email/password or continue anonymously.';
    setAuthError(message);
    return { success: false, error: message };
  };

  const signInWithApple = async () => {
    const message = 'Apple sign-in is not available yet. Please use email/password or continue anonymously.';
    setAuthError(message);
    return { success: false, error: message };
  };

  const signInAnonymous = async () => {
    setAuthError(null);
    try {
      const response = await api.loginAnonymous();

      if (response.success && response.data?.user) {
        // Clear any previous onboarding data for fresh start
        await resetOnboardingForNewUser();
        await saveUserData(response.data.user);
        return { success: true, user: response.data.user };
      }

      throw new Error('Anonymous sign-in failed');
    } catch (error) {
      const message = error.message || 'Anonymous sign-in failed';
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  const signOut = useCallback(async () => {
    setAuthError(null);
    try {
      await api.logout();
      // Clear all onboarding data
      await resetOnboardingForNewUser();
      await AsyncStorage.removeItem(LS_USER_DATA);
      setUser(null);
      setOnboardingCompleted(false);
      return { success: true };
    } catch (error) {
      const message = error.message || 'Sign out failed';
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    setAuthError(null);
    try {
      await api.deleteAccount();
      await AsyncStorage.removeItem(LS_HAS_SEEN_ONBOARDING);
      await AsyncStorage.removeItem(LS_USER_DATA);
      setUser(null);
      return { success: true };
    } catch (error) {
      const message = error.message || 'Failed to delete account';
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  const checkUsername = async (username) => {
    try {
      const response = await api.checkUsername(username);
      return response;
    } catch (error) {
      return { success: false, available: false, message: error.message };
    }
  };

  const updateUserProfile = useCallback(async (updates) => {
    if (!user) return { success: false, error: 'No user logged in' };

    try {
      const response = await api.updateProfile(updates);

      if (response.success) {
        const responseUser = response?.data?.user ?? response?.data ?? {};
        // Use server response if it has data, otherwise fall back to local merge
        // Server response is the source of truth
        const updatedUser = Object.keys(responseUser).length > 0
          ? { ...user, ...responseUser }
          : { ...user, ...updates };
        setUser(updatedUser);
        await saveUserData(updatedUser);
        return { success: true, data: updatedUser };
      }

      throw new Error('Update failed');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    try {
      console.log('AuthContext: Refreshing user data...');
      const response = await api.getMe();
      const refreshedUser = response?.data?.user ?? response?.data ?? null;
      if (response.success && refreshedUser) {
        console.log('AuthContext: Got refreshed user data:', {
          ...refreshedUser,
          profileImage: refreshedUser.profileImage ? `[IMAGE - ${refreshedUser.profileImage.length} chars]` : null
        });
        setUser(refreshedUser);
        await saveUserData(refreshedUser);
        return refreshedUser;
      }
      console.log('AuthContext: No user data in response');
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
    return null;
  }, []);

  const setOnboardingComplete = async () => {
    try {
      // Set BOTH onboarding flags to ensure consistency
      await AsyncStorage.setItem(LS_HAS_SEEN_ONBOARDING, 'true');
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      setOnboardingCompleted(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const hasSeenOnboarding = async () => {
    try {
      const seen = await AsyncStorage.getItem(LS_HAS_SEEN_ONBOARDING);
      return seen === 'true';
    } catch (error) {
      return false;
    }
  };

  const value = {
    user,
    loading,
    error: authError,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signInAnonymous,
    signOut,
    deleteAccount,
    checkUsername,
    updateUserProfile,
    refreshUser,
    setOnboardingComplete,
    hasSeenOnboarding,
    onboardingCompleted,
    isAuthenticated: !!user,
    appleAuthAvailable: false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
