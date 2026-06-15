import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';

const mockSendMessage = jest.fn();
const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
const mockGetGenerativeModel = jest.fn().mockReturnValue({ startChat: mockStartChat });

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
  Content: {},
}));

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();
    service = module.get<AiService>(AiService);
  });

  it('generateResponse calls Gemini and returns text', async () => {
    mockSendMessage.mockResolvedValue({
      response: { text: () => 'Olá! Posso ajudar?' },
    });

    const result = await service.generateResponse(
      'João',
      'Qual o horário?',
      [],
      'Você é um assistente de suporte.',
    );

    expect(result).toBe('Olá! Posso ajudar?');
    expect(mockGetGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
        systemInstruction: expect.stringContaining('João'),
      }),
    );
  });

  it('falls back to secondary model when primary fails 3 times', async () => {
    const primaryError = Object.assign(new Error('overloaded'), { status: 503 });
    mockSendMessage
      .mockRejectedValueOnce(primaryError)
      .mockRejectedValueOnce(primaryError)
      .mockRejectedValueOnce(primaryError)
      .mockResolvedValueOnce({ response: { text: () => 'resposta do fallback' } });

    const result = await service.generateResponse('Ana', 'Oi', [], 'Prompt');

    expect(result).toBe('resposta do fallback');
    expect(mockSendMessage).toHaveBeenCalledTimes(4);
  });

  it('does not retry on 400 errors', async () => {
    const badRequest = Object.assign(new Error('bad request'), { status: 400 });
    mockSendMessage.mockRejectedValue(badRequest);

    await expect(
      service.generateResponse('Maria', 'Oi', [], 'Prompt'),
    ).rejects.toThrow();

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });
});
