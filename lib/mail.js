exports.lib = class MAILER {
    constructor(i) {
        this.nodemailer = require('nodemailer');
        this.db = i.db;
        this.lib = i.lib;
        this.getAccount();
    }
    async getAccount() {
        [this.SMTP_HOST, this.SMTP_PORT, this.SMTP_USER, this.SMTP_PASS, this.SMTP_SECURE] = await this.lib.conf.get([
            'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE'
        ]);
        if (this.SMTP_HOST) {
            this.transporter = this.nodemailer.createTransport({
                host: this.SMTP_HOST,
                port: this.SMTP_PORT,
                secure: !!this.SMTP_SECURE,
                auth: {
                    user: this.SMTP_USER,
                    pass: this.SMTP_PASS
                }
            });
        } else {
            let testAccount = await this.nodemailer.createTestAccount();
            this.transporter = this.nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
        }
    }
    async send(to, subject, text, html = text) {
        let info = await this.transporter.sendMail({
            from: this.SMTP_USER, to, subject, text, html
        });
        return info.messageId;
    }
};
exports.depends = ['config'];
exports.id = 'mail';
exports.type = 'class';
