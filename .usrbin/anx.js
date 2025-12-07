// let linkStyle = process.argv[7] || "markdown"; // default
const tempMarkdownOutputPath = process.argv[5];
const linkStyle = process.argv[7] || "markdown";
const finalMarkdownOutputPath = process.argv[8];
const fs = require('fs');
const path = require('path');

const pageNumber = parseInt(process.argv[6]);
console.log(`Received page number: ${pageNumber}`);

// Read the annotations data from the command-line argument
const annotationsData = process.argv[2];
const annotations = JSON.parse(annotationsData);

// Exit the script if no annotations are found
if (annotations.length === 0) {
  const pdfFilename = path.basename(process.argv[3], '.pdf');
  console.log(`No annotations found in '${pdfFilename}.pdf'. Exiting...`);
  process.exit(0);
}

if (process.argv[7]) {
  const cfgPath = process.argv[7];
  if (fs.existsSync(cfgPath)) {
    const cfgContent = fs.readFileSync(cfgPath, "utf8");
    const match = cfgContent.match(/^\s*link_style\s*=\s*(\w+)/m);
    if (match) {
      linkStyle = match[1];
    }
  }
}

// Function to remove Unicode characters from a string
function removeUnicodeCharacters(input) {
  const unicodeRegex = /[\u{0080}-\u{FFFF}]/gu;
  const result = input.replace(unicodeRegex, '');
  return result;
}

// Function to process the annotation text
function processAnnotationText(annotation, pageNumber, pdfFilePath) {
  let text = '';

  if (annotation.type === 'highlight') {
    text = annotation.annotatedText;

    // Append comment if available
    if (annotation.comment) {
      const commentText = replacePageLinks(annotation.comment, pageNumber, pdfFilePath);
      
      // Check if the comment consists only of hashtags
      const regex = /^#+$/;
      if (regex.test(commentText.trim())) {
        const numHashtags = commentText.trim().length;
        const hashtags = '#'.repeat(numHashtags);
        text = `${hashtags} ${text}`; // Prepend hashtags and a space
      } else {
        text += `\n\n${commentText}`;
      }
    }
  } else if (annotation.type === 'text') {
    text = annotation.comment;
  }

  if (text) {
    text = replacePageLinks(text, pageNumber, pdfFilePath);
    text = removeUnicodeCharacters(text);
    text = replaceEscapedNewlinesWithLineBreaks(text); // Replace '\\' with <br> for line breaks
    return `${text}\n\n`;
  }

  return '';
}

// Function to replace '\\' (escaped newline) with actual line break tag (<br>)
function replaceEscapedNewlinesWithLineBreaks(input) {
  return input.replace(/\\\\/g, '<br>'); // Replace \\ with <br> for line breaks
}

// Function to replace [](lnk) labels with page links
function replacePageLinks(text, pageNumber, pdfFilePath) {
  if (text && text.includes("[](lnk)")) {
    const relativePath = path.relative(process.cwd(), pdfFilePath);
    const link = `[p${pageNumber}](${relativePath}#page=${pageNumber})`;
    text = text.replace("[](lnk)", link);
  }
  return text;
}

// Process the annotations
let markdownContent = '';
let imageCounter = 1;

// --- Ensure annotations are ordered by vertical (y) coordinate ---
// Try several common fields that might contain a y value and fall back
// to preserving original order when no coordinate is available.
function extractYCoordinate(a) {
  // Common shapes: rect arrays [x1, y1, x2, y2]
  if (a.rect && Array.isArray(a.rect) && a.rect.length >= 2) {
    return Number(a.rect[1]);
  }
  // bbox as array
  if (a.bbox && Array.isArray(a.bbox) && a.bbox.length >= 2) {
    return Number(a.bbox[1]);
  }
  // bbox as object with top/bottom/y
  if (a.bbox && typeof a.bbox === 'object') {
    if (typeof a.bbox.y === 'number') return a.bbox.y;
    if (typeof a.bbox.top === 'number') return a.bbox.top;
    if (typeof a.bbox.y0 === 'number') return a.bbox.y0;
    if (typeof a.bbox.y1 === 'number') return a.bbox.y1;
  }
  // direct properties
  if (typeof a.y === 'number') return a.y;
  if (typeof a.y0 === 'number') return a.y0;
  if (typeof a.y1 === 'number') return a.y1;

  return null;
}

// Attach original index and computed y, then stable-sort by y (descending => top-to-bottom)
for (let i = 0; i < annotations.length; i++) {
  annotations[i].__origIndex = i;
  annotations[i].__ycoord = extractYCoordinate(annotations[i]);
}

annotations.sort((a, b) => {
  const ay = a.__ycoord;
  const by = b.__ycoord;
  if (ay == null && by == null) return a.__origIndex - b.__origIndex;
  if (ay == null) return 1; // put a after b
  if (by == null) return -1; // put b after a
  // PDF coordinate system usually has origin at bottom-left; higher y means higher on page.
  // We want top-to-bottom visual order => sort by descending y
  if (by !== ay) return by - ay;
  return a.__origIndex - b.__origIndex;
});

// Define the markdown output path based on the PDF file path
const markdownOutputPath = process.argv[5];

// Iterate through the annotations to process each one
annotations.forEach(annotation => {
  // const pageNumber = annotation.page;
  switch (annotation.type) {
    case 'highlight':
      const highlightText = processAnnotationText(annotation, pageNumber, process.argv[3]);
      markdownContent += highlightText;
      break;
    case 'text':
      const textAnnotation = processAnnotationText(annotation, pageNumber, process.argv[3]);
      markdownContent += textAnnotation;
      break;
    case 'image':
      // const imageLink = processImageAnnotation(annotation.imagePath, process.argv[4], pageNumber, imageCounter, process.argv[3], markdownOutputPath, finalMarkdownOutputPath);
      const imageLink = processImageAnnotation(
        annotation.imagePath,
        process.argv[4],
        pageNumber,
        imageCounter,
        process.argv[3],
        markdownOutputPath,
        finalMarkdownOutputPath,
        annotation // pass the whole annotation
      );
      markdownContent += imageLink;
      imageCounter++;
      break;
    default:
      // Ignore other annotation types
      break;
  }
});

// Function to process image annotations
function processImageAnnotation(
  imagePath,
  imageOutputPath,
  pageNumber,
  imageCounter,
  pdfFilePath,
  markdownOutputPath,
  finalMarkdownOutputPath,
  annotation // new parameter
) {
  const path = require('path');
  const fs = require('fs');
  const pdfFilename = path.basename(pdfFilePath, '.pdf');
  const imageExtension = path.extname(imagePath);

  // Always resolve imageOutputPath and finalMarkdownOutputPath to absolute paths
  const absImageOutputPath = path.resolve(imageOutputPath);
  const absFinalMarkdownOutputPath = path.resolve(finalMarkdownOutputPath);

  // Generate new image filename with page number and image index
  const newImagePath = path.join(absImageOutputPath, `${pdfFilename}${pageNumber}p${imageCounter}${imageExtension}`);

  // Rename the image with the new filename
  fs.renameSync(imagePath, newImagePath);

  // Compute relative path from the final markdown file's directory to the image
  const markdownFileDir = absFinalMarkdownOutputPath;
  const relativeImagePath = path.relative(markdownFileDir, newImagePath);

  // --- Placeholder selection based on color ---
  let placeholder = "img";
  if (annotation && annotation.colorCategory) {
    if (annotation.colorCategory.toLowerCase() === "green") {
      placeholder = "mth";
    } else if (annotation.colorCategory.toLowerCase() === "red") {
      placeholder = "var";
    }
  }

  let imageLink;
  if (linkStyle === "obsidian") {
    imageLink = `![[${path.basename(newImagePath)}]]`;
  } else {
    imageLink = `![${placeholder}](${relativeImagePath.replace(/\\/g, '/')})`;
  }

  // --- Add comment below image if present ---
  if (annotation && annotation.comment) {
    return `${imageLink}\n${annotation.comment}\n\n`;
  }

  return `${imageLink}\n\n`;
}

// Get the filename of the input PDF
const pdfFilename = path.basename(process.argv[3], '.pdf');

// Append the output to the existing Markdown file (if it exists)
fs.appendFileSync(markdownOutputPath, markdownContent, 'utf8');
console.log('Output saved to:', markdownOutputPath);