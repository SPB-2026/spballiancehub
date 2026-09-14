// src/services/imgbb.service.js

/**
 * Uploads a file directly from the browser to ImgBB API
 * @param {File} file - The file object from <input type="file" />
 * @returns {Promise<Object>} Object containing the permanent ImgBB CDN URL
 */
export async function uploadDirectToImgBB(file) {
  if (!file) {
    throw new Error('No file selected for upload.');
  }

  // 1. Clean and validate API key from Vercel env
  const rawKey = import.meta.env.VITE_IMGBB_API_KEY;
  const apiKey = rawKey ? rawKey.trim() : '';

  if (!apiKey) {
    throw new Error('VITE_IMGBB_API_KEY environment variable is missing on Vercel.');
  }

  // 2. Build FormData specifically formatted for ImgBB
  const formData = new FormData();
  formData.append('image', file);

  try {
    // 3. Post directly to ImgBB API
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('[ImgBB 400 Error details]:', result);
      const msg = result.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`ImgBB rejected upload: ${msg}`);
    }

    // 4. Return metadata
    return {
      url: result.data.url,
      displayUrl: result.data.display_url,
      deleteUrl: result.data.delete_url,
      filename: file.name,
      width: Number(result.data.width) || 0,
      height: Number(result.data.height) || 0,
      size: Number(result.data.size) || file.size,
    };
  } catch (err) {
    console.error('[ImgBB Upload Failed]', err);
    throw err;
  }
}
