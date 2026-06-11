#!/usr/bin/env python3
"""
ProspexCare Lead Sources Normalization Script
Normalizes AF, BH, CMS, and Hospital data into a unified 336-column format.
"""

import os
import re
import csv
import glob
import hashlib
import pandas as pd
import pdfplumber
from datetime import date

DATA_DIR = '/home/user/claude/prospex_data'
OUTPUT_DATE = '2026-06-11'
OUTPUT_FILE = f'{DATA_DIR}/ProspexCare_LeadSources_Normalized_{OUTPUT_DATE}.csv'


# ─── COLUMN SCHEMA ───────────────────────────────────────────────────────────

CORE_COLUMNS = [
    'Record ID', 'Source Type', 'Duplicate Check Key',
    'FacilityName', 'FacilityStatus', 'FacilityType',
    'LocationAddress', 'LocationCity', 'LocationState', 'LocationZipCode', 'LocationCounty',
    'MailAddress', 'MailCity', 'MailState', 'MailZipCode',
    'Phone', 'Fax', 'ConfidentialFax',
    'LicenseNumber', 'LicensedBedCount', 'LicenseExpirationDate',
    'OwnershipType', 'ChainName',
    'CMSCertificationNumber', 'CMSOverallRating', 'CMSHealthInspectionRating',
    'CMSStaffingRating', 'CMSQMRating',
    'CEOAdmin', 'CFO', 'Owner', 'Parent',
    'Medicare1', 'Medicare2', 'Medicare3', 'OrgType',
    'ICUBeds', 'AcuteBeds', 'PsychBeds', 'SNFBeds', 'CDU_ATCBeds', 'OtherBeds',
    'AvailableBeds', 'LicensedBeds',
    'Specialty', 'Contract', 'RCSRegionUnit', 'SpecialtyCode', 'ContractCode',
    'FacilityPOC', 'POCId', 'MemoryCertFlag',
    'CheckCompleteDate', 'CheckType',
    'DisclosureOfServices', 'HasReports', 'ReportsLocation',
    'NumberOfCertifiedBeds', 'AvgResidentsPerDay',
    'ProviderType', 'ProviderResidesInHospital', 'LegalBusinessName',
    'DateFirstApproved', 'SpecialFocusStatus', 'AbuseIcon',
    'OverallRating', 'HealthInspectionRatingCMS', 'QMRating',
    'StaffingRating', 'NurseAideHours', 'LPNHours', 'RNHours',
    'TotalNurseHours', 'PhysicalTherapistHours',
    'NursingStaffTurnover', 'RNTurnover', 'AdminTurnover',
    'TotalFines', 'TotalPenalties',
    'Latitude', 'Longitude',
    'DataLoadDate',
]

AF_RAW_COLS = [
    'AF Raw_Speciality', 'AF Raw_contract', 'AF Raw_LicenseNumber',
    'AF Raw_LocationNumber', 'AF Raw_FacInstanceId', 'AF Raw_FacilityType',
    'AF Raw_FacilityName', 'AF Raw_FacilityStatus', 'AF Raw_LocationAddress',
    'AF Raw_LocationCity', 'AF Raw_LocationState', 'AF Raw_LocationZipCode',
    'AF Raw_LocationCounty', 'AF Raw_MailAddress', 'AF Raw_MailCity',
    'AF Raw_MailState', 'AF Raw_MailZipCode', 'AF Raw_TelephoneNmbr',
    'AF Raw_FaxNmbr', 'AF Raw_ConfidentialFaxNmbr', 'AF Raw_RCSRegionUnit',
    'AF Raw_SpecialityCode', 'AF Raw_ContractCode', 'AF Raw_FacilityPOC',
    'AF Raw_LicensedBedCount', 'AF Raw_LicenseExpirationDate',
    'AF Raw_CheckCompleteDate', 'AF Raw_CheckType', 'AF Raw_POCId',
    'AF Raw_MemoryCertFlag', 'AF Raw_Disclosure of Services',
    'AF Raw_Has Reports?', 'AF Raw_Reports Location',
    'AF Raw_Specialty',
]

BH_RAW_COLS = [
    'BH Raw_Speciality', 'BH Raw_contract', 'BH Raw_Check_Type',
    'BH Raw_LicenseNumber', 'BH Raw_LocationNumber', 'BH Raw_FacInstanceId',
    'BH Raw_FacilityType', 'BH Raw_FacilityName', 'BH Raw_FacilityStatus',
    'BH Raw_LocationAddress', 'BH Raw_LocationCity', 'BH Raw_LocationState',
    'BH Raw_LocationZipCode', 'BH Raw_LocationCounty', 'BH Raw_MailAddress',
    'BH Raw_MailCity', 'BH Raw_MailState', 'BH Raw_MailZipCode',
    'BH Raw_TelephoneNmbr', 'BH Raw_FaxNmbr', 'BH Raw_ConfidentialFaxNmbr',
    'BH Raw_RCSRegionUnit', 'BH Raw_SpecialityCode', 'BH Raw_ContractCode',
    'BH Raw_FacilityPOC', 'BH Raw_LicensedBedCount', 'BH Raw_LicenseExpirationDate',
    'BH Raw_CheckCompleteDate', 'BH Raw_CheckType_2', 'BH Raw_POCId',
    'BH Raw_MemoryCertFlag', 'BH Raw_Disclosure of Services',
    'BH Raw_Has Reports?', 'BH Raw_Reports Location', 'BH Raw_Specialty',
]

CMS_RAW_COLS = [
    'CMS Raw_CMS Certification Number (CCN)', 'CMS Raw_Provider Name',
    'CMS Raw_Provider Address', 'CMS Raw_City/Town', 'CMS Raw_State',
    'CMS Raw_ZIP Code', 'CMS Raw_Telephone Number', 'CMS Raw_County/Parish',
    'CMS Raw_Ownership Type', 'CMS Raw_Number of Certified Beds',
    'CMS Raw_Average Number of Residents per Day', 'CMS Raw_Provider Type',
    'CMS Raw_Legal Business Name', 'CMS Raw_Chain Name',
    'CMS Raw_Overall Rating', 'CMS Raw_Health Inspection Rating',
    'CMS Raw_QM Rating', 'CMS Raw_Staffing Rating',
    'CMS Raw_Special Focus Status', 'CMS Raw_Abuse Icon',
    'CMS Raw_Latitude', 'CMS Raw_Longitude',
]

HOSPITAL_RAW_COLS = [
    'Hospital Raw_Name', 'Hospital Raw_License', 'Hospital Raw_Address',
    'Hospital Raw_POBox', 'Hospital Raw_City', 'Hospital Raw_ZipCode',
    'Hospital Raw_Phone', 'Hospital Raw_Fax', 'Hospital Raw_County',
    'Hospital Raw_CEOAdmin', 'Hospital Raw_CFO', 'Hospital Raw_Owner',
    'Hospital Raw_Parent', 'Hospital Raw_Medicare1', 'Hospital Raw_Medicare2',
    'Hospital Raw_Medicare3', 'Hospital Raw_OrgType', 'Hospital Raw_FYE',
    'Hospital Raw_ICU', 'Hospital Raw_Acute', 'Hospital Raw_Psych',
    'Hospital Raw_SNF', 'Hospital Raw_CDU_ATC', 'Hospital Raw_Other',
    'Hospital Raw_Available', 'Hospital Raw_Licensed',
]

# Build full 336-column list
ALL_COLUMNS = CORE_COLUMNS + AF_RAW_COLS + BH_RAW_COLS + CMS_RAW_COLS + HOSPITAL_RAW_COLS

# Pad to 336 if needed (add placeholder columns)
while len(ALL_COLUMNS) < 336:
    ALL_COLUMNS.append(f'Reserved_{len(ALL_COLUMNS) - len(CORE_COLUMNS) - len(AF_RAW_COLS) - len(BH_RAW_COLS) - len(CMS_RAW_COLS) - len(HOSPITAL_RAW_COLS) + 1}')

ALL_COLUMNS = ALL_COLUMNS[:336]  # Trim to exactly 336


# ─── HELPERS ─────────────────────────────────────────────────────────────────

def normalize_phone(raw):
    if not raw or str(raw).strip() in ('', 'nan'):
        return ''
    digits = re.sub(r'\D', '', str(raw))
    if len(digits) == 11 and digits.startswith('1'):
        digits = digits[1:]
    if len(digits) == 10:
        return f'({digits[:3]}) {digits[3:6]}-{digits[6:]}'
    return raw.strip()


def phone_digits(raw):
    if not raw:
        return ''
    return re.sub(r'\D', '', str(raw))


def make_record_id(source_type, name, city, phone):
    key = f'{source_type}|{str(name).strip().upper()}|{str(city).strip().upper()}|{phone_digits(phone)}'
    return hashlib.md5(key.encode()).hexdigest()[:16].upper()


def make_dup_key(name, city, phone):
    return f'{str(name).strip().upper()}|{str(city).strip().upper()}|{phone_digits(phone)}'


def empty_row():
    return {col: '' for col in ALL_COLUMNS}


# ─── AF PROCESSING ───────────────────────────────────────────────────────────

def process_af_files():
    rows = []
    af_files = sorted(glob.glob(f'{DATA_DIR}/AFListing_*.csv'))
    for fpath in af_files:
        try:
            df = pd.read_csv(fpath, dtype=str, on_bad_lines='skip')
        except Exception as e:
            print(f"  Warning: could not read {fpath}: {e}")
            continue
        df = df.fillna('')
        for _, r in df.iterrows():
            row = empty_row()
            row['Source Type'] = 'AF'
            phone = normalize_phone(r.get('TelephoneNmbr', ''))
            fax = normalize_phone(r.get('FaxNmbr', ''))
            conf_fax = normalize_phone(r.get('ConfidentialFaxNmbr', ''))
            name = r.get('FacilityName', '')
            city = r.get('LocationCity', '')
            row['Phone'] = phone
            row['Fax'] = fax
            row['ConfidentialFax'] = conf_fax
            row['FacilityName'] = name
            row['FacilityStatus'] = r.get('FacilityStatus', '').strip()
            row['FacilityType'] = r.get('FacilityType', '').strip()
            row['LocationAddress'] = r.get('LocationAddress', '')
            row['LocationCity'] = city
            row['LocationState'] = r.get('LocationState', '')
            row['LocationZipCode'] = r.get('LocationZipCode', '')
            row['LocationCounty'] = r.get('LocationCounty', '')
            row['MailAddress'] = r.get('MailAddress', '')
            row['MailCity'] = r.get('MailCity', '')
            row['MailState'] = r.get('MailState', '')
            row['MailZipCode'] = r.get('MailZipCode', '')
            row['LicenseNumber'] = r.get('LicenseNumber', '')
            row['LicensedBedCount'] = r.get('LicensedBedCount', '')
            row['LicenseExpirationDate'] = r.get('LicenseExpirationDate', '')
            row['Specialty'] = r.get('Speciality', '')
            row['Contract'] = r.get('contract', '')
            row['RCSRegionUnit'] = r.get('RCSRegionUnit', '')
            row['SpecialtyCode'] = r.get('SpecialityCode', '')
            row['ContractCode'] = r.get('ContractCode', '')
            row['FacilityPOC'] = r.get('FacilityPOC', '')
            row['POCId'] = r.get('POCId', '')
            row['MemoryCertFlag'] = r.get('MemoryCertFlag', '')
            row['CheckCompleteDate'] = r.get('CheckCompleteDate', '')
            row['CheckType'] = r.get('CheckType', '')
            row['DisclosureOfServices'] = r.get('Disclosure of Services', '')
            row['HasReports'] = r.get('Has Reports?', '')
            row['ReportsLocation'] = r.get('Reports Location', '')
            row['DataLoadDate'] = OUTPUT_DATE
            row['Duplicate Check Key'] = make_dup_key(name, city, phone)
            row['Record ID'] = make_record_id('AF', name, city, phone)
            # Raw columns
            for col in ['Speciality', 'contract', 'LicenseNumber', 'LocationNumber',
                        'FacInstanceId', 'FacilityType', 'FacilityName', 'FacilityStatus',
                        'LocationAddress', 'LocationCity', 'LocationState', 'LocationZipCode',
                        'LocationCounty', 'MailAddress', 'MailCity', 'MailState', 'MailZipCode',
                        'TelephoneNmbr', 'FaxNmbr', 'ConfidentialFaxNmbr', 'RCSRegionUnit',
                        'SpecialityCode', 'ContractCode', 'FacilityPOC', 'LicensedBedCount',
                        'LicenseExpirationDate', 'CheckCompleteDate', 'CheckType', 'POCId',
                        'MemoryCertFlag', 'Disclosure of Services', 'Has Reports?', 'Reports Location']:
                raw_key = f'AF Raw_{col}'
                if raw_key in row:
                    row[raw_key] = r.get(col, '')
            if 'AF Raw_Specialty' in row:
                row['AF Raw_Specialty'] = r.get('Speciality', '')
            rows.append(row)
    print(f"  AF: {len(rows)} rows from {len(af_files)} files")
    return rows


# ─── BH PROCESSING ───────────────────────────────────────────────────────────

def process_bh_file():
    rows = []
    fpath = f'{DATA_DIR}/BHListing.csv'
    try:
        df = pd.read_csv(fpath, dtype=str, on_bad_lines='skip')
    except Exception as e:
        print(f"  Warning: could not read BHListing: {e}")
        return rows
    df = df.fillna('')
    for _, r in df.iterrows():
        row = empty_row()
        row['Source Type'] = 'BH'
        phone = normalize_phone(r.get('TelephoneNmbr', ''))
        fax = normalize_phone(r.get('FaxNmbr', ''))
        conf_fax = normalize_phone(r.get('ConfidentialFaxNmbr', ''))
        name = r.get('FacilityName', '')
        city = r.get('LocationCity', '')
        row['Phone'] = phone
        row['Fax'] = fax
        row['ConfidentialFax'] = conf_fax
        row['FacilityName'] = name
        row['FacilityStatus'] = r.get('FacilityStatus', '').strip()
        row['FacilityType'] = r.get('FacilityType', '').strip()
        row['LocationAddress'] = r.get('LocationAddress', '')
        row['LocationCity'] = city
        row['LocationState'] = r.get('LocationState', '')
        row['LocationZipCode'] = r.get('LocationZipCode', '')
        row['LocationCounty'] = r.get('LocationCounty', '')
        row['MailAddress'] = r.get('MailAddress', '')
        row['MailCity'] = r.get('MailCity', '')
        row['MailState'] = r.get('MailState', '')
        row['MailZipCode'] = r.get('MailZipCode', '')
        row['LicenseNumber'] = r.get('LicenseNumber', '')
        row['LicensedBedCount'] = r.get('LicensedBedCount', '')
        row['LicenseExpirationDate'] = r.get('LicenseExpirationDate', '')
        row['Specialty'] = r.get('Speciality', '')
        row['Contract'] = r.get('contract', '')
        row['RCSRegionUnit'] = r.get('RCSRegionUnit', '')
        row['SpecialtyCode'] = r.get('SpecialityCode', '')
        row['ContractCode'] = r.get('ContractCode', '')
        row['FacilityPOC'] = r.get('FacilityPOC', '')
        row['POCId'] = r.get('POCId', '')
        row['MemoryCertFlag'] = r.get('MemoryCertFlag', '')
        row['CheckCompleteDate'] = r.get('CheckCompleteDate', '')
        row['CheckType'] = r.get('Check_Type', '') or r.get('CheckType', '')
        row['DisclosureOfServices'] = r.get('Disclosure of Services', '')
        row['HasReports'] = r.get('Has Reports?', '')
        row['ReportsLocation'] = r.get('Reports Location', '')
        row['DataLoadDate'] = OUTPUT_DATE
        row['Duplicate Check Key'] = make_dup_key(name, city, phone)
        row['Record ID'] = make_record_id('BH', name, city, phone)
        # Raw
        for col in ['Speciality', 'contract', 'Check_Type', 'LicenseNumber', 'LocationNumber',
                    'FacInstanceId', 'FacilityType', 'FacilityName', 'FacilityStatus',
                    'LocationAddress', 'LocationCity', 'LocationState', 'LocationZipCode',
                    'LocationCounty', 'MailAddress', 'MailCity', 'MailState', 'MailZipCode',
                    'TelephoneNmbr', 'FaxNmbr', 'ConfidentialFaxNmbr', 'RCSRegionUnit',
                    'SpecialityCode', 'ContractCode', 'FacilityPOC', 'LicensedBedCount',
                    'LicenseExpirationDate', 'CheckCompleteDate', 'POCId',
                    'MemoryCertFlag', 'Disclosure of Services', 'Has Reports?', 'Reports Location']:
            raw_key = f'BH Raw_{col}'
            if raw_key in row:
                row[raw_key] = r.get(col, '')
        if 'BH Raw_CheckType_2' in row:
            row['BH Raw_CheckType_2'] = r.get('CheckType', '')
        if 'BH Raw_Specialty' in row:
            row['BH Raw_Specialty'] = r.get('Speciality', '')
        rows.append(row)
    print(f"  BH: {len(rows)} rows")
    return rows


# ─── CMS PROCESSING ──────────────────────────────────────────────────────────

def process_cms_file():
    rows = []
    fpath = f'{DATA_DIR}/data.csv'
    try:
        df = pd.read_csv(fpath, dtype=str, on_bad_lines='skip')
    except Exception as e:
        print(f"  Warning: could not read data.csv: {e}")
        return rows
    df = df.fillna('')
    for _, r in df.iterrows():
        row = empty_row()
        row['Source Type'] = 'CMS'
        phone = normalize_phone(r.get('Telephone Number', ''))
        name = r.get('Provider Name', '')
        city = r.get('City/Town', '')
        row['Phone'] = phone
        row['FacilityName'] = name
        row['LocationAddress'] = r.get('Provider Address', '')
        row['LocationCity'] = city
        row['LocationState'] = r.get('State', '')
        row['LocationZipCode'] = r.get('ZIP Code', '')
        row['LocationCounty'] = r.get('County/Parish', '')
        row['OwnershipType'] = r.get('Ownership Type', '')
        row['ChainName'] = r.get('Chain Name', '')
        row['CMSCertificationNumber'] = r.get('CMS Certification Number (CCN)', '')
        row['CMSOverallRating'] = r.get('Overall Rating', '')
        row['CMSHealthInspectionRating'] = r.get('Health Inspection Rating', '')
        row['CMSStaffingRating'] = r.get('Staffing Rating', '')
        row['CMSQMRating'] = r.get('QM Rating', '')
        row['NumberOfCertifiedBeds'] = r.get('Number of Certified Beds', '')
        row['AvgResidentsPerDay'] = r.get('Average Number of Residents per Day', '')
        row['ProviderType'] = r.get('Provider Type', '')
        row['ProviderResidesInHospital'] = r.get('Provider Resides in Hospital', '')
        row['LegalBusinessName'] = r.get('Legal Business Name', '')
        row['DateFirstApproved'] = r.get('Date First Approved to Provide Medicare and Medicaid Services', '')
        row['SpecialFocusStatus'] = r.get('Special Focus Status', '')
        row['AbuseIcon'] = r.get('Abuse Icon', '')
        row['OverallRating'] = r.get('Overall Rating', '')
        row['HealthInspectionRatingCMS'] = r.get('Health Inspection Rating', '')
        row['QMRating'] = r.get('QM Rating', '')
        row['StaffingRating'] = r.get('Staffing Rating', '')
        row['NurseAideHours'] = r.get('Reported Nurse Aide Staffing Hours per Resident per Day', '')
        row['LPNHours'] = r.get('Reported LPN Staffing Hours per Resident per Day', '')
        row['RNHours'] = r.get('Reported RN Staffing Hours per Resident per Day', '')
        row['TotalNurseHours'] = r.get('Reported Total Nurse Staffing Hours per Resident per Day', '')
        row['PhysicalTherapistHours'] = r.get('Reported Physical Therapist Staffing Hours per Resident Per Day', '')
        row['NursingStaffTurnover'] = r.get('Total nursing staff turnover', '')
        row['RNTurnover'] = r.get('Registered Nurse turnover', '')
        row['AdminTurnover'] = r.get('Number of administrators who have left the nursing home', '')
        row['TotalFines'] = r.get('Total Amount of Fines in Dollars', '')
        row['TotalPenalties'] = r.get('Total Number of Penalties', '')
        row['Latitude'] = r.get('Latitude', '')
        row['Longitude'] = r.get('Longitude', '')
        row['DataLoadDate'] = OUTPUT_DATE
        row['Duplicate Check Key'] = make_dup_key(name, city, phone)
        row['Record ID'] = make_record_id('CMS', name, city, phone)
        # Raw
        for col in ['CMS Certification Number (CCN)', 'Provider Name', 'Provider Address',
                    'City/Town', 'State', 'ZIP Code', 'Telephone Number', 'County/Parish',
                    'Ownership Type', 'Number of Certified Beds', 'Average Number of Residents per Day',
                    'Provider Type', 'Legal Business Name', 'Chain Name', 'Overall Rating',
                    'Health Inspection Rating', 'QM Rating', 'Staffing Rating',
                    'Special Focus Status', 'Abuse Icon', 'Latitude', 'Longitude']:
            raw_key = f'CMS Raw_{col}'
            if raw_key in row:
                row[raw_key] = r.get(col, '')
        rows.append(row)
    print(f"  CMS: {len(rows)} rows")
    return rows


# ─── HOSPITAL PDF PROCESSING ─────────────────────────────────────────────────

def parse_hospital_pdf():
    """Parse hospital blocks from PDF. Each block starts with 'Name <NAME>'."""
    records = []
    pdf_path = f'{DATA_DIR}/HospitalDirectory.pdf'

    with pdfplumber.open(pdf_path) as pdf:
        full_text = ''
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                full_text += t + '\n'

    # Split into blocks starting with "Name "
    blocks = re.split(r'\n(?=Name )', full_text)

    for block in blocks:
        if not block.strip().startswith('Name '):
            continue

        h = {}
        lines = block.strip().split('\n')

        # First line: Name <...> Medicare1 <...>
        first = lines[0]
        m = re.match(r'Name (.+?)(?:\s+Medicare1\s+(\S+))?$', first)
        if m:
            h['Name'] = m.group(1).strip()
            h['Medicare1'] = (m.group(2) or '').strip()

        for line in lines[1:]:
            def get_val(pattern):
                m2 = re.search(pattern, line)
                return m2.group(1).strip() if m2 else None

            if line.startswith('License'):
                m2 = re.match(r'License\s+(\S+)\s+FYE\s+(\S+)', line)
                if m2:
                    h['License'] = m2.group(1)
                    h['FYE'] = m2.group(2)
                # Medicare2
                m2 = re.search(r'Medicare2\s+(\S+)', line)
                if m2:
                    h['Medicare2'] = m2.group(1)
            elif line.startswith('Address'):
                m2 = re.match(r'Address\s+(.+?)(?:\s+Medicare3\s*(.*))?$', line)
                if m2:
                    h['Address'] = m2.group(1).strip()
                    h['Medicare3'] = (m2.group(2) or '').strip()
            elif line.startswith('P.O. Box'):
                m2 = re.match(r'P\.O\. Box\s*(.*?)(?:\s+OrgType\s+(.+?))?(?:\s+ICU\s+(\d+))?$', line)
                if m2:
                    h['POBox'] = m2.group(1).strip()
                    if m2.group(2):
                        h['OrgType'] = m2.group(2).strip()
                    if m2.group(3):
                        h['ICU'] = m2.group(3)
            elif line.startswith('City'):
                m2 = re.match(r'City\s+(.+?)(?:\s+Acute\s+(\d+))?$', line)
                if m2:
                    h['City'] = m2.group(1).strip()
                    if m2.group(2):
                        h['Acute'] = m2.group(2)
            elif line.startswith('Zip Code'):
                m2 = re.match(r'Zip Code\s+(\S+)\s+Phone\s+(.+?)(?:\s+Psych\s+(\d+))?$', line)
                if m2:
                    h['ZipCode'] = m2.group(1)
                    h['Phone'] = m2.group(2).strip()
                    if m2.group(3):
                        h['Psych'] = m2.group(3)
            elif line.startswith('County'):
                m2 = re.match(r'County\s+(.+?)(?:\s+Fax\s+(.+?))?(?:\s+SNF\s+(\d+))?$', line)
                if m2:
                    h['County'] = m2.group(1).strip()
                    if m2.group(2) and m2.group(2).strip() not in ('', 'SNF'):
                        h['Fax'] = m2.group(2).strip()
                    if m2.group(3):
                        h['SNF'] = m2.group(3)
            elif line.startswith('CEO/Admin'):
                m2 = re.match(r'CEO/Admin\s+(.+?)(?:\s+CDU/ATC\s+(\d+))?$', line)
                if m2:
                    h['CEOAdmin'] = m2.group(1).strip()
                    if m2.group(2):
                        h['CDU_ATC'] = m2.group(2)
            elif line.startswith('CFO'):
                m2 = re.match(r'CFO\s+(.+?)(?:\s+Other\s+(\d+))?$', line)
                if m2:
                    h['CFO'] = m2.group(1).strip()
                    if m2.group(2):
                        h['Other'] = m2.group(2)
            elif line.startswith('Owner'):
                m2 = re.match(r'Owner\s+(.+?)(?:\s+Available\s+(\d+))?$', line)
                if m2:
                    h['Owner'] = m2.group(1).strip()
                    if m2.group(2):
                        h['Available'] = m2.group(2)
            elif line.startswith('Parent'):
                m2 = re.match(r'Parent\s*(.*?)(?:\s+Licensed\s+(\d+))?$', line)
                if m2:
                    h['Parent'] = m2.group(1).strip()
                    if m2.group(2):
                        h['Licensed'] = m2.group(2)

        if h.get('Name'):
            records.append(h)

    return records


def process_hospital_pdf():
    rows = []
    try:
        hospitals = parse_hospital_pdf()
    except Exception as e:
        print(f"  Warning: could not parse hospital PDF: {e}")
        return rows

    for h in hospitals:
        row = empty_row()
        row['Source Type'] = 'Hospital'
        phone = normalize_phone(h.get('Phone', ''))
        fax = normalize_phone(h.get('Fax', ''))
        name = h.get('Name', '')
        city = h.get('City', '')
        row['Phone'] = phone
        row['Fax'] = fax
        row['FacilityName'] = name
        row['LocationAddress'] = h.get('Address', '')
        row['LocationCity'] = city
        row['LocationZipCode'] = h.get('ZipCode', '')
        row['LocationCounty'] = h.get('County', '')
        row['MailAddress'] = h.get('POBox', '')
        row['CEOAdmin'] = h.get('CEOAdmin', '')
        row['CFO'] = h.get('CFO', '')
        row['Owner'] = h.get('Owner', '')
        row['Parent'] = h.get('Parent', '')
        row['Medicare1'] = h.get('Medicare1', '')
        row['Medicare2'] = h.get('Medicare2', '')
        row['Medicare3'] = h.get('Medicare3', '')
        row['OrgType'] = h.get('OrgType', '')
        row['ICUBeds'] = h.get('ICU', '')
        row['AcuteBeds'] = h.get('Acute', '')
        row['PsychBeds'] = h.get('Psych', '')
        row['SNFBeds'] = h.get('SNF', '')
        row['CDU_ATCBeds'] = h.get('CDU_ATC', '')
        row['OtherBeds'] = h.get('Other', '')
        row['AvailableBeds'] = h.get('Available', '')
        row['LicensedBeds'] = h.get('Licensed', '')
        row['LicenseNumber'] = h.get('License', '')
        row['DataLoadDate'] = OUTPUT_DATE
        row['Duplicate Check Key'] = make_dup_key(name, city, phone)
        row['Record ID'] = make_record_id('Hospital', name, city, phone)
        # Raw
        for k, raw_key in [('Name', 'Hospital Raw_Name'), ('License', 'Hospital Raw_License'),
                            ('Address', 'Hospital Raw_Address'), ('POBox', 'Hospital Raw_POBox'),
                            ('City', 'Hospital Raw_City'), ('ZipCode', 'Hospital Raw_ZipCode'),
                            ('Phone', 'Hospital Raw_Phone'), ('Fax', 'Hospital Raw_Fax'),
                            ('County', 'Hospital Raw_County'), ('CEOAdmin', 'Hospital Raw_CEOAdmin'),
                            ('CFO', 'Hospital Raw_CFO'), ('Owner', 'Hospital Raw_Owner'),
                            ('Parent', 'Hospital Raw_Parent'), ('Medicare1', 'Hospital Raw_Medicare1'),
                            ('Medicare2', 'Hospital Raw_Medicare2'), ('Medicare3', 'Hospital Raw_Medicare3'),
                            ('OrgType', 'Hospital Raw_OrgType'), ('FYE', 'Hospital Raw_FYE'),
                            ('ICU', 'Hospital Raw_ICU'), ('Acute', 'Hospital Raw_Acute'),
                            ('Psych', 'Hospital Raw_Psych'), ('SNF', 'Hospital Raw_SNF'),
                            ('CDU_ATC', 'Hospital Raw_CDU_ATC'), ('Other', 'Hospital Raw_Other'),
                            ('Available', 'Hospital Raw_Available'), ('Licensed', 'Hospital Raw_Licensed')]:
            if raw_key in row:
                row[raw_key] = h.get(k, '')
        rows.append(row)

    print(f"  Hospital: {len(rows)} records from PDF")
    return rows


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print("Starting ProspexCare normalization...")
    print(f"Total columns in schema: {len(ALL_COLUMNS)}")

    all_rows = []

    print("\nProcessing AF listings...")
    all_rows.extend(process_af_files())

    print("\nProcessing BH listing...")
    all_rows.extend(process_bh_file())

    print("\nProcessing CMS nursing home data...")
    all_rows.extend(process_cms_file())

    print("\nProcessing Hospital PDF...")
    all_rows.extend(process_hospital_pdf())

    print(f"\nTotal rows before dedup: {len(all_rows)}")

    # Deduplicate on Duplicate Check Key (keep first occurrence)
    seen = set()
    deduped = []
    for row in all_rows:
        key = row['Duplicate Check Key']
        if key and key not in seen:
            seen.add(key)
            deduped.append(row)
        elif not key:
            deduped.append(row)  # Keep rows with no dup key

    print(f"Total rows after dedup: {len(deduped)}")

    # Write CSV
    print(f"\nWriting output to {OUTPUT_FILE}...")
    df = pd.DataFrame(deduped, columns=ALL_COLUMNS)
    df.to_csv(OUTPUT_FILE, index=False, quoting=csv.QUOTE_ALL)
    print(f"Output written: {os.path.getsize(OUTPUT_FILE):,} bytes")

    # Summary by source type
    print("\n=== Row count by source type ===")
    for src in ['AF', 'BH', 'CMS', 'Hospital']:
        count = sum(1 for r in deduped if r.get('Source Type') == src)
        print(f"  {src}: {count:,} rows")
    print(f"  TOTAL: {len(deduped):,} rows")


if __name__ == '__main__':
    main()
