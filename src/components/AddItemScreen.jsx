import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

const fields = [
  ['Name', 'Vintage graphic tee'],
  ['Description', 'Relaxed cotton shirt with a faded print.'],
  ['Category', 'Shirts'],
  ['Color', 'Washed black'],
  ['Brand', 'Thrifted'],
  ['Size', 'Medium'],
  ['Season', 'All season'],
  ['Style', 'Casual'],
  ['Notes', 'Good for layering.'],
]

function AddItemScreen({ onBack }) {
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
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
          <Text style={styles.camera}>＋</Text>
          <Text style={styles.photoTitle}>Add a clothing photo</Text>
          <Text style={styles.photoHint}>Choose from camera or photo library</Text>
        </Pressable>
        {fields.map(([label, placeholder]) => <View key={label} style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholder={placeholder} placeholderTextColor="#756e7d" style={styles.input} /></View>)}
        <Pressable onPress={onBack} style={styles.saveButton}><Text style={styles.saveText}>Save item</Text></Pressable>
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

            <Pressable style={styles.photoOption}>
              <Text style={styles.photoOptionText}>Take a photo</Text>
            </Pressable>

            <Pressable style={styles.photoOption}>
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
  photoTitle: { color: '#7651e8', fontSize: 14, fontWeight: '700', marginTop: 4 },
  photoHint: { color: '#756e7d', fontSize: 11, marginTop: 4 },
  field: { marginTop: 15 },
  label: { color: '#19171d', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 10, borderWidth: 1, color: '#19171d', fontSize: 14, paddingHorizontal: 12, paddingVertical: 11 },
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
