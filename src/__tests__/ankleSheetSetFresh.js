// ankleSheetSetFresh.js -- a SECOND, fresh exam in the clinician's voice ("the patient", "they", short notes), written AFTER the Ankle/Foot
// matcher had been fixed for the sheet's own sentences (ankleSheetSet.js). None of these sentences was used to tune the matcher before
// their first run was recorded. Row = [lang, text, must, may] -- same meaning as in ankleSheetSet.js. The answer keys are DRAFTS written by
// Claude for Aditi to check.
import { KEYS } from "./ankleFootWildSets.js";

const { LATA, MEDA, ANTA, POSTA, ACHI, ACHM, PLANT, TOE1, FORE, BETW, TOP, SHIN, TARSAL, SOLE, BURNBETW, INSID, INV, EVER, HIGH, DIRECT, FALLH, LAND, CHG, TRAIN,
  FIRST, WALKRUN, DOWNH, DORSI, STAIRS, BAREFOOT, TIGHT, MORNIMP, WARM, NIGHT, BURN, SMILD, SMOD, SSEV, OTTBONE, OTTWEIGHT, ACHRUP, PERON } = KEYS;

export const ANKLE_SHEET_FRESH = [
  // Lateral ankle sprain
  ["en", "Rolled the ankle on a kerb, outer ankle swollen and bruised.", [INV, LATA], [SMOD, SMILD, SSEV]],
  ["en", "Landed on another player's foot, ankle went over, cannot weight bear.", [INV, OTTWEIGHT], [LAND, FALLH]],
  ["en", "Inversion sprain playing netball, pain over the lateral ligaments.", [INV, LATA], []],
  ["en", "Can't take four steps without severe pain after twisting the ankle.", [OTTWEIGHT], [INV]],
  ["en", "Tender over the lateral malleolus after a rolled ankle.", [INV], [LATA, OTTBONE]],
  ["hi", "Takhna moch gaya, bahar ki taraf sujan aur dard.", [LATA, INV], [SMOD, SMILD, SSEV]],
  ["de", "टखने में मोच आ गई और बाहर की तरफ सूजन है।", [INV], [LATA, SMOD, SMILD, SSEV]],
  ["en", "Ankle swelled up immediately and has a lot of bruising.", [], [SSEV, SMOD]],
  // Chronic ankle instability
  ["en", "Repeated sprains over the last two years, the ankle keeps giving way on uneven ground.", [], [INV, CHG, LATA]],
  ["en", "Rolls the ankle at least twice a month, lateral ankle ache after sport.", [INV, LATA], []],
  ["en", "Feels unstable going downhill, old inversion injuries.", [INV], [DOWNH]],
  ["en", "Recurrent ankle sprains since a football injury, swelling after training.", [INV], [SSEV, SMOD, SMILD, TRAIN, LATA]],
  ["hi", "Takhna baar baar andar ki taraf mud jata hai, purani moch ke baad.", [INV], [LATA]],
  ["de", "पुरानी मोच के बाद टखना बार बार मुड़ जाता है।", [INV], []],
  ["en", "Gave way again last week while walking on grass.", [], [INV, CHG]],
  // High ankle sprain
  ["en", "Pain above the ankle at the front after being tackled with the foot planted.", [HIGH, ANTA], [DIRECT]],
  ["en", "Syndesmosis injury skiing, pain on external rotation of the foot.", [HIGH], [LATA, ANTA]],
  ["en", "Squeeze test positive mid calf, sore above the ankle joint.", [], [HIGH, ANTA, SHIN]],
  ["en", "Foot caught in the turf and the body twisted over it.", [], [HIGH, INV, EVER, CHG]],
  ["hi", "Football mein tackle hua, takhne ke upar aage ki taraf tez dard.", [ANTA], [HIGH, DIRECT]],
  ["de", "टखने के ठीक ऊपर दर्द, पैर बाहर की तरफ घुमाने पर बढ़ता है।", [], [ANTA, LATA, HIGH]],
  // Achilles tendinopathy
  ["en", "Pain 5 cm above the heel in the Achilles, stiff in the morning.", [ACHM], [MORNIMP, FIRST]],
  ["en", "Insertional Achilles pain with a bony bump on the back of the heel.", [ACHI], []],
  ["en", "Worse at the start of a run, warms up then aches again afterwards.", [WARM], [WALKRUN, MORNIMP]],
  ["en", "Morning stiffness in the Achilles that eases within minutes.", [MORNIMP], [FIRST, ACHM, ACHI]],
  ["en", "Sore after hill running, no injury, built up over weeks.", [INSID], [DOWNH, TRAIN, WALKRUN]],
  ["en", "Pain at the back of the heel when going downstairs.", [], [ACHI, POSTA, DORSI, STAIRS]],
  ["hi", "Achilles mein edi se 4 cm upar dard, subah akdan.", [ACHM], [MORNIMP, FIRST]],
  ["de", "अकिलीज़ में एड़ी के पास दर्द और उभार।", [ACHI], []],
  // Achilles rupture
  ["en", "Felt a snap in the calf pushing off, cannot rise on tiptoe.", [ACHRUP], [POSTA, ACHM, ACHI]],
  ["en", "Sudden bang at the back of the ankle like being hit with a stick.", [], [ACHRUP, POSTA]],
  ["en", "Heard a pop from the Achilles when sprinting, unable to push off.", [ACHRUP], [ACHI, ACHM, POSTA]],
  ["hi", "Daudte waqt takhne ke peeche pop ki awaaz, panjon par khade nahi ho pa raha.", [ACHRUP], [POSTA]],
  ["de", "कूदते समय अकिलीज़ में पॉप की आवाज़ आई।", [ACHRUP], [LAND]],
  // Ankle osteoarthritis
  ["en", "Stiff painful ankle after an old fracture, worse after long walks.", [], [WALKRUN, INSID, MORNIMP]],
  ["en", "Ankle ache and stiffness in the morning, loosens up after a few minutes.", [MORNIMP], [FIRST]],
  ["en", "Grating in the ankle joint, swelling at the end of the day.", [], [SMILD, SMOD, ANTA]],
  ["hi", "Purani fracture ke baad takhna akda hua rehta hai, subah zyada.", [], [MORNIMP, FIRST, INSID]],
  ["de", "टखने में पुराना दर्द, लंबी सैर के बाद ज़्यादा।", [], [WALKRUN]],
  // Tibialis posterior dysfunction
  ["en", "Medial ankle ache behind the inner ankle bone, arch flattening.", [MEDA], [POSTA, PLANT]],
  ["en", "Pain on the inside of the ankle after standing all day, swelling along the tendon.", [MEDA], [SMOD, SMILD, PLANT, WALKRUN]],
  ["en", "Flat foot getting worse, aching arch, gradual onset with no injury.", [INSID], [PLANT, MEDA]],
  ["en", "Cannot do a single heel raise, inner ankle sore.", [MEDA], [PLANT]],
  ["hi", "Takhne ke andar ki taraf dard, arch dheere dheere nichi ho rahi hai.", [MEDA], [PLANT]],
  ["de", "टखने के अंदर की तरफ दर्द और सूजन, मेहराब बैठ रही है।", [MEDA], [PLANT, SMOD, SMILD, SSEV]],
  // Peroneal tendinopathy
  ["en", "Pain behind the lateral malleolus, snapping when the foot is turned out.", [LATA], [PERON, POSTA]],
  ["en", "Outer ankle tendon feels like it flicks over the bone.", [LATA], [PERON]],
  ["en", "Lateral ankle pain after repeated sprains, worse pushing off.", [LATA], [INV, WALKRUN]],
  ["hi", "Takhne ke bahar ki taraf dard, nas haddi par phisalti hai.", [LATA], [PERON]],
  ["de", "टखने के बाहर की तरफ दर्द और चटकने की आवाज़।", [LATA], [PERON]],
  // Tarsal tunnel syndrome
  ["en", "Burning in the sole and toes, worse at night, flat feet.", [TARSAL], [SOLE, BURN, NIGHT]],
  ["en", "Tingling under the foot after standing, takes shoes off for relief.", [], [SOLE, TARSAL, BURN, NIGHT]],
  ["en", "Numbness in the arch and toes, inner ankle tender.", [], [MEDA, TARSAL, SOLE, PLANT]],
  ["hi", "Talve mein jalan, raat ko zyada.", [TARSAL], [SOLE, BURN, NIGHT]],
  ["de", "तलवे में झनझनाहट और जलन, रात में बढ़ती है।", [TARSAL], [SOLE, BURN, NIGHT]],
  // Anterior ankle impingement
  ["en", "Anterior ankle pain on deep squat, pinching at the front.", [ANTA, DORSI], []],
  ["en", "Footballer with a stab of pain at the front of the ankle on kicking.", [ANTA], [DORSI, INSID, TRAIN]],
  ["hi", "Takhne ke aage dard, ghutna modkar baithne par chubhan.", [ANTA], [DORSI]],
  ["de", "टखने के आगे दर्द, सीढ़ियां उतरते समय।", [ANTA], [DORSI, STAIRS]],
  // Plantar fasciitis
  ["en", "Heel pain first thing in the morning, worse after sitting, gradual onset.", [PLANT, FIRST, INSID], [MORNIMP]],
  ["en", "Pain under the arch from standing on hard floors all day.", [PLANT], [CHG, INSID, BAREFOOT]],
  ["en", "Sharp heel pain on the first steps after rest, settles with walking.", [PLANT, FIRST], [MORNIMP]],
  ["en", "Plantar fascia pain after starting to run in new shoes.", [PLANT], [CHG, TRAIN]],
  ["hi", "Edi ke neeche dard, subah pehle kadam par zyada.", [PLANT, FIRST], [MORNIMP]],
  ["de", "एड़ी के नीचे दर्द, सुबह उठते ही ज़्यादा।", [PLANT, FIRST], [MORNIMP]],
  // Heel fat pad
  ["en", "Bruised feeling in the centre of the heel, worse barefoot on tiles.", [PLANT, BAREFOOT], []],
  ["en", "Deep heel ache after jumping down from a wall onto the heel.", [PLANT, FALLH], [LAND]],
  ["hi", "Edi ke beech chot jaisa dard, nange pair sakht farsh par.", [PLANT, BAREFOOT], []],
  ["de", "एड़ी के बीच में चोट जैसा दर्द, सख्त फर्श पर।", [PLANT], [BAREFOOT]],
  // Morton's neuroma
  ["en", "Pebble-in-the-shoe feeling under the ball of the foot, burning between the toes.", [FORE, BETW], [BURNBETW, BURN, TARSAL, TIGHT]],
  ["en", "Numb toes and burning in narrow shoes, better barefoot.", [TIGHT], [BURNBETW, BURN, TARSAL, BETW]],
  ["en", "Sharp pain between the third and fourth toes on walking.", [BETW], [WALKRUN]],
  ["hi", "Teesri aur chauthi ungli ke beech jalan, tang joote pehanne par.", [BETW, TIGHT], [BURNBETW, BURN]],
  ["de", "पंजे के नीचे कंकड़ जैसा एहसास, तंग जूतों में ज़्यादा।", [TIGHT], [FORE]],
  // Metatarsalgia
  ["en", "Pain under the metatarsal heads when standing, worse in heels.", [FORE], [TIGHT]],
  ["en", "Burning ball of the foot after running on hard roads.", [FORE], [BURN, WALKRUN, INSID, TRAIN, CHG]],
  ["hi", "Panje ke neeche dard, ooncha heel pehanne par zyada.", [FORE], [TIGHT]],
  ["de", "पंजे के नीचे दर्द, देर तक खड़े रहने पर।", [FORE], []],
  // Hallux rigidus
  ["en", "Stiff big toe, painful to push off, bony lump on top of the joint.", [TOE1], [WALKRUN, TOP]],
  ["en", "1st MTP stiffness and pain, cannot squat on tiptoe.", [TOE1], [DORSI, WALKRUN]],
  ["hi", "Anguthe ke jod mein akdan aur dard, chalne par.", [TOE1], [WALKRUN]],
  ["de", "अंगूठे के जोड़ में दर्द, तंग जूतों में ज़्यादा।", [TOE1, TIGHT], []],
  // Turf toe
  ["en", "Jammed the big toe pushing off on artificial turf, swollen joint.", [], [TOE1, DIRECT, CHG, SMOD, SMILD, SSEV]],
  ["en", "Sudden pain at the big toe joint after the toe was bent back.", [TOE1], [SMOD, SMILD]],
  ["hi", "Anguthe ke jod mein achanak dard, panje ko upar mod diya gaya.", [TOE1], [DIRECT]],
  ["de", "अंगूठे का जोड़ अचानक दुखने लगा और सूज गया।", [], [TOE1, SMOD, SMILD, SSEV]],
  // Midfoot sprain / osteoarthritis
  ["en", "Pain across the top of the foot after landing off a step, bruising under the arch.", [TOP], [PLANT, LAND, SMOD]],
  ["en", "Midfoot pain on push-off, swelling, cannot weight bear.", [OTTWEIGHT], [TOP, WALKRUN, SMOD]],
  ["en", "Ache in the middle of the foot, worse on uneven ground, old injury.", [], [TOP, CHG, INSID]],
  ["hi", "Paer ke upar beech mein dard, mudne ke baad.", [TOP], [INV]],
  ["de", "पैर के बीच में दर्द और सूजन, सीढ़ी से उतरते समय मुड़ गया।", [], [TOP, SMOD, INV, LAND]],
  // must stay silent
  ["en", "The patient is a 29 year old nurse from Pune.", [], []],
  ["en", "Referred by the orthopaedic clinic for rehabilitation.", [], []],
  ["en", "Wants to return to jogging in the park.", [], []],
  ["en", "A neighbour recommended the clinic.", [], []],
  ["en", "Her sister had ankle surgery last year.", [], []],
  ["en", "Examination done on Wednesday and the plan was explained.", [], []],
  ["hi", "Mareez ek nurse hain aur Pune se aate hain.", [], []],
  ["de", "मरीज़ की उम्र उनतीस साल है।", [], []],
];
