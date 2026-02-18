export type VideoPresentation = {
  type: 'embed' | 'native';
  src: string;
};

export function getVideoPresentation(rawUrl: string): VideoPresentation {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return { type: 'embed', src: rawUrl };

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(trimmedUrl)) {
    return { type: 'native', src: trimmedUrl };
  }

  try {
    const parsed = new URL(trimmedUrl);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      if (id) return { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` };
    }

    if (host.endsWith('youtube.com')) {
      const pathnameParts = parsed.pathname.split('/').filter(Boolean);
      const videoIdFromQuery = parsed.searchParams.get('v');
      const videoIdFromPath = pathnameParts.length >= 2 && (pathnameParts[0] === 'embed' || pathnameParts[0] === 'shorts')
        ? pathnameParts[1]
        : null;
      const videoId = videoIdFromQuery || videoIdFromPath;
      if (videoId) return { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${videoId}` };
    }

    if (host.endsWith('vimeo.com')) {
      const pathnameParts = parsed.pathname.split('/').filter(Boolean);
      const id = pathnameParts[pathnameParts.length - 1];
      if (id && /^\d+$/.test(id)) {
        return { type: 'embed', src: `https://player.vimeo.com/video/${id}` };
      }
    }

    if (host.endsWith('loom.com')) {
      const pathnameParts = parsed.pathname.split('/').filter(Boolean);
      if (pathnameParts.length >= 2 && pathnameParts[0] === 'share') {
        return { type: 'embed', src: `https://www.loom.com/embed/${pathnameParts[1]}` };
      }
    }
  } catch {
    // Use raw URL as-is below.
  }

  return { type: 'embed', src: trimmedUrl };
}
