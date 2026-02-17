import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomAlert, { useCustomAlert } from '../../components/CustomAlert';
import api from '../../services/api';
import {
  ADMIN_COLORS,
  ADMIN_SPACING,
  ADMIN_RADIUS,
  ADMIN_TYPOGRAPHY,
  ADMIN_SURFACES,
} from '../../constants/adminTheme';

const C = ADMIN_COLORS;
const S = ADMIN_SPACING;
const R = ADMIN_RADIUS;
const T = ADMIN_TYPOGRAPHY;

const MODE_DIRECT = 'direct';
const MODE_BROADCAST = 'broadcast';

const parseUserIds = (input) => {
  if (!input) return [];
  return [...new Set(
    String(input)
      .split(/[\s,\n]+/)
      .map(part => part.trim())
      .filter(Boolean)
  )];
};

export default function AdminSendNotificationScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();

  const initialUserId = route?.params?.userId ? String(route.params.userId) : '';
  const initialUserName = route?.params?.userName ? String(route.params.userName) : '';
  const lockedRecipient = Boolean(initialUserId);

  const [mode, setMode] = useState(MODE_DIRECT);
  const [userIdsInput, setUserIdsInput] = useState(initialUserId);
  const [typeInput, setTypeInput] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const parsedUserIds = useMemo(() => parseUserIds(userIdsInput), [userIdsInput]);
  const effectiveUserIds = useMemo(() => {
    if (lockedRecipient && initialUserId) {
      return [initialUserId];
    }
    return parsedUserIds;
  }, [lockedRecipient, initialUserId, parsedUserIds]);

  useEffect(() => {
    if (lockedRecipient && initialUserId) {
      setUserIdsInput(initialUserId);
    }
  }, [lockedRecipient, initialUserId]);

  const validateMessage = () => {
    const titleValue = title.trim();
    const messageValue = message.trim();

    if (!titleValue || !messageValue) {
      showAlert({
        title: 'Missing Fields',
        message: 'Title and message are required.',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return null;
    }

    if (modeIsDirect && effectiveUserIds.length === 0) {
      showAlert({
        title: 'Missing Recipient',
        message: 'Enter at least one user ID.',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return null;
    }

    return {
      type: typeInput.trim() || 'welcome',
      title: titleValue,
      message: messageValue,
    };
  };

  const sendDirect = async () => {
    const payload = validateMessage();
    if (!payload) return;

    try {
      setSending(true);
      const response = await api.sendAdminNotification({
        userIds: effectiveUserIds,
        type: payload.type,
        title: payload.title,
        message: payload.message,
      });

      const recipientCount = response?.data?.recipientCount || effectiveUserIds.length;
      const pushSent = response?.data?.pushSent || 0;
      const pushAttempted = response?.data?.pushAttempted || 0;
      showAlert({
        title: 'Notification Sent',
        message: `Delivered to ${recipientCount} user(s). Push sent: ${pushSent}/${pushAttempted}.`,
        icon: 'success',
        buttons: [
          {
            text: 'OK',
            style: 'default',
            onPress: () => navigation.goBack(),
          },
        ],
      });
    } catch (error) {
      showAlert({
        title: 'Send Failed',
        message: error.message || 'Failed to send notification.',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setSending(false);
    }
  };

  const sendBroadcast = async () => {
    const payload = validateMessage();
    if (!payload) return;

    showAlert({
      title: 'Broadcast Notification',
      message: 'This will notify all users. Continue?',
      icon: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'destructive',
          onPress: async () => {
            try {
              setSending(true);
              const response = await api.broadcastAdminNotification({
                type: payload.type,
                title: payload.title,
                message: payload.message,
              });
              const recipientCount = response?.data?.recipientCount || 0;
              const pushSent = response?.data?.pushSent || 0;
              const pushAttempted = response?.data?.pushAttempted || 0;
              showAlert({
                title: 'Broadcast Sent',
                message: `Delivered to ${recipientCount} user(s). Push sent: ${pushSent}/${pushAttempted}.`,
                icon: 'success',
                buttons: [
                  {
                    text: 'OK',
                    style: 'default',
                    onPress: () => navigation.goBack(),
                  },
                ],
              });
            } catch (error) {
              showAlert({
                title: 'Broadcast Failed',
                message: error.message || 'Failed to send broadcast notification.',
                icon: 'error',
                buttons: [{ text: 'OK', style: 'default' }],
              });
            } finally {
              setSending(false);
            }
          },
        },
      ],
    });
  };

  const modeIsDirect = lockedRecipient || mode === MODE_DIRECT;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Send Notification</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {lockedRecipient && (
          <View style={styles.card}>
            <Text style={styles.label}>Recipient</Text>
            <Text style={styles.value}>
              {initialUserName ? `${initialUserName} (${initialUserId})` : initialUserId}
            </Text>
          </View>
        )}

        {!lockedRecipient && (
          <View style={styles.card}>
            <Text style={styles.label}>Mode</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                onPress={() => setMode(MODE_DIRECT)}
                style={[styles.modeButton, mode === MODE_DIRECT && styles.modeButtonActive]}
              >
                <Text style={[styles.modeButtonText, mode === MODE_DIRECT && styles.modeButtonTextActive]}>
                  Direct
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMode(MODE_BROADCAST)}
                style={[styles.modeButton, mode === MODE_BROADCAST && styles.modeButtonActive]}
              >
                <Text style={[styles.modeButtonText, mode === MODE_BROADCAST && styles.modeButtonTextActive]}>
                  Broadcast
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              Direct sends to selected user IDs. Broadcast sends to all users (super admin only).
            </Text>
          </View>
        )}

        {modeIsDirect && !lockedRecipient && (
          <View style={styles.card}>
            <Text style={styles.label}>User IDs</Text>
            <TextInput
              value={userIdsInput}
              onChangeText={setUserIdsInput}
              style={[styles.input, styles.inputMultiline]}
              placeholder="Paste one or more IDs, separated by commas or spaces"
              placeholderTextColor={C.textSubtle}
              multiline
            />
            <Text style={styles.hint}>
              Parsed recipients: {parsedUserIds.length}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Type (optional)</Text>
          <TextInput
            value={typeInput}
            onChangeText={setTypeInput}
            style={styles.input}
            placeholder="Any label, e.g. announcement"
            placeholderTextColor={C.textSubtle}
            autoCapitalize="none"
          />
          <Text style={styles.hint}>
            Custom types are accepted and mapped safely server-side.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholder="Notification title"
            placeholderTextColor={C.textSubtle}
            maxLength={120}
          />
          <Text style={styles.label}>Message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            style={[styles.input, styles.inputMultiline]}
            placeholder="Notification message"
            placeholderTextColor={C.textSubtle}
            multiline
            maxLength={1000}
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          disabled={sending}
          onPress={modeIsDirect ? sendDirect : sendBroadcast}
        >
          {sending ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <>
              <Ionicons name="send" size={16} color={C.white} />
              <Text style={styles.sendButtonText}>
                {modeIsDirect ? 'Send Notification' : 'Broadcast Notification'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={hideAlert}
        type={alertConfig.type}
        icon={alertConfig.icon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...ADMIN_SURFACES.page,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.lg,
    paddingBottom: S.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...T.h2,
    color: C.text,
  },
  headerRight: {
    width: 36,
    height: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: S.lg,
    paddingBottom: S.xxl,
    gap: S.md,
  },
  card: {
    ...ADMIN_SURFACES.card,
    padding: S.md,
    gap: S.sm,
  },
  label: {
    ...T.caption,
    color: C.textSubtle,
  },
  value: {
    ...T.body,
    color: C.text,
  },
  hint: {
    ...T.bodyMuted,
    color: C.textSubtle,
  },
  modeRow: {
    flexDirection: 'row',
    gap: S.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: S.sm,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  modeButtonText: {
    ...T.body,
    color: C.textMuted,
    fontWeight: '700',
  },
  modeButtonTextActive: {
    color: C.white,
  },
  input: {
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: R.md,
    backgroundColor: C.surface,
    color: C.text,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  sendButton: {
    marginTop: S.sm,
    borderRadius: R.md,
    backgroundColor: C.accent,
    paddingVertical: S.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: S.sm,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    ...T.body,
    color: C.white,
    fontWeight: '700',
  },
});
