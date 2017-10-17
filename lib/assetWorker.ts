import { parseAssetBundle, rotateAndConvertToPng } from 'ab-parser';

function parseAndConvertToPng(data: any): any {
    let assetBundle = parseAssetBundle(data);
    if (!assetBundle || !assetBundle.imageBitmap) {
        console.error('Fail to parse an image out of this bundle!');
        return [];
    }
    else {
        return rotateAndConvertToPng(assetBundle.imageBitmap.data, assetBundle.imageBitmap.width, assetBundle.imageBitmap.height);
    }
}

self.addEventListener('message', (message: any) => {
    let result = parseAndConvertToPng(message.data);
    (self as any).postMessage(result/*, [result]*/); //TODO: Apparently, this polyfilled buffer is not Transferrable

    // close this worker
    self.close();
});