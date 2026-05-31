export const PlayerValue = {
  petal: {
    damageMulti: 1,
    healthMulti: 1,
    armor: 0,
    armorMulti: 1,

    heal: 0,
    shield: 0,

    reloadFactor: 1,
    secondReloadFactor: 1,

    reloadSkipRate: 0,
    secondReloadSkipRate: 0,

    manaCostFactor: 1,

    luck: 0,

    damageReduction: {
      global: 0,
      slots: {} as Record<number, number>,
    },
  },

  player: {
    heal: 0,
    healMulti: 1,

    manaGeneration: 0,
    manaGenerationMulti: 1,
    manaDrain: 0,

    shield: 0,

    armor: 0,
    armorMulti: 1,

    bodyDamage: 0,
    bodyDamageMulti: 1,

    evasion: 0,
    damageReduction: 0,
    damageReflection: 0,
  },

  pet: {
    damageMulti: 1,

    heal: 0,
    shield: 0,
    armor: 0,

    mutation: 0,
    variantMutation: 0,
    paranormalRate: 0,

    fullRegenRate: 0,
    dupeRate: 0,
  },

  target: {
    damageMulti: 1,
    armor: 0,
    armorMulti: 1,
  },

  status: {
    fireDuration: 0,
    poisonDuration: 0,

    lightningBounce: 0,
    lightningMultiRate: 0,
  },

  mana: {
    generation: 0,
    drain: 0,
    capacityMulti: 1,
  },
};