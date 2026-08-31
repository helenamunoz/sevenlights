import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBoards } from '@/lib/store';
import { isSyncConfigured } from '@/lib/supabase';
import { color, font, radius, space } from '@/theme/tokens';

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, sync, syncNow, signIn, verify, signOut } = useBoards();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attempt(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo falló. Probá de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space.md,
          paddingBottom: insets.bottom + space.xl,
          paddingHorizontal: space.lg,
        }}
        keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
          <Text style={styles.back}>← Columna</Text>
        </Pressable>

        <Text style={styles.title}>Sincronización</Text>

        {!isSyncConfigured ? (
          <View style={styles.card}>
            <Text style={styles.body}>
              Los tableros viven solo en este teléfono. Para verlos también en la web hay que
              conectar Supabase: copiá <Text style={styles.mono}>.env.example</Text> a{' '}
              <Text style={styles.mono}>.env.local</Text>, poné la URL y la anon key del proyecto, y
              corré el SQL de <Text style={styles.mono}>supabase/schema.sql</Text>.
            </Text>
            <Text style={styles.bodyFaint}>Los pasos completos están en el README.</Text>
          </View>
        ) : session ? (
          <View style={styles.card}>
            <Text style={styles.label}>Sesión</Text>
            <Text style={styles.body}>{session.user.email}</Text>

            <Text style={[styles.label, styles.spaced]}>Estado</Text>
            <Text style={styles.body}>
              {sync.status === 'syncing'
                ? 'Sincronizando…'
                : sync.status === 'error'
                  ? sync.message
                  : sync.status === 'idle' && sync.lastSyncedAt
                    ? `Última vez: ${new Date(sync.lastSyncedAt).toLocaleString('es-UY')}`
                    : 'Sin sincronizar todavía'}
            </Text>

            <Pressable
              style={styles.primary}
              onPress={() => attempt(syncNow)}
              disabled={sync.status === 'syncing'}>
              <Text style={styles.primaryText}>Sincronizar ahora</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => attempt(signOut)}>
              <Text style={styles.secondaryText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            {stage === 'email' ? (
              <>
                <Text style={styles.label}>Tu email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="vos@ejemplo.com"
                  placeholderTextColor={color.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.input}
                />
                <Text style={styles.bodyFaint}>Te mandamos un código de seis dígitos.</Text>
                <Pressable
                  style={styles.primary}
                  disabled={busy || !email.includes('@')}
                  onPress={() =>
                    attempt(async () => {
                      await signIn(email.trim());
                      setStage('code');
                    })
                  }>
                  {busy ? (
                    <ActivityIndicator color={color.ink} />
                  ) : (
                    <Text style={styles.primaryText}>Enviar código</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.label}>Código</Text>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  placeholderTextColor={color.textFaint}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, styles.code]}
                />
                <Pressable
                  style={styles.primary}
                  disabled={busy || code.length < 6}
                  onPress={() => attempt(() => verify(email.trim(), code.trim()))}>
                  {busy ? (
                    <ActivityIndicator color={color.ink} />
                  ) : (
                    <Text style={styles.primaryText}>Entrar</Text>
                  )}
                </Pressable>
                <Pressable style={styles.secondary} onPress={() => setStage('email')}>
                  <Text style={styles.secondaryText}>Usar otro email</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ink },
  backRow: { paddingVertical: space.sm, alignSelf: 'flex-start' },
  back: { fontFamily: font.body, fontSize: 14, color: color.textSoft },
  title: {
    fontFamily: font.display,
    fontSize: 36,
    color: color.text,
    marginTop: space.md,
    marginBottom: space.lg,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    padding: space.lg,
    gap: space.sm,
  },
  label: {
    fontFamily: font.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.textFaint,
  },
  spaced: { marginTop: space.md },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 23, color: color.text },
  bodyFaint: { fontFamily: font.body, fontSize: 13, lineHeight: 20, color: color.textFaint },
  mono: { fontFamily: font.bodyMedium, color: color.textSoft },
  input: {
    backgroundColor: color.ink2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.line,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontFamily: font.body,
    fontSize: 16,
    color: color.text,
  },
  code: { fontSize: 22, letterSpacing: 6, textAlign: 'center' },
  primary: {
    marginTop: space.md,
    backgroundColor: color.text,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  primaryText: { fontFamily: font.bodyBold, fontSize: 14, color: color.ink },
  secondary: { marginTop: space.sm, paddingVertical: space.sm, alignItems: 'center' },
  secondaryText: { fontFamily: font.body, fontSize: 13, color: color.textSoft },
  error: {
    fontFamily: font.body,
    fontSize: 13,
    color: color.danger,
    marginTop: space.md,
    textAlign: 'center',
  },
});
