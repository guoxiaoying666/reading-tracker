// IndexedDB 图片存储 — 存书封缩略图，避免撑爆 localStorage

const DB_NAME = 'reading-tracker-images';
const DB_VERSION = 1;
const STORE_NAME = 'covers';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/** 保存图片（自动压缩），返回 imageId */
export async function saveImage(file) {
  const compressed = await compressImage(file);
  const db = await openDB();
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, data: compressed, createdAt: Date.now() });
    tx.oncomplete = () => resolve(id);
    tx.onerror = (e) => reject(e.target.error);
  });
}

/** 读取图片 base64 */
export async function getImage(id) {
  if (!id) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

/** 批量读取图片 */
export async function getImages(ids) {
  const db = await openDB();
  const results = {};
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const promises = ids.filter(Boolean).map(id =>
    new Promise((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => { results[id] = req.result?.data || null; resolve(); };
      req.onerror = () => { results[id] = null; resolve(); };
    })
  );
  await Promise.all(promises);
  return results;
}

/** 删除图片 */
export async function deleteImage(id) {
  if (!id) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

/** 更换图片：删旧存新，返回新 imageId */
export async function replaceImage(oldId, file) {
  if (oldId) await deleteImage(oldId);
  if (file) return saveImage(file);
  return null;
}

/** Canvas 压缩图片到缩略图尺寸 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    // 仅处理图片文件
    if (!file.type.startsWith('image/')) {
      // 非图片文件，读为 dataURL
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 300;
        const maxH = 400;
        let w = img.width;
        let h = img.height;
        if (w > maxW) { h = h * maxW / w; w = maxW; }
        if (h > maxH) { w = w * maxH / h; h = maxH; }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
