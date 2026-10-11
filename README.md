# Comma

A proofreader for Word and the web that fixes grammar, punctuation and capitalization with fixed rules. No AI, no sentence rewrites, and your text never leaves your computer.

- Web version: https://legoneil.github.io/comma/
- Word add-in: `manifest.xml`

## Add it to Word on a Mac

1. In Finder, choose **Go → Go to Folder…** and paste `~/Library/Containers/com.microsoft.Word/Data/Documents/`
2. Make a folder named `wef` there if it doesn't exist, and copy `manifest.xml` into it.
3. Quit and reopen Word. Click **Comma** on the Home tab. (If it isn't there, open **Home → Add-ins** and choose Comma.)

## Add it to Word on Windows

Word for Windows needs a shared network folder set up as a trusted add-in catalog: https://learn.microsoft.com/office/dev/add-ins/testing/create-a-network-shared-folder-catalog-for-task-pane-and-content-add-ins
