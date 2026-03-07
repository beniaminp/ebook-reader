import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';

export default function CalibreWebScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [autoSync, setAutoSync] = useState(false);

  const testConnection = () => {
    if (!serverUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }
    Alert.alert('Testing', 'Connection test will be implemented');
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
        <Text style={[styles.label, { color: theme.textSecondary }]}>Server URL</Text>
        <TextInput
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="https://calibre.example.com"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          keyboardType="url"
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        />
        <Text style={[styles.label, { color: theme.textSecondary }]}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="username"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        />
        <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        />
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 16 }}>Auto-sync on launch</Text>
          <Switch value={autoSync} onValueChange={setAutoSync} trackColor={{ true: theme.primary }} />
        </View>
        <Pressable onPress={testConnection} style={[styles.button, { backgroundColor: theme.primary }]}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Test Connection</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  button: { height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
});
