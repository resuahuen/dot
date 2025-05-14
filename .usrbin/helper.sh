#!/bin/bash

# Check if the input PDF file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 input.pdf"
    exit 1
fi

# Assign the input PDF file to a variable
input_pdf="$1"

# Check if pdftk is installed
if ! command -v pdftk &> /dev/null
then
    echo "pdftk could not be found, please install it first."
    exit 1
fi

# Check if anx command is installed
if ! command -v anx &> /dev/null
then
    echo "anx could not be found, please install it first."
    exit 1
fi

# Check if the specified input file exists
if [ ! -f "$input_pdf" ]; then
    echo "$input_pdf does not exist."
    exit 1
fi

# Get the number of pages in the PDF
num_pages=$(pdftk "$input_pdf" dump_data | grep NumberOfPages | awk '{print $2}')

# Log file for errors
error_log="error_log.txt"
> "$error_log"  # Clear the log file

# Extract each page into a separate PDF and run 'anx' on it
for (( i=1; i<=num_pages; i++ ))
do
    # Extract the page
    pdftk "$input_pdf" cat $i output ${i}.pdf
    
    # Check if the extraction was successful
    if [ $? -ne 0 ]; then
        echo "Failed to extract page $i." | tee -a "$error_log"
        continue
    fi
    
    # Run 'anx' on the extracted page
    anx ${i}.pdf
    
    # Check if 'anx' was successful
    if [ $? -ne 0 ]; then
        echo "Failed to process ${i}.pdf with anx." | tee -a "$error_log"
        continue
    fi
    
    echo "Successfully processed ${i}.pdf."
done

echo "Processing complete. Check $error_log for any errors."

