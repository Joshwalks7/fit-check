import { useState } from 'react'
import CommunityFeed from './community/CommunityFeed.jsx'
import ProfileScreen from './ProfileScreen.jsx'

export default function CommunityScreen() {
  const [selectedProfile, setSelectedProfile] = useState(null)
  if (selectedProfile) return <ProfileScreen isPublic onBack={() => setSelectedProfile(null)} profile={selectedProfile} user={{ id: selectedProfile.id }} />
  return <CommunityFeed onOpenProfile={setSelectedProfile} />
}
