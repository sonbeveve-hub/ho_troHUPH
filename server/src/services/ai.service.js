import fs from 'node:fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env, isGeminiConfigured } from '../config/env.js';
import { getAttachmentFilePath } from './attachments.service.js';

const MAX_IMAGES = 4;

let client = null;
function getClient() {
  if (!isGeminiConfigured()) return null;
  if (!client) client = new GoogleGenerativeAI(env.gemini.apiKey);
  return client;
}

function buildImageParts(requestId, attachments) {
  return attachments.slice(0, MAX_IMAGES).map((a) => {
    const data = fs.readFileSync(getAttachmentFilePath(requestId, a.stored_name)).toString('base64');
    return { inlineData: { data, mimeType: a.mime_type } };
  });
}

const SYSTEM_PROMPT = `Bạn là kỹ thuật viên hỗ trợ CNTT chuyên nghiệp, giàu kinh nghiệm, thuộc Trung tâm Tin học (TTTH),
Trường Đại học Y tế Công cộng. Nhiệm vụ: đọc mô tả sự cố (và ảnh đính kèm nếu có) do cán bộ/giảng viên gửi lên, phân
tích như một kỹ thuật viên thực thụ rồi đưa ra chẩn đoán và hướng khắc phục, bằng tiếng Việt, giọng văn chuyên
nghiệp, lịch sự, rõ ràng, dễ hiểu với người không rành kỹ thuật. Luôn xưng hô với người gửi là "thầy/cô" (không dùng
"anh/chị"), và khi nhắc tới bản thân/đơn vị hỗ trợ thì dùng "TTTH" (không dùng "chúng tôi" hay "tôi").

Khi đưa ra gợi ý ban đầu, LUÔN trình bày theo đúng cấu trúc sau:
Chẩn đoán: <1-2 câu dự đoán cụ thể nguyên nhân/loại lỗi, dựa trên mô tả và ảnh (nếu có)>
Hướng khắc phục:
1. <bước cụ thể>
2. <bước cụ thể>
...

Nếu sự cố có thể tự khắc phục (khởi động lại thiết bị, kiểm tra dây cắm, đổi cổng, khởi động lại phần mềm...), hãy
hướng dẫn cụ thể từng bước. Nếu sự cố cần kỹ thuật viên can thiệp trực tiếp (hỏng phần cứng, cần cấp quyền hệ
thống...), hãy nói rõ trong phần chẩn đoán và trấn an rằng TTTH sẽ liên hệ sớm. Không dùng markdown hay dấu *, chỉ
dùng văn bản thuần. Trả lời trong khoảng 100-180 từ.`;

function buildContextText({ description, departmentName, requestTypeName, relevantFaqs }) {
  const faqBlock =
    relevantFaqs && relevantFaqs.length
      ? `\n\nCác câu hỏi thường gặp TTTH đã xử lý trước đây, có thể liên quan (tham khảo nếu phù hợp, không bắt buộc áp dụng nguyên văn):\n${relevantFaqs
          .map((f, i) => `${i + 1}. Hỏi: ${f.question}\n   Đáp: ${f.answer}`)
          .join('\n')}`
      : '';
  return `Loại yêu cầu: ${requestTypeName || 'chưa rõ'}\nĐơn vị: ${departmentName || 'chưa rõ'}\nMô tả sự cố: ${description}${faqBlock}`;
}

export async function getInitialSuggestion({
  requestId,
  description,
  departmentName,
  requestTypeName,
  attachments,
  relevantFaqs,
}) {
  const genAI = getClient();
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({ model: env.gemini.model });
  const parts = [
    { text: `${SYSTEM_PROMPT}\n\n${buildContextText({ description, departmentName, requestTypeName, relevantFaqs })}` },
    ...buildImageParts(requestId, attachments),
  ];

  const result = await model.generateContent(parts);
  return result.response.text().trim();
}

export async function getAlternativeSuggestion({
  requestId,
  description,
  departmentName,
  requestTypeName,
  attachments,
  previousSuggestion,
  relevantFaqs,
}) {
  const genAI = getClient();
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({ model: env.gemini.model });
  const parts = [
    {
      text: `${SYSTEM_PROMPT}\n\n${buildContextText({ description, departmentName, requestTypeName, relevantFaqs })}\n\nBạn đã gợi ý trước đó:\n"${previousSuggestion}"\nNgười dùng cho biết cách này KHÔNG khắc phục được sự cố. Hãy đưa ra một chẩn đoán và hướng khác (không lặp lại cách cũ), vẫn theo đúng cấu trúc "Chẩn đoán:" rồi "Hướng khắc phục:". Nếu không còn cách nào để tự khắc phục, hãy nói rõ trong phần chẩn đoán và trấn an rằng TTTH sẽ liên hệ trực tiếp sớm.`,
    },
    ...buildImageParts(requestId, attachments),
  ];

  const result = await model.generateContent(parts);
  return result.response.text().trim();
}

const CHAT_INTRO_REPLY = 'Dạ, TTTH đã sẵn sàng trao đổi thêm với thầy/cô ạ.';

export async function getChatReply({
  requestId,
  description,
  departmentName,
  requestTypeName,
  attachments,
  history,
  userMessage,
  relevantFaqs,
}) {
  const genAI = getClient();
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({ model: env.gemini.model });

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `${SYSTEM_PROMPT}\n\n${buildContextText({ description, departmentName, requestTypeName, relevantFaqs })}\n\nTừ đây, hãy tiếp tục trò chuyện tự nhiên để giải đáp thêm câu hỏi hoặc hướng dẫn chi tiết hơn cho thầy/cô, vẫn giữ đúng vai trò và giọng văn trên. Trả lời ngắn gọn, đúng trọng tâm câu hỏi, không cần lặp lại toàn bộ hướng dẫn trước đó trừ khi được yêu cầu. Không dùng markdown hay dấu *.`,
        },
        ...buildImageParts(requestId, attachments),
      ],
    },
    { role: 'model', parts: [{ text: CHAT_INTRO_REPLY }] },
    ...(history || [])
      .filter((m) => m.text)
      .map((m) => ({
        role: m.from === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const result = await model.generateContent({ contents });
  return result.response.text().trim();
}
