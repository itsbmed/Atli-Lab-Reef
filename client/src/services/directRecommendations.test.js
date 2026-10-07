import test from 'node:test'
import assert from 'node:assert/strict'
import { BUILT_IN_SCALE_MAP } from './evaluationScales.js'
import { buildDirectRecommendations, evaluateAnalysis } from './directRecommendations.js'

const scale = BUILT_IN_SCALE_MAP['ati-standard']
const parameter = (key, label, groupKey, value, extra = {}) => ({ key, label, symbol: label.slice(0, 2), groupKey, unit: 'mg/l', value, ...extra })

test('the scale classifies unlabelled values and the source verdict wins when present', () => {
  const evaluated = evaluateAnalysis([
    parameter('calcium', 'Calcium', 'quantity', 300),
    parameter('magnesium', 'Magnesium', 'quantity', 1310),
    parameter('copper', 'Kupfer', 'trace', 0, { tone: 'good', sourceDirection: 'in_range' }),
  ], scale)
  assert.deepEqual(evaluated.map((item) => item.score), [2, 5, 5])
  assert.equal(evaluated[0].evaluation.label, 'Zu niedrig')
  assert.equal(evaluated[2].evaluation.label, 'Optimal')
})

test('a stable report produces no recommendation at all', () => {
  const evaluated = evaluateAnalysis([parameter('calcium', 'Calcium', 'quantity', 425)], scale)
  assert.deepEqual(buildDirectRecommendations(evaluated), [])
})

test('one card per advisory type at most, most severe first, dosing pinned below', () => {
  const evaluated = evaluateAnalysis([
    parameter('calcium', 'Calcium', 'quantity', 700),
    parameter('magnesium', 'Magnesium', 'quantity', 1400),
    parameter('nitrate', 'Nitrat', 'nutrients', 0.2),
    parameter('lead', 'Blei', 'pollutants', 3),
    parameter('iron', 'Eisen', 'trace', 0.1),
  ], scale)
  const recommendations = buildDirectRecommendations(evaluated, { dosingKeys: ['iron'] })
  const advisory = recommendations.filter((item) => item.key !== 'dosing')
  assert.ok(advisory.length <= 4, 'never more than one card per advisory type')
  assert.equal(recommendations[0].key, 'water-change')
  assert.equal(recommendations.at(-1).key, 'dosing', 'the dosing card stays pinned to the bottom')
  for (let index = 1; index < advisory.length; index += 1) {
    assert.ok(advisory[index - 1].rank >= advisory[index].rank)
  }
})

test('element supply adjusts in both directions with the client percentage curve', () => {
  const elevated = buildDirectRecommendations(evaluateAnalysis([parameter('calcium', 'Calcium', 'quantity', 500)], scale))
  const reduced = buildDirectRecommendations(evaluateAnalysis([parameter('calcium', 'Calcium', 'quantity', 300)], scale))
  assert.equal(elevated[0].key, 'reduce-supply')
  assert.equal(elevated[0].detailLabel, 'Tägliche Elementversorgung anpassen')
  assert.deepEqual(elevated[0].detailItems, [{ label: 'Calcium', value: '−20 %' }])
  assert.deepEqual(reduced[0].detailItems, [{ label: 'Calcium', value: '+30 %' }])
})

test('element names are bold inside the sentence instead of a separate chip row', () => {
  const evaluated = evaluateAnalysis([
    parameter('calcium', 'Calcium', 'quantity', 700),
    parameter('magnesium', 'Magnesium', 'quantity', 2200),
  ], scale)
  const [recommendation] = buildDirectRecommendations(evaluated)
  assert.deepEqual(recommendation.summaryParts.filter((part) => part.bold).map((part) => part.text), ['Calcium', 'Magnesium'])
  assert.ok(recommendation.summary.startsWith('Durch die Wasseranalyse wurden stark erhöhte Werte bei Calcium und Magnesium festgestellt.'))
  assert.ok(recommendation.summary.endsWith('empfehlen wir die Durchführung von Wasserwechseln.'))
})

test('static detail blocks come from the editable templates', () => {
  const evaluated = evaluateAnalysis([parameter('lead', 'Blei', 'pollutants', 3)], scale)
  const [recommendation] = buildDirectRecommendations(evaluated)
  assert.equal(recommendation.detailLabel, 'Mögliche Quellen')
  assert.ok(recommendation.detailItems.some((item) => item.label === 'Aktivkohle'))
  assert.equal(recommendation.detailAction.tool, 'sources', 'the source hunt links into the tools screen')
})

test('the water change blue box offers both correction routes, one carrying the action', () => {
  const [recommendation] = buildDirectRecommendations(evaluateAnalysis([parameter('calcium', 'Calcium', 'quantity', 700)], scale))
  assert.equal(recommendation.options.length, 2)
  assert.ok(recommendation.options[0].text.includes('drei Wasserwechsel von jeweils 20 %'))
  assert.equal(recommendation.options[0].actionLabel, '', 'the standard route needs no button')
  assert.equal(recommendation.options[1].actionLabel, 'Hier geht es zum Wasserwechsel-Simulator')
  assert.equal(recommendation.action.tool, 'waterchange')
})

test('cards without a blue box simply carry no options', () => {
  const [recommendation] = buildDirectRecommendations(evaluateAnalysis([parameter('lead', 'Blei', 'pollutants', 3)], scale))
  assert.deepEqual(recommendation.options, [])
})

test('only the water change card carries tips for now', () => {
  const withTips = buildDirectRecommendations(evaluateAnalysis([parameter('calcium', 'Calcium', 'quantity', 700)], scale))
  assert.ok(withTips[0].tips.length, 'the water change keeps its tips')
  for (const value of [[parameter('lead', 'Blei', 'pollutants', 3)], [parameter('calcium', 'Calcium', 'quantity', 500)], [parameter('nitrate', 'Nitrat', 'nutrients', 15)]]) {
    for (const card of buildDirectRecommendations(evaluateAnalysis(value, scale))) {
      if (card.key !== 'water-change') assert.deepEqual(card.tips, [], `${card.key} should not show tips yet`)
    }
  }
})

test('nutrient management covers all four NO₃/P combinations with volume-based doses', () => {
  const card = (nitrateScore, phosphorusScore) => buildDirectRecommendations(evaluateAnalysis([
    parameter('nitrate', 'Nitrat', 'nutrients', nitrateScore < 5 ? 0.2 : 30, { sourceScore: nitrateScore }),
    parameter('phosphorus', 'Phosphor', 'nutrients', phosphorusScore < 5 ? 5 : 50, { sourceScore: phosphorusScore, unit: 'µg/l' }),
  ], scale), { volumeLiters: 500 }).find((item) => item.key === 'nutrients')

  const lowLow = card(3, 3)
  const highLow = card(7, 3)
  const lowHigh = card(3, 7)
  const highHigh = card(7, 7)
  assert.deepEqual(lowLow.detailItems, [{ label: 'Essential Nitro', value: '2,5 ml täglich' }, { label: 'Essential Phospho', value: '2,5 ml täglich' }])
  assert.deepEqual(highLow.detailItems, [{ label: 'Essential Phospho', value: '2,5 ml täglich' }, { label: 'Eiweißabschäumer', value: 'reinigen' }])
  assert.deepEqual(lowHigh.detailItems, [{ label: 'PO₄-Adsorber', value: 'nutzen' }, { label: 'Essential Nitro', value: '2,5 ml täglich' }])
  assert.deepEqual(highHigh.detailItems, [{ label: 'Futtereintrag', value: 'reduzieren' }, { label: 'Eiweißabschäumer', value: 'reinigen' }, { label: 'PO₄-Adsorber', value: 'nutzen' }])
  for (const recommendation of [lowLow, highLow, lowHigh, highHigh]) assert.equal(recommendation.action.label, '')
})

test('salinity gets a separate low/high correction based on volume and target PSU', () => {
  const salinity = (value, sourceScore) => buildDirectRecommendations(evaluateAnalysis([
    parameter('salinity', 'Salinität', 'basis', value, { sourceScore, correctionTarget: 35, unit: 'PSU' }),
  ], scale), { volumeLiters: 500 })[0]
  const low = salinity(30, 3)
  const high = salinity(40, 7)
  assert.equal(low.key, 'salinity')
  assert.equal(low.title, 'Salinität kontrolliert anheben')
  // 4.275 ml je Flasche ist der Wert aus der Arbeitsmappe: (35 - 30) x 1,71 x 500.
  // Je Flasche ein Eintrag; angezeigt werden sie als Produktkarten, nicht als Kasten.
  const shop = {
    url: 'https://shop.atiaquaristik.com/en/absolute-ocean-2-x-10-2-liter/4600001/',
    product: 'Absolute Ocean 2 x 10,2 Liter',
    image: 'https://shop.atiaquaristik.com/media/11/57/16/1760549068/ATI_Absolute_Ocean_20L_3000x2000px_1262.jpg',
  }
  assert.deepEqual(low.detailItems, [
    { label: 'Absolute Ocean 1', value: '4.275 ml', ...shop },
    { label: 'Absolute Ocean 2', value: '4.275 ml', ...shop },
  ])
  assert.equal(high.title, 'Salinität kontrolliert senken')
  // Zu viel Salz kauft man nicht nach, also trägt diese Maßnahme keinen Shop-Link.
  assert.deepEqual(high.detailItems, [{ label: 'Meerwasser entnehmen und durch Osmosewasser ersetzen', value: '62,5 l' }])
})

test('the linked Absolute Ocean pack covers the calculated amount per bottle', () => {
  const correction = (volumeLiters) => buildDirectRecommendations(evaluateAnalysis([
    parameter('salinity', 'Salinität', 'basis', 34, { sourceScore: 3, correctionTarget: 35, unit: 'PSU' }),
  ], scale), { volumeLiters })[0].detailItems[0]

  const small = correction(200)
  assert.equal(small.value, '342 ml')
  assert.equal(small.product, 'Absolute Ocean 2 x 2.700ml', 'the 2,7 l set is enough here')

  const large = correction(3000)
  assert.equal(large.value, '5.130 ml')
  assert.equal(large.product, 'Absolute Ocean 2 x 10,2 Liter', 'beyond 2,7 l the larger set is linked')
  assert.ok(large.url.startsWith('https://shop.atiaquaristik.com/'), 'the link points at the ATI shop')
})

test('a dosing recommendation only appears when a released product dose exists', () => {
  const evaluated = evaluateAnalysis([parameter('iron', 'Eisen', 'trace', 0.1)], scale)
  assert.deepEqual(buildDirectRecommendations(evaluated).map((item) => item.key), [])
  assert.deepEqual(buildDirectRecommendations(evaluated, { dosingKeys: ['iron'] }).map((item) => item.key), ['dosing'])
})

test('the daily supply card covers only what is dosed daily', () => {
  // Eisen lässt sich nicht über die tägliche Grundversorgung regeln.
  const trace = evaluateAnalysis([parameter('iron', 'Eisen', 'trace', 0.1)], scale)
  assert.equal(buildDirectRecommendations(trace).find((item) => item.key === 'reduce-supply'), undefined)

  const daily = evaluateAnalysis([
    parameter('kh', 'Karbonathärte', 'basis', 9.5, { unit: 'dKH' }),
    parameter('calcium', 'Calcium', 'quantity', 300),
    parameter('iron', 'Eisen', 'trace', 0.1),
  ], scale)
  const card = buildDirectRecommendations(daily).find((item) => item.key === 'reduce-supply')
  assert.deepEqual(card.detailItems.map((entry) => entry.label), ['Karbonathärte', 'Calcium'],
    'iron is left out even though it deviates, magnesium was not measured')
  assert.ok(card.detailItems.every((entry) => /^[+−]\d+ %$/.test(entry.value)))
})

test('the daily supply card lists all three elements, including the settled ones', () => {
  const evaluated = evaluateAnalysis([
    parameter('kh', 'Karbonathärte', 'basis', 9.5, { unit: 'dKH' }),
    parameter('calcium', 'Calcium', 'quantity', 420),
    parameter('magnesium', 'Magnesium', 'quantity', 1350),
  ], scale)
  const card = buildDirectRecommendations(evaluated).find((item) => item.key === 'reduce-supply')
  assert.deepEqual(card.detailItems.map((entry) => entry.label), ['Karbonathärte', 'Calcium', 'Magnesium'])
  // Was im Optimum liegt, bleibt sichtbar – als „unverändert", nicht als Lücke.
  assert.equal(card.detailItems.filter((entry) => entry.value === 'unverändert').length, 2)
})
