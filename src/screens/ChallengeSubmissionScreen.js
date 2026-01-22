import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { EXERCISES } from '../constants/exercises';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/colors';

// Helper component for form sections - Operator Style
const FormSection = ({ title, children, required, theme }) => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{title}</Text>
      {required && <Text style={[styles.requiredMark, { color: theme.danger }]}>*</Text>}
    </View>
    {children}
  </View>
);

export default function ChallengeSubmissionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { challenge } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [selectedExercise, setSelectedExercise] = useState(null);
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [videoUri, setVideoUri] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facing, setFacing] = useState('back');
  const [cameraActive, setCameraActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [videoSource, setVideoSource] = useState('camera');
  const [blurFaces, setBlurFaces] = useState(false);
  const [blurring, setBlurring] = useState(false); 

  const recordingTimerRef = useRef(null);
  const styles = createStyles(theme);

  const availableExercises = challenge?.challengeType === 'exercise'
    ? EXERCISES.filter(ex => challenge.exercises?.includes(ex.id))
    : EXERCISES;

  const startRecording = async () => {
    if (!cameraRef.current) return;
    try {
      setRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      const video = await cameraRef.current.recordAsync({ quality: '480p', maxDuration: 60 });
      clearInterval(recordingTimerRef.current);
      setVideoUri(video.uri);
      setRecording(false);
      setCameraActive(false);
      setVideoSource('camera');
    } catch (error) {
      setRecording(false);
      clearInterval(recordingTimerRef.current);
      Alert.alert('Error', 'Failed to record video');
    }
  };

  const stopRecording = () => cameraRef.current?.stopRecording();

  const pickVideoFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('Permission Required', 'Please grant permission to access your photo library to select a video.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoQuality: 1, // 0=low, 1=medium, 2=high
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const durationSeconds = Math.floor(asset.duration || 0);

        if (durationSeconds < 5) {
          Alert.alert(
            'Video Too Short',
            'Video must be at least 5 seconds long. Please select a longer video or record a new one.',
            [{ text: 'OK' }]
          );
          return;
        }

        setVideoUri(asset.uri);
        setRecordingTime(durationSeconds);
        setVideoSource('gallery');
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video from gallery. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (challenge?.challengeType === 'exercise' && !selectedExercise) return Alert.alert('Missing Info', 'Select exercise');
    if (!videoUri) return Alert.alert('Proof Required', 'Record or upload video');

    try {
      setSubmitting(true);

      const uploadResponse = await api.uploadVideo(videoUri);
      if (!uploadResponse.success) throw new Error('Upload failed');

      let finalVideoUrl = uploadResponse.data.videoUrl;

      if (blurFaces) {
        setBlurring(true);
        try {
          const blurResponse = await api.blurVideo(finalVideoUrl);
          if (blurResponse.success && blurResponse.data?.blurredVideoUrl) {
            finalVideoUrl = blurResponse.data.blurredVideoUrl;
          }
        } catch (blurError) {
          console.warn('[SUBMIT] Blur error:', blurError.message);
        } finally {
          setBlurring(false);
        }
      }

      let value = 0;
      switch (challenge?.metricType) {
        case 'reps': value = parseInt(reps) || 0; break;
        case 'weight': value = parseFloat(weight) || 0; break;
        case 'duration': value = parseInt(duration) || 0; break;
        default: value = 1;
      }

      const response = await api.submitChallengeEntry(challenge._id, {
        exercise: selectedExercise?.id,
        reps: parseInt(reps) || 0,
        weight: parseFloat(weight) || 0,
        duration: parseInt(duration) || 0,
        videoUrl: finalVideoUrl,
        serverVideoId: uploadResponse.data.objectName,
        value,
        notes: notes.trim(),
      });

      if (response.success) {
        Alert.alert('Success', 'Entry submitted!', [{ text: 'Done', onPress: () => navigation.goBack() }]);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (cameraActive) {
    return (
      <View style={styles.fullScreenCamera}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="video" />
        <View style={[styles.cameraHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setCameraActive(false)} style={styles.cameraCloseButton}>
                <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            {recording && (
                <View style={[styles.recordingIndicator, { backgroundColor: theme.danger }]}>
                    <View style={styles.redDot} />
                    <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
                </View>
            )}
        </View>
        <View style={styles.cameraFooter}>
            <TouchableOpacity style={styles.recordButtonOuter} onPress={recording ? stopRecording : startRecording}>
                <View style={[styles.recordButtonInner, recording && { width: 28, height: 28, borderRadius: 4, backgroundColor: theme.danger }]} />
            </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                <Ionicons name="arrow-back" size={24} color={theme.textMain} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>SUBMIT ENTRY</Text>
            <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Challenge Summary */}
        <View style={styles.challengeCard}>
            <View style={styles.cardGradient}>
                <View style={[styles.cardHighlight, { backgroundColor: theme.primary }]} />
                <View style={styles.challengeHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(212, 175, 55, 0.1)' }]}>
                        <Ionicons name="trophy" size={20} color={theme.gold} />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.challengeTitle}>{challenge?.title}</Text>
                        <Text style={styles.challengeTarget}>
                            GOAL: <Text style={{color: theme.primary}}>{challenge?.target} {challenge?.metricType?.toUpperCase()}</Text>
                        </Text>
                    </View>
                </View>
            </View>
        </View>

        {/* Media Selection */}
        <FormSection title="EVIDENCE" required theme={theme}>
            {videoUri ? (
                <View style={styles.videoSuccessBox}>
                    <View style={[styles.videoSuccessIndicator, { backgroundColor: theme.success }]} />
                    <Ionicons name="checkmark-circle" size={24} color={theme.success} style={{marginRight: 12}} />
                    <View style={{flex: 1}}>
                        <Text style={styles.videoSuccessTitle}>VIDEO ATTACHED</Text>
                        <Text style={styles.videoSuccessSub}>{formatTime(recordingTime)} • {videoSource.toUpperCase()}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setVideoUri(null)} style={styles.trashBtn}>
                        <Ionicons name="trash" size={20} color={theme.textMuted} />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.mediaRow}>
                    <TouchableOpacity style={[styles.mediaBtn, { borderColor: theme.border }]} onPress={() => setCameraActive(true)}>
                        <View style={styles.mediaBtnGradient}>
                            <Ionicons name="videocam" size={28} color={theme.primary} />
                            <Text style={styles.mediaBtnText}>RECORD</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.mediaBtn, { borderColor: theme.border }]} onPress={pickVideoFromGallery}>
                        <View style={styles.mediaBtnGradient}>
                            <Ionicons name="cloud-upload" size={28} color={theme.textMain} />
                            <Text style={styles.mediaBtnText}>UPLOAD</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}
        </FormSection>

        {/* Form Fields */}
        <View style={styles.formPanel}>
            {challenge?.challengeType === 'exercise' && (
                <FormSection title="EXERCISE" required theme={theme}>
                    <TouchableOpacity style={styles.operatorInput} onPress={() => setShowExerciseSelector(true)}>
                        <Text style={[styles.inputText, !selectedExercise && { color: theme.textMuted }]}>
                            {selectedExercise ? selectedExercise.name.toUpperCase() : "SELECT UNIT"}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
                    </TouchableOpacity>
                </FormSection>
            )}

            <View style={styles.row}>
                {(challenge?.metricType === 'reps' || challenge?.metricType === 'weight') && (
                    <View style={{flex: 1, marginRight: 8}}>
                        <FormSection title="REPS" required={challenge?.metricType === 'reps'} theme={theme}>
                            <TextInput
                                style={styles.operatorInput}
                                placeholder="0"
                                placeholderTextColor={theme.textMuted}
                                value={reps}
                                onChangeText={setReps}
                                keyboardType="number-pad"
                            />
                        </FormSection>
                    </View>
                )}
                {challenge?.metricType === 'weight' && (
                    <View style={{flex: 1, marginLeft: 8}}>
                        <FormSection title="WEIGHT (KG)" required theme={theme}>
                            <TextInput
                                style={styles.operatorInput}
                                placeholder="0.0"
                                placeholderTextColor={theme.textMuted}
                                value={weight}
                                onChangeText={setWeight}
                                keyboardType="decimal-pad"
                            />
                        </FormSection>
                    </View>
                )}
            </View>

            {challenge?.metricType === 'duration' && (
                <FormSection title="DURATION (SEC)" required theme={theme}>
                    <TextInput
                        style={styles.operatorInput}
                        placeholder="0"
                        placeholderTextColor={theme.textMuted}
                        value={duration}
                        onChangeText={setDuration}
                        keyboardType="number-pad"
                    />
                </FormSection>
            )}

            <FormSection title="COMMS / NOTES" theme={theme}>
                <TextInput
                    style={[styles.operatorInput, styles.textArea]}
                    placeholder="OPTIONAL INTEL..."
                    placeholderTextColor={theme.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                />
            </FormSection>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {/* Blur Faces Toggle */}
        {videoUri && (
          <TouchableOpacity
            style={[
                styles.blurToggle, 
                { borderColor: blurFaces ? theme.primary : theme.border, backgroundColor: blurFaces ? theme.primary : theme.bgCard }
            ]}
            onPress={() => setBlurFaces(!blurFaces)}
            disabled={submitting}
          >
            <Ionicons
              name={blurFaces ? "eye-off" : "eye"}
              size={20}
              color={blurFaces ? "#fff" : theme.textMuted}
            />
            <Text style={[styles.blurToggleText, blurFaces ? { color: '#fff' } : { color: theme.textMuted }]}>
              {blurFaces ? "FACE BLUR: ON" : "FACE BLUR: OFF"}
            </Text>
            {blurring && (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
            style={[
                styles.submitBtn, 
                { backgroundColor: theme.primary, shadowColor: theme.primary },
                (!videoUri || submitting || blurring) && styles.submitBtnDisabled
            ]}
            onPress={handleSubmit}
            disabled={submitting || !videoUri || blurring}
        >
            {submitting || blurring ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.submitBtnText}>DEPLOY ENTRY</Text>
            )}
        </TouchableOpacity>
      </View>

      {/* Exercise Modal */}
      <Modal visible={showExerciseSelector} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
            <View style={styles.headerTop}>
                <TouchableOpacity onPress={() => setShowExerciseSelector(false)}>
                    <Ionicons name="close" size={28} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>SELECT EXERCISE</Text>
                <View style={{ width: 28 }} />
            </View>
          </View>
          <ScrollView style={{flex: 1, padding: 20}}>
            {availableExercises.map(ex => (
              <TouchableOpacity
                key={ex.id}
                style={[styles.modalItem, selectedExercise?.id === ex.id && { backgroundColor: theme.bgPanel }]}
                onPress={() => { setSelectedExercise(ex); setShowExerciseSelector(false); }}
              >
                <Text style={[styles.modalItemText, selectedExercise?.id === ex.id ? { color: theme.primary } : { color: theme.textMuted }]}>
                  {ex.name.toUpperCase()}
                </Text>
                {selectedExercise?.id === ex.id && <Ionicons name="flash" size={18} color={theme.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(theme) {
    return StyleSheet.create({
      container: { flex: 1, backgroundColor: theme.bgDeep },
      header: { paddingHorizontal: 24, paddingBottom: 16, backgroundColor: theme.bgPanel, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
      headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
      headerTitle: { fontSize: 16, fontWeight: '800', color: theme.textMain, letterSpacing: 1 },
      content: { flex: 1 },
      scrollContent: { padding: 20 },
      
      challengeCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 24, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
      cardGradient: { padding: 20 },
      cardHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
      challengeHeader: { flexDirection: 'row', alignItems: 'center' },
      iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
      challengeTitle: { fontSize: 16, fontWeight: '800', color: theme.textMain, marginBottom: 4 },
      challengeTarget: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1 },

      sectionContainer: { marginBottom: 20 },
      sectionHeader: { flexDirection: 'row', marginBottom: 10 },
      sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
      requiredMark: { marginLeft: 4, fontSize: 12 },

      mediaRow: { flexDirection: 'row', gap: 12 },
      mediaBtn: { flex: 1, height: 100, borderRadius: 16, overflow: 'hidden', borderWidth: 1, backgroundColor: theme.bgCard },
      mediaBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
      mediaBtnText: { fontSize: 11, fontWeight: '800', color: theme.textMain, letterSpacing: 1 },
      
      videoSuccessBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgCard, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
      videoSuccessIndicator: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2 },
      videoSuccessTitle: { fontSize: 13, fontWeight: '800', color: theme.textMain, letterSpacing: 0.5 },
      videoSuccessSub: { fontSize: 11, fontWeight: '700', color: theme.textMuted },

      formPanel: { backgroundColor: theme.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
      operatorInput: { backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, color: theme.textMain, fontSize: 15, fontWeight: '700', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
      textArea: { minHeight: 80, textAlignVertical: 'top' },
      inputText: { color: theme.textMain, fontSize: 15, fontWeight: '700' },
      row: { flexDirection: 'row' },

      footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, backgroundColor: 'transparent' },
      submitBtn: { height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
      submitBtnDisabled: { backgroundColor: theme.bgCard, shadowOpacity: 0, elevation: 0 },
      submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
      blurToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
      blurToggleText: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginLeft: 8 },

      fullScreenCamera: { flex: 1, backgroundColor: '#000' },
      cameraHeader: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
      cameraCloseButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
      recordingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
      redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', marginRight: 6 },
      recordingTime: { color: '#fff', fontWeight: '800', fontSize: 12 },
      cameraFooter: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
      recordButtonOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
      recordButtonInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },

      modalContainer: { flex: 1, backgroundColor: theme.bgDeep },
      modalItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
      modalItemText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
    });
}