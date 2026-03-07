import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';
import { useCloudSyncStore } from '../src/stores/cloudSyncStore';
import type { CloudProviderType } from '../src/types/cloudSync';

interface ProviderInfo {
  id: CloudProviderType;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  needsCredentials: boolean;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'google-drive',
    title: 'Google Drive',
    icon: 'cloud',
    description: 'Google Cloud backup & sync',
    needsCredentials: false,
  },
  {
    id: 'dropbox',
    title: 'Dropbox',
    icon: 'folder',
    description: 'Sync via Dropbox',
    needsCredentials: false,
  },
  {
    id: 'webdav',
    title: 'WebDAV',
    icon: 'server',
    description: 'Self-hosted sync',
    needsCredentials: true,
  },
];

export default function CloudSyncScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Store state
  const connectedProvider = useCloudSyncStore((s) => s.connectedProvider);
  const storeIsConnected = useCloudSyncStore((s) => s.isConnected);
  const syncStatus = useCloudSyncStore((s) => s.syncStatus);
  const lastSyncTime = useCloudSyncStore((s) => s.lastSyncTime);
  const accountEmail = useCloudSyncStore((s) => s.accountEmail);
  const error = useCloudSyncStore((s) => s.error);
  const syncProgress = useCloudSyncStore((s) => s.syncProgress);

  // Store actions
  const connect = useCloudSyncStore((s) => s.connect);
  const disconnect = useCloudSyncStore((s) => s.disconnect);
  const initialize = useCloudSyncStore((s) => s.initialize);
  const manualSync = useCloudSyncStore((s) => s.manualSync);
  const clearError = useCloudSyncStore((s) => s.clearError);

  // UI state
  const [expandedProvider, setExpandedProvider] = useState<CloudProviderType | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<CloudProviderType | null>(null);

  // WebDAV form state
  const [webdavUrl, setWebdavUrl] = useState('');
  const [webdavUsername, setWebdavUsername] = useState('');
  const [webdavPassword, setWebdavPassword] = useState('');

  useEffect(() => {
    initialize();
  }, [initialize]);

  const isProviderConnected = (providerId: CloudProviderType) => {
    return storeIsConnected && connectedProvider === providerId;
  };

  const handleConnect = useCallback(
    async (providerId: CloudProviderType) => {
      // If already connected to a different provider, warn
      if (storeIsConnected && connectedProvider && connectedProvider !== providerId) {
        Alert.alert(
          'Already Connected',
          `You are currently connected to ${getProviderTitle(connectedProvider)}. Disconnect first before connecting to a different provider.`
        );
        return;
      }

      setConnectingProvider(providerId);
      clearError();

      try {
        let success = false;

        if (providerId === 'webdav') {
          if (!webdavUrl.trim()) {
            Alert.alert('Error', 'Please enter a WebDAV server URL');
            setConnectingProvider(null);
            return;
          }
          success = await connect(providerId, {
            provider: providerId,
            serverUrl: webdavUrl,
            username: webdavUsername,
            password: webdavPassword,
          });
        } else {
          // For Google Drive and Dropbox, use simple token-based connect
          success = await connect(providerId, {
            provider: providerId,
          });
        }

        if (success) {
          setExpandedProvider(null);
          Alert.alert('Connected', `Successfully connected to ${getProviderTitle(providerId)}.`);
        } else {
          const state = useCloudSyncStore.getState();
          Alert.alert(
            'Connection Failed',
            state.error || `Could not connect to ${getProviderTitle(providerId)}.`
          );
        }
      } catch (err) {
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'An unexpected error occurred'
        );
      } finally {
        setConnectingProvider(null);
      }
    },
    [storeIsConnected, connectedProvider, connect, clearError, webdavUrl, webdavUsername, webdavPassword]
  );

  const handleDisconnect = useCallback(
    (providerId: CloudProviderType) => {
      Alert.alert(
        'Disconnect',
        `Are you sure you want to disconnect from ${getProviderTitle(providerId)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              await disconnect();
              setExpandedProvider(null);
              setWebdavUrl('');
              setWebdavUsername('');
              setWebdavPassword('');
            },
          },
        ]
      );
    },
    [disconnect]
  );

  const handleSyncNow = useCallback(async () => {
    await manualSync();
    Alert.alert('Sync', 'Sync initiated. This feature is being implemented.');
  }, [manualSync]);

  const formatLastSync = (timestamp: number) => {
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

  const toggleProvider = (providerId: CloudProviderType) => {
    setExpandedProvider(expandedProvider === providerId ? null : providerId);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Cloud Sync</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Error Banner */}
        {error && (
          <Pressable
            onPress={clearError}
            style={[styles.errorBanner, { backgroundColor: theme.error + '15', borderColor: theme.error }]}
          >
            <Ionicons name="alert-circle" size={18} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]} numberOfLines={2}>
              {error}
            </Text>
            <Ionicons name="close" size={16} color={theme.error} />
          </Pressable>
        )}

        {/* Provider Cards */}
        {PROVIDERS.map((provider) => {
          const connected = isProviderConnected(provider.id);
          const isExpanded = expandedProvider === provider.id;
          const isConnecting = connectingProvider === provider.id;
          const isSyncingNow = connected && syncStatus === 'syncing';

          return (
            <View key={provider.id} style={{ marginBottom: 12 }}>
              {/* Card Header */}
              <Pressable
                onPress={() => toggleProvider(provider.id)}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: connected ? theme.success : theme.border,
                    borderBottomLeftRadius: isExpanded ? 0 : 12,
                    borderBottomRightRadius: isExpanded ? 0 : 12,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBg,
                    { backgroundColor: connected ? theme.success + '18' : theme.background },
                  ]}
                >
                  <Ionicons
                    name={provider.icon}
                    size={24}
                    color={connected ? theme.success : theme.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{provider.title}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                    {provider.description}
                  </Text>
                  {connected && accountEmail && (
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                      {accountEmail}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: connected ? theme.success + '18' : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: connected ? theme.success : theme.textSecondary,
                        fontSize: 11,
                        fontWeight: '600',
                      }}
                    >
                      {connected ? 'Connected' : 'Not connected'}
                    </Text>
                  </View>
                  {connected && lastSyncTime > 0 && (
                    <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                      {formatLastSync(lastSyncTime)}
                    </Text>
                  )}
                </View>
              </Pressable>

              {/* Expanded Section */}
              {isExpanded && (
                <View
                  style={[
                    styles.expandedSection,
                    {
                      backgroundColor: theme.surface,
                      borderColor: connected ? theme.success : theme.border,
                    },
                  ]}
                >
                  {connected ? (
                    /* Connected state: show sync button and disconnect */
                    <View>
                      {/* Sync Progress */}
                      {isSyncingNow && syncProgress && (
                        <View style={[styles.progressBox, { backgroundColor: theme.background }]}>
                          <ActivityIndicator size="small" color={theme.primary} />
                          <Text
                            style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 8 }}
                          >
                            {syncProgress.currentOperation || 'Syncing...'}
                          </Text>
                        </View>
                      )}

                      {/* Sync Now Button */}
                      <Pressable
                        onPress={handleSyncNow}
                        disabled={isSyncingNow}
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor: theme.primary,
                            opacity: isSyncingNow ? 0.6 : 1,
                          },
                        ]}
                      >
                        {isSyncingNow ? (
                          <>
                            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.actionButtonText}>Syncing...</Text>
                          </>
                        ) : (
                          <>
                            <Ionicons
                              name="sync-outline"
                              size={16}
                              color="#fff"
                              style={{ marginRight: 6 }}
                            />
                            <Text style={styles.actionButtonText}>Sync Now</Text>
                          </>
                        )}
                      </Pressable>

                      {/* Disconnect Button */}
                      <Pressable
                        onPress={() => handleDisconnect(provider.id)}
                        style={[
                          styles.actionButton,
                          styles.outlineActionButton,
                          { borderColor: theme.error, marginTop: 8 },
                        ]}
                      >
                        <Ionicons
                          name="log-out-outline"
                          size={16}
                          color={theme.error}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.actionButtonText, { color: theme.error }]}>
                          Disconnect
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    /* Disconnected state: show connect form */
                    <View>
                      {provider.id === 'webdav' ? (
                        /* WebDAV: show URL, username, password fields */
                        <View>
                          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                            Server URL
                          </Text>
                          <TextInput
                            value={webdavUrl}
                            onChangeText={setWebdavUrl}
                            placeholder="https://dav.example.com/files"
                            placeholderTextColor={theme.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                            editable={!isConnecting}
                            style={[
                              styles.fieldInput,
                              {
                                color: theme.text,
                                borderColor: theme.border,
                                backgroundColor: theme.background,
                              },
                            ]}
                          />

                          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                            Username
                          </Text>
                          <TextInput
                            value={webdavUsername}
                            onChangeText={setWebdavUsername}
                            placeholder="username"
                            placeholderTextColor={theme.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!isConnecting}
                            style={[
                              styles.fieldInput,
                              {
                                color: theme.text,
                                borderColor: theme.border,
                                backgroundColor: theme.background,
                              },
                            ]}
                          />

                          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                            Password
                          </Text>
                          <TextInput
                            value={webdavPassword}
                            onChangeText={setWebdavPassword}
                            placeholder="password"
                            placeholderTextColor={theme.textMuted}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!isConnecting}
                            style={[
                              styles.fieldInput,
                              {
                                color: theme.text,
                                borderColor: theme.border,
                                backgroundColor: theme.background,
                              },
                            ]}
                          />
                        </View>
                      ) : (
                        /* Google Drive / Dropbox: simple description */
                        <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 12 }}>
                          {provider.id === 'google-drive'
                            ? 'Sign in with your Google account to back up and sync your reading data.'
                            : 'Connect your Dropbox account to sync books and reading progress.'}
                        </Text>
                      )}

                      {/* Connect Button */}
                      <Pressable
                        onPress={() => handleConnect(provider.id)}
                        disabled={isConnecting}
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor: theme.primary,
                            opacity: isConnecting ? 0.6 : 1,
                          },
                        ]}
                      >
                        {isConnecting ? (
                          <>
                            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.actionButtonText}>Connecting...</Text>
                          </>
                        ) : (
                          <>
                            <Ionicons
                              name={
                                provider.id === 'google-drive'
                                  ? 'log-in-outline'
                                  : provider.id === 'dropbox'
                                    ? 'link-outline'
                                    : 'server-outline'
                              }
                              size={16}
                              color="#fff"
                              style={{ marginRight: 6 }}
                            />
                            <Text style={styles.actionButtonText}>
                              {provider.id === 'google-drive'
                                ? 'Sign In'
                                : provider.id === 'dropbox'
                                  ? 'Connect'
                                  : 'Connect'}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function getProviderTitle(providerId: CloudProviderType): string {
  const map: Record<CloudProviderType, string> = {
    'google-drive': 'Google Drive',
    dropbox: 'Dropbox',
    webdav: 'WebDAV',
  };
  return map[providerId] || providerId;
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    marginHorizontal: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expandedSection: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 10,
  },
  fieldInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  actionButton: {
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    flexDirection: 'row',
  },
  outlineActionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
});
