import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';


const SEASONS = [
  { label: "Spring", value: "spring" },
  { label: "Summer", value: "summer" },
  { label: "Fall", value: "fall" },
  { label: "Winter", value: "winter" },
];

const STYLES = [
  { label: "Casual", value: "casual" },
  { label: "Smart Casual", value: "smart_casual" },
  { label: "Formal", value: "formal" },
  { label: "Streetwear", value: "streetwear" },
  { label: "Athletic", value: "athletic" },
  { label: "Outdoor", value: "outdoor" },
  { label: "Workwear", value: "workwear" },
  { label: "Minimalist", value: "minimalist" },
  { label: "Preppy", value: "preppy" },
  { label: "Bohemian", value: "bohemian" },
];

const CATEGORIES = [
  { label: "Hats", value: "hats" },
  { label: "Accessories", value: "accessories" },
  { label: "Shirts", value: "shirts" },
  { label: "Pants", value: "pants" },
  { label: "Shoes", value: "shoes" },
  { label: "Outerwear", value: "outerwear" },
];

const FIELDS = [
  ['Name', 'Vintage graphic tee'],
  ['Description', 'Relaxed cotton shirt with a faded print.'],
  ['Color', 'Washed black'],
  ['Brand', 'Thrifted'],
  ['Size', 'Medium']
]

const fieldKey = (label) => label.toLowerCase().replaceAll(' ', '_')

function toggleSelection(value, selected, setSelected) {
  if (selected.includes(value)) {
    setSelected(selected.filter(item => item !== value));
  } else {
    setSelected([...selected, value]);
  }
}

function AddItemScreen({ onBack }) {
  const [selectedImage, setSelectedImage] = useState(null)
  const [item, setItem] = useState(() => Object.fromEntries(FIELDS.map(([label]) => [fieldKey(label), ''])))
  const [loading, setLoading] = useState(false)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
  const [selectedSeasons, setSelectedSeasons] = useState([]);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  const pickImage = async (source) => {
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.7,
        })

    setShowPhotoOptions(false)
    if (!result.canceled) setSelectedImage(result.assets[0])
  }

  const pushImgDataToSupabase = async () => {
    if (!selectedImage?.uri) {
      Alert.alert('Add a photo', 'Choose a clothing photo before saving.')
      return
    }

    if(!CATEGORIES.some(option => option.value === selectedCategory)){      
      Alert.alert(
        "Invalid category",
        "Please select a clothing category."
      );
      return;
    }

    setLoading(true)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError ?? new Error('Not logged in')

      // The local URI is converted to the image bytes that Storage receives.
      const response = await fetch(selectedImage.uri)
      const blob = await response.blob()
      const filePath = `${user.id}/${Date.now()}.jpg`

      const { data: uploadedFile, error: uploadError } = await supabase.storage
        .from('Clothing_item_pics')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: false })

      if (uploadError) throw uploadError

      const validCategories = CATEGORIES.map(
  category => category.value
);

      const { data: clothingItem, error: itemError } =
  await supabase
    .from("clothing_items")
    .insert({
      user_id: user.id,
      name: item.name,
      category: selectedCategory,
      color: item.color,
      brand: item.brand,
      size: item.size,
      description: item.description,
      seasons: selectedSeasons,
      styles: selectedStyles
    })
    .select("id")
    .single();

      if (itemError) {
        console.log("Clothing item insert failed:", {
          message: itemError.message,
          details: itemError.details,
          hint: itemError.hint,
          code: itemError.code
        });
        throw itemError;
      }

      const { error: insertError } = await supabase
        .from('clothing_item_images')
        .insert({ file_path: uploadedFile.path, clothing_item_id: clothingItem.id })

      if (insertError) throw insertError
      console.log("Inserting clothing item:", {
        user_id: user.id,
        ...item
      });
      Alert.alert('Saved', 'Your clothing photo was uploaded.')
      onBack()
    } catch (error) {
      Alert.alert('Could not save item', error.message)
    } finally {
      setLoading(false)
    }
  }


  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable accessibilityRole="button" onPress={onBack}><Text style={styles.back}>‹ Back</Text></Pressable><Text style={styles.title}>Add item</Text><View style={styles.spacer} /></View>
        <Text style={styles.subtitle}>Add a piece to your digital closet.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowPhotoOptions(true)}
          style={styles.photoPicker}
        >
          {selectedImage ? <Image source={{ uri: selectedImage.uri }} style={styles.preview} /> : <Text style={styles.camera}>＋</Text>}
          <Text style={styles.photoTitle}>{selectedImage ? 'Change clothing photo' : 'Add a clothing photo'}</Text>
          <Text style={styles.photoHint}>Choose from camera or photo library</Text>
        </Pressable>
        {FIELDS.map(([label, placeholder]) => {
          const key = fieldKey(label)
          return <View key={label} style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={item[key]} onChangeText={(value) => setItem((current) => ({ ...current, [key]: value }))} placeholder={placeholder} placeholderTextColor="#756e7d" style={styles.input} /></View>
        })}
        <View style={styles.selectionSection}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((option) => {
              const selected = selectedCategory === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setSelectedCategory(option.value)}
                  style={[
                    styles.chip,
                    selected && styles.selectedChip
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.selectedChipText
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.selectionSection}>
          <Text style={styles.label}>Seasons</Text>
          <View style={styles.chipRow}>
            {SEASONS.map(option => (
            <Pressable
              key={option.value}
              onPress={() =>
                toggleSelection(
                  option.value,
                  selectedSeasons,
                  setSelectedSeasons
                )
              }
            >
              <Text>
                {selectedSeasons.includes(option.value) ? "✓ " : ""}
                {option.label}
              </Text>
            </Pressable>
          ))}
          </View>
        </View>
        <View style={styles.selectionSection}>
          <Text style={styles.label}>Styles</Text>
          <View style={styles.chipRow}>
            {STYLES.map(option => (
              <Pressable
              key={option.value}
              onPress={() =>
                toggleSelection(
                  option.value,
                  selectedStyles,
                  setSelectedStyles
                )
              }
              >
                <Text>
                  {selectedStyles.includes(option.value) ? "✓ " : ""}
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Pressable disabled={loading} onPress={pushImgDataToSupabase} style={styles.saveButton}><Text style={styles.saveText}>{loading ? 'Saving…' : 'Save item'}</Text></Pressable>
      </ScrollView>
      <Modal
        animationType="fade"
        transparent
        visible={showPhotoOptions}
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.photoModal}>
            <Text style={styles.modalTitle}>Add clothing photo</Text>

            <Pressable onPress={() => pickImage('camera')} style={styles.photoOption}>
              <Text style={styles.photoOptionText}>Take a photo</Text>
            </Pressable>

            <Pressable onPress={() => pickImage('library')} style={styles.photoOption}>
              <Text style={styles.photoOptionText}>Choose from photo library</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowPhotoOptions(false)}
              style={styles.cancelOption}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fbfafc', flex: 1 },
  content: { paddingBottom: 30, paddingHorizontal: 20, paddingTop: 22 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  back: { color: '#7651e8', fontSize: 14, fontWeight: '700' },
  title: { color: '#19171d', fontSize: 22, fontWeight: '700' },
  spacer: { width: 45 },
  subtitle: { color: '#756e7d', fontSize: 13, marginTop: 8 },
  photoPicker: { alignItems: 'center', backgroundColor: '#eee9ff', borderColor: '#d9ccff', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, marginTop: 22, paddingVertical: 24 },
  camera: { color: '#7651e8', fontSize: 29, fontWeight: '300' },
  preview: { borderRadius: 12, height: 140, width: '100%' },
  photoTitle: { color: '#7651e8', fontSize: 14, fontWeight: '700', marginTop: 4 },
  photoHint: { color: '#756e7d', fontSize: 11, marginTop: 4 },
  field: { marginTop: 15 },
  label: { color: '#19171d', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 10, borderWidth: 1, color: '#19171d', fontSize: 14, paddingHorizontal: 12, paddingVertical: 11 },
  selectionSection: { marginTop: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  selectedChip: { backgroundColor: '#eee9ff', borderColor: '#7651e8' },
  chipText: { color: '#756e7d', fontSize: 12, fontWeight: '600' },
  selectedChipText: { color: '#7651e8' },
  saveButton: { backgroundColor: '#7651e8', borderRadius: 11, marginTop: 24, paddingVertical: 13 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  modalBackdrop: {
  alignItems: 'center',
  backgroundColor: '#19171d99',
  flex: 1,
  justifyContent: 'center',
  padding: 20,
},

  photoModal: {
  backgroundColor: '#fff',
  borderRadius: 18,
  padding: 20,
  width: '100%',
},

  modalTitle: {
  color: '#19171d',
  fontSize: 18,
  fontWeight: '700',
  marginBottom: 10,
},

photoOption: {
  borderBottomColor: '#e7e2eb',
  borderBottomWidth: 1,
  paddingVertical: 15,
},

photoOptionText: {
  color: '#19171d',
  fontSize: 14,
},

cancelOption: {
  paddingTop: 15,
},

cancelText: {
  color: '#7651e8',
  fontSize: 14,
  fontWeight: '700',
  textAlign: 'center',
},
})

export default AddItemScreen
