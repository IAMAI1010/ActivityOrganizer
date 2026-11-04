const { fetchActivity, createSignup, rememberSignup } = require('../../utils/data');
const { toDisplayActivity } = require('../../utils/format');

const PHONE_RE = /^1\d{10}$/;

Page({
    data: {
        activityId: '',
        viewState: 'loading',
        activityTitle: '',
        nickname: '',
        name: '',
        phone: '',
        fields: [],
        submitting: false,
        errorMessage: '',
        errorKey: '',
    },

    onLoad(query) {
        const options = query || {};
        const activityId = options.activityId ? String(options.activityId) : '';
        if (!activityId) {
            this.setData({
                viewState: 'error',
                errorMessage: '缺少活动编号，请从活动卡片重新打开。',
            });
            return;
        }
        this.setData({ activityId });
        this.loadActivity();
    },

    async loadActivity() {
        const { data, error } = await fetchActivity(this.data.activityId);
        if (error || !data) {
            this.setData({
                viewState: 'error',
                errorMessage: error ? error.message : '活动不存在或已被删除。',
            });
            return;
        }
        const activity = toDisplayActivity(data);
        this.activityMeta = activity;
        this.setData({
            viewState: 'ready',
            activityTitle: activity.title,
            fields: activity.formFields,
        });
    },

    handleRetry() {
        this.setData({ viewState: 'loading', errorMessage: '' });
        this.loadActivity();
    },

    onNicknameInput(event) {
        this.setData({ nickname: event.detail.value, errorMessage: '', errorKey: '' });
    },

    onNameInput(event) {
        this.setData({ name: event.detail.value });
    },

    onPhoneInput(event) {
        this.setData({ phone: event.detail.value, errorMessage: '', errorKey: '' });
    },

    onFieldInput(event) {
        const index = Number(event.currentTarget.dataset.index);
        this.setData({
            [`fields[${index}].value`]: event.detail.value,
            errorMessage: '',
            errorKey: '',
        });
    },

    onFieldPicker(event) {
        const index = Number(event.currentTarget.dataset.index);
        const pickerIndex = Number(event.detail.value);
        const options = this.data.fields[index].options || [];
        this.setData({
            [`fields[${index}].pickerIndex`]: pickerIndex,
            [`fields[${index}].pickerText`]: options[pickerIndex] || '',
            errorMessage: '',
            errorKey: '',
        });
    },

    validate() {
        const nickname = this.data.nickname.trim();
        if (!nickname) {
            return { message: '请先填写微信昵称，点击输入框可以一键带入。', key: 'nickname' };
        }
        const phone = this.data.phone.trim();
        if (phone && !PHONE_RE.test(phone)) {
            return { message: '手机号格式不对，请填写 11 位手机号，或留空。', key: 'phone' };
        }
        const missing = this.data.fields.find(field => field.required && !String(field.value || '').trim());
        if (missing) {
            return { message: `请填写「${missing.label}」。`, key: missing.key };
        }
        return null;
    },

    buildAnswers() {
        const answers = {};
        this.data.fields.forEach(field => {
            const value = field.type === 'select' ? field.pickerText : field.value;
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                answers[field.key] = String(value).trim();
            }
        });
        return answers;
    },

    async submitForm() {
        if (this.data.submitting) return;
        const invalid = this.validate();
        if (invalid) {
            this.setData({ errorMessage: invalid.message, errorKey: invalid.key });
            return;
        }

        this.setData({ submitting: true, errorMessage: '', errorKey: '' });
        const { error } = await createSignup({
            activityId: this.data.activityId,
            nickname: this.data.nickname.trim(),
            name: this.data.name.trim(),
            phone: this.data.phone.trim(),
            answers: this.buildAnswers(),
        });

        if (error) {
            this.setData({
                submitting: false,
                errorMessage: error.message || '报名提交失败，请稍后重试。',
            });
            return;
        }

        const meta = this.activityMeta || { id: this.data.activityId, title: this.data.activityTitle };
        rememberSignup({
            id: this.data.activityId,
            title: meta.title,
            start_at: meta.start_at,
            location: meta.location,
            cover_url: meta.cover_url,
        });
        this.setData({ submitting: false });
        wx.redirectTo({
            url: `/pages/detail/detail?activityId=${this.data.activityId}&submitted=1`,
            fail() {
                wx.showToast({ title: '报名成功', icon: 'success' });
            },
        });
    },
});
