Page({
  data: {
    previewList: []
  },

  onLoad(options) {
    // 从上一页传入的图片列表
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
    wx.navigateBack()
  },

  onActionTap(e) {
    const action = e.currentTarget.dataset.action
    switch (action) {
      case 'grid':
        wx.redirectTo({ url: '/pages/cut9/cut9' })
        break
      case 'collage':
        wx.showToast({ title: '自由拼图功能开发中', icon: 'none' })
        break
      case 'share':
        this.onShare()
        break
    }
  },

  onShare() {
    // 分享给朋友
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  onToggleExpand() {
    // 展开/收起预览
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
    return {
      title: '看看我切好的图片',
      path: '/pages/index/index'
    }
  }
})
