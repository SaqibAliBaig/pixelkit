const fs = require('fs');

let testContent = fs.readFileSync('tests/adjustments.test.ts', 'utf8');
const newTests = `
  it('applies 2:1 official signature crop correctly', async () => {
    const src = await createTestBitmap(1000, 1000); // 1:1 square source
    const adjusted = await applyAdjustments(src, { cropAspect: '2:1' });

    // Target ratio 2:1
    expect(adjusted.width).toBe(1000);
    expect(adjusted.height).toBe(500);
    src.close?.();
    adjusted.close?.();
  });

  it('applies 5:7 Canada visa crop correctly', async () => {
    const src = await createTestBitmap(1000, 1000); // 1:1 square source
    const adjusted = await applyAdjustments(src, { cropAspect: '5:7' });

    // Target ratio 5:7 (~0.714)
    const ratio = adjusted.width / adjusted.height;
    expect(Math.abs(ratio - (5 / 7))).toBeLessThan(0.01);
    src.close?.();
    adjusted.close?.();
  });
`;

if (!testContent.includes('applies 2:1 official signature crop correctly')) {
  testContent = testContent.replace(
    "adjusted.close?.();\n  });\n\n  it('applies percentage scaling correctly (50%)',",
    "adjusted.close?.();\n  });\n" + newTests + "\n  it('applies percentage scaling correctly (50%)',"
  );
  // In case of CRLF
  testContent = testContent.replace(
    "adjusted.close?.();\r\n  });\r\n\r\n  it('applies percentage scaling correctly (50%)',",
    "adjusted.close?.();\r\n  });\r\n" + newTests + "\r\n  it('applies percentage scaling correctly (50%)',"
  );
  fs.writeFileSync('tests/adjustments.test.ts', testContent, 'utf8');
  console.log('Added tests for 2:1 and 5:7');
}
