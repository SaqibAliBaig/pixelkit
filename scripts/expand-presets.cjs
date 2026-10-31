const fs = require('fs');

// 1. Update types.ts
let typesContent = fs.readFileSync('src/lib/worker/types.ts', 'utf8');
if (!typesContent.includes("'3:4'")) {
  typesContent = typesContent.replace(
    /('5:7')/,
    "$1\r\n  | '3:4'"
  );
  if (!typesContent.includes("'3:4'")) {
    typesContent = typesContent.replace(
      /('5:7')/,
      "$1\n  | '3:4'"
    );
  }
  fs.writeFileSync('src/lib/worker/types.ts', typesContent, 'utf8');
  console.log('Updated types.ts with 3:4 aspect');
}

// 2. Update adjustments.ts
let adjContent = fs.readFileSync('src/lib/worker/adjustments.ts', 'utf8');
if (!adjContent.includes("'3:4'")) {
  adjContent = adjContent.replace(
    /('5:7': 5 \/ 7,)/,
    "$1\r\n  '3:4': 3 / 4,"
  );
  if (!adjContent.includes("'3:4'")) {
    adjContent = adjContent.replace(
      /('5:7': 5 \/ 7,)/,
      "$1\n  '3:4': 3 / 4,"
    );
  }
  fs.writeFileSync('src/lib/worker/adjustments.ts', adjContent, 'utf8');
  console.log('Updated adjustments.ts with 3:4 aspect');
}
