Page({
  data: {
    shapes: [
      { id: 1, icon: '/images/masks/IMG_2413.jpg' },
      { id: 2, icon: '/images/masks/circle.jpg' },
      { id: 3, icon: '/images/masks/heart.jpg' },
      { id: 4, icon: '/images/masks/star_mask.jpg' },
      { id: 5, icon: '/images/masks/flower.jpg' },
      { id: 6, icon: '/images/masks/clover.jpg' },
      { id: 7, icon: '/images/masks/cloud.jpg' },
      { id: 8, icon: '/images/masks/hex_mask.jpg' },
      { id: 9, icon: '/images/masks/blob_mask.jpg' },
      { id: 10, icon: '/images/masks/burst_mask.jpg' },
    ],
    selectedShape: 1,
    selectedImage: null,
    currentShapeIcon: '/images/masks/IMG_2413.jpg',

    preW: 0,
    preH: 0,
    imgW: 0,
    imgH: 0,
    imgX: 0,
    imgY: 0,
    originalW: 0,
    originalH: 0,
    startX: 0,
    startY: 0,
    isDragging: false
  },

  onLoad() {
    this.getPreviewSize();
  },

  getPreviewSize() {
    const query = wx.createSelectorQuery().in(this);
    query.select('.preview-area').boundingClientRect(rect => {
      if (!rect) return;
      this.setData({
        preW: rect.width,
        preH: rect.height
      });
      if (this.data.selectedImage && this.data.originalW) {
        this.applyDisplay(this.data.originalW, this.data.originalH);
      }
    }).exec();
  },

  onSelectShape(e) {
    const id = e.currentTarget.dataset.id;
    const shape = this.data.shapes.find(s => s.id === id);
    this.setData({
      selectedShape: id,
      currentShapeIcon: shape ? shape.icon : ''
    });
  },

  applyDisplay(iw, ih) {
    const pw = this.data.preW;
    const ph = this.data.preH;
    if (!pw || !ph || !iw || !ih) return;
    const scale = Math.max(pw / iw, ph / ih);
    const showW = iw * scale;
    const showH = ih * scale;
    this.setData({
      imgW: showW,
      imgH: showH,
      imgX: (pw - showW) / 2,
      imgY: (ph - showH) / 2
    });
  },

  onChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFilePaths[0];
        wx.getImageInfo({
          src: path,
          success: (info) => {
            this.setData({
              selectedImage: path,
              originalW: info.width,
              originalH: info.height
            });
            this.applyDisplay(info.width, info.height);
            wx.showToast({ title: '图片已选择', icon: 'success' });
          },
          fail: () => {
            wx.showToast({ title: '读取图片失败', icon: 'none' });
          }
        });
      }
    });
  },

  async onSaveImage() {
    if (!this.data.selectedImage) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    if (this._saving) return;
    this._saving = true;

    try {
      await this.ensureAlbumAuth();
      const cropInfo = await this.computeCropInfo();
      const previewList = [];
      const total = 9;

      const pieceW = cropInfo.sw / 3;
      const pieceH = cropInfo.sh / 3;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const index = row * 3 + col;
          wx.showLoading({ title: `保存中 ${index + 1}/${total}`, mask: true });
          const px = cropInfo.sx + col * pieceW;
          const py = cropInfo.sy + row * pieceH;
          const piecePath = await this.cropImage(cropInfo.src, px, py, pieceW, pieceH);
          await this.saveImg(piecePath);
          previewList.push(piecePath);
        }
      }

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success', duration: 1000 });

      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/result/result?images=${encodeURIComponent(JSON.stringify(previewList))}`
        });
      }, 1000);
    } catch (e) {
      wx.hideLoading();
      const msg = (e && e.errMsg) || (e && e.message) || '保存失败';
      if (msg.indexOf('cancel') === -1 && msg.indexOf('取消') === -1) {
        wx.showToast({ title: msg, icon: 'none' });
      }
    } finally {
      this._saving = false;
    }
  },

  computeCropInfo() {
    return new Promise((resolve, reject) => {
      const { selectedImage, imgX, imgY, imgW, imgH, preW, preH } = this.data;
      wx.getImageInfo({
        src: selectedImage,
        success: (info) => {
          const scale = imgW / info.width;
          const sx = Math.max(0, -imgX / scale);
          const sy = Math.max(0, -imgY / scale);
          const sw = Math.min(info.width - sx, preW / scale);
          const sh = Math.min(info.height - sy, preH / scale);
          resolve({
            src: info.path || selectedImage,
            sx,
            sy,
            sw,
            sh,
            originalW: info.width,
            originalH: info.height
          });
        },
        fail: () => reject(new Error('读取图片信息失败'))
      });
    });
  },

  getImageInfoSafe(src) {
    return new Promise((resolve) => {
      wx.getImageInfo({ src, success: resolve, fail: resolve });
    });
  },

  ensureAlbumAuth() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          const auth = res.authSetting['scope.writePhotosAlbum'];
          if (auth === true) {
            resolve();
          } else if (auth === false) {
            wx.showModal({
              title: '保存提示',
              content: '需要授权保存图片到相册，是否前往设置？',
              success: (modalRes) => {
                if (!modalRes.confirm) {
                  reject(new Error('用户取消授权'));
                  return;
                }
                wx.openSetting({
                  success: (setRes) => {
                    if (setRes.authSetting['scope.writePhotosAlbum']) {
                      resolve();
                    } else {
                      reject(new Error('未授权保存到相册'));
                    }
                  },
                  fail: () => reject(new Error('打开设置失败'))
                });
              }
            });
          } else {
            wx.authorize({
              scope: 'scope.writePhotosAlbum',
              success: resolve,
              fail: () => reject(new Error('未授权保存到相册'))
            });
          }
        },
        fail: () => reject(new Error('获取授权信息失败'))
      });
    });
  },

  cropImage(src, x, y, w, h) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery().in(this);
      query.select('#cutCanvas').fields({ node: true, size: true }).exec(res => {
        if (!res[0]?.node) return reject('canvas 错误');
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        canvas.width = w;
        canvas.height = h;

        const img = canvas.createImage();
        img.onload = () => {
          ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
          wx.canvasToTempFilePath({
            canvas, quality: 1, fileType: 'jpg',
            success: (r) => resolve(r.tempFilePath),
            fail: reject
          });
        };
        img.src = src;
      });
    });
  },

  saveImg(filePath) {
    return new Promise((resolve) => {
      wx.saveImageToPhotosAlbum({
        filePath, success: resolve, fail: resolve
      });
    });
  },

  touchStart(e) {
    if (!this.data.selectedImage) return;
    this.setData({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      isDragging: true
    });
  },

  touchMove(e) {
    if (!this.data.isDragging || !this.data.selectedImage) return;

    const dx = e.touches[0].clientX - this.data.startX;
    const dy = e.touches[0].clientY - this.data.startY;

    let newX = this.data.imgX + dx;
    let newY = this.data.imgY + dy;

    const { preW, preH, imgW, imgH } = this.data;

    const minX = preW - imgW;
    const maxX = 0;
    const minY = preH - imgH;
    const maxY = 0;

    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    this.setData({
      imgX: newX,
      imgY: newY,
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY
    });
    
    return false;
  },

  touchEnd() {
    this.setData({ isDragging: false });
  }
});