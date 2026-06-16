// 从图片中提取主色调（用于卡片背景色适配）
export async function extractColors(imageId) {
  if (!imageId) return null;
  try {
    const { getImage } = await import('./imageDB');
    const dataUrl = await getImage(imageId);
    if (!dataUrl) return null;

    const img = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 20, 20);

    // 取所有像素的平均色
    const data = ctx.getImageData(0, 0, 20, 20).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i+1]; b += data[i+2]; count++;
    }
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    // 饱和度增强（让颜色更明显，而不是灰蒙蒙）
    const avg = (r + g + b) / 3;
    const sat = 1.3;
    r = Math.round(avg + (r - avg) * sat);
    g = Math.round(avg + (g - avg) * sat);
    b = Math.round(avg + (b - avg) * sat);
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    // 深色版背景（靠近封面色，但深一些）
    const darkBg = `rgb(${Math.round(r * 0.25)}, ${Math.round(g * 0.25)}, ${Math.round(b * 0.25)})`;
    const midBg = `rgb(${Math.round(r * 0.35)}, ${Math.round(g * 0.35)}, ${Math.round(b * 0.35)})`;
    const accent = `rgb(${r}, ${g}, ${b})`;
    const accentDark = `rgb(${Math.round(r * 0.7)}, ${Math.round(g * 0.7)}, ${Math.round(b * 0.7)})`;

    return { r, g, b, darkBg, midBg, accent, accentDark };
  } catch (_) {
    return null;
  }
}
