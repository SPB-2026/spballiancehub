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

  // Reads the environment variable set in Vercel
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_IMGBB_API_KEY environment variable is not configured on Vercel.');
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'ImgBB upload failed.');
  }

  // Returns permanent ImgBB CDN details
  return {
    url: result.data.url,             // e.g., https://i.ibb.co/xxxx/filename.jpg
    displayUrl: result.data.display_url,
    deleteUrl: result.data.delete_url,
    filename: file.name,
    width: result.data.width,
    height: result.data.height,
    size: result.data.size,
  };
}
