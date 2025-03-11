import { supabase } from './supabase.js';

export async function createUser(phoneNumber, firstName) {
  const { data, error } = await supabase
    .from('users')
    .insert([{
      phone_number: phoneNumber,
      first_name: firstName
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function findUserByPhone(phoneNumber) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createGift(giftData) {
  const { data, error } = await supabase
    .from('gifts')
    .insert([giftData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function findGiftById(giftId) {
  const { data, error } = await supabase
    .from('gifts')
    .select(`
      *,
      media (*),
      reactions (*)
    `)
    .eq('id', giftId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateGiftStatus(giftId, status) {
  const { error } = await supabase
    .from('gifts')
    .update({ status })
    .eq('id', giftId);

  if (error) throw error;
}

export async function createMedia(mediaData) {
  const { data, error } = await supabase
    .from('media')
    .insert([mediaData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createReaction(reactionData) {
  const { data, error } = await supabase
    .from('reactions')
    .insert([reactionData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function recordScan(giftId, receiverPhone) {
  const { data, error } = await supabase
    .from('scans')
    .insert([{
      gift_id: giftId,
      receiver_phone: receiverPhone
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadFile(bucket, file, path) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file);

  if (error) throw error;
  return data;
}

export async function getFileUrl(bucket, path) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}
