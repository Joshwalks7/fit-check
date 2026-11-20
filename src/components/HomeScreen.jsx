import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import TodayFitCard from './FitOfTheDayCard.jsx'
import PostStreakCard from './PostStreakCard.jsx'
import ForgottenItemCard from './ForgottenItemCard.jsx'

function initials(name = '') {
  return name.split(/[\s@]/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}

export default function HomeScreen({ user, profile, onRecordToday, onRecordPast, onWearForgotten, onListForgotten, fitRefreshKey, sharedToday }) {
  const name = profile?.full_name || user.user_metadata?.full_name || user.email
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.summary}>
    <View style={styles.topbar}><Text style={styles.title}>Home</Text>{profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} /> : <View style={styles.avatar}><Text style={styles.avatarText}>{initials(name)}</Text></View>}</View>
    <View style={styles.summaryRow}><PostStreakCard userId={user.id} compact /><TodayFitCard embedded key={fitRefreshKey} onRecordPast={onRecordPast} onRecordToday={onRecordToday} shared={sharedToday} /></View>
    </View>
    <ForgottenItemCard onList={onListForgotten} onWear={onWearForgotten} />
  </ScrollView>
}

const styles = StyleSheet.create({ content: { paddingBottom: 24 }, summary: { paddingHorizontal: 18, paddingTop: 22 }, topbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }, title: { color: '#19171d', fontSize: 26, fontWeight: '600', letterSpacing: -0.7 }, avatar: { alignItems: 'center', backgroundColor: '#f7c2a1', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 }, avatarText: { color: '#4a2a20', fontSize: 14, fontWeight: '700' }, summaryRow: { gap: 12 } })
