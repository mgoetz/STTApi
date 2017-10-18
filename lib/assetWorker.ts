import { parseAssetBundle } from 'ab-parser';

function parseAndConvertToPng(data: any): any {
    let assetBundle = parseAssetBundle(new Uint8Array(data));
    if (!assetBundle || !assetBundle.imageBitmap) {
        console.error('Fail to parse an image out of this bundle!');
        return [];
    }
    else {
        return assetBundle.imageBitmap;
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