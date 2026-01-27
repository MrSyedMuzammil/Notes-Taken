const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const fs = require("fs-extra");
const path = require("path");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

function sanitize(name) {
  return name.replace(/[\\/:"*?<>|]/g, "").trim();
}

async function exportPage(pageId, currentPath) {
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const title =
      page.properties.title?.title[0]?.plain_text ||
      page.properties.Name?.title[0]?.plain_text ||
      "Untitled";

    const folderName = sanitize(title);
    const dirPath = path.join(currentPath, folderName);

    await fs.ensureDir(dirPath);

    const mdBlocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdBlocks).parent;

    const filePath = path.join(dirPath, "README.md");

    // Check if file exists and compare content
    let existingContent = "";
    if (await fs.pathExists(filePath)) {
      existingContent = await fs.readFile(filePath, "utf8");
    }

    // Only write if the content has actually changed
    if (mdString !== existingContent) {
      await fs.writeFile(filePath, mdString);
      console.log(`Updated: ${filePath}`);
    }

    const blocks = await notion.blocks.children.list({ block_id: pageId });
    const childPages = blocks.results.filter(
      (block) => block.type === "child_page",
    );

    for (const child of childPages) {
      await exportPage(child.id, dirPath);
    }
  } catch (error) {
    console.error(`Failed to export page ${pageId}:`, error.message);
  }
}

async function run() {
  const rootDir = "notes";
  // REMOVED: fs.emptyDir(rootDir) -> We no longer delete everything first
  await fs.ensureDir(rootDir);
  await exportPage(process.env.NOTION_PAGE_ID, rootDir);
  console.log("Sync complete.");
}

run();
