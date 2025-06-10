const fs = require('fs');
const path = require('path');

// Read the annotations data from the command-line argument
const annotationsData = process.argv[2];
const annotations = JSON.parse(annotationsData);

// Exit the script if no annotations are found
if (annotations.length === 0) {
  const pdfFilename = path.basename(process.argv[3], '.pdf');
  console.log(`no annotations found in '${pdfFilename}.pdf'. exiting...`);
  process.exit(0);
}

// Function to remove Unicode characters from a string
function removeUnicodeCharacters(input) {
  // Use a regular expression to match all Unicode characters
  const unicodeRegex = /[\u{0080}-\u{FFFF}]/gu;

  // Remove the Unicode characters using the replace() method
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
    return `${text}\n\n`;
  }

  return '';
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

annotations.forEach(annotation => {
  switch (annotation.type) {
    case 'highlight':
      const highlightText = processAnnotationText(annotation, annotation.page, process.argv[3]);
      markdownContent += highlightText;
      break;
    case 'text':
        const textAnnotation = processAnnotationText(annotation, annotation.page, process.argv[3]);
        markdownContent += textAnnotation;
  break;
    case 'image':
      const imageLink = processImageAnnotation(annotation.imagePath, process.argv[4], process.argv[5], process.argv[3]);
      markdownContent += imageLink;
      imageCounter++;
      break;
    default:
      // Ignore other annotation types
      break;
  }
});

// Function to process the image annotation
function processImageAnnotation(imagePath, imageOutputPath, markdownOutputPath, pdfFilePath) {
  const pdfFilename = path.basename(process.argv[3], '.pdf');
  const imageExtension = path.extname(imagePath);
  const newImagePath = path.join(imageOutputPath, `${pdfFilename}${imageCounter}${imageExtension}`);
  fs.renameSync(imagePath, newImagePath);
  const imageLink = `![[${path.basename(newImagePath)}]]`;

  // Check if the annotation has a comment
  const annotation = annotations.find(a => a.imagePath === imagePath);
  if (annotation.comment) {
    const commentText = `${annotation.comment}`;
    return `${imageLink}\n${commentText}\n\n`;
  }

  return `${imageLink}\n\n`;
}

// Get the filename of the input PDF
const pdfFilename = path.basename(process.argv[3], '.pdf');

// Determine the markdown output directory
let markdownOutputPath = process.argv[5];
if (!markdownOutputPath) {
  markdownOutputPath = path.dirname(process.argv[3]);
} else {
  markdownOutputPath = path.join(path.dirname(process.argv[3]), markdownOutputPath);
}

// Create the markdown output directory if it doesn't exist
fs.mkdirSync(markdownOutputPath, { recursive: true });

// Save the output to a Markdown file with the same name as the input PDF
const outputFilePath = path.join(markdownOutputPath, `${pdfFilename}.md`);
fs.writeFileSync(outputFilePath, markdownContent, 'utf8');
console.log('Output saved to:', outputFilePath);

