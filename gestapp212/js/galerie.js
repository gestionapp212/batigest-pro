/* ============================================================
   GALERIE MODULE — v4.0
   Stockage base64 localStorage + Supabase (table galerie)
   Affichage vraies photos + lightbox complet
============================================================ */

// ── Clé localStorage ─────────────────────────────────────────
function _galerieKey() {
  return 'galerie_photos_' + (App.currentUser?.companyId || App.currentUser?.company_id || 'all');
}

// ── Charger les photos (localStorage first, puis Supabase) ───
function _loadGaleriePhotos() {
  try {
    return JSON.parse(localStorage.getItem(_galerieKey()) || '[]');
  } catch(e) {
    return [];
  }
}

function _saveGaleriePhotos(photos) {
  try {
    localStorage.setItem(_galerieKey(), JSON.stringify(photos));
  } catch(e) {
    // localStorage peut être plein (images en base64)
    // Garder seulement les 50 dernières
    const limited = photos.slice(-50);
    try { localStorage.setItem(_galerieKey(), JSON.stringify(limited)); } catch(e2) {}
    console.warn('[Galerie] localStorage plein, photos limitées à 50');
  }
}

// ── Rendu principal ───────────────────────────────────────────
function renderGalerie() {
  const content = document.getElementById('page-content');
  const photos  = _loadGaleriePhotos();

  const cats = ['avant', 'pendant', 'apres', 'chantier', 'materiel'];
  const catLabels = {
    avant: 'Avant travaux', pendant: 'Pendant travaux',
    apres: 'Après travaux', chantier: 'Chantier', materiel: 'Matériel'
  };

  content.innerHTML = `
    <div class="page-header">
      <div class="page-title"><i class="fas fa-images"></i> Galerie</div>
      <div class="page-actions">
        <select id="galerie-filter" class="form-control" onchange="filterGalerie()" style="max-width:180px">
          <option value="">Toutes catégories</option>
          ${cats.map(c => `<option value="${c}">${catLabels[c]}</option>`).join('')}
        </select>
        <button class="btn btn-primary" onclick="uploadGaleriePhoto()">
          <i class="fas fa-upload"></i> Ajouter photo(s)
        </button>
      </div>
    </div>

    <div class="stats-row mb-3">
      <div class="stat-item">
        <div class="stat-item-value">${photos.length}</div>
        <div class="stat-item-label">Total</div>
      </div>
      ${cats.slice(0,3).map(cat => `
        <div class="stat-item">
          <div class="stat-item-value">${photos.filter(p => p.categorie === cat).length}</div>
          <div class="stat-item-label">${catLabels[cat]}</div>
        </div>
      `).join('')}
    </div>

    <div class="photo-grid" id="galerie-grid">
      ${renderGalerieGrid(photos)}
    </div>

    <!-- ── Lightbox ── -->
    <div id="lightbox"
      style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:3000;
             align-items:center;justify-content:center;flex-direction:column"
      onclick="closeLightbox()">
      <!-- Bouton fermer -->
      <button onclick="closeLightbox();event.stopPropagation()"
        style="position:absolute;top:18px;right:24px;background:rgba(255,255,255,0.15);
               border:none;color:white;font-size:28px;cursor:pointer;border-radius:50%;
               width:44px;height:44px;display:flex;align-items:center;justify-content:center;
               transition:background .2s"
        onmouseover="this.style.background='rgba(255,255,255,0.3)'"
        onmouseout="this.style.background='rgba(255,255,255,0.15)'">&times;</button>

      <!-- Navigation précédent -->
      <button id="lb-prev"
        onclick="navigateLightbox(-1);event.stopPropagation()"
        style="position:absolute;left:16px;top:50%;transform:translateY(-50%);
               background:rgba(255,255,255,0.15);border:none;color:white;font-size:24px;
               cursor:pointer;border-radius:50%;width:44px;height:44px;
               display:flex;align-items:center;justify-content:center">&#8249;</button>

      <!-- Image -->
      <img id="lightbox-img"
        style="max-width:88vw;max-height:78vh;border-radius:10px;object-fit:contain;
               box-shadow:0 20px 60px rgba(0,0,0,0.5)"
        onclick="event.stopPropagation()"
        alt="Photo">

      <!-- Légende -->
      <div id="lightbox-caption"
        style="color:white;margin-top:14px;font-size:14px;text-align:center;max-width:600px;padding:0 20px">
      </div>

      <!-- Compteur -->
      <div id="lightbox-counter"
        style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:6px">
      </div>

      <!-- Bouton télécharger -->
      <button id="lb-download"
        onclick="downloadLightboxPhoto();event.stopPropagation()"
        style="margin-top:12px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);
               color:white;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:13px">
        <i class="fas fa-download"></i> Télécharger
      </button>

      <!-- Navigation suivant -->
      <button id="lb-next"
        onclick="navigateLightbox(1);event.stopPropagation()"
        style="position:absolute;right:16px;top:50%;transform:translateY(-50%);
               background:rgba(255,255,255,0.15);border:none;color:white;font-size:24px;
               cursor:pointer;border-radius:50%;width:44px;height:44px;
               display:flex;align-items:center;justify-content:center">&#8250;</button>
    </div>
  `;

  // Raccourci clavier pour lightbox
  document.onkeydown = function(e) {
    const lb = document.getElementById('lightbox');
    if (!lb || lb.style.display === 'none') return;
    if (e.key === 'Escape')       closeLightbox();
    if (e.key === 'ArrowRight')   navigateLightbox(1);
    if (e.key === 'ArrowLeft')    navigateLightbox(-1);
  };
}

// ── Grille photos ─────────────────────────────────────────────
function renderGalerieGrid(photos) {
  if (!photos || photos.length === 0) {
    return `
      <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:60px 20px">
        <i class="fas fa-images" style="font-size:48px;color:var(--text-muted);margin-bottom:16px;display:block"></i>
        <h3 style="margin-bottom:8px">Aucune photo</h3>
        <p style="color:var(--text-muted);margin-bottom:20px">Cliquez sur "Ajouter photo(s)" pour importer vos images</p>
        <button class="btn btn-primary" onclick="uploadGaleriePhoto()">
          <i class="fas fa-upload"></i> Ajouter des photos
        </button>
      </div>`;
  }

  return photos.map((p, i) => {
    const hasImage = p.data && p.data.startsWith('data:image');
    const imgHtml = hasImage
      ? `<img src="${p.data}"
             style="width:100%;height:100%;object-fit:cover;display:block;border-radius:10px"
             loading="lazy"
             onerror="this.style.display='none';this.nextSibling.style.display='flex'"
             alt="${p.caption || 'Photo'}">`
      : '';
    const placeholderHtml = `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;
                  flex-direction:column;background:linear-gradient(135deg,#e8f4fd,#d5e8d4);
                  ${hasImage ? 'display:none' : ''}">
        <i class="fas fa-image" style="font-size:36px;color:#aaa;margin-bottom:8px"></i>
        <span style="font-size:11px;color:#999">Image non disponible</span>
      </div>`;

    const catColors = {
      avant:'#3498db', pendant:'#e67e22', apres:'#27ae60',
      chantier:'#8e44ad', materiel:'#e74c3c', autre:'#95a5a6'
    };
    const catColor = catColors[p.categorie] || '#95a5a6';

    return `
      <div class="photo-item"
        style="cursor:pointer;border-radius:12px;overflow:hidden;position:relative;
               box-shadow:0 2px 12px rgba(0,0,0,0.1);aspect-ratio:1;background:#f0f0f0;
               transition:transform .2s,box-shadow .2s"
        onmouseover="this.style.transform='scale(1.03)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.2)'"
        onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 2px 12px rgba(0,0,0,0.1)'"
        onclick="openLightbox(${i})">

        ${imgHtml}
        ${placeholderHtml}

        <!-- Overlay info au bas -->
        <div style="position:absolute;bottom:0;left:0;right:0;
                    background:linear-gradient(transparent, rgba(0,0,0,0.7));
                    padding:20px 10px 10px;border-radius:0 0 10px 10px">
          <div style="color:white;font-size:11px;font-weight:600;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${p.caption || p.nom || 'Photo'}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px">
            <span style="background:${catColor};color:white;font-size:9px;font-weight:600;
                         padding:2px 7px;border-radius:10px">${p.categorie || 'autre'}</span>
            <span style="color:rgba(255,255,255,0.7);font-size:10px">${formatDate(p.date)}</span>
          </div>
        </div>

        <!-- Bouton supprimer -->
        <button
          onclick="event.stopPropagation();deleteGaleriePhoto('${p.id}')"
          style="position:absolute;top:8px;right:8px;background:rgba(231,76,60,0.85);
                 border:none;color:white;width:28px;height:28px;border-radius:50%;
                 cursor:pointer;font-size:12px;display:flex;align-items:center;
                 justify-content:center;opacity:0;transition:opacity .2s"
          class="photo-delete-btn"
          title="Supprimer">
          <i class="fas fa-trash"></i>
        </button>
      </div>`;
  }).join('');
}

// ── Filtre ────────────────────────────────────────────────────
function filterGalerie() {
  const cat    = document.getElementById('galerie-filter')?.value || '';
  const photos = _loadGaleriePhotos();
  const filtered = cat ? photos.filter(p => p.categorie === cat) : photos;
  const grid = document.getElementById('galerie-grid');
  if (grid) grid.innerHTML = renderGalerieGrid(filtered);
}

// ── Upload avec lecture base64 ────────────────────────────────
function uploadGaleriePhoto() {
  // Modal de saisie des infos
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:2500;
    display:flex;align-items:center;justify-content:center
  `;
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;max-width:440px;width:90%;
                box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <h3 style="margin-bottom:20px;display:flex;align-items:center;gap:10px">
        <i class="fas fa-upload" style="color:var(--primary)"></i> Ajouter des photos
      </h3>

      <div style="margin-bottom:16px">
        <label style="font-weight:600;font-size:13px;display:block;margin-bottom:6px">
          Catégorie
        </label>
        <select id="upload-cat" style="width:100%;padding:10px;border:1px solid var(--border);
                border-radius:8px;font-size:14px">
          <option value="chantier">🏗️ Chantier</option>
          <option value="avant">📸 Avant travaux</option>
          <option value="pendant">🔧 Pendant travaux</option>
          <option value="apres">✅ Après travaux</option>
          <option value="materiel">📦 Matériel</option>
        </select>
      </div>

      <div style="border:2px dashed var(--border);border-radius:12px;padding:24px;
                  text-align:center;cursor:pointer;transition:border-color .2s;margin-bottom:16px"
           id="upload-dropzone"
           onclick="document.getElementById('upload-file-input').click()"
           ondragover="event.preventDefault();this.style.borderColor='var(--primary)'"
           ondragleave="this.style.borderColor='var(--border)'"
           ondrop="_handleDrop(event)">
        <i class="fas fa-cloud-upload-alt" style="font-size:32px;color:var(--text-muted);margin-bottom:8px;display:block"></i>
        <p style="margin:0;font-size:14px;color:var(--text-muted)">
          Cliquez ou glissez-déposez vos photos ici
        </p>
        <p style="margin:4px 0 0;font-size:12px;color:var(--text-muted)">
          JPG, PNG, WEBP — plusieurs fichiers acceptés
        </p>
        <input type="file" id="upload-file-input" accept="image/*" multiple
          style="display:none" onchange="_processUploadFiles(this.files)">
      </div>

      <div id="upload-preview" style="display:none;margin-bottom:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px" id="upload-count"></div>
        <div id="upload-thumbs" style="display:flex;gap:8px;flex-wrap:wrap"></div>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button onclick="this.closest('div[style]').remove()"
          style="padding:10px 20px;border:1px solid var(--border);background:white;
                 border-radius:8px;cursor:pointer;font-size:14px">
          Annuler
        </button>
        <button id="upload-confirm-btn"
          onclick="_confirmUpload()"
          style="padding:10px 20px;background:var(--primary);color:white;border:none;
                 border-radius:8px;cursor:pointer;font-size:14px;font-weight:600"
          disabled>
          <i class="fas fa-save"></i> Enregistrer
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  // Fermer en cliquant le fond
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ── Données d'upload en attente ───────────────────────────────
let _pendingPhotos = [];

function _handleDrop(event) {
  event.preventDefault();
  document.getElementById('upload-dropzone').style.borderColor = 'var(--border)';
  _processUploadFiles(event.dataTransfer.files);
}

function _processUploadFiles(files) {
  _pendingPhotos = [];
  const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (arr.length === 0) { showToast('Aucune image valide sélectionnée', 'error'); return; }

  const MAX_SIZE = 2 * 1024 * 1024; // 2 MB par photo
  let processed = 0;

  arr.forEach((file, idx) => {
    if (file.size > MAX_SIZE) {
      _compressImage(file, 1200, 0.82, (compressed) => {
        _pendingPhotos[idx] = { name: file.name, data: compressed };
        processed++;
        if (processed === arr.length) _showUploadPreview();
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        _pendingPhotos[idx] = { name: file.name, data: e.target.result };
        processed++;
        if (processed === arr.length) _showUploadPreview();
      };
      reader.readAsDataURL(file);
    }
  });
}

function _compressImage(file, maxWidth, quality, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function _showUploadPreview() {
  const previewDiv = document.getElementById('upload-preview');
  const thumbsDiv  = document.getElementById('upload-thumbs');
  const countDiv   = document.getElementById('upload-count');
  const confirmBtn = document.getElementById('upload-confirm-btn');
  if (!previewDiv || !_pendingPhotos.length) return;

  previewDiv.style.display = 'block';
  countDiv.textContent = `${_pendingPhotos.length} photo(s) prête(s) à enregistrer`;
  thumbsDiv.innerHTML = _pendingPhotos.map((p, i) => p ? `
    <div style="position:relative">
      <img src="${p.data}" alt="${p.name}"
        style="width:60px;height:60px;object-fit:cover;border-radius:8px;
               border:2px solid var(--border)">
      <span style="position:absolute;bottom:-2px;left:0;right:0;font-size:9px;
                   text-align:center;background:rgba(0,0,0,0.5);color:white;
                   border-radius:0 0 6px 6px;padding:2px;overflow:hidden;
                   white-space:nowrap;text-overflow:ellipsis">${p.name.substring(0,8)}</span>
    </div>
  ` : '').join('');
  if (confirmBtn) confirmBtn.disabled = false;
}

function _confirmUpload() {
  if (!_pendingPhotos.length) return;
  const cat     = document.getElementById('upload-cat')?.value || 'chantier';
  const photos  = _loadGaleriePhotos();
  const colors  = ['#2980b9','#27ae60','#e74c3c','#f39c12','#8e44ad','#1abc9c'];

  _pendingPhotos.forEach(p => {
    if (!p) return;
    const caption = p.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    photos.unshift({  // Ajouter au début (plus récentes en premier)
      id:        genId(),
      caption,
      nom:       p.name,
      categorie: cat,
      date:      today(),
      data:      p.data,  // ← Base64 de l'image
      color:     colors[Math.floor(Math.random() * colors.length)],
    });
  });

  _saveGaleriePhotos(photos);
  _pendingPhotos = [];

  // Fermer le modal d'upload
  const modal = document.querySelector('[id="upload-confirm-btn"]')?.closest('div[style*="position:fixed"]');
  if (modal) modal.remove();

  renderGalerie();
  showToast(`✅ ${photos.length > 0 ? _pendingPhotos.length || 'Photos' : 'Photo'} enregistrée(s) !`, 'success');

  // Sauvegarder dans Supabase si connecté (table galerie)
  if (!App.isDemoMode) {
    _syncGalerieToSupabase(photos.slice(0, _pendingPhotos.length || 5));
  }
}

// ── Sync Supabase optionnelle ─────────────────────────────────
async function _syncGalerieToSupabase(newPhotos) {
  const cid = App.currentUser?.companyId || App.currentUser?.company_id;
  if (!cid) return;
  for (const p of newPhotos) {
    try {
      await sbInsert('galerie', {
        company_id: cid,
        caption:    p.caption,
        categorie:  p.categorie,
        date_photo: p.date,
        // Ne pas stocker le base64 dans Supabase (trop volumineux)
        // Seulement les métadonnées
        nom_fichier: p.nom,
      });
    } catch(e) {
      // Table galerie peut ne pas exister — pas bloquant
      console.info('[Galerie] Supabase sync ignoré:', e.message);
    }
  }
}

// ── Lightbox ──────────────────────────────────────────────────
let _currentLightboxIdx = -1;
let _currentLightboxPhotos = [];

function openLightbox(idx) {
  const filterVal = document.getElementById('galerie-filter')?.value || '';
  const allPhotos = _loadGaleriePhotos();
  _currentLightboxPhotos = filterVal ? allPhotos.filter(p => p.categorie === filterVal) : allPhotos;
  _currentLightboxIdx = idx;
  _renderLightboxAt(idx);
  const lb = document.getElementById('lightbox');
  if (lb) lb.style.display = 'flex';
}

function _renderLightboxAt(idx) {
  const photos = _currentLightboxPhotos;
  if (!photos.length) return;
  idx = Math.max(0, Math.min(idx, photos.length - 1));
  _currentLightboxIdx = idx;
  const p = photos[idx];

  const imgEl     = document.getElementById('lightbox-img');
  const captionEl = document.getElementById('lightbox-caption');
  const counterEl = document.getElementById('lightbox-counter');
  const prevBtn   = document.getElementById('lb-prev');
  const nextBtn   = document.getElementById('lb-next');

  if (imgEl) {
    if (p.data && p.data.startsWith('data:image')) {
      imgEl.src = p.data;
      imgEl.style.display = 'block';
    } else {
      imgEl.src = '';
      imgEl.style.display = 'none';
    }
  }
  if (captionEl) {
    captionEl.innerHTML = `
      <strong>${p.caption || p.nom || 'Photo'}</strong><br>
      <span style="font-size:12px;opacity:.7">${p.categorie || ''} · ${formatDate(p.date)}</span>`;
  }
  if (counterEl) counterEl.textContent = `${idx + 1} / ${photos.length}`;
  if (prevBtn)   prevBtn.style.display = idx > 0 ? 'flex' : 'none';
  if (nextBtn)   nextBtn.style.display = idx < photos.length - 1 ? 'flex' : 'none';
}

function navigateLightbox(dir) {
  const newIdx = _currentLightboxIdx + dir;
  if (newIdx >= 0 && newIdx < _currentLightboxPhotos.length) {
    _renderLightboxAt(newIdx);
  }
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.style.display = 'none';
}

function downloadLightboxPhoto() {
  const p = _currentLightboxPhotos[_currentLightboxIdx];
  if (!p || !p.data) { showToast('Aucune image à télécharger', 'warning'); return; }
  const a = document.createElement('a');
  a.href = p.data;
  a.download = p.nom || `photo_${p.id}.jpg`;
  a.click();
}

// ── Suppression ───────────────────────────────────────────────
function deleteGaleriePhoto(id) {
  showConfirm('Supprimer cette photo définitivement ?', () => {
    let photos = _loadGaleriePhotos();
    photos = photos.filter(p => p.id !== id);
    _saveGaleriePhotos(photos);
    addAuditLog('Galerie', 'Photo supprimée');
    renderGalerie();
    showToast('Photo supprimée', 'success');
  });
}

// ── CSS dynamique pour hover bouton supprimer ─────────────────
(function injectGalerieCSS() {
  if (document.getElementById('galerie-style')) return;
  const style = document.createElement('style');
  style.id = 'galerie-style';
  style.textContent = `
    .photo-item:hover .photo-delete-btn { opacity: 1 !important; }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 14px;
      padding: 4px 0 20px;
    }
    .photo-item { aspect-ratio: 1; }
    @media (max-width: 600px) {
      .photo-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    }
  `;
  document.head.appendChild(style);
})();
