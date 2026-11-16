import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, Star, Trash2 } from 'lucide-react';
import adminApi, { errorMessage } from './adminApi';
import { useUI } from './ui';
import { ALLOWED, MAX_MB, checkFiles } from './files';


/**
 * Photo manager.
 * - Existing property (propertyId set): uploads, deletes and reorders immediately.
 * - New property: collects files in `pending` to upload after the property is saved.
 */
export default function PhotoManager({ propertyId, images, onChange, pending = [], onPendingChange }) {
  const { toast, confirm } = useUI();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const addFiles = async (fileList) => {
    const { ok, problems } = checkFiles(fileList);
    problems.forEach((p) => toast.error(p));
    if (!ok.length) return;
    if (!propertyId) {
      onPendingChange([...pending, ...ok]);
      return;
    }
    const form = new FormData();
    ok.forEach((f) => form.append('images', f));
    setBusy(true);
    try {
      await adminApi.post(`/properties/${propertyId}/images/`, form);
      toast.success(`${ok.length} photo(s) uploaded.`);
      await onChange();
    } catch (err) {
      toast.error(errorMessage(err, 'Upload failed.'));
    } finally {
      setBusy(false);
    }
  };

  const run = async (action, success) => {
    setBusy(true);
    try {
      await action();
      if (success) toast.success(success);
      await onChange();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const move = (index, delta) => {
    const order = images.map((img) => img.id);
    const [moved] = order.splice(index, 1);
    order.splice(index + delta, 0, moved);
    run(() => adminApi.post(`/properties/${propertyId}/images/reorder/`, { order }));
  };

  const remove = async (img) => {
    if (await confirm({ title: 'Delete photo?', message: 'This photo will be permanently deleted.', danger: true, confirmLabel: 'Delete' })) {
      run(() => adminApi.delete(`/property-images/${img.id}/`), 'Photo deleted.');
    }
  };

  return (
    <div className="dash-photos">
      <div
        className="dash-photos__drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
      >
        <ImagePlus size={30} />
        <p>Drag photos here, or</p>
        <button type="button" className="btn btn--navy btn--sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <><LoaderCircle size={16} className="spin" /> Working…</> : 'Choose photos'}
        </button>
        <small>JPG, PNG or WebP · up to {MAX_MB} MB each · select several at once</small>
        <input ref={inputRef} type="file" accept={ALLOWED.join(',')} multiple hidden
               onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {!propertyId && pending.length > 0 && (
        <ul className="dash-photos__grid">
          {pending.map((file, i) => (
            <li key={`${file.name}-${i}`} className="dash-photo">
              <img src={URL.createObjectURL(file)} alt="" onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)} />
              {i === 0 && <span className="dash-photo__primary">Main photo</span>}
              <div className="dash-photo__bar">
                <span className="dash-photo__name">{file.name}</span>
                <button type="button" className="icon-btn icon-btn--danger" aria-label={`Remove ${file.name}`}
                        onClick={() => onPendingChange(pending.filter((_, n) => n !== i))}><Trash2 size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!propertyId && pending.length > 0 && <p className="dash-note">Photos upload when you save the property.</p>}

      {propertyId && images.length > 0 && (
        <ul className="dash-photos__grid">
          {images.map((img, i) => (
            <li key={img.id} className={`dash-photo ${img.is_primary ? 'is-primary' : ''}`}>
              <img src={img.image} alt={img.alt_text} loading="lazy" />
              {img.is_primary && <span className="dash-photo__primary">Main photo</span>}
              <div className="dash-photo__bar">
                {!img.is_primary && (
                  <button type="button" className="icon-btn" title="Set as main photo" aria-label="Set as main photo" disabled={busy}
                          onClick={() => run(() => adminApi.patch(`/property-images/${img.id}/`, { is_primary: true }), 'Main photo updated.')}>
                    <Star size={15} />
                  </button>
                )}
                {/* The main photo always shows first; the others can be reordered after it. */}
                {!img.is_primary && (
                  <>
                    <button type="button" className="icon-btn" aria-label="Move earlier" onClick={() => move(i, -1)}
                            disabled={busy || i === 0 || (i === 1 && images[0].is_primary)}><ArrowUp size={15} /></button>
                    <button type="button" className="icon-btn" aria-label="Move later" onClick={() => move(i, 1)}
                            disabled={busy || i === images.length - 1}><ArrowDown size={15} /></button>
                  </>
                )}
                <button type="button" className="icon-btn icon-btn--danger" aria-label="Delete photo" disabled={busy} onClick={() => remove(img)}><Trash2 size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {propertyId && images.length === 0 && <p className="dash-empty">No photos yet. Properties with photos get far more enquiries.</p>}
    </div>
  );
}
