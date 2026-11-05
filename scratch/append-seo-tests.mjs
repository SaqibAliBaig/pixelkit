import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('tests/seo.test.ts');
let content = fs.readFileSync(filePath, 'utf8');

const newSuite = `
describe('IndexNow and LLM automated synchronization', () => {
  it('public IndexNow key verification file exists and matches key', () => {
    const key = 'e2a48f93b1c04d8e95712fa6b301c89e';
    const keyPath = path.resolve('public', \`\${key}.txt\`);
    expect(fs.existsSync(keyPath)).toBe(true);
    const content = fs.readFileSync(keyPath, 'utf8').trim();
    expect(content).toBe(key);
  });

  it('public/llms.txt contains privacy guarantees and official portal presets', () => {
    const llmsPath = path.resolve('public/llms.txt');
    expect(fs.existsSync(llmsPath)).toBe(true);
    const text = fs.readFileSync(llmsPath, 'utf8');
    expect(text).toContain('# PixelKit');
    expect(text).toContain('Zero Server Uploads');
    expect(text).toContain('Official Government & Consular Exam Presets');
    expect(text).toContain('https://pixelkit.app/ssc-photo-resizer/');
    expect(text).toContain('https://pixelkit.app/signature-resizer/');
  });

  it('public/llms-full.txt contains master requirements matrix and query instructions', () => {
    const fullPath = path.resolve('public/llms-full.txt');
    expect(fs.existsSync(fullPath)).toBe(true);
    const text = fs.readFileSync(fullPath, 'utf8');
    expect(text).toContain('Official Portal Requirements Master Matrix');
    expect(text).toContain('Step-by-Step Instructions for AI Agent Queries');
    expect(text).toContain('Codec & Processing Engine Specifications');
  });
});
`;

if (!content.includes('IndexNow and LLM automated synchronization')) {
  content += newSuite;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Appended IndexNow and LLM tests to tests/seo.test.ts');
} else {
  console.log('Already present');
}

