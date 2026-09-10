# Typing Morph

A small web app that shows how Khmer text becomes letters on the screen.

Type a word and watch the letter shapes move into place. Khmer letters often
change shape and swap places as you type, and this app makes that easy to see.

## Pages

- **Morph**: type a word and watch the shapes slide and join together.
- **Pipeline**: go step by step through the work the text engine does.
- **Normalize**: see how Khmer text gets put into the right order.
- **Inspect**: see the raw numbers behind the text.
- **Table**: the Khmer consonant chart. Click a letter to open it in Morph.

## Run it

```
npm install
npm run dev
```

Then open the address it prints.

To make a build for the web:

```
npm run build
```

## How it works

The app uses HarfBuzz to turn text into letter shapes, and it draws those shapes
itself so they can move smoothly. When the text changes, each shape springs to
its new spot instead of jumping.

For the Normalize page it uses the khmer-normalizer package.

## Font

Google Sans. The file is in `public/fonts`.
