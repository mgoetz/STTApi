export interface IFoundResult {
	id: any;
	url: string | undefined;
}

export interface ImageCache {
	getImage(url: string): Promise<string|undefined>;
	saveImage(url: string, data: Buffer): Promise<string>;
}

export interface ImageProvider {
	getCrewImageUrl(crew: any, fullBody: boolean, id: any): Promise<IFoundResult>;
	getShipImageUrl(ship: any, id: any): Promise<IFoundResult>;
	getItemImageUrl(item: any, id: any): Promise<IFoundResult>;
	getFactionImageUrl(faction: any, id: any): Promise<IFoundResult>;
	getSprite(assetName: string, spriteName: string, id: any): Promise<IFoundResult>;
	getImageUrl(iconFile: string, id: any): Promise<IFoundResult>;
}