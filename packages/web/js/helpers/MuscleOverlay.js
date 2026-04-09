// MuscleOverlay.js — Loads and renders the muscle anatomy SVGs with highlighting.

export class MuscleOverlay {
  constructor() {
    this.frontSvg = null;
    this.backSvg = null;
  }

  async load(basePath = 'assets') {
    if (!this.frontSvg) {
      const [f, b] = await Promise.all([
        fetch(`${basePath}/muscle-front.svg`).then(r => r.text()),
        fetch(`${basePath}/muscle-back.svg`).then(r => r.text()),
      ]);
      this.frontSvg = f;
      this.backSvg = b;
    }
  }

  render() {
    return `
      <div class="bp-figures">
        <div class="bp-figure-wrap">${this.frontSvg || ''}</div>
        <div class="bp-figure-wrap">${this.backSvg || ''}</div>
      </div>`;
  }

  highlight(slugSet) {
    document.querySelectorAll('.muscle-region').forEach(g => {
      g.classList.toggle('active-session', slugSet.has(g.id));
    });
  }

  // Derives the set of muscle slugs trained in a session from its sets + exercise list.
  static getSessionMuscles(sets, exercises) {
    const exMap = new Map(exercises.map(e => [e.id, e]));
    const slugs = new Set();
    for (const set of sets) {
      const ex = exMap.get(set.exerciseId);
      if (ex?.muscleGroups) {
        for (const mg of ex.muscleGroups) {
          slugs.add(mg.slug);
        }
      }
    }
    return slugs;
  }
}
