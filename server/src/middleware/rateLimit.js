import rateLimit from 'express-rate-limit';

export const submitRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau.' },
});

export const trackRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn tra cứu quá nhiều lần trong thời gian ngắn. Vui lòng thử lại sau.' },
});

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn thao tác quá nhiều lần trong thời gian ngắn. Vui lòng thử lại sau.' },
});
