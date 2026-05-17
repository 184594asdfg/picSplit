Page({
  data: {
    selectedImages: [],
    currentTemplate: 5
  },

  handleTemplateChange(e) {
    this.setData({
      currentTemplate: e.currentTarget.dataset.index
    })
  },

  handleSelectImage() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      success: res => {
        this.setData({
          selectedImages: res.tempFiles.map(i => i.tempFilePath)
        })
      }
    })
  },

  handleSaveImage() {
    wx.showToast({ title: '保存成功' })
  }
})