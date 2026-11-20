import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { DEFAULT_FILTERS } from '../../hooks/useCommunityFeed.js'

function initials(name = '') {
  return name.split(/[\s@]/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}

export default function FeedToolbar({ feed, onCreate, onFilter, onOpenProfile }) {
  const filterCount = Object.keys(DEFAULT_FILTERS).filter((key) => feed.filters[key] !== DEFAULT_FILTERS[key]).length
  return (
    <>
      <View style={styles.header}>
        <View><Text style={styles.title}>Community</Text><Text style={styles.subtitle}>Check your fit</Text></View>
        <Pressable accessibilityRole="button" onPress={onCreate} style={styles.createButton}><Text style={styles.createText}>＋ Create post</Text></Pressable>
      </View>
      <View style={styles.searchRow}>
        <TextInput
          autoCapitalize="words"
          onChangeText={feed.setSearchQuery}
          onSubmitEditing={() => feed.searchUsers(feed.searchQuery)}
          placeholder="Search people"
          placeholderTextColor="#756e7d"
          returnKeyType="search"
          style={styles.searchInput}
          value={feed.searchQuery}
        />
        <Pressable accessibilityRole="button" onPress={() => feed.searchUsers(feed.searchQuery)} style={styles.searchButton}><Text style={styles.buttonText}>Search</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={onFilter} style={[styles.searchButton, filterCount > 0 && styles.activeFilter]}><Text style={[styles.buttonText, filterCount > 0 && styles.activeFilterText]}>Filter{filterCount ? ` · ${filterCount}` : ''}</Text></Pressable>
      </View>
      {feed.searching && <ActivityIndicator color="#7651e8" style={styles.loader} />}
      {!!feed.searchError && <Text style={styles.error}>{feed.searchError}</Text>}
      {!feed.searching && feed.searchQuery.trim() && !feed.searchError && !feed.searchResults.length && <Text style={styles.muted}>No people found.</Text>}
      {!!feed.searchResults.length && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>People</Text>
          {feed.searchResults.map((result) => (
            <Pressable key={result.id} accessibilityRole="button" onPress={() => onOpenProfile(result)} style={styles.result}>
              {result.avatar_url ? <Image source={{ uri: result.avatar_url }} style={styles.avatar} /> : <View style={styles.avatar}><Text style={styles.avatarText}>{initials(result.full_name)}</Text></View>}
              <Text numberOfLines={1} style={styles.name}>{result.full_name || 'Unnamed user'}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  title: { color: '#19171d', fontSize: 26, fontWeight: '600', letterSpacing: -0.7 },
  subtitle: { color: '#756e7d', fontSize: 12, marginTop: 5 },
  createButton: { backgroundColor: '#7651e8', borderRadius: 11, paddingHorizontal: 11, paddingVertical: 10 },
  createText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  searchInput: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 10, borderWidth: 1, color: '#19171d', flex: 1, fontSize: 14, paddingHorizontal: 11, paddingVertical: 9 },
  searchButton: { backgroundColor: '#eee9ff', borderRadius: 10, justifyContent: 'center', paddingHorizontal: 12 },
  buttonText: { color: '#7651e8', fontSize: 12, fontWeight: '700' },
  activeFilter: { backgroundColor: '#7651e8' },
  activeFilterText: { color: '#fff' },
  loader: { marginBottom: 12 },
  error: { color: '#c0392b', fontSize: 12, marginBottom: 12 },
  muted: { color: '#756e7d', fontSize: 12, marginBottom: 12 },
  results: { backgroundColor: '#fff', borderColor: '#e7e2eb', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 10 },
  resultsTitle: { color: '#19171d', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  result: { alignItems: 'center', flexDirection: 'row', paddingVertical: 7 },
  avatar: { alignItems: 'center', backgroundColor: '#f7c2a1', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  avatarText: { color: '#4a2a20', fontSize: 10, fontWeight: '700' },
  name: { color: '#19171d', flex: 1, fontSize: 13, fontWeight: '600', marginLeft: 9 },
})
