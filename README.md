# Software Design Coach

An interactive design coach that guides a developer through planning software projects and features before implementation, while teaching the reasoning behind each design decision.

The product specification lives in [`design/Software_Design_Coach_Build_Spec.docx`](design/Software_Design_Coach_Build_Spec.docx).

Status: scaffolded. The app shell runs; the coaching workflow arrives slice by slice ([docs/mvp-plan.md](docs/mvp-plan.md) §6).

## Run it

Needs Node.js 24 (the Angular CLI requires 22.22.3+, 24.15+ or 26+).

```sh
npm ci
npm start        # serve at http://localhost:4200
npm run build   # production build
npm run lint
npm test
```
