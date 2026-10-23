# UI Kit Veritas

Design system — démo `/ui-kit` · **l’application consomme ces composants**.

## Principes

- **Une palette** — uniquement `var(--msp-*)`
- **UI Kit = source de vérité** — pages = composition de composants kit + CSS layout minimal
- **Scrollbar** — `.uikitScroll` + tokens `--msp-scrollbar-*`

## Composants Accueil (exportés)

| Composant | Rôle |
|-----------|------|
| `UiKitHomeShell` | Layout page : top + news bas full width |
| `UiKitHomeBoard` | Salutation + grille événements \| tickets |
| `UiKitEventsWeek` | Frise 7 jours + hint |
| `UiKitStackBlock` | Bloc titre / icône / KPI / corps |
| `UiKitKpiStrip` | KPI widgets, segments ou pills |
| `UiKitDataTable` | Table triable (shell + fade) |
| `UiKitNewsPanel` / `UiKitNewsItem` | Fil d’actus (list / grid) |
| `UiKitArticleModal` | Modale article |
| `UiKitPageHero` | Hero (bare ou carte) |
| `UiKitPanel` | Carte contenu |
| `UiKitButton` / `UiKitAlert` / `UiKitEmptyState` | Primitives |

## Usage

```js
import {
  UiKitHomeShell,
  UiKitHomeBoard,
  UiKitEventsWeek,
  UiKitNewsPanel
} from "../UiKit";
```

CSS page uniquement pour le wrapper (`pageWrapper`) / chrome app.

## Fichiers

- `uiKitTokens.css` — tokens
- `uiKitPrimitives.module.css` / `uiKitHome.module.css` / `uiKitTable.module.css` / `uiKitLayouts.module.css`
- `uiKitLayoutsStyles` — finder, searchBox, pagination, btnSquare (fiche entreprise)
- `components/` + `index.js`
- `UiKitPage.js` — galerie démo
