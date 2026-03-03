/**
 * Word Frequency Data
 *
 * Maps common English words to difficulty levels 0-5:
 *   0 = very common (top ~3000 words) — never annotate
 *   1 = common
 *   2 = moderately common
 *   3 = intermediate
 *   4 = uncommon
 *   5 = rare (default for unknown words)
 *
 * Words not in the map default to level 5 (rare).
 * The user's "Word Wise level" setting (1-5) controls which difficulty
 * threshold triggers annotations: level N shows words with difficulty >= (6-N).
 */

// Level 0: Top ~3000 most common English words (never annotated)
// Level 1-2: Common words most adults know
// Level 3-4: Words many readers may not know
// We only store levels 0-4 explicitly; anything absent defaults to 5.

const WORD_FREQ: Record<string, number> = {
  // ── Level 0: Ultra-common function words & basics ──────────────
  the: 0, be: 0, to: 0, of: 0, and: 0, a: 0, in: 0, that: 0, have: 0, i: 0,
  it: 0, for: 0, not: 0, on: 0, with: 0, he: 0, as: 0, you: 0, do: 0, at: 0,
  this: 0, but: 0, his: 0, by: 0, from: 0, they: 0, we: 0, say: 0, her: 0, she: 0,
  or: 0, an: 0, will: 0, my: 0, one: 0, all: 0, would: 0, there: 0, their: 0, what: 0,
  so: 0, up: 0, out: 0, if: 0, about: 0, who: 0, get: 0, which: 0, go: 0, me: 0,
  when: 0, make: 0, can: 0, like: 0, time: 0, no: 0, just: 0, him: 0, know: 0, take: 0,
  people: 0, into: 0, year: 0, your: 0, good: 0, some: 0, could: 0, them: 0, see: 0, other: 0,
  than: 0, then: 0, now: 0, look: 0, only: 0, come: 0, its: 0, over: 0, think: 0, also: 0,
  back: 0, after: 0, use: 0, two: 0, how: 0, our: 0, work: 0, first: 0, well: 0, way: 0,
  even: 0, new: 0, want: 0, because: 0, any: 0, these: 0, give: 0, day: 0, most: 0, us: 0,
  is: 0, are: 0, was: 0, were: 0, been: 0, has: 0, had: 0, did: 0, does: 0, being: 0,
  having: 0, am: 0, own: 0, same: 0, right: 0, still: 0, big: 0, going: 0, where: 0,
  should: 0, old: 0, before: 0, never: 0, here: 0, might: 0, very: 0, down: 0, too: 0,
  life: 0, long: 0, world: 0, thing: 0, much: 0, those: 0, between: 0, since: 0, great: 0,
  hand: 0, high: 0, last: 0, tell: 0, place: 0, keep: 0, call: 0, while: 0, part: 0,
  turn: 0, every: 0, point: 0, home: 0, end: 0, through: 0, small: 0, country: 0,
  need: 0, few: 0, school: 0, must: 0, start: 0, little: 0, may: 0, again: 0, each: 0,
  man: 0, woman: 0, child: 0, children: 0, many: 0, number: 0, already: 0, something: 0,
  house: 0, head: 0, state: 0, find: 0, both: 0, more: 0, made: 0, run: 0, off: 0, always: 0,
  set: 0, put: 0, found: 0, help: 0, got: 0, left: 0, came: 0, next: 0, name: 0, side: 0,
  group: 0, eye: 0, face: 0, water: 0, move: 0, city: 0, night: 0, room: 0, story: 0,
  young: 0, line: 0, body: 0, family: 0, three: 0, four: 0, five: 0, ten: 0, hundred: 0,
  word: 0, read: 0, book: 0, open: 0, door: 0, money: 0, ask: 0, feel: 0, away: 0,
  land: 0, far: 0, love: 0, kind: 0, change: 0, air: 0, heart: 0, hard: 0, real: 0,
  light: 0, close: 0, walk: 0, play: 0, hold: 0, bring: 0, sit: 0, stand: 0, eat: 0,
  sleep: 0, stop: 0, power: 0, war: 0, car: 0, food: 0, friend: 0, mother: 0, father: 0,
  girl: 0, boy: 0, game: 0, morning: 0, talk: 0, under: 0, write: 0, until: 0,
  remember: 0, follow: 0, learn: 0, begin: 0, mean: 0, show: 0, live: 0, die: 0, kill: 0,
  listen: 0, wait: 0, become: 0, leave: 0, idea: 0, pay: 0, meet: 0, fact: 0, sure: 0,
  try: 0, fall: 0, hear: 0, happen: 0, watch: 0, seem: 0, answer: 0, able: 0, quite: 0,
  really: 0, enough: 0, against: 0, without: 0, during: 0, half: 0, white: 0, black: 0,
  red: 0, blue: 0, green: 0, wrong: 0, different: 0, true: 0, bad: 0, better: 0,
  best: 0, less: 0, least: 0, yet: 0, though: 0, nothing: 0, everything: 0, along: 0,
  possible: 0, reason: 0, several: 0, however: 0, perhaps: 0, together: 0, important: 0,
  actually: 0, ago: 0, almost: 0, often: 0, second: 0, early: 0, human: 0, death: 0,
  town: 0, dark: 0, voice: 0, son: 0, daughter: 0, brother: 0, sister: 0, wife: 0,
  husband: 0, king: 0, god: 0, earth: 0, fire: 0, horse: 0, street: 0, table: 0,
  window: 0, inside: 0, road: 0, ground: 0, south: 0, north: 0, west: 0, east: 0,
  sea: 0, river: 0, tree: 0, rock: 0, field: 0, blood: 0, cut: 0, fight: 0, bed: 0,
  cold: 0, hot: 0, draw: 0, hour: 0, minute: 0, gone: 0, done: 0,
  church: 0, letter: 0, music: 0, dog: 0, cat: 0, sun: 0, wind: 0, rain: 0,
  snow: 0, among: 0, today: 0, clear: 0, arm: 0, foot: 0, leg: 0, above: 0,
  below: 0, behind: 0, across: 0, themselves: 0, himself: 0, herself: 0, itself: 0,
  myself: 0, yourself: 0, anybody: 0, anything: 0, someone: 0, nobody: 0,
  whether: 0, although: 0, either: 0, neither: 0, whose: 0,
  six: 0, seven: 0, eight: 0, nine: 0, twenty: 0, thousand: 0, million: 0,
  building: 0, company: 0, business: 0, program: 0, problem: 0, question: 0,
  system: 0, government: 0, order: 0, case: 0, form: 0, study: 0, service: 0,
  else: 0, once: 0, sort: 0, level: 0, plan: 0, area: 0, large: 0, certain: 0,
  general: 0, common: 0, public: 0, free: 0, whole: 0, course: 0, strong: 0,
  class: 0, rather: 0, likely: 0, indeed: 0, usually: 0, sometimes: 0,
  especially: 0, sense: 0, finally: 0, age: 0, period: 0, later: 0, toward: 0,
  job: 0, poor: 0, bit: 0, pass: 0, carry: 0, drive: 0, break: 0, pick: 0,
  reach: 0, lead: 0, grow: 0, suppose: 0, accept: 0, produce: 0, teach: 0,
  build: 0, speak: 0, wish: 0, happy: 0, spend: 0, wear: 0, send: 0, win: 0,
  sell: 0, choose: 0, lose: 0, catch: 0, pull: 0, push: 0, throw: 0, fill: 0,
  save: 0, lay: 0, miss: 0, prove: 0, hit: 0, deal: 0, add: 0, drop: 0,
  serve: 0, raise: 0, appear: 0, cover: 0, report: 0, allow: 0, matter: 0,
  care: 0, low: 0, mark: 0, shall: 0, near: 0,
  towards: 0, upon: 0, within: 0, past: 0,
  per: 0, plus: 0, round: 0, unto: 0, act: 0,

  // ── Level 1: Common words most literate adults know ────────────
  effort: 1, approach: 1, recent: 1, available: 1, political: 1, suggest: 1,
  determine: 1, involve: 1, describe: 1, respond: 1, direction: 1, individual: 1,
  process: 1, account: 1, similar: 1, argue: 1, environment: 1, article: 1,
  patient: 1, theory: 1, behavior: 1, purpose: 1, audience: 1, attempt: 1,
  reality: 1, require: 1, obtain: 1, exist: 1, concern: 1, position: 1,
  contain: 1, therefore: 1, ability: 1, despite: 1, develop: 1, create: 1,
  consider: 1, community: 1, opportunity: 1, provide: 1, evidence: 1, occur: 1,
  significant: 1, experience: 1, include: 1, result: 1, support: 1, remain: 1,
  continue: 1, section: 1, establish: 1, receive: 1, national: 1, benefit: 1,
  natural: 1, disease: 1, measure: 1, success: 1, various: 1, explain: 1,
  modern: 1, condition: 1, improve: 1, specific: 1, particular: 1, normal: 1,
  average: 1, perform: 1, maintain: 1, prepare: 1, represent: 1, operate: 1,
  express: 1, prevent: 1, material: 1, separate: 1, complete: 1, demand: 1,
  expect: 1, prefer: 1, effect: 1, affect: 1, increase: 1, reduce: 1,
  pressure: 1, context: 1, identify: 1, assume: 1, define: 1, feature: 1,
  character: 1, attention: 1, century: 1, economy: 1, ancient: 1, popular: 1,
  quality: 1, society: 1, activity: 1, according: 1, opinion: 1,
  variety: 1, legal: 1, authority: 1, technique: 1, regular: 1, movement: 1,
  weapon: 1, property: 1, typical: 1, military: 1, responsible: 1, method: 1,
  analysis: 1, progress: 1, degree: 1, simply: 1, obviously: 1, generally: 1,
  merely: 1, frequently: 1, primarily: 1, eventually: 1, necessarily: 1,
  extremely: 1, slightly: 1, increasingly: 1, apparently: 1, currently: 1,
  previously: 1, immediately: 1, entirely: 1, relatively: 1, potentially: 1,
  strongly: 1, widely: 1, effectively: 1, largely: 1, directly: 1, partly: 1,
  fairly: 1, roughly: 1, closely: 1, gradually: 1, recently: 1, rapidly: 1,
  mostly: 1, constantly: 1,

  // ── Level 2: Moderately common — educated readers ──────────────
  accumulate: 2, acknowledge: 2, acquire: 2, adequate: 2, aesthetic: 2,
  aggregate: 2, allocate: 2, ambiguous: 2, analogy: 2, anticipate: 2,
  apparatus: 2, articulate: 2, aspiration: 2, autonomous: 2, beneficial: 2,
  bureaucracy: 2, catalyst: 2, chronic: 2, coherent: 2, commodity: 2,
  compatible: 2, complement: 2, comprehensive: 2, compromise: 2, conceive: 2,
  configuration: 2, consecutive: 2, consolidate: 2, constitute: 2, contemplate: 2,
  contemporary: 2, contradict: 2, controversy: 2, conventional: 2, correspond: 2,
  credible: 2, criterion: 2, crucial: 2, currency: 2, curriculum: 2,
  deliberately: 2, demographic: 2, denounce: 2, derive: 2, dimension: 2,
  discourse: 2, discrimination: 2, displace: 2, distinctive: 2, distort: 2,
  doctrine: 2, dominant: 2, dynamic: 2, elaborate: 2, eliminate: 2,
  empirical: 2, endeavor: 2, enforce: 2, enhance: 2, enormous: 2,
  enterprise: 2, equivalent: 2, erode: 2, evaluate: 2, evolve: 2,
  exaggerate: 2, exclusive: 2, exploit: 2, extract: 2, facilitate: 2,
  fluctuate: 2, formulate: 2, forthcoming: 2, fraction: 2, fragment: 2,
  framework: 2, fundamental: 2, generate: 2, generic: 2, gesture: 2,
  globalization: 2, hierarchy: 2, hypothesis: 2, ideology: 2, illustrate: 2,
  implement: 2, implicit: 2, impose: 2, incentive: 2, incidence: 2,
  incorporate: 2, index: 2, indicate: 2, infrastructure: 2, inherent: 2,
  inhibit: 2, initiate: 2, innovation: 2, instance: 2, integrate: 2,
  intense: 2, intermediate: 2, interpret: 2, intervene: 2, invoke: 2,
  isolate: 2, justify: 2, label: 2, legitimate: 2, liberal: 2,
  likewise: 2, logical: 2, manipulate: 2, marginal: 2, mechanism: 2,
  mediate: 2, migrate: 2, minimize: 2, modify: 2, monitor: 2,
  mutual: 2, negotiate: 2, nevertheless: 2, nonetheless: 2, notion: 2,
  numerous: 2, objective: 2, orient: 2, overlap: 2, paradigm: 2,
  parallel: 2, parameter: 2, perceive: 2, phenomenon: 2, philosophy: 2,
  preliminary: 2, presume: 2, prevalent: 2, principal: 2, principle: 2,
  prior: 2, promote: 2, proportion: 2, prospect: 2, protocol: 2,
  pursue: 2, radical: 2, random: 2, ratio: 2, regime: 2,
  reinforce: 2, reluctant: 2, restrain: 2, restrict: 2, retain: 2,
  revenue: 2, reverse: 2, rigid: 2, scenario: 2, scope: 2,
  simulate: 2, sole: 2, sophisticated: 2, speculate: 2, sphere: 2,
  statistic: 2, strategic: 2, subsequent: 2, subsidy: 2, substitute: 2,
  successor: 2, sufficient: 2, supplement: 2, suspend: 2, sustain: 2,
  terminal: 2, thereby: 2, thesis: 2, transform: 2, transmit: 2,
  trigger: 2, undergo: 2, undertake: 2, utilize: 2, valid: 2,
  violate: 2, virtual: 2, visible: 2, volatile: 2, volume: 2,
  widespread: 2,

  // ── Level 3: Intermediate — well-read adults ───────────────────
  aberration: 3, abhor: 3, abstain: 3, accolade: 3, acrimony: 3,
  admonish: 3, adversary: 3, affable: 3, allegory: 3, alleviate: 3,
  amalgamate: 3, ameliorate: 3, amicable: 3, anachronism: 3, anomaly: 3,
  antithesis: 3, apathy: 3, appease: 3, arbitrary: 3, arduous: 3,
  ascertain: 3, assiduous: 3, attenuate: 3, audacious: 3, augment: 3,
  auspicious: 3, austere: 3, avarice: 3, belligerent: 3, benevolent: 3,
  bequeath: 3, blatant: 3, brevity: 3, cajole: 3, candid: 3,
  capitulate: 3, capricious: 3, caustic: 3, clandestine: 3, clemency: 3,
  coalesce: 3, coerce: 3, cognizant: 3, colloquial: 3, commensurate: 3,
  compendium: 3, complacent: 3, conciliatory: 3, concomitant: 3, condone: 3,
  confiscate: 3, congenial: 3, conjecture: 3, connotation: 3, consensus: 3,
  conspicuous: 3, construe: 3, contentious: 3, contingent: 3, conundrum: 3,
  corroborate: 3, culminate: 3, cursory: 3, dearth: 3, debilitate: 3,
  decorum: 3, deference: 3, deleterious: 3, delineate: 3, demeanor: 3,
  deprecate: 3, deride: 3, desiccate: 3, desolate: 3, despot: 3,
  deter: 3, diatribe: 3, dichotomy: 3, didactic: 3, diffident: 3,
  dilapidated: 3, diligent: 3, diminish: 3, dirge: 3, discern: 3,
  disparage: 3, disparity: 3, disseminate: 3, dissonance: 3, diverge: 3,
  docile: 3, duplicity: 3, ebullient: 3, edify: 3, effervescent: 3,
  efficacy: 3, egregious: 3, elucidate: 3, emancipate: 3, embellish: 3,
  empathy: 3, encumber: 3, enigma: 3, enmity: 3, enumerate: 3,
  ephemeral: 3, equanimity: 3, equivocal: 3, erratic: 3, esoteric: 3,
  euphemism: 3, exacerbate: 3, exonerate: 3, expedient: 3, expunge: 3,
  extenuate: 3, facetious: 3, fastidious: 3, feasible: 3, fervent: 3,
  flagrant: 3, florid: 3, formidable: 3, fortuitous: 3, frivolous: 3,
  frugal: 3, furtive: 3, futile: 3, garrulous: 3, gratuitous: 3,
  gregarious: 3, guile: 3, hackneyed: 3, haughty: 3, hegemony: 3,
  heresy: 3, homogeneous: 3, hubris: 3, iconoclast: 3, idiosyncrasy: 3,
  imminent: 3, impasse: 3, impeccable: 3, impede: 3, imperious: 3,
  impervious: 3, implacable: 3, impudent: 3, inadvertent: 3, incisive: 3,
  incongruous: 3, indignant: 3, indolent: 3, ineffable: 3, inept: 3,
  inexorable: 3, ingenious: 3, innate: 3, innocuous: 3, insidious: 3,
  insolent: 3, intransigent: 3, intrepid: 3, inundate: 3, invective: 3,
  irascible: 3, itinerant: 3, judicious: 3, juxtapose: 3, laconic: 3,
  languid: 3, laud: 3, laudable: 3, lethargic: 3, levity: 3,
  magnanimous: 3, malevolent: 3, malleable: 3, meander: 3, mendacious: 3,
  meticulous: 3, milieu: 3, mitigate: 3, mollify: 3, morose: 3,
  mundane: 3, nefarious: 3, nonchalant: 3, nostalgia: 3, nuance: 3,
  obdurate: 3, obfuscate: 3, oblique: 3, oblivious: 3, obstinate: 3,
  opaque: 3, opulent: 3, ostensible: 3, ostentatious: 3, palliate: 3,
  panacea: 3, paragon: 3, paradox: 3, pariah: 3, parsimonious: 3,
  pedantic: 3, penchant: 3, perfunctory: 3, pernicious: 3, perpetuate: 3,
  pervasive: 3, placate: 3, platitude: 3, plausible: 3, poignant: 3,
  pragmatic: 3, precarious: 3, precedent: 3, precipitate: 3, precocious: 3,
  predilection: 3, preeminent: 3, pristine: 3, prodigious: 3, profane: 3,
  proficient: 3, profound: 3, proletariat: 3, prolific: 3, propensity: 3,
  proponent: 3, prosaic: 3, prudent: 3, pugnacious: 3, quandary: 3,
  querulous: 3, rancor: 3, raucous: 3, rebuke: 3, recalcitrant: 3,
  recant: 3, recompense: 3, rectify: 3, redolent: 3, refute: 3,
  relegate: 3, remorse: 3, renounce: 3, replete: 3, reprehensible: 3,
  repudiate: 3, requisite: 3, rescind: 3, resilient: 3, reticent: 3,
  reverence: 3, rhetoric: 3, sagacious: 3, salient: 3, sanguine: 3,
  sardonic: 3, scrupulous: 3, scrutinize: 3, sordid: 3, sporadic: 3,
  spurious: 3, stagnate: 3, steadfast: 3, stigma: 3, stipulate: 3,
  stoic: 3, strident: 3, stringent: 3, subjugate: 3, sublime: 3,
  substantiate: 3, succinct: 3, superfluous: 3, supplant: 3, surreptitious: 3,
  sycophant: 3, taciturn: 3, tangible: 3, tenacious: 3, terse: 3,
  torpid: 3, transient: 3, trepidation: 3, truculent: 3, ubiquitous: 3,
  unassailable: 3, undermine: 3, unequivocal: 3, unprecedented: 3, urbane: 3,
  usurp: 3, vacillate: 3, vehement: 3, venerable: 3, verbose: 3,
  vicarious: 3, vindicate: 3, virulent: 3, vociferous: 3,
  voracious: 3, wanton: 3, warranted: 3, zealous: 3,

  // ── Level 4: Uncommon — well-educated / literary readers ───────
  abnegate: 4, abstemious: 4, acerbic: 4, acquisitive: 4, aegis: 4,
  alacrity: 4, amorphous: 4, anathema: 4, antediluvian: 4, apotheosis: 4,
  approbation: 4, asperity: 4, asseverate: 4, atavistic: 4, aver: 4,
  beatific: 4, bellicose: 4, bereft: 4, bilious: 4, bombastic: 4,
  brusque: 4, bumptious: 4, byzantine: 4, cabal: 4, cachinnate: 4,
  calumny: 4, canard: 4, captious: 4, carnage: 4, celerity: 4,
  censorious: 4, chagrin: 4, chimera: 4, circuitous: 4, clairvoyant: 4,
  cogent: 4, collusion: 4, compunction: 4, conflagration: 4, contrite: 4,
  contumely: 4, convivial: 4, copious: 4, corpulent: 4, cosset: 4,
  cupidity: 4, debacle: 4, decadent: 4, declivity: 4, defenestrate: 4,
  denouement: 4, desuetude: 4, desultory: 4, diaphanous: 4,
  dilatory: 4, disabuse: 4, discursive: 4, dissolute: 4, draconian: 4,
  dulcet: 4, ecclesiastical: 4, effete: 4, effluvium: 4, effrontery: 4,
  effulgent: 4, eleemosynary: 4, emollient: 4, encomium: 4, enervate: 4,
  epiphany: 4, epistemology: 4, equivocate: 4, erudite: 4, escarpment: 4,
  etiology: 4, excoriate: 4, execrable: 4, exegesis: 4, exigent: 4,
  expiate: 4, extirpate: 4, fatuous: 4, feckless: 4, febrile: 4,
  fecund: 4, felicitous: 4, filibuster: 4, fulminate: 4, gainsay: 4,
  genuflect: 4, germane: 4, glean: 4, grandiloquent: 4, hagiography: 4,
  halcyon: 4, harbinger: 4, heuristic: 4, hirsute: 4, ignominious: 4,
  impecunious: 4, imperturbable: 4, impolitic: 4, importune: 4, impugn: 4,
  inchoate: 4, incontrovertible: 4, incorrigible: 4, incredulous: 4, indefatigable: 4,
  indeterminate: 4, inefficacious: 4, ineluctable: 4, ingratiate: 4, inscrutable: 4,
  insipid: 4, internecine: 4, interpolate: 4, inveterate: 4, irrefutable: 4,
  jejune: 4, juggernaut: 4, kismet: 4, lachrymose: 4, legerdemain: 4,
  licentious: 4, limpid: 4, lissome: 4, lugubrious: 4, machiavellian: 4,
  maelstrom: 4, malfeasance: 4, martinet: 4, mawkish: 4, mellifluous: 4,
  mendicity: 4, meretricious: 4, miscreant: 4, misanthrope: 4, modicum: 4,
  moribund: 4, munificent: 4, nadir: 4, nascent: 4, nebulous: 4,
  nescient: 4, nihilism: 4, obloquy: 4, obsequious: 4, obstreperous: 4,
  officious: 4, oligarchy: 4, otiose: 4, overweening: 4, palaver: 4,
  panegyric: 4, paradigmatic: 4, paroxysm: 4, pastiche: 4, patrician: 4,
  pecuniary: 4, pellucid: 4, penurious: 4, perdition: 4, perfidious: 4,
  peripatetic: 4, perspicacious: 4, pertinacious: 4, pervicacious: 4, petulant: 4,
  philistine: 4, phlegmatic: 4, piscine: 4, plangent: 4, plethora: 4,
  polemic: 4, portentous: 4, prevaricate: 4, probity: 4, proclivity: 4,
  profligacy: 4, propitious: 4, proscribe: 4, provenance: 4, puerile: 4,
  pugilism: 4, punctilious: 4, pusillanimous: 4, quixotic: 4, rapacious: 4,
  rarefied: 4, recondite: 4, recrudescence: 4, redoubtable: 4, refractory: 4,
  remonstrate: 4, reprobate: 4, ribald: 4, risible: 4, roseate: 4,
  sacrosanct: 4, salacious: 4, sanctimonious: 4, sapient: 4, saturnine: 4,
  scintillate: 4, sedulous: 4, senescent: 4, serendipity: 4, sinecure: 4,
  solicitous: 4, somnolent: 4, sophistry: 4, specious: 4, stygian: 4,
  supercilious: 4, sybaritic: 4, tendentious: 4, tergiversate: 4, timorous: 4,
  toady: 4, torpor: 4, totalitarian: 4, tractable: 4, transmogrify: 4,
  trenchant: 4, turgid: 4, turpitude: 4, umbrage: 4, unctuous: 4,
  unimpeachable: 4, uxorious: 4, vacuous: 4, venal: 4, veracious: 4,
  verdant: 4, vestige: 4, vitriolic: 4, vituperate: 4, wrathful: 4,
};

/**
 * Get difficulty level for a word (0-5).
 * 0 = ultra-common (never annotate), 5 = rare/unknown (always annotate).
 */
export function getWordDifficulty(word: string): number {
  const lower = word.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!lower || lower.length <= 2) return 0; // Too short to annotate
  return WORD_FREQ[lower] ?? 5;
}

/**
 * Should this word be annotated at the given user level?
 *
 * User level 1 = fewest hints (only very rare words)
 * User level 5 = most hints (all but the most common words)
 *
 * Mapping:
 *   level 1 → annotate words with difficulty >= 5
 *   level 2 → annotate words with difficulty >= 4
 *   level 3 → annotate words with difficulty >= 3
 *   level 4 → annotate words with difficulty >= 2
 *   level 5 → annotate words with difficulty >= 1
 */
export function shouldAnnotateWord(word: string, level: number): boolean {
  const difficulty = getWordDifficulty(word);
  if (difficulty === 0) return false; // Never annotate ultra-common words
  const threshold = 6 - level; // level 1→5, level 5→1
  return difficulty >= threshold;
}
