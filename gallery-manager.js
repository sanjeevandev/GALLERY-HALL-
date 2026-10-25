/**
 * Gallery Storage & Custom Photo Manager for "Our Museum"
 * Supports uploading, storing, and dynamically updating photos in the 3D museum
 * using IndexedDB with LocalStorage fallback (supporting high-res photos).
 */

class GalleryManager {
  constructor() {
    this.dbName = 'OurMuseumDB';
    this.dbVersion = 1;
    this.db = null;
    this.syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('our_museum_gallery_sync') : null;
    this.listeners = [];

    if (this.syncChannel) {
      this.syncChannel.onmessage = (e) => {
        if (e.data && e.data.type === 'PHOTO_UPDATED') {
          this.listeners.forEach(fn => fn(e.data.photo));
        }
      };
    }

    this.defaultPhotos = [
      { id: 'centerpiece', title: 'The Centerpiece', src: 'assets/03-at-the-centrepiece.webp', caption: 'Illuminated centerpiece of the permanent collection.', isCenterpiece: true, wallLabel: '★ Centerpiece Rotunda' },
      { id: 'monolith_back', title: 'Moments in Rome', src: 'assets/08-a-photo-up-close.webp', caption: 'A moment captured at the Colosseum.', wallLabel: 'Rotunda North Wall' },
      { id: 'gallery_0', title: 'The East Gallery View', src: 'assets/07-the-east-gallery.webp', caption: 'Quiet halls lit with warm gallery spotlights.', wallLabel: 'West Gallery 1' },
      { id: 'gallery_1', title: 'Looking at a Photo', src: 'assets/06-looking-at-a-photo.webp', caption: 'Admiring details in every frame.', wallLabel: 'West Gallery 2' },
      { id: 'gallery_2', title: 'Our Moments Together', src: 'assets/01-cover.webp', caption: 'The collection begins here.', wallLabel: 'West Gallery 3' },
      { id: 'gallery_3', title: 'On the Wooden Bench', src: 'assets/10-on-the-bench.webp', caption: 'Sitting in stillness together.', wallLabel: 'East Gallery 1' },
      { id: 'gallery_4', title: 'The Dedication Wall', src: 'assets/05-the-dedication.webp', caption: 'Every word written straight from the heart.', wallLabel: 'East Gallery 2' },
      { id: 'gallery_5', title: 'A Closer Look', src: 'assets/08-a-photo-up-close.webp', caption: 'Memories immortalized in gold.', wallLabel: 'East Gallery 3' },
      { id: 'gallery_6', title: 'Exploring Hand in Hand', src: 'assets/11-walking-on-a-phone.webp', caption: 'Walking side by side across distance.', wallLabel: 'South Wall Left' },
      { id: 'gallery_7', title: 'A Glimpse into Tomorrow', src: 'assets/12-a-photo-on-a-phone.webp', caption: 'Forever framed in our private sanctuary.', wallLabel: 'South Wall Right' }
    ];
  }

  onPhotoUpdated(fn) {
    this.listeners.push(fn);
  }

  async init() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported, using localStorage');
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };

      request.onerror = () => {
        console.warn('Failed to open IndexedDB, using localStorage');
        resolve();
      };
    });
  }

  async getAllPhotos() {
    await this.init();

    return new Promise((resolve) => {
      if (this.db) {
        const tx = this.db.transaction('photos', 'readonly');
        const store = tx.objectStore('photos');
        const req = store.getAll();

        req.onsuccess = () => {
          if (req.result && req.result.length > 0) {
            // Merge custom stored photos with defaults
            const photoMap = new Map();
            this.defaultPhotos.forEach(p => photoMap.set(p.id, { ...p }));
            req.result.forEach(customP => photoMap.set(customP.id, customP));
            resolve(Array.from(photoMap.values()));
          } else {
            resolve(this.loadFromLocalStorage());
          }
        };

        req.onerror = () => {
          resolve(this.loadFromLocalStorage());
        };
      } else {
        resolve(this.loadFromLocalStorage());
      }
    });
  }

  loadFromLocalStorage() {
    try {
      const data = localStorage.getItem('our_museum_photos');
      if (data) {
        const parsed = JSON.parse(data);
        const photoMap = new Map();
        this.defaultPhotos.forEach(p => photoMap.set(p.id, { ...p }));
        parsed.forEach(p => photoMap.set(p.id, p));
        return Array.from(photoMap.values());
      }
    } catch (e) {}
    return this.defaultPhotos;
  }

  async savePhoto(photoObj) {
    await this.init();

    return new Promise((resolve) => {
      if (this.db) {
        const tx = this.db.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        store.put(photoObj);

        tx.oncomplete = () => {
          this.saveToLocalStorage(photoObj);
          if (this.syncChannel) {
            this.syncChannel.postMessage({ type: 'PHOTO_UPDATED', photo: photoObj });
          }
          this.listeners.forEach(fn => fn(photoObj));
          resolve(true);
        };
        tx.onerror = () => {
          this.saveToLocalStorage(photoObj);
          if (this.syncChannel) {
            this.syncChannel.postMessage({ type: 'PHOTO_UPDATED', photo: photoObj });
          }
          this.listeners.forEach(fn => fn(photoObj));
          resolve(true);
        };
      } else {
        this.saveToLocalStorage(photoObj);
        if (this.syncChannel) {
          this.syncChannel.postMessage({ type: 'PHOTO_UPDATED', photo: photoObj });
        }
        this.listeners.forEach(fn => fn(photoObj));
        resolve(true);
      }
    });
  }

  saveToLocalStorage(photoObj) {
    try {
      const current = this.loadFromLocalStorage();
      const updated = current.map(p => p.id === photoObj.id ? photoObj : p);
      if (!updated.some(p => p.id === photoObj.id)) {
        updated.push(photoObj);
      }
      localStorage.setItem('our_museum_photos', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage save failed (quota limit):', e);
    }
  }

  async resetGallery() {
    await this.init();
    if (this.db) {
      const tx = this.db.transaction('photos', 'readwrite');
      const store = tx.objectStore('photos');
      store.clear();
    }
    localStorage.removeItem('our_museum_photos');
    if (this.syncChannel) {
      this.syncChannel.postMessage({ type: 'RESET_GALLERY' });
    }
  }

  // Convert File object to base64 Data URL with automatic image resizing for optimal performance
  async processFile(file, maxWidth = 1920, maxHeight = 1920) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.90));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

window.galleryManager = new GalleryManager();
