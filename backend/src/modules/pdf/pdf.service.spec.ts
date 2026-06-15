import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';
import * as fs from 'fs';

jest.mock('fs');
jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({ text: 'conteúdo do PDF' }));

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();
    service = module.get<PdfService>(PdfService);
    (service as any).cachedText = null;
    (service as any).lastLoadedTime = 0;
  });

  it('returns empty string when data/ directory does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const result = await service.getPDFContent();
    expect(result).toBe('');
  });

  it('returns empty string when no PDFs in data/', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['readme.txt']);
    const result = await service.getPDFContent();
    expect(result).toBe('');
  });

  it('extracts text from PDF and caches it', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['manual.pdf']);
    (fs.statSync as jest.Mock).mockReturnValue({ mtimeMs: 1000 });
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake'));

    const result = await service.getPDFContent();

    expect(result).toContain('conteúdo do PDF');
    expect(result).toContain('manual.pdf');
  });
});
