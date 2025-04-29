import nodemailer from 'nodemailer';

export const createTransporter = async () => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // 验证邮件配置
  try {
    await transporter.verify();
    console.log('Email server is ready to send messages');
  } catch (error) {
    console.error('Email server configuration error:', error);
  }

  return transporter;
}; 