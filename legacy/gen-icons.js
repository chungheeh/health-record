const { createCanvas } = require('canvas');
const fs = require('fs');

function makeIcon(size, path) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#667eea');
  grad.addColorStop(1, '#764ba2');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();
  ctx.font = `bold ${size * 0.55}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💪', size / 2, size / 2);
  fs.writeFileSync(path, canvas.toBuffer('image/png'));
  console.log('Created', path);
}

makeIcon(192, 'icon-192.png');
makeIcon(512, 'icon-512.png');
