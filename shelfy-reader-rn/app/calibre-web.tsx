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
import { useCalibreWebStore } from '../src/stores/calibreWebStore';
import { calibreWebService } from '../src/services/calibreWebService';
import type { CalibreWebConnectionTest } from '../src/types/calibreWeb';

export default function CalibreWebScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Store state
  const servers = useCalibreWebStore((s) => s.servers);
  const activeServerId = useCalibreWebStore((s) => s.activeServerId);
  const isConnected = useCalibreWebStore((s) => s.isConnected);
  const isSyncing = useCalibreWebStore((s) => s.isSyncing);
  const lastSyncTime = useCalibreWebStore((s) => s.lastSyncTime);
  const syncedBooks = useCalibreWebStore((s) => s.syncedBooks);
  const addServer = useCalibreWebStore((s) => s.addServer);
  const setActiveServer = useCalibreWebStore((s) => s.setActiveServer);
  const setConnected = useCalibreWebStore((s) => s.setConnected);
  const setSyncing = useCalibreWebStore((s) => s.setSyncing);
  const setLastSyncTime = useCalibreWebStore((s) => s.setLastSyncTime);
  const setSyncedBooks = useCalibreWebStore((s) => s.setSyncedBooks);
  const removeServer = useCalibreWebStore((s) => s.removeServer);
  const loadState = useCalibreWebStore((s) => s.loadState);

  // Local form state
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [autoSync, setAutoSync] = useState(false);

  // UI state
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<CalibreWebConnectionTest | null>(null);

  // Load persisted state and populate form from active server
  useEffect(() => {
    loadState().then(() => {
      const store = useCalibreWebStore.getState();
      const activeServer = store.getActiveServer();
      if (activeServer) {
        setServerUrl(activeServer.serverUrl);
        setUsername(activeServer.username);
        setPassword(activeServer.password || '');
        setAutoSync(activeServer.syncMetadata ?? false);
      }
    });
  }, [loadState]);

  const testConnection = useCallback(async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await calibreWebService.testConnection(serverUrl, username, password);
      setTestResult(result);

      if (result.success) {
        setConnected(true);
        Alert.alert(
          'Connection Successful',
          `Connected to server.${result.bookCount !== undefined ? `\n${result.bookCount} books available.` : ''}\nResponse time: ${result.responseTime}ms`
        );
      } else {
        setConnected(false);
        Alert.alert('Connection Failed', result.error || 'Could not connect to server');
      }
    } catch (error) {
      setConnected(false);
      Alert.alert(
        'Connection Error',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsTesting(false);
    }
  }, [serverUrl, username, password, setConnected]);

  const saveCredentials = useCallback(async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setIsSaving(true);

    try {
      // Attempt login to get a token
      const loginSuccess = await calibreWebService.login(serverUrl, username, password);

      if (loginSuccess) {
        const currentServer = calibreWebService.getCurrentServer();
        if (currentServer) {
          // Add/update server in store
          addServer({
            ...currentServer,
            syncMetadata: autoSync,
          });
          setActiveServer(currentServer.id);
          setConnected(true);

          Alert.alert('Saved', 'Server credentials saved and connection established.');
        }
      } else {
        Alert.alert('Login Failed', 'Could not authenticate with the server. Please check your credentials.');
      }
    } catch (error) {
      Alert.alert(
        'Save Error',
        error instanceof Error ? error.message : 'Failed to save credentials'
      );
    } finally {
      setIsSaving(false);
    }
  }, [serverUrl, username, password, autoSync, addServer, setActiveServer, setConnected]);

  const syncLibrary = useCallback(async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please save credentials and connect first.');
      return;
    }

    setSyncing(true);

    try {
      const result = await calibreWebService.syncBooks(
        {
          syncMetadata: true,
          downloadCovers: true,
          downloadBooks: false,
          maxConcurrentDownloads: 3,
          retryFailedDownloads: false,
        }
      );

      setLastSyncTime(Date.now());

      if (result.success) {
        Alert.alert(
          'Sync Complete',
          `${result.booksSynced} books synced.\n${result.coversDownloaded} covers downloaded.\nDuration: ${(result.duration / 1000).toFixed(1)}s`
        );
      } else {
        const errorMsg = result.errors.length > 0 ? result.errors.join('\n') : 'Sync failed';
        Alert.alert('Sync Failed', errorMsg);
      }
    } catch (error) {
      Alert.alert(
        'Sync Error',
        error instanceof Error ? error.message : 'An unexpected error occurred during sync'
      );
    } finally {
      setSyncing(false);
    }
  }, [isConnected, setSyncing, setLastSyncTime]);

  const disconnectServer = useCallback(async () => {
    Alert.alert('Disconnect', 'Are you sure you want to disconnect from this server?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await calibreWebService.logout();
          if (activeServerId) {
            removeServer(activeServerId);
          }
          setConnected(false);
          setServerUrl('');
          setUsername('');
          setPassword('');
          setAutoSync(false);
          setTestResult(null);
        },
      },
    ]);
  }, [activeServerId, removeServer, setConnected]);

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Calibre-Web</Text>
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
            {isConnected ? 'Connected' : 'Not connected'}
          </Text>
        </View>

        {/* Server URL */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Server URL</Text>
        <TextInput
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="https://calibre.example.com"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!isTesting && !isSaving}
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
          ]}
        />

        {/* Username */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="username"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isTesting && !isSaving}
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
          ]}
        />

        {/* Password */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isTesting && !isSaving}
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
          ]}
        />

        {/* Auto-sync toggle */}
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 16 }}>Auto-sync on launch</Text>
          <Switch
            value={autoSync}
            onValueChange={setAutoSync}
            trackColor={{ true: theme.primary, false: theme.border }}
          />
        </View>

        {/* Test Connection Result */}
        {testResult && (
          <View
            style={[
              styles.testResultBox,
              {
                backgroundColor: testResult.success ? theme.success + '12' : theme.error + '12',
                borderColor: testResult.success ? theme.success : theme.error,
              },
            ]}
          >
            <Ionicons
              name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={testResult.success ? theme.success : theme.error}
            />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text
                style={{
                  color: testResult.success ? theme.success : theme.error,
                  fontWeight: '600',
                  fontSize: 14,
                }}
              >
                {testResult.success ? 'Connection successful' : 'Connection failed'}
              </Text>
              {testResult.bookCount !== undefined && (
                <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
                  {testResult.bookCount} books available
                </Text>
              )}
              {testResult.error && (
                <Text style={{ color: theme.error, fontSize: 13, marginTop: 2 }}>
                  {testResult.error}
                </Text>
              )}
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                Response time: {testResult.responseTime}ms
              </Text>
            </View>
          </View>
        )}

        {/* Test Connection Button */}
        <Pressable
          onPress={testConnection}
          disabled={isTesting || isSaving}
          style={[
            styles.button,
            styles.outlineButton,
            {
              borderColor: theme.primary,
              opacity: isTesting || isSaving ? 0.6 : 1,
            },
          ]}
        >
          {isTesting ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <>
              <Ionicons name="flash-outline" size={18} color={theme.primary} style={{ marginRight: 6 }} />
              <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 16 }}>
                Test Connection
              </Text>
            </>
          )}
        </Pressable>

        {/* Save Button */}
        <Pressable
          onPress={saveCredentials}
          disabled={isTesting || isSaving}
          style={[
            styles.button,
            {
              backgroundColor: theme.primary,
              opacity: isTesting || isSaving ? 0.6 : 1,
            },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                Save Credentials
              </Text>
            </>
          )}
        </Pressable>

        {/* Sync Section - only show when connected */}
        {isConnected && (
          <View style={{ marginTop: 24 }}>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Library Sync</Text>

            {/* Sync Stats */}
            <View style={[styles.statsRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  {syncedBooks.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Books Synced
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  {formatLastSync(lastSyncTime)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Last Synced
                </Text>
              </View>
            </View>

            {/* Sync Library Button */}
            <Pressable
              onPress={syncLibrary}
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
                    Sync Library
                  </Text>
                </>
              )}
            </Pressable>

            {/* Disconnect Button */}
            <Pressable
              onPress={disconnectServer}
              style={[
                styles.button,
                styles.outlineButton,
                { borderColor: theme.error, marginTop: 12 },
              ]}
            >
              <Ionicons name="log-out-outline" size={18} color={theme.error} style={{ marginRight: 6 }} />
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
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
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
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
});
