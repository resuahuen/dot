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
      // const imageLink = processImageAnnotation(annotation.imagePath, process.argv[4], pageNumber, imageCounter, process.argv[3]);
      // const imageLink = processImageAnnotation(annotation.imagePath, process.argv[4], pageNumber, imageCounter, process.argv[3], markdownOutputPath);
      const imageLink = processImageAnnotation(annotation.imagePath, process.argv[4], pageNumber, imageCounter, process.argv[3], markdownOutputPath, finalMarkdownOutputPath);
      markdownContent += imageLink;
      imageCounter++;
      break;
    default:
      // Ignore other annotation types
      break;
  }
});

// // Function to process the image annotation with page number and image index
// function processImageAnnotation(
//   imagePath,
//   imageOutputPath,
//   pageNumber,
//   imageCounter,
//   pdfFilePath,
//   markdownOutputPath,
//   finalMarkdownOutputPath
// ) {
//   const pdfFilename = path.basename(pdfFilePath, '.pdf');
//   const imageExtension = path.extname(imagePath);

//   // Generate new image filename with page number and image index
//   const newImagePath = path.join(imageOutputPath, `${pdfFilename}${pageNumber}p${imageCounter}${imageExtension}`);

//   // Ensure both paths are absolute
//   const absImagePath = path.resolve(newImagePath);
//   const absMarkdownPath = path.resolve(finalMarkdownOutputPath);

//   // Rename the image with the new filename
//   fs.renameSync(imagePath, absImagePath);

//   // Compute relative path from the markdown file to the image
//   const markdownFileDir = path.dirname(absMarkdownPath);
//   const relativeImagePath = path.relative(markdownFileDir, absImagePath);

//   let imageLink;
//   if (linkStyle === "obsidian") {
//     imageLink = `![[${path.basename(absImagePath)}]]`;
//   } else {
//     imageLink = `![img](${relativeImagePath})`;
//   }

//   return `${imageLink}\n\n`;
// }

function processImageAnnotation(
  imagePath,
  imageOutputPath,
  pageNumber,
  imageCounter,
  pdfFilePath,
  markdownOutputPath,
  finalMarkdownOutputPath
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

  let imageLink;
  if (linkStyle === "obsidian") {
    imageLink = `![[${path.basename(newImagePath)}]]`;
  } else {
    imageLink = `![img](${relativeImagePath.replace(/\\/g, '/')})`;
  }

  // Debug output
  console.log('finalMarkdownOutputPath:', finalMarkdownOutputPath);
  console.log('absImageOutputPath:', absImageOutputPath);
  console.log('absFinalMarkdownOutputPath:', absFinalMarkdownOutputPath);
  console.log('markdownFileDir:', markdownFileDir);
  console.log('newImagePath:', newImagePath);
  console.log('relativeImagePath:', relativeImagePath);

  return `${imageLink}\n\n`;
}

// Get the filename of the input PDF
const pdfFilename = path.basename(process.argv[3], '.pdf');


// Append the output to the existing Markdown file (if it exists)
fs.appendFileSync(markdownOutputPath, markdownContent, 'utf8');
console.log('Output saved to:', markdownOutputPath);