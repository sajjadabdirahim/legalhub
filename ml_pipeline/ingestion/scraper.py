import os
import time
import requests
import re
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Load environment variables (PORT.1 constraint)
load_dotenv()

# NCLR Base URL from .env, fallback to standard if not set
NCLR_BASE_URL = os.getenv("NCLR_BASE_URL", "https://new.kenyalaw.org")

# Ensure the local target directory exists
RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
os.makedirs(RAW_DATA_DIR, exist_ok=True)

# SYS 1.2 Constraint: Custom Academic User-Agent
HEADERS = {
    "User-Agent": "LegalHub-Academic-Crawler/1.0 (Capstone Project; University Research)",
    "Accept": "text/html,application/xhtml+xml" # Explicitly accept HTML
}

# The 29 targeted Acts (Appendix A)
TARGET_FRBR_URIS = [
    "/akn/ke/act/2010/constitution/eng@2010-09-03", # The Constitution
    "/akn/ke/act/2012/17/eng@2022-12-31",  # County Governments Act (2012) 
    "/akn/ke/act/1930/10/eng@2023-12-11", # Penal Code (Cap. 63)
    "/akn/ke/act/2006/3/eng@2024-04-26", # Sexual Offences Act (2006)
    "/akn/ke/act/2003/3/eng@2025-08-19", # Anti-Corruption and Economic Crimes Act (2003) 
    "/akn/ke/act/1930/11/eng@2023-12-11", # Criminal Procedure Code (Cap. 75) 
    "/akn/ke/act/1973/16/eng@2026-01-01", # Income Tax Act (Cap. 470) 
    "/akn/ke/act/2013/35/eng@2025-07-01", # Value Added Tax (VAT) Act (2013) 
    "/akn/ke/act/2015/29/eng@2025-07-01", # Tax Procedures Act (2015) 
    "/akn/ke/act/2015/17/eng@2024-12-27", # Companies Act (2015) 
    "/akn/ke/act/2009/9/eng@2025-11-04", # Proceeds of Crime and Anti-Money Laundering Act (POCAMLA) (2009) 
    "/akn/ke/act/2011/24/eng@2022-12-31", # Employment Act (2011) 
    "/akn/ke/act/2007/14/eng@2022-12-31", # Labour Relations Act (2007)
    "/akn/ke/act/1953/39/eng@2024-04-26", # Traffic Act (Cap. 403) 
    "/akn/ke/act/gn/1953/1902/eng@2022-12-31", # Traffic Rules
    "/akn/ke/act/1972/14/eng@2022-12-31", # Law of Succession Act (Cap. 160)
    "/akn/ke/act/2014/4/eng@2022-12-31", # Marriage Act (2014)
    "/akn/ke/act/2012/6/eng@2025-11-04", # Land Act (2012)
    "/akn/ke/act/2012/3/eng@2022-12-31", # Land Registration Act (2012)
    "/akn/ke/act/2012/46/eng@2022-12-31", # Consumer Protection Act (2012) 
    "/akn/ke/act/2019/24/eng@2022-12-31", # Data Protection Act (2019) 
    "/akn/ke/act/ln/2021/263/eng@2022-12-31", # Data Protection (General) Regulations (2021) 
    "/akn/ke/act/2018/5/eng@2025-11-04", # Computer Misuse and Cybercrimes Act (2018) 
    "/akn/ke/act/1998/2/eng@2022-12-31", # Kenya Information and Communications Act (KICA) (1998)
    "/akn/ke/act/1924/3/eng@2022-12-31", # Civil Procedure Act (Cap. 21) 
    "/akn/ke/act/ln/2010/151/eng@2022-12-31", # Civil Procedure Rules 
    "/akn/ke/act/1963/46/eng@2023-12-11", # Evidence Act (Cap. 80) 
    "/akn/ke/act/1999/8/eng@2022-12-31", # Environmental Management and Co-ordination Act (EMCA) (1999)
    "/akn/ke/act/1921/38/eng@2022-12-31" # Public Health Act (Cap. 242) 
]

def fetch_akoma_ntoso_html(frbr_uri: str) -> str | None:
    """
    Fetches the HTML document containing embedded Akoma Ntoso DOM classes.
    """
    clean_base = NCLR_BASE_URL.rstrip('/')
    clean_uri = frbr_uri.lstrip('/')
    target_url = f"{clean_base}/{clean_uri}"
    
    print(f"Fetching: {target_url}")
    
    try:
        #  Timeout set to 30 to prevent SSL Handshake hangs on servers
        response = requests.get(target_url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch {frbr_uri}: {e}")
        return None

def save_html_locally(frbr_uri: str, html_content: str):
    """
    Saves the fetched HTML to the local data directory.
    """
    safe_filename = frbr_uri.strip("/").replace("/", "_") + ".html"
    file_path = os.path.join(RAW_DATA_DIR, safe_filename)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"Saved: {safe_filename}")

def execute_ingestion_pipeline():
    """
    Orchestrates the scraping process while enforcing SYS 1.2 delays.
    """
    for uri in TARGET_FRBR_URIS:
        html_text = fetch_akoma_ntoso_html(uri)
        
        if html_text:
            # Parse as HTML, not XML
            soup = BeautifulSoup(html_text, "html.parser")
            
            # SRS EXT-1 Check: Look for any HTML class starting with "akn-"
            if soup.find(class_=re.compile(r"^akn-")):
                save_html_locally(uri, html_text)
            else:
                print(f"Warning: {uri} did not contain expected 'akn-' DOM classes.")
                
        print("Enforcing 2-second ethical crawl delay")
        time.sleep(2)
        
    print("Ingestion sequence complete.")

if __name__ == "__main__":
    execute_ingestion_pipeline()