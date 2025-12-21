import { google } from 'googleapis';
import type { Lead } from '@/types';

interface JobDetails {
  keyword: string;
  location: string;
  jobId: string;
}

/**
 * Appends scraped leads to a Google Sheet
 * Creates a new tab for each scrape with format: "Keyword - Location - Date"
 * @param leads - Array of lead objects
 * @param jobDetails - Job metadata (keyword, location, jobId)
 * @returns URL to the spreadsheet
 */
export async function appendLeadsToSheet(
  leads: Lead[],
  jobDetails: JobDetails
): Promise<string> {
  try {
    // Check if credentials are configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.warn('Google Sheets credentials not configured, skipping sheet export');
      return '';
    }

    if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      console.warn('Google Sheets spreadsheet ID not configured, skipping sheet export');
      return '';
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // Authenticate with service account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Create sheet name: "Restaurants - Paris - 2024-12-21"
    const date = new Date().toISOString().split('T')[0];
    const sheetName = `${jobDetails.keyword} - ${jobDetails.location} - ${date}`;

    console.log(`Creating new sheet tab: "${sheetName}"`);

    // Create new sheet tab
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });

    console.log(`Sheet tab created: "${sheetName}"`);

    // Prepare header row
    const headers = [
      'Business Name',
      'Address',
      'Phone',
      'Website',
      'Email',
      'Rating',
      'Reviews',
      'Category',
      'Scraped Date',
      'Job ID',
    ];

    // Prepare data rows
    const rows = leads.map((lead) => [
      lead.businessName || '',
      lead.address || '',
      lead.phone || '',
      lead.website || '',
      lead.email || '',
      lead.rating?.toString() || '',
      lead.reviewCount?.toString() || '',
      lead.category || '',
      date,
      jobDetails.jobId,
    ]);

    // Combine headers and data
    const values = [headers, ...rows];

    // Append data to the new sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });

    console.log(`✅ Successfully exported ${leads.length} leads to Google Sheets`);
    console.log(`Sheet: "${sheetName}"`);

    // Format the header row (bold, frozen)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: await getSheetId(sheets, spreadsheetId, sheetName),
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                  },
                  backgroundColor: {
                    red: 0.9,
                    green: 0.9,
                    blue: 0.9,
                  },
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)',
            },
          },
          {
            updateSheetProperties: {
              properties: {
                sheetId: await getSheetId(sheets, spreadsheetId, sheetName),
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
              fields: 'gridProperties.frozenRowCount',
            },
          },
        ],
      },
    });

    // Return spreadsheet URL
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${await getSheetId(sheets, spreadsheetId, sheetName)}`;
  } catch (error) {
    console.error('Failed to export to Google Sheets:', error);
    // Don't throw - we don't want to fail the entire scrape if Sheets export fails
    return '';
  }
}

/**
 * Gets the sheet ID for a given sheet name
 */
async function getSheetId(
  sheets: any,
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheet = response.data.sheets.find(
    (s: any) => s.properties.title === sheetName
  );

  return sheet?.properties?.sheetId || 0;
}
