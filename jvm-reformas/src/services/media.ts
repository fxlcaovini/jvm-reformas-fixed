import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export async function pickImageOrVideo() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Permissão para acessar galeria não concedida.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.8,
    allowsMultipleSelection: false
  });

  if (result.canceled) return null;
  return result.assets[0];
}

export async function pickDocument() {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  return result.assets[0];
}
