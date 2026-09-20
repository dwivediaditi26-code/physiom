// neuroQuizBuilders.test.js
// The Neuro study screen's reflexes, dermatomes, myotomes and cranial nerves each
// asked one question; they now get a short quiz built from the entry's own fields
// (2026-09-20, Aditi: "now do same for neuro and cardio"). Every real entry is
// held to the same rules as the other Learn quizzes, plus the fairness rules that
// matter for look-alike signs, overlapping root levels and self-naming notes.
import { describe, it, expect } from "vitest";
import { DERMATOMES, MYOTOMES, REFLEXES, CRANIAL_NERVES } from "../sharedClinicalData.js";
import { reflexQuestions, dermatomeQuestions, myotomeQuestions, cranialQuestions, testSteps } from "../physiofeed/learn/neuroQuizBuilders.js";
import { clean, rootSet } from "../physiofeed/learn/quizKit.js";

const GROUPS = {
  reflexes: [REFLEXES, (x) => reflexQuestions(x, REFLEXES), (x) => x.id],
  dermatomes: [DERMATOMES, (x) => dermatomeQuestions(x, DERMATOMES), (x) => x.id],
  myotomes: [MYOTOMES, (x) => myotomeQuestions(x, MYOTOMES), (x) => x.level],
  cranial: [CRANIAL_NERVES, (x) => cranialQuestions(x, CRANIAL_NERVES), (x) => x.id],
};
const norm = (s) => clean(s).toLowerCase();
const rightOf = (q) => q.options.find((o) => o.id === q.correctOptionId).text;
const wrongOf = (q) => q.options.filter((o) => o.id !== q.correctOptionId).map((o) => o.text);
const by = (list, pick) => list.find(pick);
const topic = (qs, t) => qs.find((q) => q.topic === t);

describe("neuro reference quizzes", () => {
  for (const [name, [list, build, idOf]] of Object.entries(GROUPS)) {
    it(`${name}: every entry gets a well-formed quiz of at least 2 questions`, () => {
      for (const x of list) {
        const qs = build(x);
        expect(qs.length, idOf(x)).toBeGreaterThanOrEqual(2);
        expect(qs.length, idOf(x)).toBeLessThanOrEqual(4);
        const seen = new Set();
        for (const q of qs) {
          const where = `${idOf(x)} / ${q.topic}`;
          expect(q.question, where).toBeTruthy();
          expect(q.explanation, where).toBeTruthy();
          expect(q.options, where).toHaveLength(4);
          expect(new Set(q.options.map((o) => norm(o.text))).size, where).toBe(4);
          expect(q.options.filter((o) => o.id === q.correctOptionId), where).toHaveLength(1);
          q.options.forEach((o) => expect(o.text.length, where).toBeLessThanOrEqual(240));
          expect(seen.has(q.topic), `${where} repeated`).toBe(false);
          seen.add(q.topic);
          q.options.forEach((o) => expect((o.text.match(/\(/g) || []).length, `${where}: ${o.text}`).toBe((o.text.match(/\)/g) || []).length));
        }
      }
    });

    it(`${name}: builds the same questions every time`, () => {
      expect(list.map(build)).toEqual(list.map(build));
    });
  }

  it("returns nothing for a missing entry", () => {
    expect(reflexQuestions(null, REFLEXES)).toEqual([]);
    expect(dermatomeQuestions(undefined, DERMATOMES)).toEqual([]);
    expect(myotomeQuestions(null, MYOTOMES)).toEqual([]);
    expect(cranialQuestions(null, CRANIAL_NERVES)).toEqual([]);
  });
});

describe("reflexes", () => {
  const qsOf = (id) => reflexQuestions(by(REFLEXES, (r) => r.id === id), REFLEXES);

  it("asks the root level in both directions for reflexes that test a root or nerve", () => {
    const triceps = qsOf("n_ref_tricep");
    expect(rightOf(topic(triceps, "Root level"))).toBe("C6–C7");
    expect(topic(triceps, "Which reflex").question).toBe("Which reflex is tested at C6–C7?");
    expect(rightOf(topic(triceps, "Which reflex"))).toBe("Triceps");
  });

  it("does not ask for a root level on the UMN / LMN signs, whose 'level' is a lesion site", () => {
    REFLEXES.filter((r) => /^(UMN|LMN)/.test(r.level)).forEach((r) => {
      const qs = reflexQuestions(r, REFLEXES);
      expect(topic(qs, "Root level"), r.id).toBeUndefined();
      expect(topic(qs, "Which reflex"), r.id).toBeUndefined();
    });
  });

  it("skips 'which reflex is tested at C5–C6?' because Biceps and Brachioradialis share that level", () => {
    expect(topic(qsOf("n_ref_bicep"), "Which reflex")).toBeUndefined();
    expect(topic(qsOf("n_ref_brad"), "Which reflex")).toBeUndefined();
  });

  it("never offers a reflex on an overlapping root level as the wrong answer", () => {
    for (const r of REFLEXES) {
      const q = topic(reflexQuestions(r, REFLEXES), "Which reflex");
      if (!q) continue;
      const mine = rootSet(r.level);
      wrongOf(q).forEach((label) => {
        const other = REFLEXES.find((x) => x.label.replace(/\s*\(.*$/, "").trim() === label);
        expect(other, `${r.id}: ${label}`).toBeTruthy();
        [...rootSet(other.level)].forEach((seg) => expect(mine.has(seg), `${r.id}: ${label} shares ${seg}`).toBe(false));
      });
    }
  });

  it("does not offer a root level nested inside the right one", () => {
    const achilles = topic(qsOf("n_ref_achilles"), "Root level");
    expect(rightOf(achilles)).toBe("S1");
    expect(wrongOf(achilles)).not.toContain("S1–S2"); // contains S1
  });

  it("keeps look-alike signs out of each other's wrong answers", () => {
    const techniqueOf = (r) => clean(r.technique).slice(0, 40).toLowerCase();
    const has = (q, r) => q.options.some((o) => norm(o.text).includes(techniqueOf(r).slice(0, 25)));
    const hoffmann = by(REFLEXES, (r) => r.id === "n_ref_hoffmann");
    const tromner = by(REFLEXES, (r) => r.id === "n_ref_trommer");
    // Trömner's own technique says "reverse of Hoffmann's": never a wrong answer for Hoffmann's.
    expect(has(topic(qsOf("n_ref_hoffmann"), "How to test"), tromner)).toBe(false);
    expect(has(topic(qsOf("n_ref_trommer"), "How to test"), hoffmann)).toBe(false);
    // The plantar-stroking signs share a group, so none is offered for another.
    ["n_ref_babinski", "n_ref_chaddock", "n_ref_oppenheim"].forEach((id) => {
      const qs = qsOf(id);
      ["n_ref_babinski", "n_ref_chaddock", "n_ref_oppenheim"].filter((o) => o !== id).forEach((otherId) => {
        const other = by(REFLEXES, (r) => r.id === otherId);
        expect(has(topic(qs, "How to test"), other), `${id} vs ${otherId}`).toBe(false);
      });
    });
  });

  it("never offers a wrong answer that names the reflex it is a wrong answer for", () => {
    for (const r of REFLEXES) {
      const word = r.label.replace(/\s*\(.*$/, "").toLowerCase().split(/[^\p{L}\p{N}]+/u).find((w) => w.length >= 5 && !["reflex", "muscle", "assessment", "normal"].includes(w));
      if (!word) continue;
      reflexQuestions(r, REFLEXES).filter((q) => q.topic === "How to test" || q.topic === "Clinical finding").forEach((q) => {
        wrongOf(q).forEach((text) => expect(text.toLowerCase(), `${r.id} / ${q.topic}`).not.toContain(word));
      });
    }
  });

  it("softens SHOUTED words but keeps a capital at the start of a sentence", () => {
    const brad = topic(qsOf("n_ref_brad"), "Clinical finding");
    expect(rightOf(brad)).toMatch(/\. Inverted reflex: BR absent/);
    expect(rightOf(brad)).not.toMatch(/INVERTED|URGENT/);
  });
});

describe("dermatomes", () => {
  const qsOf = (level) => dermatomeQuestions(by(DERMATOMES, (d) => d.level === level), DERMATOMES);

  it("asks the area, the dermatome for an area, and the myotome for every level", () => {
    DERMATOMES.forEach((d) => {
      const qs = dermatomeQuestions(d, DERMATOMES);
      expect(rightOf(topic(qs, "Area supplied")), d.id).toBe(clean(d.region));
      expect(rightOf(topic(qs, "Which dermatome")), d.id).toBe(d.level);
      expect(rightOf(topic(qs, "Myotome")), d.id).toBe(clean(d.myotome));
    });
  });

  it("asks the disc level only where the data has a disc level, not for S3 or the saddle area", () => {
    expect(topic(qsOf("C5"), "Disc level")).toBeTruthy();
    expect(topic(qsOf("S3"), "Disc level")).toBeUndefined();
    expect(topic(qsOf("S4/5"), "Disc level")).toBeUndefined();
  });

  it("offers only discs that share no vertebral level with the right one", () => {
    // Books differ on which root a lumbar disc affects, so a neighbouring disc must not be a wrong answer.
    const levelsOf = (disc) => {
      const m = disc.match(/^([CTLS])(\d+)\/([CTLS])?(\d+)$/);
      return m ? [`${m[1]}${m[2]}`, `${m[3] || m[1]}${m[4]}`] : [];
    };
    const q = topic(qsOf("L4"), "Disc level");
    expect(rightOf(q)).toBe("L4/5");
    wrongOf(q).forEach((disc) => {
      expect(levelsOf(disc).length, disc).toBe(2);
      levelsOf(disc).forEach((seg) => expect(["L4", "L5"], disc).not.toContain(seg));
    });
    expect(wrongOf(q)).not.toContain("L3/4");
    expect(wrongOf(q)).not.toContain("L5/S1");
  });

  it("answers a lumbar question from lumbar levels first", () => {
    const q = topic(qsOf("L4"), "Which dermatome");
    wrongOf(q).forEach((level) => expect(level, level).toMatch(/^L/));
    const cervical = topic(qsOf("C5"), "Which dermatome");
    wrongOf(cervical).forEach((level) => expect(level, level).toMatch(/^C/));
  });
});

describe("myotomes", () => {
  const qsOf = (level) => myotomeQuestions(by(MYOTOMES, (m) => m.level === level), MYOTOMES);

  it("asks the movement, the root level, how to test it and the compensation for every level", () => {
    MYOTOMES.forEach((m) => {
      const qs = myotomeQuestions(m, MYOTOMES);
      expect(qs.map((q) => q.topic), m.level).toEqual(["Movement tested", "Root level", "How to test", "Compensation"]);
      expect(rightOf(topic(qs, "Movement tested"))).toBe(clean(m.action));
      expect(rightOf(topic(qs, "Root level"))).toBe(m.level);
      expect(rightOf(topic(qs, "How to test"))).toBe(clean(m.test));
      expect(rightOf(topic(qs, "Compensation"))).toBe(clean(m.compensation));
    });
  });

  it("does not offer a root level that sits inside the right one, or the reverse", () => {
    MYOTOMES.forEach((m) => {
      const q = topic(myotomeQuestions(m, MYOTOMES), "Root level");
      const mine = rootSet(m.level);
      wrongOf(q).forEach((level) => {
        const theirs = rootSet(level);
        expect([...mine].every((s) => theirs.has(s)) || [...theirs].every((s) => mine.has(s)), `${m.level} vs ${level}`).toBe(false);
      });
    });
  });

  it("does not nest brackets in the how-to-test question", () => {
    const q = topic(qsOf("L5"), "How to test");
    expect(q.question).toBe("How is the L5 myotome tested (Great toe extension)?");
  });

  it("offers wrong movements from the same spinal region first", () => {
    const q = topic(qsOf("C6"), "Movement tested");
    const cervical = MYOTOMES.filter((m) => m.level.startsWith("C") && m.level !== "C6").map((m) => clean(m.action));
    wrongOf(q).forEach((text) => expect(cervical, text).toContain(text));
  });
});

describe("cranial nerves", () => {
  const qsOf = (id) => cranialQuestions(by(CRANIAL_NERVES, (c) => c.id === id), CRANIAL_NERVES);

  it("asks the name and the number of every nerve, both ways", () => {
    CRANIAL_NERVES.forEach((cn) => {
      const qs = cranialQuestions(cn, CRANIAL_NERVES);
      expect(rightOf(topic(qs, "Nerve name")), cn.id).toBe(clean(cn.name));
      expect(rightOf(topic(qs, "Nerve number")), cn.id).toBe(`CN ${cn.numeral}`);
    });
  });

  it("still builds the number question for CN I, although 'CN I' sits inside 'CN II'", () => {
    const q = topic(qsOf("cn1"), "Nerve number");
    expect(q).toBeTruthy();
    expect(q.options).toHaveLength(4);
  });

  it("never picks the pupillary light reflex to identify a nerve (it tests CN II and CN III)", () => {
    CRANIAL_NERVES.forEach((cn) => {
      const q = topic(cranialQuestions(cn, CRANIAL_NERVES), "How it is tested");
      if (q) expect(q.question, cn.id).not.toMatch(/pupil/i);
    });
    expect(topic(qsOf("cn346"), "How it is tested").question).toMatch(/extraocular movements/);
  });

  it("splits a test on commas outside brackets", () => {
    expect(testSteps("Smell (coffee, mint, soap) with eyes closed, one nostril occluded")).toEqual(["Smell (coffee, mint, soap) with eyes closed", "one nostril occluded"]);
  });

  it("does not ask for a note that names its own nerve, or offer one that does", () => {
    CRANIAL_NERVES.forEach((cn) => {
      const q = topic(cranialQuestions(cn, CRANIAL_NERVES), "Clinical point");
      if (!q) return;
      const tokens = [...(cn.numeral.match(/[IVX]+/g) || []).map((n) => new RegExp(`\\bCN\\s*${n}\\b`, "i")), ...cn.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 5).map((w) => new RegExp(w, "i"))];
      q.options.forEach((o) => tokens.forEach((re) => expect(o.text, `${cn.id}: ${o.text}`).not.toMatch(re)));
    });
    expect(topic(qsOf("cn11"), "Clinical point")).toBeUndefined(); // "Isolated CN XI palsy..."
    expect(topic(qsOf("cn1"), "Clinical point")).toBeUndefined(); // "...olfactory filaments"
  });
});
