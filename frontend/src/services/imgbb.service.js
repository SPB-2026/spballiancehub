// src/services/imgbb.service.js

export async function uploadDirectToImgBB(file) {
  if (!file) {
    throw new Error('No file selected.');
  }

  // Retrieve API key from Vercel env
  const apiKey = (import.meta.env.VITE_IMGBB_API_KEY || '').trim();

  if (!apiKey) {
    throw new Error('VITE_IMGBB_API_KEY is not configured in Vercel Environment Variables.');
  }

  const formData = new FormData();
  formData.append('image', file);

  console.log('[ImgBB] Starting upload to ImgBB...');

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  console.log('[ImgBB] API Response:', result);

  if (!response.ok || !result.success) {
    const errorMsg = result.error?.message || 'Failed to upload to ImgBB.';
    throw new Error(`ImgBB Error: ${errorMsg}`);
  }

  if (!result.data?.url) {
    throw new Error('ImgBB did not return a valid image URL.');
  }

  // Return formatted ImgBB CDN data
  return {
    url: result.data.url,
    displayUrl: result.data.display_url,
    deleteUrl: result.data.delete_url,
    filename: file.name,
    width: Number(result.data.width) || 0,
    height: Number(result.data.height) || 0,
    size: Number(result.data.size) || file.size,
  };
}
