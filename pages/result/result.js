Page({
  data: {
    previewList: [],
    statusBarHeight: 0,
    navBarHeight: 0,
    // 'grid' = 来自九宫格切图（一行 3 个）；其他来源默认一行 4 个
    source: '',
    gridColumns: 4
  },

  onLoad(options) {
    const systemInfo = wx.getSystemInfoSync()
    const statusBarHeight = systemInfo.statusBarHeight || 20
    const menuButton = wx.getMenuButtonBoundingClientRect()
    const navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height
    this.setData({ statusBarHeight, navBarHeight })

    const source = options.source || ''
    this.setData({
      source,
      gridColumns: source === 'grid' ? 3 : 4
    })

    if (options.images) {
      try {
        const images = JSON.parse(decodeURIComponent(options.images))
        this.setData({ previewList: images })
      } catch (e) {
        console.error('解析图片列表失败', e)
      }
    }
  },

  onBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  },

  onActionTap(e) {
    const action = e.currentTarget.dataset.action
    switch (action) {
      case 'grid':
        wx.redirectTo({ url: '/pages/cut9/cut9' })
        break
      case 'collage':
        this.chooseImageForFreeCut()
        break
    }
  },

  chooseImageForFreeCut() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        wx.redirectTo({
          url: `/pages/freeCut/freeCut?image=${encodeURIComponent(tempFilePath)}`
        })
      },
      fail: () => {
        console.log('用户取消选择图片')
      }
    })
  },

  onToggleExpand() {
    wx.showToast({ title: '展开/收起功能开发中', icon: 'none' })
  },

  onPreviewTap(e) {
    const index = e.currentTarget.dataset.index
    const { previewList } = this.data
    if (previewList.length === 0) return

    wx.previewImage({
      current: previewList[index],
      urls: previewList
    })
  },

  onShareAppMessage() {
    const { previewList } = this.data
    const imageUrl = previewList && previewList.length > 0 ? previewList[previewList.length - 1] : ''
    return {
      title: '看看我切好的图片',
      path: '/pages/index/index',
      imageUrl
    }
  },

  onShareTimeline() {
    const { previewList } = this.data
    const imageUrl = previewList && previewList.length > 0 ? previewList[previewList.length - 1] : ''
    return {
      title: '看看我切好的图片',
      imageUrl
    }
  }
})
