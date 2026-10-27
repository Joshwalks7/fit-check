import { supabase } from '../lib/supabase';

const TABLE = 'community_post';
const PROFILE_TABLE = 'profiles';
const BUCKET = 'post-images';

// map a community_post row to the shape the UI uses
function toPost(row, profileByUserId = {}) {
  return {
    id: row.id,
    user_id: row['user_id'],
    author_name: row.author_name,
    avatar_url: profileByUserId[row['user_id']]?.avatar_url || null,
    title: row.title,
    description: row.description,
    image_url: row.image,
    created_at: row.created_at,
  };
}

async function addProfileImages(rows) {
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  if (!userIds.length) return rows.map((row) => toPost(row));

  const { data: profiles, error } = await supabase
    .from(PROFILE_TABLE)
    .select('id, avatar_url')
    .in('id', userIds);
  if (error) throw error;

  const profileByUserId = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
  return rows.map((row) => toPost(row, profileByUserId));
}

// get all community posts, newest first
export async function fetchPosts() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return addProfileImages(data);
}

// get posts created by one user, newest first
export async function fetchPostsByUser(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return addProfileImages(data);
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
      'user_id': user.id,
      author_name: user.user_metadata?.full_name || user.email,
      title,
      description,
      image: imageUrl,
    })
    .select()
    .single();
  if (error) throw error;
  return (await addProfileImages([data]))[0];
}

export async function fetchFitOfTheDay() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data: posts, error } = await supabase
    .from(TABLE)
    .select('*')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: true });
  if (error) throw error;
  if (!posts.length) return null;

  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('post_id')
    .in('post_id', posts.map((post) => post.id));
  if (commentsError) throw commentsError;

  const countByPostId = {};
  comments.forEach((comment) => {
    countByPostId[comment.post_id] = (countByPostId[comment.post_id] || 0) + 1;
  });

  const top = posts.reduce((best, post) => (
    (countByPostId[post.id] || 0) > (countByPostId[best.id] || 0) ? post : best
  ));

  const [post] = await addProfileImages([top]);
  return { ...post, comment_count: countByPostId[top.id] || 0 };
}
