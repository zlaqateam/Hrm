'use client';
// Front-camera selfie capture with a burned-in timestamp (anti-proxy).
// Falls back to file upload (which opens the camera on phones) if getUserMedia is blocked.
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, RefreshCw, Upload } from 'lucide-react';
import { Button, Modal } from './ui';

const WIDTH = 400;

function stamp(ctx: CanvasRenderingContext2D, w: number, h: number, label: string) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(0, h - 24, w, 24);
  ctx.fillStyle = '#fff';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`${label} · ${new Date().toLocaleString()}`, 8, h - 8);
}

export function SelfieCamera({ open, title, onCapture, onClose, busy }: { open: boolean; title: string; onCapture: (dataUrl: string) => void; onClose: () => void; busy?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open || shot) return;
    let cancelled = false;
    setError('');
    setReady(false);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera api');
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch {
        setError('Camera not available. Allow camera access in your browser, or upload a photo instead.');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, shot]);

  useEffect(() => {
    if (!open) setShot(null);
  }, [open]);

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const h = Math.round((v.videoHeight / v.videoWidth) * WIDTH);
    const c = document.createElement('canvas');
    c.width = WIDTH;
    c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.translate(WIDTH, 0);
    ctx.scale(-1, 1); // mirror like the preview
    ctx.drawImage(v, 0, 0, WIDTH, h);
    stamp(ctx, WIDTH, h, title);
    setShot(c.toDataURL('image/jpeg', 0.72));
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const h = Math.round((img.height / img.width) * WIDTH);
      const c = document.createElement('canvas');
      c.width = WIDTH;
      c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, WIDTH, h);
      stamp(ctx, WIDTH, h, title + ' (upload)');
      setShot(c.toDataURL('image/jpeg', 0.72));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-900">
          {shot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot} alt="selfie preview" className="h-full w-full object-cover" />
          ) : (
            <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          )}
          {!shot && !ready && !error && <div className="absolute inset-0 grid place-items-center text-sm text-neutral-300">Starting camera…</div>}
          {error && !shot && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-neutral-200">{error}</div>}
          {!shot && ready && <div className="pointer-events-none absolute inset-8 rounded-full border-2 border-dashed border-white/40" />}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />
        <div className="flex flex-wrap justify-end gap-2">
          {shot ? (
            <>
              <Button variant="secondary" onClick={() => setShot(null)} disabled={busy}>
                <RefreshCw size={16} /> Retake
              </Button>
              <Button onClick={() => onCapture(shot)} disabled={busy}>
                {busy ? 'Saving…' : 'Use this photo'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload size={16} /> Upload
              </Button>
              <Button onClick={capture} disabled={!ready}>
                <Camera size={16} /> Capture
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
