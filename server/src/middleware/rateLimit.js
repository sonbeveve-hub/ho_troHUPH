import rateLimit from 'express-rate-limit';

export const submitRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau.' },
});
