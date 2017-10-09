export interface Rarity {
	name: string;
	color: string;
}

function rgbToHex(r: number, g: number, b: number): string {
	return "#" + ((b | g << 8 | r << 16) / 0x1000000).toString(16).substring(2);
}

export default class CONFIG {
	static readonly URL_PLATFORM: string = "https://thorium.disruptorbeam.com/";
	static readonly URL_SERVER: string = "https://stt.disruptorbeam.com/";

	// default client_id of the Steam Windows version of STT
	static readonly CLIENT_ID: string = "4fc852d7-d602-476a-a292-d243022a475d";
	static readonly CLIENT_API_VERSION: number = 8;
	static readonly CLIENT_VERSION: string = "3.0.0";

	// feedback form endpoint URL
	static readonly URL_USERFEEDBACK: string = "https://prod-23.westus.logic.azure.com:443/workflows/fb9aad14945947ee96196506c5cb99c4/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=7DdF1Ybdsk60b2Q2m063oQcxDEvzKXoT3y741A6CL1s";

	// releases URL
	static readonly URL_GITHUBRELEASES: string = "https://api.github.com/repos/IAmPicard/StarTrekTimelinesSpreadsheet/releases";

	static readonly DEFAULT_ITEM_ICON: string = 'https://stt.wiki/w/images/d/d6/ItemNameBasic.png';

	// Every 10 days, check the wiki again for updated / new images
	static readonly HOURS_TO_RECOVERY: number = 24 * 10;

	static readonly RARITIES: Rarity[] = [
		{ name: 'Basic', color: 'Grey' },
		{ name: 'Common', color: rgbToHex(155, 155, 155) },
		{ name: 'Uncommon', color: rgbToHex(80, 170, 60) },
		{ name: 'Rare', color: rgbToHex(90, 170, 255) },
		{ name: 'Super Rare', color: rgbToHex(170, 45, 235) },
		{ name: 'Legendary', color: rgbToHex(253, 210, 106) }
	];
}