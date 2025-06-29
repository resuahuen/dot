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
      const imageLink = processImageAnnotation(annotation.imagePath, process.argv[4], pageNumber, imageCounter, process.argv[3]);
      markdownContent += imageLink;
      imageCounter++;
      break;
    default:
      // Ignore other annotation types
      break;
  }
});

// Function to process the image annotation with page number and image index
function processImageAnnotation(imagePath, imageOutputPath, pageNumber, imageCounter, pdfFilePath) {
  const pdfFilename = path.basename(process.argv[3], '.pdf');
  const imageExtension = path.extname(imagePath);

  // Generate new image filename with page number and image index
  const newImagePath = path.join(imageOutputPath, `${pdfFilename}${pageNumber}p${imageCounter}${imageExtension}`);

  // Rename the image with the new filename
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

// Define the markdown output path based on the PDF file path
const markdownOutputPath = path.join(path.dirname(process.argv[3]), `${pdfFilename}.md`);

// Append the output to the existing Markdown file (if it exists)
fs.appendFileSync(markdownOutputPath, markdownContent, 'utf8');
console.log('Output saved to:', markdownOutputPath);