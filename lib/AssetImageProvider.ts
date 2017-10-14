import STTApi from "./index";
import CONFIG from "./CONFIG";
import { ImageProvider, ImageCache, IFoundResult } from './ImageProvider';

import { parseAssetBundle, rotateAndConvertToPng } from 'ab-parser';

//import * as fs from 'fs';

export class DummyImageCache implements ImageCache {
    getImage(url: string): string | undefined {
        return undefined;
    }

    saveImage(url: string, data: Buffer): string {
        //fs.writeFileSync('./' + url + '.png', data);
        //return './' + url + '.png';
        return "dummy";
    }
}

export class AssetImageProvider implements ImageProvider {
    private _imageCache: ImageCache;

    constructor() {
        this._imageCache = new DummyImageCache();
    }

    getCrewImageUrl(crew: any, fullBody: boolean, id: any): Promise<IFoundResult> {
        return this.getImageUrl(fullBody ? crew.full_body.file : crew.portrait.file, id);
    }

    getShipImageUrl(ship: any, id: any): Promise<IFoundResult> {
        return this.getImageUrl(ship.icon.file, id); //schematic_icon
    }

    getItemImageUrl(item: any, id: any): Promise<IFoundResult> {
        return this.getImageUrl(item.icon.file, id);
    }

    getFactionImageUrl(faction: any, id: any): Promise<IFoundResult> {
        return this.getImageUrl(faction.icon.file, id); //faction.reputation_item_icon.file and faction.shuttle_token_preview_item.icon.file
    }

    private getImageUrl(iconFile: string, id: any): Promise<IFoundResult> {
        let cachedUrl: string | undefined = this._imageCache.getImage(iconFile);
        if (cachedUrl) {
            return Promise.resolve({
                id: id,
                url: cachedUrl
            });
        }

        return STTApi.networkHelper.getRaw(this.getAssetUrl(iconFile), undefined).then((data: any) => {
            if (!data) {
                return Promise.reject('Fail to load image');
            }

            let assetBundle = parseAssetBundle(data);
            if (!assetBundle || !assetBundle.imageBitmap) {
                return Promise.reject('Fail to load image');
            }

            let pngImage = rotateAndConvertToPng(assetBundle.imageBitmap.data, assetBundle.imageBitmap.width, assetBundle.imageBitmap.height);
            return Promise.resolve({
                id: id,
                url: this._imageCache.saveImage(iconFile, pngImage)
            });
        });
    }

    private getAssetUrl(iconFile: string): string {
        let urlAsset = STTApi.serverConfig.config.asset_server + 'bundles/' + CONFIG.CLIENT_PLATFORM + '/default/' + CONFIG.CLIENT_VERSION + '/' + STTApi.serverConfig.config.asset_bundle_version + '/';
        return urlAsset + 'images' + iconFile.replace(new RegExp('/', 'g'), '_') + '.sd';
    }
}