import { parseAssetBundle } from 'ab-parser';

function parseAndConvertToPng(data: any): any {
    let assetBundle = parseAssetBundle(new Uint8Array(data.buffer));
    if (!assetBundle || !assetBundle.imageBitmap) {
        console.error('Fail to parse an image out of this bundle!');
        return [];
    }
    else {
        if (data.assetName && data.assetName.length > 0) {
            let sprite = assetBundle.sprites.find((sprite: any) => sprite.spriteName == data.spriteName);
            if (!sprite) {
                console.error('Sprite not found!');
                return [];
            }
            return sprite.spriteBitmap;
        }
        else {
            return assetBundle.imageBitmap;
        }
    }
}

self.addEventListener('message', (message: any) => {
    let result = parseAndConvertToPng(message.data);

    if (result.data.length > 0) {
        (self as any).postMessage(result, [result.data.buffer]);
    }
    else {
        (self as any).postMessage(result);
    }

    // close this worker
    self.close();
});