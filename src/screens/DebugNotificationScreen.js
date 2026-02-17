import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function DebugNotificationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    expoPushToken,
    permissionStatus,
    isReady,
    syncPushTokenToServer,
    registerForPushNotificationsAsync,
  } = useNotifications();
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [serverToken, setServerToken] = useState(null);

  const checkServerToken = async () => {
    setChecking(true);
    try {
      const response = await api.getNotificationPreferences();
      const tokenOnServer = response?.data?.pushToken;
      setServerToken(tokenOnServer || 'No token on server');
    } catch (error) {
      setServerToken('Error: ' + error.message);
    } finally {
      setChecking(false);
    }
  };

  const syncTokenNow = async () => {
    setSyncing(true);
    try {
      const token =
        expoPushToken ||
        await registerForPushNotificationsAsync({ requestIfNotGranted: false });

      if (!token) {
        setServerToken('Sync failed: device push token unavailable');
        return;
      }

      await api.registerPushToken(token);
      // Keep hook-based sync as fallback; direct API call above is primary.
      await syncPushTokenToServer().catch(() => {});
      await checkServerToken();
    } catch (error) {
      setServerToken('Sync error: ' + (error?.message || String(error)));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Notification Debug</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Info</Text>
          <InfoRow label="User ID" value={user?.id || user?._id || 'Unknown'} />
          <InfoRow label="Username" value={user?.username || 'Unknown'} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Token Status</Text>
          <InfoRow label="Ready" value={isReady ? '✅ Yes' : '❌ No'} />
          <InfoRow label="Permission" value={permissionStatus || 'Unknown'} />
          <InfoRow label="Device Token" value={expoPushToken || '❌ No token'} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server Status</Text>
          <InfoRow label="Server Token" value={serverToken || 'Not checked'} />
          <TouchableOpacity
            style={styles.syncButton}
            onPress={syncTokenNow}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkButtonText}>Sync Token To Server</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkButton}
            onPress={checkServerToken}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkButtonText}>Check Server Token</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Troubleshooting</Text>
          <Text style={styles.helpText}>
            If you see "❌ No token" above:
          </Text>
          <Text style={styles.helpBullet}>1. Open iPhone Settings → Expo Go → Notifications</Text>
          <Text style={styles.helpBullet}>2. Make sure "Allow Notifications" is ON</Text>
          <Text style={styles.helpBullet}>3. Toggle "Notifications" OFF then ON</Text>
          <Text style={styles.helpBullet}>4. Restart the app</Text>
          <Text style={styles.helpText}>
            If server token differs from device token:
          </Text>
          <Text style={styles.helpBullet}>• Pull to refresh on any screen to re-sync</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
  },
  infoValue: {
    fontSize: 12,
    color: '#9b2c2c',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  checkButton: {
    backgroundColor: '#9b2c2c',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  syncButton: {
    backgroundColor: '#16784c',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  helpBullet: {
    fontSize: 13,
    color: '#999',
    marginLeft: 12,
    marginBottom: 4,
  },
});
