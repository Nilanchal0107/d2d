# Student ID Card — Development to Deployment

A plain **HTML + CSS** student identity card, used to demonstrate a complete
**Development → Testing → Deployment** flow using **GitHub Actions** and **GitHub Pages**.

## Project structure

```
.
├── index.html                  # the ID card markup
├── style.css                   # all styling
├── img.jpg                     # student photograph used on the card
├── img1.jpg                    # spare photograph (used for the demo)
├── package.json                # defines the "npm test" command
├── tests/
│   └── idcard.test.js          # the quality gate - 6 automated checks
└── .github/workflows/
    └── deploy.yml              # the CI/CD pipeline
```

## The pipeline

```
git push  ──►  JOB 1: test  ──► pass ──►  JOB 2: deploy  ──►  live on GitHub Pages
                     │
                     └────────► fail ──►  pipeline stops, old site stays live
```

`deploy` declares `needs: test`, so a failing test physically blocks the deployment.

## What the tests check

| # | Test | Bug it catches |
|---|------|----------------|
| 1 | Required files exist | `index.html` or `style.css` deleted |
| 2 | Every referenced file exists | folder has `img.jpg` but code says `img1.png` |
| 3 | Every HTML class is styled | typo like `class="card-hedaer"` |
| 4 | Card structure is intact | header / photo / details accidentally removed |
| 5 | No blank or placeholder values | `TODO`, `XXXX`, empty fields left on the card |
| 6 | Page hygiene | missing `<title>`, `lang`, viewport or image `alt` |

## Run the tests locally

```bash
npm test
```

## How to demo a failing build

1. In [index.html](index.html), change `src="img.jpg"` to `src="img1.png"`.
2. Commit and push.
3. The **test** job fails with
   `Broken link(s) in index.html -> these files do NOT exist: img1.png`,
   the **deploy** job is skipped, and the live site is untouched.
4. Fix it back to `src="img.jpg"`, push again — tests pass and the site deploys.
