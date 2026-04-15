const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const width = 512;
const height = 512;

async function generateNFT(basePath, outputPath, index) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Load base image
    const base = await loadImage(basePath);
    ctx.drawImage(base, 0, 0, width, height);

    // Random overlay: simple green/red circle
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, 50, 0, Math.PI * 2);
    ctx.fill();

    // Random text ID
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText(`#${index}`, 20, height - 30);

    // Save to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(outputPath, `nft_${index}.png`), buffer);
}

(async () => {
    const basePath = path.join(__dirname, '../assets/nft.jpg');
    const outputPath = path.join(__dirname, '../output');

    if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath);

    const count = 50; // number of NFTs to generate
    for (let i = 0; i < count; i++) {
        await generateNFT(basePath, outputPath, i + 1);
        console.log(`NFT ${i + 1} generated ✅`);
    }
})();