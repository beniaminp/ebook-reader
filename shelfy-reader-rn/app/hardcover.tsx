import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';
import { useHardcoverStore } from '../src/stores/hardcoverStore';

export default function HardcoverScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Store state
  const isConnected = useHardcoverStore((s) => s.isConnected);
  const username = useHardcoverStore((s) => s.username);
  const lastSyncAt = useHardcoverStore((s) => s.lastSyncAt);
  const matchedBooks = useHardcoverStore((s) => s.matchedBooks);
  const autoSync = useHardcoverStore((s) => s.autoSync);
  const isSyncing = useHardcoverStore((s) => s.isSyncing);
  const syncError = useHardcoverStore((s) => s.syncError);
  const pendingQueueCount = useHardcoverStore((s) => s.pendingQueueCount);

  // Store actions
  const initialize = useHardcoverStore((s) => s.initialize);
  const connect = useHardcoverStore((s) => s.connect);
  const disconnect = useHardcoverStore((s) => s.disconnect);
  const fullSync = useHardcoverStore((s) => s.fullSync);
  const setAutoSync = useHardcoverStore((s) => s.setAutoSync);
  const processQueue = useHardcoverStore((s) => s.processQueue);

  // Local form state
  const [apiKey, setApiKey] = useState('');

  // UI state
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleConnect = useCallback(async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter your Hardcover API key');
      return;
    }

    setIsConnecting(true);

    try {
      const connectedUsername = await connect(trimmed);
      setApiKey('');
      Alert.alert(
        'Connected',
        `Successfully connected as ${connectedUsername}.`
      );
    } catch (error) {
      Alert.alert(
        'Connection Failed',
        error instanceof Error ? error.message : 'Could not connect to Hardcover'
      );
    } finally {
      setIsConnecting(false);
    }
  }, [apiKey, connect]);

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to disconnect from Hardcover? Matched book data will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnect();
            setApiKey('');
          },
        },
      ]
    );
  }, [disconnect]);

  const handleFullSync = useCallback(async () => {
    const result = await fullSync();
    if (result.errors.length > 0) {
      Alert.alert(
        'Sync Completed with Errors',
        `Matched: ${result.matched}\nPulled: ${result.pulled}\nPushed: ${result.pushed}\n\nErrors:\n${result.errors.join('\n')}`
      );
    } else {
      Alert.alert(
        'Sync Complete',
        `Matched: ${result.matched} books\nPulled: ${result.pulled} updates\nPushed: ${result.pushed} updates`
      );
    }
  }, [fullSync]);

  const handleProcessQueue = useCallback(async () => {
    await processQueue();
    Alert.alert('Queue Processed', 'Pending sync items have been processed.');
  }, [processQueue]);

  const matchedCount = Object.keys(matchedBooks).length;

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Hardcover</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Connection Status Banner */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: isConnected ? theme.success + '18' : theme.surface,
              borderColor: isConnected ? theme.success : theme.border,
            },
          ]}
        >
          <Ionicons
            name={isConnected ? 'checkmark-circle' : 'close-circle'}
            size={20}
            color={isConnected ? theme.success : theme.textMuted}
          />
          <Text
            style={[
              styles.statusText,
              { color: isConnected ? theme.success : theme.textMuted },
            ]}
          >
            {isConnected
              ? `Connected as ${username}`
              : 'Not connected'}
          </Text>
        </View>

        {/* Error Banner */}
        {syncError && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: theme.error + '15', borderColor: theme.error },
            ]}
          >
            <Ionicons name="alert-circle" size={18} color={theme.error} />
            <Text
              style={[styles.errorText, { color: theme.error }]}
              numberOfLines={3}
            >
              {syncError}
            </Text>
          </View>
        )}

        {!isConnected ? (
          /* Disconnected: show API key input and connect button */
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              API Key
            </Text>
            <TextInput
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Enter your Hardcover API key"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              editable={!isConnecting}
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                },
              ]}
            />

            <Text style={[styles.hint, { color: theme.textMuted }]}>
              Get your API key from hardcover.app/account/api
            </Text>

            {/* Connect Button */}
            <Pressable
              onPress={handleConnect}
              disabled={isConnecting}
              style={[
                styles.button,
                {
                  backgroundColor: theme.primary,
                  opacity: isConnecting ? 0.6 : 1,
                },
              ]}
            >
              {isConnecting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                    Connecting...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="key-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                    Connect
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          /* Connected: show sync controls */
          <View>
            {/* Auto-sync toggle */}
            <View style={[styles.row, { borderBottomColor: theme.border }]}>
              <Text style={{ color: theme.text, fontSize: 16 }}>Auto-sync</Text>
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                trackColor={{ true: theme.primary, false: theme.border }}
              />
            </View>

            {/* Sync Stats */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Sync Status
            </Text>

            <View
              style={[
                styles.statsRow,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  {matchedCount}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Matched Books
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  {formatLastSync(lastSyncAt)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Last Synced
                </Text>
              </View>
            </View>

            {/* Pending Queue */}
            {pendingQueueCount > 0 && (
              <View
                style={[
                  styles.queueBanner,
                  {
                    backgroundColor: theme.warning + '15',
                    borderColor: theme.warning,
                  },
                ]}
              >
                <Ionicons name="hourglass-outline" size={18} color={theme.warning} />
                <Text
                  style={{
                    color: theme.warning,
                    fontSize: 14,
                    fontWeight: '600',
                    marginLeft: 8,
                    flex: 1,
                  }}
                >
                  {pendingQueueCount} pending sync {pendingQueueCount === 1 ? 'item' : 'items'}
                </Text>
                <Pressable
                  onPress={handleProcessQueue}
                  style={[
                    styles.smallButton,
                    { borderColor: theme.warning },
                  ]}
                >
                  <Text style={{ color: theme.warning, fontSize: 13, fontWeight: '600' }}>
                    Process
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Full Sync Button */}
            <Pressable
              onPress={handleFullSync}
              disabled={isSyncing}
              style={[
                styles.button,
                {
                  backgroundColor: theme.success,
                  opacity: isSyncing ? 0.6 : 1,
                },
              ]}
            >
              {isSyncing ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                    Syncing...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="sync-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                    Sync All Books
                  </Text>
                </>
              )}
            </Pressable>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Info Section */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              What syncs
            </Text>

            <View style={styles.infoList}>
              <InfoRow
                icon="swap-horizontal-outline"
                text="Reading status (push & pull)"
                color={theme.textSecondary}
              />
              <InfoRow
                icon="star-outline"
                text="Ratings (push & pull)"
                color={theme.textSecondary}
              />
              <InfoRow
                icon="book-outline"
                text="Page count & cover images (pull)"
                color={theme.textSecondary}
              />
              <InfoRow
                icon="chatbubble-outline"
                text="Reviews (pull)"
                color={theme.textSecondary}
              />
              <InfoRow
                icon="analytics-outline"
                text="Community ratings (pull)"
                color={theme.textSecondary}
              />
            </View>

            {/* Disconnect Button */}
            <Pressable
              onPress={handleDisconnect}
              style={[
                styles.button,
                styles.outlineButton,
                { borderColor: theme.error, marginTop: 24 },
              ]}
            >
              <Ionicons
                name="log-out-outline"
                size={18}
                color={theme.error}
                style={{ marginRight: 6 }}
              />
              <Text style={{ color: theme.error, fontWeight: '600', fontSize: 16 }}>
                Disconnect
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  text,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
}) {
  return (
    <View style={infoStyles.row}>
      <Ionicons name={icon} size={16} color={color} style={{ marginRight: 10 }} />
      <Text style={{ color, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  button: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    flexDirection: 'row',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
    marginTop: 24,
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
  },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  smallButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  infoList: {
    marginBottom: 8,
  },
});
