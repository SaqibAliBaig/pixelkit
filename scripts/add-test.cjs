const fs = require('fs');

let testContent = fs.readFileSync('tests/adjustments.test.ts', 'utf8');
if (!testContent.includes("applies 3:4 portrait crop correctly")) {
  const target = "  it('applies 5:7 Canada visa crop correctly', async () => {\r\n" +
"    const src = await createTestBitmap(1000, 1000); // 1:1 square source\r\n" +
"    const adjusted = await applyAdjustments(src, { cropAspect: '5:7' });\r\n" +
"\r\n" +
"    // Target ratio 5:7 (~0.714)\r\n" +
"    const ratio = adjusted.width / adjusted.height;\r\n" +
"    expect(Math.abs(ratio - (5 / 7))).toBeLessThan(0.01);\r\n" +
"    src.close?.();\r\n" +
"    adjusted.close?.();\r\n" +
"  });";

  const replacement = target + "\r\n\r\n  it('applies 3:4 portrait crop correctly', async () => {\r\n" +
"    const src = await createTestBitmap(1000, 1000); // 1:1 square source\r\n" +
"    const adjusted = await applyAdjustments(src, { cropAspect: '3:4' });\r\n" +
"\r\n" +
"    // Target ratio 3:4 (0.75)\r\n" +
"    const ratio = adjusted.width / adjusted.height;\r\n" +
"    expect(Math.abs(ratio - (3 / 4))).toBeLessThan(0.01);\r\n" +
"    src.close?.();\r\n" +
"    adjusted.close?.();\r\n" +
"  });";

  if (testContent.includes(target)) {
    testContent = testContent.replace(target, replacement);
  } else {
    // try with \n
    const targetLf = target.replace(/\r\n/g, '\n');
    const replLf = replacement.replace(/\r\n/g, '\n');
    testContent = testContent.replace(targetLf, replLf);
  }
  fs.writeFileSync('tests/adjustments.test.ts', testContent, 'utf8');
  console.log('Added 3:4 test to tests/adjustments.test.ts');
}
