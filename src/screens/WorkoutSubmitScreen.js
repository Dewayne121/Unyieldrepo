import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

import { useApp, EXERCISES, LS_GEMINI_KEY, calcPoints, MAX_REPS, MAX_WEIGHT_KG, MAX_WEIGHT_LBS } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { SKINS } from '../constants/colors';
import api from '../services/api';

const LS_WORKOUT_VIDEOS = 'unyield_workout_videos';

// Helper functions for video storage
async function saveWorkoutVideo(videoData) {
  try {
    const existing = await AsyncStorage.getItem(LS_WORKOUT_VIDEOS);
    const videos = existing ? JSON.parse(existing) : [];
    videos.unshift(videoData); // Add to beginning
    await AsyncStorage.setItem(LS_WORKOUT_VIDEOS, JSON.stringify(videos.slice(0, 50))); // Keep max 50
  } catch (e) {
    console.error('Error saving video:', e);
  }
}

async function getWorkoutVideos() {
  try {
    const existing = await AsyncStorage.getItem(LS_WORKOUT_VIDEOS);
    return existing ? JSON.parse(existing) : [];
  } catch (e) {
    return [];
  }
}

async function deleteWorkoutVideo(videoId, serverId) {
  try {
    // Delete from server first if it has a server ID
    if (serverId) {
      try {
        await api.deleteVideo(serverId);
        console.log('Video deleted from server:', serverId);
      } catch (apiError) {
        console.error('Error deleting video from server:', apiError);
        // Continue with local deletion even if server deletion fails
        // This handles cases where the video may have already been deleted server-side
      }
    }

    // Also delete from local storage
    const existing = await AsyncStorage.getItem(LS_WORKOUT_VIDEOS);
    const videos = existing ? JSON.parse(existing) : [];
    const filtered = videos.filter(v => v.id !== videoId);
    await AsyncStorage.setItem(LS_WORKOUT_VIDEOS, JSON.stringify(filtered));
    console.log('Video deleted from local storage:', videoId);
  } catch (e) {
    console.error('Error deleting video:', e);
    throw e;
  }
}

const Spacing = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

async function generateBattleReport({ apiKey, exerciseName, reps, weight }) {
  if (!apiKey) {
    return `No comms key set. Still logged: ${reps} reps of ${exerciseName}. Your discipline is the signal.`;
  }

  const prompt = `User just completed ${reps} reps of ${exerciseName}${weight ? ` at ${weight}kg` : ''}.
Write a short intense "Battle Report" (1-3 sentences).
Use gaming terms like "XP", "Loot", "Level Up", "Domination".`;

  try {
    const model = 'gemini-3-flash-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: 'You are the Overseer of Unyield, a gritty competitive fitness arena. You speak with authority and intensity. Keep it short, punchy, and motivating.' }],
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generation_config: { temperature: 0.9 },
      }),
    });

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
                data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) return String(text).trim();
    return 'Report unavailable. Keep grinding.';
  } catch (err) {
    try {
      const url2 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res2 = await fetch(url2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: 'You are the Overseer of Unyield, a gritty competitive fitness arena. You speak with authority and intensity. Keep it short, punchy, and motivating.' }],
          },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generation_config: { temperature: 0.9 },
        }),
      });
      if (!res2.ok) throw new Error(`Gemini HTTP ${res2.status}`);
      const data2 = await res2.json();
      const text2 = data2?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
                   data2?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text2) return String(text2).trim();
    } catch {}
    return 'The systems are down, but your effort is logged. Rise above.';
  }
}

export default function WorkoutSubmitScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { user, addLog, weightUnit, toggleWeightUnit } = useApp();

  const [exerciseId, setExerciseId] = useState(EXERCISES[0].id);
  const [reps, setReps] = useState(0);
  const [weight, setWeight] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordingUri, setRecordingUri] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const recTimer = useRef(null);
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [videoSource, setVideoSource] = useState('camera'); // 'camera' or 'gallery'
  const [blurFaces, setBlurFaces] = useState(false);
  const [blurring, setBlurring] = useState(false);

  // Get max weight based on current unit
  const maxWeight = weightUnit === 'kg' ? MAX_WEIGHT_KG : MAX_WEIGHT_LBS;

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      if (recTimer.current) {
        clearInterval(recTimer.current);
      }
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleCancel = () => {
    if (isRecording) {
      Alert.alert(
        'Recording in Progress',
        'A recording is currently in progress. Are you sure you want to cancel?',
        [
          { text: 'Keep Recording', style: 'cancel' },
          {
            text: 'Cancel Anyway',
            style: 'destructive',
            onPress: async () => {
              if (recTimer.current) {
                clearInterval(recTimer.current);
              }
              if (cameraRef.current) {
                try {
                  await cameraRef.current.stopRecording();
                } catch (err) {
                  console.error('Error stopping recording:', err);
                }
              }
              navigation.pop();
            },
          },
        ]
      );
    } else {
      navigation.pop();
    }
  };

  const exercise = useMemo(() => EXERCISES.find((x) => x.id === exerciseId) || EXERCISES[0], [exerciseId]);
  const points = useMemo(() => calcPoints(exercise, reps, weight, user?.streak || 0), [exercise, reps, weight, user]);

  const adjustReps = (delta) => {
    setReps((prev) => Math.max(0, prev + delta));
  };

  const adjustWeight = (delta) => {
    setWeight((prev) => Math.max(0, prev + delta));
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (cameraRef.current) {
        try {
          await cameraRef.current.stopRecording();
        } catch (err) {
          console.error('Error stopping recording:', err);
        }
      }
      setIsRecording(false);
      setHasRecording(true);
      if (recTimer.current) {
        clearInterval(recTimer.current);
      }
    } else {
      // Request camera permission if needed
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert(
            'Camera Permission',
            'Camera access is needed for recording. You can still log your workout without recording.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Start recording
      if (cameraRef.current) {
        try {
          setIsRecording(true);
          setHasRecording(false);
          setRecordSeconds(0);
          setRecordingUri(null);

          // Start timer immediately (don't wait for recording to finish)
          recTimer.current = setInterval(() => {
            setRecordSeconds((prev) => prev + 1);
          }, 1000);

          // Start recording - promise resolves when recording stops
          cameraRef.current.recordAsync({
            quality: '480p',
            maxDuration: 60,
            mute: false,
          }).then((result) => {
            setRecordingUri(result.uri);
            setHasRecording(true);
            setIsRecording(false);
            if (recTimer.current) {
              clearInterval(recTimer.current);
            }
            console.log('Recording saved:', result.uri);
          }).catch((err) => {
            console.error('Recording error:', err);
            setIsRecording(false);
            if (recTimer.current) {
              clearInterval(recTimer.current);
            }
          });
        } catch (err) {
          console.error('Failed to start recording:', err);
          setIsRecording(false);
          if (recTimer.current) {
            clearInterval(recTimer.current);
          }
          Alert.alert(
            'Recording Error',
            'Could not start recording. You can still log your workout.',
            [{ text: 'OK' }]
          );
        }
      }
    }
  };

  const formatTimer = () => {
    const minutes = Math.floor(recordSeconds / 60).toString().padStart(2, '0');
    const seconds = (recordSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const pickVideoFromGallery = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library to select a video.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Pick video from gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoQuality: 1, // 0=low, 1=medium, 2=high
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Get video duration
        if (asset.duration) {
          const durationSeconds = Math.floor(asset.duration);

          // Validate minimum 5 seconds
          if (durationSeconds < 5) {
            Alert.alert(
              'Video Too Short',
              'Video must be at least 5 seconds long. Please select a longer video or record a new one.',
              [{ text: 'OK' }]
            );
            return;
          }

          setRecordingUri(asset.uri);
          setHasRecording(true);
          setRecordSeconds(durationSeconds);
          setVideoSource('gallery');
        } else {
          // If we can't get duration, set it to at least 5 seconds
          setRecordingUri(asset.uri);
          setHasRecording(true);
          setRecordSeconds(5);
          setVideoSource('gallery');
        }
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert(
        'Error',
        'Failed to pick video from gallery. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  async function submit() {
    if (!user || isSubmitting || (reps <= 0 && exercise.name !== 'Run (Km)')) return;

    // Check if recording exists and is at least 5 seconds
    if (!hasRecording || recordSeconds < 5) {
      Alert.alert(
        'Recording Required',
        'You must record at least 5 seconds of your workout to submit.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);

    // Convert weight to kg for storage (always store as kg internally)
    const weightInKg = weightUnit === 'lbs' ? weight / 2.20462 : weight;

    const log = {
      id: Math.random().toString(36).slice(2),
      exercise: exercise.name,
      reps,
      weight: weightInKg,
      date: new Date().toISOString(),
      points,
      type: 'competition', // Differentiate from personal logs
    };

    await new Promise((r) => setTimeout(r, 650));

    const apiKey = (await AsyncStorage.getItem(LS_GEMINI_KEY))?.trim() || '';
    const report = await generateBattleReport({
      apiKey,
      exerciseName: exercise.name,
      reps,
      weight: weightInKg,
    });

    // Save workout video with recording duration (locally and to server)
    if (hasRecording && recordingUri) {
      // Save locally for offline access
      await saveWorkoutVideo({
        id: log.id,
        uri: recordingUri,
        exercise: exercise.name,
        reps,
        weight: weightInKg,
        date: new Date().toISOString(),
        points,
        duration: recordSeconds,
        status: 'pending',
        approved: false,
        userId: user._id || user.id,
      });

      // Upload video to server and submit for verification
      try {
        console.log('[WORKOUT SUBMIT] ===== Starting video submission process =====');
        // Step 1: Upload the video file
        console.log('[WORKOUT SUBMIT] Step 1: Uploading video file to server...', { recordingUri });
        const uploadResponse = await api.uploadVideo(recordingUri);
        console.log('[WORKOUT SUBMIT] Upload response received:', JSON.stringify(uploadResponse));

        console.log('[WORKOUT SUBMIT] Checking condition:', {
          hasSuccess: !!uploadResponse.success,
          successValue: uploadResponse.success,
          hasData: !!uploadResponse.data,
          hasVideoUrl: !!uploadResponse.data?.videoUrl
        });

        if (uploadResponse.success && uploadResponse.data) {
          let serverVideoUrl = uploadResponse.data.videoUrl;
          console.log('[WORKOUT SUBMIT] ✓ Step 1 complete - Video uploaded successfully');
          console.log('[WORKOUT SUBMIT] serverVideoUrl:', serverVideoUrl);

          // Step 1.5: Blur faces if enabled
          if (blurFaces) {
            console.log('[WORKOUT SUBMIT] Blurring faces...');
            setBlurring(true);

            try {
              const blurResponse = await api.blurVideo(serverVideoUrl);

              if (blurResponse.success && blurResponse.data?.blurredVideoUrl) {
                serverVideoUrl = blurResponse.data.blurredVideoUrl;
                console.log('[WORKOUT SUBMIT] Faces blurred:', blurResponse.data.facesFound);
              } else {
                console.warn('[WORKOUT SUBMIT] Blur failed, using original video');
              }
            } catch (blurError) {
              console.warn('[WORKOUT SUBMIT] Blur error:', blurError.message);
            } finally {
              setBlurring(false);
            }
          }

          // Step 2: Submit video metadata with the server URL
          console.log('[WORKOUT SUBMIT] Step 2: Submitting video metadata...', {
            exercise: exercise.name,
            reps,
            weight: weightInKg,
            duration: recordSeconds,
            videoUrl: serverVideoUrl
          });

          console.log('[WORKOUT SUBMIT] About to call api.submitVideo...');
          const submitResponse = await api.submitVideo({
            exercise: exercise.name,
            reps,
            weight: weightInKg,
            duration: recordSeconds,
            videoUrl: serverVideoUrl, // Server-hosted URL (or blurred URL)
            thumbnailUrl: null,
          });

          console.log('[WORKOUT SUBMIT] ✓ Step 2 complete - Video submitted successfully:', JSON.stringify(submitResponse));
        } else {
          console.error('[WORKOUT SUBMIT] ✗ Upload response invalid:', uploadResponse);
          console.error('[WORKOUT SUBMIT] Condition failed:', {
            success: uploadResponse.success,
            data: uploadResponse.data,
            hasVideoUrl: uploadResponse.data?.videoUrl
          });
        }
      } catch (err) {
        console.error('[WORKOUT SUBMIT] ✗ Error submitting video to server:', {
          message: err.message,
          stack: err.stack?.substring(0, 500),
          response: err.response
        });
        // Don't block the workout submission if video upload fails
        // Video will remain in local storage only
      }

      console.log('[WORKOUT SUBMIT] ===== Video submission process completed =====');
    }

    await addLog(log);
    setIsSubmitting(false);
    navigation.replace('WorkoutSummary', {
      report,
      earned: points,
      log,
    });
  }

  if (!user) return <View style={{ flex: 1, backgroundColor: theme.bgDeep }} />;

  const styles = createStyles(theme, isDark);

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Full-screen camera background */}
      <View style={styles.cameraContainer}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={styles.cameraPreview}
            facing="back"
            mode="video"
            mute={false}
          />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Ionicons name="videocam-outline" size={64} color={theme.textMuted} />
            <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
              <Text style={styles.permissionButtonText}>ENABLE CAMERA</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Top Header - floating */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleCancel} activeOpacity={0.85} style={styles.iconButton}>
          <Ionicons name="close" size={24} color={theme.textMain} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>RECORD</Text>
          {(isRecording || hasRecording) && (
            <Text style={styles.timer}>{formatTimer()}</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Bottom Controls - floating */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 + keyboardHeight }]}>
        {/* Exercise selector */}
        <View style={styles.exerciseSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroller}>
            {EXERCISES.map((x) => {
              const active = x.id === exerciseId;
              return (
                <TouchableOpacity
                  key={x.id}
                  onPress={() => setExerciseId(x.id)}
                  activeOpacity={0.7}
                  style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
                >
                  <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
                    {x.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Stats row with text inputs */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>REPS</Text>
            <TextInput
              style={styles.statInput}
              value={reps.toString()}
              onChangeText={(text) => {
                const val = Math.max(0, parseInt(text) || 0);
                setReps(Math.min(val, MAX_REPS));
              }}
              keyboardType="number-pad"
              placeholder="0"
              maxLength={4}
            />
          </View>
          <View style={styles.statBox}>
            <View style={styles.weightLabelRow}>
              <Text style={styles.statLabel}>LOAD</Text>
              <TouchableOpacity onPress={toggleWeightUnit} style={styles.unitToggle}>
                <Text style={styles.unitText}>{weightUnit.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.statInput}
              value={weight.toString()}
              onChangeText={(text) => {
                const val = Math.max(0, parseInt(text) || 0);
                setWeight(Math.min(val, maxWeight));
              }}
              keyboardType="number-pad"
              placeholder="0"
              maxLength={4}
            />
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>GAIN</Text>
            <Text style={[styles.statValue, { color: theme.primary }]}>+{points}</Text>
          </View>
        </View>

        {/* Video source buttons */}
        <View style={styles.videoSourceButtons}>
          <TouchableOpacity
            onPress={toggleRecording}
            activeOpacity={0.8}
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          >
            <Ionicons
              name={isRecording ? "stop" : "videocam"}
              size={32}
              color={isRecording ? theme.bgDeep : theme.textMain}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickVideoFromGallery}
            activeOpacity={0.8}
            style={styles.galleryButton}
            disabled={isRecording}
          >
            <Ionicons
              name="image-outline"
              size={28}
              color={isRecording ? theme.textMuted : theme.textMain}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.recordStatus}>
          {isRecording ? 'RECORDING...' :
           hasRecording ? `${videoSource === 'gallery' ? 'UPLOADED' : 'RECORDED'} (${formatTimer()})` :
           'RECORD OR UPLOAD (MIN 5s)'}
        </Text>

        {/* Blur faces toggle */}
        {hasRecording && (
          <TouchableOpacity
            onPress={() => setBlurFaces(!blurFaces)}
            disabled={isSubmitting}
            style={[
              styles.blurToggleButton,
              blurFaces && styles.blurToggleActive
            ]}
          >
            <Ionicons
              name={blurFaces ? "eye-off" : "eye"}
              size={18}
              color={blurFaces ? theme.bgDeep : theme.textMuted}
            />
            <Text style={[
              styles.blurToggleText,
              blurFaces && styles.blurToggleTextActive
            ]}>
              {blurFaces ? "FACE BLUR: ON" : "FACE BLUR: OFF"}
            </Text>
            {blurring && (
              <ActivityIndicator
                size="small"
                color={theme.bgDeep}
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
        )}

        {/* Submit button */}
        <TouchableOpacity
          onPress={submit}
          activeOpacity={0.8}
          style={[
            styles.submitButton,
            ((reps <= 0 && exercise.name !== 'Run (Km)') || !hasRecording || recordSeconds < 5) && styles.submitDisabled
          ]}
          disabled={isSubmitting || blurring || (reps <= 0 && exercise.name !== 'Run (Km)') || !hasRecording || recordSeconds < 5}
        >
          <Text style={styles.submitText}>
            {isSubmitting || blurring ? 'TRANSMITTING...' :
             !hasRecording ? 'RECORD REQUIRED (5s MIN)' :
             recordSeconds < 5 ? `KEEP RECORDING (${5 - recordSeconds}s)` :
             'TRANSMIT LOG'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme, isDark) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: theme.bgDeep },
    cameraContainer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 0,
    },
    cameraPreview: {
      width: '100%',
      height: '100%',
    },
    cameraPlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bgPanel,
    },
    permissionButton: {
      marginTop: 20,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: theme.primary,
      borderRadius: 8,
    },
    permissionButtonText: {
      color: theme.textMain,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 10,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.shadow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: {
      alignItems: 'center',
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: theme.textMain,
    },
    timer: {
      fontSize: 12,
      fontWeight: '900',
      color: theme.danger,
      fontFamily: 'monospace',
      marginTop: 4,
    },
    bottomControls: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      paddingBottom: 20,
      zIndex: 10,
    },
    exerciseSelector: {
      marginBottom: 16,
    },
    pillScroller: {
      gap: 8,
      paddingHorizontal: 4,
    },
    pill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      backgroundColor: theme.shadow,
    },
    pillActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    pillInactive: {
      borderColor: theme.border,
    },
    pillText: {
      fontSize: 11,
      fontWeight: '700',
      fontFamily: 'monospace',
      textTransform: 'uppercase',
    },
    pillTextActive: {
      color: theme.textMain,
    },
    pillTextInactive: {
      color: theme.textMuted,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    statBox: {
      flex: 1,
      backgroundColor: theme.shadow,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    statLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '900',
      color: theme.textMain,
      fontFamily: 'monospace',
    },
    statInput: {
      fontSize: 24,
      fontWeight: '900',
      color: theme.textMain,
      fontFamily: 'monospace',
      textAlign: 'center',
      padding: 0,
      margin: 0,
    },
    weightLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    unitToggle: {
      backgroundColor: theme.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    unitText: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.textMain,
      letterSpacing: 0.5,
    },
    recordButton: {
      alignSelf: 'center',
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.danger,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.border,
    },
    recordButtonActive: {
      backgroundColor: theme.textMain,
    },
    videoSourceButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      marginBottom: 12,
    },
    galleryButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.shadowSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.border,
    },
    recordStatus: {
      alignSelf: 'center',
      fontSize: 11,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 16,
    },
    submitButton: {
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    submitDisabled: {
      opacity: 0.4,
    },
    submitText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: theme.textMain,
      fontFamily: 'monospace',
    },
    blurToggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bgPanel,
      borderWidth: 1,
      borderColor: theme.textMuted,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    blurToggleActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    blurToggleText: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: theme.textMuted,
      marginLeft: 8,
    },
    blurToggleTextActive: {
      color: theme.textMain,
    },
  });
}
