import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SKINS } from '../../constants/colors';
import { useOnboarding } from '../../context/OnboardingContext';
import CustomAlert, { useCustomAlert } from '../../components/CustomAlert';

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zack',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Molly',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
];

export default function ProfileOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, skin } = useTheme();
  const isDark = skin === SKINS.operator || skin === SKINS.midnight;
  const { updateData, onboardingData, goToNextStep, goToPreviousStep } = useOnboarding();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  const [displayName, setDisplayName] = useState(onboardingData.displayName || '');
  const [profileImage, setProfileImage] = useState(onboardingData.profileImage || null);
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(null);

  // Check if display name is valid
  const isDisplayNameValid = displayName.trim().length >= 2 && displayName.trim().length <= 30;

  const handleNext = async () => {
    if (!isDisplayNameValid) return;

    const finalImage = profileImage || (selectedAvatarIndex !== null ? DEFAULT_AVATARS[selectedAvatarIndex] : null);

    await updateData({
      displayName: displayName.trim(),
      profileImage: finalImage,
    });

    goToNextStep();
  };

  const handleImagePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', 'Remove Photo'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleTakePhoto();
          if (buttonIndex === 2) handleChooseFromLibrary();
          if (buttonIndex === 3) handleRemovePhoto();
        }
      );
    } else {
      showAlert({
        title: 'Profile Photo',
        message: 'Choose an option',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: handleTakePhoto },
          { text: 'Choose from Library', onPress: handleChooseFromLibrary },
          { text: 'Remove Photo', style: 'destructive', onPress: handleRemovePhoto },
        ]
      });
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert({
          title: 'Permission needed',
          message: 'Camera permission is required to take a photo',
          icon: 'warning',
          buttons: [{ text: 'OK', style: 'default' }]
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Use base64 data if available, otherwise fallback to URI
        const imageData = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setProfileImage(imageData);
        setSelectedAvatarIndex(null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to take photo',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    }
  };

  const handleChooseFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert({
          title: 'Permission needed',
          message: 'Photo library permission is required',
          icon: 'warning',
          buttons: [{ text: 'OK', style: 'default' }]
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Use base64 data if available, otherwise fallback to URI
        const imageData = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setProfileImage(imageData);
        setSelectedAvatarIndex(null);
      }
    } catch (error) {
      console.error('Error choosing photo:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to choose photo',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    }
  };

  const handleRemovePhoto = () => {
    setProfileImage(null);
    setSelectedAvatarIndex(null);
  };

  const handleSelectAvatar = (index) => {
    setProfileImage(null);
    setSelectedAvatarIndex(index);
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
          <Text style={[styles.title, { color: theme.textMain }]}>Your Profile</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Let your competitors know who you are
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <Text style={[styles.sectionTitle, { color: theme.textMain }]}>Profile Photo</Text>
          <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
            Choose a photo to represent you on leaderboards
          </Text>

          {/* Current Photo / Avatar Preview */}
          <TouchableOpacity
            onPress={handleImagePicker}
            style={styles.photoContainer}
            activeOpacity={0.8}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.photo} />
            ) : selectedAvatarIndex !== null ? (
              <Image source={{ uri: DEFAULT_AVATARS[selectedAvatarIndex] }} style={styles.photo} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                <Ionicons name="camera-outline" size={40} color={theme.textMuted} />
                <Text style={[styles.photoPlaceholderText, { color: theme.textMuted }]}>
                  Add Photo
                </Text>
              </View>
            )}
            <View style={[styles.photoEditButton, { backgroundColor: theme.primary }]}>
              <Ionicons name="pencil" size={16} color={isDark ? theme.bgDeep : '#fff'} />
            </View>
          </TouchableOpacity>

          {/* Default Avatars */}
          <Text style={[styles.avatarsTitle, { color: theme.textMain }]}>Or choose an avatar</Text>
          <View style={styles.avatarsContainer}>
            {DEFAULT_AVATARS.map((avatar, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSelectAvatar(index)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.avatarWrapper,
                    selectedAvatarIndex === index && { borderColor: theme.primary, borderWidth: 3 },
                  ]}
                >
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Display Name Section */}
        <View style={styles.nameSection}>
          <Text style={[styles.sectionTitle, { color: theme.textMain }]}>Display Name</Text>
          <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
            This is how other athletes will see you
          </Text>

          <View
            style={[
              styles.inputWrapper,
              {
                borderColor: displayName && !isDisplayNameValid ? theme.danger : theme.border,
                backgroundColor: theme.bgCard,
              },
            ]}
          >
            <Ionicons name="person-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.textMain }]}
              placeholder="Enter your display name"
              placeholderTextColor={theme.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={30}
              autoFocus
            />
            {displayName.length > 0 && (
              <Text style={[styles.charCount, { color: theme.textMuted }]}>
                {displayName.length}/30
              </Text>
            )}
          </View>

          {/* Validation Message */}
          {displayName.length > 0 && (
            <View style={styles.validationContainer}>
              {isDisplayNameValid ? (
                <Text style={[styles.validText, { color: '#10B981' }]}>
                  <Ionicons name="checkmark-circle" size={14} /> Great name!
                </Text>
              ) : displayName.length < 2 ? (
                <Text style={[styles.hintText, { color: theme.textMuted }]}>
                  At least 2 characters
                </Text>
              ) : (
                <Text style={[styles.hintText, { color: theme.textMuted }]}>
                  Looking good!
                </Text>
              )}
            </View>
          )}

          {/* Name Preview Card */}
          {displayName && (
            <View style={[styles.previewCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Text style={[styles.previewLabel, { color: theme.textMuted }]}>Preview on leaderboard</Text>
              <View style={styles.previewRow}>
                <View style={styles.previewInfo}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.previewPhoto} />
                  ) : selectedAvatarIndex !== null ? (
                    <Image source={{ uri: DEFAULT_AVATARS[selectedAvatarIndex] }} style={styles.previewPhoto} />
                  ) : (
                    <View style={[styles.previewPhotoPlaceholder, { backgroundColor: theme.border }]}>
                      <Ionicons name="person" size={16} color={theme.textMuted} />
                    </View>
                  )}
                  <Text style={[styles.previewName, { color: theme.textMain }]}>{displayName}</Text>
                </View>
                <Text style={[styles.previewPoints, { color: theme.primary }]}>0 XP</Text>
              </View>
            </View>
          )}
        </View>

        {/* Tips Section */}
        <View style={[styles.tipsCard, { backgroundColor: `${theme.primary}10`, borderColor: theme.primary }]}>
          <Ionicons name="bulb-outline" size={20} color={theme.primary} />
          <View style={styles.tipsContent}>
            <Text style={[styles.tipsTitle, { color: theme.textMain }]}>Pro Tip</Text>
            <Text style={[styles.tipsText, { color: theme.textMuted }]}>
              You can always change your display name and photo later in your profile settings.
            </Text>
          </View>
        </View>
      </View>

      {/* Continue Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!isDisplayNameValid}
          activeOpacity={0.85}
          style={[
            styles.continueButton,
            { backgroundColor: theme.primary },
            !isDisplayNameValid && styles.continueButtonDisabled,
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

      {/* Custom Alert */}
      <CustomAlert {...alertConfig} onClose={hideAlert} />
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
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  photoEditButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  avatarsContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  avatarWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  avatar: {
    width: 56,
    height: 56,
  },
  nameSection: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  charCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  validationContainer: {
    marginTop: 10,
    minHeight: 20,
  },
  validText: {
    fontSize: 14,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 13,
  },
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  previewPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    fontSize: 15,
    fontWeight: '600',
  },
  previewPoints: {
    fontSize: 14,
    fontWeight: '700',
  },
  tipsCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
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
