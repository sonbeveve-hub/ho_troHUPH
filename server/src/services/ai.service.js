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

const SYSTEM_PROMPT = `Bạn là trợ lý hỗ trợ kỹ thuật (IT helpdesk) của Trung tâm Tin học (TTTH), Trường Đại học Y tế Công cộng.
Nhiệm vụ: đọc mô tả sự cố (và ảnh đính kèm nếu có) do cán bộ/giảng viên gửi lên, rồi đưa ra hướng dẫn khắc phục ngắn
gọn, theo từng bước cụ thể, bằng tiếng Việt, giọng văn lịch sự, thân thiện, dành cho người không rành kỹ thuật.
Luôn xưng hô với người gửi là "thầy/cô" (không dùng "anh/chị"), và khi nhắc tới bản thân/đơn vị hỗ trợ thì dùng
"TTTH" (không dùng "chúng tôi" hay "tôi"). Nếu sự cố có thể tự khắc phục (khởi động lại thiết bị, kiểm tra dây cắm,
đổi cổng, khởi động lại phần mềm...), hãy hướng dẫn cụ thể từng bước. Nếu sự cố cần kỹ thuật viên can thiệp trực
tiếp (hỏng phần cứng, cần cấp quyền hệ thống...), hãy nói rõ điều đó và trấn an rằng TTTH sẽ liên hệ sớm. Không
dùng markdown hay dấu *, chỉ dùng văn bản thuần với các bước đánh số (1., 2., 3. ...). Trả lời trong khoảng 80-150
từ.`;

function buildContextText({ description, departmentName, requestTypeName }) {
  return `Loại yêu cầu: ${requestTypeName || 'chưa rõ'}\nĐơn vị: ${departmentName || 'chưa rõ'}\nMô tả sự cố: ${description}`;
}

export async function getInitialSuggestion({ requestId, description, departmentName, requestTypeName, attachments }) {
  const genAI = getClient();
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({ model: env.gemini.model });
  const parts = [
    { text: `${SYSTEM_PROMPT}\n\n${buildContextText({ description, departmentName, requestTypeName })}` },
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
}) {
  const genAI = getClient();
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({ model: env.gemini.model });
  const parts = [
    {
      text: `${SYSTEM_PROMPT}\n\n${buildContextText({ description, departmentName, requestTypeName })}\n\nBạn đã gợi ý trước đó:\n"${previousSuggestion}"\nNgười dùng cho biết cách này KHÔNG khắc phục được sự cố. Hãy đưa ra một hướng khác (không lặp lại cách cũ). Nếu không còn cách nào để tự khắc phục, hãy nói rõ và trấn an rằng đội ngũ hỗ trợ sẽ liên hệ trực tiếp sớm.`,
    },
    ...buildImageParts(requestId, attachments),
  ];

  const result = await model.generateContent(parts);
  return result.response.text().trim();
}
