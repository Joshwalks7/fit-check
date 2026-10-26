import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

// user sign up
export async function signUpWithEmail(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
  if (error) throw error;
  return data;
}

// sign user in
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// sign user out
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  try {
    const redirectUrl = makeRedirectUri({
      scheme: 'my-app', // Make sure this matches your app.json scheme or app slug
    });
    console.log('OAuth redirect URL:', redirectUrl);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });
    console.log('OAuth URL:', data?.url);
    console.log('Redirect URL:', redirectUrl);

    if (error) throw error;

    const res = await WebBrowser.openAuthSessionAsync(
      data?.url,
      redirectUrl
    );

    if (res.type === 'success') {
      const url = new URL(res.url);
      const queryParams = new URLSearchParams(url.search);
      const fragmentParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      const accessToken = queryParams.get('access_token') ?? fragmentParams.get('access_token');
      const refreshToken = queryParams.get('refresh_token') ?? fragmentParams.get('refresh_token');
      const authError = queryParams.get('error_description') ?? fragmentParams.get('error_description');

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) throw sessionError;
      } else if (authError) {
        throw new Error(authError);
      } else {
        throw new Error('Google sign-in did not return an authentication session.');
      }
    } else if (res.type === 'cancel' || res.type === 'dismiss') {
      return;
    } else {
      throw new Error('Google sign-in was not completed.');
    }
  } catch (error) {
    console.error('Google Auth Error:', error);
    throw error;
  }
}