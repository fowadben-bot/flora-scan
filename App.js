import { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { PLANTNET_API_KEY, PLANTNET_PROJECT } from './config';

const ORGANS = [
  { key: 'auto', label: 'Auto' },
  { key: 'leaf', label: 'Feuille' },
  { key: 'flower', label: 'Fleur' },
  { key: 'fruit', label: 'Fruit' },
  { key: 'bark', label: 'Écorce' },
];

export default function App() {
  const [image, setImage] = useState(null);
  const [organ, setOrgan] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const resetAll = () => {
    setImage(null);
    setResults(null);
    setError(null);
  };

  const pickImage = async (fromCamera) => {
    resetAll();
    let permission;
    if (fromCamera) {
      permission = await ImagePicker.requestCameraPermissionsAsync();
    } else {
      permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
    if (!permission.granted) {
      Alert.alert('Permission refusée', "L'accès à la caméra/galerie est nécessaire.");
      return;
    }

    const pickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    };

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImage(asset);
      identify(asset);
    }
  };

  const identify = async (asset) => {
    if (!PLANTNET_API_KEY || PLANTNET_API_KEY.includes('REMPLACE_MOI')) {
      setError("Clé API Pl@ntNet manquante. Ajoute-la dans config.js.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const form = new FormData();
      form.append('organs', organ);
      form.append('images', {
        uri: asset.uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      });

      const url = `https://my-api.plantnet.org/v2/identify/${PLANTNET_PROJECT}?api-key=${PLANTNET_API_KEY}&lang=fr`;
      const response = await fetch(url, { method: 'POST', body: form });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erreur ${response.status}: ${text.slice(0, 200)}`);
      }

      const json = await response.json();
      setResults(json.results || []);
    } catch (e) {
      setError(e.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🌿</Text>
        <Text style={styles.title}>Flora Scan</Text>
        <Text style={styles.subtitle}>Identifie plantes, arbres et fleurs</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {image && (
          <Image source={{ uri: image.uri }} style={styles.preview} />
        )}

        {!loading && (
          <View style={styles.organRow}>
            {ORGANS.map((o) => (
              <TouchableOpacity
                key={o.key}
                style={[styles.chip, organ === o.key && styles.chipActive]}
                onPress={() => setOrgan(o.key)}
              >
                <Text style={[styles.chipText, organ === o.key && styles.chipTextActive]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4ade80" />
            <Text style={styles.loadingText}>Identification en cours…</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {results && results.length === 0 && !error && (
          <Text style={styles.noResult}>Aucune espèce reconnue. Essaie une autre photo.</Text>
        )}

        {results && results.length > 0 && (
          <View style={styles.results}>
            {results.slice(0, 5).map((r, idx) => (
              <View key={idx} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultName}>
                    {r.species?.commonNames?.[0] || r.species?.scientificNameWithoutAuthor}
                  </Text>
                  <Text style={styles.resultScore}>{Math.round(r.score * 100)}%</Text>
                </View>
                <Text style={styles.resultLatin}>{r.species?.scientificName}</Text>
                {r.species?.family?.scientificNameWithoutAuthor ? (
                  <Text style={styles.resultFamily}>
                    Famille : {r.species.family.scientificNameWithoutAuthor}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {(results || error) && (
          <TouchableOpacity style={styles.resetButton} onPress={resetAll}>
            <Text style={styles.resetButtonText}>↺ Nouvelle recherche</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={() => pickImage(true)}>
          <Text style={styles.buttonText}>📷 Prendre une photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => pickImage(false)}>
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>🖼️ Choisir une photo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1f14',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#4ade80',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#1a2e22',
  },
  organRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#1a2e22',
    borderWidth: 1,
    borderColor: '#2d4a37',
  },
  chipActive: {
    backgroundColor: '#4ade80',
    borderColor: '#4ade80',
  },
  chipText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#0f1f14',
  },
  loadingBox: {
    alignItems: 'center',
    marginTop: 30,
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  errorBox: {
    backgroundColor: '#3b1b1b',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  errorText: {
    color: '#fca5a5',
  },
  noResult: {
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 20,
  },
  results: {
    gap: 12,
  },
  resultCard: {
    backgroundColor: '#16241a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2d4a37',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultName: {
    color: '#f0fdf4',
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  resultScore: {
    color: '#4ade80',
    fontSize: 16,
    fontWeight: '800',
  },
  resultLatin: {
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 2,
    fontSize: 13,
  },
  resultFamily: {
    color: '#6b7280',
    marginTop: 4,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#4ade80',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#1a2e22',
    borderWidth: 1,
    borderColor: '#2d4a37',
  },
  buttonText: {
    color: '#0f1f14',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonTextSecondary: {
    color: '#4ade80',
  },
  resetButton: {
    marginTop: 20,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  resetButtonText: {
    color: '#9ca3af',
    fontWeight: '600',
  },
});
