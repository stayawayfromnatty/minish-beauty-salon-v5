const Jimp = require('jimp');

const sizes = [
  {folder:'mipmap-mdpi', size:48},
  {folder:'mipmap-hdpi', size:72},
  {folder:'mipmap-xhdpi', size:96},
  {folder:'mipmap-xxhdpi', size:144},
  {folder:'mipmap-xxxhdpi', size:192}
];

(async () => {
  const img = await Jimp.Jimp.read('logo.jpeg').catch(async () => {
    // Try alternative import style
    const { Jimp: J } = require('jimp');
    return J.read('logo.jpeg');
  });
  
  for(const s of sizes) {
    const copy = img.clone().resize({ w: s.size, h: s.size });
    await copy.write('android/app/src/main/res/'+s.folder+'/ic_launcher.png');
    const copy2 = img.clone().resize({ w: s.size, h: s.size });
    await copy2.write('android/app/src/main/res/'+s.folder+'/ic_launcher_round.png');
    console.log('Done: ' + s.folder);
  }
  console.log('All icons updated!');
})().catch(console.error);
