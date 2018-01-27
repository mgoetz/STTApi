import STTApi from "./index";
import CONFIG from "./CONFIG";

export interface VoyageResult {
    bestShips: Array<any>;
    crewSelection: Array<any>;
    estimatedDuration: number;
}

export function bestVoyageSelection(depth: number, progressUpdate: (val: number, max: number, bestSoFar: VoyageResult) => void): Promise<VoyageResult> {
    let voyage = STTApi.playerData.character.voyage[0];
	/*if (!voyage || voyage.state == 'unstarted') {
        return Promise.reject('Voyage is already started!');
    }*/

    voyage = STTApi.playerData.character.voyage_descriptions[0];
    // Best ship
    let consideredShips: any[] = [];
    STTApi.ships.forEach((ship: any) => {
        if (ship.id > 0) {
            let entry = {
                ship: ship,
                score: ship.antimatter
            };

            if (ship.traits.find((trait: any) => trait == voyage.ship_trait)) {
                entry.score += 150; // TODO: where is this constant coming from (Config)?
            }

            consideredShips.push(entry);
        }
    });

    consideredShips = consideredShips.sort((a, b) => b.score - a.score);
    consideredShips = consideredShips.filter(entry => entry.score == consideredShips[0].score);

    let result: VoyageResult = {
        bestShips: consideredShips,
        crewSelection: [],
        estimatedDuration: 0
    };

    // Best crew
    // TODO: what would be the most efficient algorithm?
    // If we do a full combinatorial we'd use a lot of resources numcrew^12 (potentially 400^12 entries, way too much)
    // Lets randomly pick just the first X crew sorted by the given skill, should make it more manageable
    // On a 8700K with 4 crew it takes >10minutes to calculate, and the cost is exponential with number of crew selected
    let bestScore = 0;

    function crewScore(crew: any, primary_skill: string, secondary_skill: string, boost_skill: string | undefined) {
        let score = 0;
        Object.keys(CONFIG.SKILLS).forEach(skill => {
            let skillScore = crew[skill].core + (crew[skill].max - crew[skill].min) / 2;
            score += skillScore;
            if (skill == primary_skill) {
                score += skillScore * 2.5;
            }
            if (skill == secondary_skill) {
                score += skillScore * 1.5;
            }
            if (skill == boost_skill) {
                score += skillScore * 2;
            }
        });

        return score;
    }

    let presortedCrewSlices: any = {};
    Object.keys(CONFIG.SKILLS).forEach(skill => {
        presortedCrewSlices[skill] = STTApi.roster.sort((a: any, b: any) => crewScore(b, voyage.skills.primary_skill, voyage.skills.secondary_skill, skill) - crewScore(a, voyage.skills.primary_skill, voyage.skills.secondary_skill, skill))
            .filter((crew: any) => ((crew[skill].core > 0) && (crew.frozen == 0)))
            .slice(0, depth);
    });

    let max = Math.pow(depth, voyage.crew_slots.length);
    let counter = 0;

    function calculateDuration(choices: Array<any>): number {
        let shipAM = consideredShips[0].score;

        let skillTotals: any = {};
        Object.keys(CONFIG.SKILLS).forEach(skill => {
            skillTotals[skill] = 0;
        });

        choices.forEach((choice: any) => {
            if (choice.hasTrait) {
                shipAM += 25;
            }

            Object.keys(CONFIG.SKILLS).forEach(skill => {
                skillTotals[skill] += choice.choice[skill].core + (choice.choice[skill].max - choice.choice[skill].min) / 2;
            });
        });

        // This is using Chewable C++'s values from here https://docs.google.com/spreadsheets/d/1IS2qEggZKo1P1kBJq-qoDxJvxtKfQXpfVna9z4E_dNo/edit#gid=0
        let H3 = 560; // Cycle Length (s)
        let H4 = 6.4286; // Cycles Per Hour
        let H5 = 6; // Hazards/cycle
        let H6 = 18; // Activity/cycle
        let H7 = 0.5; // Dilemmas/hr
        let H8 = 38.0714; // Hazards/hr
        let H9 = 1246; // Hazard Diff/hr
        let H10 = 5; // Hazard AM Pass
        let H11 = 30; // Hazard AM Fail
        let H12 = 115.7142857; // AM/hour cost
        let H13 = 0.35; // Pri. Skill Chance
        let H14 = 0.25; // Sec. Skill Chance
        let H15 = 0.1; // Other Skill Chance

        let PrimarySkill = skillTotals[voyage.skills.primary_skill];
        let SecondarySkill = skillTotals[voyage.skills.secondary_skill];
        let OtherSkills = 0;
        let MaxSkill = 0;
        Object.keys(CONFIG.SKILLS).forEach(skill => {
            if ((skill != voyage.skills.primary_skill) && (skill != voyage.skills.secondary_skill)) {
                OtherSkills += skillTotals[skill];
            }

            if (skillTotals[skill] > MaxSkill) {
                MaxSkill = skillTotals[skill];
            }
        });

        let AMGained = shipAM + (PrimarySkill * H13 + SecondarySkill * H14 + OtherSkills * H15) / H9 * H8 * H10;
        let AMVariableHaz = ((MaxSkill - PrimarySkill) * H13 + (MaxSkill - SecondarySkill) * H14 + (MaxSkill * 4 - OtherSkills) * H15) / H9 * H8 * H11;
        let AMLeft = AMGained - AMVariableHaz - MaxSkill / H9 * H12;
        let TimeLeft = AMLeft / (H8 * H11 + H12);

        return MaxSkill / H9 + TimeLeft;
    }

    let currentChoices: Array<any> = [];
    function fillSlot(slotIndex: number) {
        presortedCrewSlices[voyage.crew_slots[slotIndex].skill].forEach((choice: any) => {
            if (currentChoices.find(v => v.choice.id == choice.id)) {
                // If already in the list of choices, skip
                return;
            }

            let currentChoice = {
                choice,
                score: crewScore(choice, voyage.skills.primary_skill, voyage.skills.secondary_skill, undefined),
                slotName: voyage.crew_slots[slotIndex].name,
                hasTrait: false
            };

            if (choice.rawTraits.find((trait: string) => trait == voyage.crew_slots[slotIndex].trait)) {
                currentChoice.score *= 1.15; //TODO: Fine-tune this value
                currentChoice.hasTrait = true;
            }

            currentChoices.push(currentChoice);
            if (slotIndex < voyage.crew_slots.length - 1) {
                fillSlot(slotIndex + 1);
            }
            else {
                // we have a complete crew complement, compute score
                let currentScore = currentChoices.reduce((sum, choice) => sum + choice.score, 0);
                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    result.crewSelection = currentChoices.slice();
                    result.estimatedDuration = calculateDuration(currentChoices);
                }

                progressUpdate(counter++, max, result);
            }
            currentChoices.pop();
        });
    }

    fillSlot(0);

    return Promise.resolve(result);
}