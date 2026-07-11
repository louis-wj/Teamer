import { useState, useRef } from 'react';
import { Paperclip, X, Upload, Image } from 'lucide-react';
import api from '@/lib/api';

interface Props {
  onUploaded: (url: string) => void;
}

export default function FileUpload({ onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) { alert('Max 8MB'); return; }
    setUploading(true);

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded(res.data.url);
      setPreview(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Upload failed');
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  return (
    <>
      <input ref={inputRef} type="file" className="hidden" accept="image/*,.pdf,.txt,.mp4,.webm"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />

      <button onClick={() => inputRef.current?.click()} disabled={uploading}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`p-1.5 rounded-md transition-all ${dragOver ? 'bg-teamer-500/20 text-teamer-400 scale-110' : 'text-muted-foreground hover:text-foreground'} ${uploading ? 'animate-pulse-soft' : ''}`}>
        {uploading ? <Upload size={18} className="animate-spin" /> : <Paperclip size={18} />}
      </button>

      {preview && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-card rounded-lg border border-border shadow-xl animate-slide-up">
          <button onClick={() => setPreview(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center text-xs"><X size={12} /></button>
          <img src={preview} alt="preview" className="max-w-[200px] max-h-[150px] rounded" />
          <p className="text-xs text-muted-foreground mt-1">{uploading ? 'Uploading...' : 'Ready'}</p>
        </div>
      )}
    </>
  );
}
