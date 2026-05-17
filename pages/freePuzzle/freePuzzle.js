Page({
  data: {
    selectedImages: [],
    currentTemplate: 0,
    leftBorderType: 'line-none',
    leftText: '无边框',
    leftLetter: '',
    leftIndex: 0,
  },

  onLeftIconChange() {
    const list = [
      { type: 'line-none', text: '无边框', letter: '' },
      { type: 'line-small', text: '小边框', letter: 'S' },
      { type: 'line-medium', text: '中边框', letter: 'M' },
      { type: 'line-large', text: '大边框', letter: 'L' },
    ]
    let idx = (this.data.leftIndex + 1) % list.length
    this.setData({
      leftIndex: idx,
      leftBorderType: list[idx].type,
      leftText: list[idx].text,
      leftLetter: list[idx].letter
    })
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