const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const fs = require("fs-extra");
const path = require("path");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

/**
 * Sanitizes folder names to be filesystem-friendly.
 */
function sanitize(name) {
  return name.replace(/[\\/:"*?<>|]/g, "").trim();
}

/**
 * Recursively exports a page and its children.
 */
async function exportPage(pageId, currentPath) {
  try {
    // 1. Fetch page metadata for the title
    const page = await notion.pages.retrieve({ page_id: pageId });
    const title =
      page.properties.title?.title[0]?.plain_text ||
      page.properties.Name?.title[0]?.plain_text ||
      "Untitled";

    const folderName = sanitize(title);
    const dirPath = path.join(currentPath, folderName);

    await fs.ensureDir(dirPath);
    console.log(`Exporting: ${dirPath}`);

    // 2. Convert current page to Markdown
    const mdBlocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdBlocks);
    await fs.writeFile(path.join(dirPath, "README.md"), mdString.parent);

    // 3. Find child pages (blocks of type 'child_page')
    const blocks = await notion.blocks.children.list({ block_id: pageId });
    const childPages = blocks.results.filter(
      (block) => block.type === "child_page",
    );

    // 4. Recursively export each child
    for (const child of childPages) {
      await exportPage(child.id, dirPath);
    }
  } catch (error) {
    console.error(`Failed to export page ${pageId}:`, error.message);
  }
}

async function run() {
  const rootDir = "notes";
  await fs.emptyDir(rootDir); // Clear old notes to keep it fresh
  await exportPage(process.env.NOTION_PAGE_ID, rootDir);
  console.log("Success: Full hierarchy exported.");
}

run();
