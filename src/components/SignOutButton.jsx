import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { signOutUser } from '../services/auth';

export default function SignOutButton() {
  const handleSignOut = async () => {
    try {
      await signOutUser();
      // App.jsx will automatically switch back to LoginScreen 
      // because the Supabase auth state listener updates session to null.
    } catch (error) {
      Alert.alert('Error signing out', error.message);
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleSignOut}>
      <Text style={styles.buttonText}>Sign Out</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ff3b30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});