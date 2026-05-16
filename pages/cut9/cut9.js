Page({
  data: {
    shapes: [
      { id: 1, icon: '/images/masks/square.png' },
    ],
    selectedShape: 1,
    selectedImage: null,
    currentShapeIcon: '/images/masks/square.png',

    preW: 0,
    preH: 0,
    imgW: 0,
    imgH: 0,
    imgX: 0,
    imgY: 0,
    originalW: 0,
    originalH: 0
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
    const scale = Math.min(pw / iw, ph / ih);
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
      const src = this.data.selectedImage;

      const realInfo = await this.getImageInfoSafe(src);
      const originalW = realInfo.width;
      const originalH = realInfo.height;

      const partW = Math.floor(originalW / 3);
      const partH = Math.floor(originalH / 3);

      const points = [
        { x: 0, y: 0 },
        { x: partW, y: 0 },
        { x: partW * 2, y: 0 },
        { x: 0, y: partH },
        { x: partW, y: partH },
        { x: partW * 2, y: partH },
        { x: 0, y: partH * 2 },
        { x: partW, y: partH * 2 },
        { x: partW * 2, y: partH * 2 }
      ];

      const previewList = [];
      for (let i = 0; i < 9; i++) {
        wx.showLoading({ title: `保存中 ${i + 1}/9`, mask: true });
        const p = points[i];
        const path = await this.cropImage(src, p.x, p.y, partW, partH);
        await this.saveImg(path);
        previewList.push(path);
      }

      wx.hideLoading();
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/result/result?images=${encodeURIComponent(JSON.stringify(previewList))}`
        });
      }, 500);

    } catch (e) {
      wx.hideLoading();
      console.error(e);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this._saving = false;
    }
  },

  getImageInfoSafe(src) {
    return new Promise((resolve) => {
      wx.getImageInfo({ src, success: resolve, fail: resolve });
    });
  },

  ensureAlbumAuth() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          const auth = res.authSetting['scope.writePhotosAlbum'];
          if (auth === true) resolve();
          else if (auth === false) {
            wx.showModal({
              title: '提示', content: '需要保存相册权限',
              success: () => resolve()
            });
          } else {
            wx.authorize({
              scope: 'scope.writePhotosAlbum',
              success: resolve, fail: resolve
            });
          }
        },
        fail: () => resolve()
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
  }
});