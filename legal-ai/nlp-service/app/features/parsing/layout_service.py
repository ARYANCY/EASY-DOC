import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def reconstruct_html_from_blocks(pages: List[Dict[str, Any]]) -> str:
    """
    Reconstructs a structured HTML document from PDF text blocks.
    Groups words into lines and lines into paragraphs based on spatial proximity.
    """
    html_output = ["<div class='pdf-reconstruction'>"]
    
    for page in pages:
        page_num = page.get("page_num", 0)
        blocks = page.get("blocks", [])
        
        if not blocks:
            continue
            
        html_output.append(f"<div class='pdf-page' id='page-{page_num}' style='position: relative; margin-bottom: 20px; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>")
        
        # Sort blocks by vertical position first, then horizontal
        sorted_blocks = sorted(blocks, key=lambda b: (round(b['y'] / 5) * 5, b['x']))
        
        current_line_y = -1
        current_line = []
        lines = []
        
        # Group into lines
        for b in sorted_blocks:
            if current_line_y == -1 or abs(b['y'] - current_line_y) < 5:
                current_line.append(b)
                if current_line_y == -1:
                    current_line_y = b['y']
            else:
                lines.append(current_line)
                current_line = [b]
                current_line_y = b['y']
        
        if current_line:
            lines.append(current_line)
            
        # Output lines as paragraphs or spans
        for line in lines:
            line_text = " ".join([b['text'] for b in line])
            # Determine if this is a heading based on font size (heuristically)
            avg_font_size = sum([b['font_size'] for b in line]) / len(line)
            
            tag = "p"
            style = ""
            if avg_font_size > 14:
                tag = "h1"
            elif avg_font_size > 12:
                tag = "h2"
                
            # For "Visual Fidelity" mode (Absolute Positioning)
            # We can use this for the "Edit PDF" tab
            # For "Smart Edit", we want clean semantic HTML
            
            html_output.append(f"<{tag}>{line_text}</{tag}>")
            
        html_output.append("</div>")
        
    html_output.append("</div>")
    return "\n".join(html_output)

def convert_to_absolute_html(pages: List[Dict[str, Any]], scale: float = 1.0) -> str:
    """
    Converts PDF blocks to HTML with absolute positioning for overlay editing.
    """
    html_output = []
    for page in pages:
        page_num = page.get("page_num", 0)
        blocks = page.get("blocks", [])
        
        for i, b in enumerate(blocks):
            style = (
                f"position: absolute; "
                f"left: {b['x'] * scale}pt; "
                f"top: {b['y'] * scale}pt; "
                f"width: {b['width'] * scale}pt; "
                f"height: {b['height'] * scale}pt; "
                f"font-size: {b['font_size'] * scale}pt; "
                f"font-family: sans-serif;"
            )
            html_output.append(
                f"<div class='pdf-block' "
                f"data-page='{page_num}' "
                f"data-index='{i}' "
                f"contenteditable='true' "
                f"style='{style}'>{b['text']}</div>"
            )
    return "".join(html_output)
