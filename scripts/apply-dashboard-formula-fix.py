from pathlib import Path

path = Path("google-apps-script/Code.gs")
text = path.read_text(encoding="utf-8")
old = '''  sheet.getRange("E6").setFormula('=IFERROR(COUNTIF(FILTER(Attempts!G2:G,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted"),">="&XLOOKUP($B$3,Courses!B:B,Courses!A:A),Courses!E:E))/A6,0)');'''
new = '''  sheet.getRange("E6").setFormula('=IFERROR(COUNTIF(FILTER(Attempts!G2:G,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted"),">="&XLOOKUP($B$3,Courses!B:B,Courses!E:E))/A6,0)');'''

if old in text:
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
elif new not in text:
    raise SystemExit("Expected Dashboard pass-rate formula was not found.")
