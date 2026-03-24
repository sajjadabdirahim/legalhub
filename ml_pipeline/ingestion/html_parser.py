import os
import json
import re
import uuid
from bs4 import BeautifulSoup

RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
PROCESSED_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "processed")
os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)

def clean_text(raw_text: str) -> str:
    """Removes excess whitespace, newlines, and normalizes spacing."""
    if not raw_text: return ""
    return re.sub(r'\s+', ' ', raw_text).strip()

def parse_kenyalaw_html(file_path: str, filename: str):
    """Parses the specific Kenya Law HTML DOM and maps it to the ERD."""
    with open(file_path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    
    # STATUTES TABLE (Extracting from <meta> and coverpage)
    
    statute_id = str(uuid.uuid4())
    
    title_meta = soup.find("meta", property="og:title")
    statute_title = title_meta["content"] if title_meta else "Unknown Statute"
    
    date_meta = soup.find("meta", property="book:release_date")
    latest_version_date = date_meta["content"] if date_meta else "1900-01-01"
    
    # Locate CAP number in the coverpage
    cap_node = soup.find("h2", string=re.compile(r"CAP\."))
    cap_number = clean_text(cap_node.text) if cap_node else "N/A"
    
    frbr_uri = "/" + filename.replace(".html", "").replace("_", "/", 4)

    statute_record = {
        "statute_id": statute_id,
        "title": statute_title,
        "statute_type": "Act of Parliament",
        "cap_number": cap_number,
        "frbr_uri": frbr_uri,
        "latest_version_date": latest_version_date
    }
    print(f"Parsing: {statute_title}")

    
    # AMENDMENTS TABLE (Extracting from <ol class="amendment-list">)
    
    amendments_list = []
    amendment_nodes = soup.find_all("li", class_="amendment")
    
    for node in amendment_nodes:
        a_tag = node.find("a", class_="amending-title")
        date_span = node.find("span", class_="amendment-date")
        
        if a_tag and date_span:
            amendments_list.append({
                "amendment_id": str(uuid.uuid4()),
                "statute_id": statute_id, # Foreign Key
                "amending_law_title": clean_text(a_tag.text),
                "amendment_date": clean_text(date_span.text)
            })

    
    # 3. STRUCTURAL DIVISIONS TABLE (NO SHORTCUTS)
    
    divisions_list = []
    div_id_map = {} # Tracks HTML IDs to link Provisions to their Division
    
    # Create a fallback division for sections that appear before "Part I"
    default_div_id = str(uuid.uuid4())
    divisions_list.append({
        "division_id": default_div_id,
        "statute_id": statute_id,
        "parent_division_id": None,
        "division_type": "Preliminary",
        "division_number": "0",
        "heading": "General Provisions"
    })

    # Find Parts, Chapters, and Schedules
    division_nodes = soup.find_all(["section", "div"], class_=re.compile(r"akn-(part|chapter|attachment)"))
    
    for node in division_nodes:
        html_id = node.get("id", str(uuid.uuid4()))
        div_uuid = str(uuid.uuid4())
        div_id_map[html_id] = div_uuid
        
        h_tag = node.find(["h2", "h1"])
        full_heading = clean_text(h_tag.text) if h_tag else "Unnamed Division"
        
        div_type = "Schedule" if "akn-attachment" in node.get("class", []) else "Part"
        div_num = "N/A"
        final_heading = full_heading

        # STRICT REGEX PARSING FOR DIVISION NUMBERS
        if div_type == "Part":
            # Matches "Part I - PRELIMINARY" or "Part I – PRELIMINARY"
            match = re.match(r"^Part\s+([A-Za-z0-9]+)\s*[-–:]+\s*(.*)", full_heading, re.IGNORECASE)
            if match:
                div_num = match.group(1) # Extracts "I"
                final_heading = match.group(2) # Extracts "PRELIMINARY"
            else:
                # Fallback if there is no dash (e.g. "Part I")
                match = re.match(r"^Part\s+([A-Za-z0-9]+)", full_heading, re.IGNORECASE)
                if match:
                    div_num = match.group(1)
        else: # For Schedules
            # Matches "FIRST SCHEDULE"
            match = re.match(r"^([A-Za-z0-9]+)\s+SCHEDULE", full_heading, re.IGNORECASE)
            if match:
                div_num = match.group(1) # Extracts "FIRST"
            else:
                # Matches "SCHEDULE 1"
                match = re.match(r"^SCHEDULE\s+([A-Za-z0-9]+)", full_heading, re.IGNORECASE)
                if match:
                    div_num = match.group(1)

        divisions_list.append({
            "division_id": div_uuid,
            "statute_id": statute_id, # Foreign Key
            "parent_division_id": None,
            "division_type": div_type,
            "division_number": div_num,
            "heading": final_heading
        })

    
    # 4. PROVISIONS TABLE
    
    provisions_list = []
    
    # Find Sections, Articles, and Paragraphs (used inside Schedules)
    provision_nodes = soup.find_all("section", class_=re.compile(r"akn-(section|article|paragraph)"))

    for node in provision_nodes:
        html_id = node.get("id", "unknown_eid")
        
        #  Map to Parent Division
        parent_div = node.find_parent(["section", "div"], class_=re.compile(r"akn-(part|chapter|attachment)"))
        parent_html_id = parent_div.get("id") if parent_div else None
        division_id_fk = div_id_map.get(parent_html_id, default_div_id)
        
        # 2. Extract Number and Heading
        h3_tag = node.find("h3") # Used in main sections
        num_span = node.find("span", class_="akn-num") # Used in schedules
        
        prov_num = "N/A"
        prov_heading = "No Heading"
        
        if h3_tag:
            h3_text = clean_text(h3_tag.text)
            match = re.match(r"^([\d\w]+)\.\s*(.*)", h3_text)
            if match:
                prov_num = match.group(1)
                prov_heading = match.group(2)
            else:
                prov_heading = h3_text
            h3_tag.extract() # Remove so it doesn't duplicate in the body text
            
        elif num_span:
            prov_num = clean_text(num_span.text).strip(".")
            num_span.extract()
            
        # 3. Extract Body Text
        clean_content = clean_text(node.get_text(separator=" "))
        
        # 4. Check for Repeals
        status = "Repealed" if "deleted" in clean_content.lower()[:50] or "repealed" in clean_content.lower()[:50] else "Active"
        
        prov_type = "Paragraph" if "akn-paragraph" in node.get("class", []) else "Section"

        if len(clean_content) > 10:
            provisions_list.append({
                "provision_id": str(uuid.uuid4()),
                "division_id": division_id_fk, # Foreign Key
                "latent_theme_id": None, # Will be filled by Topic Modeling Engine
                "provision_type": prov_type,
                "provision_number": prov_num,
                "heading": prov_heading,
                "akn_eid": html_id,
                "clean_text": clean_content,
                "status": status
            })

    return statute_record, amendments_list, divisions_list, provisions_list

def execute_pipeline():
    print("Initializing Uncompromised Relational Parsing Pipeline...")
    
    database_payload = {
        "statutes": [],
        "amendments": [],
        "structural_divisions": [],
        "provisions": []
    }

    for filename in os.listdir(RAW_DATA_DIR):
        if filename.endswith(".html"):
            file_path = os.path.join(RAW_DATA_DIR, filename)
            stat_rec, amd_list, div_list, prov_list = parse_kenyalaw_html(file_path, filename)
            
            database_payload["statutes"].append(stat_rec)
            database_payload["amendments"].extend(amd_list)
            database_payload["structural_divisions"].extend(div_list)
            database_payload["provisions"].extend(prov_list)

    output_path = os.path.join(PROCESSED_DATA_DIR, "relational_database_seed.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(database_payload, f, indent=4)
        
    print(f"\nParsing complete!")
    print(f"Statutes Extracted: {len(database_payload['statutes'])}")
    print(f"Amendments Extracted: {len(database_payload['amendments'])}")
    print(f"Divisions (Parts/Schedules) Extracted: {len(database_payload['structural_divisions'])}")
    print(f"Provisions (Sections) Extracted: {len(database_payload['provisions'])}")
    print(f"Relational JSON ready at: {output_path}")

if __name__ == "__main__":
    execute_pipeline()