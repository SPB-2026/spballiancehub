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

  // 1. Verify Vercel environment variable
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  console.log('[ImgBB Debug] Uploading file:', file.name, `(${file.size} bytes)`);
  console.log('[ImgBB Debug] API Key detected:', Boolean(apiKey));

  if (!apiKey) {
    throw new Error('VITE_IMGBB_API_KEY environment variable is missing on Vercel.');
  }

  // 2. Prepare multipart form data
  const formData = new FormData();
  formData.append('image', file);

  try {
    // 3. Request direct browser-to-ImgBB upload
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.log('[ImgBB Debug] Response from ImgBB API:', result);

    if (!result.success) {
      const errorMsg = result.error?.message || 'ImgBB rejected the upload request.';
      console.error('[ImgBB Error]', result.error);
      throw new Error(`ImgBB API Error: ${errorMsg}`);
    }

    console.log('[ImgBB Success] Image stored successfully at:', result.data.url);

    // 4. Return formatted image metadata
    return {
      url: result.data.url,               // Direct image URL (e.g., https://i.ibb.co/xxxx/filename.jpg)
      displayUrl: result.data.display_url,
      deleteUrl: result.data.delete_url,
      filename: file.name,
      width: Number(result.data.width) || 0,
      height: Number(result.data.height) || 0,
      size: Number(result.data.size) || file.size,
    };
  } catch (err) {
    console.error('[ImgBB Network/Upload Exception]', err);
    throw err;
  }
}
