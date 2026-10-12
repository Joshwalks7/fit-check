import { supabase } from '../lib/supabase';

const TABLE = 'community_post';
const BUCKET = 'post-images';

// map a community_post row to the shape the UI uses
function toPost(row) {
  return {
    id: row.id,
    user_id: row['user id'],
    author_name: row.author_name,
    title: row.title,
    description: row.description,
    image_url: row.image,
    created_at: row.created_at,
  };
}

// get all community posts, newest first
export async function fetchPosts() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toPost);
}

// upload a picked image to storage and return its public url
async function uploadImage(userId, image) {
  const extension = image.uri.split('.').pop()?.split('?')[0] || 'jpg';
  const path = `${userId}/${Date.now()}.${extension}`;
  const body = await (await fetch(image.uri)).arrayBuffer();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: image.mimeType || 'image/jpeg' });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// create a post for the signed in user
export async function createPost({ image, title, description }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to post.');

  const imageUrl = image ? await uploadImage(user.id, image) : null;

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      'user id': user.id,
      author_name: user.user_metadata?.full_name || user.email,
      title,
      description,
      image: imageUrl,
    })
    .select()
    .single();
  if (error) throw error;
  return toPost(data);
}
