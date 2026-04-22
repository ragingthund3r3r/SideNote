# SideNote

<p align="center"><img width="120" height="120" alt="SideNote" src="https://github.com/user-attachments/assets/c5d16c3b-9950-48b1-8991-2cccdbea241b" /></p>



Most of us tend to spend almost all of our time in the browser. We do almost everything in the browser. I know I do. But when I need to notedown something or quickly jot down an idea that I need to get out of my brain before I forget it, I almost always turn to Obsidian. Obsidian is good, but it takes reallly long to launch. 

So introducing SideNote, a notepad that exists in your browser sidepanel but writes notes to your local files. 
By writing the notes in the sidebar, the friction of having to open a new website/ application is removed and at the same time you can save all files locally in a pre-existing folder in a classic markdown format. 

Think of SideNote as a lite version of obsidian that you can run in your browser. 

## Demo

  

https://github.com/user-attachments/assets/c1e7e45e-7367-4941-b2e3-a7c98b6f5624




## Features

- **Quick Capture:** Capture thoughts instantly in your browser side panel without breaking focus.
- **Raw Markdown Output:** Save every note as a standard `.md` file with no vendor lock-in.
- **Local Folder Storage:** Write notes directly to any existing folder on your machine.
- **Custom Metadata Fields:** Define reusable frontmatter fields to keep notes consistent.
- **Date Placeholder Parsing:** Use date-fns-compatible patterns inside `{{ }}` for dynamic values.
- **WebPage Context:** Insert `{{url}}` and `{{title}}` from the active tab automatically.
- **Prefix Text Support:** Add a reusable template text at the top of every note.
- **Default Title Pattern:** Auto-generate note titles using your preferred format.
- **Link Drag-and-Drop:** Drop links into the editor to create clean Obsidian-style markdown links.
- **Draft Persistence:** Keep unfinished notes saved locally and continue later.
- **Context Menu Capture:** Send selected webpage text to SideNote from right-click menu.
- **Screenshot Embedding:** Capture the current viewport and embed the image in your note.
- **Auto Bullet List and Indentation:** Use auto-bullets plus tab/shift+tab indentation while writing.


## Installation guide

### Option 1: Install from source (recommended for development)

1. Download or clone this repository.
2. Open Chrome/Edge and go to `chrome://extensions/` or `edge://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this project folder.
6. Click the SideNote extension icon to open the side panel.
7. In the panel, click the folder button and authorize a notes directory.
8. Personal Recommendation: Setup a hotkey to launch SideNote and easily create new notes

### Option 2: Install from Releases (easier setup)

1. Go to the **Releases** section of this repository.
2. Download the latest `.zip` file.
3. Extract the zip file to a folder on your computer.
4. Open Chrome and go to `chrome://extensions/`.
5. Enable **Developer mode**.
6. Click **Load unpacked**.
7. Select the extracted folder.
8. Click the SideNote extension icon to open the side panel.
9. In the panel, click the folder button and authorize a notes directory.
10. Personal Recommendation: Setup a hotkey to launch SideNote and easily create new notes

## Development

This is a plain Manifest V3 extension (no build step).

- Main extension logic: `sidebar.js`
- Background/service worker: `background.js`
- Settings UI: `settings.html`, `settings.js`
- Side panel UI: `sidebar.html`
- Manifest: `manifest.json`

### Local workflow

1. Make code changes in this folder.
2. Go to `chrome://extensions/`.
3. Click **Reload** on SideNote.
4. Re-open the side panel and test changes.

### Notes

- The extension uses the File System Access API, so folder authorization is required before file creation.
- Metadata, title template, prefix text, and draft content are persisted in browser storage/local storage.
