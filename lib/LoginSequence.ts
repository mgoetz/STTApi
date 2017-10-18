import STTApi from "./index";
import CONFIG from "./CONFIG";
import { matchCrew } from './CrewTools';
import { matchShips } from './ShipTools';
import { IFoundResult } from './ImageProvider';
import { loadMissionData } from './MissionTools';
import { calculateMissionCrewSuccess, calculateMinimalComplementAsync } from './MissionCrewSuccess';

export function loginSequence(onProgress: (description: string) => void, loadMissions: boolean = true): Promise<any> {
    var mainResources = [
        {
            loader: STTApi.loadCrewArchetypes.bind(STTApi),
            description: 'crew information'
        },
        {
            loader: STTApi.loadServerConfig.bind(STTApi),
            description: 'server configuration'
        },
        {
            loader: STTApi.loadPlatformConfig.bind(STTApi),
            description: 'platform configuration'
        },
        {
            loader: STTApi.loadShipSchematics.bind(STTApi),
            description: 'ship information'
        },
        {
            loader: STTApi.loadPlayerData.bind(STTApi),
            description: 'player data'
        }
    ];

    var fleetResources = [
        {
            loader: STTApi.loadFleetMemberInfo.bind(STTApi),
            description: 'fleet members'
        },
        {
            loader: STTApi.loadFleetData.bind(STTApi),
            description: 'fleet data'
        },
        {
            loader: STTApi.loadStarbaseData.bind(STTApi),
            description: 'starbase data'
        }
    ];

    let promise: Promise<any> = mainResources.reduce((prev, cur) => {
        return prev.then(() => {
            onProgress('Loading ' + cur.description + '...');
            return cur.loader();
        });
    }, Promise.resolve())
        .then(() => {
            if (STTApi.playerData.fleet && STTApi.playerData.fleet.id != 0) {
                return fleetResources.reduce((prev, cur) => {
                    return prev.then(() => {
                        onProgress('Loading ' + cur.description + '...');
                        return cur.loader(STTApi.playerData.fleet.id);
                    });
                }, Promise.resolve());
            }
            else {
                return Promise.resolve();
            }
        })
        .then(() => {
            onProgress('Analyzing crew...');

            return matchCrew(STTApi.playerData.character).then((roster: any) => {
                STTApi.roster = roster;
                roster.forEach((crew: any) => {
                    crew.iconUrl = '';
                    crew.iconBodyUrl = '';
                });

                let total = roster.length * 2 + STTApi.crewAvatars.length;
                let current = 0;
                onProgress('Caching crew images... (' + current + '/' + total + ')');
                let iconPromises: Array<Promise<void>> = [];
                roster.forEach((crew: any) => {
                    iconPromises.push(STTApi.imageProvider.getCrewImageUrl(crew, false, crew.id).then((found: IFoundResult) => {
                        onProgress('Caching crew images... (' + current++ + '/' + total + ')');
                        STTApi.roster.forEach((crew: any) => {
                            if (crew.id === found.id)
                                crew.iconUrl = found.url;
                        });

                        return Promise.resolve();
                    }).catch((error: any) => { /*console.warn(error);*/ }));
                    iconPromises.push(STTApi.imageProvider.getCrewImageUrl(crew, true, crew.id).then((found: IFoundResult) => {
                        onProgress('Caching crew images... (' + current++ + '/' + total + ')');
                        STTApi.roster.forEach((crew: any) => {
                            if (crew.id === found.id)
                                crew.iconBodyUrl = found.url;
                        });

                        return Promise.resolve();
                    }).catch((error: any) => { /*console.warn(error);*/ }));
                });

                // Also load the avatars for crew not in the roster
                STTApi.crewAvatars.forEach((crew: any) => {
                    iconPromises.push(STTApi.imageProvider.getCrewImageUrl(crew, false, crew.id).then((found: IFoundResult) => {
                        onProgress('Caching crew images... (' + current++ + '/' + total + ')');
                        STTApi.crewAvatars.forEach((crew: any) => {
                            if (crew.id === found.id)
                                crew.iconUrl = found.url;
                        });

                        return Promise.resolve();
                    }).catch((error: any) => { /*console.warn(error);*/ }));
                });

                return Promise.all(iconPromises);
            }).then(() => {
                onProgress('Loading ships...');

                return matchShips(STTApi.playerData.character.ships).then((ships: any) => {
                    STTApi.ships = ships;

                    let total = ships.length;
                    let current = 0;
                    onProgress('Caching ship images... (' + current + '/' + total + ')');
                    let iconPromises: Array<Promise<void>> = [];
                    ships.forEach((ship: any) => {
                        iconPromises.push(STTApi.imageProvider.getShipImageUrl(ship, ship.name).then((found: IFoundResult) => {
                            onProgress('Caching ship images... (' + current++ + '/' + total + ')');
                            STTApi.ships.forEach((ship: any) => {
                                if (ship.name === found.id)
                                    ship.iconUrl = found.url;
                            });

                            return Promise.resolve();
                        }).catch((error: any) => { /*console.warn(error);*/ }));
                    });
                    return Promise.all(iconPromises);
                });
            }).then(() => {
                let total = STTApi.playerData.character.items.length;
                let current = 0;
                onProgress('Caching item images... (' + current + '/' + total + ')');
                let iconPromises: Array<Promise<void>> = [];
                STTApi.playerData.character.items.forEach((item: any) => {
                    item.iconUrl = '';
                    item.typeName = item.icon.file.replace("/items", "").split("/")[1];
                    item.symbol = item.icon.file.replace("/items", "").split("/")[2];

                    iconPromises.push(STTApi.imageProvider.getItemImageUrl(item, item.id).then((found: IFoundResult) => {
                        onProgress('Caching item images... (' + current++ + '/' + total + ')');
                        STTApi.playerData.character.items.forEach((item: any) => {
                            if (item.id === found.id)
                                item.iconUrl = found.url;
                        });

                        return Promise.resolve();
                    }).catch((error: any) => { /*console.warn(error);*/ }));
                });
                return Promise.all(iconPromises);
            }).then(() => {
                let total = CONFIG.SPRITES.length;
                let current = 0;
                onProgress('Caching misc images... (' + current + '/' + total + ')');
                let iconPromises: Array<Promise<void>> = [];
                for (var sprite in CONFIG.SPRITES) {
                    iconPromises.push(STTApi.imageProvider.getSprite(CONFIG.SPRITES[sprite].asset, sprite, sprite).then((found: IFoundResult) => {
                        onProgress('Caching misc images... (' + current++ + '/' + total + ')');
                        for (var sprite in CONFIG.SPRITES) {
                            if (sprite === found.id)
                                CONFIG.SPRITES[sprite].url = found.url;
                        }

                        return Promise.resolve();
                    }).catch((error: any) => { /*console.warn(error);*/ }));
                }
                return Promise.all(iconPromises);
            });
        });

    if (loadMissions) {
        return promise.then(() => {
            onProgress('Loading missions and quests...');
            return loadMissionData(STTApi.playerData.character.cadet_schedule.missions.concat(STTApi.playerData.character.accepted_missions), STTApi.playerData.character.dispute_histories).then((missions) => {
                STTApi.missions = missions;

                onProgress('Calculating mission success stats for crew...');
                STTApi.missionSuccess = calculateMissionCrewSuccess();
                calculateMinimalComplementAsync();

                return Promise.resolve();
            });
        });
    }
    else {
        return promise;
    }
}
