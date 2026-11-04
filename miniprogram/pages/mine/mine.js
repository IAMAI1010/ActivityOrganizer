const { listLocalSignups } = require('../../utils/data');
const { formatTimeRange } = require('../../utils/format');

Page({
    data: {
        viewState: 'loading',
        items: [],
    },

    onShow() {
        const rows = listLocalSignups();
        const items = rows.map(row => ({
            id: row.id,
            title: row.title || '活动',
            timeText: formatTimeRange(row.start_at, row.end_at),
            location: row.location || '',
        }));
        this.setData({
            viewState: items.length === 0 ? 'empty' : 'ready',
            items,
        });
    },

    openDetail(event) {
        const activityId = event.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/detail/detail?activityId=${activityId}`,
            fail() {
                wx.showToast({ title: '页面打开失败', icon: 'none' });
            },
        });
    },

    goHome() {
        wx.reLaunch({ url: '/pages/index/index' });
    },
});
