import type { Achievement, AchievementOpportunity } from '@remake/data'
import { achievements } from '@remake/data'
import type { GameState, ProfileState } from './state'
import { createFlatState } from './state'
import { check } from '@remake/condition'
import { produce } from './immutable'
import type { TriggerResult } from './game'

const OpportunityMap = Map.groupBy(
    achievements.keys(),
    a => achievements.get(a)!.opportunity,
)

export function trigger(
    opportunity: AchievementOpportunity,
    state: GameState,
    profile: ProfileState,
): TriggerResult<Achievement['id']> {
    const flatState = createFlatState(state, profile)
    const triggers = (OpportunityMap.get(opportunity) ?? []).filter(a => {
        if (state.achievements.has(a)) return false
        if (profile.achievements.has(a)) return false
        const { condition } = achievements.get(a)!
        return check(flatState, condition)
    })
    if (triggers.length === 0) return { state, triggers }
    const newState = produce(state, draft => {
        draft.achievements = new Set([...draft.achievements, ...triggers])
    })
    return { state: newState, triggers }
}

