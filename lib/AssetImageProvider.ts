import STTApi from "./index";
import CONFIG from "./CONFIG";
import { ImageProvider, ImageCache, IFoundResult } from './ImageProvider';

import { parseAssetBundle, rotateAndConvertToPng } from 'ab-parser';

export class DummyImageCache implements ImageCache {
    getImage(url: string): string | undefined {
        return undefined;
    }

    saveImage(url: string, data: Buffer): string {
        return "data:image/png;base64," + data.toString('base64');
    }
}

export class AssetImageProvider implements ImageProvider {
    private _imageCache: ImageCache;
    private _baseURLAsset: string;

    constructor(imageCache: ImageCache|undefined) {
        if (imageCache) {
            this._imageCache = imageCache;
        }
        else {
            this._imageCache = new DummyImageCache();
        }
        this._baseURLAsset = '';
    }

    get baseURLAsset(): string {
        if (this._baseURLAsset.length == 0) {
            this._baseURLAsset = STTApi.serverConfig.config.asset_server + 'bundles/' + CONFIG.CLIENT_PLATFORM + '/default/' + CONFIG.CLIENT_VERSION + '/' + STTApi.serverConfig.config.asset_bundle_version + '/';
        }
		return this._baseURLAsset;
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

    getSprite(assetName: string, spriteName: string, id: any): Promise<IFoundResult> {
        let cachedUrl: string | undefined = this._imageCache.getImage(assetName + '_' + spriteName);
        if (cachedUrl) {
            return Promise.resolve({
                id: id,
                url: cachedUrl
            });
        }

        return STTApi.networkHelper.getRaw(this.baseURLAsset + assetName + '.sd', undefined).then((data: any) => {
            if (!data) {
                return Promise.reject('Fail to load image');
            }
    
            let assetBundle = parseAssetBundle(data);
            if (!assetBundle || !assetBundle.imageBitmap) {
                return Promise.reject('Fail to load image');
            }

            let sprite = assetBundle.sprites.find((sprite: any) => sprite.spriteName == spriteName);
            if (!sprite) {
                return Promise.reject('Sprite not found');
            }

            let pngImage = rotateAndConvertToPng(sprite.spriteBitmap.data, sprite.spriteBitmap.width, sprite.spriteBitmap.height);
            return Promise.resolve({
                id: id,
                url: this._imageCache.saveImage(assetName + '_' + spriteName, pngImage)
            });
        })
    }

    private getImageUrl(iconFile: string, id: any): Promise<IFoundResult> {
        let cachedUrl: string | undefined = this._imageCache.getImage(iconFile);
        if (cachedUrl) {
            return Promise.resolve({
                id: id,
                url: cachedUrl
            });
        }

        // Most assets have the .sd extensions, a few have the .ld extension; this is available in asset_bundles but I can't extract that in JavaScript
        return STTApi.networkHelper.getRaw(this.getAssetUrl(iconFile) + '.sd', undefined).then((data: any) => {
            return this.processData(iconFile, id, data);
        }).catch((error) => {
			return STTApi.networkHelper.getRaw(this.getAssetUrl(iconFile) + '.ld', undefined).then((data: any) => {
                return this.processData(iconFile, id, data);
            });
		});
    }

    private processData(iconFile: string, id: any, data: any): Promise<IFoundResult> {
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
    }

    private getAssetUrl(iconFile: string): string {
        return this.baseURLAsset + 'images' + iconFile.replace(new RegExp('/', 'g'), '_');
    }
}