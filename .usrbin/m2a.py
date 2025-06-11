#!/usr/bin/env python3

import sys
import os
import re
import sys
import genanki
from pathlib import Path
import base64
import shutil
import argparse

def convert_latex(md):
    # Convert $$...$$ to \[...\]
    md = re.sub(r'\$\$(.+?)\$\$', r'\\[\1\\]', md, flags=re.DOTALL)
    # Convert $...$ to \(...\)
    md = re.sub(r'\$(.+?)\$', r'\\(\1\\)', md)
    return md

def extract_image_paths(md):
    # Find all ![alt](path) and return set of paths
    return set(re.findall(r'!\[.*?\]\((.*?)\)', md))

def image_to_base64(path):
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')

def replace_images_with_anki(md, media_files):
    # Replace ![alt](path) with <img src="filename">
    def repl(match):
        path = match.group(1)
        filename = Path(path).name
        if path not in media_files:
            media_files[path] = filename
        return f'<img src="{filename}">'
    return re.sub(r'!\[.*?\]\((.*?)\)', repl, md)

# def parse_cards(md):
#     cards = []
#     for block in md.split('#kk'):
#         block = block.strip()
#         if not block:
#             continue
#         # Find first % (front/back split) and last % (back end)
#         first_percent = block.find('%')
#         last_percent = block.rfind('%')
#         if first_percent == -1 or last_percent == -1 or first_percent == last_percent:
#             continue  # skip if not both delimiters present
#         front = block[:first_percent].strip()
#         back = block[first_percent+1:last_percent].strip()
#         cards.append((front, back))
#     return cards

# def parse_cards(md):
#     cards = []
#     blocks = md.split('#kk')
#     for block in blocks:
#         block = block.strip()
#         if not block:
#             continue
#         # Find all % positions
#         percent_positions = [m.start() for m in re.finditer(r'%', block)]
#         if len(percent_positions) < 2:
#             continue  # skip if not both delimiters present
#         first_percent = percent_positions[0]
#         last_percent = percent_positions[-1]
#         front = block[:first_percent].strip()
#         back = block[first_percent+1:last_percent].strip()
#         if front and back:
#             cards.append((front, back))
#     return cards

# def parse_cards(md):
#     cards = []
#     for block in md.split('#kk'):
#         block = block.strip()
#         if not block:
#             continue
#         # Find all % positions, anywhere in the block
#         percent_positions = [m.start() for m in re.finditer(r'%', block)]
#         if len(percent_positions) < 2:
#             continue  # skip if not both delimiters present
#         first_percent = percent_positions[0]
#         last_percent = percent_positions[-1]
#         front = block[:first_percent].strip()
#         back = block[first_percent+1:last_percent].strip()
#         if front and back:
#             cards.append((front, back))
#     return cards

# def parse_cards(md):
#     cards = []
#     for block in md.split('#kk'):
#         block = block.strip()
#         if not block:
#             continue
#         # Split on lines containing only '%'
#         parts = re.split(r'^\s*%\s*$', block, flags=re.MULTILINE)
#         if len(parts) < 2:
#             continue  # skip if not both delimiters present
#         front = parts[0].strip()
#         back = parts[1].strip()
#         if front and back:
#             cards.append((front, back))
#     return cards

def parse_cards(md):
    cards = []
    lines = md.splitlines()
    state = 'search_kk'
    front_lines = []
    back_lines = []
    for line in lines:
        if state == 'search_kk':
            if line.strip().startswith('#kk'):
                front_lines = []
                back_lines = []
                state = 'front'
        elif state == 'front':
            if line.strip() == '%':
                state = 'back'
            else:
                front_lines.append(line)
        elif state == 'back':
            if line.strip() == '%':
                # Card complete
                front = '\n'.join(front_lines).strip()
                back = '\n'.join(back_lines).strip()
                if front and back:
                    cards.append((front, back))
                state = 'search_kk'
            else:
                back_lines.append(line)
    return cards


def main(md_path, output_apkg, verbose=False):
    if verbose:
        print(f"Reading markdown file: {md_path}")
    with open(md_path, encoding='utf-8') as f:
        md = f.read()

    md = convert_latex(md)
    cards = parse_cards(md)
    if verbose:
        print(f"Found {len(cards)} cards.")

    media_files = {}
    all_media = set()
    for front, back in cards:
        all_media |= extract_image_paths(front)
        all_media |= extract_image_paths(back)

    for path in all_media:
        media_files[path] = Path(path).name

    model = genanki.Model(
        1607392319,
        'Simple Model',
        fields=[{'name': 'Front'}, {'name': 'Back'}],
        templates=[{
            'name': 'Card 1',
            'qfmt': '{{Front}}',
            'afmt': '{{Back}}',
        }],
    )

    deck = genanki.Deck(2059400110, 'My Deck')
    media_list = []

    for i, (front, back) in enumerate(cards, 1):
        front_html = replace_images_with_anki(front, media_files)
        back_html = replace_images_with_anki(back, media_files)
        deck.add_note(genanki.Note(model=model, fields=[front_html, back_html]))
        if verbose:
            print(f"Added card {i}: Front length {len(front_html)}, Back length {len(back_html)}")
            front_imgs = list(extract_image_paths(front))
            back_imgs = list(extract_image_paths(back))
            if front_imgs:
                print(f"  Images on front: {', '.join(front_imgs)}")
            if back_imgs:
                print(f"  Images on back: {', '.join(back_imgs)}")
    for src, fname in media_files.items():
        if Path(src).exists():
            media_list.append(src)
            if verbose:
                print(f"Including media: {src}")
        elif verbose:
            print(f"Warning: Media file not found: {src}")
    # genanki.Package(deck, media_files=media_list).write_to_file(output_apkg)
    # print(f"Deck written to {output_apkg}")
    # Write to a local temp file, then move to the desired output location
    import tempfile
    local_output = '/tmp/output.apkg'
    genanki.Package(deck, media_files=media_list).write_to_file(local_output)
    if verbose:
        print(f"Deck written to temporary file {local_output}")
    shutil.move(local_output, output_apkg)
    print(f"Deck moved to {output_apkg}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description="Convert markdown with #kk/% delimiters to an Anki .apkg deck. Supports images and LaTeX.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('input_md', help='Input markdown file')
    parser.add_argument('output_apkg', nargs='?', help='Output .apkg file (default: same name as input)')
    parser.add_argument('-v', '--verbose', action='store_true', help='Enable verbose output')
    args = parser.parse_args()

    input_md = args.input_md
    if args.output_apkg:
        output_apkg = args.output_apkg
    else:
        base = os.path.splitext(input_md)[0]
        output_apkg = base + '.apkg'

    main(input_md, output_apkg, verbose=args.verbose)